import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

export default function JournalScreen() {
  const router = useRouter();
  const [journalText, setJournalText] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'voice'>('text');
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Navigate to Mirror tab with journal data and timestamp
  const handleSubmit = () => {
    if (journalText.trim()) {
      const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      router.push({
        pathname: '/(tabs)/mirror',
        params: {
          journalText: journalText.trim(),
          timestamp: timestamp
        }
      });

      // Clear the text input after submission
      setJournalText('');
    }
  };

  const isSubmitDisabled = !journalText.trim();

  // Voice recording functions (UI only for now)
  const handleStartRecording = () => {
    setIsRecording(true);
    setIsPaused(false);
    setRecordingDuration(0);
    // TODO: Start actual recording in next step
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0); // Reset timer to zero
    // TODO: Stop actual recording in next step
  };

  const handlePauseRecording = () => {
    setIsPaused(true);
    // TODO: Pause actual recording in next step
  };

  const handleResumeRecording = () => {
    setIsPaused(false);
    // TODO: Resume actual recording in next step
  };

  // Mock timer for now (will be replaced with actual recording timer)
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'text' ? styles.activeTab : styles.inactiveTab
            ]}
            onPress={() => setActiveTab('text')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'text' ? styles.activeTabText : styles.inactiveTabText
            ]}>
              📝 Text
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'voice' ? styles.activeTab : styles.inactiveTab
            ]}
            onPress={() => setActiveTab('voice')}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'voice' ? styles.activeTabText : styles.inactiveTabText
            ]}>
              🎤 Voice
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Tab Content */}
        {activeTab === 'text' ? (
          // Text Input Tab
          <>
            {/* Text Input Field - 4 lines minimum, grows as needed */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                multiline={true}
                placeholder="Share your thoughts, reflections, or prayers..."
                placeholderTextColor="#64748b"
                value={journalText}
                onChangeText={setJournalText}
                returnKeyType="default"
              />
            </View>

            {/* Submit Button */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                onPress={handleSubmit}
                disabled={isSubmitDisabled}
                style={[
                  styles.submitButton,
                  isSubmitDisabled ? styles.submitButtonDisabled : styles.submitButtonActive
                ]}
              >
                <Text style={[
                  styles.submitButtonText,
                  isSubmitDisabled ? styles.submitButtonTextDisabled : styles.submitButtonTextActive
                ]}>
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Voice Recording Tab
          <View style={styles.voiceContainer}>
            <Text style={styles.voiceTitle}>Voice Journal</Text>
            
            {/* Recording Duration Display */}
            <View style={styles.durationContainer}>
              <Text style={styles.durationText}>
                {formatDuration(recordingDuration)}
              </Text>
              {isRecording && (
                <Text style={styles.recordingStatus}>
                  {isPaused ? '⏸️ Paused' : '🔴 Recording'}
                </Text>
              )}
            </View>

            {/* Recording Controls */}
            <View style={styles.controlsContainer}>
              {!isRecording ? (
                // Start Recording Button
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={handleStartRecording}
                >
                  <Text style={styles.recordButtonIcon}>🎤</Text>
                  <Text style={styles.recordButtonText}>Start Recording</Text>
                </TouchableOpacity>
              ) : (
                // Recording Controls (Stop, Pause/Resume)
                <View style={styles.recordingControls}>
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handleStopRecording}
                  >
                    <Text style={styles.controlButtonIcon}>⏹️</Text>
                    <Text style={styles.controlButtonText}>Stop</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.controlButton}
                    onPress={isPaused ? handleResumeRecording : handlePauseRecording}
                  >
                    <Text style={styles.controlButtonIcon}>
                      {isPaused ? '▶️' : '⏸️'}
                    </Text>
                    <Text style={styles.controlButtonText}>
                      {isPaused ? 'Resume' : 'Pause'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Recording Hint */}
            <Text style={styles.recordingHint}>
              {!isRecording 
                ? 'Tap to start recording your voice journal' 
                : 'Share what\'s on your heart...'}
            </Text>
          </View>
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
  tabContainer: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 24,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 2,
  },
  activeTab: {
    backgroundColor: '#2563eb', // blue-600
    borderColor: '#2563eb',
  },
  inactiveTab: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8', // slate-400
  },
  tabText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  inactiveTabText: {
    color: '#64748b', // slate-600
  },
  inputContainer: {
    padding: 5,
    width: '100%',
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#1e293b', // slate-800
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 2,
    borderColor: '#94a3b8', // slate-400
  },
  buttonContainer: {
    padding: 5,
    width: '100%',
  },
  submitButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  submitButtonActive: {
    backgroundColor: '#2563eb', // blue-600
    shadowColor: '#1e40af',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1', // slate-300
  },
  submitButtonText: {
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  submitButtonTextActive: {
    color: '#ffffff',
  },
  submitButtonTextDisabled: {
    color: '#64748b', // slate-500
  },
  voiceContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  voiceTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 30,
  },
  durationContainer: {
    alignItems: 'center',
    marginBottom: 40,
    minHeight: 60,
    justifyContent: 'center',
  },
  durationText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    fontFamily: 'monospace',
  },
  recordingStatus: {
    fontSize: 16,
    color: '#ef4444',
    marginTop: 8,
    fontWeight: '500',
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  recordButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 50,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButtonIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 20,
  },
  controlButton: {
    backgroundColor: '#64748b',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 80,
  },
  controlButtonIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  recordingHint: {
    color: '#64748b',
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});