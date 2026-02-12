// components/day1/Day1Modal.tsx
// Main orchestrator for Day 1 onboarding flow (5 steps)

import React, { useState, useEffect } from 'react';
import { Modal, View, StyleSheet, Alert, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { getDay1Progress } from '../../lib/supabase/day1';
import { Step1SpiritualPlace } from './Step1SpiritualPlace';
import { Step2VoiceJournal } from './Step2VoiceJournal';
import { Step3VoiceJournal } from './Step3VoiceJournal';
import { Step4Loading } from './Step4Loading';
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
  const [summaries, setSummaries] = useState<any>(null);
  const [focusAreasSaved, setFocusAreasSaved] = useState(false);
  const [step2JournalId, setStep2JournalId] = useState<string | null>(null);
  const [step3JournalId, setStep3JournalId] = useState<string | null>(null);

  // Load progress and determine starting step
  useEffect(() => {
    if (visible && user) {
      loadProgress();
    }
  }, [visible, user]);

  const loadProgress = async () => {
    if (!user) return;

    setLoading(true);
    const result = await getDay1Progress(user.id);

    if (result.success && result.progress) {
      const progress = result.progress;

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
      let startStep = 1;

      if (progress.mini_mirror_id && progress.generation_status === 'completed') {
        startStep = 5; // Show mini-mirror + focus input
      } else if (progress.generation_status === 'generating') {
        startStep = 4; // Resume on loading screen
      } else if (progress.step_3_journal_id) {
        startStep = 4; // Waiting for transcriptions or generation
      } else if (progress.step_2_journal_id) {
        startStep = 3; // Resume at step 3
      } else if (progress.spiritual_place) {
        startStep = 2; // Resume at step 2
      }

      console.log('📍 Starting Day 1 at step:', startStep);
      setCurrentStep(startStep);
    }

    setLoading(false);
  };

  const handleClose = () => {
    // Only show alert for Step 5 without saved focus areas
    if (currentStep === 5 && !focusAreasSaved) {
      Alert.alert(
        'Proceed without focus?',
        'Answering this will help shape your Oxbow experience.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', onPress: onClose }
        ]
      );
      return;
    }

    // For all other cases, just close (progress is auto-saved)
    onClose();
  };

  const handleBack = () => {
    if (currentStep > 1 && currentStep < 4) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStep1Complete = (selectedPlace: string) => {
    setSpiritualPlace(selectedPlace);
    setCurrentStep(2);
  };

  const handleStep2Complete = () => {
    setCurrentStep(3); // Go to Step 3 (prayer topics voice journal)
  };

  const handleStep3Complete = (mirrorId: string, summaries: any) => {
    setMiniMirrorId(mirrorId);
    setSummaries(summaries);
    setCurrentStep(5); // Go directly to Step 5 (skip loading screen)
  };

  const handleStep4Complete = (mirrorId: string, generatedSummaries: any) => {
    setMiniMirrorId(mirrorId);
    setSummaries(generatedSummaries);
    setCurrentStep(5);
  };

  const handleStep5Complete = () => {
    onComplete(); // Close modal and refresh main app
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
        {/* Header area with background */}
        <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
          {/* Single row with back button, progress, and close button */}
          <View style={styles.header}>
            {/* Back button or spacer */}
            <View style={styles.leftSection}>
              {currentStep > 1 && currentStep < 4 && (
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                  <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Step indicator in center (hidden on step 5) */}
            {currentStep !== 5 && (
              <View style={styles.stepIndicator}>
                {[1, 2, 3, 4, 5].map((step) => (
                  <View
                    key={step}
                    style={[
                      styles.stepDot,
                      currentStep >= step && styles.stepDotActive
                    ]}
                  />
                ))}
              </View>
            )}
            {currentStep === 5 && <View style={styles.stepIndicator} />}

            {/* Close button on right */}
            <View style={styles.rightSection}>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Step content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading...</Text>
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

              {currentStep === 4 && (
                <Step4Loading
                  userId={user.id}
                  userName={user.display_name || 'friend'}
                  onComplete={handleStep4Complete}
                />
              )}

              {currentStep === 5 && (
                <Step5MiniMirror
                  userId={user.id}
                  userName={user.display_name || 'friend'}
                  mirrorId={miniMirrorId!}
                  spiritualPlace={spiritualPlace!}
                  summaries={summaries}
                  onComplete={handleStep5Complete}
                  onFocusAreasSaved={() => setFocusAreasSaved(true)}
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
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
  },
});
