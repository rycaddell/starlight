/**
 * useAudioRecording Hook
 * 
 * Manages audio recording functionality including start/stop/pause/resume operations.
 * Handles real-time duration tracking, 8-minute recording limits, and audio file management.
 * Works with expo-av to create high-quality audio recordings stored locally.
 * 
 * Includes background state preservation - when app is backgrounded, recording pauses
 * and duration is preserved. Manual duration calculation is used after backgrounding
 * to work around iOS recording object state corruption.
 * 
 * Returns:
 * - isRecording: Whether currently recording audio
 * - isPaused: Whether recording is paused
 * - recordingDuration: Current recording duration in seconds
 * - recording: The Audio.Recording object (for internal use)
 * - isProcessing: Whether transcription is in progress
 * - handleStartRecording: Function to start recording (requires permission check)
 * - handleStopRecording: Function to stop recording and get file URI
 * - handlePauseRecording: Function to pause active recording
 * - handleResumeRecording: Function to resume paused recording
 * - handleDiscardRecording: Function to discard recording without saving (NEW)
 * - formatDuration: Utility to format seconds as MM:SS
 */

import { useState, useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { transcribeAudio, uploadAudioToStorage, createPendingJournal, triggerTranscription } from '../lib/supabase/transcription';
import { supabase } from '../lib/supabase/client';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useAuth } from '../contexts/AuthContext';

const PENDING_JOBS_KEY = 'oxbow_pending_voice_jobs';
const RECORDINGS_DIR = `${FileSystem.documentDirectory}pending_recordings/`;

const generateUUID = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

// Ensure the persistent recordings directory exists
const ensureRecordingsDir = async () => {
  const info = await FileSystem.getInfoAsync(RECORDINGS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
  }
};

// Add a job to the AsyncStorage pending queue
const enqueuePendingJob = async (job: PendingVoiceJob) => {
  const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
  const jobs: PendingVoiceJob[] = raw ? JSON.parse(raw) : [];
  jobs.push(job);
  await AsyncStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(jobs));
};

// Remove a completed/failed job from the queue by jobId
export const dequeuePendingJob = async (jobId: string) => {
  const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
  if (!raw) return;
  const jobs: PendingVoiceJob[] = JSON.parse(raw);
  const updated = jobs.filter(j => j.jobId !== jobId);
  await AsyncStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
};

export interface PendingVoiceJob {
  jobId: string;
  localPath: string;
  storagePath: string | null;   // set after upload succeeds
  journalId: string | null;     // set after journal row created (Step 5)
  promptText: string | null;
  entryType: string;
  createdAt: string;
  recoveryAttempts?: number;    // incremented on each startup recovery run
  day1Step?: 2 | 3;            // set for Day 1 Step 2 / Step 3 recordings
}

// Maximum recording duration in seconds (8 minutes)
// For testing: temporarily set to 10 seconds, then restore to 480
const MAX_RECORDING_DURATION = 480;

