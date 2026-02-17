// components/journal/TextJournalInput.tsx
import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

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
        placeholder={hidePlaceholder || contextPrompt ? '' : 'What did you learn or hear today?'}
        placeholderTextColor={colors.text.bodyLight}
        value={journalText}
        onChangeText={setJournalText}
        returnKeyType="default"
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
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
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.l,
    fontFamily: typography.body.default.fontFamily,
    fontSize: typography.body.default.fontSize,
    fontWeight: '400',
    color: colors.text.body,
    minHeight: 240,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
});
