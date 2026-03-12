/**
 * useVoiceRecovery
 *
 * Runs once at app startup (after user is authenticated) to recover any
 * voice recording jobs that were interrupted by a force-quit or crash.
 *
 * Reads oxbow_pending_voice_jobs from AsyncStorage and handles each job:
 *   - completed in DB → clean up local file, dequeue
 *   - pending/processing in DB → re-fire edge function (idempotent)
 *   - failed in DB → re-upload local file, reset status, re-trigger
 *   - has storagePath but no journalId → create pending journal, trigger
 *   - has only localPath → re-upload, create journal, trigger
 *
 * Returns { isRecovering } — true while recovery async work is in flight.
 */

import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sentry from '@sentry/react-native';
import { supabase } from '../lib/supabase/client';
import { uploadAudioToStorage, createPendingJournal, triggerTranscription } from '../lib/supabase/transcription';
import { saveStepJournal } from '../lib/supabase/day1';
import { dequeuePendingJob, PendingVoiceJob } from './useAudioRecording';

const PENDING_JOBS_KEY = 'oxbow_pending_voice_jobs';
const MAX_RECOVERY_ATTEMPTS = 3;

const generateUUID = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// Increment recoveryAttempts for a job in AsyncStorage; returns the new count
const incrementRecoveryAttempts = async (jobId: string): Promise<number> => {
  const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
  if (!raw) return 1;
  const jobs: PendingVoiceJob[] = JSON.parse(raw);
  let newAttempts = 1;
  const updated = jobs.map(j => {
    if (j.jobId === jobId) {
      newAttempts = (j.recoveryAttempts || 0) + 1;
      return { ...j, recoveryAttempts: newAttempts };
    }
    return j;
  });
  await AsyncStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
  return newAttempts;
};

