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
        {/* Fixed Header Section */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>
            Snap Journal
          </Text>
          <Text style={styles.subtitle}>
            Quickly capture important moments
          </Text>
          
        </View>
        
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
    alignItems: 'center',
    padding: 16,
    paddingTop: 24,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  title: {
    fontSize: 36, // text-4xl
    fontWeight: 'bold',
    color: '#1e293b', // slate-800
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b', // slate-600
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
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