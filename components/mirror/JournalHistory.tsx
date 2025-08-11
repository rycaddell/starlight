import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Journal {
  id: string;
  content: string;
  created_at: string;
  mirror_id?: string;
}

interface JournalHistoryProps {
  journals: Journal[];
  loading: boolean;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  journals,
  loading
}) => {
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const toggleExpanded = (journalId: string) => {
    setExpandedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(journalId)) {
        newSet.delete(journalId);
      } else {
        newSet.add(journalId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your journals...</Text>
      </View>
    );
  }

  if (journals.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No journal entries yet.</Text>
        <Text style={styles.emptySubtext}>
          Start writing to see your spiritual journey unfold!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.journalList}>
      {journals.map((journal) => {
        const isExpanded = expandedEntries.has(journal.id);
        const shouldShowReadMore = journal.content.length > 200;
        
        return (
          <TouchableOpacity 
            key={journal.id} 
            style={styles.journalEntry}
            onPress={() => {
              console.log('📖 Journal card tapped:', journal.id, 'shouldShowReadMore:', shouldShowReadMore);
              if (shouldShowReadMore) {
                toggleExpanded(journal.id);
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.journalDate}>
              {new Date(journal.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </Text>
            
            <Text 
              style={styles.journalContent} 
              numberOfLines={isExpanded ? undefined : 4}
            >
              {journal.content}
            </Text>
            
            {shouldShowReadMore && (
              <TouchableOpacity 
                style={styles.readMoreContainer}
                onPress={() => {
                  console.log('📖 Read more tapped:', journal.id);
                  toggleExpanded(journal.id);
                }}
              >
                <Text style={styles.readMoreText}>
                  {isExpanded ? 'Tap to collapse...' : 'Tap to read full entry...'}
                </Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  journalList: {
    gap: 12,
  },
  journalEntry: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  journalDate: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  journalContent: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
  },
  readMoreContainer: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  readMoreText: {
    fontSize: 14,
    color: '#6366f1',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 4,
  },
});