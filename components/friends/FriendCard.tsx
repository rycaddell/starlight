// components/friends/FriendCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

export type FriendCardState = 'new' | 'no_mirrors' | 'unread' | 'read';

interface FriendCardProps {
  friendId: string;
  friendName: string;
  profilePictureUrl?: string | null;
  state: FriendCardState;
  mirrorCount?: number;
  onPress?: () => void;
}

// Derive 1-2 initials from a display name
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

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
        return null;
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
          size="small"
          imageUri={profilePictureUrl ?? undefined}
          initials={getInitials(friendName)}
        />

        {/* Friend info */}
        <View style={[styles.info, !hasSubtitle && styles.infoCentered]}>
          <Text style={styles.name}>{friendName}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {/* VIEW button - only for unread and read states */}
        {showViewButton && (
          <View style={[styles.viewButton, state === 'unread' && styles.viewButtonUnread]}>
            <Text style={styles.viewButtonText}>View</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.card,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.screen.horizontalPadding,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.divider,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  infoCentered: {
    justifyContent: 'center',
  },
  name: {
    ...typography.heading.default,
    color: colors.text.body,
  },
  subtitle: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  viewButton: {
    backgroundColor: colors.text.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.button,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 36,
  },
  viewButtonUnread: {
    backgroundColor: colors.background.accent,
  },
  viewButtonText: {
    ...typography.heading.xs,
    color: colors.text.white,
    lineHeight: 18,
  },
});
