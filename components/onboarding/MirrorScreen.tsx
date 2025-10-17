// components/onboarding/MirrorScreen.tsx (formerly AIPreviewScreen)
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const MirrorScreen: React.FC = () => {
  const { aiPreviewData, goToNextStep } = useOnboarding();

  // Show loading state if data hasn't loaded yet
  if (!aiPreviewData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Preparing your preview...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { biblical_profile, encouraging_verse } = aiPreviewData;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>🪞</Text>
        <Text style={styles.title}>Mirror</Text>
        <Text style={styles.subtitle}>
          Oxbow reflects your journaling back to you to help you see through lines and how God might be leading.
        </Text>
        
        <View style={styles.card}>
          {/* Biblical Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>✨ Biblical Mirror</Text>
            <Text style={styles.characterName}>{biblical_profile.character}</Text>
            <Text style={styles.sectionText}>{biblical_profile.connection}</Text>
          </View>

          {/* Encouraging Verse Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📖 An Encouraging Word</Text>
            <Text style={styles.verseReference}>{encouraging_verse.reference}</Text>
            <Text style={styles.verseText}>"{encouraging_verse.text}"</Text>
            <Text style={styles.sectionText}>{encouraging_verse.application}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={goToNextStep}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  characterName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  verseReference: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  verseText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#1e293b',
    lineHeight: 24,
    marginBottom: 12,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
  },
  button: {
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});