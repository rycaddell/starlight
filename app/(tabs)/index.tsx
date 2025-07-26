import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAudioPermissions } from '../../hooks/useAudioPermissions';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { TextJournalTab } from '../../components/journal/TextJournalTab';
import { VoiceRecordingTab } from '../../components/voice/VoiceRecordingTab';
import { JournalTabs, TabType } from '../../components/journal/JournalTabs';

export default function JournalScreen() {
  const router = useRouter();
  const [journalText, setJournalText] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('text');
  
  // Handle text journal submission
  const handleTextJournalSubmit = (text: string, timestamp: string) => {
    router.push({
      pathname: '/(tabs)/mirror',
      params: {
        journalText: text,
        timestamp: timestamp
      }
    });
  };

  // Handle voice transcription completion
  const handleVoiceTranscriptionComplete = (transcribedText: string, timestamp: string) => {
    router.push({
      pathname: '/(tabs)/mirror',
      params: {
        journalText: transcribedText,
        timestamp: timestamp
      }
    });
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
        
        <Text style={styles.heading}>
          What's on your heart today?
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
    marginBottom: 48,
    textAlign: 'center',
  },
  heading: {
    fontSize: 24, // text-2xl
    fontWeight: '600',
    color: '#334155', // slate-700
    marginBottom: 24,
    alignSelf: 'flex-start',
    width: '100%',
  },
});