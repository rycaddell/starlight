// components/journal/JournalBottomSheet.tsx
// REVISED VERSION - Proper recording cleanup on close
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextJournalInput } from './TextJournalInput';
import { VoiceRecordingTab } from '../voice/VoiceRecordingTab';

type TabType = 'text' | 'voice';

interface JournalBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  mode: 'free' | 'guided';
  promptText: string | null;
  onSubmit: (text: string, timestamp: string, entryType: 'text' | 'voice') => void;
  defaultTab: 'text' | 'voice'; // Default tab based on which card was pressed

  // Voice recording props
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  isProcessing: boolean;
  formatDuration: (seconds: number) => string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onDiscardRecording: () => void; // NEW: Discard without saving
}

export const JournalBottomSheet: React.FC<JournalBottomSheetProps> = ({
  visible,
  onClose,
  mode,
  promptText,
  onSubmit,
  defaultTab,
  isRecording,
  isPaused,
  recordingDuration,
  isProcessing,
  formatDuration,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onDiscardRecording,
}) => {
  const [journalText, setJournalText] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  // Set active tab based on which card was pressed
  useEffect(() => {
    if (visible) {
      setActiveTab(defaultTab);
    }
  }, [visible, defaultTab]);

  const handleSubmit = async () => {
    if (journalText.trim()) {
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      await onSubmit(journalText.trim(), timestamp, 'text');
      setJournalText('');
      onClose();
    }
  };

  const handleClose = () => {
    // If recording is active, show confirmation
    if (isRecording) {
      Alert.alert(
        'Discard Recording?',
        'You have an active recording. Closing will discard it.',
        [
          { text: 'Continue Recording', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => {
              onDiscardRecording(); // Discard without saving
              setJournalText('');
              setActiveTab(defaultTab);
              onClose();
            }
          }
        ]
      );
      return;
    }
    
    // Normal close
    setJournalText('');
    setActiveTab(defaultTab);
    onClose();
  };

  const isSubmitDisabled = !journalText.trim();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Journal</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Guided Prompt - Show for both tabs */}
        {mode === 'guided' && promptText && (
          <View style={styles.promptContainer}>
            <Text style={styles.promptLabel}>GUIDED</Text>
            <Text style={styles.promptText}>{promptText}</Text>
          </View>
        )}

        {/* Simple Tab Switcher - Voice first (left), Text second (right) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'voice' && styles.tabActive
            ]}
            onPress={() => setActiveTab('voice')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'voice' && styles.tabTextActive
            ]}>
              Voice
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'text' && styles.tabActive
            ]}
            onPress={() => {
              if (isRecording) {
                Alert.alert(
                  'Stop Recording First',
                  'Please stop your recording before switching tabs.',
                  [{ text: 'OK' }]
                );
                return;
              }
              setActiveTab('text');
            }}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'text' && styles.tabTextActive
            ]}>
              Text
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        {activeTab === 'text' ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <TextJournalInput
              journalText={journalText}
              setJournalText={setJournalText}
              contextPrompt={mode === 'guided' ? promptText : null}
            />

            {/* Submit Button - Only for text tab */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              style={[
                styles.submitButton,
                isSubmitDisabled ? styles.submitButtonDisabled : styles.submitButtonActive
              ]}
            >
              <Text style={[
                styles.submitButtonText,
                isSubmitDisabled ? styles.submitButtonTextDisabled : styles.submitButtonTextActive
              ]}>
                Submit
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.voiceContentContainer}
          >
            <VoiceRecordingTab
              isRecording={isRecording}
              isPaused={isPaused}
              recordingDuration={recordingDuration}
              isProcessing={isProcessing}
              formatDuration={formatDuration}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              onPauseRecording={onPauseRecording}
              onResumeRecording={onResumeRecording}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: 'bold',
  },
  promptContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 24,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#2563eb',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 54 : 40,
  },
  voiceContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonActive: {
    backgroundColor: '#2563eb',
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  submitButtonTextActive: {
    color: '#ffffff',
  },
  submitButtonTextDisabled: {
    color: '#64748b',
  },
});