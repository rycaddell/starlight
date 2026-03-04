// components/navigation/AuthNavigator.tsx
import React, { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { PhoneAuthScreen } from '../auth/PhoneAuthScreen';
import { OTPVerifyScreen } from '../auth/OTPVerifyScreen';
import { OnboardingNavigator } from '../onboarding/OnboardingNavigator';
import { colors } from '../../theme/designTokens';

type AuthStep = 'phone' | 'otp';

interface AuthNavigatorProps {
  children: React.ReactNode;
}

export function AuthNavigator({ children }: AuthNavigatorProps) {
  const { isAuthenticated, isLoading, sendOTP, verifyOTP } = useAuth();
  const { isOnboardingComplete } = useOnboarding();

  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState(''); // E.164

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.screen }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.text.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    if (authStep === 'phone') {
      return (
        <PhoneAuthScreen
          onPhoneSubmit={async (e164) => {
            const result = await sendOTP(e164);
            if (result.success) {
              setPhoneNumber(e164);
              setAuthStep('otp');
            }
            return result;
          }}
        />
      );
    }

    return (
      <OTPVerifyScreen
        phone={phoneNumber}
        onVerify={async (token) => {
          const result = await verifyOTP(phoneNumber, token);
          if (!result.success) return result;
          // On success, session lands via onAuthStateChange → AuthNavigator re-renders
          setAuthStep('phone'); // reset for next sign-out
          return result;
        }}
        onResend={async () => {
          const result = await sendOTP(phoneNumber);
          return result;
        }}
      />
    );
  }

  if (!isOnboardingComplete) {
    return <OnboardingNavigator />;
  }

  return <>{children}</>;
}
