// components/onboarding/OnboardingNavigator.tsx - Narrative onboarding flow
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { colors } from '../../theme/designTokens';
import { NarrativeOnboardingScreen } from './NarrativeOnboardingScreen';

export const OnboardingNavigator: React.FC = () => {
  const { user } = useAuth();
  const { currentStep } = useOnboarding();

  // Hard check: if user has completed onboarding in database, don't render anything.
  // Use !! to handle both null (onboarding incomplete) and undefined (user row not yet created).
  const isOnboardingComplete = !!user?.onboarding_completed_at;

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
    backgroundColor: colors.text.black,
  },
});
