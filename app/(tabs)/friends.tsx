// app/(tabs)/friends.tsx
// Friends tab - redesigned with inline invite and slots

import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useUnreadShares } from '@/contexts/UnreadSharesContext';
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
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function FriendsScreen() {
  const { user } = useAuth();
  const { refreshUnreadCount } = useUnreadShares();
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
        message: `Join me on Oxbow! Use this link to connect as friends:\n\n${result.deepLink}\n\nThis link expires in 72 hours.`,
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
    // Refresh tab badge count
    refreshUnreadCount();
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
            <Text style={styles.shareDate}>{formatDate(share.mirror.createdAt)}</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Friends</Text>
        </View>

        {/* Pitch Section */}
        <View style={styles.pitchSection}>
          <View style={styles.iconContainer}>
            <IconSymbol name="bolt.fill" size={40} color="#6366f1" />
          </View>
          <Text style={styles.pitchTitle}>Pursue Jesus</Text>
          <Text style={styles.pitchTitle}>with Friends</Text>
          <View style={styles.pitchDivider}>
            <Text style={styles.pitchSubtitle}>Share mirrors</Text>
          </View>
          <Text style={styles.pitchDescription}>
            Observe God's leading together
          </Text>
          <Text style={styles.pitchNote}>
            You control what is shared
          </Text>
        </View>

        {/* Create Invite Button */}
        <TouchableOpacity
          style={[styles.createInviteButton, creatingInvite && styles.buttonDisabled]}
          onPress={handleCreateInvite}
          disabled={creatingInvite}
        >
          {creatingInvite ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <IconSymbol name="link" size={18} color="#fff" />
              <Text style={styles.createInviteButtonText}>Create Invite Link</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.expiryNote}>This link expires in 72 hours</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Friend Slots */}
        <FriendSlots friends={friends} onCreateInvite={handleCreateInvite} />

        {/* Divider */}
        <View style={styles.divider} />

        {/* Share a Mirror Prompt (only if no incoming shares) */}
        {!hasIncomingShares && <SharePromptCard />}

        {/* Shared with You Section */}
        {hasIncomingShares && (
          <View style={styles.sharedSection}>
            <Text style={styles.sectionTitle}>Shared with you</Text>
            {incomingShares.map(renderShareItem)}
          </View>
        )}
      </ScrollView>

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
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  pitchSection: {
    alignItems: 'center',
    marginBottom: 24,
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
  pitchDivider: {
    marginVertical: 12,
  },
  pitchSubtitle: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  pitchDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  pitchNote: {
    fontSize: 12,
    color: '#9ca3af',
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
});
