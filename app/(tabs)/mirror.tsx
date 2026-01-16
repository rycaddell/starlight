// TRULY FIXED MIRROR.TSX - Simple focus handling

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useMirrorData } from '../../hooks/useMirrorData';
import { MirrorProgress } from '../../components/journal/MirrorProgress';
import { MirrorStatusCard } from '../../components/mirror/MirrorStatusCard';
import { MirrorViewer } from '../../components/mirror/MirrorViewer';
import { ShareMirrorSheet } from '../../components/mirror/ShareMirrorSheet';
import { MirrorTestPanel } from '../../components/mirror/MirrorTestPanel';
import { JournalHistory } from '../../components/mirror/JournalHistory';
import { LastMirrorCard } from '../../components/mirror/LastMirrorCard';
import { LastJournalCard } from '../../components/mirror/LastJournalCard';
import { PastMirrorsModal } from '../../components/mirror/PastMirrorsModal';
import { PastJournalsModal } from '../../components/mirror/PastJournalsModal';
import { useGlobalSettings } from '../../components/GlobalSettingsContext';
import { getMirrorById } from '../../lib/supabase/mirrors';
import { markMirrorAsViewed } from '../../lib/supabase/mirrors';
import { deleteJournalEntry } from '../../lib/supabase/journals';
import { fetchFriends } from '../../lib/supabase/friends';
import { supabase } from '../../lib/supabase/client';

