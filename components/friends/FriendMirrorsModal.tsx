// components/friends/FriendMirrorsModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Image } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { colors, typography, spacing } from '@/theme/designTokens';

interface MirrorShare {
  shareId: string;
  mirror: {
    id: string;
    created_at: string;
    screen_2_biblical?: any;
  };
  isNew: boolean;
}

interface FriendMirrorsModalProps {
  visible: boolean;
  onClose: () => void;
  friendName: string;
  profilePictureUrl?: string | null;
  mirrors: MirrorShare[];
  onMirrorPress: (share: MirrorShare) => void;
}

// Derive 1-2 initials from a display name
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const FriendMirrorsModal: React.FC<FriendMirrorsModalProps> = ({
  visible,
  onClose,
  friendName,
  profilePictureUrl,
  mirrors,
  onMirrorPress,
}) => {
  const getBiblicalCharacter = (share: MirrorShare): string | undefined => {
    try {
      const biblical = typeof share.mirror.screen_2_biblical === 'string'
        ? JSON.parse(share.mirror.screen_2_biblical)
        : share.mirror.screen_2_biblical;
      return biblical?.parallel_story?.character;
    } catch (e) {
      return undefined;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Avatar
              size="small"
              imageUri={profilePictureUrl ?? undefined}
              initials={getInitials(friendName)}
            />
            <Text style={styles.headerTitle}>{friendName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Image
              source={require('@/assets/images/icons/Close.png')}
              style={styles.closeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        {/* Instruction text */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Take a moment to pray for {friendName}.
          </Text>
          <Text style={styles.instructionText}>
            How is God leading you to be a friend to them?
          </Text>
        </View>

        {/* Divider — bg switches to screen color below */}
        <View style={styles.divider} />

        {/* Mirror cards */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {mirrors.map((share) => {
            const character = getBiblicalCharacter(share);
            return (
              <Card
                key={share.shareId}
                variant="mirror"
                date={formatDate(share.mirror.created_at)}
                isNew={share.isNew}
                title={character || 'Mirror'}
                onViewPress={() => onMirrorPress(share)}
              />
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.card,
  },

  // Header — white background
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen.horizontalPadding,
    paddingVertical: spacing.xl,
    backgroundColor: colors.background.card,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  headerTitle: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.defaultLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    width: 12,
    height: 12,
  },

  // Instruction — white background
  instructionContainer: {
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.screen.horizontalPadding,
    paddingBottom: spacing.xl,
  },
  instructionText: {
    ...typography.body.default,
    color: colors.text.bodyLight,
    lineHeight: 24,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border.divider,
  },

  // Mirror list — screen background
  scrollView: {
    flex: 1,
    backgroundColor: colors.background.screen,
  },
  scrollContent: {
    padding: spacing.screen.horizontalPadding,
    gap: spacing.xl,
    paddingBottom: 40,
  },
});
