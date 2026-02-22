// contexts/FriendBadgeContext.tsx
// Global context for tracking new friend connections badge

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase/client';

const LAST_VIEWED_KEY = 'friend_screen_last_viewed';

interface FriendBadgeContextType {
  newFriendsCount: number;
  refreshNewFriendsCount: () => Promise<void>;
  markFriendsAsViewed: () => Promise<void>;
}

const FriendBadgeContext = createContext<FriendBadgeContextType>({
  newFriendsCount: 0,
  refreshNewFriendsCount: async () => {},
  markFriendsAsViewed: async () => {},
});

export function FriendBadgeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [newFriendsCount, setNewFriendsCount] = useState(0);

  const refreshNewFriendsCount = useCallback(async () => {
    if (!user?.id || !supabase) {
      setNewFriendsCount(0);
      return;
    }

    try {
      // Get last viewed timestamp from AsyncStorage
      const lastViewedStr = await AsyncStorage.getItem(LAST_VIEWED_KEY);
      const lastViewed = lastViewedStr || '2000-01-01T00:00:00Z'; // Default to ancient past

      // Count friend_links created after last viewed time
      const { count, error } = await supabase
        .from('friend_links')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .gt('created_at', lastViewed);

      if (error) {
        console.error('Error fetching new friends count:', error);

        // Capture error
        Sentry.captureException(new Error('Failed to fetch new friends count'), {
          tags: { component: 'FriendBadgeContext', action: 'refreshCount' },
          contexts: {
            friendBadge: {
              userId: user.id,
              error: error.message,
            },
          },
        });

        return;
      }

      setNewFriendsCount(count || 0);
    } catch (error) {
      console.error('Error in refreshNewFriendsCount:', error);

      // Capture unexpected error
      Sentry.captureException(error, {
        tags: { component: 'FriendBadgeContext', action: 'refreshCount', type: 'unexpected' },
        contexts: { friendBadge: { userId: user.id } },
      });
    }
  }, [user?.id]);

  const markFriendsAsViewed = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      await AsyncStorage.setItem(LAST_VIEWED_KEY, now);
      setNewFriendsCount(0);

      if (__DEV__) {
        console.log('✅ [FriendBadge] Marked friends as viewed at', now);
      }
    } catch (error) {
      console.error('Error marking friends as viewed:', error);
    }
  }, []);

  // Load count on mount and when user changes
  useEffect(() => {
    refreshNewFriendsCount();
  }, [refreshNewFriendsCount]);

  // Realtime subscription for friend_links changes
  // Need two subscriptions because Realtime doesn't support OR filters
  useEffect(() => {
    if (!user?.id || !supabase) return;

    let isMounted = true;

    if (__DEV__) {
      console.log('📡 [FriendBadge] Setting up Realtime subscriptions');
    }

    // Subscription 1: When user is user_a
    const subscriptionA = supabase
      .channel(`friend_links_a:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_links',
          filter: `user_a_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted) return;

          if (__DEV__) {
            console.log('✨ [FriendBadge] New friend link detected (user_a)');
          }

          // Refresh count from database for accuracy
          refreshNewFriendsCount();
        }
      )
      .subscribe((status, err) => {
        if (__DEV__) {
          if (status === 'SUBSCRIBED') {
            console.log('✅ [FriendBadge] Connected to Realtime (user_a subscription)');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [FriendBadge] Realtime error (user_a):', err);

            // Capture Realtime error
            Sentry.captureException(new Error('Realtime subscription error (user_a)'), {
              tags: { component: 'FriendBadgeContext', action: 'realtime' },
              contexts: {
                realtime: {
                  userId: user.id,
                  subscription: 'user_a',
                  status,
                  error: err?.message || String(err),
                },
              },
            });
          }
        }
      });

    // Subscription 2: When user is user_b
    const subscriptionB = supabase
      .channel(`friend_links_b:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_links',
          filter: `user_b_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted) return;

          if (__DEV__) {
            console.log('✨ [FriendBadge] New friend link detected (user_b)');
          }

          // Refresh count from database for accuracy
          refreshNewFriendsCount();
        }
      )
      .subscribe((status, err) => {
        if (__DEV__) {
          if (status === 'SUBSCRIBED') {
            console.log('✅ [FriendBadge] Connected to Realtime (user_b subscription)');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [FriendBadge] Realtime error (user_b):', err);

            // Capture Realtime error
            Sentry.captureException(new Error('Realtime subscription error (user_b)'), {
              tags: { component: 'FriendBadgeContext', action: 'realtime' },
              contexts: {
                realtime: {
                  userId: user.id,
                  subscription: 'user_b',
                  status,
                  error: err?.message || String(err),
                },
              },
            });
          }
        }
      });

    return () => {
      isMounted = false;
      if (__DEV__) {
        console.log('🔌 [FriendBadge] Cleaning up Realtime subscriptions');
      }
      subscriptionA.unsubscribe();
      subscriptionB.unsubscribe();
    };
  }, [user?.id, refreshNewFriendsCount]);

  // App state listener - refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (__DEV__) {
          console.log('📱 [FriendBadge] App foregrounded, refreshing count');
        }
        refreshNewFriendsCount();
      }
    });

    return () => subscription.remove();
  }, [refreshNewFriendsCount]);

  return (
    <FriendBadgeContext.Provider
      value={{ newFriendsCount, refreshNewFriendsCount, markFriendsAsViewed }}
    >
      {children}
    </FriendBadgeContext.Provider>
  );
}

export function useFriendBadge() {
  return useContext(FriendBadgeContext);
}
