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
import { transcribeAudio } from '../lib/supabase/transcription';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';

// Maximum recording duration in seconds (8 minutes)
// For testing: temporarily set to 10 seconds, then restore to 480
const MAX_RECORDING_DURATION = 480;

export const useAudioRecording = (onTranscriptionComplete?: (text: string, timestamp: string) => void) => {
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

    if (!hasPermission) {
      console.error('❌ [HOOK] No permission, cannot start recording');
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
    } catch (error) {
      console.error('❌ [HOOK] Failed to start recording:', error);
      console.error('❌ [HOOK] Error details:', JSON.stringify(error, null, 2));
      Alert.alert('Recording Error', 'Unable to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    if (recording) {
      try {
        // Deactivate wake lock FIRST - don't make user wait through transcription
        await deactivateWakeLock();
        
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        if (uri && onTranscriptionComplete) {
          setIsProcessing(true);
          
          // Generate timestamp
          const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
          
          // Transcribe audio using Whisper Edge Function (server-side)
          const result = await transcribeAudio(uri);
          
          setIsProcessing(false);
          
          if (result.success && result.text) {
            // Auto-navigate to mirror with transcribed text
            onTranscriptionComplete(result.text, timestamp);
          } else {
            Alert.alert(
              'Transcription Failed', 
              result.error || 'Unable to transcribe audio. Please try again.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Retry', onPress: () => handleStopRecording() }
              ]
            );
            return;
          }
        }
      } catch (error) {
        console.error('Error stopping recording:', error);
        setIsProcessing(false);
        Alert.alert('Error', 'Failed to stop recording properly.');
        await deactivateWakeLock();
      } finally {
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
      if (wakeLockActiveRef.current) {
        deactivateKeepAwake('recording-session').catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const { isRecording, isPaused } = recordingStateRef.current;
      const currentRecording = recordingRef.current;
      
      if (nextAppState.match(/inactive|background/) && isRecording && !isPaused && currentRecording) {
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
          console.error('Failed to pause recording when backgrounding:', error);
          Alert.alert('Error', 'Failed to pause recording when backgrounding.');
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