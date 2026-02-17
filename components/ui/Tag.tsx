// components/ui/Tag.tsx
// Tag component for category labels (Mirror, Themes, Observations, etc.)

import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { colors, typography, borderRadius, spacing } from '@/theme/designTokens';

export type TagVariant = 'default' | 'uppercase';

export interface TagProps {
  label: string;
  variant?: TagVariant;
}

export const Tag: React.FC<TagProps> = ({
  label,
  variant = 'uppercase',
}) => {
  const displayLabel = variant === 'uppercase' ? label.toUpperCase() : label;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.tag,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.tag,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: typography.heading.xs.fontFamily,
    fontWeight: '500' as TextStyle['fontWeight'],
    fontSize: 14,
    lineHeight: 18, // Increased from 14 for proper vertical centering in React Native
    letterSpacing: 0.56, // 4% of 14pt
    color: colors.text.bodyLight,
  },
});
