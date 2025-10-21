// components/onboarding/JournalEntryScreen.tsx
import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, Alert, TouchableOpacity } from 'react-native';
import { Audio } from 'expo-av';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { useAudioRecording } from '../../hooks/useAudioRecording';
import { TextJournalTab } from '../../components/journal/TextJournalTab';
import { VoiceRecordingTab } from '../../components/voice/VoiceRecordingTab';
import { JournalTabs, TabType } from '../../components/journal/JournalTabs';

export const JournalEntryScreen: React.FC = () => {
  const { setJournalContent, setJournalEntryType, setCurrentStep } = useOnboarding();
  const [journalText, setJournalText] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('text'); // Default to text

  // Handle text journal submission
  const handleTextJournalSubmit = async (text: string, timestamp: string) => {
    console.log('📝 Text journal submitted:', text.substring(0, 50) + '...');
    setJournalContent(text);
    setJournalEntryType('text');
    // Use setTimeout to ensure state updates before navigation
    setTimeout(() => {
      setCurrentStep('loading-reflection');
    }, 0);
  };

  // Handle voice transcription completion
  const handleVoiceTranscriptionComplete = async (transcribedText: string, timestamp: string) => {
    console.log('🎤 Voice journal transcribed:', transcribedText.substring(0, 50) + '...');
    setJournalContent(transcribedText);
    setJournalEntryType('voice');
    // Use setTimeout to ensure state updates before navigation
    setTimeout(() => {
      setCurrentStep('loading-reflection');
    }, 0);
  };

  // Audio recording hook
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

  // Permission check and recording start (same logic as main journal)
  const handleStartRecordingWithPermission = async () => {
    try {
      console.log('🎤 Onboarding: Checking microphone permission...');
      
      // Check current device permission
      const currentStatus = await Audio.getPermissionsAsync();
      console.log('Current microphone status:', currentStatus);
      
      if (currentStatus.granted) {
        console.log('✅ Permission already granted, starting recording...');
        await handleStartRecording(true);
        return;
      }
      
      // Permission not granted - show prompt
      console.log('⚠️ No permission, prompting user...');
      Alert.alert(
        'Enable Voice Journaling?',
        'Voice journaling lets you speak your thoughts naturally. Would you like to try it?',
        [
          { 
            text: 'Use Text Instead', 
            style: 'cancel',
            onPress: () => {
              console.log('📝 User chose text instead');
              setActiveTab('text');
            }
          },
          { 
            text: 'Enable Microphone', 
            onPress: async () => {
              try {
                console.log('🎤 User chose to enable microphone...');
                
                // Set audio mode
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
                  console.log('❌ Permission denied, switching to text');
                  Alert.alert(
                    'No Problem!',
                    'You can use text journaling instead.',
                    [{ 
                      text: 'OK',
                      onPress: () => setActiveTab('text')
                    }]
                  );
                }
              } catch (error) {
                console.error('❌ Error in permission flow:', error);
                Alert.alert(
                  'Error',
                  'Unable to enable microphone. Switching to text input.',
                  [{ 
                    text: 'OK',
                    onPress: () => setActiveTab('text')
                  }]
                );
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error checking microphone permission:', error);
      Alert.alert(
        'Error',
        'Unable to check microphone permission. Please use text input.',
        [{ 
          text: 'OK',
          onPress: () => setActiveTab('text')
        }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.eyebrow}>FIRST JOURNAL</Text>
          <Text style={styles.question}>
            What have you been talking with God about lately?
          </Text>
        </View>
        
        {/* Tab Interface - Segmented Control Style */}
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              activeTab === 'text' ? styles.segmentActive : styles.segmentInactive
            ]}
            onPress={() => setActiveTab('text')}
          >
            <Text style={[
              styles.segmentText,
              activeTab === 'text' ? styles.segmentTextActive : styles.segmentTextInactive
            ]}>
              📝 Text
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.segment,
              activeTab === 'voice' ? styles.segmentActive : styles.segmentInactive
            ]}
            onPress={() => setActiveTab('voice')}
          >
            <Text style={[
              styles.segmentText,
              activeTab === 'voice' ? styles.segmentTextActive : styles.segmentTextInactive
            ]}>
              🎤 Voice
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Helper Text */}
        <Text style={styles.helperText}>
        Text is best for capturing quick thoughts.  Voice is better for deeper, unstructured thinking.
        </Text>
        
        {/* Tab Content */}
        {activeTab === 'text' ? (
          <TextJournalTab 
            journalText={journalText}
            setJournalText={setJournalText}
            onSubmit={handleTextJournalSubmit}
            hidePlaceholder={true}
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
      </ScrollView>
    </SafeAreaView>
  );
};

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
    padding: 20,
    paddingTop: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  question: {
    fontSize: 20, // Larger and bold for emphasis
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 28,
    paddingHorizontal: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    borderRadius: 10,
    padding: 3,
    width: '100%',
    marginBottom: 12,
  },
  segment: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: '#2563eb', // Blue for active
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentInactive: {
    backgroundColor: 'transparent',
  },
  segmentText: {
    fontSize: 16,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  segmentTextInactive: {
    color: '#64748b',
  },
  helperText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
});