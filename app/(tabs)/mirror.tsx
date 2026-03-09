// TRULY FIXED MIRROR.TSX - Simple focus handling

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { colors, typography, spacing } from '@/theme/designTokens';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useMirrorData } from '../../hooks/useMirrorData';
import { MirrorProgress } from '../../components/journal/MirrorProgress';
import { MirrorViewer } from '../../components/mirror/MirrorViewer';
import { ShareMirrorSheet } from '../../components/mirror/ShareMirrorSheet';
import { JournalHistory } from '../../components/mirror/JournalHistory';
import { LastMirrorCard } from '../../components/mirror/LastMirrorCard';
import { LastJournalCard } from '../../components/mirror/LastJournalCard';
import { PastMirrorsModal } from '../../components/mirror/PastMirrorsModal';
import { PastJournalsModal } from '../../components/mirror/PastJournalsModal';
import { useGlobalSettings } from '../../components/GlobalSettingsContext';
import { getMirrorById, markMirrorAsViewed, getUserMirrors } from '../../lib/supabase/mirrors';
import { deleteJournalEntry } from '../../lib/supabase/journals';
import { fetchFriends } from '../../lib/supabase/friends';
import { getDay1Mirror } from '../../lib/supabase/day1';
import { Day1MirrorViewer } from '../../components/day1/Day1MirrorViewer';
import * as Sentry from '@sentry/react-native';

