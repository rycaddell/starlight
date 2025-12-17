// contexts/UnreadSharesContext.tsx
// Global context for tracking unread mirror shares count

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from './AuthContext';
import { getUnviewedSharesCount } from '@/lib/supabase/mirrorShares';
import { supabase } from '@/lib/supabase/client';

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
    }
  }, [user?.id]);

  // Load count on mount and when user changes
  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  // Realtime subscription for mirror_shares changes
  useEffect(() => {
    if (!user?.id || !supabase) return;

    let isMounted = true;

    if (__DEV__) {
      console.log('📡 [UnreadShares] Setting up Realtime subscription');
    }

    const subscription = supabase
      .channel(`mirror_shares:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'mirror_shares',
          filter: `recipient_user_id=eq.${user.id}`
        },
        (payload) => {
          if (!isMounted) return;

          if (__DEV__) {
            console.log('✨ [UnreadShares] Change detected:', payload.eventType);
          }

          // Option B: Always fetch from database for accuracy
          refreshUnreadCount();
        }
      )
      .subscribe((status, err) => {
        if (__DEV__) {
          if (status === 'SUBSCRIBED') {
            console.log('✅ [UnreadShares] Connected to Realtime');
            // Refresh to catch any events that happened during connection
            if (isMounted) refreshUnreadCount();
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ [UnreadShares] Realtime error:', err);
          } else if (status === 'TIMED_OUT') {
            console.warn('⏱️ [UnreadShares] Realtime timeout');
          }
        }
      });

    return () => {
      isMounted = false;
      if (__DEV__) {
        console.log('🔌 [UnreadShares] Cleaning up Realtime subscription');
      }
      subscription.unsubscribe();
    };
  }, [user?.id, refreshUnreadCount]);

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
