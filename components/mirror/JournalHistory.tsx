import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface Journal {
  id: string;
  content: string;
  created_at: string;
  mirror_id?: string;
  prompt_text?: string;
}

interface JournalHistoryProps {
  journals: Journal[];
  loading: boolean;
  onDeleteJournal?: (journalId: string) => void; // Add delete handler prop
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  journals,
  loading,
  onDeleteJournal // Add to props
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

  const handleDeletePress = (journalId: string, event: any) => {
    // Stop event from bubbling up to the card tap
    event.stopPropagation();
    
    if (onDeleteJournal) {
      onDeleteJournal(journalId);
    }
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
            {/* Header with date and delete button */}
            <View style={styles.journalHeader}>
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
              
              {/* Delete button - only show if delete handler is provided */}
              {onDeleteJournal && (
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={(event) => handleDeletePress(journal.id, event)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.deleteButtonText}>×</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Prompt text for guided journals */}
            {journal.prompt_text && (
              <Text style={styles.promptText}>
                <Text style={styles.promptTextBold}>"{journal.prompt_text}"</Text>
              </Text>
            )}
            
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
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  journalDate: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    flex: 1,
  },
  promptText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  promptTextBold: {
    fontWeight: '600',
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
  deleteButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc', // very light gray background
    borderWidth: 1,
    borderColor: '#e2e8f0', // light gray border
    marginLeft: 8,
    minWidth: 24,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#64748b', // muted gray color
    fontWeight: '300', // lighter weight for subtlety
    lineHeight: 18,
  },
});