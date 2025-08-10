import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '../contexts/AuthContext';
import { OnboardingProvider } from '../contexts/OnboardingContext'; // This will use the placeholder
import { AuthNavigator } from '../components/navigation/AuthNavigator';
import { GlobalSettingsProvider } from '../components/GlobalSettingsContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <OnboardingProvider>
        <GlobalSettingsProvider>
          <AuthNavigator>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AuthNavigator>
          <StatusBar style="auto" />
        </GlobalSettingsProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}