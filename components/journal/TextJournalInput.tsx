// components/journal/TextJournalInput.tsx
// NEW FILE - Just the text input without submit button
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
    minHeight: 150,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#94a3b8',
  },
});