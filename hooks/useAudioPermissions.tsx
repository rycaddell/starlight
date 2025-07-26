/**
 * useAudioPermissions Hook
 * 
 * Manages microphone permissions for voice recording functionality.
 * Handles requesting permissions, checking current permission state,
 * and providing user-friendly error messaging for denied permissions.
 * 
 * Returns:
 * - hasAudioPermission: Current permission state (null = unknown, true = granted, false = denied)
 * - requestAudioPermission: Function to request microphone access
 * - checkPermissionAndRequest: Smart function that checks current state and requests if needed
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';

export const useAudioPermissions = () => {
  const [hasAudioPermission, setHasAudioPermission] = useState<boolean | null>(null);

  const requestAudioPermission = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      setHasAudioPermission(permission.granted);
      
      if (!permission.granted) {
        Alert.alert(
          'Microphone Permission Required',
          'Please enable microphone access in your device settings to record voice journals.',
          [{ text: 'OK' }]
        );
      }
      
      return permission.granted;
    } catch (error) {
      console.log('Error requesting audio permission:', error);
      Alert.alert('Permission Error', 'Unable to request microphone permission.');
      return false;
    }
  };

  const checkPermissionAndRequest = async () => {
    // Check/request permissions
    let permissionGranted = hasAudioPermission;
    
    if (permissionGranted === null) {
      // First time - request permission
      permissionGranted = await requestAudioPermission();
    } else if (permissionGranted === false) {
      // Previously denied - show alert and try again
      Alert.alert(
        'Microphone Access Needed',
        'Voice recording requires microphone access. Please enable it in your device settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Try Again', 
            onPress: async () => {
              const granted = await requestAudioPermission();
              return granted;
            }
          }
        ]
      );
      return false;
    }

    return permissionGranted;
  };

  return {
    hasAudioPermission,
    requestAudioPermission,
    checkPermissionAndRequest
  };
};