// components/mirror/PastMirrorsModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { LastMirrorCard } from './LastMirrorCard';

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

export const PastMirrorsModal: React.FC<PastMirrorsModalProps> = ({
  visible,
  onClose,
  mirrors,
  onViewMirror,
  onSharePress,
  checkingFriends = {},
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
          <TouchableOpacity onPress={() => {
            console.log('✕ [PAST_MIRRORS_MODAL] Close button pressed');
            onClose();
          }} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {mirrors.map((mirror) => (
            <LastMirrorCard
              key={mirror.id}
              mirrorId={mirror.id}
              mirrorDate={mirror.date}
              biblicalCharacter={mirror.biblicalCharacter}
              reflectionFocus={mirror.reflectionFocus}
              onViewMirror={() => {
                console.log('👁️ [PAST_MIRRORS_MODAL] View pressed for mirror:', mirror.id);
                onViewMirror(mirror.id);
              }}
              onSharePress={() => {
                console.log('📤 [PAST_MIRRORS_MODAL] Share pressed for mirror:', mirror.id);
                onSharePress(mirror.id);
              }}
              isCheckingFriends={checkingFriends[mirror.id] || false}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
});
