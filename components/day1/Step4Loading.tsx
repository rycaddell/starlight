// components/day1/Step4Loading.tsx
// Step 4: Loading screen that waits for transcriptions and generates mini-mirror

import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { checkBothTranscriptionsReady, generateMiniMirror, getDay1Progress } from '../../lib/supabase/day1';

interface Step4LoadingProps {
  userId: string;
  userName: string;
  onComplete: (mirrorId: string, summaries: any) => void;
}

type LoadingState = 'waiting_transcriptions' | 'generating_mirror' | 'complete' | 'error';

export const Step4Loading: React.FC<Step4LoadingProps> = ({
  userId,
  userName,
  onComplete,
}) => {
  const [state, setState] = useState<LoadingState>('waiting_transcriptions');
  const [statusMessage, setStatusMessage] = useState('Preparing your reflection...');

  useEffect(() => {
    startPolling();
  }, []);

  const startPolling = async () => {
    let pollCount = 0;
    const maxPolls = 60; // 60 polls * 3 seconds = 3 minutes max wait

    const poll = async () => {
      pollCount++;

      if (pollCount > maxPolls) {
        console.error('❌ Polling timeout after 3 minutes');
        setState('error');
        setStatusMessage('Taking longer than expected. Please try again.');
        Alert.alert(
          'Timeout',
          'Generation is taking longer than expected. Please close and try again.',
          [{ text: 'OK' }]
        );
        return;
      }

      try {
        // Check if both transcriptions are ready
        const transcriptionsResult = await checkBothTranscriptionsReady(userId);

        if (!transcriptionsResult.ready) {
          // Still waiting for transcriptions
          console.log(`⏳ Waiting for transcriptions (${pollCount}/60)...`);

          if (transcriptionsResult.step2Ready && !transcriptionsResult.step3Ready) {
            setStatusMessage('Transcribing your second response...');
          } else if (!transcriptionsResult.step2Ready) {
            setStatusMessage('Transcribing your first response...');
          }

          setTimeout(poll, 3000); // Poll every 3 seconds
          return;
        }

        // Both transcriptions ready - check generation status
        console.log('✅ Both transcriptions complete, checking generation status...');

        const progressResult = await getDay1Progress(userId);

        if (!progressResult.success || !progressResult.progress) {
          throw new Error('Failed to fetch progress');
        }

        const progress = progressResult.progress;

        // If generation already completed
        if (progress.generation_status === 'completed' && progress.mini_mirror_id) {
          console.log('✅ Generation already complete');
          setState('complete');
          onComplete(progress.mini_mirror_id, null);
          return;
        }

        // If generation in progress
        if (progress.generation_status === 'generating') {
          console.log('🔄 Generation in progress, continuing to poll...');
          setStatusMessage(`${userName}, building your first Mirror now...`);
          setTimeout(poll, 3000);
          return;
        }

        // If generation failed
        if (progress.generation_status === 'failed') {
          console.error('❌ Generation failed');
          setState('error');
          setStatusMessage('Generation failed. Please try again.');
          Alert.alert('Generation Failed', 'Unable to generate your mirror. Please try again.');
          return;
        }

        // If generation pending, trigger it
        if (progress.generation_status === 'pending') {
          console.log('🚀 Triggering mini-mirror generation...');
          setState('generating_mirror');
          setStatusMessage(`${userName}, building your first Mirror now...`);

          const generateResult = await generateMiniMirror(userId);

          if (generateResult.success) {
            console.log('✅ Mini-mirror generated successfully');
            setState('complete');
            onComplete(generateResult.mirror.id, generateResult.summaries);
          } else {
            console.error('❌ Generation failed:', generateResult.error);
            setState('error');
            setStatusMessage('Generation failed. Please try again.');
            Alert.alert('Generation Failed', generateResult.error || 'Unable to generate your mirror.');
          }
        }

      } catch (error) {
        console.error('❌ Error in polling:', error);
        setState('error');
        setStatusMessage('An error occurred. Please try again.');
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }
    };

    // Start polling
    poll();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Loading spinner */}
        <ActivityIndicator size="large" color="#2563eb" style={styles.spinner} />

        {/* Status message */}
        <Text style={styles.message}>{statusMessage}</Text>

        {/* Sub-message based on state */}
        {state === 'waiting_transcriptions' && (
          <Text style={styles.subMessage}>
            Transcribing your voice recordings...
          </Text>
        )}

        {state === 'generating_mirror' && (
          <Text style={styles.subMessage}>
            This is a great place to start
          </Text>
        )}

        {state === 'error' && (
          <Text style={styles.errorMessage}>
            Please close and try again
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  spinner: {
    marginBottom: 32,
  },
  message: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  subMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  errorMessage: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '500',
  },
});
