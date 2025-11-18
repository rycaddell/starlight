// app/(tabs)/friends.tsx
// Friends tab - manage friend links and view shared mirrors

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { fetchFriends, unlinkFriend } from '@/lib/supabase/friends';
import { fetchIncomingShares } from '@/lib/supabase/mirrorShares';
import { InviteSheet } from '@/components/friends/InviteSheet';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function FriendsScreen() {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [incomingShares, setIncomingShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteSheetVisible, setInviteSheetVisible] = useState(false);

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

  const handleUnlink = (linkId, friendName) => {
    Alert.alert(
      'Unlink Friend?',
      `Are you sure you want to unlink ${friendName}? They'll still be able to view mirrors you've already shared with them.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            const result = await unlinkFriend(linkId);
            if (result.success) {
              loadData(); // Reload friends list
            } else {
              Alert.alert('Error', result.error || 'Failed to unlink friend');
            }
          },
        },
      ]
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <IconSymbol name="person.2" size={64} color="#999" />
      <Text style={styles.emptyTitle}>Invite a trusted friend</Text>
      <Text style={styles.emptySubtitle}>
        Invite a trusted friend to walk with you.{'\n'}
        You decide what to share.
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => setInviteSheetVisible(true)}
      >
        <IconSymbol name="plus" size={20} color="#fff" />
        <Text style={styles.primaryButtonText}>Add Friend</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFriendItem = ({ item }) => (
    <View style={styles.friendItem}>
      <View style={styles.friendInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{item.displayName}</Text>
          <Text style={styles.friendStatus}>Linked</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleUnlink(item.linkId, item.displayName)}
        style={styles.unlinkButton}
      >
        <Text style={styles.unlinkText}>Unlink</Text>
      </TouchableOpacity>
    </View>
  );

  const renderShareItem = ({ item }) => {
    // Extract first theme for preview
    const firstTheme = item.mirror.screen1Themes?.themes?.[0];
    const preview = firstTheme?.name || 'Mirror reflection';

    return (
      <TouchableOpacity
        style={styles.shareItem}
        onPress={() => {
          // TODO: Open mirror viewer in Phase 5
          Alert.alert('Open Mirror', 'Mirror viewer integration coming soon');
        }}
      >
        <View style={styles.shareHeader}>
          <IconSymbol name="sparkles" size={24} color="#6366f1" />
          <View style={styles.shareInfo}>
            <Text style={styles.shareSender}>{item.senderName}</Text>
            <Text style={styles.sharePreview}>{preview}</Text>
          </View>
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NEW</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => {
    if (incomingShares.length === 0 && friends.length === 0) {
      return null;
    }

    return (
      <View>
        {/* Incoming Shares Section */}
        {incomingShares.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shared with You</Text>
            {incomingShares.map((share) => (
              <View key={share.shareId}>{renderShareItem({ item: share })}</View>
            ))}
          </View>
        )}

        {/* Friends Section Header */}
        {friends.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Friends ({friends.length})
            </Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setInviteSheetVisible(true)}
            >
              <IconSymbol name="plus" size={20} color="#6366f1" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {friends.length === 0 && incomingShares.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={friends}
          renderItem={renderFriendItem}
          keyExtractor={(item) => item.linkId}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <InviteSheet
        visible={inviteSheetVisible}
        onClose={() => setInviteSheetVisible(false)}
        userId={user?.id}
        userName={user?.display_name}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#000',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareItem: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0ff',
  },
  shareHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  sharePreview: {
    fontSize: 14,
    color: '#666',
  },
  newBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  friendDetails: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  friendStatus: {
    fontSize: 14,
    color: '#666',
  },
  unlinkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unlinkText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
});
