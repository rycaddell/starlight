import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { HowItWorksScreen } from './HowItWorksScreen';
import { MicrophonePermissionScreen } from './MicrophonePermissionScreen';
import { NotificationPermissionScreen } from './NotificationPermissionScreen';
import { PermissionsScreen } from './PermissionsScreen';  // Back to original name
import { CurrentStateScreen } from './CurrentStateScreen';

export const OnboardingNavigator: React.FC = () => {
  const { currentStep } = useOnboarding();

  const renderCurrentScreen = () => {
    switch (currentStep) {
      case 'how-it-works':
        return <HowItWorksScreen />;
      case 'microphone-permission':
        return <MicrophonePermissionScreen />;
      case 'notification-permission':
        return <NotificationPermissionScreen />;
      case 'current-state':
        return <CurrentStateScreen />;
      default:
        return <HowItWorksScreen />;
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