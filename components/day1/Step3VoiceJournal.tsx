// components/day1/Step3VoiceJournal.tsx
// Step 3: Voice journal about prayer topics

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Alert, TouchableOpacity, AppState } from 'react-native';
import { Audio } from 'expo-av';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { VoiceRecordingTab } from '../voice/VoiceRecordingTab';
import { saveStepJournal, generateMiniMirror, getDay1Progress } from '../../lib/supabase/day1';
import { saveJournalEntry } from '../../lib/supabase';

interface Step3VoiceJournalProps {
  userId: string;
  spiritualPlace: string;
  existingJournalId?: string; // If set, user is returning to completed step
  onComplete: (mirrorId: string, summaries: any) => void;
}

// Spiritual place images (optimized JPGs)
const SPIRITUAL_PLACE_IMAGES: { [key: string]: any } = {
  'Adventuring': require('../../assets/images/spiritual-places/adventuring.jpg'),
  'Battling': require('../../assets/images/spiritual-places/battling.jpg'),
  'Hiding': require('../../assets/images/spiritual-places/hiding.jpg'),
  'Resting': require('../../assets/images/spiritual-places/resting.jpg'),
  'Working': require('../../assets/images/spiritual-places/working.jpg'),
  'Wandering': require('../../assets/images/spiritual-places/wandering.jpg'),
  'Grieving': require('../../assets/images/spiritual-places/grieving.jpg'),
  'Celebrating': require('../../assets/images/spiritual-places/celebrating.jpg'),
};

