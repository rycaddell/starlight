import React, { useState, useRef } from 'react';
import { ErrorBoundary } from '../../components/ui/ErrorBoundary';
import { View, Text, ScrollView, StyleSheet, Alert, Image, TouchableOpacity, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { saveJournalEntry, getTodaysAnsweredPrompts } from '../../lib/supabase/journals';
import { MirrorStatus } from '../../components/ui/MirrorStatus';
import { GuidedPromptSingle, GuidedPromptSingleHandle } from '../../components/journal/GuidedPromptSingle';
import { JournalOption } from '../../components/ui/JournalOption';
import { JournalBottomSheet } from '../../components/journal/JournalBottomSheet';
import { Button } from '../../components/ui/Button';
import { GuidedPrompt } from '../../constants/guidedPrompts';
import { useMirrorData } from '../../hooks/useMirrorData';
import { getMirrorThreshold } from '../../lib/config/constants';
import { GetStartedCard } from '../../components/day1/GetStartedCard';
import { Day1Modal } from '../../components/day1/Day1Modal';
import { NotificationPitchCard } from '../../components/journal/NotificationPitchCard';
import { RhythmBuilderSheet } from '../../components/notifications/RhythmBuilderSheet';
import { dismissNotifCard } from '../../lib/supabase/notifications';
import { colors, typography, spacing } from '@/theme/designTokens';
import { PathGradient } from '../../components/mirror/PathGradient';
import { GRADIENT_PATHS } from '../../components/mirror/gradient-paths';

function JournalScreen() {
  const router = useRouter();
  const promptRef = useRef<GuidedPromptSingleHandle>(null);

  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();

  const [day1ModalVisible, setDay1ModalVisible] = useState(false);
  const [rhythmBuilderVisible, setRhythmBuilderVisible] = useState(false);
  const [todayAnsweredPrompts, setTodayAnsweredPrompts] = useState<string[]>([]);
  const [selectedTab, setSelectedTab] = useState<'text' | 'voice'>('voice');
  const [sheetMode, setSheetMode] = useState<'free' | 'guided'>('free');
  const [sheetPrompt, setSheetPrompt] = useState<string | null>(null);

  const { journalCount, loadJournals, mirrorState, generateMirror, viewMirror, generatedMirror, checkGenerationStatusOnFocus } = useMirrorData();
  const mirrorThreshold = getMirrorThreshold(user as any);

  // Path rotates each mirror cycle (seeded from mirror ID so it changes after
  // each completed mirror). Falls back to user ID on the first cycle.
  const riverPath = React.useMemo(() => {
    const seedStr = generatedMirror?.id ?? user?.id ?? '';
    const seed = seedStr.split('').reduce((acc: number, c: string) => acc + c.charCodeAt(0), 0);
    return GRADIENT_PATHS[seed % GRADIENT_PATHS.length];
  }, [generatedMirror?.id, user?.id]);

  const riverProgress = Math.min(1, journalCount / mirrorThreshold);

  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);

  const loadTodayAnsweredPrompts = React.useCallback(async () => {
    if (!isAuthenticated || !user) return;
    const result = await getTodaysAnsweredPrompts(user.id);
    if (result.success && result.data) {
      setTodayAnsweredPrompts(result.data);
    }
  }, [isAuthenticated, user]);

  const handleBottomSheetVoiceComplete = async (transcribedText: string, timestamp: string, journalId?: string) => {
    console.log('🎤 Voice transcription complete in bottom sheet');

    Sentry.addBreadcrumb({
      category: 'journal',
      message: 'Voice transcription completed',
      data: {
        transcribedLength: transcribedText.length,
        mode: sheetMode,
        hasPrompt: !!sheetPrompt,
        alreadySaved: !!journalId,
      },
      level: 'info',
    });

    if (journalId) {
      setBottomSheetVisible(false);
      router.push({
        pathname: '/(tabs)/mirror',
        params: { journalText: transcribedText, timestamp }
      });
      if (isAuthenticated && user) {
        await loadJournals();
        await loadTodayAnsweredPrompts();
      }
      return;
    }

    const saved = await saveJournalToDatabase(
      transcribedText,
      timestamp,
      'voice',
      sheetMode === 'guided' ? sheetPrompt : null
    );

    if (saved) {
      setBottomSheetVisible(false);
      router.push({
        pathname: '/(tabs)/mirror',
        params: { journalText: transcribedText, timestamp }
      });
      if (isAuthenticated && user) {
        await loadJournals();
        await loadTodayAnsweredPrompts();
      }
    }
  };

  const {
    isRecording,
    isPaused,
    recordingDuration,
    isProcessing,
    handleStartRecording,
    handleStopRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleDiscardRecording,
    formatDuration
  } = useAudioRecording(handleBottomSheetVoiceComplete);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      loadJournals();
      loadTodayAnsweredPrompts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        console.log('📊 Journal screen focused - checking mirror status and reloading journals');
        checkGenerationStatusOnFocus();
        loadJournals();
        loadTodayAnsweredPrompts();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user])
  );

  const saveJournalToDatabase = async (
    content: string,
    timestamp: string,
    entryType: 'text' | 'voice',
    promptText: string | null = null
  ) => {
    if (!isAuthenticated || !user) {
      Alert.alert('Error', 'Please sign in to save journal entries.');
      Sentry.captureException(new Error('Attempted to save journal without authentication'), {
        tags: { component: 'JournalScreen', action: 'save' },
      });
      return false;
    }

    Sentry.addBreadcrumb({
      category: 'journal',
      message: 'Saving journal to database',
      data: { entryType, hasPromptText: !!promptText, contentLength: content.length },
      level: 'info',
    });

    const result = await saveJournalEntry(content, user.id, entryType, promptText);

    if (result.success) {
      return true;
    } else {
      Alert.alert('Save Error', result.error || 'Failed to save journal entry.');
      return false;
    }
  };

  const handleStartRecordingWithPermission = async () => {
    try {
      const currentStatus = await Audio.getPermissionsAsync();

      if (currentStatus.granted) {
        await handleStartRecording(true);
        return;
      }

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const permission = await Audio.requestPermissionsAsync();
        const granted = permission.granted === true || permission.status === 'granted';

        if (granted) {
          const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
              subscription.remove();
              setTimeout(async () => {
                await handleStartRecording(true);
              }, 50);
            }
          });

          setTimeout(() => {
            subscription.remove();
          }, 3000);
        } else {
          Alert.alert(
            'Microphone Access Needed',
            'To use voice journaling, please enable microphone access in Settings > Oxbow > Microphone.',
            [{ text: 'OK' }]
          );
        }
      } catch (error: any) {
        Alert.alert(
          'Permission Error',
          `Unable to enable microphone: ${error.message || 'Unknown error'}. You can enable it manually in Settings.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Permission Error', 'Unable to check microphone permission. Please try again.');
    }
  };

  const handleVoiceFormPress = () => {
    setSheetMode('free');
    setSheetPrompt(null);
    setSelectedTab('voice');
    setBottomSheetVisible(true);
  };

  const handleTextFormPress = () => {
    setSheetMode('free');
    setSheetPrompt(null);
    setSelectedTab('text');
    setBottomSheetVisible(true);
  };

  const handleGuidedPromptSelect = (prompt: GuidedPrompt) => {
    setSheetMode('guided');
    setSheetPrompt(prompt.text);
    setSelectedTab('voice');
    setBottomSheetVisible(true);
  };

  const handleBottomSheetClose = () => {
    setBottomSheetVisible(false);
    setTimeout(() => {
      setSheetPrompt(null);
    }, 300);
  };

  const handleBottomSheetSubmit = async (
    text: string,
    timestamp: string,
    entryType: 'text' | 'voice'
  ) => {
    const saved = await saveJournalToDatabase(
      text,
      timestamp,
      entryType,
      sheetMode === 'guided' ? sheetPrompt : null
    );

    if (saved) {
      router.push({
        pathname: '/(tabs)/mirror',
        params: { journalText: text, timestamp }
      });

      if (isAuthenticated && user) {
        await loadJournals();
        await loadTodayAnsweredPrompts();
      }
    }
  };

  const handleDay1Close = async () => {
    setDay1ModalVisible(false);
    if (isAuthenticated && user) {
      await refreshUser();
    }
  };

  const handleDay1Complete = async () => {
    console.log('🎉 Day 1 flow completed');
    setDay1ModalVisible(false);

    if (isAuthenticated && user) {
      await refreshUser();
      await loadJournals();
      await loadTodayAnsweredPrompts();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Setting up your journal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Please sign in to access your journal.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={true}
      >
        {/* Mirror Status Countdown */}
        <MirrorStatus
          state={
            mirrorState === 'ready' ? 'ready'
            : mirrorState === 'generating' ? 'generating'
            : mirrorState === 'completed' || mirrorState === 'viewing' ? 'complete'
            : 'countdown'
          }
          journalsNeeded={Math.max(0, mirrorThreshold - journalCount)}
          journalsReady={journalCount}
          onGenerate={generateMirror}
          onViewMirror={() => {
            if (generatedMirror?.id) {
              router.push({
                pathname: '/(tabs)/mirror',
                params: { openMirrorId: generatedMirror.id }
              });
            }
          }}
        />

        {/* River Illustration — bleeds 20px off each screen edge.
            Progress is remapped so 0% aligns to the left screen edge and
            100% aligns to the right screen edge (not the canvas edges). */}
        <PathGradient
          pathString={riverPath}
          progress={riverProgress}
          strokeWidth={26}
          bleed={36}
        />

        {/* Day 1 Get Started Section */}
        {!user.day_1_completed_at && (
          <View style={styles.section}>
            <GetStartedCard onPress={() => setDay1ModalVisible(true)} />
          </View>
        )}

        {/* Start a New Journal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Start a New Journal</Text>
          <View style={styles.journalOptionRow}>
            <JournalOption mode="voice" onPress={handleVoiceFormPress} />
            <JournalOption mode="text" onPress={handleTextFormPress} />
          </View>
        </View>

        {/* Daily Prompt — only show after Day 1 */}
        {user.day_1_completed_at && (
          <View style={styles.section}>
            <View style={styles.dailyPromptHeader}>
              <Text style={styles.sectionTitle}>Journal Starters</Text>
              <Button
                variant="link"
                label="New"
                onPress={() => promptRef.current?.nextPrompt()}
                icon={
                  <Image
                    source={require('@/assets/images/icons/Refresh.png')}
                    style={styles.refreshIcon}
                    resizeMode="contain"
                  />
                }
              />
            </View>

            <GuidedPromptSingle
              ref={promptRef}
              userId={user.id}
              todayAnsweredPrompts={todayAnsweredPrompts}
              onPromptSelect={handleGuidedPromptSelect}
            />
          </View>
        )}

        {/* Notification pitch card — after Day 1, below Daily Prompt */}
        {!!(user.day_1_completed_at && !user.notifications_enabled && !user.notif_card_dismissed) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Setup</Text>
            <NotificationPitchCard
              onSetupPress={() => setRhythmBuilderVisible(true)}
              onDismiss={async () => {
                await dismissNotifCard(user.id);
                await refreshUser();
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Bottom Sheet with Voice Support */}
      <JournalBottomSheet
        visible={bottomSheetVisible}
        onClose={handleBottomSheetClose}
        mode={sheetMode}
        promptText={sheetPrompt}
        onSubmit={handleBottomSheetSubmit}
        defaultTab={selectedTab}

        isRecording={isRecording}
        isPaused={isPaused}
        recordingDuration={recordingDuration}
        isProcessing={isProcessing}
        formatDuration={formatDuration}
        onStartRecording={handleStartRecordingWithPermission}
        onStopRecording={handleStopRecording}
        onPauseRecording={handlePauseRecording}
        onResumeRecording={handleResumeRecording}
        onDiscardRecording={handleDiscardRecording}
      />

      {/* Day 1 Modal */}
      <Day1Modal
        visible={day1ModalVisible}
        onClose={handleDay1Close}
        onComplete={handleDay1Complete}
      />

      {/* Rhythm Builder Sheet */}
      <RhythmBuilderSheet
        visible={rhythmBuilderVisible}
        userId={user.id}
        initialRhythm={user.spiritual_rhythm}
        notificationsEnabled={user.notifications_enabled}
        onClose={() => setRhythmBuilderVisible(false)}
        onSave={async () => {
          setRhythmBuilderVisible(false);
          await refreshUser();
        }}
      />
    </SafeAreaView>
  );
}

export default function JournalScreenWithBoundary() {
  return <ErrorBoundary><JournalScreen /></ErrorBoundary>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screen.horizontalPadding,
    paddingTop: 36,
    paddingBottom: 100,
    gap: spacing.xxxl,
  },
  section: {
    gap: spacing.l,
  },
  sectionTitle: {
    ...typography.heading.default,
    color: colors.text.body,
  },
  journalOptionRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  dailyPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  refreshIcon: {
    width: 20,
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxxl,
  },
  loadingText: {
    ...typography.body.default,
    color: colors.text.bodyLight,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxxl,
  },
  errorText: {
    ...typography.body.default,
    color: '#dc2626',
    textAlign: 'center',
  },
});
