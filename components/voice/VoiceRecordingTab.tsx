// components/voice/VoiceRecordingTab.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';
import { MirrorGenerationProgressIndicator } from '@/components/MirrorGenerationProgressIndicator';

interface VoiceRecordingTabProps {
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  isProcessing: boolean;
  isTranscribing?: boolean;
  isBuildingMirror?: boolean;
  hasRecorded?: boolean;
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
  isTranscribing = false,
  isBuildingMirror = false,
  hasRecorded = false,
  formatDuration,
  onStartRecording,
  onStopRecording,
  onPauseRecording,
  onResumeRecording,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.recordingUnit}>
        {/* Timer — only shown while recording or processing so stale duration
            doesn't appear in the idle state between sessions */}
        {(isRecording || isProcessing) && (
          <Text style={styles.durationText}>
            {formatDuration(recordingDuration)}
          </Text>
        )}

        {/* Status */}
        {isRecording && !isProcessing && (
          <Text style={styles.statusText}>
            {isPaused ? 'Paused' : 'Recording'}
          </Text>
        )}

        {/* Controls */}
        {!isRecording && !isProcessing && !isBuildingMirror ? (
          <TouchableOpacity style={styles.startButton} onPress={onStartRecording}>
            <Text style={styles.startButtonText}>
              {hasRecorded ? 'Record Again' : 'Start Recording'}
            </Text>
          </TouchableOpacity>
        ) : isProcessing || isBuildingMirror ? (
          <View style={[styles.startButton, styles.processingButton]}>
            <Text style={[styles.startButtonText, styles.processingButtonText]}>
              {isBuildingMirror ? 'Generating Mirror' : isTranscribing ? 'Transcribing...' : 'Processing...'}
            </Text>
            <MirrorGenerationProgressIndicator size={28} progress={0.4} />
          </View>
        ) : (
          <View style={styles.recordingControls}>
            <TouchableOpacity
              style={[styles.controlButton, !isPaused && styles.controlButtonPrimary]}
              onPress={onStopRecording}
            >
              <Text style={[styles.controlButtonText, !isPaused && styles.controlButtonTextPrimary]}>
                Stop
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, isPaused && styles.controlButtonPrimary]}
              onPress={isPaused ? onResumeRecording : onPauseRecording}
            >
              <Text style={[styles.controlButtonText, isPaused && styles.controlButtonTextPrimary]}>
                {isPaused ? 'Resume' : 'Pause'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!isBuildingMirror && (
        <Text style={styles.limitText}>Maximum recording length: 8 minutes</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.l,
  },
  recordingUnit: {
    padding: spacing.xxxxl,
    width: '100%',
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
    gap: spacing.l,
  },
  durationText: {
    fontFamily: 'monospace',
    fontSize: 48,
    fontWeight: '700',
    color: colors.text.body,
  },
  statusText: {
    ...typography.heading.s,
    color: colors.text.bodyLight,
  },
  startButton: {
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xxxxl,
    borderRadius: borderRadius.button,
    minWidth: 200,
    alignItems: 'center',
  },
  processingButton: {
    backgroundColor: colors.background.disabled,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.ml,
    height: 40,
    width: 246,
    paddingVertical: 0,
    paddingHorizontal: 30,
  },
  processingButtonText: {
    color: colors.text.bodyLight,
  },
  startButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
  },
  recordingControls: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  controlButton: {
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    minWidth: 100,
    borderWidth: 1,
    borderColor: colors.border.divider,
    backgroundColor: colors.background.card,
  },
  controlButtonPrimary: {
    backgroundColor: colors.text.primary,
    borderColor: colors.text.primary,
  },
  controlButtonText: {
    ...typography.heading.s,
    color: colors.text.body,
  },
  controlButtonTextPrimary: {
    color: colors.text.white,
  },
  limitText: {
    ...typography.body.s,
    color: colors.text.bodyLight,
  },
});
