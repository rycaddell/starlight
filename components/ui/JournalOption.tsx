// components/ui/JournalOption.tsx
// Journal Options component - Voice and Text cards for starting a new journal

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Image } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

export type JournalMode = 'voice' | 'text';

export interface JournalOptionProps {
  mode: JournalMode;
  onPress: () => void;
}

export const JournalOption: React.FC<JournalOptionProps> = ({ mode, onPress }) => {
  const config = mode === 'voice'
    ? {
        icon: require('@/assets/images/icons/Microphone.png'),
        title: 'Voice',
        subtitle: 'Unfiltered Thinking',
      }
    : {
        icon: require('@/assets/images/icons/Pencil.png'),
        title: 'Text',
        subtitle: 'Quick Capture',
      };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Icon */}
      <Image source={config.icon} style={styles.icon} resizeMode="contain" />

      {/* Text content */}
      <View style={styles.textContent}>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>{config.subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.text.primary,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: borderRadius.journalOption,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  icon: {
    width: 28,
    height: 28,
  },
  textContent: {
    flex: 1,
    gap: spacing.s,
  },
  title: {
    ...typography.special.journalOptionTitle,
    color: colors.text.white,
  },
  subtitle: {
    ...typography.special.journalOptionSubtitle,
    color: colors.text.white,
  },
});
