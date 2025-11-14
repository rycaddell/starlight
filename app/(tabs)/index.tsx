import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioPermissions } from '../../hooks/useAudioPermissions';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { saveJournalEntry, getUserJournals } from '../../lib/supabase';
import { useGlobalSettings } from '../../components/GlobalSettingsContext';
import { MirrorProgress } from '../../components/journal/MirrorProgress';
import { FreeFormCard } from '../../components/journal/FreeFormCard';
import { GuidedPromptSingle } from '../../components/journal/GuidedPromptSingle';
import { JournalBottomSheet } from '../../components/journal/JournalBottomSheet';
import { GuidedPrompt } from '../../constants/guidedPrompts';
import { useMirrorData } from '../../hooks/useMirrorData';

export default function JournalScreen() {
  const router = useRouter();
  
  // Use AuthContext instead of manual user management
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showSettings } = useGlobalSettings();

  // State for today's answered prompts
  const [todayAnsweredPrompts, setTodayAnsweredPrompts] = useState<string[]>([]);
  
  // Get journal count for progress bar
  const { journalCount, loadJournals } = useMirrorData();

  // Bottom sheet state
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'free' | 'guided'>('free');
  const [sheetPrompt, setSheetPrompt] = useState<string | null>(null);

  // Handler for voice transcription from BOTTOM SHEET
  const handleBottomSheetVoiceComplete = async (transcribedText: string, timestamp: string) => {
    console.log('🎤 Voice transcription complete in bottom sheet');
    
    // Save the journal with 'voice' entry type and the guided prompt if applicable
    const saved = await saveJournalToDatabase(
      transcribedText, 
      timestamp, 
      'voice',
      sheetMode === 'guided' ? sheetPrompt : null
    );
    
    if (saved) {
      // Close the bottom sheet
      setBottomSheetVisible(false);
      
      // Navigate to mirror
      router.push({
        pathname: '/(tabs)/mirror',
        params: {
          journalText: transcribedText,
          timestamp: timestamp
        }
      });
      
      // Reload journals to update progress bar and answered prompts
      if (isAuthenticated && user) {
        await loadJournals();
        await loadTodayAnsweredPrompts();
      }
    }
  };

  // Hooks - Use bottom sheet handler for voice recording
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

  // Load today's answered prompts
  const loadTodayAnsweredPrompts = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const result = await getUserJournals(user.id);
      
      if (result.success && result.data) {
        // Filter journals from today that have a prompt_text
        const todayJournals = result.data.filter(journal => {
          const journalDate = new Date(journal.created_at);
          journalDate.setHours(0, 0, 0, 0);
          return journalDate.toISOString() === todayISO && journal.prompt_text;
        });

        // Extract the prompt texts
        const promptTexts = todayJournals
          .map(journal => journal.prompt_text)
          .filter(text => text); // Remove any null/undefined

        console.log('📝 Today answered prompts:', promptTexts.length);
        setTodayAnsweredPrompts(promptTexts);
      }
    } catch (error) {
      console.error('Error loading today answered prompts:', error);
    }
  };

  // Load journal count and answered prompts on mount
  React.useEffect(() => {
    if (isAuthenticated && user) {
      loadJournals();
      loadTodayAnsweredPrompts();
    }
  }, [isAuthenticated, user]);

  // Reload journals when screen comes into focus (e.g., when returning from mirror tab)
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        console.log('📊 Journal screen focused - reloading journals');
        loadJournals();
        loadTodayAnsweredPrompts();
      }
    }, [isAuthenticated, user])
  );

  // Save journal to database
  const saveJournalToDatabase = async (
    content: string, 
    timestamp: string, 
    entryType: 'text' | 'voice',
    promptText: string | null = null
  ) => {
    if (!isAuthenticated || !user) {
      Alert.alert('Error', 'Please sign in to save journal entries.');
      return false;
    }

    console.log('💾 Saving journal for custom user:', user.id);
    console.log('📝 Entry type:', entryType);
    console.log('💬 Prompt text:', promptText);
    
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

  // Combined permission check and recording start
  const handleStartRecordingWithPermission = async () => {
    try {
      console.log('🎤 Checking current microphone permission...');
      
      // Always check current device permission first
      const currentStatus = await Audio.getPermissionsAsync();
      console.log('Current microphone status:', currentStatus);
      
      if (currentStatus.granted) {
        console.log('✅ Permission already granted, starting recording...');
        await handleStartRecording(true);
        return;
      }
      
      // Only show prompt if permission not actually granted
      console.log('🎤 No permission found, showing user prompt...');
      Alert.alert(
        'Enable Voice Journaling?',
        'Voice journaling lets you speak your thoughts while walking or when typing isn\'t convenient. Would you like to enable it?',
        [
          { text: 'Not Now', style: 'cancel' },
          { 
            text: 'Enable Microphone', 
            onPress: async () => {
              try {
                console.log('🎤 User chose to enable microphone...');
                
                // Set audio mode first
                await Audio.setAudioModeAsync({
                  allowsRecordingIOS: true,
                  playsInSilentModeIOS: true,
                });
                
                // Request permission
                const permission = await Audio.requestPermissionsAsync();
                const granted = permission.granted === true || permission.status === 'granted';
                
                if (granted) {
                  console.log('✅ Permission granted, starting recording...');
                  await handleStartRecording(true);
                } else {
                  console.log('❌ Permission denied');
                  Alert.alert(
                    'Microphone Access Needed',
                    'To use voice journaling, please enable microphone access in Settings > Oxbow > Microphone.',
                    [{ text: 'OK' }]
                  );
                }
              } catch (error) {
                console.error('❌ Error in permission flow:', error);
                Alert.alert(
                  'Permission Error', 
                  `Unable to enable microphone: ${error.message || 'Unknown error'}. You can enable it manually in Settings.`,
                  [{ text: 'OK' }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error checking microphone permission:', error);
      Alert.alert(
        'Permission Error',
        'Unable to check microphone permission. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handlers for opening bottom sheet
  const handleFreeFormPress = () => {
    console.log('🆓 Free Form card pressed - opening sheet');
    setSheetMode('free');
    setSheetPrompt(null);
    setBottomSheetVisible(true);
  };

  const handleGuidedPromptSelect = (prompt: GuidedPrompt) => {
    console.log('📝 Guided prompt selected:', prompt.text);
    setSheetMode('guided');
    setSheetPrompt(prompt.text);
    setBottomSheetVisible(true);
  };

  const handleBottomSheetClose = () => {
    setBottomSheetVisible(false);
    // Small delay before clearing context to avoid visual glitch
    setTimeout(() => {
      setSheetPrompt(null);
    }, 300);
  };

  // Handle bottom sheet submission
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
      // Navigate to mirror
      router.push({
        pathname: '/(tabs)/mirror',
        params: {
          journalText: text,
          timestamp: timestamp
        }
      });
      
      // Reload journals to update progress bar and answered prompts
      if (isAuthenticated && user) {
        await loadJournals();
        await loadTodayAnsweredPrompts();
      }
    }
  };

  // Show loading while auth is initializing
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Setting up your journal...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show error if not authenticated (shouldn't happen with AuthNavigator)
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
        <View style={styles.newUIContainer}>
          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Journal</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressSection}>
            <MirrorProgress currentCount={journalCount} targetCount={10} />
            <Text style={styles.progressSubtext}>
              {journalCount} / 10 journals for the next Mirror
            </Text>
          </View>

          {/* Quick Start Section */}
          <View style={styles.quickStartSection}>
            <Text style={styles.sectionTitle}>Make a new journal</Text>
            
            <FreeFormCard onPress={handleFreeFormPress} />
            
            <GuidedPromptSingle
              userId={user.id}
              todayAnsweredPrompts={todayAnsweredPrompts}
              onPromptSelect={handleGuidedPromptSelect}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sheet with Voice Support */}
      <JournalBottomSheet
        visible={bottomSheetVisible}
        onClose={handleBottomSheetClose}
        mode={sheetMode}
        promptText={sheetPrompt}
        onSubmit={handleBottomSheetSubmit}
        
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    padding: 16,
    paddingTop: 24,
  },
  newUIContainer: {
    width: '100%',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 32,
    width: '100%',
  },
  progressSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  quickStartSection: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '500',
  },
});