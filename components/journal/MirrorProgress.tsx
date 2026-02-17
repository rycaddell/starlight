// components/journal/MirrorProgress.tsx
// Shows progress toward the next Mirror generation (X/N journal entries).

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius } from '@/theme/designTokens';

interface MirrorProgressProps {
  currentCount: number;
  targetCount?: number;
}

export const MirrorProgress: React.FC<MirrorProgressProps> = ({
  currentCount,
  targetCount = 10,
}) => {
  const progressPercentage = Math.min((currentCount / targetCount) * 100, 100);

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${progressPercentage}%` }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: '100%',
    height: 8,
    backgroundColor: colors.border.divider,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.pill,
  },
});
