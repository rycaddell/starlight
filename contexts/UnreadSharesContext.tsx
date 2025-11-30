// contexts/UnreadSharesContext.tsx
// Global context for tracking unread mirror shares count

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getUnviewedSharesCount } from '@/lib/supabase/mirrorShares';

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

  // Refresh every 30 seconds when app is active
  useEffect(() => {
    const interval = setInterval(refreshUnreadCount, 30000);
    return () => clearInterval(interval);
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
