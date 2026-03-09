import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Image, TouchableOpacity, AppState, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioPermissions } from '../../hooks/useAudioPermissions';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { saveJournalEntry, getUserJournals } from '../../lib/supabase';
import { useGlobalSettings } from '../../components/GlobalSettingsContext';
import { MirrorStatus } from '../../components/ui/MirrorStatus';
import { GuidedPromptSingle, GuidedPromptSingleHandle } from '../../components/journal/GuidedPromptSingle';
import { JournalOption } from '../../components/ui/JournalOption';
import { JournalBottomSheet } from '../../components/journal/JournalBottomSheet';
import { GuidedPrompt } from '../../constants/guidedPrompts';
import { Button } from '../../components/ui/Button';
import { useMirrorData } from '../../hooks/useMirrorData';
import { getMirrorThreshold } from '../../lib/config/constants';
import { GetStartedCard } from '../../components/day1/GetStartedCard';
import { Day1Modal } from '../../components/day1/Day1Modal';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

const screenWidth = Dimensions.get('window').width;

export default function JournalScreen() {
  const router = useRouter();
  const promptRef = useRef<GuidedPromptSingleHandle>(null);

  const { user, isAuthenticated, isLoading, refreshUser } = useAuth();
  const { showSettings } = useGlobalSettings();

  const [day1ModalVisible, setDay1ModalVisible] = useState(false);
  const [todayAnsweredPrompts, setTodayAnsweredPrompts] = useState<string[]>([]);

  const { journalCount, loadJournals, mirrorState, generateMirror, viewMirror, generatedMirror, checkGenerationStatusOnFocus } = useMirrorData();
  const mirrorThreshold = getMirrorThreshold(user);

  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'free' | 'guided'>('free');
  const [sheetPrompt, setSheetPrompt] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'text' | 'voice'>('voice');

  const handleBottomSheetVoiceComplete = async (transcribedText: string, timestamp: string, journalId?: string) => {
    console.log('🎤 Voice transcription complete in bottom sheet');

    // Add Sentry breadcrumb
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
      // New flow: journal already created and populated by edge function — skip DB insert
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

    // Fallback flow: journal not yet in DB — insert it now
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
        params: {
          journalText: transcribedText,
          timestamp: timestamp
        }
      });

      if (isAuthenticated && user) {
        await loadJournals();
        await loadTodayAnsweredPrompts();
      }
    }
  };

  const { hasAudioPermission, checkPermissionAndRequest } = useAudioPermissions();
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

  const loadTodayAnsweredPrompts = React.useCallback(async () => {
    if (!isAuthenticated || !user) {
      console.log('⏭️ Skipping loadTodayAnsweredPrompts - user not authenticated');
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const result = await getUserJournals(user.id);

      if (result.success && result.data) {
        const todayJournals = result.data.filter(journal => {
          const journalDate = new Date(journal.created_at);
          journalDate.setHours(0, 0, 0, 0);
          return journalDate.toISOString() === todayISO && journal.prompt_text;
        });

        const promptTexts = todayJournals
          .map(journal => journal.prompt_text)
          .filter(text => text);

        console.log('📝 Today answered prompts:', promptTexts.length);
        setTodayAnsweredPrompts(promptTexts);
      }
    } catch (error) {
      console.error('Error loading today answered prompts:', error);
    }
  }, [isAuthenticated, user]);

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
        checkGenerationStatusOnFocus(); // Check if mirror has been viewed
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

      // Capture unauthorized save attempt
      Sentry.captureException(new Error('Attempted to save journal without authentication'), {
        tags: { component: 'JournalScreen', action: 'save' },
      });

      return false;
    }

    console.log('💾 Saving journal for custom user:', user.id);
    console.log('📝 Entry type:', entryType);
    console.log('💬 Prompt text:', promptText);

    // Add Sentry breadcrumb
    Sentry.addBreadcrumb({
      category: 'journal',
      message: 'Saving journal to database',
      data: {
        entryType,
        hasPromptText: !!promptText,
        contentLength: content.length,
      },
      level: 'info',
    });

    const result = await saveJournalEntry(
      content,
      user.id,
      entryType,
      promptText
    );

    if (result.success) {
      console.log('✅ Journal saved successfully');
      return true;
    } else {
      console.error('❌ Failed to save journal:', result.error);
      Alert.alert('Save Error', result.error || 'Failed to save journal entry.');
      return false;
    }
  };

  const handleStartRecordingWithPermission = async () => {
    try {
      console.log('🎤 [MAIN-PERMISSION] Checking current microphone permission...');

      const currentStatus = await Audio.getPermissionsAsync();
      console.log('📊 [MAIN-PERMISSION] Current permission status:', JSON.stringify(currentStatus, null, 2));

      if (currentStatus.granted) {
        console.log('✅ [MAIN-PERMISSION] Permission already granted, starting recording...');
        await handleStartRecording(true);
        return;
      }

      console.log('📝 [MAIN-PERMISSION] Permission not granted, requesting directly...');

      try {
        console.log('🔧 [MAIN-PERMISSION] Setting audio mode...');

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        console.log('✅ [MAIN-PERMISSION] Audio mode set successfully');

        console.log('🔐 [MAIN-PERMISSION] Requesting system permission...');
        const permission = await Audio.requestPermissionsAsync();
        console.log('📊 [MAIN-PERMISSION] Permission response:', JSON.stringify(permission, null, 2));

        const granted = permission.granted === true || permission.status === 'granted';
        console.log('🔍 [MAIN-PERMISSION] Permission granted:', granted);

        if (granted) {
          console.log('✅ [MAIN-PERMISSION] Permission granted, waiting for app to become active...');

          const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
              console.log('📱 [MAIN-PERMISSION] App returned to active state');
              subscription.remove();

              setTimeout(async () => {
                console.log('🎙️ [MAIN-PERMISSION] Calling handleStartRecording...');
                await handleStartRecording(true);
              }, 50);
            }
          });

          setTimeout(() => {
            console.log('⚠️ [MAIN-PERMISSION] Fallback timeout reached, removing listener');
            subscription.remove();
          }, 3000);
        } else {
          console.error('❌ [MAIN-PERMISSION] Permission denied by user');
          Alert.alert(
            'Microphone Access Needed',
            'To use voice journaling, please enable microphone access in Settings > Oxbow > Microphone.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('❌ [MAIN-PERMISSION] Error requesting permission:', error);
        Alert.alert(
          'Permission Error',
          `Unable to enable microphone: ${error.message || 'Unknown error'}. You can enable it manually in Settings.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ [MAIN-PERMISSION] Error in permission check:', error);
      Alert.alert(
        'Permission Error',
        'Unable to check microphone permission. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleVoiceFormPress = () => {
    console.log('🎤 Voice pressed - opening voice recording');
    setSheetMode('free');
    setSheetPrompt(null);
    setSelectedTab('voice');
    setBottomSheetVisible(true);
  };

  const handleTextFormPress = () => {
    console.log('📝 Text pressed - opening text journal');
    setSheetMode('free');
    setSheetPrompt(null);
    setSelectedTab('text');
    setBottomSheetVisible(true);
  };

  const handleGuidedPromptSelect = (prompt: GuidedPrompt) => {
    console.log('📝 Guided prompt selected:', prompt.text);
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
        params: {
          journalText: text,
          timestamp: timestamp
        }
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
            console.log('🔵 [JOURNAL TAB] View Mirror button pressed');
            console.log('🔵 [JOURNAL TAB] Current state:', {
              mirrorState,
              hasGeneratedMirror: !!generatedMirror,
              generatedMirrorId: generatedMirror?.id
            });

            if (generatedMirror?.id) {
              console.log('🔵 [JOURNAL TAB] Navigating to mirror tab with mirrorId:', generatedMirror.id);
              router.push({
                pathname: '/(tabs)/mirror',
                params: { openMirrorId: generatedMirror.id }
              });
            } else {
              console.warn('⚠️ [JOURNAL TAB] No generated mirror to view!');
            }
          }}
        />

        {/* River Illustration — bleeds edge to edge */}
        <Image
          source={require('@/assets/images/journal-river-illustration.png')}
          style={styles.riverImage}
          resizeMode="stretch"
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
              <Text style={styles.sectionTitle}>Daily Prompt</Text>
              <Button
                variant="link"
                label="New Prompt"
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
    </SafeAreaView>
  );
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
  riverImage: {
    width: screenWidth * 1.1,
    height: (screenWidth * 1.1) / (443 / 135),
    marginLeft: -spacing.screen.horizontalPadding,
    marginTop: -30,
    marginBottom: 30,
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
