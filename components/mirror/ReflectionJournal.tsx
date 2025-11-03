import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

interface ReflectionJournalProps {
  onComplete: (focus: string, action: string) => void;
  initialFocus?: string;
  initialAction?: string;
}

export const ReflectionJournal: React.FC<ReflectionJournalProps> = ({ 
  onComplete, 
  initialFocus = '', 
  initialAction = '' 
}) => {
  const [focus, setFocus] = useState(initialFocus);
  const [action, setAction] = useState(initialAction);

  const handleContinue = () => {
    if (focus.trim() && action.trim()) {
      onComplete(focus.trim(), action.trim());
    }
  };

  const isComplete = focus.trim().length > 0 && action.trim().length > 0;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Looking Forward</Text>
        <Text style={styles.subtitle}>Your next step</Text>

        {/* Question 1: Focus */}
        <View style={styles.questionBlock}>
          <Text style={styles.questionLabel}>
            If you had to pick one thing that stood out to you and would become your focus, what would it be?
          </Text>
          <TextInput
            style={styles.input}
            value={focus}
            onChangeText={setFocus}
            placeholder="Your focus..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Question 2: Action */}
        <View style={styles.questionBlock}>
          <Text style={styles.questionLabel}>
            What's one thing you can do today to act on your learning?
          </Text>
          <TextInput
            style={styles.input}
            value={action}
            onChangeText={setAction}
            placeholder="Your action step..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.continueButton, !isComplete && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!isComplete}
        >
          <Text style={[styles.continueButtonText, !isComplete && styles.continueButtonTextDisabled]}>
            Continue →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 32,
    textAlign: 'center',
  },
  questionBlock: {
    marginBottom: 32,
  },
  questionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 12,
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#f8fafc',
    minHeight: 120,
    borderWidth: 2,
    borderColor: '#475569',
  },
  continueButton: {
    backgroundColor: '#fbbf24',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonDisabled: {
    backgroundColor: '#374151',
  },
  continueButtonText: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#64748b',
  },
});