// components/mirror/PastJournalsModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';

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
          <Text style={styles.deleteButtonText}>✕</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.timestamp}>{formattedDate}</Text>

      <Text
        key={measuring ? 'measuring' : 'measured'}
        style={expanded ? styles.contentExpanded : styles.content}
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
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

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
  contentExpanded: {
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
