// components/friends/InviteSheet.tsx
// Modal sheet for creating and sharing friend invite links

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { createInviteLink } from '@/lib/supabase/friends';
import { IconSymbol } from '@/components/ui/IconSymbol';

interface InviteSheetProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export function InviteSheet({
  visible,
  onClose,
  userId,
  userName,
}: InviteSheetProps) {
  const [loading, setLoading] = useState(false);

  const handleCreateInvite = async () => {
    setLoading(true);

    try {
      const result = await createInviteLink(userId, userName);

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create invite link');
        setLoading(false);
        return;
      }

      // Open native share sheet
      const shareResult = await Share.share({
        message: `Join me on Oxbow! Use this link to connect as friends:\n\n${result.deepLink}\n\nThis link expires in 72 hours.`,
        title: 'Join me on Oxbow',
      });

      setLoading(false);

      // Close sheet after sharing
      if (shareResult.action === Share.sharedAction) {
        onClose();
      }
    } catch (error) {
      console.error('Error sharing invite:', error);
      Alert.alert('Error', 'Failed to share invite link');
      setLoading(false);
    }
  };

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
            <Text style={styles.title}>Invite a Friend</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <IconSymbol name="xmark" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <IconSymbol name="person.2.fill" size={48} color="#6366f1" />
            </View>

            <Text style={styles.description}>
              Share a unique invite link with a trusted friend. They'll be able
              to see Mirrors you choose to share with them.
            </Text>

            <View style={styles.expiryNote}>
              <IconSymbol name="clock" size={16} color="#666" />
              <Text style={styles.expiryText}>
                This link expires in 72 hours
              </Text>
            </View>

            {/* Create Invite Button */}
            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreateInvite}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <IconSymbol name="link" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>Create Invite Link</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
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
    paddingBottom: 34, // Account for safe area on iOS
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
  content: {
    padding: 20,
  },
  iconContainer: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  expiryNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 24,
  },
  expiryText: {
    fontSize: 14,
    color: '#666',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});
