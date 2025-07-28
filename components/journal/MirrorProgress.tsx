/**
 * MirrorProgress Component
 * 
 * Shows progress toward the next Mirror generation (X/15 journal entries).
 * Displays a visual progress bar and count.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MirrorProgressProps {
  currentCount: number;
  targetCount?: number;
}

export const MirrorProgress: React.FC<MirrorProgressProps> = ({ 
  currentCount, 
  targetCount = 15 
}) => {
  const progressPercentage = Math.min((currentCount / targetCount) * 100, 100);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Progress to Next Mirror</Text>
      
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#f8fafc', // slate-50
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155', // slate-700
    marginBottom: 12,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
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