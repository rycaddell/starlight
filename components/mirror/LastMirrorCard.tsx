// components/mirror/LastMirrorCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface LastMirrorCardProps {
  mirrorId: string;
  mirrorDate: Date;
  biblicalCharacter?: string;
  reflectionFocus?: string;
  onViewMirror: () => void;
  onSharePress?: () => void;
  isCheckingFriends?: boolean;
  hideShareButton?: boolean;
  hideYourFocus?: boolean;
}

export const LastMirrorCard: React.FC<LastMirrorCardProps> = ({
  mirrorDate,
  biblicalCharacter,
  reflectionFocus,
  onViewMirror,
  onSharePress,
  isCheckingFriends = false,
  hideShareButton = false,
  hideYourFocus = false,
}) => {
  return (
    <View style={styles.card}>
      {/* Date Title */}
      <Text style={styles.dateTitle}>
        {mirrorDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
      </Text>

      {/* Biblical Mirror */}
      {biblicalCharacter && (
        <Text style={styles.biblicalMirror}>
          Biblical Mirror: <Text style={styles.characterName}>{biblicalCharacter}</Text>
        </Text>
      )}

      {/* Your Focus */}
      {!hideYourFocus && reflectionFocus && (
        <View style={styles.focusSection}>
          <Text style={styles.focusLabel}>Your Focus</Text>
          <Text style={styles.focusText}>{reflectionFocus}</Text>
        </View>
      )}

      {/* Buttons */}
      <View style={styles.buttonRow}>
        {!hideShareButton && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={onSharePress}
            disabled={isCheckingFriends}
          >
            <Text style={styles.shareButtonText}>
              {isCheckingFriends ? 'Loading...' : 'Share'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.viewButton, hideShareButton && styles.viewButtonFullWidth]}
          onPress={onViewMirror}
        >
          <Text style={styles.viewButtonText}>View Mirror</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  biblicalMirror: {
    fontSize: 16,
    fontWeight: '400',
    color: '#64748b',
    marginBottom: 16,
  },
  characterName: {
    fontWeight: '600',
    color: '#1e293b',
  },
  focusSection: {
    marginBottom: 20,
  },
  focusLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  focusText: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  viewButton: {
    flex: 1,
    backgroundColor: '#fbbf24',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonFullWidth: {
    flex: undefined,
    width: '100%',
  },
  viewButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
});
