// components/onboarding/OnboardingNavigator.tsx - Simplified flow
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { MicrophonePermissionScreen } from './MicrophonePermissionScreen';
import { JournalEntryScreen } from './JournalEntryScreen';
import { LoadingReflectionScreen } from './LoadingReflectionScreen';
import { MirrorScreen } from './MirrorScreen';
import { JourneyTogetherScreen } from './JourneyTogetherScreen';

export const OnboardingNavigator: React.FC = () => {
  const { user } = useAuth();
  const { currentStep } = useOnboarding();
  
  // Hard check: if user has completed onboarding in database, don't render anything
  const isOnboardingComplete = user?.onboarding_completed_at !== null;
  
  if (isOnboardingComplete) {
    console.log('✅ Onboarding complete, showing main app');
    return null;
  }

  console.log('📍 Current onboarding step:', currentStep);

  const renderCurrentScreen = () => {
    switch (currentStep) {
      case 'microphone-permission':
        return <MicrophonePermissionScreen />;
      case 'journal-entry':
        return <JournalEntryScreen />;
      case 'loading-reflection':
        return <LoadingReflectionScreen />;
      case 'mirror':
        return <MirrorScreen />;
      case 'journey-together':
        return <JourneyTogetherScreen />;
      default:
        // Default to microphone permission if unknown step
        console.warn('⚠️ Unknown onboarding step:', currentStep);
        return <MicrophonePermissionScreen />;
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentScreen()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});