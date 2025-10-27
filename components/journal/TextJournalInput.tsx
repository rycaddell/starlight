// components/journal/TextJournalInput.tsx
// UPDATED - Shorter fixed height for better submit button visibility
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

interface TextJournalInputProps {
  journalText: string;
  setJournalText: (text: string) => void;
  contextPrompt?: string | null;
  hidePlaceholder?: boolean;
}

export const TextJournalInput: React.FC<TextJournalInputProps> = ({
  journalText,
  setJournalText,
  contextPrompt,
  hidePlaceholder,
}) => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.textInput}
        multiline={true}
        placeholder={hidePlaceholder || contextPrompt ? "" : "What did you learn or hear today?"}
        placeholderTextColor="#64748b"
        value={journalText}
        onChangeText={setJournalText}
        returnKeyType="default"
        scrollEnabled={true}
        showsVerticalScrollIndicator={true}
        textAlignVertical="top"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    width: '100%',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    height: 120, // Fixed height for ~4 lines (16px font * 1.25 line height * 4 lines + 32px padding)
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
});