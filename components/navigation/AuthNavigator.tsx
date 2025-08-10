import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { CodeEntryScreen } from '../auth/CodeEntryScreen';
import { OnboardingNavigator } from '../onboarding/OnboardingNavigator';

interface AuthNavigatorProps {
  children: React.ReactNode;
}

export function AuthNavigator({ children }: AuthNavigatorProps) {
  const { user, isLoading, signIn } = useAuth();
  const { isOnboardingComplete } = useOnboarding();

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: 16 
        }}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={{ 
            fontSize: 16, 
            color: '#64748b',
            textAlign: 'center' 
          }}>
            ✨ Loading Starlight...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <CodeEntryScreen 
        onCodeSubmit={async (code) => {
          console.log('🔑 Code submitted:', code);
          const result = await signIn(code);
          console.log('🔍 Sign in result:', result);
          return result;
        }}
        loading={isLoading}
      />
    );
  }

  if (!isOnboardingComplete) {
    return <OnboardingNavigator />;
  }

  return <>{children}</>;
}