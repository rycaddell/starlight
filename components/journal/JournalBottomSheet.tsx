// components/journal/JournalBottomSheet.tsx
// Simple Modal version - no fancy libraries, just works
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { TextJournalInput } from './TextJournalInput';

interface JournalBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  mode: 'free' | 'guided';
  promptText: string | null;
  onSubmit: (text: string, timestamp: string) => void;
}

export const JournalBottomSheet: React.FC<JournalBottomSheetProps> = ({
  visible,
  onClose,
  mode,
  promptText,
  onSubmit,
}) => {
  const [journalText, setJournalText] = useState('');

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

      await onSubmit(journalText.trim(), timestamp);
      setJournalText('');
      onClose();
    }
  };

  const handleClose = () => {
    setJournalText('');
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

        {/* Guided Prompt */}
        {mode === 'guided' && promptText && (
          <View style={styles.promptContainer}>
            <Text style={styles.promptLabel}>GUIDED</Text>
            <Text style={styles.promptText}>{promptText}</Text>
          </View>
        )}

        {/* Scrollable Content with Submit Button Inside */}
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

          {/* Submit Button - Now inside ScrollView */}
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 54 : 40, // Extra padding for safe area and spacing
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20, // Space between input and button
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