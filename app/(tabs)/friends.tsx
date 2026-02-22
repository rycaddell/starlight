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
  Image,
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
import { SharePromptCard } from '@/components/friends/SharePromptCard';
import { FriendCard, FriendCardState } from '@/components/friends/FriendCard';
import { FriendMirrorsModal } from '@/components/friends/FriendMirrorsModal';
import { MirrorViewer } from '@/components/mirror/MirrorViewer';
import { Day1MirrorViewer } from '@/components/day1/Day1MirrorViewer';
import { NotificationPitchCard } from '@/components/friends/NotificationPitchCard';
import { AddProfilePicCard } from '@/components/friends/AddProfilePicCard';
import { supabase } from '@/lib/supabase/client';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNewFriendTracking } from '@/hooks/useNewFriendTracking';
import { useProfilePicture } from '@/hooks/useProfilePicture';
import { getDay1Mirror } from '@/lib/supabase/day1';

const FRIEND_EMPTY_STATE_BG = require('@/assets/friends/friend-empty-state.jpg');

export default function FriendsScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { refreshUnreadCount } = useUnreadShares();
  const { markFriendsAsViewed, refreshNewFriendsCount } = useFriendBadge();
  const { permissionStatus, requestPermissionAndRegister } = usePushNotifications(user?.id || null);
  const { loaded: newFriendsLoaded, isFriendNew, markFriendAsNew, dismissAllNewFriends } = useNewFriendTracking();
  const { handleAddProfilePicture } = useProfilePicture(user?.id || '', async () => {
    // Refresh user data to show updated profile picture
    await refreshUser();
    // Reload friends data
    loadData();
  });
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

  // Day 1 mirror viewer state
  const [viewingDay1Mirror, setViewingDay1Mirror] = useState(false);
  const [day1MirrorData, setDay1MirrorData] = useState(null);
  const [day1SpiritualPlace, setDay1SpiritualPlace] = useState('Resting');
  const [day1SenderName, setDay1SenderName] = useState('friend');

  // Friend mirrors modal state
  const [friendMirrorsModalVisible, setFriendMirrorsModalVisible] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedFriendName, setSelectedFriendName] = useState<string>('');

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
  // Dismiss all "new friend" statuses when user navigates away
  useFocusEffect(
    useCallback(() => {
      markFriendsAsViewed();

      return () => {
        // Dismiss all new friends when leaving the screen
        dismissAllNewFriends();
      };
    }, [markFriendsAsViewed, dismissAllNewFriends])
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

  // Track new friends - mark friends as "new" if they were linked within the last 5 seconds
  const previousFriendIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!newFriendsLoaded || friends.length === 0) return;

    const currentFriendIds = new Set(friends.map((f: any) => f.userId));
    const previousFriendIds = previousFriendIdsRef.current;

    // Find newly added friends (not in previous set)
    const newlyAddedFriendIds = Array.from(currentFriendIds).filter(
      (id) => !previousFriendIds.has(id)
    );

    // Only mark as "new" if they were linked very recently (within 5 seconds)
    const now = new Date();
    newlyAddedFriendIds.forEach((friendId) => {
      const friend = friends.find((f: any) => f.userId === friendId);
      if (friend && friend.linkedAt) {
        const linkedTime = new Date(friend.linkedAt);
        const secondsSinceLinked = (now.getTime() - linkedTime.getTime()) / 1000;

        // Only mark as new if linked within last 5 seconds
        if (secondsSinceLinked < 5) {
          markFriendAsNew(friendId);
        }
      }
    });

    // Update previous friend IDs
    previousFriendIdsRef.current = currentFriendIds;
  }, [friends, newFriendsLoaded, markFriendAsNew]);

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

      // Check if this is a Day 1 mirror
      const isDay1Mirror = result.mirror.mirror_type === 'day_1';

      if (isDay1Mirror) {
        console.log('📋 Opening shared Day 1 mirror');

        // Fetch spiritual place from the owner's day_1_progress
        let spiritualPlace = 'Resting'; // Default
        if (result.mirror.custom_user_id) {
          const day1Result = await getDay1Mirror(result.mirror.custom_user_id);
          if (day1Result.success && day1Result.progress?.spiritualPlace) {
            spiritualPlace = day1Result.progress.spiritualPlace;
          }
        }

        setDay1MirrorData(result.mirror);
        setDay1SpiritualPlace(spiritualPlace);
        setDay1SenderName(result.senderName);
        setViewingDay1Mirror(true);
        setLoadingMirror(false);
      } else {
        // Regular mirror
        setSelectedMirror(result.mirror);
        setSelectedMirrorId(result.mirror.id);
        setViewingMirror(true);
        setLoadingMirror(false);
      }
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
    setViewingDay1Mirror(false);
    setDay1MirrorData(null);
    setDay1SpiritualPlace('Resting');
    setDay1SenderName('friend');
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

  // Group shares by friend and determine card state
  const getFriendCards = React.useMemo(() => {
    if (!newFriendsLoaded) return [];

    // Group shares by sender (friend)
    const sharesByFriend = incomingShares.reduce((acc: any, share: any) => {
      const friendId = share.senderId; // Fixed: was senderUserId, should be senderId
      if (!acc[friendId]) {
        acc[friendId] = {
          friendId,
          friendName: share.senderName,
          shares: [],
        };
      }
      acc[friendId].shares.push(share);
      return acc;
    }, {});

    // For each friend, determine card state
    const friendCards = friends.map((friend: any) => {
      const friendId = friend.userId; // Fixed: was user_id, should be userId
      const friendName = friend.displayName; // Fixed: was display_name, should be displayName
      const friendShares = sharesByFriend[friendId]?.shares || [];

      // Determine card state
      let state: FriendCardState;
      let unreadCount = 0;
      let mostRecentShare = null;

      if (isFriendNew(friendId)) {
        // State 1: New friend
        state = 'new';
      } else if (friendShares.length === 0) {
        // State 2: No mirrors
        state = 'no_mirrors';
      } else {
        // Check for unread mirrors
        const unreadShares = friendShares.filter((s: any) => s.isNew);
        unreadCount = unreadShares.length;

        if (unreadCount > 0) {
          // State 3: Has unread mirrors
          state = 'unread';
          // Find most recent unread share
          mostRecentShare = unreadShares.sort(
            (a: any, b: any) => new Date(b.mirror.created_at).getTime() - new Date(a.mirror.created_at).getTime()
          )[0];
        } else {
          // State 4: All mirrors read
          state = 'read';
          // Find most recent share for sorting
          mostRecentShare = friendShares.sort(
            (a: any, b: any) => new Date(b.mirror.created_at).getTime() - new Date(a.mirror.created_at).getTime()
          )[0];
        }
      }

      return {
        friendId,
        friendName,
        profilePictureUrl: friend.profilePictureUrl,
        state,
        mirrorCount: friendShares.length,
        shares: friendShares,
        mostRecentShare,
      };
    });

    // Sort friend cards
    // 1. New friends first
    // 2. Then friends with unread mirrors
    // 3. Then friends with mirrors (sorted by most recent mirror shared)
    // 4. Then friends with no mirrors (sorted by most recently added)
    return friendCards.sort((a: any, b: any) => {
      // Priority 1: New friends first
      if (a.state === 'new' && b.state !== 'new') return -1;
      if (a.state !== 'new' && b.state === 'new') return 1;

      // Priority 2: Unread mirrors
      if (a.state === 'unread' && b.state !== 'unread') return -1;
      if (a.state !== 'unread' && b.state === 'unread') return 1;

      // Priority 3: Friends with mirrors come before friends without mirrors
      const aHasMirrors = a.state === 'read' || a.state === 'unread';
      const bHasMirrors = b.state === 'read' || b.state === 'unread';

      if (aHasMirrors && !bHasMirrors) return -1;
      if (!aHasMirrors && bHasMirrors) return 1;

      // Priority 4: Among friends with mirrors, sort by most recent share
      if (a.mostRecentShare && b.mostRecentShare) {
        return new Date(b.mostRecentShare.mirror.created_at).getTime() - new Date(a.mostRecentShare.mirror.created_at).getTime();
      }

      // Priority 5: Among friends with no mirrors, sort by most recently added (linkedAt)
      if (a.state === 'no_mirrors' && b.state === 'no_mirrors') {
        const aFriend = friends.find((f: any) => f.userId === a.friendId);
        const bFriend = friends.find((f: any) => f.userId === b.friendId);

        if (aFriend?.linkedAt && bFriend?.linkedAt) {
          return new Date(bFriend.linkedAt).getTime() - new Date(aFriend.linkedAt).getTime();
        }
      }

      return 0;
    });
  }, [friends, incomingShares, newFriendsLoaded, isFriendNew]);

  // Handle friend card press
  const handleFriendCardPress = async (friendCard: any) => {
    if (friendCard.state === 'unread') {
      // Open most recent unread mirror
      const mostRecentUnread = friendCard.shares
        .filter((s: any) => s.isNew)
        .sort((a: any, b: any) => new Date(b.mirror.created_at).getTime() - new Date(a.mirror.created_at).getTime())[0];

      if (mostRecentUnread) {
        await handleViewSharedMirror(mostRecentUnread);
      }
    } else if (friendCard.state === 'read') {
      // Open friend mirrors modal
      setSelectedFriendId(friendCard.friendId);
      setSelectedFriendName(friendCard.friendName);
      setFriendMirrorsModalVisible(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.text.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const hasIncomingShares = incomingShares.length > 0;
  const hasFriends = friends.length > 0;

  if (!hasFriends) {
    return (
      <View style={styles.container}>
        {/* No Friends State - Full screen background image */}
        <ImageBackground
          source={FRIEND_EMPTY_STATE_BG}
          style={styles.emptyStateBackground}
          resizeMode="cover"
        >
          <View style={styles.emptyStateOverlay} />
          <SafeAreaView style={styles.emptyStateSafeArea}>
            <View style={styles.emptyStateContent}>
              {/* Heading */}
              <Text style={styles.emptyStateHeading}>
                Grow together
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
                  <ActivityIndicator color={colors.text.white} />
                ) : (
                  <Text style={styles.emptyStateButtonText}>Invite a Friend</Text>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ImageBackground>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {hasFriends && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Header: "Friends" title with Invite button on right */}
          <View style={styles.header}>
            <Text style={styles.title}>Friends</Text>
            <TouchableOpacity
              onPress={handleCreateInvite}
              disabled={creatingInvite}
              style={[styles.inviteButton, creatingInvite && styles.buttonDisabled]}
            >
              {creatingInvite ? (
                <ActivityIndicator color={colors.text.primary} />
              ) : (
                <Text style={styles.inviteButtonText}>Invite a Friend</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Friend Cards - full width */}
          <View style={styles.friendsList}>
            {getFriendCards.map((friendCard) => (
              <FriendCard
                key={friendCard.friendId}
                friendId={friendCard.friendId}
                friendName={friendCard.friendName}
                profilePictureUrl={friendCard.profilePictureUrl}
                state={friendCard.state}
                mirrorCount={friendCard.mirrorCount}
                onPress={() => handleFriendCardPress(friendCard)}
              />
            ))}
          </View>

          {/* Setup Section - Only show if notifications not enabled or no profile pic */}
          {(permissionStatus !== 'granted' || !user?.profile_picture_url) && (
            <View style={styles.setupSection}>
              <Text style={styles.setupHeading}>Setup</Text>

              {/* Notification Pitch - Show if notifications not enabled */}
              {permissionStatus !== 'granted' && (
                <NotificationPitchCard onEnablePress={handleEnableNotifications} />
              )}

              {/* Add Profile Picture Pitch - Show if no profile picture */}
              {!user?.profile_picture_url && (
                <AddProfilePicCard onAddPress={handleAddProfilePicture} />
              )}
            </View>
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

      {/* Shared Day 1 Mirror Viewer */}
      {viewingDay1Mirror && day1MirrorData && (
        <Day1MirrorViewer
          visible={viewingDay1Mirror}
          onClose={handleCloseMirrorViewer}
          mirrorId={day1MirrorData.id}
          userId={user?.id || ''}
          userName={day1SenderName}
          spiritualPlace={day1SpiritualPlace}
          isOwner={false}
        />
      )}

      {/* Friend Mirrors Modal */}
      {selectedFriendId && (
        <FriendMirrorsModal
          visible={friendMirrorsModalVisible}
          onClose={() => {
            setFriendMirrorsModalVisible(false);
            setSelectedFriendId(null);
            setSelectedFriendName('');
          }}
          friendName={selectedFriendName}
          profilePictureUrl={
            getFriendCards.find((fc) => fc.friendId === selectedFriendId)?.profilePictureUrl
          }
          mirrors={
            getFriendCards.find((fc) => fc.friendId === selectedFriendId)?.shares || []
          }
          onMirrorPress={async (share) => {
            // Close the modal first
            setFriendMirrorsModalVisible(false);
            // Then open the mirror viewer
            await handleViewSharedMirror(share);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: spacing.screen.topInset,
    paddingBottom: 100,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screen.horizontalPadding,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.heading.xl,
    color: colors.text.body,
  },

  // Invite Button
  inviteButton: {
    backgroundColor: colors.background.white,
    borderWidth: 1,
    borderColor: colors.text.primary,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.ml,
    paddingHorizontal: spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  inviteButtonText: {
    ...typography.heading.s,
    color: colors.text.primary,
  },

  setupHeading: {
    ...typography.heading.default,
    color: colors.text.body,
    marginBottom: spacing.m,
  },

  // Friends list (full width — no horizontal padding)
  friendsList: {
    // FriendCard components handle their own horizontal layout
  },

  // Setup section
  setupSection: {
    paddingHorizontal: spacing.screen.horizontalPadding,
    paddingTop: spacing.xxxxl,
    gap: spacing.xl,
  },

  buttonDisabled: {
    opacity: 0.6,
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
  emptyStateSafeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  emptyStateContent: {
    paddingHorizontal: spacing.xxxxl,
    alignItems: 'flex-start',
    width: '100%',
  },
  emptyStateHeading: {
    ...typography.heading.xl,
    color: colors.text.white,
    marginBottom: spacing.xl,
    textAlign: 'left',
  },
  emptyStateSubheading: {
    ...typography.heading.l,
    fontWeight: '400',
    color: colors.text.white,
    marginBottom: spacing.xxxxl,
    textAlign: 'left',
  },
  emptyStateButton: {
    width: '100%',
    backgroundColor: colors.text.primary,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xxxl,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
  },
});
