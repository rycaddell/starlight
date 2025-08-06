// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { autoSignInWithStoredCode, signInWithAccessCode, clearStoredAccessCode } from '../lib/supabase';

interface User {
  id: string;
  displayName?: string;
  // Add other user properties as needed
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (accessCode: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to auto-sign in with stored access code on app start
  useEffect(() => {
    checkForExistingAuth();
  }, []);

  const checkForExistingAuth = async () => {
    try {
      console.log('🔍 Checking for existing authentication...');
      const result = await autoSignInWithStoredCode();
      
      if (result.success) {
        console.log('✅ Auto sign-in successful');
        setUser({
          id: result.user.id,
          displayName: result.displayName
        });
      } else {
        console.log('ℹ️ No stored authentication found');
      }
    } catch (error) {
      console.error('❌ Auto sign-in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (accessCode: string) => {
    try {
      setIsLoading(true);
      const result = await signInWithAccessCode(accessCode);
      
      if (result.success) {
        setUser({
          id: result.user.id,
          displayName: result.displayName
        });
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      // Clear stored access code and sessions
      await clearStoredAccessCode();
      setUser(null);
      console.log('🚪 Signed out successfully');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}