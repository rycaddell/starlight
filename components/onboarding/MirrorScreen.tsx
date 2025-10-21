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
        {/* Header Section - Similar to other onboarding screens */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>Mirror</Text>
          <Text style={styles.subtitle}>
          Use Mirrors to reveal patterns and insights across your journals.
          </Text>
        </View>
        
        {/* Mirror Card - Physical Mirror Aesthetic */}
        <View style={styles.mirrorCard}>
          {/* Subtle highlight accent - like light catching surface */}
          <View style={styles.mirrorHighlight} />
          
          <View style={styles.cardContent}>
            {/* Biblical Profile Section */}
            <View style={styles.section}>
              <View style={styles.iconTitleRow}>
                <View style={styles.icon}>
                  <Text style={styles.iconText}>✨</Text>
                </View>
                <Text style={styles.sectionTitle}>Biblical Mirror</Text>
              </View>
              <Text style={styles.characterName}>{biblical_profile.character}</Text>
              <Text style={styles.sectionText}>{biblical_profile.connection}</Text>
            </View>

            {/* Encouraging Verse Section */}
            <View style={styles.section}>
              <View style={styles.iconTitleRow}>
                <View style={styles.icon}>
                  <Text style={styles.iconText}>📖</Text>
                </View>
                <Text style={styles.sectionTitle}>An Encouraging Word</Text>
              </View>
              <Text style={styles.verseReference}>{encouraging_verse.reference}</Text>
              <Text style={styles.verseText}>"{encouraging_verse.text}"</Text>
              <Text style={styles.sectionText}>{encouraging_verse.application}</Text>
            </View>
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
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
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
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  mirrorCard: {
    position: 'relative',
    backgroundColor: '#FDFCFA', // Warm neutral white base
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C6A774', // Warm wood tone
    padding: 24,
    width: '100%',
    marginBottom: 32,
    // Soft shadows for glass effect
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  mirrorHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Subtle blue tint overlay
    backgroundColor: 'rgba(160, 190, 220, 0.12)',
    // Vertical gradient highlight like light catching surface
    opacity: 0.6,
    pointerEvents: 'none',
  },
  cardContent: {
    position: 'relative',
    zIndex: 1,
  },
  section: {
    marginBottom: 28,
  },
  iconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: 'rgba(250, 204, 21, 0.15)', // Soft gold background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconText: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e', // Warm brown/gold tone
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    borderLeftColor: '#C6A774', // Warm wood tone accent
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