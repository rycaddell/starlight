// components/friends/FriendMirrorsModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LastMirrorCard } from '@/components/mirror/LastMirrorCard';
import { Avatar } from '@/components/ui/Avatar';

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
              profilePictureUrl={profilePictureUrl}
              displayName={friendName}
              size={44}
            />
            <Text style={styles.headerTitle}>{friendName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Instruction Text */}
        <View style={styles.instructionContainer}>
          <Text style={styles.instructionText}>
            Take a moment to pray for {friendName}. How is God leading you to be a friend to them?
          </Text>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {mirrors.map((share) => {
            return (
              <LastMirrorCard
                key={share.shareId}
                mirrorId={share.mirror.id}
                mirrorDate={new Date(share.mirror.created_at)}
                biblicalCharacter={getBiblicalCharacter(share)}
                onViewMirror={() => onMirrorPress(share)}
                hideShareButton={true}
                hideYourFocus={true}
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: 'bold',
  },
  instructionContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  instructionText: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
    textAlign: 'left',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
});
