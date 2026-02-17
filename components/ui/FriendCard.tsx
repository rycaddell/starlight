// components/ui/FriendCard.tsx
// Friend Card component for Friends List screen

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '@/theme/designTokens';
import { Avatar } from './Avatar';

export interface FriendCardProps {
  name: string;
  avatarUri?: string;
  initials: string;
  avatarColor?: string;
  mirrorCount?: number;
  messageCount?: number;
  onPress: () => void;
  onMenuPress: () => void;
}

export const FriendCard: React.FC<FriendCardProps> = ({
  name,
  avatarUri,
  initials,
  avatarColor,
  mirrorCount = 0,
  messageCount = 0,
  onPress,
  onMenuPress,
}) => {
  // Format meta text: "1 Mirror • 3 Messages"
  const getMetaText = () => {
    const parts = [];

    if (mirrorCount > 0) {
      parts.push(`${mirrorCount} Mirror${mirrorCount !== 1 ? 's' : ''}`);
    }

    if (messageCount > 0) {
      parts.push(`${messageCount} Message${messageCount !== 1 ? 's' : ''}`);
    }

    return parts.join(' • ');
  };

  const metaText = getMetaText();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left side: Avatar + Content */}
      <View style={styles.leftSide}>
        <Avatar
          size="default"
          imageUri={avatarUri}
          initials={initials}
          backgroundColor={avatarColor}
        />

        <View style={styles.content}>
          <Text style={styles.name}>{name}</Text>
          {metaText && <Text style={styles.meta}>{metaText}</Text>}
        </View>
      </View>

      {/* Right side: Menu button */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={onMenuPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.menuIcon}>⋯</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.white,
    paddingVertical: spacing.l,
    paddingHorizontal: spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.friendCard,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.l,
    flex: 1,
  },
  content: {
    flex: 1,
    gap: spacing.s,
  },
  name: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  meta: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    lineHeight: 18,
  },
  menuButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 24,
    color: colors.text.body,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
