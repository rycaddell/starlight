import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import { Audio } from 'expo-av';
import { useOnboarding } from '../../contexts/OnboardingContext';

const { width, height } = Dimensions.get('window');

export const MicrophonePermissionScreen: React.FC = () => {
  const {
    hasMicrophonePermission,
    setMicrophonePermission,
    goToNextStep,
  } = useOnboarding();

  const [isRequesting, setIsRequesting] = useState(false);
  const videoRef = useRef(null);

  // Don't auto-check existing permissions during onboarding
  // We want new users to explicitly grant permissions through the UI
  useEffect(() => {
    console.log('🎤 MicrophonePermissionScreen mounted for onboarding flow');
    console.log('🎤 Current permission state:', hasMicrophonePermission);
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
    <View style={styles.container}>
      {/* Background Video */}
      <Video
        ref={videoRef}
        source={require('../../assets/microphonePermissions.mp4')} // Update this path to your video
        style={styles.backgroundVideo}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay
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
              <Text style={styles.title}>Walk & Talk</Text>
              <Text style={styles.subtitle}>
                Spoken journals unlock different and unstructured thinking.
              </Text>
            </View>
            
            {/* Permission action at bottom */}
            <View style={styles.bottomSection}>
              {hasMicrophonePermission ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>Microphone enabled!</Text>
                  <Text style={styles.successSubtext}>
                    You're ready for voice journaling
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.enableButton,
                    isRequesting && styles.enableButtonDisabled
                  ]}
                  onPress={requestMicrophonePermission}
                  disabled={isRequesting}
                >
                  <Text style={styles.enableButtonText}>
                    {isRequesting ? 'Requesting access...' : 'Enable microphone'}
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
  backgroundVideo: {
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
    fontSize: 48,
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