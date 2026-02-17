// components/day1/GetStartedCard.tsx
// Card that appears on journal screen for users who haven't completed Day 1

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

interface GetStartedCardProps {
  onPress: () => void;
}

export const GetStartedCard: React.FC<GetStartedCardProps> = ({ onPress }) => {
  return (
    <View style={styles.card}>
      <View style={styles.leftContent}>
        <Text style={styles.title}>Get Started</Text>
        <Text style={styles.subtitle}>3 mins • Voice</Text>
        <Text style={styles.description}>Where are you now?</Text>
      </View>

      <Button
        variant="accent"
        label="Begin"
        onPress={onPress}
        fullWidth={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xxl,
    padding: spacing.xxl,
    borderWidth: 2,
    borderColor: colors.border.outline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    marginRight: spacing.l,
    gap: spacing.xs,
  },
  title: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  subtitle: {
    ...typography.body.s,
    color: colors.text.bodyLight,
  },
  description: {
    ...typography.body.default,
    color: colors.text.bodyLight,
    lineHeight: 22,
  },
});
