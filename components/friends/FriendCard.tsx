// components/friends/FriendCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';

export type FriendCardState = 'new' | 'no_mirrors' | 'unread' | 'read';

interface FriendCardProps {
  friendId: string;
  friendName: string;
  profilePictureUrl?: string | null;
  state: FriendCardState;
  mirrorCount?: number;
  onPress?: () => void;
}

export const FriendCard: React.FC<FriendCardProps> = ({
  friendId,
  friendName,
  profilePictureUrl,
  state,
  mirrorCount = 0,
  onPress,
}) => {
  // Determine if card is tappable
  const isTappable = state === 'unread' || state === 'read';

  // Determine if VIEW button should show
  const showViewButton = state === 'unread' || state === 'read';

  // Determine subtitle text
  const getSubtitle = () => {
    switch (state) {
      case 'new':
        return 'you are now friends';
      case 'no_mirrors':
        return null; // No subtitle
      case 'unread':
        return 'New, unread mirror';
      case 'read':
        return mirrorCount === 1 ? '1 mirror' : `${mirrorCount} mirrors`;
      default:
        return null;
    }
  };

  const subtitle = getSubtitle();
  const hasSubtitle = subtitle !== null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={isTappable ? onPress : undefined}
      activeOpacity={isTappable ? 0.7 : 1}
      disabled={!isTappable}
    >
      <View style={styles.content}>
        {/* Profile Picture */}
        <Avatar
          profilePictureUrl={profilePictureUrl}
          displayName={friendName}
          size={40}
        />

        {/* Friend info */}
        <View style={[styles.info, !hasSubtitle && styles.infoCentered]}>
          <Text style={styles.name}>{friendName}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {/* VIEW button - only for unread and read states */}
        {showViewButton && (
          <View style={[styles.viewButton, state === 'unread' && styles.viewButtonUnread]}>
            <Text style={styles.viewButtonText}>VIEW</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  infoCentered: {
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  viewButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewButtonUnread: {
    backgroundColor: '#f59e0b', // Goldenrod for unread mirrors
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
