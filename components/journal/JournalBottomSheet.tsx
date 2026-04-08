// components/journal/JournalBottomSheet.tsx
import React, { useState, useEffect } from 'react';
import * as Sentry from '@sentry/react-native';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { TextJournalInput } from './TextJournalInput';
import { VoiceRecordingTab } from '../voice/VoiceRecordingTab';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

type TabType = 'text' | 'voice';

interface JournalBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  mode: 'free' | 'guided';
  promptText: string | null;
  onSubmit: (text: string, timestamp: string, entryType: 'text' | 'voice') => void;
  defaultTab: 'text' | 'voice';

  // Voice recording props
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  isProcessing: boolean;
  isTranscribing: boolean;
  formatDuration: (seconds: number) => string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
  onDiscardRecording: () => void;
}

export const JournalBottomSheet: React.FC<JournalBottomSheetProps> = ({
  visible,
  onClose,
  mode,
  promptText,
  onSubmit,
  defaultTab,
  isRecording,
  isPaused,
  recordingDuration,
  isProcessing,
  isTranscribing,
  formatDuration,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
  onDiscardRecording,
}) => {
  const [journalText, setJournalText] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);

  useEffect(() => {
    if (visible) {
      setActiveTab(defaultTab);
    }
  }, [visible, defaultTab]);

  const handleSubmit = async () => {
    if (journalText.trim()) {
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      await onSubmit(journalText.trim(), timestamp, 'text');
      setJournalText('');
      onClose();
    }
  };

  const handleClose = () => {
    Sentry.addBreadcrumb({
      category: 'recording',
      message: 'JournalBottomSheet close attempted',
      data: { isRecording, isProcessing },
      level: 'info',
    });
    if (isRecording) {
      Alert.alert(
        'Discard Recording?',
        'You have an active recording. Closing will discard it.',
        [
          { text: 'Continue Recording', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              onDiscardRecording();
              setJournalText('');
              setActiveTab(defaultTab);
              onClose();
            },
          },
        ]
      );
      return;
    }

    setJournalText('');
    setActiveTab(defaultTab);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Journal</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Image
              source={require('@/assets/images/icons/Close.png')}
              style={styles.closeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Guided Prompt */}
        {mode === 'guided' && promptText && (
          <View style={styles.promptContainer}>
            <Text style={styles.promptLabel}>GUIDED PROMPT</Text>
            <Text style={styles.promptText}>{promptText}</Text>
          </View>
        )}

        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'voice' && styles.tabActive]}
            onPress={() => setActiveTab('voice')}
          >
            <Text style={[styles.tabText, activeTab === 'voice' && styles.tabTextActive]}>
              Voice
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'text' && styles.tabActive]}
            onPress={() => {
              if (isRecording) {
                Alert.alert(
                  'Stop Recording First',
                  'Please stop your recording before switching tabs.',
                  [{ text: 'OK' }]
                );
                return;
              }
              setActiveTab('text');
            }}
          >
            <Text style={[styles.tabText, activeTab === 'text' && styles.tabTextActive]}>
              Text
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        {activeTab === 'text' ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <TextJournalInput
              journalText={journalText}
              setJournalText={setJournalText}
              contextPrompt={mode === 'guided' ? promptText : null}
            />

            <View style={styles.submitWrapper}>
              <Button
                variant="primaryFilled"
                label="Submit"
                onPress={handleSubmit}
                disabled={!journalText.trim()}
              />
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.voiceContentContainer}
          >
            <VoiceRecordingTab
              isRecording={isRecording}
              isPaused={isPaused}
              recordingDuration={recordingDuration}
              isProcessing={isProcessing}
              isTranscribing={isTranscribing}
              formatDuration={formatDuration}
              onStartRecording={onStartRecording}
              onStopRecording={onStopRecording}
              onPauseRecording={onPauseRecording}
              onResumeRecording={onResumeRecording}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

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
  headerTitle: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  closeIcon: {
    width: 16,
    height: 16,
  },
  promptContainer: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.l,
    backgroundColor: colors.background.messageButton,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
    gap: spacing.xs,
  },
  promptLabel: {
    ...typography.heading.xs,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  promptText: {
    ...typography.body.default,
    color: colors.text.body,
    lineHeight: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.l,
    gap: spacing.m,
    backgroundColor: colors.background.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.button,
    backgroundColor: colors.background.defaultLight,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.text.primary,
  },
  tabText: {
    ...typography.heading.s,
    color: colors.text.bodyLight,
  },
  tabTextActive: {
    color: colors.text.white,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xxl,
    paddingBottom: Platform.OS === 'ios' ? 54 : 40,
    gap: spacing.l,
  },
  voiceContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  submitWrapper: {
    marginTop: spacing.xs,
  },
});