export const useAudioRecording = (onTranscriptionComplete?: (text: string, timestamp: string, journalId?: string) => void, day1Step?: 2 | 3) => {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStoppingRecording, setIsStoppingRecording] = useState(false);

  const wakeLockActiveRef = useRef(false);
  const recordingStateRef = useRef({ isRecording, isPaused });
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pausedDurationRef = useRef(0);
  const latestDurationRef = useRef(0);
  const wasBackgroundedRef = useRef(false);
  const resumeTimeRef = useRef<number>(0);
  const hasHitMaxDurationRef = useRef(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingActiveRef = useRef(false);
  const isRecordingStoppingRef = useRef(false); // true while handleStopRecording is executing

  const stopPolling = () => {
    pollingActiveRef.current = false;
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  };

  const pollForCompletion = (journalId: string, localPath: string, jobId: string) => {
    pollingActiveRef.current = true;
    let pollCount = 0;
    const MAX_POLLS = 60; // 3 min at 3s intervals
    let hadNetworkErrors = false;

    const tick = async () => {
      if (!pollingActiveRef.current) return;

      if (pollCount >= MAX_POLLS) {
        setIsProcessing(false);
        stopPolling();
        if (hadNetworkErrors) {
          Alert.alert(
            'Connection Issue',
            'We lost connection while checking on your recording. It was saved — check back shortly.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            'Still Transcribing',
            'Your recording was saved. The transcription is still processing — check back in a moment.',
            [{ text: 'OK' }]
          );
        }
        return;
      }

      try {
        const { data: journal } = await supabase
          .from('journals')
          .select('transcription_status, content, created_at')
          .eq('id', journalId)
          .single();

        if (journal?.transcription_status === 'completed') {
          setIsProcessing(false);
          stopPolling();
          const timestamp = new Date(journal.created_at).toLocaleString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true,
          });
          // Pass journalId so callers know the journal is already saved and skip re-insert
          onTranscriptionComplete?.(journal.content, timestamp, journalId);
          FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
          dequeuePendingJob(jobId);
        } else if (journal?.transcription_status === 'failed') {
          setIsProcessing(false);
          stopPolling();
          dequeuePendingJob(jobId);
          Alert.alert('Transcription Failed', 'Unable to transcribe your recording. Please try again.');
        } else {
          pollCount++;
          pollTimeoutRef.current = setTimeout(tick, 3000);
        }
      } catch {
        hadNetworkErrors = true;
        pollCount++;
        pollTimeoutRef.current = setTimeout(tick, 3000);
      }
    };

    tick();
  };

  useEffect(() => {
    recordingStateRef.current = { isRecording, isPaused };
  }, [isRecording, isPaused]);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  const activateWakeLock = async () => {
    if (wakeLockActiveRef.current) return;
    
    try {
      await activateKeepAwakeAsync('recording-session');
      wakeLockActiveRef.current = true;
    } catch (error) {
      Alert.alert(
        'Screen Lock Notice',
        'Unable to prevent screen sleep. Recording continues but screen may lock.',
        [{ text: 'OK' }]
      );
    }
  };

  const deactivateWakeLock = async () => {
    if (!wakeLockActiveRef.current) return;
    
    try {
      await deactivateKeepAwake('recording-session');
      wakeLockActiveRef.current = false;
    } catch (error) {
      Alert.alert(
        'Screen Lock Notice',
        'Unable to release screen lock. You may need to manually lock your device.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleStartRecording = async (hasPermission: boolean) => {
    console.log('🎙️ [HOOK] handleStartRecording called, hasPermission:', hasPermission);

    // Add Sentry breadcrumb
    Sentry.addBreadcrumb({
      category: 'recording',
      message: 'Starting audio recording',
      data: { hasPermission },
      level: 'info',
    });

    if (!hasPermission) {
      console.error('❌ [HOOK] No permission, cannot start recording');

      // Capture permission denial
      Sentry.captureException(new Error('Recording started without microphone permission'), {
        tags: { component: 'useAudioRecording', action: 'start' },
      });

      Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
      return;
    }

    try {
      // If there's an existing recording in progress, discard it first
      if (recording) {
        console.log('⚠️ [HOOK] Discarding existing recording before starting new one');
        try {
          await recording.stopAndUnloadAsync();
        } catch (e) {
          console.warn('⚠️ [HOOK] Failed to stop existing recording:', e);
        }
        setRecording(null);
        setIsRecording(false);
        setIsPaused(false);
      }

      console.log('🔧 [HOOK] Configuring audio mode for recording...');
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      console.log('✅ [HOOK] Audio mode configured successfully');

      console.log('📱 [HOOK] Creating recording object...');
      // Create and start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      console.log('✅ [HOOK] Recording object created successfully');

      setRecording(newRecording);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      pausedDurationRef.current = 0;
      latestDurationRef.current = 0;
      wasBackgroundedRef.current = false;
      resumeTimeRef.current = 0;
      hasHitMaxDurationRef.current = false;

      console.log('🔐 [HOOK] Activating wake lock...');
      await activateWakeLock();
      console.log('✅ [HOOK] Recording started successfully!');

      // Add success breadcrumb
      Sentry.addBreadcrumb({
        category: 'recording',
        message: 'Recording started successfully',
        level: 'info',
      });
    } catch (error) {
      console.error('❌ [HOOK] Failed to start recording:', error);
      console.error('❌ [HOOK] Error details:', JSON.stringify(error, null, 2));

      // Capture recording start failure
      Sentry.captureException(error, {
        tags: { component: 'useAudioRecording', action: 'start' },
        contexts: {
          recording: {
            hasPermission,
            hadExistingRecording: !!recording,
          },
        },
      });

      Alert.alert('Recording Error', 'Unable to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    if (recording) {
      isRecordingStoppingRef.current = true;
      try {
        // Add Sentry breadcrumb
        Sentry.addBreadcrumb({
          category: 'recording',
          message: 'Stopping audio recording',
          data: { duration: recordingDuration },
          level: 'info',
        });

        // Deactivate wake lock FIRST - don't make user wait through transcription
        await deactivateWakeLock();

        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();

        if (uri && onTranscriptionComplete) {
          setIsProcessing(true);

          // --- Step 3: Persist audio to permanent local storage ---
          // The temp cache URI (/Library/Caches/AV/) can be purged by iOS.
          // Copy to documentDirectory immediately so the file survives if
          // the upload or transcription fails and needs to be retried.
          const jobId = generateUUID();
          const localPath = `${RECORDINGS_DIR}${jobId}.m4a`;
          let persistedLocalPath = uri; // fallback to temp URI if persist fails
          let storagePath: string | null = null;

          try {
            await ensureRecordingsDir();
            await FileSystem.copyAsync({ from: uri, to: localPath });
            persistedLocalPath = localPath;
            await enqueuePendingJob({
              jobId,
              localPath,
              storagePath: null,
              journalId: null,
              promptText: null,
              entryType: 'voice',
              createdAt: new Date().toISOString(),
              day1Step,
            });
            Sentry.addBreadcrumb({
              category: 'recording',
              message: 'Audio persisted to permanent local storage',
              data: { jobId, localPath },
              level: 'info',
            });
          } catch (persistError) {
            // Non-fatal: log and continue with original temp URI
            Sentry.captureException(persistError, {
              tags: { component: 'useAudioRecording', action: 'persist_local' },
            });
          }

          // --- Step 4: Upload binary to Supabase Storage ---
          try {
            const customUserId = user?.id ?? null;

            if (customUserId) {
              storagePath = `${customUserId}/${jobId}.m4a`;
              const uploadResult = await uploadAudioToStorage(persistedLocalPath, storagePath);

              if (uploadResult.success) {
                // Update queued job with storage path so recovery can use it
                const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
                if (raw) {
                  const jobs: PendingVoiceJob[] = JSON.parse(raw);
                  const updated = jobs.map(j =>
                    j.jobId === jobId ? { ...j, storagePath } : j
                  );
                  await AsyncStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
                }
              } else if (uploadResult.error === 'UPLOAD_TIMEOUT') {
                // Connection too slow to upload — recording is safe locally, recovery handles retry
                setIsProcessing(false);
                Alert.alert(
                  'Upload timed out.',
                  'Your recording is saved on your device. Relaunch the app when you\'re on a better connection or WiFi.',
                  [{ text: 'OK' }]
                );
                return;
              } else {
                storagePath = null; // upload failed, fall through to old flow
              }
            }
          } catch (uploadError) {
            // Non-fatal: fall through to legacy transcribeAudio below
            Sentry.captureException(uploadError, {
              tags: { component: 'useAudioRecording', action: 'upload' },
            });
            storagePath = null;
          }
          // --------------------------------------------------

          if (storagePath) {
            // --- New flow: create pending journal + trigger server-side transcription ---
            const customUserId = user?.id ?? null;

            let journal;
            try {
              journal = await createPendingJournal({
                customUserId,
                storagePath,
                localPath: persistedLocalPath,
                promptText: null,
                entryType: 'voice',
              });
            } catch (journalError) {
              // Journal creation failed (e.g. Supabase unreachable). Audio is safely
              // uploaded to storage and the job is in AsyncStorage with storagePath set.
              // Recovery will create the journal row on next launch.
              Sentry.captureException(journalError, {
                tags: { component: 'useAudioRecording', action: 'createPendingJournal' },
                contexts: { recording: { jobId, storagePath } },
              });
              setIsProcessing(false);
              Alert.alert(
                'Recording Saved',
                "Your recording is saved on your device. We'll finish processing it when you reopen the app.",
                [{ text: 'OK' }]
              );
              return;
            }

            // Update queued job with journalId for recovery
            const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
            if (raw) {
              const jobs: PendingVoiceJob[] = JSON.parse(raw);
              const updated = jobs.map(j =>
                j.jobId === jobId ? { ...j, journalId: journal.id } : j
              );
              await AsyncStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
            }

            // Fire edge function — don't await, server handles everything
            triggerTranscription(journal.id);

            // Poll journals table for completion (runs independently)
            pollForCompletion(journal.id, persistedLocalPath, jobId);
            // isProcessing stays true until polling completes

          } else {
            // --- Fallback: upload failed, use legacy inline transcription ---
            const timestamp = new Date().toLocaleString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
              hour: 'numeric', minute: '2-digit', hour12: true,
            });

            const result = await transcribeAudio(uri);
            setIsProcessing(false);

            if (result.success && result.text) {
              onTranscriptionComplete?.(result.text, timestamp);
            } else {
              Alert.alert(
                'Transcription Failed',
                result.error || 'Unable to transcribe audio. Please try again.',
                [{ text: 'OK' }]
              );
            }
          }
        }
      } catch (error) {
        console.error('Error stopping recording:', error);

        // Capture stop recording failure
        Sentry.captureException(error, {
          tags: { component: 'useAudioRecording', action: 'stop' },
          contexts: {
            recording: {
              duration: recordingDuration,
              wasProcessing: isProcessing,
            },
          },
        });

        setIsProcessing(false);
        Alert.alert('Error', 'Failed to stop recording properly.');
        await deactivateWakeLock();
      } finally {
        isRecordingStoppingRef.current = false;
        setRecording(null);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingDuration(0);
        pausedDurationRef.current = 0;
        latestDurationRef.current = 0;
        wasBackgroundedRef.current = false;
        resumeTimeRef.current = 0;
        hasHitMaxDurationRef.current = false;
      }
    }
  };

  // NEW: Discard recording without transcribing or saving
  const handleDiscardRecording = async () => {
    if (recording) {
      try {
        console.log('🗑️ Discarding recording without saving');
        
        // Deactivate wake lock
        await deactivateWakeLock();
        
        // Stop and unload the recording WITHOUT triggering transcription
        await recording.stopAndUnloadAsync();
        
        // Clean up state
        setRecording(null);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingDuration(0);
        pausedDurationRef.current = 0;
        latestDurationRef.current = 0;
        wasBackgroundedRef.current = false;
        resumeTimeRef.current = 0;
        hasHitMaxDurationRef.current = false;

        // Reset audio mode
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });
        
        console.log('✅ Recording discarded successfully');
      } catch (error) {
        console.error('❌ Error discarding recording:', error);
        // Still clean up even if there's an error
        setRecording(null);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingDuration(0);
        await deactivateWakeLock().catch(() => {});
      }
    }
  };

  const handlePauseRecording = async () => {
    if (recording) {
      try {
        // Use latest duration from timer callback ref for consistency
        const currentDuration = latestDurationRef.current;
        pausedDurationRef.current = currentDuration;
        setRecordingDuration(currentDuration);
        
        // Reset background tracking on manual pause
        wasBackgroundedRef.current = false;
        resumeTimeRef.current = 0;

        await recording.pauseAsync();
        setIsPaused(true);

        // Reset audio mode to allow device to sleep
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: false,
        });

        await deactivateWakeLock();
      } catch (error) {
        console.error('Failed to pause recording:', error);
        Alert.alert('Error', 'Failed to pause recording.');
      }
    }
  };

  const handleResumeRecording = async () => {
    if (recording) {
      try {
        // Set resume time BEFORE starting recording to avoid race condition
        if (wasBackgroundedRef.current) {
          resumeTimeRef.current = Date.now();
        }
        
        // Re-enable audio mode for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        await recording.startAsync();
        setIsPaused(false);

        // Restore the paused duration immediately to prevent timer reset
        setRecordingDuration(pausedDurationRef.current);

        await activateWakeLock();
      } catch (error) {
        console.error('Failed to resume recording:', error);
        Alert.alert('Error', 'Failed to resume recording.');
      }
    }
  };

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Real timer based on recording status using callback instead of polling
  useEffect(() => {
    if (recording && isRecording && !isPaused) {
      recording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording) {
          let durationInSeconds;
          
          // If recording was backgrounded, calculate duration manually
          // because the recording object's internal timer is corrupted by iOS
          if (wasBackgroundedRef.current && resumeTimeRef.current > 0) {
            const elapsedSinceResume = Math.floor((Date.now() - resumeTimeRef.current) / 1000);
            durationInSeconds = pausedDurationRef.current + elapsedSinceResume;
          } else {
            // Normal mode: use recording object's duration
            durationInSeconds = Math.floor((status.durationMillis || 0) / 1000);
          }
          
          // Always track latest duration in ref
          latestDurationRef.current = durationInSeconds;
          setRecordingDuration(durationInSeconds);

          // Auto-stop at max duration to prevent data loss
          if (durationInSeconds >= MAX_RECORDING_DURATION && !hasHitMaxDurationRef.current) {
            hasHitMaxDurationRef.current = true;
            console.log(`⏱️ Recording hit ${MAX_RECORDING_DURATION}s limit, auto-stopping`);

            // Auto-stop immediately without waiting for user confirmation
            handleStopRecording();

            // Show non-blocking info alert after stopping
            const minutes = Math.floor(MAX_RECORDING_DURATION / 60);
            setTimeout(() => {
              Alert.alert(
                'Recording Complete',
                `Your ${minutes}-minute recording has been saved and is now being transcribed.`,
                [{ text: 'OK' }]
              );
            }, 500);
          }
        }
      });
    }
    
    return () => {
      if (recording) {
        recording.setOnRecordingStatusUpdate(null);
      }
    };
  }, [recording, isRecording, isPaused]);

  useEffect(() => {
    return () => {
      stopPolling();
      if (wakeLockActiveRef.current) {
        deactivateKeepAwake('recording-session').catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const { isRecording, isPaused } = recordingStateRef.current;
      const currentRecording = recordingRef.current;
      
      if (nextAppState.match(/inactive|background/) && isRecording && !isPaused && currentRecording && !isRecordingStoppingRef.current) {
        try {
          // Use latest duration from timer callback ref instead of getStatusAsync
          // because iOS may have already paused the recording, giving us stale data
          const currentDuration = latestDurationRef.current;
          pausedDurationRef.current = currentDuration;
          setRecordingDuration(currentDuration);

          // Mark that recording was backgrounded
          wasBackgroundedRef.current = true;

          await currentRecording.pauseAsync();
          setIsPaused(true);

          // Reset audio mode when backgrounding
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: false,
          });

          await deactivateWakeLock();
        } catch (error) {
          // Non-fatal: recording may have already been stopped (e.g. user tapped Stop
          // just before backgrounding). Log silently and let the stop flow complete.
          console.error('Failed to pause recording when backgrounding:', error);
        }
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  return {
    isRecording,
    isPaused,
    recordingDuration,
    recording,
    isProcessing,
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleDiscardRecording, // NEW: Added to return
    formatDuration
  };
};