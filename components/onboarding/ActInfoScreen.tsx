// components/onboarding/ActInfoScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const ActInfoScreen: React.FC = () => {
  const { goToNextStep, completeOnboarding } = useOnboarding();

  const handleComplete = async () => {
    console.log('✅ Completing onboarding from Act screen...');
    await completeOnboarding();
  };

  const handleNotificationRequest = () => {
    // PLACEHOLDER - Will implement notification permission in Step 7
    Alert.alert(
      'Notification Permission',
      'PLACEHOLDER - Will request notification permission here',
      [
        { text: 'Not Now', onPress: handleComplete },
        { text: 'Enable', onPress: handleComplete }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🙏</Text>
        <Text style={styles.title}>Act</Text>
        <Text style={styles.subtitle}>
          PLACEHOLDER - Will build in Step 7
        </Text>
        
        <Text style={styles.body}>
          Last step... Act. Explore how God is inviting you to act in prayer or 
          in your body and whom you should share this with spiritual partners.
        </Text>

        <TouchableOpacity 
          style={styles.button}
          onPress={handleNotificationRequest}
        >
          <Text style={styles.buttonText}>Enable Notifications</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleComplete}
        >
          <Text style={styles.skipButtonText}>Skip for Now</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 120,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  body: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipButtonText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
  },
});