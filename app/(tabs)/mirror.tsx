import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useMirrorData } from '../../hooks/useMirrorData';
import { MirrorProgress } from '../../components/journal/MirrorProgress';
import { MirrorUnlockButton } from '../../components/mirror/MirrorUnlockButton';
import { MirrorLoadingAnimation } from '../../components/mirror/MirrorLoadingAnimation';
import { MirrorViewer } from '../../components/mirror/MirrorViewer';
import { MirrorTestPanel } from '../../components/mirror/MirrorTestPanel';
import { JournalHistory } from '../../components/mirror/JournalHistory';
import { useGlobalSettings } from '../../components/GlobalSettingsContext';
import { getMirrorById } from '../../lib/supabase/mirrors';

export default function MirrorScreen() {
  const router = useRouter();
  const { user, signOut, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Use GlobalSettings instead of local feedback modal state
  const { showSettings } = useGlobalSettings();
  
  const {
    journals,
    loading,
    journalCount,
    mirrorState,
    generatedMirror,
    loadJournals,
    generateMirror,
    insertTestData,
    setMirrorState,
    setGeneratedMirror,
    isReady,
    isGenerating,
    isViewing
  } = useMirrorData();

  // Load journals when component mounts or user changes
  useEffect(() => {
    if (isAuthenticated && user) {
      loadJournals();
    }
  }, [isAuthenticated, user]);

  // Reload journals when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        loadJournals();
      }
    }, [isAuthenticated, user])
  );

  const handleLoadingComplete = () => {
    if (generatedMirror) {
      setMirrorState('viewing');
    }
  };

  const handleCloseMirror = () => {
    setMirrorState('progress');
    setGeneratedMirror(null);
    loadJournals();
  };

  // Handle feedback request from Mirror Screen 4
  const handleMirrorClosedForFeedback = () => {
    console.log('🔄 handleMirrorClosedForFeedback called');
    handleCloseMirror();
    // Small delay to ensure Mirror closes smoothly before opening feedback
    setTimeout(() => {
      console.log('⚙️ Attempting to open settings modal');
      showSettings(); // Use GlobalSettings instead of local state
      console.log('✅ showSettings() called');
    }, 200);
  };

  // Handle opening an existing Mirror
  const handleOpenExistingMirror = async (mirrorId: string) => {
    console.log('🔍 Opening existing Mirror:', mirrorId);
    
    try {
      const result = await getMirrorById(mirrorId);
      
      if (result.success && result.content) {
        console.log('✅ Mirror loaded, opening viewer');
        setGeneratedMirror(result.content);
        setMirrorState('viewing');
      } else {
        console.error('❌ Failed to load Mirror:', result.error);
        Alert.alert('Mirror Not Found', result.error || 'Could not load this Mirror. It may have been deleted.');
      }
    } catch (error) {
      console.error('❌ Error opening Mirror:', error);
      Alert.alert('Error', 'Something went wrong loading the Mirror. Please try again.');
    }
  };

  // Separate journals into recent (no mirror) and completed mirrors
  const recentJournals = journals.filter(journal => !journal.mirror_id);
  
  // Group journals by mirror_id for completed mirrors
  const mirrorGroups = journals
    .filter(journal => journal.mirror_id)
    .reduce((groups, journal) => {
      const mirrorId = journal.mirror_id;
      if (mirrorId && !groups[mirrorId]) {
        groups[mirrorId] = [];
      }
      if (mirrorId) {
        groups[mirrorId].push(journal);
      }
      return groups;
    }, {} as Record<string, typeof journals>);

  // Loading states
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your spiritual journey...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Please sign in to view your Mirror.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Modal states
  if (isViewing) {
    console.log('🔍 About to render MirrorViewer with props:', {
      hasOnClose: !!handleCloseMirror,
      hasOnClosedForFeedback: !!handleMirrorClosedForFeedback
    });
    
    return (
      <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
        <MirrorViewer 
          mirrorContent={generatedMirror} 
          onClose={handleCloseMirror}
          onClosedForFeedback={handleMirrorClosedForFeedback}
        />
      </Modal>
    );
  }

  if (isGenerating) {
    return (
      <Modal visible={true} animationType="fade" presentationStyle="overFullScreen">
        <MirrorLoadingAnimation 
          isComplete={!!generatedMirror} 
          onComplete={handleLoadingComplete} 
        />
      </Modal>
    );
  }

  // Main UI
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Mirror</Text>
          
          {isReady && (
            <View style={styles.mirrorReadySection}>
              <MirrorUnlockButton 
                onPress={generateMirror}
                disabled={false}
              />
            </View>
          )}

          <MirrorTestPanel 
            journalCount={journalCount}
            totalJournals={journals.length}
            onInsertTestData={insertTestData}
          />

          {/* Recent Journals Section */}
          {recentJournals.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.h2Title}>
                Recent Journals
              </Text>
              <View style={styles.tightProgressSection}>
                <MirrorProgress currentCount={journalCount} />
              </View>
              <JournalHistory 
                journals={recentJournals}
                loading={loading}
              />
            </View>
          )}

          {/* Past Mirrors Section */}
          {Object.keys(mirrorGroups).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.h2Title}>
                Past Mirrors
              </Text>
              {Object.entries(mirrorGroups).map(([mirrorId, mirrorJournals]) => {
                // Use the most recent journal's created_at as the mirror date
                const dates = mirrorJournals
                  .map(j => j.created_at ? new Date(j.created_at).getTime() : 0)
                  .filter(time => time > 0);
                const mirrorDate = dates.length > 0 ? Math.max(...dates) : Date.now();
                
                return (
                  <MirrorCard
                    key={mirrorId}
                    mirrorId={mirrorId}
                    mirrorDate={new Date(mirrorDate)}
                    journals={mirrorJournals}
                    onViewMirror={() => handleOpenExistingMirror(mirrorId)}
                  />
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {journals.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No journal entries yet.</Text>
              <Text style={styles.emptySubtext}>
                Start writing to see your spiritual journey unfold!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Mirror Card Component (unchanged)
interface MirrorCardProps {
  mirrorId: string;
  mirrorDate: Date;
  journals: any[];
  onViewMirror: () => void;
}

const MirrorCard: React.FC<MirrorCardProps> = ({ mirrorId, mirrorDate, journals, onViewMirror }) => {
  const [showJournals, setShowJournals] = React.useState(false);

  return (
    <View style={styles.mirrorCard}>
      <View style={styles.mirrorCardHeader}>
        <Text style={styles.mirrorCardTitle}>
          Mirror - {mirrorDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </Text>
        <TouchableOpacity 
          style={styles.viewMirrorButton}
          onPress={onViewMirror}
        >
          <Text style={styles.viewMirrorButtonText}>Open Mirror ✨</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mirrorCardActions}>
        <TouchableOpacity 
          style={styles.viewJournalsButton}
          onPress={() => setShowJournals(!showJournals)}
        >
          <Text style={styles.viewJournalsButtonText}>
            {showJournals ? 'Hide' : 'View'} Journals ({journals.length})
          </Text>
        </TouchableOpacity>
      </View>

      {showJournals && (
        <View style={styles.mirrorJournalsContainer}>
          <JournalHistory 
            journals={journals}
            loading={false}
          />
        </View>
      )}
    </View>
  );
};

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
    marginBottom: 20,
  },
  progressSection: {
    marginBottom: 32,
  },
  tightProgressSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  mirrorReadySection: {
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 16,
  },
  h2Title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
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
  // Mirror Card Styles
  mirrorCard: {
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
  mirrorCardHeader: {
    marginBottom: 16,
  },
  mirrorCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  viewMirrorButton: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  viewMirrorButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  mirrorCardActions: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  viewJournalsButton: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  viewJournalsButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  mirrorJournalsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
});