// components/ui/MirrorStatus.tsx
// Mirror Status component - shows Mirror generation progress on Landing screen

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';
import { MirrorGenerationProgressIndicator } from '../MirrorGenerationProgressIndicator';

export type MirrorState = 'countdown' | 'ready' | 'generating' | 'complete';

const EXPECTED_DURATION_MS = 120_000; // 2 minutes
const PROGRESS_FLOOR = 0.15;          // always show at least 15% fill
const PROGRESS_CAP = 0.95;            // never reach 1.0 until actually done

export interface MirrorStatusProps {
  state: MirrorState;
  journalsNeeded?: number;
  journalsReady?: number;
  generationStartTime?: number | null;
  onGenerate?: () => void;
  onViewMirror?: () => void;
}

export const MirrorStatus: React.FC<MirrorStatusProps> = ({
  state,
  journalsNeeded,
  journalsReady,
  generationStartTime,
  onGenerate,
  onViewMirror,
}) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (state !== 'generating' || !generationStartTime) {
      setProgress(0);
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - generationStartTime;
      const raw = Math.min(elapsed / EXPECTED_DURATION_MS, PROGRESS_CAP - PROGRESS_FLOOR);
      setProgress(PROGRESS_FLOOR + raw);
    };

    tick(); // immediate first update
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [state, generationStartTime]);

  if (state === 'countdown') {
    return (
      <View style={styles.countdownContainer}>
        <Text style={styles.countdownTitle}>Mirror Ready in</Text>
        <Text style={[styles.countdownNumber, { marginBottom: -12 }]}>{journalsNeeded || 0}</Text>
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
        <Text style={styles.generatingTitle}>Mirror Ready</Text>
        <View style={styles.generatingButton}>
          <Text style={styles.generatingText}>Generating Mirror</Text>
          <MirrorGenerationProgressIndicator size={28} progress={progress} />
        </View>
        <Text style={styles.generatingSubtitle}>This can take up to 2 minutes</Text>
      </View>
    );
  }

  // Complete state
  return (
    <View style={styles.completeContainer}>
      <Text style={styles.completeTitle}>Mirror Ready</Text>
      <TouchableOpacity
        style={styles.completeButton}
        onPress={onViewMirror || (() => {})}
        activeOpacity={0.7}
      >
        <Text style={styles.completeButtonText}>View Mirror</Text>
      </TouchableOpacity>
      <Text style={styles.completeSubtitle}>Your reflection is ready</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  // Countdown state
  countdownContainer: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.s,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.m,
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
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    gap: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  readyTitle: {
    ...typography.heading.l,
    color: colors.text.body,
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
    width: 246,
    height: 40,
    gap: spacing.ml,
  },
  readyButtonText: {
    ...typography.heading.s,
    color: colors.text.primary,
  },
  readyButtonIcon: {
    width: 18,
    height: 18,
  },
  readySubtitle: {
    ...typography.heading.xs,
    color: colors.text.bodyLight,
  },

  // Generating state
  generatingContainer: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    gap: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  generatingTitle: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  generatingButton: {
    backgroundColor: colors.background.disabled,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: borderRadius.button,
    gap: spacing.ml,
    height: 40,
    width: 246,
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
    ...typography.heading.xs,
    color: colors.text.bodyLight,
  },

  // Complete state
  completeContainer: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    gap: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  completeTitle: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.accent,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: borderRadius.button,
    width: 246,
    height: 40,
  },
  completeButtonText: {
    ...typography.heading.s,
    color: colors.text.body,
  },
  completeSubtitle: {
    ...typography.heading.xs,
    color: colors.text.bodyLight,
  },
});
