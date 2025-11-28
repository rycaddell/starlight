// app/friend-invite/[token].tsx
// Screen for accepting friend invites via deep link

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { acceptInvite } from '@/lib/supabase/friends';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function AcceptInviteScreen() {
  const { token, inviter, name } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);

  // Decode name from URL
  const inviterName = typeof name === 'string' ? decodeURIComponent(name) : 'A friend';

  useEffect(() => {
    // Check if user is logged in
    if (!user?.id) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to accept this invite',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/'),
          },
        ]
      );
    }
  }, [user, router]);

  const handleAccept = async () => {
    if (!user?.id || typeof token !== 'string') {
      return;
    }

    setAccepting(true);

    try {
      const result = await acceptInvite(token, user.id);

      if (!result.success) {
        Alert.alert('Unable to Accept', result.error || 'Failed to accept invite');
        setAccepting(false);
        return;
      }

      // Success!
      Alert.alert(
        'Success!',
        `You're now friends with ${result.inviterName || inviterName}`,
        [
          {
            text: 'View Friends',
            onPress: () => router.replace('/(tabs)/friends'),
          },
        ]
      );
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setAccepting(false);
    }
  };

  const handleDecline = () => {
    Alert.alert(
      'Decline Invite?',
      'Are you sure you want to decline this invite?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)/friends'),
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Inviter Info */}
        <View style={styles.inviterSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {inviterName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.inviterName}>{inviterName}</Text>
          <Text style={styles.invitedText}>wants to be friends in Oxbow</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.acceptButton, accepting && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={accepting}
          >
            {accepting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.acceptButtonText}>Accept</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineButton}
            onPress={handleDecline}
            disabled={accepting}
          >
            <Text style={styles.declineButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>

        {/* Expiry Note */}
        <Text style={styles.expiryNote}>
          Link expires in 72 hours
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  inviterSection: {
    alignItems: 'center',
    marginBottom: 64,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  inviterName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  invitedText: {
    fontSize: 16,
    color: '#6b7280',
  },
  actions: {
    gap: 12,
    marginBottom: 16,
  },
  acceptButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  declineButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  declineButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  expiryNote: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
