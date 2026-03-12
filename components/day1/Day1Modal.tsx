// components/day1/Day1Modal.tsx
// Main orchestrator for Day 1 onboarding flow (5 steps)

import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, StyleSheet, Alert, TouchableOpacity, Text, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode } from 'expo-av';
import { useAuth } from '../../contexts/AuthContext';
import { getDay1Progress, completeDay1, generateMiniMirror } from '../../lib/supabase/day1';
import { colors, typography, spacing, fontFamily } from '../../theme/designTokens';

const { width, height } = Dimensions.get('window');

const PENDING_JOBS_KEY = 'oxbow_pending_voice_jobs';
import { Step1SpiritualPlace } from './Step1SpiritualPlace';
import { Step2VoiceJournal } from './Step2VoiceJournal';
import { Step3VoiceJournal } from './Step3VoiceJournal';
import { Step5MiniMirror } from './Step5MiniMirror';

interface Day1ModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: () => void; // Called when user finishes Day 1
}

export const Day1Modal: React.FC<Day1ModalProps> = ({ visible, onClose, onComplete }) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [spiritualPlace, setSpiritualPlace] = useState<string | null>(null);
  const [miniMirrorId, setMiniMirrorId] = useState<string | null>(null);
  const [step2JournalId, setStep2JournalId] = useState<string | null>(null);
  const [step3JournalId, setStep3JournalId] = useState<string | null>(null);
  const [isWaitingForRecovery, setIsWaitingForRecovery] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const recoveryPollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up recovery poll on unmount
  useEffect(() => {
    return () => {
      if (recoveryPollRef.current) clearTimeout(recoveryPollRef.current);
    };
  }, []);

  // Debug: trace state changes
  useEffect(() => {
    console.log('🔍 [Day1Modal] state:', { currentStep, loading, isGenerating, miniMirrorId, isWaitingForRecovery });
  }, [currentStep, loading, isGenerating, miniMirrorId, isWaitingForRecovery]);

  // Load progress and determine starting step
  useEffect(() => {
    if (visible && user) {
      console.log('🔄 [Day1Modal] loadProgress triggered — visible:', visible, 'userId:', user.id);
      loadProgress();
    }
  }, [visible, user]);

  const loadProgress = async () => {
    if (!user) return;

    console.log('📂 [Day1Modal] loadProgress start');
    setLoading(true);
    const result = await getDay1Progress(user.id);

    if (result.success && result.progress) {
      const progress = result.progress as any;

      // If already completed, don't show modal
      if (progress.completed_at) {
        onClose();
        return;
      }

      // Restore spiritual place if saved
      if (progress.spiritual_place) {
        setSpiritualPlace(progress.spiritual_place);
      }

      // Restore mini-mirror if generated
      if (progress.mini_mirror_id) {
        setMiniMirrorId(progress.mini_mirror_id);
      }

      // Store journal IDs for step progression logic
      if (progress.step_2_journal_id) {
        setStep2JournalId(progress.step_2_journal_id);
      }
      if (progress.step_3_journal_id) {
        setStep3JournalId(progress.step_3_journal_id);
      }

      // Determine starting step
      if (progress.mini_mirror_id && progress.generation_status === 'completed') {
        setCurrentStep(5);
      } else if (progress.step_3_journal_id) {
        // Recording done but no mirror — resume generation from here
        setLoading(false);
        handleGenerateMirror();
        return;
      } else if (progress.step_2_journal_id) {
        // Check whether recovery is in-flight for step 3
        const hasRecoveryJob = await checkForDay1RecoveryJob(3);
        if (hasRecoveryJob) {
          setIsWaitingForRecovery(true);
          setLoading(false);
          pollUntilRecoveryComplete(3);
          return;
        }
        setCurrentStep(3);
      } else if (progress.spiritual_place) {
        // Check whether recovery is in-flight for step 2
        const hasRecoveryJob = await checkForDay1RecoveryJob(2);
        if (hasRecoveryJob) {
          setIsWaitingForRecovery(true);
          setLoading(false);
          pollUntilRecoveryComplete(2);
          return;
        }
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }

      console.log('📂 [Day1Modal] loadProgress done', {
        mini_mirror_id: progress.mini_mirror_id,
        generation_status: progress.generation_status,
      });
    } else {
      console.log('⚠️ [Day1Modal] loadProgress — no progress found:', result);
    }

    setLoading(false);
  };

  // Check AsyncStorage for a pending voice job tagged with the given Day 1 step
  const checkForDay1RecoveryJob = async (step: 2 | 3): Promise<boolean> => {
    try {
      const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
      if (!raw) return false;
      const jobs = JSON.parse(raw);
      return jobs.some((j: any) => j.day1Step === step);
    } catch {
      return false;
    }
  };

  // Poll day_1_progress every 3s until the step journal ID is set (recovery complete)
  const pollUntilRecoveryComplete = (step: 2 | 3) => {
    if (!user) return;
    const field = step === 2 ? 'step_2_journal_id' : 'step_3_journal_id';

    const tick = async () => {
      try {
        const result = await getDay1Progress(user.id);
        if (result.success && (result.progress as any)?.[field]) {
          // Recovery has linked the journal — reload progress to advance to correct step
          setIsWaitingForRecovery(false);
          await loadProgress();
        } else {
          recoveryPollRef.current = setTimeout(tick, 3000);
        }
      } catch {
        recoveryPollRef.current = setTimeout(tick, 3000);
      }
    };

    recoveryPollRef.current = setTimeout(tick, 2000);
  };

  const handleClose = () => {
    onClose();
  };

  const handleBack = () => {
    if (currentStep > 1 && currentStep < 3) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerateMirror = async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      const generateResult = await generateMiniMirror(user.id) as any;
      if (generateResult.success) {
        setMiniMirrorId(generateResult.mirror.id);
        await completeDay1(user.id);
        setIsGenerating(false);
        setCurrentStep(5);
      } else {
        console.error('❌ [Day1Modal] Mirror generation failed:', generateResult.error);
        setIsGenerating(false);
        Alert.alert(
          'Generation Failed',
          'Unable to generate your Mirror. Would you like to try again?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Retry', onPress: handleGenerateMirror },
          ]
        );
      }
    } catch (error) {
      console.error('❌ [Day1Modal] Unexpected error during generation:', error);
      setIsGenerating(false);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const handleStep1Complete = (selectedPlace: string) => {
    setSpiritualPlace(selectedPlace);
    setCurrentStep(2);
  };

  const handleStep2Complete = () => {
    setCurrentStep(3);
  };

  const handleStep3Complete = () => {
    handleGenerateMirror();
  };

  const handleStep5Complete = () => {
    onComplete();
  };

  if (!user) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header area with background — hidden on step 5 (hero handles navigation) */}
        {currentStep !== 5 && <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
          {/* Single row with back button, progress, and close button */}
          <View style={styles.header}>
            {/* Back button or spacer */}
            <View style={styles.leftSection}>
              {currentStep > 1 && currentStep <= 3 && !isGenerating && (
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Step indicator in center (hidden on step 5) */}
            {currentStep !== 5 && (
              <View style={styles.stepIndicator}>
                {[1, 2, 3].map((step) => (
                  <View
                    key={step}
                    style={[
                      styles.stepDot,
                      Math.min(currentStep, 3) >= step && styles.stepDotActive
                    ]}
                  />
                ))}
              </View>
            )}
            {/* Close button on right */}
            <View style={styles.rightSection}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>}

        {/* Step content */}
        <View style={styles.content}>
          {isGenerating ? (
            <View style={styles.generatingContainer}>
              <Video
                source={require('../../assets/background-video.mp4')}
                style={styles.generatingVideo}
                resizeMode={ResizeMode.COVER}
                isLooping
                isMuted
                shouldPlay
              />
              <View style={styles.generatingOverlay} />
              <View style={styles.generatingContent}>
                <ActivityIndicator size="large" color={colors.text.white} style={styles.generatingSpinner} />
                <Text style={styles.generatingMessage}>Building your first Mirror</Text>
              </View>
            </View>
          ) : loading || isWaitingForRecovery ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" style={styles.spinner} />
              <Text style={styles.loadingText}>
                {isWaitingForRecovery ? 'Finishing your last recording...' : 'Loading...'}
              </Text>
            </View>
          ) : (
            <>
              {currentStep === 1 && (
                <Step1SpiritualPlace
                  userId={user.id}
                  initialSelection={spiritualPlace}
                  onComplete={handleStep1Complete}
                />
              )}

              {currentStep === 2 && (
                <Step2VoiceJournal
                  userId={user.id}
                  spiritualPlace={spiritualPlace!}
                  existingJournalId={step2JournalId || undefined}
                  onComplete={handleStep2Complete}
                />
              )}

              {currentStep === 3 && (
                <Step3VoiceJournal
                  userId={user.id}
                  spiritualPlace={spiritualPlace!}
                  existingJournalId={step3JournalId || undefined}
                  onComplete={handleStep3Complete}
                />
              )}

              {currentStep === 5 && (
                <Step5MiniMirror
                  userId={user.id}
                  userName={user.display_name || 'friend'}
                  mirrorId={miniMirrorId!}
                  spiritualPlace={spiritualPlace!}
                  onClose={handleClose}
                  onComplete={handleStep5Complete}
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  leftSection: {
    width: 70,
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 24,
    color: '#64748b',
  },
  rightSection: {
    width: 70,
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#64748b',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  stepDotActive: {
    backgroundColor: '#64748b',
    width: 24,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    marginBottom: 4,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
  generatingContainer: {
    flex: 1,
  },
  generatingVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width,
    height,
  },
  generatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  generatingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxxl,
  },
  generatingSpinner: {
    marginBottom: spacing.xxxxl,
  },
  generatingMessage: {
    fontFamily: fontFamily.primary,
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
