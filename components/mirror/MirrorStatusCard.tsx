import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MirrorStatusCardProps {
  state: 'ready' | 'generating' | 'completed';
  journalCount: number;
  onGeneratePress: () => void;
  onViewPress: () => void;
  generationStartTime: number | null;
}

export const MirrorStatusCard: React.FC<MirrorStatusCardProps> = ({
  state,
  journalCount,
  onGeneratePress,
  onViewPress,
  generationStartTime,
}) => {
  const [fakeProgress, setFakeProgress] = useState(0);
  const [isStuck, setIsStuck] = useState(false);

  // Check if generation is stuck (> 5 minutes)
  const STUCK_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  // Fake progress bar animation (0% to 100% over 2 minutes)
  useEffect(() => {
    if (state !== 'generating' || !generationStartTime) {
      setFakeProgress(0);
      setIsStuck(false);
      return;
    }

    // Calculate initial progress based on elapsed time
    const elapsed = Date.now() - generationStartTime;
    const initialProgress = Math.min((elapsed / 120000) * 100, 100); // 120000ms = 2 minutes
    setFakeProgress(initialProgress);

    // Check if stuck (> 5 minutes)
    if (elapsed > STUCK_THRESHOLD) {
      setIsStuck(true);
      return; // Don't start progress interval if already stuck
    }

    // Update progress every 500ms
    const interval = setInterval(() => {
      const currentElapsed = Date.now() - generationStartTime;

      // Check if stuck
      if (currentElapsed > STUCK_THRESHOLD) {
        setIsStuck(true);
        clearInterval(interval);
        return;
      }

      setFakeProgress((prev) => {
        const newProgress = prev + (100 / 240); // 120 seconds / 0.5 second intervals = 240 steps
        return Math.min(newProgress, 99); // Cap at 99% until actually complete
      });
    }, 500);

    return () => clearInterval(interval);
  }, [state, generationStartTime]);

  // State 1: Ready to Generate
  if (state === 'ready') {
    return (
      <View style={styles.card}>
        <View style={styles.content}>
          <Text style={styles.title}>Mirror Ready! ✨</Text>
          <Text style={styles.subtitle}>
            You have {journalCount} journal{journalCount !== 1 ? 's' : ''} ready
          </Text>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={onGeneratePress}
        >
          <Text style={styles.buttonText}>Generate Mirror</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State 2: Generating (In Progress)
  if (state === 'generating') {
    // Show retry option if stuck for > 5 minutes
    if (isStuck) {
      return (
        <View style={styles.card}>
          <View style={styles.content}>
            <Text style={styles.title}>Generation Timed Out</Text>
            <Text style={styles.subtitle}>
              This is taking longer than expected. Please try again.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={onGeneratePress}
          >
            <Text style={styles.buttonText}>Retry Generation</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={styles.content}>
          <Text style={styles.title}>Mirror In Progress</Text>
          <Text style={styles.subtitle}>This can take up to 2 minutes</Text>

          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${fakeProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(fakeProgress)}%</Text>
        </View>
        <TouchableOpacity
          style={[styles.button, styles.buttonDisabled]}
          disabled={true}
        >
          <Text style={[styles.buttonText, styles.buttonTextDisabled]}>
            Generating...
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // State 3: Complete (Ready to View)
  if (state === 'completed') {
    return (
      <View style={styles.card}>
        <View style={styles.content}>
          <Text style={styles.title}>Mirror Complete! ✨</Text>
          <Text style={styles.subtitle}>Your reflection is ready</Text>
        </View>
        <TouchableOpacity
          style={styles.button}
          onPress={onViewPress}
        >
          <Text style={styles.buttonText}>View Mirror</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  buttonText: {
    color: '#1e293b',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#94a3b8',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '600',
  },
});