// components/onboarding/OnboardingNavigator.tsx - Narrative onboarding flow
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { NarrativeOnboardingScreen } from './NarrativeOnboardingScreen';

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
    // Single narrative screen handles all steps
    return <NarrativeOnboardingScreen />;
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
    backgroundColor: '#1a1a1a', // Dark gray to match overlay tone
  },
  screenWrapper: {
    flex: 1,
  },
});