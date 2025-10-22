import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioPermissions } from '../../hooks/useAudioPermissions';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { TextJournalTab } from '../../components/journal/TextJournalTab';
import { VoiceRecordingTab } from '../../components/voice/VoiceRecordingTab';
import { JournalTabs, TabType } from '../../components/journal/JournalTabs';
import { saveJournalEntry } from '../../lib/supabase';
import { useGlobalSettings } from '../../components/GlobalSettingsContext';
import { MirrorProgress } from '../../components/journal/MirrorProgress';
import { FreeFormCard } from '../../components/journal/FreeFormCard';
import { GuidedPromptSingle } from '../../components/journal/GuidedPromptSingle';
import { JournalBottomSheet } from '../../components/journal/JournalBottomSheet';
import { GUIDED_PROMPTS, getRandomPrompts, GuidedPrompt } from '../../constants/guidedPrompts';
import { useMirrorData } from '../../hooks/useMirrorData';

export default function JournalScreen() {
  const router = useRouter();
  const [journalText, setJournalText] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('text');
  
  // Use AuthContext instead of manual user management
  const { user, isAuthenticated, isLoading } = useAuth();
  const { showSettings } = useGlobalSettings();

  // NEW: State for Phase 1 UI
  const [showNewUI, setShowNewUI] = useState(true); // Toggle to test new vs old UI
  const [carouselPrompts] = useState(() => getRandomPrompts(5

  ));
  
  // NEW: Get journal count for progress bar
  const { journalCount, loadJournals } = useMirrorData();

  // NEW: Bottom sheet state for Phase 2
  const [bottomSheetVisible, setBottomSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'free' | 'guided'>('free');
  const [sheetPrompt, setSheetPrompt] = useState<string | null>(null);

  // Handle voice transcription completion
  const handleVoiceTranscriptionComplete = async (transcribedText: string, timestamp: string) => {
    const saved = await saveJournalToDatabase(transcribedText, timestamp, 'voice');
    
    if (saved) {
      router.push({
        pathname: '/(tabs)/mirror',
        params: {
          journalText: transcribedText,
          timestamp: timestamp
        }
      });
    }
  };

  // Hooks
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
    formatDuration 
  } = useAudioRecording(handleVoiceTranscriptionComplete);

  // Load journal count on mount
  React.useEffect(() => {
    if (isAuthenticated && user) {
      loadJournals();
    }
  }, [isAuthenticated, user]);

  // Save journal to database
  const saveJournalToDatabase = async (content, timestamp, entryType: 'text' | 'voice') => {
    if (!isAuthenticated || !user) {
      Alert.alert('Error', 'Please sign in to save journal entries.');
      return false;
    }

    console.log('💾 Saving journal for custom user:', user.id);
    console.log('📝 Entry type:', entryType);
    const result = await saveJournalEntry(content, user.id, entryType);
    
    if (result.success) {
      console.log('✅ Journal saved successfully');
      return true;
    } else {
      console.error('❌ Failed to save journal:', result.error);
      Alert.alert('Save Error', result.error || 'Failed to save journal entry.');
      return false;
    }
  };
  
  // Handle text journal submission
  const handleTextJournalSubmit = async (text: string, timestamp: string) => {
    const saved = await saveJournalToDatabase(text, timestamp, 'text');
    
    if (saved) {
      router.push({
        pathname: '/(tabs)/mirror',
        params: {
          journalText: text,
          timestamp: timestamp
        }
      });
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

  // NEW: Handlers for Phase 2 - Open bottom sheet
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

  const handleBottomSheetSubmit = async (text: string, timestamp: string) => {
    // Use existing submission logic
    await handleTextJournalSubmit(text, timestamp);
    
    // Reload journals to update progress bar
    if (isAuthenticated && user) {
      loadJournals();
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
        {/* NEW UI - PHASE 1 */}
        {showNewUI && (
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
                prompts={carouselPrompts} 
                onPromptSelect={handleGuidedPromptSelect}
              />
            </View>

            {/* Phase toggle for testing */}
            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setShowNewUI(!showNewUI)}
            >
              <Text style={styles.toggleButtonText}>
                Toggle to {showNewUI ? 'Old' : 'New'} UI (Phase 1 Testing)
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OLD UI - Keep for now */}
        {!showNewUI && (
          <>
            <View style={styles.headerSection}>
              <Text style={styles.title}>Snap Journal</Text>
              <Text style={styles.subtitle}>Quickly capture important moments</Text>
            </View>
            
            <JournalTabs 
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
            
            {activeTab === 'text' ? (
              <TextJournalTab 
                journalText={journalText}
                setJournalText={setJournalText}
                onSubmit={handleTextJournalSubmit}
              />
            ) : (
              <VoiceRecordingTab
                isRecording={isRecording}
                isPaused={isPaused}
                recordingDuration={recordingDuration}
                isProcessing={isProcessing}
                formatDuration={formatDuration}
                onStartRecording={handleStartRecordingWithPermission}
                onStopRecording={handleStopRecording}
                onPauseRecording={handlePauseRecording}
                onResumeRecording={handleResumeRecording}
              />
            )}

            <TouchableOpacity 
              style={styles.toggleButton}
              onPress={() => setShowNewUI(!showNewUI)}
            >
              <Text style={styles.toggleButtonText}>
                Toggle to {showNewUI ? 'Old' : 'New'} UI (Phase 1 Testing)
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Bottom Sheet - Phase 2 */}
      <JournalBottomSheet
        visible={bottomSheetVisible}
        onClose={handleBottomSheetClose}
        mode={sheetMode}
        promptText={sheetPrompt}
        onSubmit={handleBottomSheetSubmit}
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
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
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
  toggleButton: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    alignSelf: 'center',
  },
  toggleButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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