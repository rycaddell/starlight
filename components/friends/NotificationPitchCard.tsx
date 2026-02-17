// components/friends/NotificationPitchCard.tsx
// Component to encourage users to enable push notifications

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

interface NotificationPitchCardProps {
  onEnablePress: () => Promise<boolean>;
}

export function NotificationPitchCard({ onEnablePress }: NotificationPitchCardProps) {
  const [loading, setLoading] = useState(false);

  const handleEnablePress = async () => {
    setLoading(true);
    try {
      await onEnablePress();
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconSymbol name="bell.badge" size={24} color={colors.text.primary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Don't miss out</Text>
        <Text style={styles.description}>
          Allow Oxbow to send you push notifications to notify you when friends send their Mirrors to you and to remind you to journal.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleEnablePress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.text.white} />
        ) : (
          <Text style={styles.buttonText}>Enable notifications</Text>
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
