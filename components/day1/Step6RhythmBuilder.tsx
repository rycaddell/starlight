// components/day1/Step6RhythmBuilder.tsx
// Day 1 Step 6 — rhythm builder + notification opt-in

import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, fontFamily } from '../../theme/designTokens';
import { SlotEditor, SlotDef, DEFAULT_SLOTS } from '../notifications/SlotEditor';
import { saveRhythm } from '../../lib/supabase/notifications';

interface Step6Props {
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
  requestPermissionAndRegister: () => Promise<string | null>;
}

export function Step6RhythmBuilder({ userId, onComplete, onSkip, requestPermissionAndRegister }: Step6Props) {
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<SlotDef[]>(DEFAULT_SLOTS);
  const [isSaving, setIsSaving] = useState(false);

  const enabledSlots = slots.filter(s => s.enabled && s.timeWindow !== null);
  const canEnable = enabledSlots.length > 0;

  const handleTurnOnReminders = async () => {
    setIsSaving(true);
    try {
      const token = await requestPermissionAndRegister();
      if (token) {
        await saveRhythm(userId, enabledSlots);
      }
    } catch {
      // non-fatal — still advance
    } finally {
      setIsSaving(false);
      onComplete();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity onPress={onSkip} style={styles.closeButton}>
          <MaterialIcons name="close" size={18} color={colors.text.body} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Copy */}
        <View style={styles.copySection}>
          <MaterialIcons name="notifications-none" size={36} color={colors.text.body} />
          <Text style={styles.heading}>Capture what God shares.</Text>
          <Text style={styles.body}>Set up reminders for after church, small group, or your time with God.</Text>
        </View>

        {/* Slots */}
        <SlotEditor slots={slots} onSlotsChange={setSlots} />
      </ScrollView>

      {/* CTA */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <TouchableOpacity
          style={[styles.ctaButton, !canEnable && styles.ctaButtonDisabled]}
          onPress={handleTurnOnReminders}
          disabled={!canEnable || isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.text.white} />
          ) : (
            <Text style={[styles.ctaButtonText, !canEnable && styles.ctaButtonTextDisabled]}>
              Turn on reminders
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.footerNote}>You can adjust these any time in settings.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.l,
  },
  headerSpacer: {
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxxl,
    gap: spacing.xxxl,
  },
  copySection: {
    gap: spacing.l,
  },
  slotsSection: {
    gap: spacing.xl,
  },
  question: {
    ...typography.heading.default,
    color: colors.text.body,
  },
  heading: {
    fontFamily: fontFamily.primary,
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.body,
    lineHeight: 40,
  },
  subheading: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  body: {
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '400',
    color: colors.text.bodyLight,
    lineHeight: 26,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.l,
    backgroundColor: colors.background.screen,
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
  },
  footerNote: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    textAlign: 'center',
  },
  ctaButton: {
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  ctaButtonDisabled: {
    backgroundColor: colors.background.disabled,
  },
  ctaButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
  },
  ctaButtonTextDisabled: {
    color: colors.text.bodyLight,
  },
});