export const Step3VoiceJournal: React.FC<Step3VoiceJournalProps> = ({
  userId,
  spiritualPlace,
  existingJournalId,
  onComplete,
}) => {
  const [isBuildingMirror, setIsBuildingMirror] = useState(false);
  // If existingJournalId exists, user is returning to completed step
  const [hasRecorded, setHasRecorded] = useState(!!existingJournalId);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Audio recording hook with callback
  const {
    isRecording,
    isPaused,
    recordingDuration,
    isProcessing,
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleResumeRecording,
    formatDuration,
  } = useAudioRecording(async (transcribedText: string, timestamp: string) => {
    console.log('🎤 [STEP3] Voice transcribed:', transcribedText.substring(0, 50));

    // Save journal entry with transcribed text and mark transcription as completed
    console.log('💾 [STEP3] Saving journal with transcription_status: completed');
    const saveResult = await saveJournalEntry(transcribedText, userId, 'voice', null, 'completed');

    if (!saveResult.success || !saveResult.data) {
      console.error('❌ [STEP3] Failed to save journal:', saveResult.error);
      Alert.alert('Save Error', saveResult.error || 'Failed to save journal. Please try again.');
      return;
    }

    const journalId = saveResult.data.id;
    console.log('✅ [STEP3] Journal saved:', journalId);
    console.log('📄 [STEP3] Journal data:', JSON.stringify(saveResult.data, null, 2));

    // Link journal to day_1_progress
    console.log('🔗 [STEP3] Linking journal to day_1_progress...');
    const linkResult = await saveStepJournal(userId, 3, journalId);

    if (!linkResult.success) {
      console.error('❌ [STEP3] Failed to link journal:', linkResult.error);
      Alert.alert('Save Error', linkResult.error || 'Failed to link journal. Please try again.');
      return;
    }

    console.log('✅ [STEP3] Journal linked to Day 1 progress');

    // If this was the first recording (user didn't return to this step), auto-progress to mirror generation
    if (!existingJournalId) {
      setIsBuildingMirror(true);
      await startMirrorGeneration();
    } else {
      // User is re-recording on a return visit, show buttons
      setHasRecorded(true);
    }
  });

  const startMirrorGeneration = async () => {
    try {
      console.log('🚀 [STEP3] Starting mirror generation...');

      // Trigger mirror generation
      const generateResult = await generateMiniMirror(userId);

      if (generateResult.success) {
        // Generation completed - auto-navigate to Step 5
        console.log('✅ [STEP3] Mirror generated successfully, navigating to Step 5');
        setIsBuildingMirror(false);
        onComplete(generateResult.mirror.id, generateResult.summaries);
      } else {
        // Generation failed
        console.error('❌ [STEP3] Mirror generation failed:', generateResult.error);
        setIsBuildingMirror(false);

        // Show retry option
        Alert.alert(
          'Generation Failed',
          'Unable to generate your mirror. This sometimes happens with AI processing. Would you like to try again?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                // Stay on Step 3 with buttons visible
                setHasRecorded(true);
              }
            },
            {
              text: 'Retry',
              onPress: async () => {
                setIsBuildingMirror(true);
                await startMirrorGeneration();
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ [STEP3] Error in mirror generation:', error);
      setIsBuildingMirror(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // Check permission and start recording
  const handleStartRecordingWithPermission = async () => {
    try {
      console.log('🎤 [STEP3-PERMISSION] Checking microphone permission...');

      const currentStatus = await Audio.getPermissionsAsync();
      console.log('📊 [STEP3-PERMISSION] Current permission status:', JSON.stringify(currentStatus, null, 2));

      if (currentStatus.granted) {
        console.log('✅ [STEP3-PERMISSION] Permission already granted, starting recording');
        await handleStartRecording(true);
        return;
      }

      // Request permission directly (shouldn't happen since Step 2 already requested)
      console.log('📝 [STEP3-PERMISSION] Permission not granted, requesting directly...');

      try {
        console.log('🔧 [STEP3-PERMISSION] Setting audio mode...');

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        console.log('✅ [STEP3-PERMISSION] Audio mode set successfully');
        console.log('🔐 [STEP3-PERMISSION] Requesting system permission...');

        const permission = await Audio.requestPermissionsAsync();
        console.log('📊 [STEP3-PERMISSION] Permission response:', JSON.stringify(permission, null, 2));

        const granted = permission.granted === true || permission.status === 'granted';
        console.log('🔍 [STEP3-PERMISSION] Permission granted:', granted);

        if (granted) {
          console.log('✅ [STEP3-PERMISSION] Permission granted, waiting for app to become active...');

          // Wait for app to return to active state after permission dialog closes
          const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
              console.log('📱 [STEP3-PERMISSION] App returned to active state');
              subscription.remove();

              // Small delay to ensure app is fully active
              setTimeout(async () => {
                console.log('🎙️ [STEP3-PERMISSION] Calling handleStartRecording...');
                await handleStartRecording(true);
              }, 50);
            }
          });

          // Fallback timeout in case AppState doesn't fire
          setTimeout(() => {
            console.log('⚠️ [STEP3-PERMISSION] Fallback timeout reached, removing listener');
            subscription.remove();
          }, 3000);
        } else {
          console.error('❌ [STEP3-PERMISSION] Permission denied by user');
          Alert.alert(
            'Permission Denied',
            'Microphone access is needed for voice journaling. Please enable it in Settings.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('❌ [STEP3-PERMISSION] Error requesting permission:', error);
        Alert.alert('Error', 'Unable to set up microphone. Please try again.');
      }
    } catch (error) {
      console.error('❌ [STEP3-PERMISSION] Error in permission check:', error);
      Alert.alert('Error', 'Unable to access microphone. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top half: Image with spiritual place overlay */}
      <View style={styles.imageContainer}>
        <Image
          source={SPIRITUAL_PLACE_IMAGES[spiritualPlace] || SPIRITUAL_PLACE_IMAGES['Resting']}
          style={styles.image}
          resizeMode="cover"
        />
        {/* Overlay with spiritual place */}
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>{spiritualPlace}</Text>
        </View>
      </View>

      {/* Bottom half: Question and voice recording OR mirror generation */}
      <ScrollView style={styles.bottomHalf} contentContainerStyle={styles.scrollContent}>
        {/* Always show question and subcopy */}
        <Text style={styles.question}>
          How are you relating to God?
        </Text>
        <Text style={styles.subtext}>
          Does God feel close?{'\n'}
          How does God feel about you?
        </Text>

        {/* Voice recording component */}
        {!isBuildingMirror && (
          <>
            <View style={styles.voiceContainer}>
              <VoiceRecordingTab
                isRecording={isRecording}
                isPaused={isPaused}
                recordingDuration={recordingDuration}
                isProcessing={isProcessing}
                hasRecorded={hasRecorded}
                formatDuration={formatDuration}
                onStartRecording={handleStartRecordingWithPermission}
                onStopRecording={handleStopRecording}
                onPauseRecording={handlePauseRecording}
                onResumeRecording={handleResumeRecording}
              />
            </View>

            {/* Next button - shown after first recording */}
            {hasRecorded && !isRecording && !isProcessing && (
              <TouchableOpacity
                style={styles.continueButton}
                onPress={async () => {
                  setIsBuildingMirror(true);
                  await startMirrorGeneration();
                }}
              >
                <Text style={styles.continueButtonText}>Next</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Mirror Generation */}
        {isBuildingMirror && (
          <View style={styles.generationContainer}>
            <View style={styles.mirrorCard}>
              <Text style={styles.mirrorCardTitle}>Mirror In Progress</Text>
              <View style={styles.generatingBox}>
                <Text style={styles.generatingText}>Generating...</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  overlayText: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  bottomHalf: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  scrollContent: {
    padding: 24,
  },
  question: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'left',
    marginBottom: 8,
    lineHeight: 28,
  },
  subtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'left',
    marginBottom: 24,
  },
  voiceContainer: {
    marginBottom: 16,
  },
  helperText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'left',
    fontStyle: 'italic',
  },
  generationContainer: {
    marginTop: 0,
  },
  readyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  mirrorCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mirrorCardTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 24,
    textAlign: 'center',
  },
  mirrorCompleteTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 32,
    textAlign: 'center',
  },
  generatingBox: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 24,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
  },
  generatingText: {
    fontSize: 18,
    color: '#94a3b8',
    textAlign: 'center',
    fontWeight: '500',
  },
  viewMirrorButton: {
    backgroundColor: '#fbbf24',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  viewMirrorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  continueButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
