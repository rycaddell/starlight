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
import * as Sentry from '@sentry/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { acceptInvite, getInviterInfo } from '@/lib/supabase/friends';
import { Avatar } from '@/components/ui/Avatar';
import { colors, typography, spacing, borderRadius, fontFamily } from '@/theme/designTokens';

export default function AcceptInviteScreen() {
  const { token, inviter, name } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [inviterProfilePicUrl, setInviterProfilePicUrl] = useState<string | null>(null);

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

  // Fetch inviter profile picture
  useEffect(() => {
    const loadInviterInfo = async () => {
      if (typeof token !== 'string') return;

      const result = await getInviterInfo(token);
      if (result.success && result.inviterProfilePicUrl) {
        setInviterProfilePicUrl(result.inviterProfilePicUrl);
      }
    };

    loadInviterInfo();
  }, [token]);

  const handleAccept = async () => {
    if (!user?.id || typeof token !== 'string') {
      return;
    }

    setAccepting(true);

    Sentry.addBreadcrumb({
      category: 'friends',
      message: 'User accepting friend invite',
      data: { inviterName },
      level: 'info',
    });

    try {
      const result = await acceptInvite(token, user.id);

      if (!result.success) {
        Sentry.captureException(new Error(`Failed to accept invite: ${result.error}`), {
          tags: { component: 'AcceptInviteScreen', action: 'accept' },
          contexts: {
            friends: {
              inviterName,
              error: result.error,
            },
          },
        });

        Alert.alert('Unable to Accept', result.error || 'Failed to accept invite');
        setAccepting(false);
        return;
      }

      Sentry.addBreadcrumb({
        category: 'friends',
        message: 'Friend invite accepted successfully',
        data: { inviterName: result.inviterName },
        level: 'info',
      });

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

      Sentry.captureException(error, {
        tags: { component: 'AcceptInviteScreen', action: 'accept', type: 'unexpected' },
        contexts: { friends: { inviterName } },
      });

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
        <ActivityIndicator size="large" color={colors.text.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Inviter Info */}
        <View style={styles.inviterSection}>
          <Avatar
            imageUri={inviterProfilePicUrl || undefined}
            initials={inviterName.charAt(0)}
            size="large"
          />
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
              <ActivityIndicator color={colors.text.white} />
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
    backgroundColor: colors.background.default,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xxxl,
    justifyContent: 'center',
  },
  inviterSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxxl,
    gap: spacing.l,
  },
  inviterName: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  invitedText: {
    ...typography.body.default,
    color: colors.text.bodyLight,
  },
  actions: {
    gap: spacing.m,
    marginBottom: spacing.xl,
  },
  acceptButton: {
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.button,
    alignItems: 'center',
  },
  acceptButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
  },
  declineButton: {
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  declineButtonText: {
    ...typography.heading.s,
    color: colors.text.body,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  expiryNote: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    textAlign: 'center',
  },
});
