import { useState, useEffect, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useAuth } from '../contexts/AuthContext';
import {
  getUserJournals,
  getUserJournalCount,
  insertTestJournalData,
  requestMirrorGeneration,
  checkMirrorGenerationStatus,
  checkCanGenerateMirror,
} from '../lib/supabase';
import { markMirrorAsViewed } from '../lib/supabase/mirrors';
import { MIRROR_THRESHOLD, getMirrorThreshold } from '../lib/config/constants';

type MirrorState = 'progress' | 'ready' | 'generating' | 'completed' | 'viewing';

export const useMirrorData = () => {
  const { user, isAuthenticated } = useAuth();
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [journalCount, setJournalCount] = useState(0);
  const [mirrorState, setMirrorState] = useState<MirrorState>('progress');
  const [generatedMirror, setGeneratedMirror] = useState(null);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  
  // ✅ NEW - Track if current mirror has been viewed
  const [hasViewedCurrentMirror, setHasViewedCurrentMirror] = useState(false);
  
  // Polling control
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const appState = useRef(AppState.currentState);
  
  // ✅ Track current mirrorState value for closures
  const mirrorStateRef = useRef<MirrorState>(mirrorState);
  
  // ✅ Update ref whenever state changes
  useEffect(() => {
    mirrorStateRef.current = mirrorState;
  }, [mirrorState]);

  // ✅ Simple journal loading without state updates
  const loadJournalsOnly = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [journalsResult, countResult] = await Promise.all([
        getUserJournals(user.id),
        getUserJournalCount(user.id)
      ]);
      
      if (journalsResult.success) {
        setJournals(journalsResult.data);
      }
      
      if (countResult.success) {
        setJournalCount(countResult.count);
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
    
    console.log('📚 loadJournals() called, skipStateUpdate =', skipStateUpdate, 'current mirrorState =', mirrorState);
    
    setLoading(true);
    try {
      const [journalsResult, countResult] = await Promise.all([
        getUserJournals(user.id),
        getUserJournalCount(user.id)
      ]);
      
      if (journalsResult.success) {
        setJournals(journalsResult.data);
      } else {
        console.error('Failed to load journals:', journalsResult.error);
        Alert.alert('Error', 'Failed to load journal entries. Please try again.');
      }
      
      if (countResult.success) {
        setJournalCount(countResult.count);

        const threshold = getMirrorThreshold(user);
        console.log('📚 Journal count:', countResult.count, 'Threshold:', threshold);
        console.log('📚 State check conditions:', {
          skipStateUpdate,
          isNotGenerating: mirrorStateRef.current !== 'generating',
          isNotCompleted: mirrorStateRef.current !== 'completed',
          isNotViewing: mirrorStateRef.current !== 'viewing',
          willUpdate: !skipStateUpdate &&
            mirrorStateRef.current !== 'generating' &&
            mirrorStateRef.current !== 'completed' &&
            mirrorStateRef.current !== 'viewing'
        });

        if (!skipStateUpdate &&
            mirrorStateRef.current !== 'generating' &&
            mirrorStateRef.current !== 'completed' &&
            mirrorStateRef.current !== 'viewing') {
          const newState = countResult.count >= threshold ? 'ready' : 'progress';
          console.log('📚 Setting mirrorState to:', newState);
          setMirrorState(newState);
        } else {
          console.log('📚 Skipping state update');
        }
      }
    } catch (error) {
      console.error('Error loading journals:', error);
      Alert.alert('Error', 'Something went wrong loading your journals.');
    } finally {
      setLoading(false);
    }
  };

  // Stop polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    isPollingRef.current = false;
    console.log('🛑 Polling stopped');
  };

  // Poll for Mirror generation status
  const pollMirrorStatus = async () => {
    if (!user || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;
    console.log('🔄 Starting to poll for Mirror generation status...');

    let attempts = 0;
    const maxAttempts = 80;

    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      console.log(`📊 Polling attempt ${attempts}/${maxAttempts}`);

      try {
        const statusResult = await checkMirrorGenerationStatus(user.id);

        if (!statusResult.success) {
          console.error('❌ Status check failed:', statusResult.error);
          return;
        }

        const { status, mirror } = statusResult;

        switch (status) {
          case 'completed':
            console.log('✅ Mirror generation completed!');
            stopPolling();

            // ✅ Get has_been_viewed from database (should be false for new mirror)
            const dbHasBeenViewed = mirror.has_been_viewed || false;
            console.log('✅ Mirror has_been_viewed from DB:', dbHasBeenViewed);

            // ✅ Safety check: Don't update state if this is an old viewed mirror
            if (dbHasBeenViewed && mirrorStateRef.current !== 'generating') {
              console.log('⚠️ Polling found already-viewed mirror while not generating - ignoring');
              return;
            }

            setGeneratedMirror(mirror);
            setMirrorState('completed');
            setGenerationStartTime(null);
            setHasViewedCurrentMirror(dbHasBeenViewed);
            await loadJournalsOnly();
            break;

          case 'failed':
            console.error('❌ Mirror generation failed');
            console.error('🔍 Error details:', statusResult.error);
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
              console.log('⚠️ State drift detected, correcting to generating');
              setMirrorState('generating');
            }
            console.log(`⏳ Still generating... (${attempts * 3}s elapsed)`);
            break;

          case 'none':
            console.log('ℹ️ No generation in progress');
            stopPolling();
            setMirrorState('ready');
            setGenerationStartTime(null);
            break;
        }

        if (attempts >= maxAttempts) {
          console.error('❌ Polling timeout');
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
        console.error('❌ Error polling status:', error);
      }
    }, 3000);
  };

  // ✅ FIXED - Focused check that respects state
  const checkGenerationStatusOnFocus = async () => {
    if (!user) return;

    const currentState = mirrorStateRef.current; // ✅ Use ref for current value
    console.log(`🔍 Checking status (current: ${currentState})...`);
    
    // ✅ Don't interfere if user is viewing or if we're in a stable ready/progress state
    if (currentState === 'viewing') {
      console.log('👁️ User is viewing - skipping status check');
      return;
    }
    
    try {
      const statusResult = await checkMirrorGenerationStatus(user.id);
      
      if (statusResult.success) {
        const { status, mirror } = statusResult;
        
        console.log(`📊 Database: ${status}, Local: ${currentState}`);
        
        if (status === 'completed') {
          const dbHasBeenViewed = mirror.has_been_viewed || false;
          console.log('📊 Mirror completed, has_been_viewed:', dbHasBeenViewed);
          
          // ✅ If mirror has been viewed, don't touch anything - let normal flow handle it
          if (dbHasBeenViewed) {
            console.log('✅ Mirror already viewed, ignoring');
            return;
          }
          
          // ✅ Unviewed completed mirror - only show if we're not in a stable state
          if (currentState === 'progress' || currentState === 'ready') {
            console.log('✅ Unviewed completed mirror found, updating state');
            setGeneratedMirror(mirror);
            setMirrorState('completed');
            setGenerationStartTime(null);
            setHasViewedCurrentMirror(false);
            stopPolling();
            await loadJournalsOnly();
          } else if (currentState === 'completed') {
            console.log('✅ Already in completed state');
          }
        } else if (status === 'processing' || status === 'pending') {
          if (currentState !== 'generating') {
            console.log('⏳ Updating to generating');
            setMirrorState('generating');
            
            if (!generationStartTime && statusResult.requestedAt) {
              const requestTime = new Date(statusResult.requestedAt).getTime();
              setGenerationStartTime(requestTime);
            }
            
            if (!isPollingRef.current) {
              pollMirrorStatus();
            }
          } else {
            console.log('⏳ Already generating, ensuring polling active');
            if (!isPollingRef.current) {
              pollMirrorStatus();
            }
          }
        } else if (status === 'failed') {
          if (currentState === 'generating') {
            console.log('❌ Failed');
            setMirrorState('ready');
            setGenerationStartTime(null);
            stopPolling();
          }
        } else {
          // status === 'none'
          if (currentState === 'generating') {
            console.log('ℹ️ DB shows none, but local is generating – likely a race. Keeping generating state.');
            if (!isPollingRef.current) {
              pollMirrorStatus();
            }
          } else {
            console.log('ℹ️ No generation in progress');
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error checking status:', error);
    
      const msg = String(error?.message || '');
      if (msg.includes('Network') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
        console.log('🌐 Network issue detected, retrying status check in 5s...');
        setTimeout(() => {
          checkGenerationStatusOnFocus();
        }, 5000);
      }
    }
  };

  // ✅ FIXED - Handle backgrounding properly
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('📱 App state:', appState.current, '→', nextAppState);
      
      // Going to background
      if (nextAppState.match(/inactive|background/)) {
        console.log('📱 Going to background, pausing polling');
        stopPolling(); // ✅ Stop polling when backgrounded
      }
      
      // Coming to foreground
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 Returned to foreground');

        if (user) {
          checkGenerationStatusOnFocus(); // Check DB once

          // ✅ Only restart polling if we're actively generating
          const currentState = mirrorStateRef.current;
          if (!isPollingRef.current && currentState === 'generating') {
            console.log('🔄 Ensuring polling is active after foreground (state: generating)');
            pollMirrorStatus();
          } else if (currentState !== 'generating') {
            console.log(`ℹ️ Not starting polling (state: ${currentState})`);
          }
        }
      }
      
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [user]); // ✅ Only user dependency

  const generateMirror = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to generate a Mirror.');
      return;
    }

    // Add Sentry breadcrumb
    Sentry.addBreadcrumb({
      category: 'mirror',
      message: 'User initiated mirror generation',
      data: { journalCount },
      level: 'info',
    });

    console.log('🔍 Checking for existing generation...');
    const statusCheck = await checkMirrorGenerationStatus(user.id);

    if (statusCheck.success && (statusCheck.status === 'processing' || statusCheck.status === 'pending')) {
      console.log('⚠️ Generation already in progress!');
      setMirrorState('generating');
      setGenerationStartTime(Date.now());
      pollMirrorStatus();
      return;
    }

    console.log('🔍 Checking eligibility...');
    const eligibilityCheck = await checkCanGenerateMirror(user.id, user);

    if (!eligibilityCheck.canGenerate) {
      Alert.alert('Cannot Generate Mirror', eligibilityCheck.reason, [{ text: 'OK' }]);
      return;
    }

    setMirrorState('generating');
    setGenerationStartTime(Date.now());
    pollMirrorStatus();
    
    try {
      console.log('🚀 Requesting Mirror generation...');
      const result = await requestMirrorGeneration(user.id);
      
      if (result.success) {
        console.log('✅ Request submitted!');
        
        if (result.mirror) {
          // ✅ Get has_been_viewed from database (should be false for new mirror)
          const dbHasBeenViewed = result.mirror.has_been_viewed || false;
          console.log('✅ Immediate completion - has_been_viewed from DB:', dbHasBeenViewed);
          
          setGeneratedMirror(result.mirror);
          setMirrorState('completed');
          setGenerationStartTime(null);
          setHasViewedCurrentMirror(dbHasBeenViewed);
          await loadJournalsOnly();
        }
      } else {
        console.error('❌ Request failed:', result.error);

        const msg = result.error || '';

        // 🌐 Network errors: don't reset UI, let polling decide
        if (msg.includes('Network request failed') || msg.includes('Network request')) {
          console.log('🌐 Network issue while requesting Mirror. Keeping generating state and relying on polling.');

          // Make sure polling is running, since the job may still be alive server-side
          if (!isPollingRef.current) {
            pollMirrorStatus();
          }

          // 🔒 Do NOT set mirrorState back to ready, do NOT show an alert
          return;
        }

        // Capture non-network generation failures in Sentry
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

        // All other errors = real failures, keep existing behavior
        if (msg.includes('24 hours')) {
          Alert.alert('Rate Limit', msg, [{ text: 'OK' }]);
        } else if (msg.includes('journals')) {
          Alert.alert('Not Enough Journals', msg, [{ text: 'OK' }]);
        } else if (msg.includes('Content filter')) {
          // Enhanced error display for content filter issues
          Alert.alert(
            'Content Policy Issue',
            msg,
            [
              { text: 'OK' },
              {
                text: 'View Details',
                onPress: () => {
                  console.log('🔍 Full error details:', result);
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
      console.error('💥 Error:', error);
      const msg = error?.message || '';
    
      // 🌐 Same idea: a network abort while the app backgrounds
      // should NOT reset the UI if we've already kicked off polling.
      if (msg.includes('Network request failed') || msg.includes('Network request')) {
        console.log('🌐 Network error in generateMirror try/catch. Keeping generating state and relying on polling.');
        
        if (!isPollingRef.current) {
          pollMirrorStatus();
        }
    
        // Don't show an alert, don't flip back to ready
        return;
      }
    
      // Real unexpected errors still surface
      Alert.alert('Error', `Unexpected error: ${msg}`);
      setMirrorState('ready');
      setGenerationStartTime(null);
    }    
  };

  const viewMirror = async () => {
    if (generatedMirror) {
      console.log('👁️ viewMirror() called - marking as viewed');
      setMirrorState('viewing');
      setHasViewedCurrentMirror(true); // ✅ Mark as viewed locally
      console.log('👁️ hasViewedCurrentMirror set to TRUE');
      
      // ✅ Mark as viewed in database
      const result = await markMirrorAsViewed(generatedMirror.id);
      if (!result.success) {
        console.error('⚠️ Failed to mark mirror as viewed in database:', result.error);
        // Don't block the UI - user can still view the mirror
      }
    }
  };

  const closeMirrorViewer = async () => {
    console.log('🚪 closeMirrorViewer() called');
    console.log('🚪 Clearing mirror state and reloading journals');
    
    if (!user) return;
    
    // Clear the viewed mirror
    setGeneratedMirror(null);
    setHasViewedCurrentMirror(false);
    
    setLoading(true);
    try {
      // Get journal count to determine correct state
      const countResult = await getUserJournalCount(user.id);
      const count = countResult.success ? countResult.count : 0;

      // Set correct state based on count
      const threshold = getMirrorThreshold(user);
      const newState = count >= threshold ? 'ready' : 'progress';
      console.log(`🚪 Setting state to ${newState} (count: ${count}/${threshold})`);
      setMirrorState(newState);
      
      // Now load journals without state update (we already set it)
      await loadJournals(true); // skipStateUpdate = true
    } catch (error) {
      console.error('🚪 Error in closeMirrorViewer:', error);
      // Fallback to progress state
      setMirrorState('progress');
      loadJournals();
    } finally {
      setLoading(false);
    }
  };

  const insertTestData = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to insert test data.');
      return { success: false };
    }
    
    try {
      const result = await insertTestJournalData(user.id);
      
      if (result.success) {
        await loadJournals();
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
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
    hasViewedCurrentMirror, // ✅ EXPOSE
    loadJournals,
    generateMirror,
    viewMirror,
    closeMirrorViewer,
    insertTestData,
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