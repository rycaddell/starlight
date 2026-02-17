// components/mirror/LastJournalCard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { colors, typography, spacing, borderRadius } from '@/theme/designTokens';

interface LastJournalCardProps {
  journalId: string;
  journalDate: Date;
  content: string;
  onDelete?: (journalId: string) => void;
}

export const LastJournalCard: React.FC<LastJournalCardProps> = ({
  journalId,
  journalDate,
  content,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const [measuring, setMeasuring] = useState(true);

  const formattedDate = journalDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  useEffect(() => {
    setMeasuring(true);
    setNeedsTruncation(false);
  }, [content]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Journal Entry',
      'Are you sure you want to delete this journal entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(journalId),
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
        {content}
      </Text>

      {!measuring && needsTruncation && (
        <Text style={styles.readMoreLink}>
          {expanded ? 'Show less' : 'Read more'}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
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
