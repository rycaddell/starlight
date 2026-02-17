// components/friends/AddProfilePicCard.tsx
// Component to encourage users to add a profile picture

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

interface AddProfilePicCardProps {
  onAddPress: () => Promise<void>;
}

export function AddProfilePicCard({ onAddPress }: AddProfilePicCardProps) {
  const [loading, setLoading] = useState(false);

  const handleAddPress = async () => {
    setLoading(true);
    try {
      await onAddPress();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconSymbol name="person.circle" size={24} color={colors.text.primary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Add a profile pic</Text>
        <Text style={styles.description}>
          Give your friends a nice pic of your face.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleAddPress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.white} />
        ) : (
          <Text style={styles.buttonText}>Add</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.background.primaryLighter,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  content: {
    marginBottom: spacing.xl,
  },
  heading: {
    ...typography.heading.default,
    color: colors.text.body,
    marginBottom: spacing.m,
  },
  description: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.heading.s,
    color: colors.text.white,
  },
});
