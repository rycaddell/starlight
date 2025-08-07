import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useAudioPermissions } from '../../hooks/useAudioPermissions';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { TextJournalTab } from '../../components/journal/TextJournalTab';
import { VoiceRecordingTab } from '../../components/voice/VoiceRecordingTab';
import { JournalTabs, TabType } from '../../components/journal/JournalTabs';
import { saveJournalEntry } from '../../lib/supabase';

export default function JournalScreen() {
  const router = useRouter();
  const [journalText, setJournalText] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('text');
  
  // Use AuthContext instead of manual user management
  const { user, isAuthenticated, isLoading } = useAuth();

  // Save journal to database
  const saveJournalToDatabase = async (content, timestamp) => {
    if (!isAuthenticated || !user) {
      Alert.alert('Error', 'Please sign in to save journal entries.');
      return false;
    }

    console.log('💾 Saving journal for custom user:', user.id);
    const result = await saveJournalEntry(content, user.id); // Use custom user ID
    
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
    const saved = await saveJournalToDatabase(text, timestamp);
    
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

  // Handle voice transcription completion
  const handleVoiceTranscriptionComplete = async (transcribedText: string, timestamp: string) => {
    const saved = await saveJournalToDatabase(transcribedText, timestamp);
    
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

  // Combined permission check and recording start
  const handleStartRecordingWithPermission = async () => {
    const permissionGranted = await checkPermissionAndRequest();
    if (permissionGranted) {
      await handleStartRecording(permissionGranted);
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
        <Text style={styles.title}>
          ✨ Starlight
        </Text>
        <Text style={styles.subtitle}>
          Your spiritual formation journal
        </Text>

        {/* Welcome message with user's display name */}
        <Text style={styles.welcomeText}>
          Welcome, {user.display_name}! 🙏
        </Text>

        <Text style={styles.heading}>
          What do you want to capture?
        </Text>
        
        {/* Tab Interface */}
        <JournalTabs 
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        {/* Tab Content */}
        {activeTab === 'text' ? (
          // Text Input Tab
          <TextJournalTab 
            journalText={journalText}
            setJournalText={setJournalText}
            onSubmit={handleTextJournalSubmit}
          />
        ) : (
          // Voice Recording Tab
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
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  title: {
    fontSize: 36, // text-4xl
    fontWeight: 'bold',
    color: '#1e293b', // slate-800
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  subtitle: {
    fontSize: 20, // text-xl
    color: '#64748b', // slate-600
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 18,
    color: '#059669', // emerald-600
    marginBottom: 32,
    textAlign: 'center',
    fontWeight: '500',
  },
  heading: {
    fontSize: 24, // text-2xl
    fontWeight: '600',
    color: '#334155', // slate-700
    marginBottom: 24,
    alignSelf: 'flex-start',
    width: '100%',
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