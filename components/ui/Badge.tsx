// components/ui/Badge.tsx
// Badge component with 2 variants: notification count and NEW indicator

import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { colors, typography, borderRadius } from '@/theme/designTokens';

export type BadgeVariant = 'notification' | 'new';

export interface BadgeProps {
  variant: BadgeVariant;
  count?: number; // For notification variant
}

export const Badge: React.FC<BadgeProps> = ({ variant, count }) => {
  if (variant === 'notification') {
    // Don't render if count is 0 or undefined
    if (!count || count === 0) {
      return null;
    }

    return (
      <View style={styles.notificationContainer}>
        <Text style={styles.notificationText}>{count}</Text>
      </View>
    );
  }

  // NEW badge variant
  return (
    <View style={styles.newContainer}>
      <Text style={styles.newText}>NEW</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  notificationContainer: {
    backgroundColor: colors.background.notification,
    minWidth: 28,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    fontFamily: typography.body.s.fontFamily,
    fontWeight: '500' as TextStyle['fontWeight'],
    fontSize: 13,
    lineHeight: 18, // Increased from 13 for proper vertical centering
    color: colors.text.black,
    textAlign: 'center',
  },
  newContainer: {
    backgroundColor: colors.background.notification,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newText: {
    fontFamily: typography.body.s.fontFamily,
    fontWeight: '500' as TextStyle['fontWeight'],
    fontSize: 13,
    lineHeight: 18, // Increased from 13 for proper vertical centering
    color: colors.text.body,
    textAlign: 'center',
  },
});
