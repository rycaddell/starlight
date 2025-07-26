/**
 * useAudioRecording Hook
 * 
 * Manages audio recording functionality including start/stop/pause/resume operations.
 * Handles real-time duration tracking, 8-minute recording limits, and audio file management.
 * Works with expo-av to create high-quality audio recordings stored locally.
 * 
 * Returns:
 * - isRecording: Whether currently recording audio
 * - isPaused: Whether recording is paused
 * - recordingDuration: Current recording duration in seconds
 * - recording: The Audio.Recording object (for internal use)
 * - handleStartRecording: Function to start recording (requires permission check)
 * - handleStopRecording: Function to stop recording and get file URI
 * - handlePauseRecording: Function to pause active recording
 * - handleResumeRecording: Function to resume paused recording
 * - formatDuration: Utility to format seconds as MM:SS
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';

export const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const handleStartRecording = async (hasPermission: boolean) => {
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
      return;
    }

    try {
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Create and start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
      setIsPaused(false);
      setRecordingDuration(0);
      
      console.log('Recording started successfully');
    } catch (error) {
      console.log('Error starting recording:', error);
      Alert.alert('Recording Error', 'Unable to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        
        console.log('Recording stopped. File saved to:', uri);
        Alert.alert('Recording Complete', `Audio saved successfully!\nFile: ${uri?.split('/').pop()}`);
        
        setRecording(null);
      } catch (error) {
        console.log('Error stopping recording:', error);
        Alert.alert('Error', 'Failed to stop recording properly.');
      }
    }
    
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
  };

  const handlePauseRecording = async () => {
    if (recording) {
      try {
        await recording.pauseAsync();
        setIsPaused(true);
        console.log('Recording paused');
      } catch (error) {
        console.log('Error pausing recording:', error);
        Alert.alert('Error', 'Failed to pause recording.');
      }
    }
  };

  const handleResumeRecording = async () => {
    if (recording) {
      try {
        await recording.startAsync();
        setIsPaused(false);
        console.log('Recording resumed');
      } catch (error) {
        console.log('Error resuming recording:', error);
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

  // Real timer based on recording status
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recording && isRecording && !isPaused) {
      interval = setInterval(async () => {
        if (recording) {
          const status = await recording.getStatusAsync();
          if (status.isRecording) {
            const durationInSeconds = Math.floor((status.durationMillis || 0) / 1000);
            setRecordingDuration(durationInSeconds);
            
            // 8 minute limit (480 seconds)
            if (durationInSeconds >= 480) {
              Alert.alert(
                'Recording Limit Reached',
                'Maximum recording time is 8 minutes. Recording will stop now.',
                [{ text: 'OK', onPress: () => handleStopRecording() }]
              );
            }
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recording, isRecording, isPaused]);

  return {
    isRecording,
    isPaused,
    recordingDuration,
    recording,
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleResumeRecording,
    formatDuration
  };
};