// components/onboarding/RhythmOfLifeScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import { useOnboarding } from '../../contexts/OnboardingContext';

export const RhythmOfLifeScreen: React.FC = () => {
  const { 
    rhythmData, 
    setRhythmData, 
    setNotificationPermission,
    hasNotificationPermission,
    goToNextStep 
  } = useOnboarding();
  
  const [isRequesting, setIsRequesting] = useState(false);

  const activities = ['', 'Church', 'Small Group', 'Quiet Time'];
  const days = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const times = ['', '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', 
                 '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', 
                 '8:00 PM', '9:00 PM', '10:00 PM'];

  const requestNotificationPermission = async () => {
    if (isRequesting) return;
    
    setIsRequesting(true);
    console.log('🔔 Requesting notification permission...');

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('🔔 Current permission status:', existingStatus);
      
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('🔔 New permission status:', finalStatus);
      }
      
      if (finalStatus === 'granted') {
        console.log('✅ Notification permission granted');
        setNotificationPermission(true);
        // Small delay to show success state before advancing
        setTimeout(() => {
          goToNextStep();
        }, 500);
      } else {
        console.log('❌ Notification permission denied');
        Alert.alert(
          'Notifications Required',
          'Oxbow needs notification permissions to remind you about your spiritual rhythms. Please enable notifications in Settings.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('❌ Error requesting notification permission:', error);
      Alert.alert('Error', 'Failed to request notification permission. Please try again.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.emoji}>⏰</Text>
        <Text style={styles.title}>In your rhythm of life</Text>
        <Text style={styles.subtitle}>
          Are there weekly rhythms where you often encounter God? We'll check-in with you to see if you want to store anything from your times.
        </Text>

        {/* Optional Rhythm Inputs */}
        <View style={styles.formSection}>
          <Text style={styles.label}>Activity (optional)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={rhythmData.activity}
              onValueChange={(value) => setRhythmData({ ...rhythmData, activity: value })}
              style={styles.picker}
            >
              {activities.map((activity) => (
                <Picker.Item key={activity} label={activity || 'Select activity'} value={activity} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Day (optional)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={rhythmData.day}
              onValueChange={(value) => setRhythmData({ ...rhythmData, day: value })}
              style={styles.picker}
            >
              {days.map((day) => (
                <Picker.Item key={day} label={day || 'Select day'} value={day} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Time (optional)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={rhythmData.time}
              onValueChange={(value) => setRhythmData({ ...rhythmData, time: value })}
              style={styles.picker}
            >
              {times.map((time) => (
                <Picker.Item key={time} label={time || 'Select time'} value={time} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Notification Permission Required */}
        {!hasNotificationPermission && (
          <TouchableOpacity 
            style={[styles.button, isRequesting && styles.buttonDisabled]}
            onPress={requestNotificationPermission}
            disabled={isRequesting}
          >
            <Text style={styles.buttonText}>
              {isRequesting ? 'Requesting...' : 'Enable Notifications'}
            </Text>
          </TouchableOpacity>
        )}

        {hasNotificationPermission && (
          <TouchableOpacity 
            style={styles.button}
            onPress={goToNextStep}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.helperText}>
          {hasNotificationPermission 
            ? '✅ Notifications enabled' 
            : 'Notifications are required to continue'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emoji: {
    fontSize: 120,
    textAlign: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  formSection: {
    width: '100%',
    marginBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  pickerContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#94a3b8',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#059669',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
  },
});