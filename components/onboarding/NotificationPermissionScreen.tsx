import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '../../contexts/OnboardingContext';
import * as Notifications from 'expo-notifications';

const { width, height } = Dimensions.get('window');

export const NotificationPermissionScreen: React.FC = () => {
  const {
    hasNotificationPermission,
    setNotificationPermission,
    goToNextStep,
  } = useOnboarding();

  const [isRequesting, setIsRequesting] = useState(false);
  const [imageLoadTime, setImageLoadTime] = useState<number | null>(null);

  const requestNotificationPermission = async () => {
    setIsRequesting(true);
    
    try {
      console.log('🔔 Starting notification permission request...');
      
      // Get current permission status
      const currentStatus = await Notifications.getPermissionsAsync();
      console.log('Current notification status:', currentStatus);
      
      if (currentStatus.granted) {
        console.log('✅ Notification permission already granted');
        setNotificationPermission(true);
        setIsRequesting(false);
        return;
      }
      
      // Request permission
      console.log('🔔 Requesting notification permission...');
      const permission = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: false,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: false,
          allowProvisional: false,
          // allowAnnouncements: false, // Removed deprecated property
        },
      });
      
      console.log('Notification permission result:', permission);
      
      const granted = permission.granted;
      setNotificationPermission(granted);
      
      if (!granted) {
        // Show user-friendly message for denied permission
        Alert.alert(
          'Notifications',
          'No problem! You can enable notifications anytime when you want to receive updates and reminders.',
          [{ 
            text: 'Continue', 
            onPress: () => {
              setNotificationPermission(false);
              // Don't block progression - let them continue
            }
          }]
        );
      }
      
    } catch (error) {
      console.error('❌ Notification permission error:', error);
      
      // Show user-visible error with specific details
      Alert.alert(
        'Notification Setup Failed', 
        `Notification setup encountered an issue: ${error.message || 'Unknown error'}. You can continue and enable notifications later in Settings.`,
        [
          { 
            text: 'Continue Anyway', 
            onPress: () => {
              setNotificationPermission(false);
              // Continue to next step even on error
            }
          }
        ]
      );
    } finally {
      setIsRequesting(false);
    }
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
    <View style={styles.container}>
      {/* Background Image - THIS IS WHERE YOU CHANGE THE IMAGE */}
      <Image
        source={require('../../assets/reflection.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
        defaultSource={require('../../assets/reflection.png')} // Fallback while loading
        fadeDuration={0} // Remove fade animation for faster perception
        onLoadStart={() => {
          console.log('🖼️ Reflection image started loading...');
          setImageLoadTime(Date.now());
        }}
        onLoad={() => {
          if (imageLoadTime) {
            const loadTime = Date.now() - imageLoadTime;
            console.log(`✅ Reflection image loaded in ${loadTime}ms`);
          }
        }}
        onError={(error) => {
          console.error('❌ Reflection image failed to load:', error);
        }}
      />
      
      {/* Overlay */}
      <View style={styles.overlay} />
      
      {/* Content with Keyboard Avoiding */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <SafeAreaView style={styles.contentContainer}>
          <View style={styles.content}>
            {/* Title at top */}
            <View style={styles.headerSection}>
              <Text style={styles.title}>Reflect</Text>
              <Text style={styles.subtitle}>
                After 10 entries, we&apos;ll make you a Mirror to help you notice trends and insights from your journals.
              </Text>
            </View>
            
            {/* Permission action at bottom */}
            <View style={styles.bottomSection}>
              {hasNotificationPermission ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>Notifications enabled!</Text>
                  <Text style={styles.successSubtext}>
                    You&apos;ll be the first to know about updates
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.enableButton,
                    isRequesting && styles.enableButtonDisabled
                  ]}
                  onPress={requestNotificationPermission}
                  disabled={isRequesting}
                >
                  <Text style={styles.enableButtonText}>
                    {isRequesting ? 'Requesting access...' : 'Enable notifications'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: width,
    height: height,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent overlay for better text readability
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 36,  // H2 size to match the microphone screen
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.9,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  bottomSection: {
    justifyContent: 'flex-end',
  },
  enableButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  enableButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  successContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  successText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    opacity: 0.9,
  },
});
