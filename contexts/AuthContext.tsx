import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Sentry from '@sentry/react-native';
import type { Session } from '@supabase/supabase-js';
import {
  sendPhoneOTP,
  verifyPhoneOTP,
  completeProfileSetup as completeProfileSetupFn,
  signOut as supabaseSignOut,
} from '../lib/supabase/auth';
import { supabase } from '../lib/supabase/client';

export interface AppUser {
  id: string;
  auth_user_id: string;
  phone: string;
  display_name: string | null;
  created_at: string;
  status: string;
  group_name?: string | null;
  invited_by?: string | null;
  first_login_at?: string | null;
  onboarding_completed_at?: string | null;
  auth_migrated_at?: string | null;
  profile_picture_url?: string | null;
  day_1_completed_at?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // True when a Supabase session exists but no users row yet (brand-new sign-up)
  isNewUser: boolean;
  sendOTP: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOTP: (phone: string, token: string) => Promise<{ success: boolean; error?: string }>;
  completeProfileSetup: (displayName: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  // Guards against resolveAppUser running before the initial session is known
  const [initialized, setInitialized] = useState(false);

  const isAuthenticated = !!session;

  // 1. Load the initial session, then subscribe to future auth state changes.
  //    The onAuthStateChange callback is intentionally synchronous — no async
  //    Supabase calls inside it. That avoids the Supabase client deadlock.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initial } }) => {
      setSession(initial);
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Resolve the app-level users row whenever the Supabase session changes.
  //    Waits for initialized so we don't flash an unauthenticated state before
  //    getSession() has returned.
  useEffect(() => {
    if (!initialized) return;
    resolveAppUser();
  }, [session, initialized]);

  const resolveAppUser = async () => {
    setIsLoading(true); // Show spinner while DB lookup is in flight, even on re-resolve
    if (!session?.user?.id) {
      setUser(null);
      setIsNewUser(false);
      setIsLoading(false);
      return;
    }

    try {
      // Primary lookup: find row by auth_user_id (covers all users after first sign-in)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUser(data);
        setIsNewUser(false);
        return;
      }

      // Secondary lookup: phone-based migration for legacy users signing in for the first time.
      // Supabase strips the leading + from session.user.phone — normalize before querying.
      const rawPhone = session.user.phone ?? '';
      const normalizedPhone = rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`;

      if (normalizedPhone.length > 1) {
        const { data: legacyUser, error: legacyError } = await supabase
          .from('users')
          .select('*')
          .eq('phone', normalizedPhone)
          .is('auth_user_id', null)
          .maybeSingle();

        if (legacyError) throw legacyError;

        if (legacyUser) {
          // Silently link auth identity — migrating user skips onboarding entirely
          const { data: migratedUser, error: migrateError } = await supabase
            .from('users')
            .update({
              auth_user_id: session.user.id,
              auth_migrated_at: new Date().toISOString(),
            })
            .eq('id', legacyUser.id)
            .select()
            .single();

          if (migrateError) throw migrateError;

          Sentry.addBreadcrumb({
            category: 'auth',
            message: 'Legacy user auto-migrated on sign-in',
            data: { userId: migratedUser.id, authUserId: session.user.id },
            level: 'info',
          });

          setUser(migratedUser);
          setIsNewUser(false);
          return;
        }
      }

      // No match by auth_user_id or phone → brand-new user needs profile setup
      setUser(null);
      setIsNewUser(true);
    } catch (error) {
      console.error('❌ AuthContext: Error resolving app user:', error);
      Sentry.captureException(error, {
        tags: { component: 'AuthContext', action: 'resolveAppUser' },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendOTP = async (phone: string) => {
    return sendPhoneOTP(phone);
  };

  const verifyOTP = async (phone: string, token: string) => {
    const result = await verifyPhoneOTP(phone, token);
    // Session update arrives via onAuthStateChange → resolveAppUser fires automatically
    return { success: result.success, error: result.error };
  };

  const completeProfileSetup = async (displayName: string) => {
    if (!session?.user) {
      return { success: false, error: 'No active session' };
    }

    const phone = session.user.phone ?? '';
    const authUserId = session.user.id;

    const result = await completeProfileSetupFn(authUserId, phone, displayName);

    if (result.success && result.user) {
      setUser(result.user);
      setIsNewUser(false);
    }

    return { success: result.success, error: result.error };
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabaseSignOut();
      // onAuthStateChange will fire with null session → resolveAppUser clears user state
    } catch (error) {
      console.error('❌ AuthContext: Sign-out error:', error);
      Sentry.captureException(error, {
        tags: { component: 'AuthContext', action: 'signOut' },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    await resolveAppUser();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    isNewUser,
    sendOTP,
    verifyOTP,
    completeProfileSetup,
    signOut,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
