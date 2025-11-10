import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

interface ReflectionJournalProps {
  onComplete: (focus: string, action: string) => void;
  initialFocus?: string;
  initialAction?: string;
  isReadOnly?: boolean;
  completedAt?: string; // Timestamp when reflection was completed
  onFormChange?: (focus: string, action: string) => void; // Notify parent of changes
}

export const ReflectionJournal: React.FC<ReflectionJournalProps> = ({ 
  onComplete, 
  initialFocus = '', 
  initialAction = '',
  isReadOnly = false,
  completedAt,
  onFormChange
}) => {
  const [focus, setFocus] = useState(initialFocus);
  const [action, setAction] = useState(initialAction);

  // Format date as MM/YY
  const formatCompletedDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}/${year}`;
  };

  const handleFocusChange = (text: string) => {
    setFocus(text);
    if (onFormChange) {
      onFormChange(text, action);
    }
  };

  const handleActionChange = (text: string) => {
    setAction(text);
    if (onFormChange) {
      onFormChange(focus, text);
    }
  };

  const handleContinue = () => {
    if (focus.trim() && action.trim()) {
      onComplete(focus.trim(), action.trim());
    }
  };

  const isComplete = focus.trim().length > 0 && action.trim().length > 0;

  // Read-only view (for when reflection is already completed)
  if (isReadOnly && initialFocus && initialAction) {
    return (
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Your Reflection</Text>
          {completedAt && (
            <Text style={styles.subtitle}>
              Completed on {formatCompletedDate(completedAt)}
            </Text>
          )}

          {/* Question 1: Focus */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionLabel}>
              What's standing out as your next step to become more like Jesus?
            </Text>
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyText}>{initialFocus}</Text>
            </View>
          </View>

          {/* Question 2: Action */}
          <View style={styles.questionBlock}>
            <Text style={styles.questionLabel}>
              How could you act on this today?
            </Text>
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyText}>{initialAction}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Editable form (for first-time completion)
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={100}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Respond</Text>

        {/* Question 1: Focus */}
        <View style={styles.questionBlock}>
          <Text style={styles.questionLabel}>
            What's standing out as your next step to become more like Jesus?
          </Text>
          <TextInput
            style={styles.input}
            value={focus}
            onChangeText={handleFocusChange}
            placeholder="Your focus..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        {/* Question 2: Action */}
        <View style={styles.questionBlock}>
          <Text style={styles.questionLabel}>
            How could you act on this today?
          </Text>
          <TextInput
            style={styles.input}
            value={action}
            onChangeText={handleActionChange}
            placeholder="Your action step..."
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        <TouchableOpacity
          style={[styles.completeButton, !isComplete && styles.completeButtonDisabled]}
          onPress={handleContinue}
          disabled={!isComplete}
        >
          <Text style={[styles.completeButtonText, !isComplete && styles.completeButtonTextDisabled]}>
            Complete Mirror ✨
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
    paddingTop: 28,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 0,
    marginBottom: 24,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    marginBottom: 24,
    textAlign: 'center',
  },
  questionBlock: {
    marginBottom: 20,
  },
  questionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 10,
    lineHeight: 22,
  },
  input: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#f8fafc',
    minHeight: 90,
    maxHeight: 150,
    borderWidth: 2,
    borderColor: '#475569',
  },
  completeButton: {
    backgroundColor: '#fbbf24',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  completeButtonDisabled: {
    backgroundColor: '#374151',
  },
  completeButtonText: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: '700',
  },
  completeButtonTextDisabled: {
    color: '#64748b',
  },
  // Read-only styles
  readOnlyBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#475569',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#e2e8f0',
    lineHeight: 24,
  },
});