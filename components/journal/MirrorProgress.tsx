/**
 * MirrorProgress Component
 * 
 * Shows progress toward the next Mirror generation (X/10 journal entries).
 * Displays a visual progress bar and count.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MIRROR_THRESHOLD } from '../../lib/config/constants';

interface MirrorProgressProps {
  currentCount: number;
  targetCount?: number;
}

export const MirrorProgress: React.FC<MirrorProgressProps> = ({ 
  currentCount, 
  targetCount = MIRROR_THRESHOLD 
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
        
        <Text style={styles.progressText}>
          {currentCount} / {targetCount}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc', // slate-50
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
    backgroundColor: '#e2e8f0', // slate-200
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6', // blue-500
    borderRadius: 4,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b', // slate-600
  },
});
