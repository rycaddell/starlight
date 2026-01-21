import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from '@/lib/supabase/client';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications(userId: string | null) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Register for push notifications
  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus as 'granted' | 'denied' | 'undetermined');

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '5bd0cede-3ebf-4efe-8b38-706e792e5b20', // From app.config.js
      });

      const token = tokenData.data;
      console.log('📱 Expo Push Token:', token);

      // Configure Android channel
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366f1',
        });
      }

      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  };

  // Save push token to database
  const savePushTokenToDatabase = async (token: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ push_token: token })
        .eq('id', userId);

      if (error) {
        console.error('Error saving push token to database:', error);
        return false;
      }

      console.log('✅ Push token saved to database');
      return true;
    } catch (error) {
      console.error('Error saving push token:', error);
      return false;
    }
  };

  // Request permission and register
  const requestPermissionAndRegister = async () => {
    if (!userId) {
      console.log('No user ID provided, skipping push notification registration');
      return null;
    }

    const token = await registerForPushNotificationsAsync();
    if (token) {
      setExpoPushToken(token);
      await savePushTokenToDatabase(token, userId);
    }
    return token;
  };

  // Check current permission status
  const checkPermissionStatus = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setPermissionStatus(status as 'granted' | 'denied' | 'undetermined');
    return status;
  };

  // Set up notification listeners
  useEffect(() => {
    // Check initial permission status
    checkPermissionStatus();

    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📬 Notification received:', notification);
      setNotification(notification);
    });

    // Listener for user tapping on notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('👆 Notification tapped:', response);
      // Handle navigation based on notification data
      const data = response.notification.request.content.data;

      // TODO: Add navigation logic based on notification type
      // e.g., if data.type === 'mirror_share', navigate to Friends tab
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Auto-register if user is logged in and has granted permission
  useEffect(() => {
    if (userId && permissionStatus === 'granted' && !expoPushToken) {
      requestPermissionAndRegister();
    }
  }, [userId, permissionStatus]);

  return {
    expoPushToken,
    notification,
    permissionStatus,
    requestPermissionAndRegister,
    checkPermissionStatus,
  };
}
