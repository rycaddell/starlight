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
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
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
      setSelectedFriendId(friends[0].userId);
    } else if (!visible) {
      setSelectedFriendId(null);
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
    if (!selectedFriendId) {
      Alert.alert('Select a Friend', 'Please select a friend to share with');
      return;
    }

    setSharing(true);

    try {
      // Handle "All Linked Friends" option
      if (selectedFriendId === 'ALL') {
        // Share with all friends sequentially
        let successCount = 0;
        let errorCount = 0;

        for (const friend of friends) {
          const result = await shareMirror(mirrorId, userId, friend.userId);
          if (result.success) {
            successCount++;
          } else {
            errorCount++;
            console.warn(`Failed to share with ${friend.displayName}:`, result.error);
          }
        }

        if (successCount > 0) {
          Alert.alert(
            'Mirror Shared',
            `Shared with ${successCount} friend${successCount > 1 ? 's' : ''}` +
              (errorCount > 0 ? ` (${errorCount} failed)` : '')
          );
          onShareSuccess?.();
          onClose();
        } else {
          Alert.alert('Unable to Share', 'Failed to share with any friends');
        }
      } else {
        // Share with single friend
        const result = await shareMirror(mirrorId, userId, selectedFriendId);

        if (!result.success) {
          Alert.alert('Unable to Share', result.error || 'Failed to share mirror');
          setSharing(false);
          return;
        }

        Alert.alert('Mirror Shared', 'Your mirror has been shared successfully');
        onShareSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('Error sharing mirror:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSharing(false);
    }
  };

  const renderFriendItem = ({ item }: { item: any }) => {
    const isSelected = selectedFriendId === item.userId;

    return (
      <TouchableOpacity
        style={[styles.friendItem, isSelected && styles.friendItemSelected]}
        onPress={() => setSelectedFriendId(item.userId)}
      >
        <View style={styles.friendInfo}>
          <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
            <Text style={styles.avatarText}>
              {item.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.friendName, isSelected && styles.friendNameSelected]}>
            {item.displayName}
          </Text>
        </View>

        <View
          style={[
            styles.radioButton,
            isSelected && styles.radioButtonSelected,
          ]}
        >
          {isSelected && <View style={styles.radioButtonInner} />}
        </View>
      </TouchableOpacity>
    );
  };

  const renderNoFriendsState = () => (
    <View style={styles.emptyState}>
      <IconSymbol name="person.2" size={56} color="#6366f1" />
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
        <IconSymbol name="link" size={18} color="#fff" />
        <Text style={styles.inviteButtonText}>Invite a Friend</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAllFriendsOption = () => (
    <TouchableOpacity
      style={[
        styles.friendItem,
        styles.allFriendsItem,
        selectedFriendId === 'ALL' && styles.friendItemSelected,
      ]}
      onPress={() => setSelectedFriendId('ALL')}
    >
      <View style={styles.friendInfo}>
        <View
          style={[
            styles.avatar,
            styles.allFriendsAvatar,
            selectedFriendId === 'ALL' && styles.avatarSelected,
          ]}
        >
          <IconSymbol name="person.2.fill" size={20} color="#fff" />
        </View>
        <Text
          style={[
            styles.friendName,
            selectedFriendId === 'ALL' && styles.friendNameSelected,
          ]}
        >
          All Linked Friends
        </Text>
      </View>

      <View
        style={[
          styles.radioButton,
          selectedFriendId === 'ALL' && styles.radioButtonSelected,
        ]}
      >
        {selectedFriendId === 'ALL' && <View style={styles.radioButtonInner} />}
      </View>
    </TouchableOpacity>
  );

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
              <IconSymbol name="xmark" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Friends List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
            </View>
          ) : friends.length === 0 ? (
            renderNoFriendsState()
          ) : (
            <>
              {/* Instruction text based on friend count */}
              {friends.length === 1 ? (
                <View style={styles.instructionContainer}>
                  <Text style={styles.instructionText}>
                    Share this mirror with your friend
                  </Text>
                </View>
              ) : (
                <View style={styles.instructionContainer}>
                  <Text style={styles.instructionText}>
                    Select one friend or share with all
                  </Text>
                </View>
              )}

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
                    (!selectedFriendId || sharing) && styles.shareButtonDisabled,
                  ]}
                  onPress={handleShare}
                  disabled={!selectedFriendId || sharing}
                >
                  {sharing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <IconSymbol name="arrow.up.circle" size={20} color="#fff" />
                      <Text style={styles.shareButtonText}>Share Mirror</Text>
                    </>
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
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  allFriendsContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  allFriendsItem: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
  },
  allFriendsAvatar: {
    backgroundColor: '#6366f1',
  },
  instructionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    padding: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  friendItemSelected: {
    backgroundColor: '#f0f0ff',
    borderColor: '#6366f1',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarSelected: {
    backgroundColor: '#6366f1',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  friendNameSelected: {
    fontWeight: '600',
    color: '#6366f1',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#6366f1',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6366f1',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonDisabled: {
    backgroundColor: '#d1d5db',
    opacity: 0.6,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
