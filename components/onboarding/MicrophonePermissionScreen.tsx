import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Audio } from 'expo-av';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const MicrophonePermissionScreen: React.FC = () => {
  const {
    hasMicrophonePermission,
    setMicrophonePermission,
    goToNextStep,
    goToPreviousStep,
  } = useOnboarding();

  const [isRequesting, setIsRequesting] = useState(false);

  // Check permission on mount
  useEffect(() => {
    checkExistingPermission();
  }, []);

  // Auto-advance when permission is granted
  useEffect(() => {
    if (hasMicrophonePermission) {
      const timer = setTimeout(() => {
        goToNextStep();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [hasMicrophonePermission, goToNextStep]);

  const checkExistingPermission = async () => {
    try {
      const audioStatus = await Audio.getPermissionsAsync();
      if (audioStatus.status === 'granted') {
        setMicrophonePermission(true);
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
    }
  };

  const requestMicrophonePermission = async () => {
    setIsRequesting(true);
    try {
      const permission = await Audio.requestPermissionsAsync();
      const granted = permission.status === 'granted';
      setMicrophonePermission(granted);
      
      if (!granted) {
        Alert.alert(
          'Microphone Access Needed',
          'Voice journaling requires microphone access. You can enable this later in Settings if you change your mind.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      Alert.alert('Error', 'Failed to request microphone permission.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backButton} onPress={goToPreviousStep}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Text style={styles.illustration}>🚶‍♂️🎤</Text>
        </View>

        {/* Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Go for a walk & talk with Oxbow</Text>
          <Text style={styles.subtitle}>
            Voice journaling lets you capture thoughts naturally while you're on the move, 
            making it easier to process your spiritual journey.
          </Text>
        </View>

        {/* Action */}
        <View style={styles.actionContainer}>
          {hasMicrophonePermission ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✅</Text>
              <Text style={styles.successText}>Microphone enabled!</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.enableButton}
              onPress={requestMicrophonePermission}
              disabled={isRequesting}
            >
              <Text style={styles.enableButtonText}>
                {isRequesting ? 'Requesting...' : 'Enable microphone'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 20,
    color: '#64748b',
  },
  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -50,
  },
  illustration: {
    fontSize: 120,
    textAlign: 'center',
  },
  textContainer: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  actionContainer: {
    paddingBottom: 40,
  },
  enableButton: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginHorizontal: 20,
  },
  enableButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  successContainer: {
    alignItems: 'center',
    padding: 20,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#059669',
  },
});