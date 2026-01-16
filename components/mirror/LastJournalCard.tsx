// components/mirror/LastJournalCard.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

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
          <Text style={styles.deleteButtonText}>✕</Text>
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
  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 14,
    fontWeight: '400',
    color: '#64748b',
    marginBottom: 12,
  },
  content: {
    fontSize: 16,
    fontWeight: '400',
    color: '#1e293b',
    lineHeight: 24,
    marginBottom: 12,
  },
  readMoreLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    fontStyle: 'italic',
  },
});
