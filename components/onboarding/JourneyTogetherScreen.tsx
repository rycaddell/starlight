// components/onboarding/JourneyTogetherScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ImageBackground } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const JourneyTogetherScreen: React.FC = () => {
  const { completeOnboarding } = useOnboarding();

  const handleFinish = async () => {
    console.log('✅ Finishing onboarding from Journey Together screen...');
    await completeOnboarding();
  };

  return (
    <ImageBackground
      source={require('../../assets/share.png')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Header at top - NO EMOJI */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Spiritual Partnership</Text>
            <Text style={styles.subtitle}>
              Grow together. Connect with friends and share Mirrors on Oxbow.
            </Text>
          </View>

          <View style={styles.spacer} />

          <TouchableOpacity 
            style={styles.button}
            onPress={handleFinish}
          >
            <Text style={styles.buttonText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 48,
  },
  headerSection: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  spacer: {
    flex: 1,
  },
  button: {
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});