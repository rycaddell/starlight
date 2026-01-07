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
  const maxSlots = 6;
  const emptySlots = maxSlots - friends.length;

  // Split into two rows of 3
  const slotsPerRow = 3;
  const allSlots = [
    ...friends.map((friend, idx) => ({ type: 'friend', friend, key: friend.linkId })),
    ...Array.from({ length: emptySlots }).map((_, idx) => ({ type: 'empty', key: `empty-${idx}` }))
  ];

  const row1 = allSlots.slice(0, slotsPerRow);
  const row2 = allSlots.slice(slotsPerRow);

  const renderSlot = (slot: any) => {
    if (slot.type === 'friend') {
      return (
        <View key={slot.key} style={styles.slot}>
          <View style={styles.filledAvatar}>
            <Text style={styles.avatarText}>
              {slot.friend.displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.friendName} numberOfLines={1}>
            {slot.friend.displayName}
          </Text>
        </View>
      );
    } else {
      return (
        <View key={slot.key} style={styles.slot}>
          <TouchableOpacity
            style={styles.emptyAvatar}
            onPress={onCreateInvite}
          >
            <IconSymbol name="plus" size={32} color="#9ca3af" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={onCreateInvite}
          >
            <Text style={styles.linkButtonText}>Link</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Row 1 */}
      <View style={styles.slotsContainer}>
        {row1.map(renderSlot)}
      </View>

      {/* Row 2 */}
      {row2.length > 0 && (
        <View style={[styles.slotsContainer, styles.row2]}>
          {row2.map(renderSlot)}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
  },
  slotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  row2: {
    marginTop: 24,
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
