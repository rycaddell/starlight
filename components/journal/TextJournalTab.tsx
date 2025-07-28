/**
 * TextJournalTab Component
 * 
 * Handles text-based journal entry functionality including:
 * - Multi-line text input with 4-line minimum height
 * - Submit button with disabled state when empty
 * - Form submission with timestamp generation
 * - Navigation to mirror screen with journal data
 * - Input clearing after successful submission
 */

import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';

interface TextJournalTabProps {
  journalText: string;
  setJournalText: (text: string) => void;
  onSubmit: (text: string, timestamp: string) => void;
}

export const TextJournalTab: React.FC<TextJournalTabProps> = ({
  journalText,
  setJournalText,
  onSubmit
}) => {
  const isSubmitDisabled = !journalText.trim();

  const handleSubmit = () => {
    if (journalText.trim()) {
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      onSubmit(journalText.trim(), timestamp);
      setJournalText(''); // Clear input after submission
    }
  };

  return (
    <>
      {/* Text Input Field - 4 lines minimum, grows as needed */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          multiline={true}
          placeholder="Share your feelings, dreams, insights, and unpack your thinking…"
          placeholderTextColor="#64748b"
          value={journalText}
          onChangeText={setJournalText}
          returnKeyType="default"
        />
      </View>

      {/* Submit Button */}
      <View style={styles.buttonContainer}>
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
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    padding: 5,
    width: '100%',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1e293b', // slate-800
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#94a3b8', // slate-400
  },
  buttonContainer: {
    padding: 5,
    width: '100%',
  },
  submitButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  submitButtonActive: {
    backgroundColor: '#2563eb', // blue-600
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1', // slate-300
  },
  submitButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  submitButtonTextActive: {
    color: '#ffffff',
  },
  submitButtonTextDisabled: {
    color: '#64748b', // slate-500
  },
});