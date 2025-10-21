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
      // Initialize audio mode first
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      
      const audioStatus = await Audio.getPermissionsAsync();
      const granted = audioStatus.granted === true || audioStatus.status === 'granted';
      
      if (granted) {
        setMicrophonePermission(true);
      }
    } catch (error) {
      console.error('Error checking microphone permission:', error);
    }
  };

  const requestMicrophonePermission = async () => {
    console.log('🎤 Button pressed - starting permission request');
    setIsRequesting(true);
    
    try {
      console.log('🎤 About to set audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      console.log('✅ Audio mode set successfully');
      
      console.log('🎤 Getting current permissions...');
      const currentStatus = await Audio.getPermissionsAsync();
      console.log('Current status:', currentStatus);
      
      if (currentStatus.granted) {
        console.log('✅ Permission already granted');
        setMicrophonePermission(true);
        return;
      }
      
      console.log('🎤 About to request permission...');
      const permission = await Audio.requestPermissionsAsync();
      console.log('✅ Permission request completed:', permission);
      
      // Check the result properly
      const granted = permission.granted === true || permission.status === 'granted';
      setMicrophonePermission(granted);
      
      if (!granted) {
        // Show user-friendly message for denied permission
        Alert.alert(
          'Microphone Access',
          'No problem! You can use text journaling for now. We\'ll ask again if you want to try voice journaling later.',
          [{ 
            text: 'Continue', 
            onPress: () => {
              setMicrophonePermission(false);
              // Don't block progression - let them continue
            }
          }]
        );
      }
      
    } catch (error) {
      console.error('❌ Error in permission flow:', error);
      
      // Show user-visible error
      Alert.alert(
        'Permission Setup Failed', 
        `Microphone setup encountered an issue: ${error.message || 'Unknown error'}. You can continue with text-only journaling.`,
        [
          { 
            text: 'Continue Anyway', 
            onPress: () => {
              setMicrophonePermission(false);
              // Force progression even on error
              goToNextStep();
            }
          }
        ]
      );
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
              <Text style={styles.title}>The habit of noticing</Text>
              <Text style={styles.subtitle}>
              In Oxbow, you’ll practice noticing what God is working in you— through quick prompts or deeper voice reflections.
              </Text>
            </View>
            
            {/* Permission action at bottom */}
            <View style={styles.bottomSection}>
              {hasMicrophonePermission ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successText}>Microphone enabled!</Text>
                  <Text style={styles.successSubtext}>
                    You&apos;re ready for voice journaling
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',  // WHITE for readability
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',  // Shadow for contrast
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',  // WHITE for readability
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 48,
    paddingHorizontal: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',  // Shadow for contrast
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
