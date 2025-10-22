/**
 * MirrorProgress Component
 * 
 * Shows progress toward the next Mirror generation (X/10 journal entries).
 * Displays a visual progress bar only (text shown separately in parent).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';

interface MirrorProgressProps {
  currentCount: number;
  targetCount?: number;
}

export const MirrorProgress: React.FC<MirrorProgressProps> = ({ 
  currentCount, 
  targetCount = 10 
}) => {
  const progressPercentage = Math.min((currentCount / targetCount) * 100, 100);

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${progressPercentage}%` }
            ]} 
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    alignItems: 'center',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
});