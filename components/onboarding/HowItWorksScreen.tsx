import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';

interface StepProps {
  number: number;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const Step: React.FC<StepProps> = ({ number, title, description, icon, color }) => (
  <View style={styles.step}>
    <View style={[styles.stepIcon, { backgroundColor: color }]}>
      <Text style={styles.stepIconText}>{icon}</Text>
    </View>
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepNumber, { backgroundColor: color }]}>
          <Text style={styles.stepNumberText}>{number}</Text>
        </View>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
      <Text style={styles.stepDescription}>{description}</Text>
    </View>
  </View>
);

export const HowItWorksScreen: React.FC = () => {
  const { goToNextStep, goToPreviousStep } = useOnboarding();

  const steps = [
    {
      number: 1,
      title: 'Journal Your Thoughts',
      description: 'Write or voice-record your spiritual reflections, struggles, and insights. No pressure - just authentic thoughts about your faith journey.',
      icon: '✍️',
      color: '#3b82f6'
    },
    {
      number: 2,
      title: 'Build Your Collection',
      description: 'After 15 journal entries, you\'ll unlock your first "Mirror" - a personalized spiritual reflection generated just for you.',
      icon: '📚',
      color: '#10b981'
    },
    {
      number: 3,
      title: 'Discover Your Mirror',
      description: 'Your Mirror reveals patterns in your spiritual journey, biblical connections, and gentle suggestions for continued growth.',
      icon: '🪩',
      color: '#8b5cf6'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>How Starlight Works</Text>
          <Text style={styles.subtitle}>
            Three simple steps to deepen your spiritual formation
          </Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <Step key={index} {...step} />
          ))}
        </View>

        {/* Additional Info */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🔒 Private & Secure</Text>
            <Text style={styles.infoText}>
              Your journal entries are private to you. We use AI to generate insights, but your personal reflections stay personal.
            </Text>
          </View>
          
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>🎯 Personalized Journey</Text>
            <Text style={styles.infoText}>
              Every Mirror is unique to your spiritual journey. The more you journal, the more personalized your insights become.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={goToPreviousStep}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={goToNextStep}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  stepsContainer: {
    marginBottom: 32,
  },
  step: {
    flexDirection: 'row',
    marginBottom: 32,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  stepIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepIconText: {
    fontSize: 24,
  },
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  stepDescription: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  backButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});