export const useVoiceRecovery = (userId: string | null) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!userId || hasRun.current) return;
    hasRun.current = true;
    runRecovery(userId);
  }, [userId]);

  const runRecovery = async (uid: string) => {
    let anyHandedOff = false;
    try {
      const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
      if (!raw) return;
      const jobs: PendingVoiceJob[] = JSON.parse(raw);
      if (jobs.length === 0) return;

      console.log(`🔄 [RECOVERY] Found ${jobs.length} pending job(s)`);
      Sentry.addBreadcrumb({
        category: 'recovery',
        message: 'Starting voice job recovery',
        data: { count: jobs.length },
        level: 'info',
      });

      setIsRecovering(true);

      for (const job of jobs) {
        const handedOff = await recoverJob(job, uid);
        if (handedOff) anyHandedOff = true;
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { component: 'useVoiceRecovery' } });
    } finally {
      setIsRecovering(false);
      if (anyHandedOff) {
        setRecoveryMessage('Now transcribing your recording - ~2 mins.');
        setTimeout(() => setRecoveryMessage(null), 5000);
      }
    }
  };

  // Returns true if the job was successfully handed off to transcription
  const recoverJob = async (job: PendingVoiceJob, uid: string): Promise<boolean> => {
    try {
      const attempts = await incrementRecoveryAttempts(job.jobId);

      if (attempts > MAX_RECOVERY_ATTEMPTS) {
        console.warn(`⚠️ [RECOVERY] Job ${job.jobId} exceeded ${MAX_RECOVERY_ATTEMPTS} attempts, dequeuing`);
        Sentry.addBreadcrumb({
          category: 'recovery',
          message: 'Job exceeded max recovery attempts, dequeuing',
          data: { jobId: job.jobId, journalId: job.journalId, attempts },
          level: 'warning',
        });
        FileSystem.deleteAsync(job.localPath, { idempotent: true }).catch(() => {});
        await dequeuePendingJob(job.jobId);
        return false;
      }

      console.log(`🔍 [RECOVERY] Processing job ${job.jobId} (attempt ${attempts}/${MAX_RECOVERY_ATTEMPTS}), journalId=${job.journalId}`);

      if (job.journalId && supabase) {
        const { data: journal } = await supabase
          .from('journals')
          .select('transcription_status, audio_url')
          .eq('id', job.journalId)
          .maybeSingle();

        if (!journal) {
          console.log(`⚠️ [RECOVERY] Journal ${job.journalId} not found in DB`);
          // Before attempting recovery, check the local file still exists
          const fileInfo = await FileSystem.getInfoAsync(job.localPath);
          if (!fileInfo.exists) {
            console.warn(`⚠️ [RECOVERY] Journal gone from DB and local file missing — dequeuing zombie job ${job.jobId}`);
            await dequeuePendingJob(job.jobId);
            return false;
          }
          return await recoverFromFile(job, uid);
        }

        if (journal.transcription_status === 'completed') {
          console.log(`✅ [RECOVERY] Job ${job.jobId} already completed, cleaning up`);
          FileSystem.deleteAsync(job.localPath, { idempotent: true }).catch(() => {});
          await dequeuePendingJob(job.jobId);
          return false;
        }

        if (journal.transcription_status === 'failed') {
          console.log(`🔁 [RECOVERY] Job ${job.jobId} failed — retrying from local file`);
          await retryFailedJob(job, uid);
          return true;
        }

        // pending or processing — re-fire edge function (idempotent)
        console.log(`🚀 [RECOVERY] Re-triggering transcription for job ${job.jobId}`);
        triggerTranscription(job.journalId);
        if (job.day1Step) {
          await saveStepJournal(uid, job.day1Step, job.journalId);
        }
        return true;
      }

      return await recoverFromFile(job, uid);
    } catch (error) {
      console.error(`❌ [RECOVERY] Failed to recover job ${job.jobId}:`, error);
      Sentry.captureException(error, {
        tags: { component: 'useVoiceRecovery', action: 'recoverJob' },
        contexts: { job: { jobId: job.jobId, journalId: job.journalId } },
      });
      return false;
    }
  };

  /**
   * Job has a failed journal in DB. Re-upload local file to a new storage path,
   * update the journal's audio_url, reset status, re-trigger.
   */
  const retryFailedJob = async (job: PendingVoiceJob, uid: string): Promise<boolean> => {
    const fileInfo = await FileSystem.getInfoAsync(job.localPath);
    if (!fileInfo.exists) {
      console.warn(`⚠️ [RECOVERY] Local file gone for failed job ${job.jobId}, dequeuing`);
      await dequeuePendingJob(job.jobId);
      return false;
    }

    const newStoragePath = `${uid}/${generateUUID()}.m4a`;
    const uploadResult = await uploadAudioToStorage(job.localPath, newStoragePath);
    if (!uploadResult.success) {
      console.error(`❌ [RECOVERY] Re-upload failed for job ${job.jobId}, will retry next launch`);
      return false;
    }

    if (!supabase) return false;
    await supabase
      .from('journals')
      .update({
        audio_url: newStoragePath,
        transcription_status: 'pending',
        error_message: null,
      })
      .eq('id', job.journalId!);

    triggerTranscription(job.journalId!);
    if (job.day1Step) {
      await saveStepJournal(uid, job.day1Step, job.journalId!);
    }
    console.log(`🚀 [RECOVERY] Re-triggered failed job ${job.jobId}`);
    return true;
  };

  /**
   * Job has no journalId (journal creation never happened).
   * If storagePath is set, audio is already in Storage — just create the journal.
   * If not, re-upload from local file first.
   */
  const recoverFromFile = async (job: PendingVoiceJob, uid: string): Promise<boolean> => {
    let storagePath = job.storagePath;

    if (!storagePath) {
      const fileInfo = await FileSystem.getInfoAsync(job.localPath);
      if (!fileInfo.exists) {
        console.warn(`⚠️ [RECOVERY] Local file gone for job ${job.jobId}, dequeuing`);
        await dequeuePendingJob(job.jobId);
        return false;
      }

      storagePath = `${uid}/${job.jobId}.m4a`;
      console.log(`⬆️ [RECOVERY] Re-uploading audio for job ${job.jobId}`);
      const uploadResult = await uploadAudioToStorage(job.localPath, storagePath);
      const alreadyExists = uploadResult.error?.includes('already exists');
      if (!uploadResult.success && !alreadyExists) {
        console.error(`❌ [RECOVERY] Re-upload failed for job ${job.jobId}, will retry next launch`);
        return false;
      }
      // alreadyExists means a prior timed-out upload completed in the background — file is in Storage, proceed
    }

    console.log(`📝 [RECOVERY] Creating journal for job ${job.jobId}`);
    const journal = await createPendingJournal({
      customUserId: uid,
      storagePath,
      localPath: job.localPath,
      promptText: job.promptText,
      entryType: job.entryType,
    });

    const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
    if (raw) {
      const jobs: PendingVoiceJob[] = JSON.parse(raw);
      const updated = jobs.map(j =>
        j.jobId === job.jobId ? { ...j, journalId: journal.id, storagePath } : j
      );
      await AsyncStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
    }

    triggerTranscription(journal.id);
    if (job.day1Step) {
      await saveStepJournal(uid, job.day1Step, journal.id);
    }
    console.log(`🚀 [RECOVERY] Triggered transcription for recovered job ${job.jobId}`);
    return true;
  };

  return { isRecovering, recoveryMessage };
};
