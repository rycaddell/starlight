import { useState, useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRealtime } from '../contexts/RealtimeContext';
import {
  getUserJournals,
  getUserJournalCount,
  requestMirrorGeneration,
  checkMirrorGenerationStatus,
  checkCanGenerateMirror,
} from '../lib/supabase';
import { markMirrorAsViewed, getMirrorById } from '../lib/supabase/mirrors';
import { MIRROR_THRESHOLD, getMirrorThreshold } from '../lib/config/constants';
import { track, Events } from '../lib/analytics';

type MirrorState = 'progress' | 'ready' | 'generating' | 'completed' | 'viewing';

export const useMirrorData = () => {
  const { user, isAuthenticated } = useAuth();
  const { registerMirrorGenerationHandler } = useRealtime();
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [journalCount, setJournalCount] = useState(0);
  const [mirrorState, setMirrorState] = useState<MirrorState>('progress');
  const [generatedMirror, setGeneratedMirror] = useState<any>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  const [hasViewedCurrentMirror, setHasViewedCurrentMirror] = useState(false);

  // Tracks whether a mirror generation Realtime handler is currently registered.
  // Holds the unregister function while active, null otherwise.
  const unregisterMirrorHandlerRef = useRef<(() => void) | null>(null);
  const generationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resolvedRef = useRef(false);
  const appState = useRef(AppState.currentState);

  const mirrorStateRef = useRef<MirrorState>(mirrorState);

  useEffect(() => {
    mirrorStateRef.current = mirrorState;
  }, [mirrorState]);

  const loadJournalsOnly = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [journalsResult, countResult] = await Promise.all([
        getUserJournals(user.id),
        getUserJournalCount(user.id)
      ]);

      if (journalsResult.success) {
        setJournals(journalsResult.data ?? []);
      }

      if (countResult.success) {
        setJournalCount(countResult.count ?? 0);
      }
    } catch (error) {
      console.error('Error loading journals:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadJournals = async (skipStateUpdate = false) => {
    if (!user) {
      console.error('No authenticated user found');
      return;
    }

    setLoading(true);
    try {
      const [journalsResult, countResult] = await Promise.all([
        getUserJournals(user.id),
        getUserJournalCount(user.id)
      ]);

      if (journalsResult.success) {
        setJournals(journalsResult.data ?? []);
      } else {
        console.error('Failed to load journals:', journalsResult.error);
        if (journals.length === 0) {
          Alert.alert('Error', 'Failed to load journal entries. Please try again.');
        }
      }

      if (countResult.success) {
        setJournalCount(countResult.count ?? 0);

        if (!skipStateUpdate &&
            mirrorStateRef.current !== 'generating' &&
            mirrorStateRef.current !== 'completed' &&
            mirrorStateRef.current !== 'viewing') {
          const threshold = getMirrorThreshold(user as any);
          const newState = (countResult.count ?? 0) >= threshold ? 'ready' : 'progress';
          setMirrorState(newState);
        }
      }
    } catch (error) {
      console.error('Error loading journals:', error);
      Alert.alert('Error', 'Something went wrong loading your journals.');
    } finally {
      setLoading(false);
    }
  };

  const stopWaiting = () => {
    if (generationTimeoutRef.current) {
      clearTimeout(generationTimeoutRef.current);
      generationTimeoutRef.current = null;
    }
    if (unregisterMirrorHandlerRef.current) {
      unregisterMirrorHandlerRef.current();
      unregisterMirrorHandlerRef.current = null;
    }
  };

  // notBefore: unix ms timestamp — ignore completed requests older than this.
  // Prevents a previous generation's completed request from triggering an early false resolution.
  const subscribeForMirrorCompletion = (notBefore = 0) => {
    if (!user || unregisterMirrorHandlerRef.current) return;

    resolvedRef.current = false;

    const onResolved = async (status: string, mirrorId: string | null, errorMessage: string | null) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;

      // Defer handler removal so we're not unregistering from within its own callback
      setTimeout(() => stopWaiting(), 0);

      if (status === 'completed' && mirrorId) {
        const mirrorResult = await getMirrorById(mirrorId);
        if (mirrorResult.success && mirrorResult.mirror) {
          const dbHasBeenViewed = mirrorResult.mirror.has_been_viewed || false;
          track(Events.MIRROR_GENERATED, {
            mirror_id: mirrorId,
            mirror_type: mirrorResult.mirror.mirror_type,
            journal_count: journalCount,
          });
          setGeneratedMirror(mirrorResult.mirror);
          setMirrorState('completed');
          setGenerationStartTime(null);
          setHasViewedCurrentMirror(dbHasBeenViewed);
          await loadJournalsOnly();
        } else {
          setMirrorState('ready');
          setGenerationStartTime(null);
          Alert.alert('Generation Failed', 'Mirror was generated but could not be loaded. Please try again.', [{ text: 'OK' }]);
        }
      } else if (status === 'failed') {
        setMirrorState('ready');
        setGenerationStartTime(null);

        const errorMsg = errorMessage || 'Mirror generation encountered an error. Please try again.';
        const isContentFilter = errorMsg.includes('Content filter');

        if (isContentFilter) {
          Alert.alert(
            'Content Policy Issue',
            errorMsg,
            [
              { text: 'OK' },
              {
                text: 'More Info',
                onPress: () => {
                  Alert.alert(
                    'What This Means',
                    'OpenAI flagged your journal content as potentially violating their content policy. This can happen if journals contain:\n\n• Explicit violence or graphic content\n• Self-harm references\n• Explicit sexual content\n• Hate speech or discrimination\n• Other sensitive topics\n\nYour journals are private and safe. This is just an AI safety filter.',
                    [{ text: 'Close' }]
                  );
                },
              },
            ]
          );
        } else {
          Alert.alert('Generation Failed', errorMsg, [{ text: 'OK' }]);
        }
      }
    };

    // Register handler on the shared RealtimeContext channel
    unregisterMirrorHandlerRef.current = registerMirrorGenerationHandler((payload) => {
      const { status, mirror_id, error_message } = payload.new as {
        status: string;
        mirror_id: string | null;
        error_message: string | null;
      };
      if (status === 'completed' || status === 'failed') {
        onResolved(status, mirror_id, error_message);
      }
    });

    // Immediate check: the shared channel is already subscribed, so run the catch-up check now.
    // Guards against the generation completing before this handler was registered.
    (async () => {
      const statusResult = await checkMirrorGenerationStatus(user.id);
      if (statusResult.success) {
        const { status, mirror, requestedAt } = statusResult;
        const requestTime = requestedAt ? new Date(requestedAt).getTime() : 0;
        const isCurrentGeneration = requestTime >= notBefore;
        if (status === 'completed' && mirror && isCurrentGeneration) {
          onResolved('completed', mirror.id, null);
        } else if (status === 'failed' && isCurrentGeneration) {
          onResolved('failed', null, statusResult.error ?? null);
        }
      }
    })();

    // 4-minute safety net: if Realtime doesn't deliver an update, poll once then give up
    generationTimeoutRef.current = setTimeout(async () => {
      if (resolvedRef.current) return;
      const statusResult = await checkMirrorGenerationStatus(user.id);
      if (statusResult.success && statusResult.status === 'completed' && statusResult.mirror) {
        onResolved('completed', statusResult.mirror.id, null);
      } else if (statusResult.success && statusResult.status === 'failed') {
        onResolved('failed', null, statusResult.error ?? null);
      } else {
        stopWaiting();
        setMirrorState('ready');
        setGenerationStartTime(null);
        Alert.alert(
          'Generation Taking Longer Than Expected',
          'Your Mirror is still being generated. Please check back in a few minutes, or try again.',
          [
            { text: 'Try Again', onPress: () => generateMirror() },
            { text: 'OK' },
          ]
        );
      }
    }, 4 * 60 * 1000);
  };

  const checkGenerationStatusOnFocus = async () => {
    if (!user) return;

    const currentState = mirrorStateRef.current;

    if (currentState === 'viewing') {
      return;
    }

    try {
      const statusResult = await checkMirrorGenerationStatus(user.id);

      if (statusResult.success) {
        const { status, mirror } = statusResult;

        if (status === 'completed') {
          const dbHasBeenViewed = mirror.has_been_viewed || false;

          if (dbHasBeenViewed) {
            if (generatedMirror?.id === mirror.id) {
              setGeneratedMirror(null);
              setHasViewedCurrentMirror(false);
            }

            const countResult = await getUserJournalCount(user.id);
            const count = countResult.success ? (countResult.count ?? 0) : 0;
            const threshold = getMirrorThreshold(user);
            const newState = count >= threshold ? 'ready' : 'progress';

            setMirrorState(newState);
            return;
          }

          if (currentState === 'progress' || currentState === 'ready') {
            setGeneratedMirror(mirror);
            setMirrorState('completed');
            setGenerationStartTime(null);
            setHasViewedCurrentMirror(false);
            stopWaiting();
            await loadJournalsOnly();
          }
        } else if (status === 'processing' || status === 'pending') {
          const notBefore = statusResult.requestedAt
            ? new Date(statusResult.requestedAt).getTime()
            : 0;

          if (currentState !== 'generating') {
            setMirrorState('generating');

            if (!generationStartTime && statusResult.requestedAt) {
              const requestTime = new Date(statusResult.requestedAt).getTime();
              setGenerationStartTime(requestTime);
            }

            if (!unregisterMirrorHandlerRef.current) {
              subscribeForMirrorCompletion(notBefore);
            }
          } else {
            if (!unregisterMirrorHandlerRef.current) {
              subscribeForMirrorCompletion(notBefore);
            }
          }
        } else if (status === 'failed') {
          if (currentState === 'generating') {
            setMirrorState('ready');
            setGenerationStartTime(null);
            stopWaiting();
          }
        } else {
          // status === 'none'
          if (currentState === 'generating') {
            if (!unregisterMirrorHandlerRef.current) {
              subscribeForMirrorCompletion();
            }
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error checking mirror status:', error);

      const msg = String(error?.message || '');
      if (msg.includes('Network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
        setTimeout(() => {
          checkGenerationStatusOnFocus();
        }, 5000);
      }
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState.match(/inactive|background/)) {
        stopWaiting();
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (user) {
          checkGenerationStatusOnFocus();

          const currentState = mirrorStateRef.current;
          if (!unregisterMirrorHandlerRef.current && currentState === 'generating') {
            subscribeForMirrorCompletion();
          }
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user]);

  const generateMirror = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to generate a Mirror.');
      return;
    }

    Sentry.addBreadcrumb({
      category: 'mirror',
      message: 'User initiated mirror generation',
      data: { journalCount },
      level: 'info',
    });

    const statusCheck = await checkMirrorGenerationStatus(user.id);

    if (statusCheck.success && (statusCheck.status === 'processing' || statusCheck.status === 'pending')) {
      const requestAgeMs = statusCheck.requestedAt
        ? Date.now() - new Date(statusCheck.requestedAt).getTime()
        : Infinity;
      const isStale = requestAgeMs > 10 * 60 * 1000; // 10 minutes

      if (!isStale) {
        setMirrorState('generating');
        setGenerationStartTime(Date.now());
        // Use the request's actual requestedAt so the immediate check doesn't catch older generations
        const notBefore = statusCheck.requestedAt ? new Date(statusCheck.requestedAt).getTime() : 0;
        subscribeForMirrorCompletion(notBefore);
        return;
      }
      // If stale (>10 min), fall through to fresh generation
      console.log('⚠️ [useMirrorData] Found stale processing request, proceeding with fresh generation');
    }

    const eligibilityCheck = await checkCanGenerateMirror(user.id, user as any);

    if (!eligibilityCheck.canGenerate) {
      Alert.alert('Cannot Generate Mirror', eligibilityCheck.reason, [{ text: 'OK' }]);
      return;
    }

    const generationStartedAt = Date.now();
    setMirrorState('generating');
    setGenerationStartTime(generationStartedAt);
    subscribeForMirrorCompletion(generationStartedAt);

    try {
      const result = await requestMirrorGeneration(user.id) as {
      success: boolean;
      error?: string;
      mirror?: any;
      message?: string;
      errorType?: string;
      timestamp?: string;
    };

      if (result.success) {
        if (result.mirror) {
          // HTTP response delivered the mirror directly — mark resolved and cancel subscription
          resolvedRef.current = true;
          stopWaiting();
          track(Events.MIRROR_GENERATED, {
            mirror_id: result.mirror.id,
            mirror_type: result.mirror.mirror_type,
            journal_count: journalCount,
          });
          const dbHasBeenViewed = result.mirror.has_been_viewed || false;
          setGeneratedMirror(result.mirror);
          setMirrorState('completed');
          setGenerationStartTime(null);
          setHasViewedCurrentMirror(dbHasBeenViewed);
          await loadJournalsOnly();
        }
      } else {
        console.error('❌ Mirror generation request failed:', result.error);

        const msg = result.error || '';

        if (msg.includes('Network request failed') || msg.includes('Network request')) {
          // Keep the subscription alive — edge function may have succeeded server-side
          if (!unregisterMirrorHandlerRef.current) {
            subscribeForMirrorCompletion();
          }
          return;
        }

        // Definitive failure — edge function rejected the request before creating a DB record
        stopWaiting();

        Sentry.captureException(new Error(`Mirror generation failed: ${msg}`), {
          tags: { component: 'useMirrorData', action: 'generateMirror' },
          contexts: {
            mirror: {
              journalCount,
              error: msg,
              errorType: result.errorType,
            },
          },
        });

        if (msg.includes('24 hours')) {
          Alert.alert('Rate Limit', msg, [{ text: 'OK' }]);
        } else if (msg.includes('journals')) {
          Alert.alert('Not Enough Journals', msg, [{ text: 'OK' }]);
        } else if (msg.includes('Content filter')) {
          Alert.alert(
            'Content Policy Issue',
            msg,
            [
              { text: 'OK' },
              {
                text: 'View Details',
                onPress: () => {
                  Alert.alert(
                    'Technical Details',
                    `Error Type: ${result.errorType || 'Unknown'}\n\nTimestamp: ${result.timestamp || 'Unknown'}\n\nThis usually indicates that your journal content contains themes that OpenAI's content policy flags as sensitive.`,
                    [{ text: 'Close' }]
                  );
                },
              },
            ]
          );
        } else {
          Alert.alert('Mirror Generation Failed', msg || 'Please try again.', [{ text: 'OK' }]);
        }

        setMirrorState('ready');
        setGenerationStartTime(null);
      }
    } catch (error: any) {
      console.error('💥 Mirror generation error:', error);
      const msg = error?.message || '';

      if (msg.includes('Network request failed') || msg.includes('Network request')) {
        // Keep the subscription alive — edge function may have succeeded server-side
        if (!unregisterMirrorHandlerRef.current) {
          subscribeForMirrorCompletion();
        }
        return;
      }

      // Unexpected error — clean up and reset
      stopWaiting();
      Alert.alert('Error', `Unexpected error: ${msg}`);
      setMirrorState('ready');
      setGenerationStartTime(null);
    }
  };

  const viewMirror = async () => {
    if (generatedMirror) {
      setMirrorState('viewing');
      setHasViewedCurrentMirror(true);

      const result = await markMirrorAsViewed(generatedMirror.id);
      if (!result.success) {
        console.error('⚠️ Failed to mark mirror as viewed:', result.error);
      }
    } else {
      console.warn('⚠️ viewMirror called with no generatedMirror');
    }
  };

  const closeMirrorViewer = async () => {
    if (!user) return;

    setGeneratedMirror(null);
    setHasViewedCurrentMirror(false);

    setLoading(true);
    try {
      const countResult = await getUserJournalCount(user.id);
      const count = countResult.success ? (countResult.count ?? 0) : 0;

      const threshold = getMirrorThreshold(user);
      const newState = count >= threshold ? 'ready' : 'progress';
      setMirrorState(newState);

      await loadJournals(true);
    } catch (error) {
      console.error('Error in closeMirrorViewer:', error);
      setMirrorState('progress');
      loadJournals();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopWaiting();
    };
  }, []);

  return {
    journals,
    loading,
    journalCount,
    mirrorState,
    generatedMirror,
    generationStartTime,
    hasViewedCurrentMirror,
    loadJournals,
    generateMirror,
    viewMirror,
    closeMirrorViewer,
    setMirrorState,
    setGeneratedMirror,
    stopPolling: stopWaiting,
    checkGenerationStatusOnFocus,
    isReady: mirrorState === 'ready',
    isGenerating: mirrorState === 'generating',
    isCompleted: mirrorState === 'completed',
    isViewing: mirrorState === 'viewing' && generatedMirror
  };
};
