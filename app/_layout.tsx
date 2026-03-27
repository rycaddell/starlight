import '../lib/silenceLogsInProduction';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Sentry from '@sentry/react-native';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { OnboardingProvider } from '../contexts/OnboardingContext'; // This will use the placeholder
import { UnreadSharesProvider } from '../contexts/UnreadSharesContext';
import { FriendBadgeProvider } from '../contexts/FriendBadgeContext';
import { AuthNavigator } from '../components/navigation/AuthNavigator';
import { GlobalSettingsProvider } from '../components/GlobalSettingsContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { updateLastOpenedAt, saveRhythm } from '../lib/supabase/notifications';
import { initAnalytics, track, Events } from '../lib/analytics';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { supabase } from '../lib/supabase/client';

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

initAnalytics();

// Tracks app focus events to update last_opened_at — must sit inside AuthProvider
function AppFocusTracker() {
  const { user } = useAuth();

  // Cold launch
  useEffect(() => {
    if (user?.id) {
      track(Events.APP_OPENED);
    }
  }, [user?.id]);

  // Foreground resume
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && user?.id) {
        updateLastOpenedAt(user.id);
        track(Events.APP_OPENED);
      }
    });
    return () => subscription.remove();
  }, [user?.id]);

  return null;
}

// Reconciles push notification permission state after reinstall.
// If DB says enabled but iOS wiped the permission, re-prompt (undetermined) or flip DB flag (denied).
function PushPermissionReconciler() {
  const { user } = useAuth();
  const { requestPermissionAndRegister } = usePushNotifications(user?.id ?? null);

  useEffect(() => {
    if (!user?.id || !user.notifications_enabled) return;

    async function reconcile() {
      const { status } = await Notifications.getPermissionsAsync();

      if (status === 'undetermined') {
        // iOS wiped the permission on reinstall — re-prompt and re-register token
        await requestPermissionAndRegister();
      } else if (status === 'denied') {
        // User explicitly denied after reinstall — flip DB flag and show pitch card again
        await saveRhythm(user!.id, user!.spiritual_rhythm ?? [], false);
        await supabase?.from('users').update({ notif_card_dismissed: false }).eq('id', user!.id);
      }
    }

    reconcile();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// Handles LinkRunner deferred deep links — must sit inside AuthProvider to access user
function LinkRunnerHandler() {
  const { user } = useAuth();
  const router = useRouter();
  const pendingInviteRef = useRef<{ token: string; inviterId: string; inviterName: string } | null>(null);

  // On mount: init SDK then check for a deferred deep link
  useEffect(() => {
    async function checkDeferredLink() {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const linkrunner = require('rn-linkrunner').default;
        await linkrunner.init(
          process.env.EXPO_PUBLIC_LINKRUNNER_PROJECT_TOKEN ?? '',
          undefined, // secret key — not required
          undefined, // key ID — not required
          true,      // disable IDFA collection
          __DEV__,   // debug mode in dev only
        );

        const data = await linkrunner.getAttributionData();
        if (!data?.deeplink) return;

        // deeplink = "oxbow://friend-invite/TOKEN?inviter=ID&name=NAME"
        const url = new URL(data.deeplink);
        const token = url.pathname.split('/').pop();
        const inviterId = url.searchParams.get('inviter') ?? '';
        const inviterName = url.searchParams.get('name') ?? '';

        if (!token) return;

        if (user?.id) {
          router.push(`/friend-invite/${token}?inviter=${inviterId}&name=${encodeURIComponent(inviterName)}`);
        } else {
          // Deferred case: user still in onboarding — store for after auth
          pendingInviteRef.current = { token, inviterId, inviterName };
        }
      } catch (e) {
        // Non-fatal — deferred link just won't fire
      }
    }

    checkDeferredLink();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Once user signs in, process any stored pending invite
  useEffect(() => {
    if (user?.id && pendingInviteRef.current) {
      const { token, inviterId, inviterName } = pendingInviteRef.current;
      pendingInviteRef.current = null;
      router.push(`/friend-invite/${token}?inviter=${inviterId}&name=${encodeURIComponent(inviterName)}`);
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

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
                <AppFocusTracker />
                <PushPermissionReconciler />
                <LinkRunnerHandler />
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