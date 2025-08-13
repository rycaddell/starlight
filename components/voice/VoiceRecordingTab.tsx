/**
 * VoiceRecordingTab Component
 * 
 * Handles voice recording functionality including:
 * - Recording controls (start/stop/pause/resume)
 * - Real-time duration display with MM:SS formatting
 * - Recording state indicators (recording/paused status)
 * - Integration with permission checking and audio recording hooks
 * - Clean UI with recording feedback
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface VoiceRecordingTabProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  isProcessing: boolean;
  formatDuration: (seconds: number) => string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPauseRecording: () => void;
  onResumeRecording: () => void;
}

export const VoiceRecordingTab: React.FC<VoiceRecordingTabProps> = ({
  isRecording,
  isPaused,
  recordingDuration,
  isProcessing,
  formatDuration,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording
}) => {
  return (
    <View style={styles.voiceContainer}>
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
        {isProcessing && (
          <Text style={styles.processingStatus}>
            🤖 Transcribing audio...
          </Text>
        )}
      </View>

      {/* Recording Controls */}
      <View style={styles.controlsContainer}>
        {!isRecording && !isProcessing ? (
          // Start Recording Button
          <TouchableOpacity
            style={styles.recordButton}
            onPress={onStartRecording}
          >
            <Text style={styles.recordButtonIcon}>🎤</Text>
            <Text style={styles.recordButtonText}>Start Recording</Text>
          </TouchableOpacity>
        ) : isProcessing ? (
          // Processing State
          <View style={[styles.recordButton, styles.processingButton]}>
            <Text style={styles.recordButtonIcon}>🤖</Text>
            <Text style={styles.recordButtonText}>Processing...</Text>
          </View>
        ) : (
          // Recording Controls (Stop, Pause/Resume)
          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={onStopRecording}
            >
              <Text style={styles.controlButtonIcon}>⏹️</Text>
              <Text style={styles.controlButtonText}>Stop</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.controlButton}
              onPress={isPaused ? onResumeRecording : onPauseRecording}
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
        {isProcessing
          ? 'Converting your voice to text...'
          : !isRecording 
            ? 'Tap to start recording your voice journal' 
            : 'Share what\'s on your heart...'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  voiceContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 20,
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
  processingStatus: {
    fontSize: 16,
    color: '#2563eb',
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
  processingButton: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
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