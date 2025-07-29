import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getUserJournals, getCurrentUser, signInAnonymously, getUserJournalCount, insertTestJournalData, checkAndGenerateMirror } from '../../lib/supabase';
import { MirrorProgress } from '../../components/journal/MirrorProgress';

export default function MirrorScreen() {
  const router = useRouter();
  const { journalText, timestamp, mirrorReflection } = useLocalSearchParams();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [journalCount, setJournalCount] = useState(0);
  const [testLoading, setTestLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadJournals();
  }, []);

  // Reload journals whenever the screen comes into focus (e.g., returning from Journal tab)
  useFocusEffect(
    React.useCallback(() => {
      loadJournals();
    }, [])
  );

  const loadJournals = async () => {
    try {
      // First, try to get the current user session (this should persist between tabs)
      let userResult = await getCurrentUser();
      
      // Only sign in anonymously if there's truly no session
      if (!userResult.success || !userResult.user) {
        userResult = await signInAnonymously();
      }
      
      if (userResult.success && userResult.user) {
        setCurrentUser(userResult.user); // Store current user
        
        // Load both journals and journal count
        const [journalsResult, countResult] = await Promise.all([
          getUserJournals(userResult.user.id),
          getUserJournalCount(userResult.user.id)
        ]);
        
        if (journalsResult.success) {
          setJournals(journalsResult.data);
        } else {
          console.error('Failed to load journals:', journalsResult.error);
          Alert.alert('Error', 'Failed to load journal entries. Please try again.');
        }
        
        if (countResult.success) {
          setJournalCount(countResult.count);
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

  // TEST FUNCTIONS - Remove after testing
  const handleInsertTestData = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please wait for user authentication to complete.');
      return;
    }

    setTestLoading(true);
    try {
      const result = await insertTestJournalData(currentUser.id);
      
      if (result.success) {
        Alert.alert('Success', `Inserted ${result.data.length} test journal entries!`);
        // Reload journals and count
        await loadJournals();
      } else {
        Alert.alert('Error', `Failed to insert test data: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Unexpected error: ${error.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  const handleGenerateMirror = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please wait for user authentication to complete.');
      return;
    }

    setTestLoading(true);
    try {
      const result = await checkAndGenerateMirror(currentUser.id);
      
      if (result.success) {
        Alert.alert('Success!', '🎉 Mirror generated successfully! Check console for details.');
        console.log('🪩 Generated Mirror Content:', result.content);
        // Reload to show updated data
        await loadJournals();
      } else {
        Alert.alert('Mirror Generation Failed', result.error);
      }
    } catch (error) {
      Alert.alert('Error', `Unexpected error: ${error.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>
            Mirror
          </Text>
          
          {/* Progress to Next Mirror - moved to top */}
          <View style={styles.progressSection}>
            <MirrorProgress currentCount={journalCount} />
          </View>

          {/* TEST BUTTONS - Remove after testing */}
          <View style={styles.testSection}>
            <Text style={styles.testTitle}>🧪 Mirror Generation Test</Text>
            
            <TouchableOpacity 
              style={styles.testButton}
              onPress={handleInsertTestData}
              disabled={testLoading}
            >
              <Text style={styles.testButtonText}>
                {testLoading ? 'Inserting...' : '📝 Insert 15 Test Journals'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.testButton}
              onPress={handleGenerateMirror}
              disabled={testLoading}
            >
              <Text style={styles.testButtonText}>
                {testLoading ? 'Generating...' : '✨ Generate Mirror with AI'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.testNote}>
              Current count: {journalCount}/15 journals
            </Text>
          </View>
          
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
  progressSection: {
    marginBottom: 32,
  },
  testSection: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  testTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 12,
    textAlign: 'center',
  },
  testButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  testNote: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
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