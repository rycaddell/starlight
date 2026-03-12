// components/ui/Card.tsx
// Card component with 3 variants: Journal, Prompt, Mirror

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';
import { Button } from './Button';
import { Badge } from './Badge';

export type CardVariant = 'journal' | 'prompt' | 'mirror';

// Journal Card Props
interface JournalCardProps {
  variant: 'journal';
  location: string;
  day: string;
  duration?: string;
  hasAudio?: boolean;
  bodyText: string;
  onPress?: () => void;
}

// Prompt Card Props
interface PromptCardProps {
  variant: 'prompt';
  promptText: string;
  onPress: () => void;
}

// Mirror Card Props (Friend Detail)
interface MirrorCardProps {
  variant: 'mirror';
  date: string;
  isNew?: boolean;
  title: string;
  onViewPress: () => void;
}

export type CardProps = JournalCardProps | PromptCardProps | MirrorCardProps;

export const Card: React.FC<CardProps> = (props) => {
  if (props.variant === 'journal') {
    return (
      <TouchableOpacity
        style={styles.journalContainer}
        onPress={props.onPress}
        activeOpacity={0.7}
        disabled={!props.onPress}
      >
        {/* Title row */}
        <View style={styles.journalTitleRow}>
          <Text style={styles.journalLocation}>{props.location}</Text>
          <Text style={styles.journalSeparator}> • </Text>
          <Text style={styles.journalDay}>{props.day}</Text>
        </View>

        {/* Duration row (if audio) */}
        {props.hasAudio && props.duration && (
          <View style={styles.journalDurationRow}>
            <Image
              source={require('@/assets/images/icons/Inline-Microphone.png')}
              style={styles.journalMicIcon}
              resizeMode="contain"
            />
            <Text style={styles.journalDuration}>{props.duration}</Text>
          </View>
        )}

        {/* Body text */}
        <Text style={styles.journalBody} numberOfLines={2} ellipsizeMode="tail">
          &quot;{props.bodyText}&quot;
        </Text>
      </TouchableOpacity>
    );
  }

  if (props.variant === 'prompt') {
    return (
      <View style={styles.promptContainer}>
        {/* Prompt text */}
        <Text style={styles.promptText}>{props.promptText}</Text>

        {/* Button */}
        <Button
          variant="primaryFilled"
          label="Start from Prompt"
          onPress={props.onPress}
          fullWidth
        />
      </View>
    );
  }

  // Mirror Card variant
  return (
    <View style={styles.mirrorContainer}>
      {/* Left side: Date row, then label + title grouped tightly */}
      <View style={styles.mirrorLeft}>
        <View style={styles.mirrorDateRow}>
          <Text style={styles.mirrorDate}>{props.date}</Text>
          {props.isNew && <Badge variant="new" />}
        </View>
        <View style={styles.mirrorLabelGroup}>
          <Text style={styles.mirrorLabel}>Mirror</Text>
          <Text style={styles.mirrorTitle}>{props.title}</Text>
        </View>
      </View>

      {/* Right side: Circle button */}
      <View style={styles.mirrorRight}>
        <Button
          variant="circle"
          label="View Mirror"
          onPress={props.onViewPress}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Journal Card
  journalContainer: {
    backgroundColor: colors.background.card,
    padding: spacing.m,
    borderRadius: borderRadius.card,
    gap: spacing.xs,
  },
  journalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  journalLocation: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  journalSeparator: {
    ...typography.heading.l,
    color: colors.text.bodyLight,
  },
  journalDay: {
    ...typography.heading.l,
    color: colors.text.bodyLight,
  },
  journalDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  journalMicIcon: {
    width: 20,
    height: 20,
  },
  journalDuration: {
    fontFamily: typography.body.s.fontFamily,
    fontWeight: '500',
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: 0.34,
    color: colors.text.bodyLight,
  },
  journalBody: {
    ...typography.body.default,
    color: colors.text.body,
    lineHeight: 22,
  },

  // Prompt Card
  promptContainer: {
    backgroundColor: colors.background.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.l,
    gap: spacing.xxxl,
  },
  promptText: {
    ...typography.special.promptBody,
    color: colors.text.body,
    lineHeight: 24,
  },

  // Mirror Card (Friend Detail)
  mirrorContainer: {
    backgroundColor: colors.background.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.xxl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mirrorLeft: {
    flex: 1,
    gap: spacing.m,
  },
  mirrorDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  mirrorDate: {
    ...typography.special.dateLabel,
    color: colors.text.body,
  },
  mirrorLabelGroup: {
    gap: spacing.xs,
  },
  mirrorLabel: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    lineHeight: 18,
  },
  mirrorTitle: {
    ...typography.heading.default,
    color: colors.text.body,
    lineHeight: 22,
  },
  mirrorRight: {
    marginLeft: spacing.l,
  },
});
