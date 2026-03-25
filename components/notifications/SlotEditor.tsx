// components/notifications/SlotEditor.tsx
// Shared slot editing UI used by Step6RhythmBuilder and RhythmBuilderSheet

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch, LayoutAnimation, Platform, UIManager } from 'react-native';
import { colors, typography, spacing, borderRadius, fontFamily } from '../../theme/designTokens';

// Enable LayoutAnimation on Android (no-op on iOS where it's always on)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface SlotDef {
  id: string;
  label: string;
  day: string | null;       // single day (radio select)
  timeWindow: 'morning' | 'afternoon' | 'evening' | null;
  hasDaySelection: boolean;
  enabled: boolean;
}

export const DEFAULT_SLOTS: SlotDef[] = [
  { id: 'one_on_one', label: '1:1 with God', day: null, timeWindow: null, hasDaySelection: false, enabled: true },
  { id: 'church', label: 'Church', day: null, timeWindow: null, hasDaySelection: true, enabled: false },
  { id: 'small_group', label: 'Small group', day: null, timeWindow: null, hasDaySelection: true, enabled: false },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_WINDOWS: Array<{ id: 'morning' | 'afternoon' | 'evening'; label: string }> = [
  { id: 'morning', label: 'Morning' },
  { id: 'afternoon', label: 'Afternoon' },
  { id: 'evening', label: 'Evening' },
];

interface SlotCardProps {
  slot: SlotDef;
  onToggle: (enabled: boolean) => void;
  onDaySelect: (day: string | null) => void;
  onTimeWindow: (tw: 'morning' | 'afternoon' | 'evening' | null) => void;
  onLabelChange?: (label: string) => void;
  onRemove?: () => void;
}

function SlotCard({ slot, onToggle, onDaySelect, onTimeWindow, onLabelChange, onRemove }: SlotCardProps) {
  const isCustom = !['church', 'small_group', 'one_on_one'].includes(slot.id);

  // Time picker shows once a day is selected (or immediately for 1:1 which has no day selection)
  const showTimeSection = slot.hasDaySelection ? slot.day !== null : true;

  const handleDaySelect = (fullDay: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
    // Tapping the already-selected day deselects it and also clears the time window
    onDaySelect(slot.day === fullDay ? null : fullDay);
  };

  return (
    <View style={styles.slotCard}>
      <View style={styles.slotHeader}>
        <View style={styles.slotLabelRow}>
          {isCustom && onLabelChange ? (
            <TextInput
              style={styles.customLabelInput}
              value={slot.label}
              onChangeText={onLabelChange}
              placeholder="Name this moment..."
              placeholderTextColor={colors.text.bodyLight}
            />
          ) : (
            <Text style={styles.slotLabel}>{slot.label}</Text>
          )}
          {onRemove && isCustom && (
            <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
        <Switch
          value={slot.enabled}
          onValueChange={onToggle}
          trackColor={{ false: colors.background.disabled, true: colors.text.primary }}
          thumbColor={colors.text.white}
        />
      </View>

      {slot.enabled && (
        <View style={styles.slotOptions}>
          {slot.hasDaySelection && (
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Which day?</Text>
              <View style={styles.dayChipRow}>
                {DAYS.map((day, idx) => {
                  const fullDay = FULL_DAYS[idx];
                  const selected = slot.day === fullDay;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[styles.dayChip, selected && styles.chipSelected]}
                      onPress={() => handleDaySelect(fullDay)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {showTimeSection && (
            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>{slot.hasDaySelection ? 'What time?' : 'What time of day typically?'}</Text>
              <View style={styles.chipRow}>
                {TIME_WINDOWS.map((tw) => {
                  const selected = slot.timeWindow === tw.id;
                  return (
                    <TouchableOpacity
                      key={tw.id}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => onTimeWindow(selected ? null : tw.id)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tw.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

interface SlotEditorProps {
  slots: SlotDef[];
  onSlotsChange: (slots: SlotDef[]) => void;
  showRemove?: boolean;
}

export function SlotEditor({ slots, onSlotsChange, showRemove = false }: SlotEditorProps) {
  const updateSlot = (id: string, updates: Partial<SlotDef>) => {
    onSlotsChange(slots.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSlot = (id: string) => {
    onSlotsChange(slots.filter(s => s.id !== id));
  };

  const addCustomSlot = () => {
    const id = `custom_${Date.now()}`;
    onSlotsChange([...slots, { id, label: '', day: null, timeWindow: null, hasDaySelection: true, enabled: true }]);
  };

  return (
    <View style={styles.container}>
      {slots.map((slot) => (
        <SlotCard
          key={slot.id}
          slot={slot}
          onToggle={(enabled) => updateSlot(slot.id, { enabled })}
          onDaySelect={(day) => updateSlot(slot.id, day === null ? { day: null, timeWindow: null } : { day })}
          onTimeWindow={(tw) => updateSlot(slot.id, { timeWindow: tw })}
          onLabelChange={(label) => updateSlot(slot.id, { label })}
          onRemove={showRemove ? () => removeSlot(slot.id) : undefined}
        />
      ))}

      <TouchableOpacity style={styles.addSlotButton} onPress={addCustomSlot}>
        <Text style={styles.addSlotText}>+ Add a weekly event</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.l,
  },
  slotCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  slotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotLabelRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
    marginRight: spacing.l,
  },
  slotLabel: {
    ...typography.heading.default,
    color: colors.text.body,
  },
  customLabelInput: {
    flex: 1,
    fontFamily: fontFamily.primary,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.body,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
    paddingBottom: spacing.s,
  },
  removeButton: {
    padding: spacing.s,
  },
  removeButtonText: {
    ...typography.body.s,
    color: '#C0392B',
  },
  slotOptions: {
    marginTop: spacing.xl,
    gap: spacing.xl,
  },
  optionGroup: {
    gap: spacing.l,
  },
  optionLabel: {
    ...typography.body.s,
    color: colors.text.bodyLight,
  },
  // Day chips — equal width, single row
  dayChipRow: {
    flexDirection: 'row',
    gap: spacing.s,
  },
  dayChip: {
    flex: 1,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border.divider,
    backgroundColor: colors.background.white,
    alignItems: 'center',
  },
  // Time window chips — natural width
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
  },
  chip: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border.divider,
    backgroundColor: colors.background.white,
  },
  chipSelected: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  chipText: {
    ...typography.heading.xs,
    color: colors.text.bodyLight,
  },
  chipTextSelected: {
    color: colors.text.white,
  },
  addSlotButton: {
    paddingVertical: spacing.l,
    alignItems: 'center',
  },
  addSlotText: {
    ...typography.heading.s,
    color: colors.text.primary,
  },
});
