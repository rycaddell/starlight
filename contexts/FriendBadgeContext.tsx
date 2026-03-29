// contexts/FriendBadgeContext.tsx
// Global context for tracking new friend connections badge

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { useAuth } from './AuthContext';
import { useRealtime } from './RealtimeContext';
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
  const { registerFriendLinkHandler } = useRealtime();
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

  // Register friend_links handler via shared RealtimeContext channel
  useEffect(() => {
    if (!user?.id) return;

    if (__DEV__) {
      console.log('📡 [FriendBadge] Registering Realtime handler');
    }

    const unregister = registerFriendLinkHandler(() => {
      if (__DEV__) {
        console.log('✨ [FriendBadge] New friend link detected');
      }
      refreshNewFriendsCount();
    });

    return () => {
      if (__DEV__) {
        console.log('🔌 [FriendBadge] Unregistering Realtime handler');
      }
      unregister();
    };
  }, [user?.id, registerFriendLinkHandler, refreshNewFriendsCount]);

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