export default function MirrorScreen() {
  const router = useRouter();
  const { user, signOut, isAuthenticated, isLoading: authLoading } = useAuth();
  
  const { showSettings } = useGlobalSettings();
  
  const [mirrorReflections, setMirrorReflections] = React.useState<Record<string, {focus: string, action: string}>>({});
  const [mirrorDates, setMirrorDates] = React.useState<Record<string, Date>>({});
  const [biblicalCharacters, setBiblicalCharacters] = React.useState<Record<string, string>>({});

  // Modal states
  const [pastMirrorsModalVisible, setPastMirrorsModalVisible] = React.useState(false);
  const [pastJournalsModalVisible, setPastJournalsModalVisible] = React.useState(false);
  const [shareSheetVisible, setShareSheetVisible] = React.useState(false);
  const [selectedMirrorIdForShare, setSelectedMirrorIdForShare] = React.useState<string | null>(null);
  const [checkingFriendsForMirror, setCheckingFriendsForMirror] = React.useState<Record<string, boolean>>({});
  const [shouldRestorePastMirrorsModal, setShouldRestorePastMirrorsModal] = React.useState(false);
  const [shouldRestorePastJournalsModal, setShouldRestorePastJournalsModal] = React.useState(false);

  const {
    journals,
    loading,
    journalCount,
    mirrorState,
    generatedMirror,
    generationStartTime,
    hasViewedCurrentMirror, // ✅ ADD
    loadJournals,
    generateMirror,
    viewMirror,
    closeMirrorViewer,
    insertTestData,
    setMirrorState,
    setGeneratedMirror,
    checkGenerationStatusOnFocus,
    isReady,
    isGenerating,
    isCompleted,
    isViewing
  } = useMirrorData();

  const [currentMirrorId, setCurrentMirrorId] = React.useState<string | null>(null);

  // ✅ Load journals ONCE on mount
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('📚 Initial load of journals');
      loadJournals();
    }
  }, [isAuthenticated, user]);

  // ✅ Check status AND reload journals on focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        console.log('🔍 Mirror tab focused - checking status and reloading journals');
        console.log('📊 Current mirror state before focus check:', { mirrorState, hasViewedCurrentMirror, generatedMirrorId: generatedMirror?.id });
        checkGenerationStatusOnFocus();
        loadJournals(false); // ✅ Allow state updates based on journal count
      }
    }, [isAuthenticated, user, mirrorState, hasViewedCurrentMirror, generatedMirror])
  );

  useEffect(() => {
    const loadMirrorData = async () => {
      const mirrorIds = [...new Set(journals
        .filter(j => j.mirror_id)
        .map(j => j.mirror_id))];

      if (mirrorIds.length === 0) return;

      try {
        const { data, error } = await supabase
          .from('mirrors')
          .select('id, reflection_focus, reflection_action, created_at, screen_2_biblical')
          .in('id', mirrorIds);

        if (!error && data) {
          const reflections: Record<string, {focus: string, action: string}> = {};
          const dates: Record<string, Date> = {};
          const characters: Record<string, string> = {};

          data.forEach(mirror => {
            // Store reflection data
            if (mirror.reflection_focus && mirror.reflection_action) {
              reflections[mirror.id] = {
                focus: mirror.reflection_focus,
                action: mirror.reflection_action
              };
            }

            // Store mirror creation dates
            if (mirror.created_at) {
              dates[mirror.id] = new Date(mirror.created_at);
            }

            // Extract biblical character from screen_2_biblical
            if (mirror.screen_2_biblical) {
              try {
                const biblical = typeof mirror.screen_2_biblical === 'string'
                  ? JSON.parse(mirror.screen_2_biblical)
                  : mirror.screen_2_biblical;
                if (biblical?.parallel_story?.character) {
                  characters[mirror.id] = biblical.parallel_story.character;
                }
              } catch (e) {
                console.error('Error parsing biblical data for mirror:', mirror.id, e);
              }
            }
          });

          setMirrorReflections(reflections);
          setMirrorDates(dates);
          setBiblicalCharacters(characters);
        }
      } catch (error) {
        console.error('Error loading mirror data:', error);
      }
    };

    loadMirrorData();
  }, [journals]);

  const handleViewNewMirror = () => {
    if (generatedMirror) {
      setCurrentMirrorId(generatedMirror.id);
      viewMirror();
    }
  };

  const handleCloseMirror = () => {
    closeMirrorViewer();
    setCurrentMirrorId(null);

    // Restore modals if they were open before viewing a mirror
    if (shouldRestorePastMirrorsModal) {
      setTimeout(() => {
        setPastMirrorsModalVisible(true);
        setShouldRestorePastMirrorsModal(false);
      }, 300);
    }

    if (shouldRestorePastJournalsModal) {
      setTimeout(() => {
        setPastJournalsModalVisible(true);
        setShouldRestorePastJournalsModal(false);
      }, 300);
    }
  };

  const handleMirrorClosedForFeedback = () => {
    console.log('🔄 handleMirrorClosedForFeedback called');
    handleCloseMirror();
    setTimeout(() => {
      console.log('⚙️ Attempting to open settings modal');
      showSettings();
      console.log('✅ showSettings() called');
    }, 200);
  };

  const handleDeleteJournal = async (journalId: string) => {
    try {
      const result = await deleteJournalEntry(journalId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete journal');
      }

      await loadJournals();

      console.log('✅ Journal deleted successfully');

    } catch (error) {
      console.error('❌ Error deleting journal:', error);
      Alert.alert('Error', 'Could not delete journal. Please try again.');
    }
  };

  const handleOpenExistingMirror = async (mirrorId: string, fromModal: 'pastMirrors' | 'pastJournals' | 'none' = 'none') => {
    console.log('🔍 Opening existing Mirror:', mirrorId, 'from:', fromModal);

    // If opening from a modal, hide it temporarily and mark for restoration
    if (fromModal === 'pastMirrors') {
      setPastMirrorsModalVisible(false);
      setShouldRestorePastMirrorsModal(true);
    } else if (fromModal === 'pastJournals') {
      setPastJournalsModalVisible(false);
      setShouldRestorePastJournalsModal(true);
    }

    try {
      const result = await getMirrorById(mirrorId);

      if (result.success && result.mirror) {
        console.log('✅ Mirror loaded, opening viewer');
        setCurrentMirrorId(mirrorId);
        setGeneratedMirror(result.mirror);
        setMirrorState('viewing');

        // ✅ Mark as viewed in database (if not already)
        if (!result.mirror.has_been_viewed) {
          console.log('👁️ Marking existing mirror as viewed in database');
          const markResult = await markMirrorAsViewed(mirrorId);
          if (!markResult.success) {
            console.error('⚠️ Failed to mark mirror as viewed:', markResult.error);
            // Don't block - user can still view the mirror
          }
        }
      } else {
        console.error('❌ Failed to load Mirror:', result.error);
        Alert.alert('Mirror Not Found', result.error || 'Could not load this Mirror. It may have been deleted.');
      }
    } catch (error) {
      console.error('❌ Error opening Mirror:', error);
      Alert.alert('Error', 'Something went wrong loading the Mirror. Please try again.');
    }
  };

  // Handler for share button on last mirror card
  const handleShareLastMirror = async (mirrorId: string) => {
    console.log('🔍 Share button pressed for last mirror:', mirrorId);
    setCheckingFriendsForMirror(prev => ({ ...prev, [mirrorId]: true }));

    try {
      const result = await fetchFriends(user!.id);
      console.log('👥 Friends check result:', result);

      if (result.success && result.friends && result.friends.length > 0) {
        // Has friends - show share sheet
        console.log('✅ Has friends, opening share sheet');
        setSelectedMirrorIdForShare(mirrorId);
        setShareSheetVisible(true);
      } else {
        // No friends - navigate to Friends tab
        console.log('⚠️ No friends, navigating to Friends tab');
        router.push('/(tabs)/friends');
      }
    } catch (error) {
      console.error('❌ Error checking friends:', error);
      Alert.alert('Error', 'Failed to check friends. Please try again.');
    } finally {
      setCheckingFriendsForMirror(prev => ({ ...prev, [mirrorId]: false }));
    }
  };

  const recentJournals = React.useMemo(() =>
    journals.filter(journal => !journal.mirror_id),
    [journals]
  );

  console.log('🔍 Mirror Display State:', {
    mirrorState,
    isReady,
    isGenerating,
    isCompleted,
    isViewing,
    hasViewedCurrentMirror,
    generatedMirrorId: generatedMirror?.id,
    shouldShowCard: (isReady || isGenerating || (isCompleted && !hasViewedCurrentMirror))
  });

  // ✅ UPDATED - Show current mirror in Past Mirrors if it's been viewed
  const mirrorGroups = React.useMemo(() => journals
    .filter(journal => 
      journal.mirror_id != null && 
      (hasViewedCurrentMirror || journal.mirror_id !== generatedMirror?.id)
      // ✅ Show current mirror in Past Mirrors once viewed
    )
    .reduce((groups, journal) => {
      const mirrorId = journal.mirror_id;
      if (mirrorId && !groups[mirrorId]) {
        groups[mirrorId] = [];
      }
      if (mirrorId) {
        groups[mirrorId].push(journal);
      }
      return groups;
    }, {} as Record<string, typeof journals>),
    [journals, hasViewedCurrentMirror, generatedMirror?.id]
  );

  console.log('🔍 Past Mirrors:', {
    totalMirrorGroups: Object.keys(mirrorGroups).length,
    mirrorIds: Object.keys(mirrorGroups)
  });

  // Get the last mirror (most recent)
  const lastMirror = React.useMemo(() => Object.entries(mirrorGroups)
    .sort(([, journalsA], [, journalsB]) => {
      const dateA = mirrorDates[journalsA[0].mirror_id!] || new Date(journalsA[0].created_at);
      const dateB = mirrorDates[journalsB[0].mirror_id!] || new Date(journalsB[0].created_at);
      return dateB.getTime() - dateA.getTime();
    })[0],
    [mirrorGroups, mirrorDates]
  );

  const lastMirrorId = lastMirror?.[0];
  const lastMirrorData = React.useMemo(() => lastMirrorId ? {
    id: lastMirrorId,
    date: mirrorDates[lastMirrorId] || new Date(lastMirror[1][0].created_at),
    biblicalCharacter: biblicalCharacters[lastMirrorId],
    reflectionFocus: mirrorReflections[lastMirrorId]?.focus,
  } : null, [lastMirrorId, lastMirror, mirrorDates, biblicalCharacters, mirrorReflections]);

  // Get all mirrors for the modal (sorted from most recent to oldest)
  const allMirrors = React.useMemo(() => Object.entries(mirrorGroups)
    .map(([mirrorId, journals]) => ({
      id: mirrorId,
      date: mirrorDates[mirrorId] || new Date(journals[0].created_at),
      biblicalCharacter: biblicalCharacters[mirrorId],
      reflectionFocus: mirrorReflections[mirrorId]?.focus,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [mirrorGroups, mirrorDates, biblicalCharacters, mirrorReflections]
  );

  // Get the last journal (most recent) - include ALL journals
  const lastJournalEntry = React.useMemo(() => {
    if (journals.length === 0) return null;
    const sorted = [...journals].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return sorted[0];
  }, [journals]);

  // Get all journals for the modal (sorted from most recent to oldest)
  // Include ALL journals, not just recent ones
  const allJournals = React.useMemo(() => journals
    .map(journal => ({
      id: journal.id,
      date: new Date(journal.created_at),
      content: journal.content,
      mirrorId: journal.mirror_id,
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [journals]
  );

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

  if (isViewing) {
    return (
      <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
        <MirrorViewer 
          mirrorContent={generatedMirror} 
          mirrorId={currentMirrorId || ''} 
          onClose={handleCloseMirror}
          onClosedForFeedback={handleMirrorClosedForFeedback}
        />
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Mirror</Text>
          
          {/* ✅ UPDATED - Only show "Complete" card if not yet viewed */}
          {(isReady || isGenerating || (isCompleted && !hasViewedCurrentMirror)) && (
            <View style={styles.mirrorReadySection}>
              <MirrorStatusCard
                state={isGenerating ? 'generating' : isCompleted ? 'completed' : 'ready'}
                journalCount={journalCount}
                onGeneratePress={generateMirror}
                onViewPress={handleViewNewMirror}
                generationStartTime={generationStartTime}
              />
            </View>
          )}

          {/* Last Mirror Section */}
          {lastMirrorData && (
            <View style={styles.section}>
              <LastMirrorCard
                mirrorId={lastMirrorData.id}
                mirrorDate={lastMirrorData.date}
                biblicalCharacter={lastMirrorData.biblicalCharacter}
                reflectionFocus={lastMirrorData.reflectionFocus}
                onViewMirror={() => handleOpenExistingMirror(lastMirrorData.id)}
                onSharePress={() => handleShareLastMirror(lastMirrorData.id)}
                isCheckingFriends={checkingFriendsForMirror[lastMirrorData.id] || false}
              />

              {allMirrors.length > 1 && (
                <TouchableOpacity onPress={() => setPastMirrorsModalVisible(true)}>
                  <Text style={styles.viewAllLink}>View past Mirrors</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Last Journal Section */}
          {lastJournalEntry && (
            <View style={styles.section}>
              <Text style={styles.h2Title}>Last journal</Text>

              <LastJournalCard
                journalId={lastJournalEntry.id}
                journalDate={new Date(lastJournalEntry.created_at)}
                content={lastJournalEntry.content}
                onDelete={handleDeleteJournal}
              />

              {allJournals.length > 1 && (
                <TouchableOpacity onPress={() => setPastJournalsModalVisible(true)}>
                  <Text style={styles.viewAllLink}>View past Journals</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <PastMirrorsModal
        visible={pastMirrorsModalVisible}
        onClose={() => setPastMirrorsModalVisible(false)}
        mirrors={allMirrors}
        onViewMirror={(mirrorId) => handleOpenExistingMirror(mirrorId, 'pastMirrors')}
        onSharePress={handleShareLastMirror}
        checkingFriends={checkingFriendsForMirror}
      />

      <PastJournalsModal
        visible={pastJournalsModalVisible}
        onClose={() => setPastJournalsModalVisible(false)}
        journals={allJournals}
        onDelete={handleDeleteJournal}
      />

      {/* Share Mirror Sheet */}
      {selectedMirrorIdForShare && (
        <ShareMirrorSheet
          visible={shareSheetVisible}
          onClose={() => {
            setShareSheetVisible(false);
            setSelectedMirrorIdForShare(null);
          }}
          userId={user.id}
          mirrorId={selectedMirrorIdForShare}
          onShareSuccess={() => {
            console.log('✅ Mirror shared successfully');
          }}
        />
      )}
    </SafeAreaView>
  );
}

// Rest of component (MirrorCard, ReflectionDisplay, styles) - unchanged
interface MirrorCardProps {
  mirrorId: string;
  mirrorDate: Date;
  journals: any[];
  onViewMirror: () => void;
  onDeleteJournal: (journalId: string) => void;
  reflectionFocus?: string;
  reflectionAction?: string;
  userId: string;
}

interface ReflectionDisplayProps {
  focus: string;
  action: string;
}

const ReflectionDisplay: React.FC<ReflectionDisplayProps> = ({ focus, action }) => {
  const [showFullFocus, setShowFullFocus] = useState(false);
  const [showFullAction, setShowFullAction] = useState(false);

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const needsFocusTruncation = focus.length > 150;
  const needsActionTruncation = action.length > 150;

  return (
    <View style={styles.reflectionContainer}>
      <Text style={styles.reflectionHeader}>Your Reflection</Text>
      
      <View style={styles.reflectionBlock}>
        <Text style={styles.reflectionLabel}>My Focus:</Text>
        <Text style={styles.reflectionText}>
          {showFullFocus || !needsFocusTruncation ? focus : truncate(focus, 150)}
        </Text>
        {needsFocusTruncation && (
          <TouchableOpacity onPress={() => setShowFullFocus(!showFullFocus)}>
            <Text style={styles.readMoreText}>
              {showFullFocus ? 'Show less' : 'Read more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.reflectionBlock}>
        <Text style={styles.reflectionLabel}>My Action Step:</Text>
        <Text style={styles.reflectionText}>
          {showFullAction || !needsActionTruncation ? action : truncate(action, 150)}
        </Text>
        {needsActionTruncation && (
          <TouchableOpacity onPress={() => setShowFullAction(!showFullAction)}>
            <Text style={styles.readMoreText}>
              {showFullAction ? 'Show less' : 'Read more'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const MirrorCard: React.FC<MirrorCardProps> = ({
  mirrorId,
  mirrorDate,
  journals,
  onViewMirror,
  onDeleteJournal,
  reflectionFocus,
  reflectionAction,
  userId
}) => {
  const router = useRouter();
  const [showJournals, setShowJournals] = React.useState(false);
  const [shareSheetVisible, setShareSheetVisible] = React.useState(false);
  const [checkingFriends, setCheckingFriends] = React.useState(false);

  const handleSharePress = async () => {
    console.log('🔍 Share button pressed for mirror:', mirrorId);
    setCheckingFriends(true);

    try {
      const result = await fetchFriends(userId);
      console.log('👥 Friends check result:', result);

      if (result.success && result.friends && result.friends.length > 0) {
        // Has friends - show share sheet
        console.log('✅ Has friends, opening share sheet');
        setShareSheetVisible(true);
      } else {
        // No friends - navigate to Friends tab
        console.log('⚠️ No friends, navigating to Friends tab');
        router.push('/(tabs)/friends');
      }
    } catch (error) {
      console.error('❌ Error checking friends:', error);
      Alert.alert('Error', 'Failed to check friends. Please try again.');
    } finally {
      setCheckingFriends(false);
    }
  };

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
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.viewMirrorButton}
            onPress={onViewMirror}
          >
            <Text style={styles.viewMirrorButtonText}>Open Mirror ✨</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleSharePress}
            disabled={checkingFriends}
          >
            <Text style={styles.shareButtonText}>
              {checkingFriends ? 'Loading...' : 'Share'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {reflectionFocus && reflectionAction && (
        <ReflectionDisplay
          focus={reflectionFocus}
          action={reflectionAction}
        />
      )}

      <View style={styles.mirrorCardActions}>
        <TouchableOpacity
          onPress={() => setShowJournals(!showJournals)}
        >
          <Text style={styles.viewJournalsLink}>
            {showJournals ? 'Hide' : 'View'} Journals
          </Text>
        </TouchableOpacity>
      </View>

      {showJournals && (
        <View style={styles.mirrorJournalsContainer}>
          <JournalHistory
            journals={journals}
            loading={false}
            onDeleteJournal={onDeleteJournal}
          />
        </View>
      )}

      {/* Share Mirror Sheet */}
      <ShareMirrorSheet
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
        userId={userId}
        mirrorId={mirrorId}
        onShareSuccess={() => {
          console.log('✅ Mirror shared successfully');
        }}
      />
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  viewMirrorButton: {
    backgroundColor: '#fbbf24',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewMirrorButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  shareButton: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  shareButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '500',
  },
  mirrorCardActions: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  viewJournalsLink: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  mirrorJournalsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reflectionContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reflectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  reflectionBlock: {
    marginBottom: 12,
  },
  reflectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reflectionText: {
    fontSize: 15,
    color: '#1e293b',
    lineHeight: 22,
  },
  readMoreText: {
    fontSize: 13,
    color: '#fbbf24',
    marginTop: 6,
    fontWeight: '600',
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
    textAlign: 'center',
    marginTop: 8,
    textDecorationLine: 'underline',
  },
});