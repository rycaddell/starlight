// components/journal/GuidedPromptSingle.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GuidedPrompt, getShuffledPromptsForUser } from '../../constants/guidedPrompts';

const PROMPT_INDEX_KEY = '@oxbow_guided_prompt_index';

interface GuidedPromptSingleProps {
  userId: string;
  todayAnsweredPrompts: string[]; // Array of prompt texts answered today
  onPromptSelect: (prompt: GuidedPrompt) => void;
}

export const GuidedPromptSingle: React.FC<GuidedPromptSingleProps> = ({
  userId,
  todayAnsweredPrompts,
  onPromptSelect,
}) => {
  const [allPrompts, setAllPrompts] = useState<GuidedPrompt[]>([]);
  const [availablePrompts, setAvailablePrompts] = useState<GuidedPrompt[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize prompts on mount
  useEffect(() => {
    initializePrompts();
  }, [userId, todayAnsweredPrompts]);

  const initializePrompts = async () => {
    try {
      // Get deterministically shuffled prompts for this user
      const shuffled = getShuffledPromptsForUser(userId);
      setAllPrompts(shuffled);
      
      // Filter out prompts answered today
      const available = shuffled.filter(
        prompt => !todayAnsweredPrompts.includes(prompt.text)
      );
      
      // If all prompts have been answered today, allow all prompts
      // (edge case: user answered all 19 in one day)
      const finalAvailable = available.length > 0 ? available : shuffled;
      setAvailablePrompts(finalAvailable);
      
      // Load saved index or start at 0
      const savedIndex = await AsyncStorage.getItem(PROMPT_INDEX_KEY);
      const startIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
      
      // Make sure index is within bounds of available prompts
      setCurrentIndex(startIndex % finalAvailable.length);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error initializing prompts:', error);
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    try {
      // Move to next prompt in the sequence
      const nextIndex = (currentIndex + 1) % availablePrompts.length;
      setCurrentIndex(nextIndex);
      
      // Save the new index
      await AsyncStorage.setItem(PROMPT_INDEX_KEY, nextIndex.toString());
    } catch (error) {
      console.error('Error saving prompt index:', error);
    }
  };

  const handlePromptSelect = () => {
    // Trigger the selection callback with the current prompt
    // Don't advance here - only advance when user explicitly taps "Next question"
    // or when they answer (component will re-initialize with answered prompts filtered out)
    onPromptSelect(availablePrompts[currentIndex]);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <ActivityIndicator size="small" color="#2563eb" />
        </View>
      </View>
    );
  }

  if (availablePrompts.length === 0) {
    return null;
  }

  const currentPrompt = availablePrompts[currentIndex];

  return (
    <View style={styles.container}>
      {/* Guided Prompt Card */}
      <TouchableOpacity
        style={styles.card}
        onPress={handlePromptSelect}
        activeOpacity={0.7}
      >
        <Text style={styles.promptText}>{currentPrompt.text}</Text>

        <View style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Start</Text>
        </View>
      </TouchableOpacity>

      {/* Next Button - Only show if there are multiple available prompts */}
      {availablePrompts.length > 1 && (
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <Text style={styles.nextIcon}>🔄</Text>
          <Text style={styles.nextText}>Next question</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  promptText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#334155',
    lineHeight: 24,
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-end',
    marginTop: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
  },
  nextIcon: {
    fontSize: 14,
    marginRight: 8,
    opacity: 0.7,
  },
  nextText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748b',
  },
});