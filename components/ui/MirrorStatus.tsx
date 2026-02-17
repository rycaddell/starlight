// components/ui/MirrorStatus.tsx
// Mirror Status component - shows Mirror generation progress on Landing screen

import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

export type MirrorState = 'countdown' | 'ready' | 'generating' | 'complete';

export interface MirrorStatusProps {
  state: MirrorState;
  journalsNeeded?: number;
  journalsReady?: number;
  onGenerate?: () => void;
}

export const MirrorStatus: React.FC<MirrorStatusProps> = ({
  state,
  journalsNeeded,
  journalsReady,
  onGenerate,
}) => {
  if (state === 'countdown') {
    return (
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownTitle}>Mirror Ready in</Text>
        <Text style={styles.countdownNumber}>{journalsNeeded || 0}</Text>
        <Text style={styles.countdownSubtitle}>More Journals</Text>
      </View>
    );
  }

  if (state === 'ready') {
    return (
      <View style={styles.readyContainer}>
        <Text style={styles.readyTitle}>Mirror Ready</Text>
        <TouchableOpacity
          style={styles.readyButton}
          onPress={onGenerate || (() => {})}
          activeOpacity={0.7}
        >
          <Text style={styles.readyButtonText}>Generate Mirror</Text>
          <Image
            source={require('@/assets/images/icons/Sparkles.png')}
            style={styles.readyButtonIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.readySubtitle}>
          You have {journalsReady || 0} journals ready
        </Text>
      </View>
    );
  }

  if (state === 'generating') {
    return (
      <View style={styles.generatingContainer}>
        <View style={styles.generatingButton}>
          <Text style={styles.generatingText}>Generating Mirror</Text>
          <Image
            source={require('@/assets/images/icons/Refresh.png')}
            style={styles.generatingIcon}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.generatingSubtitle}>This can take up to 2 minutes</Text>
      </View>
    );
  }

  // Complete state
  return (
    <View style={styles.completeContainer}>
      <Text style={styles.completeText}>✨ Mirror Complete!</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Countdown state
  countdownContainer: {
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.xxxl,
  },
  countdownTitle: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  countdownNumber: {
    ...typography.special.mirrorCount,
    color: colors.text.primary,
  },
  countdownSubtitle: {
    ...typography.heading.s,
    color: colors.text.bodyLight,
  },

  // Ready state
  readyContainer: {
    alignItems: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  readyTitle: {
    ...typography.heading.l,
    color: colors.text.body,
    textAlign: 'center',
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.white,
    borderWidth: 1,
    borderColor: colors.border.outline,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: borderRadius.button,
    width: '100%',
    minHeight: 44,
    gap: spacing.m,
  },
  readyButtonText: {
    ...typography.heading.s,
    color: colors.text.primary,
    textAlign: 'center',
  },
  readyButtonIcon: {
    width: 18,
    height: 18,
  },
  readySubtitle: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    lineHeight: 18,
    textAlign: 'center',
  },

  // Generating state
  generatingContainer: {
    alignItems: 'center',
    gap: spacing.l,
    paddingVertical: spacing.xxxl,
  },
  generatingButton: {
    backgroundColor: colors.background.disabled,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 100,
    gap: spacing.m,
    minHeight: 44,
    width: '100%',
  },
  generatingText: {
    ...typography.heading.s,
    color: colors.text.bodyLight,
  },
  generatingIcon: {
    width: 18,
    height: 18,
  },
  generatingSubtitle: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    textAlign: 'center',
  },

  // Complete state
  completeContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl,
  },
  completeText: {
    ...typography.heading.l,
    color: colors.text.body,
    textAlign: 'center',
  },
});
