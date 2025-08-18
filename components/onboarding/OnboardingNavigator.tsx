// components/onboarding/OnboardingNavigator.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { MicrophonePermissionScreen } from './MicrophonePermissionScreen';
import { NotificationPermissionScreen } from './NotificationPermissionScreen';
import { ShareScreen } from './ShareScreen';

export const OnboardingNavigator: React.FC = () => {
  const { user } = useAuth();
  const { currentStep } = useOnboarding();
  
  // Hard check: if user has completed onboarding in database, don't render anything
  const isOnboardingComplete = user?.onboarding_completed_at !== null;
  
  if (isOnboardingComplete) {
    return null;
  }

  const renderCurrentScreen = () => {
    switch (currentStep) {
      case 'microphone-permission':
        return <MicrophonePermissionScreen />;
      case 'notification-permission':
        return <NotificationPermissionScreen />;
      case 'share':
        return <ShareScreen />;
      default:
        // Default to microphone permission if unknown step
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