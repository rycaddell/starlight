// contexts/UnreadSharesContext.tsx
// Global context for tracking unread mirror shares count

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useAuth } from './AuthContext';
import { getUnviewedSharesCount } from '@/lib/supabase/mirrorShares';
import { useRealtime } from './RealtimeContext';

interface UnreadSharesContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const UnreadSharesContext = createContext<UnreadSharesContextType>({
  unreadCount: 0,
  refreshUnreadCount: async () => {},
});

export function UnreadSharesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { registerMirrorShareHandler, isSubscribed } = useRealtime();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }

    try {
      const result = await getUnviewedSharesCount(user.id);
      if (result.success) {
        setUnreadCount(result.count || 0);
      }
    } catch (error) {
      console.error('Error fetching unread shares count:', error);

      // Capture refresh error
      Sentry.captureException(error, {
        tags: { component: 'UnreadSharesContext', action: 'refreshCount' },
        contexts: {
          unreadShares: {
            userId: user.id,
          },
        },
      });
    }
  }, [user?.id]);

  // Load count on mount and when user changes
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Refresh once when the shared Realtime channel connects (catches events missed during connect)
  useEffect(() => {
    if (isSubscribed && user?.id) {
      if (__DEV__) {
        console.log('✅ [UnreadShares] Channel connected — refreshing count');
      }
      refreshUnreadCount();
    }
  }, [isSubscribed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Register mirror_shares handler via shared RealtimeContext channel
  useEffect(() => {
    if (!user?.id) return;

    if (__DEV__) {
      console.log('📡 [UnreadShares] Registering Realtime handler');
    }

    const unregister = registerMirrorShareHandler((payload) => {
      if (__DEV__) {
        console.log('✨ [UnreadShares] Change detected:', payload.eventType);
      }
      refreshUnreadCount();
    });

    return () => {
      if (__DEV__) {
        console.log('🔌 [UnreadShares] Unregistering Realtime handler');
      }
      unregister();
    };
  }, [user?.id, registerMirrorShareHandler, refreshUnreadCount]);

  // App state listener - refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (__DEV__) {
          console.log('📱 [UnreadShares] App foregrounded, refreshing count');
        }
        refreshUnreadCount();
      }
    });

    return () => subscription.remove();
  }, [refreshUnreadCount]);

  return (
    <UnreadSharesContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </UnreadSharesContext.Provider>
  );
}

export function useUnreadShares() {
  return useContext(UnreadSharesContext);
}
