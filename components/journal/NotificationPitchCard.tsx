// components/journal/NotificationPitchCard.tsx
// Pitch card shown on Journal tab to users who haven't set up reminders

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '../../theme/designTokens';

interface NotificationPitchCardProps {
  onSetupPress: () => void;
  onDismiss: () => void;
}

export function NotificationPitchCard({ onSetupPress, onDismiss }: NotificationPitchCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <IconSymbol name="bell.badge" size={24} color={colors.text.primary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>{"Don't miss what God shares with you."}</Text>
        <Text style={styles.description}>
          {"Set up reminders to capture what happens after church, small group, or your time with God — before the moment fades."}
        </Text>
      </View>

      <TouchableOpacity style={styles.setupButton} onPress={onSetupPress}>
        <Text style={styles.setupButtonText}>Set up reminders</Text>
      </TouchableOpacity>

      <Button variant="outline" label="Not now" onPress={onDismiss} fullWidth />
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
  setupButton: {
    backgroundColor: colors.background.primaryLight,
    paddingVertical: spacing.l,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: spacing.m,
  },
  setupButtonText: {
    ...typography.heading.s,
    color: colors.text.body,
  },
});
