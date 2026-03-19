// components/mirror/ShareMirrorSheet.tsx
// Modal sheet for sharing a mirror with one friend

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchFriends } from '@/lib/supabase/friends';
import { shareMirror } from '@/lib/supabase/mirrorShares';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Avatar } from '@/components/ui/Avatar';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

interface ShareMirrorSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  mirrorId: string;
  onShareSuccess?: () => void;
}

export function ShareMirrorSheet({
  visible,
  onClose,
  userId,
  mirrorId,
  onShareSuccess,
}: ShareMirrorSheetProps) {
  const router = useRouter();
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadFriends();
    }
  }, [visible]);

  // Auto-select if only 1 friend
  useEffect(() => {
    if (friends.length === 1 && visible) {
      setSelectedFriendIds([friends[0].userId]);
    } else if (!visible) {
      setSelectedFriendIds([]);
    }
  }, [friends, visible]);

  const loadFriends = async () => {
    setLoading(true);

    try {
      const result = await fetchFriends(userId);

      if (result.success) {
        setFriends(result.friends || []);
      } else {
        Alert.alert('Error', 'Failed to load friends');
      }
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (selectedFriendIds.length === 0) {
      Alert.alert('Select Friends', 'Please select at least one friend to share with');
      return;
    }

    setSharing(true);

    try {
      // Determine which friends to share with
      const friendIdsToShare = selectedFriendIds.includes('ALL')
        ? friends.map(f => f.userId)
        : selectedFriendIds;

      // Share with selected friends sequentially
      const sharedNames: string[] = [];
      let errorCount = 0;
      let lastError: string | undefined;

      for (const friendId of friendIdsToShare) {
        const result = await shareMirror(mirrorId, userId, friendId);
        if (result.success) {
          const friend = friends.find(f => f.userId === friendId);
          sharedNames.push(friend?.displayName || friendId);
        } else {
          errorCount++;
          lastError = result.error;
          const friend = friends.find(f => f.userId === friendId);
          console.warn(`Failed to share with ${friend?.displayName || friendId}:`, result.error);
        }
      }

      if (sharedNames.length > 0) {
        const nameList =
          sharedNames.length === 1
            ? sharedNames[0]
            : sharedNames.slice(0, -1).join(', ') + ' and ' + sharedNames[sharedNames.length - 1];
        Alert.alert(
          'Mirror Shared',
          `Shared with ${nameList}` + (errorCount > 0 ? ` (${errorCount} failed)` : '')
        );
        onShareSuccess?.();
        onClose();
      } else {
        Alert.alert('Unable to Share', lastError ?? 'Failed to share with any friends');
      }
    } catch (error) {
      console.error('Error sharing mirror:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  // Generate initials from display name
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        // If selecting ALL, deselect individual friends
        if (friendId === 'ALL') {
          return ['ALL'];
        }
        // If selecting individual friend, deselect ALL
        return prev.filter(id => id !== 'ALL').concat(friendId);
      }
    });
  };

  const renderFriendItem = ({ item }: { item: any }) => {
    const isSelected = selectedFriendIds.includes(item.userId);

    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.friendItemSelected]}
        onPress={() => toggleFriendSelection(item.userId)}
      >
        <View style={styles.friendInfo}>
          <Avatar
            imageUri={item.profilePictureUrl}
            initials={getInitials(item.displayName)}
            size="small"
          />
          <Text style={[styles.friendName, isSelected && styles.friendNameSelected]}>
            {item.displayName}
          </Text>
        </View>

        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}
        >
          {isSelected && <IconSymbol name="checkmark" size={14} color={colors.text.white} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderNoFriendsState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="person.2" size={56} color={colors.text.primary} />
      <Text style={styles.emptyText}>No linked friends yet</Text>
      <Text style={styles.emptySubtext}>
        Link with friends to share your mirrors
      </Text>
      <TouchableOpacity
        style={styles.inviteButton}
        onPress={() => {
          onClose();
          router.push('/(tabs)/friends');
        }}
      >
        <IconSymbol name="link" size={18} color={colors.text.white} />
        <Text style={styles.inviteButtonText}>Invite a Friend</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAllFriendsOption = () => {
    const isSelected = selectedFriendIds.includes('ALL');

    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          styles.allFriendsItem,
          isSelected && styles.friendItemSelected,
        ]}
        onPress={() => toggleFriendSelection('ALL')}
      >
        <View style={styles.friendInfo}>
          <View
            style={[
              styles.avatar,
              styles.allFriendsAvatar,
              isSelected && styles.avatarSelected,
            ]}
          >
            <IconSymbol name="person.2.fill" size={20} color={colors.text.white} />
          </View>
          <Text
            style={[
              styles.friendName,
              isSelected && styles.friendNameSelected,
            ]}
          >
            All Linked Friends
          </Text>
        </View>

        <View
          style={[
            styles.checkbox,
            isSelected && styles.checkboxSelected,
          ]}
        >
          {isSelected && <IconSymbol name="checkmark" size={14} color={colors.text.white} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Share with a Friend</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color={colors.text.bodyLight} />
            </TouchableOpacity>
          </View>

          {/* Friends List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.background.primaryLight} />
            </View>
          ) : friends.length === 0 ? (
            renderNoFriendsState()
          ) : (
            <>
              {/* All Friends Option (only for 2-3 friends) */}
              {friends.length >= 2 && friends.length <= 3 && (
                <View style={styles.allFriendsContainer}>
                  {renderAllFriendsOption()}
                </View>
              )}

              {/* Friends List */}
              <FlatList
                data={friends}
                renderItem={renderFriendItem}
                keyExtractor={(item) => item.userId}
                contentContainerStyle={styles.listContent}
                style={styles.list}
              />

              {/* Share Button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={[
                    styles.shareButton,
                    (selectedFriendIds.length === 0 || sharing) && styles.shareButtonDisabled,
                  ]}
                  onPress={handleShare}
                  disabled={selectedFriendIds.length === 0 || sharing}
                >
                  {sharing ? (
                    <ActivityIndicator color={colors.text.body} />
                  ) : (
                    <Text style={styles.shareButtonText}>Share Mirror</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background.white,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.defaultLight,
  },
  title: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.heading.l,
    color: colors.text.body,
    marginTop: spacing.xxl,
  },
  emptySubtext: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    marginTop: spacing.m,
    marginBottom: spacing.xxxl,
    textAlign: 'center',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.m,
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing.xxxl,
    paddingVertical: 14,
    borderRadius: borderRadius.button,
  },
  inviteButtonText: {
    ...typography.heading.s,
    color: colors.text.white,
  },
  allFriendsContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.l,
    paddingBottom: spacing.s,
  },
  allFriendsItem: {
    backgroundColor: colors.background.defaultLight,
    borderWidth: 2,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelected: {
    borderWidth: 2,
    borderColor: colors.border.outline,
  },
  allFriendsAvatar: {
    backgroundColor: colors.background.primaryLight,
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    padding: spacing.xl,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.button,
    marginBottom: spacing.m,
    backgroundColor: colors.background.defaultLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  friendItemSelected: {
    backgroundColor: colors.background.primaryLighter,
    borderColor: colors.border.outline,
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
    flex: 1,
  },
  friendName: {
    ...typography.body.default,
    fontWeight: '500',
    color: colors.text.body,
  },
  friendNameSelected: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background.disabled,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    borderColor: colors.border.outline,
    backgroundColor: colors.background.primaryLight,
  },
  footer: {
    padding: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.background.defaultLight,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primaryLight,
    paddingVertical: spacing.xl,
    borderRadius: borderRadius.button,
    gap: spacing.m,
  },
  shareButtonDisabled: {
    backgroundColor: colors.background.disabled,
    opacity: 0.6,
  },
  shareButtonText: {
    ...typography.heading.s,
    color: colors.text.body,
  },
});
