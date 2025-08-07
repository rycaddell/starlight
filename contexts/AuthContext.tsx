import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithAccessCode, 
  getCurrentUser, 
  autoSignInWithStoredCode, 
  clearStoredAccessCode 
} from '../lib/supabase';

// Define custom user type
interface CustomUser {
  id: string;
  access_code: string;
  display_name: string;
  created_at: string;
  status: string;
  group_name?: string;
  invited_by?: string;
}

interface AuthContextType {
  user: CustomUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (accessCode: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Initialize auth state on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log('🔄 AuthContext: Initializing auth...');
      
      // Try to get current user from storage
      const currentUserResult = await getCurrentUser();
      
      if (currentUserResult.success && currentUserResult.user) {
        console.log('✅ AuthContext: Found current user');
        setUser(currentUserResult.user);
      } else {
        // Try auto sign-in with stored code
        console.log('🔄 AuthContext: Trying auto sign-in...');
        const autoSignInResult = await autoSignInWithStoredCode();
        
        if (autoSignInResult.success && autoSignInResult.user) {
          console.log('✅ AuthContext: Auto sign-in successful');
          setUser(autoSignInResult.user);
        } else {
          console.log('ℹ️ AuthContext: No stored session found');
        }
      }
    } catch (error) {
      console.error('❌ AuthContext: Error initializing auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (accessCode: string) => {
    try {
      setIsLoading(true);
      console.log('🔑 AuthContext: Signing in...');
      
      const result = await signInWithAccessCode(accessCode);
      
      if (result.success && result.user) {
        console.log('✅ AuthContext: Sign-in successful');
        setUser(result.user);
        return { success: true };
      } else {
        console.log('❌ AuthContext: Sign-in failed');
        return { success: false, error: result.error || 'Sign-in failed' };
      }
    } catch (error) {
      console.error('❌ AuthContext: Sign-in error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      console.log('🚪 AuthContext: Signing out...');
      
      await clearStoredAccessCode();
      setUser(null);
      
      console.log('✅ AuthContext: Sign-out successful');
    } catch (error) {
      console.error('❌ AuthContext: Sign-out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      console.log('🔄 AuthContext: Refreshing user...');
      
      const result = await getCurrentUser();
      
      if (result.success && result.user) {
        console.log('✅ AuthContext: User refreshed');
        setUser(result.user);
      } else {
        console.log('⚠️ AuthContext: User refresh failed, signing out');
        await signOut();
      }
    } catch (error) {
      console.error('❌ AuthContext: Error refreshing user:', error);
      await signOut();
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    signIn,
    signOut,
    refreshUser
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