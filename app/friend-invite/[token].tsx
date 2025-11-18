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
        'Linked!',
        `You're now linked with ${result.inviterName || inviterName}`,
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <IconSymbol name="person.2.fill" size={64} color="#6366f1" />
          </View>
          <Text style={styles.title}>Friend Invite</Text>
        </View>

        {/* Inviter Info */}
        <View style={styles.inviterCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {inviterName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.inviterName}>{inviterName}</Text>
          <Text style={styles.invitedText}>invited you to link as Friends in Oxbow</Text>
        </View>

        {/* Scope Information */}
        <View style={styles.scopeCard}>
          <IconSymbol name="lock.shield" size={24} color="#666" />
          <Text style={styles.scopeText}>
            You'll only see Mirrors they explicitly share with you. Your journal entries remain private.
          </Text>
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

        {/* Helper Text */}
        <Text style={styles.helperText}>
          This invite expires in 72 hours from when it was created
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  inviterCard: {
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '600',
  },
  inviterName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  invitedText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  scopeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  scopeText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
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
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  helperText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});
