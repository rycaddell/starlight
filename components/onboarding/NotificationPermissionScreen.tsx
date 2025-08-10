import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const NotificationPermissionScreen: React.FC = () => {
  const {
    hasNotificationPermission,
    setNotificationPermission,
    goToNextStep,
    goToPreviousStep,
  } = useOnboarding();

  const [isRequesting, setIsRequesting] = useState(false);

  const requestNotificationPermission = async () => {
    setIsRequesting(true);
    
    // Simulate permission request in Expo Go
    Alert.alert(
      'Enable Notifications?',
      'Gentle reminders help you maintain a consistent journaling practice.',
      [
        {
          text: 'Not Now',
          onPress: () => {
            setNotificationPermission(false);
            setIsRequesting(false);
          }
        },
        {
          text: 'Enable',
          onPress: () => {
            setNotificationPermission(true);
            setIsRequesting(false);
          }
        }
      ]
    );
  };

  // Auto-advance when permission is granted
  React.useEffect(() => {
    if (hasNotificationPermission) {
      const timer = setTimeout(() => {
        goToNextStep();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasNotificationPermission, goToNextStep]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={goToPreviousStep}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustration}>📱✨</Text>
        </View>

        {/* Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Get informed about new updates</Text>
          <Text style={styles.subtitle}>
            Gentle reminders help you maintain a consistent spiritual journaling practice, 
            keeping you connected to your growth journey.
          </Text>
        </View>

        {/* Action */}
        <View style={styles.actionContainer}>
          {hasNotificationPermission ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successText}>Notifications enabled!</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.enableButton}
              onPress={requestNotificationPermission}
              disabled={isRequesting}
            >
              <Text style={styles.enableButtonText}>
                {isRequesting ? 'Requesting...' : 'Enable notifications'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

// Same styles as before...
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 0, 0, 0.1)', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start' },
  backButtonText: { fontSize: 20, color: '#64748b' },
  illustrationContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  illustration: { fontSize: 120, textAlign: 'center' },
  textContainer: { paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b', textAlign: 'center', marginBottom: 16, lineHeight: 34 },
  subtitle: { fontSize: 16, color: '#64748b', textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
  actionContainer: { paddingBottom: 40 },
  enableButton: { backgroundColor: '#059669', borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32, marginHorizontal: 20 },
  enableButtonText: { color: '#ffffff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
  successContainer: { alignItems: 'center', padding: 20 },
  successIcon: { fontSize: 48, marginBottom: 8 },
  successText: { fontSize: 18, fontWeight: '600', color: '#059669' },
});