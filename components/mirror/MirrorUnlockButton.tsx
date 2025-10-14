// components/mirror/MirrorUnlockButton.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MirrorUnlockButtonProps {
  onPress: () => void;
  disabled?: boolean;
}

export const MirrorUnlockButton: React.FC<MirrorUnlockButtonProps> = ({ onPress, disabled = false }) => (
  <View style={styles.container}>
    <View style={styles.celebrationContainer}>
      <Text style={styles.celebrationEmoji}>🪞</Text>
      <Text style={styles.celebrationTitle}>Mirror Ready!</Text>
      <Text style={styles.celebrationSubtitle}>
        You&apos;ve completed 15 journal entries.
      </Text>
    </View>
    
    <TouchableOpacity
      style={[styles.unlockButton, disabled && styles.unlockButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.buttonContent}>
        <Text style={styles.unlockEmoji}>✨</Text>
        <Text style={styles.unlockText}>Generate Mirror</Text>
        <Text style={styles.unlockEmoji}>✨</Text>
      </View>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#f0f9ff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#0ea5e9',
  },
  celebrationEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0c4a6e',
    marginBottom: 8,
  },
  celebrationSubtitle: {
    fontSize: 16,
    color: '#0369a1',
    textAlign: 'center',
    lineHeight: 22,
  },
  unlockButton: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: 16,
    shadowColor: '#f59e0b',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  unlockButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  unlockEmoji: {
    fontSize: 24,
  },
  unlockText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
});
