// contexts/RealtimeContext.tsx
// Single shared Supabase Realtime channel per user session.
// Consolidates 4 previous channels (friend_links ×2, mirror_shares, mirror_generation_requests)
// into one WebSocket connection, reducing usage from 4 → 1 per logged-in user.

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import * as Sentry from '@sentry/react-native';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase/client';

type Handler = (payload: any) => void;

interface RealtimeContextType {
  /** Register a handler for friend_links INSERT (user_a_id or user_b_id). Returns unregister fn. */
  registerFriendLinkHandler: (handler: Handler) => () => void;
  /** Register a handler for mirror_shares INSERT/UPDATE/DELETE (recipient_user_id). Returns unregister fn. */
  registerMirrorShareHandler: (handler: Handler) => () => void;
  /** Register a handler for mirror_generation_requests UPDATE (custom_user_id). Returns unregister fn. */
  registerMirrorGenerationHandler: (handler: Handler) => () => void;
  /** True once the channel has successfully subscribed. Consumers can use this to run on-connect checks. */
  isSubscribed: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({
  registerFriendLinkHandler: () => () => {},
  registerMirrorShareHandler: () => () => {},
  registerMirrorGenerationHandler: () => () => {},
  isSubscribed: false,
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Handler sets — stored in refs so lambdas captured by channel callbacks always see current set
  const friendLinkHandlers = useRef<Set<Handler>>(new Set());
  const mirrorShareHandlers = useRef<Set<Handler>>(new Set());
  const mirrorGenerationHandlers = useRef<Set<Handler>>(new Set());

  useEffect(() => {
    if (!user?.id || !supabase) {
      setIsSubscribed(false);
      return;
    }

    const userId = user.id;

    if (__DEV__) {
      console.log('📡 [Realtime] Opening unified channel for user:', userId);
    }

    let hasSentError = false;

    const channel = supabase
      .channel(`user:${userId}`)
      // friend_links — two separate filters because Realtime doesn't support OR
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friend_links', filter: `user_a_id=eq.${userId}` },
        (payload) => { friendLinkHandlers.current.forEach(h => h(payload)); }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friend_links', filter: `user_b_id=eq.${userId}` },
        (payload) => { friendLinkHandlers.current.forEach(h => h(payload)); }
      )
      // mirror_shares — all events so badge updates on view (UPDATE) and delete
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mirror_shares', filter: `recipient_user_id=eq.${userId}` },
        (payload) => { mirrorShareHandlers.current.forEach(h => h(payload)); }
      )
      // mirror_generation_requests — UPDATE only (status transitions)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'mirror_generation_requests', filter: `custom_user_id=eq.${userId}` },
        (payload) => { mirrorGenerationHandlers.current.forEach(h => h(payload)); }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          hasSentError = false; // reset on successful reconnect
          setIsSubscribed(true);
          if (__DEV__) {
            console.log('✅ [Realtime] Unified channel subscribed');
          }
        } else if (status === 'CHANNEL_ERROR') {
          setIsSubscribed(false);
          if (__DEV__) {
            console.error('❌ [Realtime] Channel error:', err);
          }
          // Only report once per channel lifecycle — avoids Sentry spam during offline periods
          if (!hasSentError) {
            hasSentError = true;
            Sentry.captureException(new Error('Realtime unified channel error'), {
              tags: { component: 'RealtimeContext', action: 'subscribe' },
              contexts: {
                realtime: {
                  userId,
                  status,
                  error: err?.message || String(err),
                },
              },
            });
          }
        } else if (status === 'TIMED_OUT') {
          setIsSubscribed(false);
          if (__DEV__) {
            console.warn('⏱️ [Realtime] Channel timed out');
          }
        } else if (status === 'CLOSED') {
          setIsSubscribed(false);
        }
      });

    return () => {
      if (__DEV__) {
        console.log('🔌 [Realtime] Closing unified channel');
      }
      setIsSubscribed(false);
      supabase?.removeChannel(channel);
    };
  }, [user?.id]);

  const registerFriendLinkHandler = useCallback((handler: Handler) => {
    friendLinkHandlers.current.add(handler);
    return () => { friendLinkHandlers.current.delete(handler); };
  }, []);

  const registerMirrorShareHandler = useCallback((handler: Handler) => {
    mirrorShareHandlers.current.add(handler);
    return () => { mirrorShareHandlers.current.delete(handler); };
  }, []);

  const registerMirrorGenerationHandler = useCallback((handler: Handler) => {
    mirrorGenerationHandlers.current.add(handler);
    return () => { mirrorGenerationHandlers.current.delete(handler); };
  }, []);

  return (
    <RealtimeContext.Provider value={{
      registerFriendLinkHandler,
      registerMirrorShareHandler,
      registerMirrorGenerationHandler,
      isSubscribed,
    }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
