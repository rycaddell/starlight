/**
 * VoiceRecordingTab Component - UPDATED
 * 
 * Improved UX with:
 * - Timer and button grouped as one visual unit
 * - Brand primary color instead of red
 * - Cleaner layout with soft background
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
      {/* Recording Unit - Grouped timer and controls */}
      <View style={styles.recordingUnit}>
        {/* Timer Display */}
        <Text style={styles.durationText}>
          {formatDuration(recordingDuration)}
        </Text>
        
        {isRecording && !isProcessing && (
          <Text style={styles.recordingStatus}>
            {isPaused ? '⏸️ Paused' : '🔴 Recording'}
          </Text>
        )}

        {isProcessing && (
          <Text style={styles.processingStatus}>
            🤖 Transcribing audio...
          </Text>
        )}

        {/* Recording Controls */}
        {!isRecording && !isProcessing ? (
          // Start Recording Button
          <TouchableOpacity
            style={styles.recordButton}
            onPress={onStartRecording}
          >
            <Text style={styles.recordButtonText}>Start Recording 🎤</Text>
          </TouchableOpacity>
        ) : isProcessing ? (
          // Processing State
          <View style={[styles.recordButton, styles.processingButton]}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  voiceContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  recordingUnit: {
    backgroundColor: '#f1f5f9', // Soft neutral background
    borderRadius: 16,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    minHeight: 180,
    justifyContent: 'center',
  },
  durationText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1e293b',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  recordingStatus: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 24,
    fontWeight: '600',
  },
  processingStatus: {
    fontSize: 16,
    color: '#2563eb',
    marginBottom: 24,
    fontWeight: '600',
  },
  recordButton: {
    backgroundColor: '#059669', // Brand primary green
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  processingButton: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
  },
  recordingControls: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  controlButton: {
    backgroundColor: '#64748b',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  controlButtonIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  controlButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});