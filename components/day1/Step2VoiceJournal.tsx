// components/day1/Step2VoiceJournal.tsx
// Step 2: Voice journal about what shaped spiritual place choice

import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, Alert, TouchableOpacity, AppState } from 'react-native';
import { Audio } from 'expo-av';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { VoiceRecordingTab } from '../voice/VoiceRecordingTab';
import { saveStepJournal } from '../../lib/supabase/day1';
import { saveJournalEntry } from '../../lib/supabase';
import { colors, typography, spacing, borderRadius, fontFamily } from '../../theme/designTokens';

interface Step2VoiceJournalProps {
  userId: string;
  spiritualPlace: string;
  existingJournalId?: string; // If set, user is returning to completed step
  onComplete: () => void;
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

export const Step2VoiceJournal: React.FC<Step2VoiceJournalProps> = ({
  userId,
  spiritualPlace,
  existingJournalId,
  onComplete,
}) => {
  // If existingJournalId exists, user is returning to completed step
  const [hasRecorded, setHasRecorded] = useState(!!existingJournalId);

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
  } = useAudioRecording(async (transcribedText: string, timestamp: string, savedJournalId?: string) => {
    console.log('🎤 [STEP2] Voice transcribed:', transcribedText.substring(0, 50));

    let journalId: string;

    if (savedJournalId) {
      // New flow: journal already created and populated by edge function
      console.log('✅ [STEP2] Journal already saved by edge function:', savedJournalId);
      journalId = savedJournalId;
    } else {
      // Fallback flow: save journal entry now
      console.log('💾 [STEP2] Saving journal with transcription_status: completed');
      const saveResult = await saveJournalEntry(transcribedText, userId, 'voice', null, 'completed');

      if (!saveResult.success || !saveResult.data) {
        console.error('❌ [STEP2] Failed to save journal:', saveResult.error);
        Alert.alert('Save Error', saveResult.error || 'Failed to save journal. Please try again.');
        return;
      }

      journalId = saveResult.data.id;
      console.log('✅ [STEP2] Journal saved:', journalId);
    }

    // Link journal to day_1_progress
    console.log('🔗 [STEP2] Linking journal to day_1_progress...');
    const linkResult = await saveStepJournal(userId, 2, journalId);

    if (linkResult.success) {
      console.log('✅ [STEP2] Journal linked to Day 1 progress');

      // If this was the first recording (user didn't return to this step), auto-progress
      if (!existingJournalId) {
        onComplete();
      } else {
        // User is re-recording on a return visit, show buttons
        setHasRecorded(true);
      }
    } else {
      console.error('❌ [STEP2] Failed to link journal:', linkResult.error);
      Alert.alert('Save Error', linkResult.error || 'Failed to link journal. Please try again.');
    }
  }, 2);

  // Check permission and start recording
  const handleStartRecordingWithPermission = async () => {
    try {
      console.log('🎤 [STEP2-PERMISSION] Checking microphone permission...');

      const currentStatus = await Audio.getPermissionsAsync();
      console.log('📊 [STEP2-PERMISSION] Current permission status:', JSON.stringify(currentStatus, null, 2));

      if (currentStatus.granted) {
        console.log('✅ [STEP2-PERMISSION] Permission already granted, starting recording');
        await handleStartRecording(true);
        return;
      }

      // Request permission directly (no app alert needed)
      console.log('📝 [STEP2-PERMISSION] Permission not granted, requesting directly...');

      try {
        console.log('🔧 [STEP2-PERMISSION] Setting audio mode...');

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        console.log('✅ [STEP2-PERMISSION] Audio mode set successfully');
        console.log('🔐 [STEP2-PERMISSION] Requesting system permission...');

        const permission = await Audio.requestPermissionsAsync();
        console.log('📊 [STEP2-PERMISSION] Permission response:', JSON.stringify(permission, null, 2));

        const granted = permission.granted === true || permission.status === 'granted';
        console.log('🔍 [STEP2-PERMISSION] Permission granted:', granted);

        if (granted) {
          console.log('✅ [STEP2-PERMISSION] Permission granted, waiting for app to become active...');

          // Wait for app to return to active state after permission dialog closes
          const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
              console.log('📱 [STEP2-PERMISSION] App returned to active state');
              subscription.remove();

              // Small delay to ensure app is fully active
              setTimeout(async () => {
                console.log('🎙️ [STEP2-PERMISSION] Calling handleStartRecording...');
                await handleStartRecording(true);
              }, 50);
            }
          });

          // Fallback timeout in case AppState doesn't fire
          setTimeout(() => {
            console.log('⚠️ [STEP2-PERMISSION] Fallback timeout reached, removing listener');
            subscription.remove();
          }, 3000);
        } else {
          console.error('❌ [STEP2-PERMISSION] Permission denied by user');
          Alert.alert(
            'Permission Denied',
            'Microphone access is needed for voice journaling. Please enable it in Settings.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('❌ [STEP2-PERMISSION] Error requesting permission:', error);
        Alert.alert('Error', 'Unable to set up microphone. Please try again.');
      }
    } catch (error) {
      console.error('❌ [STEP2-PERMISSION] Error in permission check:', error);
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
        {/* Overlay with spiritual place - centered, left aligned, no background */}
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>{spiritualPlace}</Text>
        </View>
      </View>

      {/* Bottom half: Question and voice recording */}
      <ScrollView style={styles.bottomHalf} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.question}>
          What's going on?
        </Text>
        <Text style={styles.subtext}>Share why you chose your answer.</Text>

        {/* Voice recording component */}
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
          <TouchableOpacity style={styles.continueButton} onPress={onComplete}>
            <Text style={styles.continueButtonText}>Next</Text>
          </TouchableOpacity>
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
    backgroundColor: colors.background.defaultLight,
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
    paddingHorizontal: spacing.xxxl,
  },
  overlayText: {
    fontFamily: fontFamily.primary,
    color: colors.text.white,
    fontSize: 48,
    fontWeight: '700',
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  bottomHalf: {
    flex: 1,
    backgroundColor: colors.background.white,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    marginTop: -30,
  },
  scrollContent: {
    padding: spacing.xxxl,
  },
  question: {
    ...typography.heading.l,
    color: colors.text.body,
    textAlign: 'left',
    marginBottom: spacing.m,
  },
  subtext: {
    ...typography.body.default,
    color: colors.text.bodyLight,
    textAlign: 'left',
    marginBottom: spacing.xxxl,
  },
  voiceContainer: {
    marginBottom: spacing.xl,
  },
  helperText: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    textAlign: 'left',
    fontStyle: 'italic',
  },
  continueButton: {
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    marginTop: spacing.xxxl,
  },
  continueButtonText: {
    ...typography.heading.default,
    color: colors.text.white,
  },
});
