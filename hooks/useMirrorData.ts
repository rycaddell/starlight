import { useState, useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserJournals,
  getUserJournalCount,
  requestMirrorGeneration,
  checkMirrorGenerationStatus,
  checkCanGenerateMirror,
} from '../lib/supabase';
import { markMirrorAsViewed } from '../lib/supabase/mirrors';
import { MIRROR_THRESHOLD, getMirrorThreshold } from '../lib/config/constants';

type MirrorState = 'progress' | 'ready' | 'generating' | 'completed' | 'viewing';

export const useMirrorData = () => {
  const { user, isAuthenticated } = useAuth();
  const [journals, setJournals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [journalCount, setJournalCount] = useState(0);
  const [mirrorState, setMirrorState] = useState<MirrorState>('progress');
  const [generatedMirror, setGeneratedMirror] = useState<any>(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);

  const [hasViewedCurrentMirror, setHasViewedCurrentMirror] = useState(false);

  // Polling control
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);
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
        Alert.alert('Error', 'Failed to load journal entries. Please try again.');
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

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
  };

  const pollMirrorStatus = async () => {
    if (!user || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;

    let attempts = 0;
    const maxAttempts = 80;

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;

      try {
        const statusResult = await checkMirrorGenerationStatus(user.id);

        if (!statusResult.success) {
          console.error('❌ Mirror status check failed:', statusResult.error);
          return;
        }

        const { status, mirror } = statusResult;

        switch (status) {
          case 'completed':
            console.log('✅ Mirror generation completed');
            stopPolling();

            const dbHasBeenViewed = mirror.has_been_viewed || false;

            if (dbHasBeenViewed && mirrorStateRef.current !== 'generating') {
              return;
            }

            setGeneratedMirror(mirror);
            setMirrorState('completed');
            setGenerationStartTime(null);
            setHasViewedCurrentMirror(dbHasBeenViewed);
            await loadJournalsOnly();
            break;

          case 'failed':
            console.error('❌ Mirror generation failed:', statusResult.error);
            stopPolling();
            setMirrorState('ready');
            setGenerationStartTime(null);

            const errorMsg = statusResult.error || 'Mirror generation encountered an error. Please try again.';
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
              Alert.alert(
                'Generation Failed',
                errorMsg,
                [{ text: 'OK' }]
              );
            }
            break;

          case 'processing':
          case 'pending':
            if (mirrorState !== 'generating') {
              setMirrorState('generating');
            }
            break;

          case 'none':
            stopPolling();
            setMirrorState('ready');
            setGenerationStartTime(null);
            break;
        }

        if (attempts >= maxAttempts) {
          console.error('❌ Mirror polling timeout');
          stopPolling();
          setMirrorState('ready');
          setGenerationStartTime(null);
          Alert.alert(
            'Generation Taking Longer Than Expected',
            'Your Mirror is still being generated. Please check back in a few minutes.',
            [{ text: 'OK' }]
          );
        }

      } catch (error) {
        console.error('❌ Error polling mirror status:', error);
      }
    }, 3000);
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
            stopPolling();
            await loadJournalsOnly();
          }
        } else if (status === 'processing' || status === 'pending') {
          if (currentState !== 'generating') {
            setMirrorState('generating');

            if (!generationStartTime && statusResult.requestedAt) {
              const requestTime = new Date(statusResult.requestedAt).getTime();
              setGenerationStartTime(requestTime);
            }

            if (!isPollingRef.current) {
              pollMirrorStatus();
            }
          } else {
            if (!isPollingRef.current) {
              pollMirrorStatus();
            }
          }
        } else if (status === 'failed') {
          if (currentState === 'generating') {
            setMirrorState('ready');
            setGenerationStartTime(null);
            stopPolling();
          }
        } else {
          // status === 'none'
          if (currentState === 'generating') {
            if (!isPollingRef.current) {
              pollMirrorStatus();
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
        stopPolling();
      }

      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (user) {
          checkGenerationStatusOnFocus();

          const currentState = mirrorStateRef.current;
          if (!isPollingRef.current && currentState === 'generating') {
            pollMirrorStatus();
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
      setMirrorState('generating');
      setGenerationStartTime(Date.now());
      pollMirrorStatus();
      return;
    }

    const eligibilityCheck = await checkCanGenerateMirror(user.id, user as any);

    if (!eligibilityCheck.canGenerate) {
      Alert.alert('Cannot Generate Mirror', eligibilityCheck.reason, [{ text: 'OK' }]);
      return;
    }

    setMirrorState('generating');
    setGenerationStartTime(Date.now());
    pollMirrorStatus();

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
          if (!isPollingRef.current) {
            pollMirrorStatus();
          }
          return;
        }

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
        if (!isPollingRef.current) {
          pollMirrorStatus();
        }
        return;
      }

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
      stopPolling();
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
    stopPolling,
    checkGenerationStatusOnFocus,
    isReady: mirrorState === 'ready',
    isGenerating: mirrorState === 'generating',
    isCompleted: mirrorState === 'completed',
    isViewing: mirrorState === 'viewing' && generatedMirror
  };
};
