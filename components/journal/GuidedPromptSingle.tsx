// components/journal/GuidedPromptSingle.tsx
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GuidedPrompt, getShuffledPromptsForUser } from '../../constants/guidedPrompts';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

const PROMPT_INDEX_KEY = '@oxbow_guided_prompt_index';

export interface GuidedPromptSingleHandle {
  nextPrompt: () => void;
}

interface GuidedPromptSingleProps {
  userId: string;
  todayAnsweredPrompts: string[];
  onPromptSelect: (prompt: GuidedPrompt) => void;
}

export const GuidedPromptSingle = forwardRef<GuidedPromptSingleHandle, GuidedPromptSingleProps>(
  ({ userId, todayAnsweredPrompts, onPromptSelect }, ref) => {
    const [availablePrompts, setAvailablePrompts] = useState<GuidedPrompt[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      initializePrompts();
    }, [userId, todayAnsweredPrompts]);

    const initializePrompts = async () => {
      try {
        const shuffled = getShuffledPromptsForUser(userId);

        const available = shuffled.filter(
          prompt => !todayAnsweredPrompts.includes(prompt.text)
        );

        const finalAvailable = available.length > 0 ? available : shuffled;
        setAvailablePrompts(finalAvailable);

        const savedIndex = await AsyncStorage.getItem(PROMPT_INDEX_KEY);
        const startIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
        setCurrentIndex(startIndex % finalAvailable.length);

        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing prompts:', error);
        setIsLoading(false);
      }
    };

    const advancePrompt = async () => {
      try {
        const nextIndex = (currentIndex + 1) % availablePrompts.length;
        setCurrentIndex(nextIndex);
        await AsyncStorage.setItem(PROMPT_INDEX_KEY, nextIndex.toString());
      } catch (error) {
        console.error('Error saving prompt index:', error);
      }
    };

    useImperativeHandle(ref, () => ({
      nextPrompt: advancePrompt,
    }));

    if (isLoading) {
      return (
        <View style={styles.card}>
          <ActivityIndicator size="small" color={colors.text.primary} />
        </View>
      );
    }

    if (availablePrompts.length === 0) {
      return null;
    }

    const currentPrompt = availablePrompts[currentIndex];

    return (
      <View style={styles.card}>
        <Text style={styles.promptText}>{currentPrompt.text}</Text>
        <Button
          variant="primaryFilled"
          label="Start from Prompt"
          onPress={() => onPromptSelect(currentPrompt)}
        />
      </View>
    );
  }
);

GuidedPromptSingle.displayName = 'GuidedPromptSingle';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.l,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.divider,
    gap: spacing.l,
  },
  promptText: {
    ...typography.special.promptBody,
    color: colors.text.body,
    lineHeight: 26,
  },
});
