// components/navigation/AuthNavigator.tsx
import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { CodeEntryScreen } from '../auth/CodeEntryScreen';

interface AuthNavigatorProps {
  children: React.ReactNode; // Your main app (tabs)
}

export function AuthNavigator({ children }: AuthNavigatorProps) {
  const { user, isLoading, signIn } = useAuth();

  // Show loading screen while checking for existing auth
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

  // Show code entry screen if no user is authenticated
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

  // User is authenticated, show main app
  return <>{children}</>;
}