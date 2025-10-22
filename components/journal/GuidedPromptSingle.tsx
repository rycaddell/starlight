// components/journal/GuidedPromptSingle.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { GuidedPrompt } from '../../lib/constants/guidedPrompts';

interface GuidedPromptSingleProps {
  prompts: GuidedPrompt[];
  onPromptSelect: (prompt: GuidedPrompt) => void;
}

export const GuidedPromptSingle: React.FC<GuidedPromptSingleProps> = ({
  prompts,
  onPromptSelect,
}) => {
  const [currentPrompt, setCurrentPrompt] = useState(prompts[0]);

  const handleShuffle = () => {
    // Get a random prompt that's different from current
    const otherPrompts = prompts.filter(p => p.id !== currentPrompt.id);
    const randomPrompt = otherPrompts[Math.floor(Math.random() * otherPrompts.length)];
    setCurrentPrompt(randomPrompt);
  };

  if (prompts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Guided Prompt Card */}
      <TouchableOpacity 
        style={styles.card}
        onPress={() => onPromptSelect(currentPrompt)}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Text style={styles.label}>GUIDED</Text>
        </View>
        
        <Text style={styles.promptText}>{currentPrompt.text}</Text>
        
        <View style={styles.footer}>
          <View style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Start</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Shuffle Button */}
      {prompts.length > 1 && (
        <TouchableOpacity 
          style={styles.shuffleButton}
          onPress={handleShuffle}
          activeOpacity={0.7}
        >
          <Text style={styles.shuffleIcon}>🔄</Text>
          <Text style={styles.shuffleText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
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
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
  },
  shuffleIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  shuffleText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
});