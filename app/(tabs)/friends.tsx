// app/(tabs)/friends.tsx
// Friends tab - redesigned with inline invite and slots

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
  Share as RNShare,
  ActivityIndicator,
  Modal,
  ImageBackground,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadShares } from '@/contexts/UnreadSharesContext';
import { useFriendBadge } from '@/contexts/FriendBadgeContext';
import { fetchFriends, createInviteLink } from '@/lib/supabase/friends';
import {
  fetchIncomingShares,
  getUnviewedSharesCount,
  getSharedMirrorDetails,
  markShareAsViewed,
} from '@/lib/supabase/mirrorShares';
import { FriendSlots } from '@/components/friends/FriendSlots';
import { SharePromptCard } from '@/components/friends/SharePromptCard';
import { MirrorViewer } from '@/components/mirror/MirrorViewer';
import { NotificationPitchCard } from '@/components/friends/NotificationPitchCard';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { supabase } from '@/lib/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const FRIEND_EMPTY_STATE_BG = require('@/assets/friends/friend-empty-state.jpg');

export default function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { refreshUnreadCount } = useUnreadShares();
  const { markFriendsAsViewed, refreshNewFriendsCount } = useFriendBadge();
  const { permissionStatus, requestPermissionAndRegister } = usePushNotifications(user?.id || null);
  const [friends, setFriends] = useState([]);
  const [incomingShares, setIncomingShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingInvite, setCreatingInvite] = useState(false);

  // Shared mirror viewer state
  const [viewingMirror, setViewingMirror] = useState(false);
  const [selectedMirror, setSelectedMirror] = useState(null);
  const [selectedMirrorId, setSelectedMirrorId] = useState(null);
  const [loadingMirror, setLoadingMirror] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Load friends
      const friendsResult = await fetchFriends(user.id);
      if (friendsResult.success) {
        setFriends(friendsResult.friends || []);
      }

      // Load incoming shares
      const sharesResult = await fetchIncomingShares(user.id);
      if (sharesResult.success) {
        setIncomingShares(sharesResult.shares || []);
      }
    } catch (error) {
      console.error('Error loading friends data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mark friends as viewed when screen is focused
  useFocusEffect(
    useCallback(() => {
      markFriendsAsViewed();
    }, [markFriendsAsViewed])
  );

  // Realtime subscription for incoming mirror shares
  useEffect(() => {
    if (!user?.id || !supabase) return;

    let isMounted = true;

    if (__DEV__) {
      console.log('📡 [FriendsScreen] Setting up mirror_shares subscription');
    }

    const sharesSubscription = supabase
      .channel(`friends_screen_shares:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'mirror_shares',
          filter: `recipient_user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted) return;

          if (__DEV__) {
            console.log('✨ [FriendsScreen] Mirror share change:', payload.eventType);
          }

          // Reload shares list from database
          loadData();
        }
      )
      .subscribe((status) => {
        if (__DEV__ && status === 'SUBSCRIBED') {
          console.log('✅ [FriendsScreen] Connected to mirror_shares Realtime');
        }
      });

    return () => {
      isMounted = false;
      if (__DEV__) {
        console.log('🔌 [FriendsScreen] Cleaning up mirror_shares subscription');
      }
      sharesSubscription.unsubscribe();
    };
  }, [user?.id, loadData]);

  // Realtime subscriptions for friend_links (two subscriptions for user_a and user_b)
  useEffect(() => {
    if (!user?.id || !supabase) return;

    let isMounted = true;

    if (__DEV__) {
      console.log('📡 [FriendsScreen] Setting up friend_links subscriptions');
    }

    const friendsSubscriptionA = supabase
      .channel(`friends_screen_links_a:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_links',
          filter: `user_a_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted) return;

          if (__DEV__) {
            console.log('✨ [FriendsScreen] New friend link (user_a)');
          }

          // Reload friends list from database
          loadData();
        }
      )
      .subscribe();

    const friendsSubscriptionB = supabase
      .channel(`friends_screen_links_b:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_links',
          filter: `user_b_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted) return;

          if (__DEV__) {
            console.log('✨ [FriendsScreen] New friend link (user_b)');
          }

          // Reload friends list from database
          loadData();
        }
      )
      .subscribe((status) => {
        if (__DEV__ && status === 'SUBSCRIBED') {
          console.log('✅ [FriendsScreen] Connected to friend_links Realtime');
        }
      });

    return () => {
      isMounted = false;
      if (__DEV__) {
        console.log('🔌 [FriendsScreen] Cleaning up friend_links subscriptions');
      }
      friendsSubscriptionA.unsubscribe();
      friendsSubscriptionB.unsubscribe();
    };
  }, [user?.id, loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateInvite = async () => {
    if (!user?.id || !user?.display_name) return;

    setCreatingInvite(true);

    try {
      const result = await createInviteLink(user.id, user.display_name);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create invite link');
        setCreatingInvite(false);
        return;
      }

      // Open native share sheet
      await RNShare.share({
        message: `Join me on Oxbow! Use this link to connect as friends:\n\n${result.deepLink}`,
        title: 'Join me on Oxbow',
      });

      setCreatingInvite(false);
    } catch (error) {
      console.error('Error sharing invite:', error);
      Alert.alert('Error', 'Failed to share invite link');
      setCreatingInvite(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleViewSharedMirror = async (share) => {
    if (!user?.id) return;

    setLoadingMirror(true);

    try {
      // Fetch full mirror details
      const result = await getSharedMirrorDetails(share.shareId, user.id);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to load mirror');
        setLoadingMirror(false);
        return;
      }

      // Mark as viewed if it's new
      if (share.isNew) {
        await markShareAsViewed(share.shareId, user.id);
      }

      // Open mirror viewer
      setSelectedMirror(result.mirror);
      setSelectedMirrorId(result.mirror.id);
      setViewingMirror(true);
      setLoadingMirror(false);
    } catch (error) {
      console.error('Error loading shared mirror:', error);
      Alert.alert('Error', 'Failed to load mirror');
      setLoadingMirror(false);
    }
  };

  const handleCloseMirrorViewer = () => {
    setViewingMirror(false);
    setSelectedMirror(null);
    setSelectedMirrorId(null);
    // Reload shares to update badges
    loadData();
    // Refresh tab badge counts
    refreshUnreadCount();
    refreshNewFriendsCount();
  };

  const handleEnableNotifications = async () => {
    const token = await requestPermissionAndRegister();
    if (token) {
      Alert.alert('Success', 'Push notifications enabled!');
      return true;
    } else {
      Alert.alert('Error', 'Could not enable push notifications. Please check your device settings.');
      return false;
    }
  };

  const renderShareItem = (share) => {
    const isNew = share.isNew;
    const badgeColor = isNew ? '#f59e0b' : '#6366f1'; // Goldenrod vs Purple
    const badgeText = isNew ? 'NEW' : 'VIEW';

    return (
      <TouchableOpacity
        key={share.shareId}
        style={styles.shareItem}
        onPress={() => handleViewSharedMirror(share)}
        disabled={loadingMirror}
      >
        <View style={styles.shareContent}>
          <View style={styles.shareIcon}>
            <IconSymbol name="sparkles" size={20} color="#6366f1" />
          </View>
          <View style={styles.shareInfo}>
            <Text style={styles.shareSender}>{share.senderName}</Text>
            <Text style={styles.shareDate}>{formatDate(share.mirror.created_at)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{badgeText}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  const hasIncomingShares = incomingShares.length > 0;
  const hasFriends = friends.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      {!hasFriends ? (
        /* No Friends State - Full screen background image */
        <ImageBackground
          source={FRIEND_EMPTY_STATE_BG}
          style={styles.emptyStateBackground}
          resizeMode="cover"
        >
          <View style={styles.emptyStateOverlay} />
          <View style={styles.emptyStateContent}>
            {/* Heading */}
            <Text style={styles.emptyStateHeading}>
              Stay spiritually connected to friends
            </Text>

            {/* Subheading */}
            <Text style={styles.emptyStateSubheading}>
              Shared exploration in Oxbow
            </Text>

            {/* Create Invite Button */}
            <TouchableOpacity
              style={[styles.emptyStateButton, creatingInvite && styles.buttonDisabled]}
              onPress={handleCreateInvite}
              disabled={creatingInvite}
            >
              {creatingInvite ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.emptyStateButtonText}>Invite a Friend</Text>
              )}
            </TouchableOpacity>
          </View>
        </ImageBackground>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Has Friends State - Show full UI */}
            {/* Header Section - Centered */}
            <View style={styles.headerCentered}>
              <Text style={styles.titleCentered}>Friends</Text>
            </View>

            {/* Invites Section */}
            <View style={styles.invitesSection}>
              <Text style={styles.h3Title}>Invites</Text>
              <FriendSlots friends={friends} onCreateInvite={handleCreateInvite} />
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Getting Started or Shared Section */}
            {!hasIncomingShares ? (
              <View style={styles.gettingStartedSection}>
                <Text style={styles.h3Title}>Getting started</Text>
                <Text style={styles.gettingStartedBody}>
                  Kick things off by sharing{' '}
                  <Text
                    style={styles.inlineLink}
                    onPress={() => router.push('/(tabs)/mirror')}
                  >
                    your most recent mirror
                  </Text>
                  {' '}with your friend.
                </Text>
              </View>
            ) : (
              <View style={styles.sharedSection}>
                <Text style={styles.sectionTitle}>Shared with you</Text>
                {incomingShares.map(renderShareItem)}
              </View>
            )}

            {/* Notification Pitch - Show if notifications not enabled */}
            {permissionStatus !== 'granted' && (
              <NotificationPitchCard onEnablePress={handleEnableNotifications} />
            )}
        </ScrollView>
      )}

      {/* Shared Mirror Viewer Modal */}
      {viewingMirror && selectedMirror && selectedMirrorId && (
        <Modal
          visible={viewingMirror}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <MirrorViewer
            mirrorContent={selectedMirror}
            mirrorId={selectedMirrorId}
            onClose={handleCloseMirrorViewer}
            isSharedMirror={true}
          />
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  centeredContent: {
    alignItems: 'center',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  headerCentered: {
    marginBottom: 24,
    alignItems: 'center',
  },
  titleCentered: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  h3Title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  invitesSection: {
    marginBottom: 0,
  },
  gettingStartedSection: {
    marginTop: 8,
  },
  gettingStartedBody: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  inlineLink: {
    color: '#6366f1',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  pitchSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pitchTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  pitchDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  guidedJournalSection: {
    marginTop: 8,
  },
  guidedJournalPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  createInviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    marginBottom: 8,
  },
  createInviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  expiryNote: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  sharedSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
  },
  shareItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  shareContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shareIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareInfo: {
    flex: 1,
  },
  shareSender: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  shareDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  // Empty state with background image
  emptyStateBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  emptyStateContent: {
    paddingHorizontal: 32,
    alignItems: 'flex-start',
    width: '100%',
    maxWidth: 400,
  },
  emptyStateHeading: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'left',
  },
  emptyStateSubheading: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FFFFFF',
    marginBottom: 40,
    textAlign: 'left',
  },
  emptyStateButton: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
