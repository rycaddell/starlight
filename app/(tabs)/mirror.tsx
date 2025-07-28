import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MirrorCard from '../../components/MirrorCard';
import { getUserJournals, getCurrentUser, signInAnonymously } from '../../lib/supabase';

export default function MirrorScreen() {
  const router = useRouter();
  const { journalText, timestamp, mirrorReflection } = useLocalSearchParams();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadJournals();
  }, []);

  const loadJournals = async () => {
    try {
      // Use the same auth approach as Journal screen
      let userResult = await getCurrentUser();
      
      // If no current user, sign in anonymously like Journal screen does
      if (!userResult.success || !userResult.user) {
        userResult = await signInAnonymously();
      }
      
      if (userResult.success && userResult.user) {
        const journalsResult = await getUserJournals(userResult.user.id);
        
        if (journalsResult.success) {
          setJournals(journalsResult.data);
        } else {
          console.error('Failed to load journals:', journalsResult.error);
          Alert.alert('Error', 'Failed to load journal entries. Please try again.');
        }
      } else {
        console.error('Authentication failed in Mirror screen');
        Alert.alert('Authentication Error', 'Please restart the app to sign in.');
      }
    } catch (error) {
      console.error('Error loading journals:', error);
      Alert.alert('Error', 'Something went wrong loading your journals.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleGoBack = () => {
    // Navigate back to Journal tab
    router.push('/(tabs)/');
  };

  // Show current entry if navigated from journal submission
  const showCurrentEntry = journalText && timestamp;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>
            ✨ Your Spiritual Journey
          </Text>
          
          {/* Show current entry if just submitted */}
          {showCurrentEntry && (
            <View style={styles.currentEntrySection}>
              <Text style={styles.sectionTitle}>Latest Entry</Text>
              <MirrorCard 
                journalText={journalText as string} 
                mirrorText={mirrorReflection as string}
                timestamp={timestamp as string}
              />
            </View>
          )}
          
          {/* Journal History */}
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>
              Journal History ({journals.length} {journals.length === 1 ? 'entry' : 'entries'})
            </Text>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading your journals...</Text>
              </View>
            ) : journals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No journal entries yet. 
                </Text>
                <Text style={styles.emptySubtext}>
                  Start writing to see your spiritual journey unfold!
                </Text>
              </View>
            ) : (
              <View style={styles.journalList}>
                {journals.map((journal, index) => (
                  <View key={journal.id} style={styles.journalEntry}>
                    <Text style={styles.journalDate}>
                      {formatDate(journal.created_at)}
                    </Text>
                    <Text style={styles.journalContent} numberOfLines={4}>
                      {journal.content}
                    </Text>
                    {journal.content.length > 200 && (
                      <Text style={styles.readMoreText}>
                        Tap to read full entry...
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Back to Journal button */}
          <TouchableOpacity 
            onPress={handleGoBack}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>
              ← Back to Journal
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc', // slate-50
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b', // slate-800
    textAlign: 'center',
    marginBottom: 24,
  },
  currentEntrySection: {
    marginBottom: 32,
  },
  historySection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155', // slate-700
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b', // slate-500
    textAlign: 'center',
    fontStyle: 'italic',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#64748b', // slate-500
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#94a3b8', // slate-400
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
    borderColor: '#e2e8f0', // slate-200
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
    color: '#64748b', // slash-500
    marginBottom: 8,
    fontWeight: '500',
  },
  journalContent: {
    fontSize: 16,
    color: '#334155', // slate-700
    lineHeight: 24,
  },
  readMoreText: {
    fontSize: 14,
    color: '#6366f1', // indigo-500
    fontStyle: 'italic',
    marginTop: 8,
  },
  backButton: {
    backgroundColor: '#475569', // slate-600
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 18,
  },
});