// components/mirror/PastJournalsModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, Image, ScrollView, StyleSheet, Alert } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

interface Journal {
  id: string;
  date: Date;
  content: string;
}

interface PastJournalsModalProps {
  visible: boolean;
  onClose: () => void;
  journals: Journal[];
  onJournalPress?: (journalId: string) => void;
  onDelete?: (journalId: string) => void;
}

const ExpandableJournalCard: React.FC<{ journal: Journal; onDelete?: (journalId: string) => void }> = ({ journal, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const [measuring, setMeasuring] = useState(true);

  const formattedDate = journal.date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    setMeasuring(true);
    setNeedsTruncation(false);
  }, [journal.content]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Journal Entry',
      'Are you sure you want to delete this journal entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(journal.id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => needsTruncation ? setExpanded(!expanded) : undefined}
      activeOpacity={needsTruncation ? 0.7 : 1}
    >
      {onDelete && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Image
            source={require('@/assets/images/icons/Close.png')}
            style={styles.deleteIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      )}

      <Text style={styles.timestamp}>{formattedDate}</Text>

      <Text
        key={measuring ? 'measuring' : 'measured'}
        style={styles.content}
        numberOfLines={measuring || expanded ? undefined : 3}
        onTextLayout={(e) => {
          if (measuring) {
            const lineCount = e.nativeEvent.lines.length;
            setNeedsTruncation(lineCount > 3);
            setMeasuring(false);
          }
        }}
      >
        {journal.content}
      </Text>

      {!measuring && needsTruncation && (
        <Text style={styles.readMoreLink}>
          {expanded ? 'Show less' : 'Read more'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

export const PastJournalsModal: React.FC<PastJournalsModalProps> = ({
  visible,
  onClose,
  journals,
  onDelete,
}) => {
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
          <Text style={styles.headerTitle}>Past Journals</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
            <Image
              source={require('@/assets/images/icons/Close.png')}
              style={styles.closeIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {journals.map((journal) => (
            <ExpandableJournalCard key={journal.id} journal={journal} onDelete={onDelete} />
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
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.xxl,
    gap: spacing.m,
    borderWidth: 1,
    borderColor: colors.border.divider,
  },
  deleteButton: {
    position: 'absolute',
    top: spacing.l,
    right: spacing.l,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background.disabled,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  deleteIcon: {
    width: 12,
    height: 12,
  },
  timestamp: {
    ...typography.heading.l,
    color: colors.text.body,
  },
  content: {
    ...typography.body.default,
    color: colors.text.body,
    lineHeight: 24,
  },
  readMoreLink: {
    ...typography.body.s,
    color: colors.text.primary,
    lineHeight: 18,
  },
});
