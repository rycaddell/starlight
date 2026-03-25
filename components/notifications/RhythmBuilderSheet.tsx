// components/notifications/RhythmBuilderSheet.tsx
// Rhythm builder presented as a page sheet — used from Settings and pitch card

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, SafeAreaView, Image,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../../theme/designTokens';
import { SlotEditor, SlotDef, DEFAULT_SLOTS } from './SlotEditor';
import { saveRhythm } from '../../lib/supabase/notifications';
import { usePushNotifications } from '../../hooks/usePushNotifications';

interface RhythmBuilderSheetProps {
  visible: boolean;
  userId: string;
  initialRhythm?: any | null;
  notificationsEnabled?: boolean | null;
  onClose: () => void;
  onSave: () => void;
}

export function RhythmBuilderSheet({
  visible,
  userId,
  initialRhythm,
  notificationsEnabled,
  onClose,
  onSave,
}: RhythmBuilderSheetProps) {
  const { requestPermissionAndRegister } = usePushNotifications(userId);
  const [slots, setSlots] = useState<SlotDef[]>(DEFAULT_SLOTS);
  const [isSaving, setIsSaving] = useState(false);
  const savedSlotsRef = useRef<string>('');

  // Populate from existing rhythm when sheet opens; snapshot for dirty check
  useEffect(() => {
    if (visible) {
      const initial = (initialRhythm && Array.isArray(initialRhythm) && initialRhythm.length > 0)
        ? initialRhythm
        : DEFAULT_SLOTS;
      setSlots(initial);
      savedSlotsRef.current = JSON.stringify(initial);
    }
  }, [visible, initialRhythm]);

  const hasChanges = JSON.stringify(slots) !== savedSlotsRef.current;

  const isFirstTimer = !notificationsEnabled && !(initialRhythm && Array.isArray(initialRhythm) && initialRhythm.length > 0);
  const enabledSlots = slots.filter(s => s.enabled && s.timeWindow !== null);
  const ctaLabel = isFirstTimer ? 'Turn on reminders' : 'Save';
  const saveDisabled = isFirstTimer ? (enabledSlots.length === 0 || isSaving) : (!hasChanges || isSaving);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await requestPermissionAndRegister();
      await saveRhythm(userId, slots, enabledSlots.length > 0);
      onSave();
    } catch (error) {
      Alert.alert('Error', 'Failed to save reminders. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTurnOff = async () => {
    setIsSaving(true);
    try {
      await saveRhythm(userId, slots, false);
      onSave();
    } catch {
      Alert.alert('Error', 'Failed to update reminders. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set Up Reminders</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Image
              source={require('../../assets/images/icons/Close.png')}
              style={styles.closeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.copyBlock}>
            <Text style={styles.descriptionHeading}>{"Don't lose what God shares with you."}</Text>
            <Text style={styles.description}>{"Get reminders after church, small group, or your time with God."}</Text>
          </View>

          <SlotEditor slots={slots} onSlotsChange={setSlots} showRemove />

          {notificationsEnabled && (
            <TouchableOpacity
              style={styles.turnOffButton}
              onPress={handleTurnOff}
              disabled={isSaving}
            >
              <Text style={styles.turnOffButtonText}>Turn off all reminders</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Save CTA */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, saveDisabled && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saveDisabled}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.text.white} />
            ) : (
              <Text style={[styles.saveButtonText, saveDisabled && styles.saveButtonTextDisabled]}>
                {ctaLabel}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.l,
    backgroundColor: colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
  },
  title: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  closeIcon: {
    width: 16,
    height: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.xxxl,
    paddingBottom: spacing.xxxxl,
  },
  copyBlock: {
    gap: spacing.s,
  },
  descriptionHeading: {
    ...typography.body.default,
    color: colors.text.body,
    lineHeight: 24,
  },
  description: {
    ...typography.body.default,
    color: colors.text.bodyLight,
    lineHeight: 24,
  },
  turnOffButton: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  turnOffButtonText: {
    ...typography.heading.s,
    color: '#C0392B',
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
    backgroundColor: colors.background.screen,
    borderTopWidth: 1,
    borderTopColor: colors.border.divider,
  },
  saveButton: {
    backgroundColor: colors.text.primary,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.background.disabled,
  },
  saveButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
  },
  saveButtonTextDisabled: {
    color: colors.text.bodyLight,
  },
});
