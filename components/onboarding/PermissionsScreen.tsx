import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { Audio } from 'expo-av';

interface PermissionItemProps {
  title: string;
  description: string;
  icon: string;
  isGranted: boolean;
  onRequest: () => Promise<void>;
  isLoading: boolean;
}

const PermissionItem: React.FC<PermissionItemProps> = ({
  title,
  description,
  icon,
  isGranted,
  onRequest,
  isLoading
}) => (
  <View style={styles.permissionItem}>
    <View style={styles.permissionIcon}>
      <Text style={styles.permissionIconText}>{icon}</Text>
    </View>
    <View style={styles.permissionContent}>
      <Text style={styles.permissionTitle}>{title}</Text>
      <Text style={styles.permissionDescription}>{description}</Text>
    </View>
    <TouchableOpacity
      style={[
        styles.permissionButton,
        isGranted ? styles.permissionButtonGranted : styles.permissionButtonPending
      ]}
      onPress={onRequest}
      disabled={isGranted || isLoading}
    >
      <Text style={[
        styles.permissionButtonText,
        isGranted ? styles.permissionButtonTextGranted : styles.permissionButtonTextPending
      ]}>
        {isLoading ? 'Requesting...' : isGranted ? '✓ Granted' : 'Allow'}
      </Text>
    </TouchableOpacity>
  </View>
);

export const PermissionsScreen: React.FC = () => {
  const { goToNextStep, goToPreviousStep, hasMicrophonePermission, setMicrophonePermission } = useOnboarding();
  const [loadingMicrophone, setLoadingMicrophone] = useState(false);

  useEffect(() => {
    checkExistingPermissions();
  }, []);

  const checkExistingPermissions = async () => {
    try {
      const microphoneStatus = await Audio.getPermissionsAsync();
      const isGranted = microphoneStatus.status === 'granted';
      setMicrophonePermission(isGranted);
    } catch (error) {
      console.error('Error checking existing permissions:', error);
    }
  };

  const requestMicrophonePermission = async () => {
    setLoadingMicrophone(true);
    try {
      const { status } = await Audio.requestPermissionsAsync();
      const isGranted = status === 'granted';
      setMicrophonePermission(isGranted);
      
      if (!isGranted) {
        Alert.alert(
          'Microphone Needed for Voice Journaling',
          'Starlight offers voice journaling for a more natural reflection experience. This permission is required to use voice features.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      Alert.alert('Permission Error', 'Unable to request microphone permission. Please try again.');
    } finally {
      setLoadingMicrophone(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Microphone Permission</Text>
          <Text style={styles.subtitle}>
            To enable voice journaling, Starlight needs access to your microphone
          </Text>
        </View>

        <View style={styles.permissionsContainer}>
          <PermissionItem
            title="Microphone Access"
            description="Record voice journal entries for a more natural reflection experience"
            icon="🎤"
            isGranted={hasMicrophonePermission}
            onRequest={requestMicrophonePermission}
            isLoading={loadingMicrophone}
          />
        </View>

        <View style={styles.explanationSection}>
          <Text style={styles.explanationTitle}>Why microphone access matters</Text>
          <View style={styles.explanationItem}>
            <Text style={styles.explanationIcon}>🗣️</Text>
            <Text style={styles.explanationText}>
              <Text style={styles.explanationBold}>Voice journaling</Text> makes reflection feel more natural and conversational, like talking to a trusted friend
            </Text>
          </View>
          <View style={styles.explanationItem}>
            <Text style={styles.explanationIcon}>✍️</Text>
            <Text style={styles.explanationText}>
              You can always use <Text style={styles.explanationBold}>text journaling</Text> if you prefer - this just adds the voice option
            </Text>
          </View>
        </View>

        {!hasMicrophonePermission && (
          <View style={styles.statusMessage}>
            <Text style={styles.statusText}>
              Please grant microphone permission to continue
            </Text>
          </View>
        )}
        
        {hasMicrophonePermission && (
          <View style={[styles.statusMessage, styles.statusMessageSuccess]}>
            <Text style={[styles.statusText, styles.statusTextSuccess]}>
              ✓ All set! You're ready to continue
            </Text>
          </View>
        )}
      </View>

      <View style={styles.navigation}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={goToPreviousStep}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[
            styles.continueButton,
            !hasMicrophonePermission && styles.continueButtonDisabled
          ]}
          onPress={goToNextStep}
          disabled={!hasMicrophonePermission}
        >
          <Text style={[
            styles.continueButtonText,
            !hasMicrophonePermission && styles.continueButtonTextDisabled
          ]}>
            Continue
          </Text>
        </TouchableOpacity>
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
    paddingTop: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionsContainer: {
    marginBottom: 32,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  permissionIconText: {
    fontSize: 20,
  },
  permissionContent: {
    flex: 1,
    marginRight: 16,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  permissionDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  permissionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  permissionButtonPending: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  permissionButtonGranted: {
    backgroundColor: '#f0f9ff',
    borderColor: '#059669',
  },
  permissionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  permissionButtonTextPending: {
    color: '#ffffff',
  },
  permissionButtonTextGranted: {
    color: '#059669',
  },
  explanationSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  explanationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  explanationIcon: {
    fontSize: 16,
    marginRight: 12,
    marginTop: 2,
  },
  explanationText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    flex: 1,
  },
  explanationBold: {
    fontWeight: '600',
    color: '#334155',
  },
  statusMessage: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  statusMessageSuccess: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  statusText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '500',
  },
  statusTextSuccess: {
    color: '#065f46',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  backButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonTextDisabled: {
    color: '#9ca3af',
  },
});