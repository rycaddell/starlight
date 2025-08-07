import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { WelcomeScreen } from './WelcomeScreen';
import { HowItWorksScreen } from './HowItWorksScreen';
import { PermissionsScreen } from './PermissionsScreen';
import { CurrentStateScreen } from './CurrentStateScreen';
import { OnboardingProgress } from './OnboardingProgress';

export const OnboardingNavigator: React.FC = () => {
  const { currentStep } = useOnboarding();

  const renderCurrentScreen = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeScreen />;
      case 'how-it-works':
        return <HowItWorksScreen />;
      case 'permissions':
        return <PermissionsScreen />;
      case 'current-state':
        return <CurrentStateScreen />;
      default:
        return <WelcomeScreen />;
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingProgress />
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