export default function MirrorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, signOut, isAuthenticated, isLoading: authLoading } = useAuth();

  const { showSettings } = useGlobalSettings();
  
  const [userMirrors, setUserMirrors] = React.useState<any[]>([]);
  const [day1Mirror, setDay1Mirror] = React.useState<any>(null);
  const [day1Progress, setDay1Progress] = React.useState<any>(null);

  // Defined early so it can be safely used in useFocusEffect deps
  const loadUserMirrors = React.useCallback(async () => {
    if (!user) return;
    try {
      const result = await getUserMirrors(user.id);
      if (result.success) {
        setUserMirrors(result.data);
      }
    } catch (error) {
      console.error('❌ Error loading user mirrors:', error);
    }
  }, [user]);

  // Modal states
  const [pastMirrorsModalVisible, setPastMirrorsModalVisible] = React.useState(false);
  const [pastJournalsModalVisible, setPastJournalsModalVisible] = React.useState(false);
  const [shareSheetVisible, setShareSheetVisible] = React.useState(false);
  const [selectedMirrorIdForShare, setSelectedMirrorIdForShare] = React.useState<string | null>(null);
  const [checkingFriendsForMirror, setCheckingFriendsForMirror] = React.useState<Record<string, boolean>>({});
  const [shouldRestorePastMirrorsModal, setShouldRestorePastMirrorsModal] = React.useState(false);
  const [shouldRestorePastJournalsModal, setShouldRestorePastJournalsModal] = React.useState(false);
  const [day1ViewerVisible, setDay1ViewerVisible] = React.useState(false);

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

  // Track if we're handling a param-based mirror opening to prevent race conditions
  const isOpeningViaMirrorParam = React.useRef(false);

  // Set ref immediately if we have a param (before effects run)
  if (params.openMirrorId && !isOpeningViaMirrorParam.current) {
    isOpeningViaMirrorParam.current = true;
  }

  // Set Sentry user context
  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        username: user.display_name || undefined,
        email: user.phone || undefined,
      });

      Sentry.setTag('user_group', user.group_name || 'none');
    } else {
      Sentry.setUser(null);
    }
  }, [user]);

  // ✅ Load journals ONCE on mount (unless opening via param)
  useEffect(() => {
    if (isAuthenticated && user) {
      // Skip initial load if we're opening via param (ref will be set by param effect)
      if (isOpeningViaMirrorParam.current) {
        return;
      }

      Sentry.addBreadcrumb({
        category: 'lifecycle',
        message: 'Mirror screen mounted',
        level: 'info',
      });

      loadJournals();
      loadUserMirrors();
    }
  }, [isAuthenticated, user]);

  // Handle openMirrorId param from navigation
  useEffect(() => {
    if (params.openMirrorId && isAuthenticated && user) {
      // Set flag to prevent focus effect from interfering
      isOpeningViaMirrorParam.current = true;

      // Open the mirror directly
      handleOpenExistingMirror(params.openMirrorId as string, 'none');

      // Clear the param by navigating without it
      router.setParams({ openMirrorId: undefined });

      // Reset flag after a delay to allow state to settle
      setTimeout(() => {
        isOpeningViaMirrorParam.current = false;
      }, 500);
    }
  }, [params.openMirrorId, isAuthenticated, user]);

  // ✅ Check status AND reload journals on focus
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user) {
        if (isOpeningViaMirrorParam.current) {
          loadUserMirrors();
        } else {
          checkGenerationStatusOnFocus();
          loadJournals(false);
          loadUserMirrors();
        }
      }
    }, [isAuthenticated, user, mirrorState, hasViewedCurrentMirror, generatedMirror, loadUserMirrors, params.openMirrorId])
  );

  // Load Day 1 mirror
  useEffect(() => {
    const loadDay1Mirror = async () => {
      if (!user) return;

      try {
        const result = await getDay1Mirror(user.id);

        if (result.success && result.mirror) {
          setDay1Mirror(result.mirror);
          setDay1Progress(result.progress);
        }
      } catch (error) {
        console.error('❌ Error loading Day 1 mirror:', error);
      }
    };

    loadDay1Mirror();
  }, [user]);

  const handleViewNewMirror = () => {
    if (generatedMirror) {
      Sentry.addBreadcrumb({
        category: 'mirror',
        message: 'Viewing newly generated mirror',
        data: {
          mirrorId: generatedMirror.id,
          mirror_type: generatedMirror.mirror_type,
        },
        level: 'info',
      });

      setCurrentMirrorId(generatedMirror.id);
      viewMirror();
    }
  };

  const handleCloseMirror = () => {
    closeMirrorViewer();
    setCurrentMirrorId(null);
    loadUserMirrors();

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
    handleCloseMirror();
    setTimeout(() => {
      showSettings();
    }, 200);
  };

  const handleDeleteJournal = async (journalId: string) => {
    try {
      const result = await deleteJournalEntry(journalId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete journal');
      }

      await loadJournals();
    } catch (error) {
      console.error('❌ Error deleting journal:', error);
      Alert.alert('Error', 'Could not delete journal. Please try again.');
    }
  };

  const handleOpenExistingMirror = async (mirrorId: string, fromModal: 'pastMirrors' | 'pastJournals' | 'none' = 'none') => {
    // Add Sentry breadcrumb
    Sentry.addBreadcrumb({
      category: 'mirror',
      message: 'Opening existing mirror',
      data: { mirrorId, fromModal },
      level: 'info',
    });

    try {
      // Fetch mirror to check its type from database (source of truth)
      const result = await getMirrorById(mirrorId);

      if (!result.success || !result.mirror) {
        console.error('❌ Failed to load Mirror:', result.error);

        // Capture error context
        Sentry.captureException(new Error('Failed to load mirror'), {
          tags: { component: 'MirrorScreen', action: 'openMirror' },
          contexts: {
            mirror: {
              mirrorId,
              error: result.error,
            },
          },
        });

        Alert.alert('Mirror Not Found', result.error || 'Could not load this Mirror. It may have been deleted.');
        return;
      }

      // Check if this is a Day 1 mirror by mirror_type field
      const isDay1Mirror = result.mirror.mirror_type === 'day_1';

      // Add breadcrumb with mirror type
      Sentry.addBreadcrumb({
        category: 'mirror',
        message: `Mirror type: ${result.mirror.mirror_type}`,
        data: {
          mirrorId,
          mirror_type: result.mirror.mirror_type,
          has_screen_1: !!result.mirror.screen_1_themes,
          has_screen_2: !!result.mirror.screen_2_biblical,
          has_screen_3: !!result.mirror.screen_3_observations,
        },
        level: 'info',
      });

      if (isDay1Mirror) {
        // Add breadcrumb for Day 1 viewer
        Sentry.addBreadcrumb({
          category: 'navigation',
          message: 'Opening Day1MirrorViewer',
          data: { mirrorId },
          level: 'info',
        });

        // Close any open modals and mark for restoration
        if (fromModal === 'pastMirrors') {
          setPastMirrorsModalVisible(false);
          setShouldRestorePastMirrorsModal(true);
        } else if (fromModal === 'pastJournals') {
          setPastJournalsModalVisible(false);
          setShouldRestorePastJournalsModal(true);
        }

        // Load Day 1 mirror data if needed
        if (!day1Mirror || day1Mirror.id !== mirrorId) {
          setDay1Mirror(result.mirror);
          // Fetch Day 1 progress if needed
          const progressResult = await getDay1Mirror(user!.id);
          if (progressResult.success && progressResult.progress) {
            setDay1Progress(progressResult.progress);
          }
        }

        // Open Day 1 viewer
        setDay1ViewerVisible(true);
        return;
      }

      // Add breadcrumb for regular viewer
      Sentry.addBreadcrumb({
        category: 'navigation',
        message: 'Opening MirrorViewer',
        data: { mirrorId },
        level: 'info',
      });

      // If opening from a modal, hide it temporarily and mark for restoration
      if (fromModal === 'pastMirrors') {
        setPastMirrorsModalVisible(false);
        setShouldRestorePastMirrorsModal(true);
      } else if (fromModal === 'pastJournals') {
        setPastJournalsModalVisible(false);
        setShouldRestorePastJournalsModal(true);
      }

      setCurrentMirrorId(mirrorId);
      setGeneratedMirror(result.mirror);
      setMirrorState('viewing');

      if (!result.mirror.has_been_viewed) {
        const markResult = await markMirrorAsViewed(mirrorId);
        if (!markResult.success) {
          console.error('⚠️ Failed to mark mirror as viewed:', markResult.error);
          // Don't block - user can still view the mirror
        }
      }
    } catch (error) {
      console.error('❌ Error opening Mirror:', error);
      Alert.alert('Error', 'Something went wrong loading the Mirror. Please try again.');
    }
  };

  // Handler for share button on last mirror card
  const handleShareLastMirror = async (mirrorId: string) => {
    setCheckingFriendsForMirror(prev => ({ ...prev, [mirrorId]: true }));

    try {
      const result = await fetchFriends(user!.id);

      if (result.success && result.friends && result.friends.length > 0) {
        if (pastMirrorsModalVisible) {
          setPastMirrorsModalVisible(false);
          setShouldRestorePastMirrorsModal(true);
        }

        setTimeout(() => {
          setSelectedMirrorIdForShare(mirrorId);
          setShareSheetVisible(true);
        }, 300);
      } else {
        if (pastMirrorsModalVisible) {
          setPastMirrorsModalVisible(false);
        }
        router.push('/(tabs)/friends');
      }
    } catch (error) {
      console.error('❌ [SHARE] Error checking friends:', error);
      Alert.alert('Error', 'Failed to check friends. Please try again.');
    } finally {
      setCheckingFriendsForMirror(prev => ({ ...prev, [mirrorId]: false }));
    }
  };

  const recentJournals = React.useMemo(() =>
    journals.filter(journal => !journal.mirror_id),
    [journals]
  );

  // Most recent regular or Day 1 mirror, derived directly from the mirrors table
  const lastMirrorData = React.useMemo(() => {
    const regularMirrors = userMirrors.filter(m => m.mirror_type !== 'day_1');
    let lastRegularMirror = null;
    if (regularMirrors.length > 0) {
      const m = regularMirrors[0]; // already sorted desc by created_at
      let biblicalCharacter = null;
      if (m.screen_2_biblical) {
        try {
          const biblical = typeof m.screen_2_biblical === 'string'
            ? JSON.parse(m.screen_2_biblical)
            : m.screen_2_biblical;
          biblicalCharacter = biblical?.parallel_story?.character || null;
        } catch (e) {}
      }
      lastRegularMirror = {
        id: m.id,
        date: new Date(m.created_at),
        biblicalCharacter,
        reflectionFocus: m.reflection_focus || null,
        isDay1: false,
      };
    }

    if (day1Mirror) {
      const day1Date = new Date(day1Mirror.created_at);
      let day1Character = null;
      if (day1Mirror.screen_2_biblical) {
        try {
          const biblical = typeof day1Mirror.screen_2_biblical === 'string'
            ? JSON.parse(day1Mirror.screen_2_biblical)
            : day1Mirror.screen_2_biblical;
          day1Character = biblical?.parallel_story?.character || null;
        } catch (e) {}
      }
      const day1MirrorData = {
        id: day1Mirror.id,
        date: day1Date,
        biblicalCharacter: day1Character,
        reflectionFocus: day1Mirror.focus_areas || null,
        isDay1: true,
        spiritualPlace: day1Progress?.spiritualPlace,
      };
      if (!lastRegularMirror || day1Date > lastRegularMirror.date) {
        return day1MirrorData;
      }
    }

    return lastRegularMirror;
  }, [userMirrors, day1Mirror, day1Progress]);

  // All mirrors for the modal (sorted most recent first), derived directly from the mirrors table
  const allMirrors = React.useMemo(() => {
    const regularMirrors = userMirrors
      .filter(m => m.mirror_type !== 'day_1')
      .map(m => {
        let biblicalCharacter = null;
        if (m.screen_2_biblical) {
          try {
            const biblical = typeof m.screen_2_biblical === 'string'
              ? JSON.parse(m.screen_2_biblical)
              : m.screen_2_biblical;
            biblicalCharacter = biblical?.parallel_story?.character || null;
          } catch (e) {}
        }
        return {
          id: m.id,
          date: new Date(m.created_at),
          biblicalCharacter,
          reflectionFocus: m.reflection_focus || null,
          isDay1: false,
        };
      });

    if (day1Mirror) {
      let day1Character = null;
      if (day1Mirror.screen_2_biblical) {
        try {
          const biblical = typeof day1Mirror.screen_2_biblical === 'string'
            ? JSON.parse(day1Mirror.screen_2_biblical)
            : day1Mirror.screen_2_biblical;
          day1Character = biblical?.parallel_story?.character || null;
        } catch (e) {}
      }
      regularMirrors.push({
        id: day1Mirror.id,
        date: new Date(day1Mirror.created_at),
        biblicalCharacter: day1Character,
        reflectionFocus: day1Mirror.focus_areas || null,
        isDay1: true,
        spiritualPlace: day1Progress?.spiritualPlace,
      });
    }

    return regularMirrors.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [userMirrors, day1Mirror, day1Progress]);

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
                <Button
                  variant="outline"
                  label="View past Mirrors"
                  onPress={() => setPastMirrorsModalVisible(true)}
                />
              )}
            </View>
          )}

          {/* Latest Journal Section */}
          {lastJournalEntry && (
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>Latest Journal</Text>

              <LastJournalCard
                journalId={lastJournalEntry.id}
                journalDate={new Date(lastJournalEntry.created_at)}
                content={lastJournalEntry.content}
                onDelete={handleDeleteJournal}
              />

              {allJournals.length > 1 && (
                <Button
                  variant="outline"
                  label="View past Journals"
                  onPress={() => setPastJournalsModalVisible(true)}
                />
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

            if (shouldRestorePastMirrorsModal) {
              setTimeout(() => {
                setPastMirrorsModalVisible(true);
                setShouldRestorePastMirrorsModal(false);
              }, 300);
            }
          }}
          userId={user.id}
          mirrorId={selectedMirrorIdForShare}
          onShareSuccess={() => {}}
        />
      )}

      {/* Day 1 Mirror Viewer */}
      {day1Mirror && day1Progress && (
        <Day1MirrorViewer
          visible={day1ViewerVisible}
          onClose={() => {
            setDay1ViewerVisible(false);

            // Restore Past Mirrors modal if it was open before
            if (shouldRestorePastMirrorsModal) {
              setTimeout(() => {
                setPastMirrorsModalVisible(true);
                setShouldRestorePastMirrorsModal(false);
              }, 300);
            }

            // Restore Past Journals modal if it was open before
            if (shouldRestorePastJournalsModal) {
              setTimeout(() => {
                setPastJournalsModalVisible(true);
                setShouldRestorePastJournalsModal(false);
              }, 300);
            }
          }}
          mirrorId={day1Mirror.id}
          userId={user.id}
          userName={user.display_name || 'friend'}
          spiritualPlace={day1Progress.spiritualPlace || 'Resting'}
          isOwner={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screen.horizontalPadding,
    paddingTop: 36,
    paddingBottom: 100,
  },
  mirrorReadySection: {
    marginBottom: spacing.xxxl,
  },
  section: {
    marginBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  sectionHeading: {
    ...typography.heading.default,
    color: colors.text.body,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxxl,
  },
  loadingText: {
    ...typography.body.s,
    color: colors.text.bodyLight,
    textAlign: 'center',
    lineHeight: 18,
  },
});