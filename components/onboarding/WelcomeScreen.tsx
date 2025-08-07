import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const WelcomeScreen: React.FC = () => {
  const { user } = useAuth();
  const { goToNextStep } = useOnboarding();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>✨ Starlight</Text>
          <Text style={styles.tagline}>Your spiritual formation journey</Text>
        </View>

        {/* Welcome Message */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            Welcome, {user?.display_name}! 🙏
          </Text>
          <Text style={styles.welcomeMessage}>
            We're so glad you're here. Starlight is designed to help you reflect on your spiritual journey through journaling and AI-powered insights.
          </Text>
          <Text style={styles.welcomeSubtext}>
            Let's take a moment to show you how it works and get everything set up.
          </Text>
        </View>

        {/* Illustration/Visual */}
        <View style={styles.illustrationSection}>
          <View style={styles.illustration}>
            <Text style={styles.illustrationIcon}>📖</Text>
            <Text style={styles.illustrationText}>
              Your journey of spiritual formation starts here
            </Text>
          </View>
        </View>

        {/* Continue Button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={goToNextStep}
          >
            <Text style={styles.continueButtonText}>Let's Get Started</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This will only take a couple minutes
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  welcomeSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#059669',
    textAlign: 'center',
    marginBottom: 24,
  },
  welcomeMessage: {
    fontSize: 18,
    color: '#334155',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 16,
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  illustrationSection: {
    alignItems: 'center',
    marginVertical: 32,
  },
  illustration: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  illustrationIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  illustrationText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonSection: {
    marginTop: 32,
  },
  continueButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});