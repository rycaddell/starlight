// app/(tabs)/mirror.tsx - Complete integration
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getUserJournals, 
  getCurrentUser, 
  signInAnonymously, 
  getUserJournalCount, 
  checkAndGenerateMirror,
  insertTestJournalData // Remove this import when done testing
} from '../../lib/supabase';
import { MirrorProgress } from '../../components/journal/MirrorProgress';
import { MirrorUnlockButton } from '../../components/mirror/MirrorUnlockButton';
import { MirrorLoadingAnimation } from '../../components/mirror/MirrorLoadingAnimation';
import { MirrorViewer } from '../../components/mirror/MirrorViewer';

type MirrorState = 'progress' | 'ready' | 'generating' | 'viewing';

export default function MirrorScreen() {
  const router = useRouter();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [journalCount, setJournalCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [mirrorState, setMirrorState] = useState<MirrorState>('progress');
  const [generatedMirror, setGeneratedMirror] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  // Add auth hook
  const { signOut, user } = useAuth();

  useEffect(() => {
    loadJournals();
  }, []);

  // Reload journals whenever the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadJournals();
    }, [])
  );

  // Add temporary logout function
  const handleTempLogout = () => {
    Alert.alert(
      '🚪 Test Logout',
      'This will sign you out to test the code entry screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut }
      ]
    );
  };

  const loadJournals = async () => {
    try {
      let userResult = await getCurrentUser();
      
      if (!userResult.success || !userResult.user) {
        userResult = await signInAnonymously();
      }
      
      if (userResult.success && userResult.user) {
        setCurrentUser(userResult.user);
        
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
          // Update mirror state based on journal count
          if (countResult.count >= 15) {
            setMirrorState('ready');
          } else {
            setMirrorState('progress');
          }
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

  const handleGenerateMirror = async () => {
    if (!currentUser) {
      Alert.alert('Error', 'Please wait for user authentication to complete.');
      return;
    }

    setMirrorState('generating');
    
    try {
      console.log('🚀 Starting Mirror generation...');
      const result = await checkAndGenerateMirror(currentUser.id);
      
      if (result.success) {
        console.log('✅ Mirror generation successful!');
        console.log('🪩 Generated Mirror Content:', result.content);
        setGeneratedMirror(result.content);
        // AI is done, but let loading animation finish naturally
      } else {
        console.error('❌ Mirror generation failed:', result.error);
        Alert.alert('Mirror Generation Failed', result.error);
        setMirrorState('ready'); // Go back to ready state
      }
    } catch (error) {
      console.error('💥 Error during Mirror generation:', error);
      Alert.alert('Error', `Unexpected error: ${error.message}`);
      setMirrorState('ready'); // Go back to ready state
    }
  };

  const handleLoadingComplete = () => {
    console.log('🎬 Loading animation completed');
    if (generatedMirror) {
      console.log('✨ Transitioning to Mirror viewer');
      setMirrorState('viewing');
    } else {
      console.log('⏳ AI still processing, waiting...');
      // AI hasn't finished yet, stay in loading state
      // We could add a timeout here or keep waiting
    }
  };

  const handleCloseMirror = () => {
    setMirrorState('progress');
    setGeneratedMirror(null);
    // Reload to show updated progress (journals now have mirror_id)
    loadJournals();
  };

  const handleGoBack = () => {
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

  // Show Mirror Viewer as full screen modal
  if (mirrorState === 'viewing' && generatedMirror) {
    return (
      <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
        <MirrorViewer 
          mirrorContent={generatedMirror} 
          onClose={handleCloseMirror}
        />
      </Modal>
    );
  }

  // Show Loading Animation as full screen modal
  if (mirrorState === 'generating') {
    return (
      <Modal visible={true} animationType="fade" presentationStyle="overFullScreen">
        <MirrorLoadingAnimation 
          isComplete={!!generatedMirror} 
          onComplete={handleLoadingComplete} 
        />
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Mirror</Text>
          
          {/* 🧪 TEMPORARY: Logout Button - Remove after testing */}
          <TouchableOpacity 
            style={styles.tempLogoutButton}
            onPress={handleTempLogout}
          >
            <Text style={styles.tempLogoutButtonText}>🧪 Test Logout</Text>
          </TouchableOpacity>
          
          {/* Progress to Next Mirror */}
          <View style={styles.progressSection}>
            <MirrorProgress currentCount={journalCount} />
          </View>

          {/* Mirror Ready State */}
          {mirrorState === 'ready' && (
            <View style={styles.mirrorReadySection}>
              <MirrorUnlockButton 
                onPress={handleGenerateMirror}
                disabled={false}
              />
            </View>
          )}

          {/* TEST SECTION - Remove after testing */}
          <View style={styles.testSection}>
            <Text style={styles.testTitle}>🧪 Testing (Remove Later)</Text>
            
            <TouchableOpacity 
              style={styles.testButton}
              onPress={handleInsertTestData}
              disabled={testLoading}
            >
              <Text style={styles.testButtonText}>
                {testLoading ? 'Inserting...' : '📝 Insert 15 Test Journals'}
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
                      {new Date(journal.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
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
    backgroundColor: '#f8fafc',
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
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 24,
  },
  // 🧪 TEMPORARY: Test button styles - Remove after testing
  tempLogoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 16,
    alignSelf: 'center',
  },
  tempLogoutButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 32,
  },
  mirrorReadySection: {
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
    color: '#334155',
    marginBottom: 16,
  },
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
  readMoreText: {
    fontSize: 14,
    color: '#6366f1',
    fontStyle: 'italic',
    marginTop: 8,
  },
  backButton: {
    backgroundColor: '#475569',
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