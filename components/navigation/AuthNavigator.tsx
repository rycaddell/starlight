// components/navigation/AuthNavigator.tsx
import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { CodeEntryScreen } from '../auth/CodeEntryScreen';
import { OnboardingNavigator } from '../onboarding/OnboardingNavigator';
import { colors, typography } from '../../theme/designTokens';

interface AuthNavigatorProps {
  children: React.ReactNode;
}

export function AuthNavigator({ children }: AuthNavigatorProps) {
  const { user, isLoading, signIn } = useAuth();
  const { isOnboardingComplete } = useOnboarding();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.screen }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.text.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    // Create a safe wrapper function
    const handleCodeSubmit = async (code: string) => {
      const result = await signIn(code);
      return result;
    };

    return (
      <CodeEntryScreen 
        onCodeSubmit={handleCodeSubmit}
        loading={isLoading}
      />
    );
  }

  if (!isOnboardingComplete) {
    return <OnboardingNavigator />;
  }

  return <>{children}</>;
}