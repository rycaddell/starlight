// components/friends/FriendSlots.tsx
// Visual component showing 3 friend slots

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface Friend {
  linkId: string;
  userId: string;
  displayName: string;
}

interface FriendSlotsProps {
  friends: Friend[];
  onCreateInvite: () => void;
}

export function FriendSlots({ friends, onCreateInvite }: FriendSlotsProps) {
  const maxSlots = 3;
  const emptySlots = maxSlots - friends.length;

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Two friend invites available</Text>

      <View style={styles.slotsContainer}>
        {/* Filled slots - show linked friends */}
        {friends.map((friend) => (
          <View key={friend.linkId} style={styles.slot}>
            <View style={styles.filledAvatar}>
              <Text style={styles.avatarText}>
                {friend.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.friendName} numberOfLines={1}>
              {friend.displayName}
            </Text>
          </View>
        ))}

        {/* Empty slots - show + icons with Link buttons */}
        {Array.from({ length: emptySlots }).map((_, index) => (
          <View key={`empty-${index}`} style={styles.slot}>
            <View style={styles.emptyAvatar}>
              <IconSymbol name="plus" size={32} color="#9ca3af" />
            </View>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={onCreateInvite}
            >
              <Text style={styles.linkButtonText}>Link</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  slotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  slot: {
    alignItems: 'center',
    width: 80,
  },
  filledAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  friendName: {
    fontSize: 12,
    color: '#000',
    textAlign: 'center',
  },
  linkButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  linkButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
});
