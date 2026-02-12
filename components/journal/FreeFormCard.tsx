// components/journal/FreeFormCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface FreeFormCardProps {
  onPress: () => void;
  isPrimary?: boolean;
}

export const FreeFormCard: React.FC<FreeFormCardProps> = ({ onPress, isPrimary = false }) => {
  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Voice</Text>
        <Text style={styles.subtitle}>Unfiltered thinking</Text>
      </View>

      <View style={[styles.actionButton, isPrimary && styles.actionButtonPrimary]}>
        <Text style={[styles.actionButtonText, isPrimary && styles.actionButtonTextPrimary]}>Start</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748b',
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonPrimary: {
    backgroundColor: '#2563eb',
    borderWidth: 0,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
  },
});