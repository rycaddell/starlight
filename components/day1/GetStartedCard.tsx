// components/day1/GetStartedCard.tsx
// Card that appears on journal screen for users who haven't completed Day 1

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface GetStartedCardProps {
  onPress: () => void;
}

export const GetStartedCard: React.FC<GetStartedCardProps> = ({ onPress }) => {
  return (
    <View style={styles.card}>
      <View style={styles.leftContent}>
        <Text style={styles.title}>Get Started</Text>
        <Text style={styles.subtitle}>3 mins • Voice</Text>
        <Text style={styles.description}>
          Where are you now?
        </Text>
      </View>

      <TouchableOpacity style={styles.buttonContainer} onPress={onPress} activeOpacity={0.8}>
        <Text style={styles.buttonText}>Begin</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'left',
    lineHeight: 22,
  },
  buttonContainer: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
