import '../lib/silenceLogsInProduction';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Sentry from '@sentry/react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';
import { OnboardingProvider } from '../contexts/OnboardingContext'; // This will use the placeholder
import { UnreadSharesProvider } from '../contexts/UnreadSharesContext';
import { FriendBadgeProvider } from '../contexts/FriendBadgeContext';
import { AuthNavigator } from '../components/navigation/AuthNavigator';
import { GlobalSettingsProvider } from '../components/GlobalSettingsContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

// Initialize Sentry
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  debug: __DEV__, // Enable debug in development
  environment: __DEV__ ? 'development' : 'production',

  // Session tracking
  enableAutoSessionTracking: true,
  sessionTrackingIntervalMillis: 30000,

  // Performance monitoring (100% in dev, 20% in production)
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,

  // Attach stack trace to errors
  attachStacktrace: true,

  // Before sending - add custom context
  beforeSend(event, hint) {
    // Log in development
    if (__DEV__) {
      console.log('📊 [Sentry] Capturing event:', event.event_id);
      console.log('📊 [Sentry] Error:', hint.originalException);
    }

    // Add custom tags
    if (event.tags) {
      event.tags.app_version = '1.0.0';
    }

    return event;
  },

  // Breadcrumbs
  maxBreadcrumbs: 50,
  beforeBreadcrumb(breadcrumb) {
    // Filter out noisy breadcrumbs in production
    if (!__DEV__ && breadcrumb.category === 'console') {
      return null;
    }
    return breadcrumb;
  },
});

function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    'Satoshi Variable': require('../assets/fonts/Satoshi-Variable.ttf'),
    'Satoshi Variable Italic': require('../assets/fonts/Satoshi-VariableItalic.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <UnreadSharesProvider>
          <FriendBadgeProvider>
            <OnboardingProvider>
              <GlobalSettingsProvider>
                <AuthNavigator>
                  <Stack>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                      name="friend-invite/[token]"
                      options={{
                        headerShown: true,
                        title: 'Friend Invite',
                        presentation: 'modal',
                      }}
                    />
                    <Stack.Screen name="+not-found" />
                  </Stack>
                </AuthNavigator>
                <StatusBar style="auto" />
              </GlobalSettingsProvider>
            </OnboardingProvider>
          </FriendBadgeProvider>
        </UnreadSharesProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

// Wrap with Sentry for error tracking
export default Sentry.wrap(RootLayout);