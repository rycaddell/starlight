// components/mirror/PastMirrorsModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import { Card } from '@/components/ui/Card';
import { colors, typography, spacing } from '@/theme/designTokens';

interface Mirror {
  id: string;
  date: Date;
  biblicalCharacter?: string;
  reflectionFocus?: string;
}

interface PastMirrorsModalProps {
  visible: boolean;
  onClose: () => void;
  mirrors: Mirror[];
  onViewMirror: (mirrorId: string) => void;
  onSharePress: (mirrorId: string) => void;
  checkingFriends?: Record<string, boolean>;
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const PastMirrorsModal: React.FC<PastMirrorsModalProps> = ({
  visible,
  onClose,
  mirrors,
  onViewMirror,
}) => {
  console.log('📋 [PAST_MIRRORS_MODAL] Rendering with visible:', visible);
  console.log('📋 [PAST_MIRRORS_MODAL] Mirrors count:', mirrors.length);

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
          <Text style={styles.headerTitle}>Past Mirrors</Text>
          <TouchableOpacity
            onPress={() => {
              console.log('✕ [PAST_MIRRORS_MODAL] Close button pressed');
              onClose();
            }}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Image
              source={require('@/assets/images/icons/Close.png')}
              style={styles.closeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Mirror cards */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {mirrors.map((mirror) => (
            <Card
              key={mirror.id}
              variant="mirror"
              date={formatDate(mirror.date)}
              isNew={false}
              title={mirror.biblicalCharacter || 'Mirror'}
              onViewPress={() => {
                console.log('👁️ [PAST_MIRRORS_MODAL] View pressed for mirror:', mirror.id);
                onViewMirror(mirror.id);
              }}
            />
          ))}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screen.horizontalPadding,
    paddingVertical: spacing.xl,
    backgroundColor: colors.background.card,
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
  divider: {
    height: 1,
    backgroundColor: colors.border.divider,
  },
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
