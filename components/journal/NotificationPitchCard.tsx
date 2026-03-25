// components/journal/NotificationPitchCard.tsx
// Pitch card shown on Journal tab to users who haven't set up reminders

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '../../theme/designTokens';

interface NotificationPitchCardProps {
  onSetupPress: () => void;
  onDismiss: () => void;
}

export function NotificationPitchCard({ onSetupPress, onDismiss }: NotificationPitchCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.heading}>{"Don't forget what God shares with you"}</Text>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissButton} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Image
            source={require('../../assets/images/icons/Close.png')}
            style={styles.dismissIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      <Button variant="primaryFilled" label="Set up reminders" onPress={onSetupPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.l,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.divider,
    gap: spacing.l,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.l,
  },
  heading: {
    ...typography.special.promptBody,
    color: colors.text.body,
    lineHeight: 26,
    flex: 1,
  },
  dismissButton: {
    width: 24,
    alignItems: 'center',
  },
  dismissIcon: {
    width: 16,
    height: 16,
    marginTop: 2,
  },
});
