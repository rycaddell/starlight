// components/journal/GuidedPromptCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { GuidedPrompt } from '../../lib/constants/guidedPrompts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GuidedPromptCardProps {
  prompt: GuidedPrompt;
  onPress: () => void;
}

export const GuidedPromptCard: React.FC<GuidedPromptCardProps> = ({ 
  prompt, 
  onPress 
}) => {
  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity 
        style={styles.card}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Text style={styles.label}>Guided</Text>
        </View>
        
        <Text style={styles.promptText}>{prompt.text}</Text>
        
        <View style={styles.footer}>
          <View style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Start</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    width: SCREEN_WIDTH, // Full screen width - paging will handle this
    paddingHorizontal: 16, // Creates visual inset but card takes full width
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
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
    minHeight: 140,
    justifyContent: 'space-between',
  },
  header: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 26,
    flex: 1,
  },
  footer: {
    marginTop: 16,
    alignItems: 'flex-end',
  },
  actionButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});