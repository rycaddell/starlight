import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { supabase } from './client';

export const signInWithAccessCode = async (accessCode) => {
  if (__DEV__) console.log('🧪 DEBUG: signInWithAccessCode called');

  // Add Sentry breadcrumb
  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'User attempting sign-in',
    level: 'info',
  });

  try {
    if (__DEV__) console.log('🔑 Custom auth: Sign-in attempt');

    // Look up user by access code
    const { data: user, error: lookupError } = await supabase
      .from('users')
      .select('*')
      .eq('access_code', accessCode.toLowerCase())
      .eq('status', 'active')
      .single();

    if (lookupError) {
      if (lookupError.code === 'PGRST116') {
        // Capture invalid access code attempt
        Sentry.captureException(new Error('Invalid access code attempt'), {
          tags: { component: 'auth', action: 'signIn' },
          contexts: {
            auth: {
              errorCode: lookupError.code,
            },
          },
        });

        return {
          success: false,
          error: 'Access code not found. Please check your code and try again.'
        };
      }
      throw lookupError;
    }

    // ✨ NEW: Track first login if this is their first time
    let updatedUser = user;
    if (!user.first_login_at) {
      console.log('🎯 First login detected - updating database...');
      
      const { data: userWithFirstLogin, error: updateError } = await supabase
        .from('users')
        .update({ first_login_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();
      
      if (!updateError && userWithFirstLogin) {
        updatedUser = userWithFirstLogin;
        console.log('✅ First login timestamp recorded');
      } else {
        console.warn('⚠️ Could not update first_login_at:', updateError);
        // Continue anyway - don't fail login because of tracking
      }
    } else {
      console.log('🔄 Returning user - first login already tracked');
    }

    // Store user data locally (with updated first_login_at if applicable)
    await AsyncStorage.setItem('starlight_current_user', JSON.stringify(updatedUser));
    await AsyncStorage.setItem('starlight_access_code', accessCode.toLowerCase());

    console.log('✅ Custom auth: Sign-in successful');

    // Add success breadcrumb
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Sign-in successful',
      data: { userId: updatedUser.id, isFirstLogin: !user.first_login_at },
      level: 'info',
    });

    return {
      success: true,
      user: updatedUser,
      displayName: updatedUser.display_name
    };

  } catch (error) {
    console.error('Error signing in with access code:', error);

    // Capture unexpected error
    Sentry.captureException(error, {
      tags: { component: 'auth', action: 'signIn', type: 'unexpected' },
    });

    return {
      success: false,
      error: error.message || 'Failed to sign in. Please try again.'
    };
  }
};

export const getCurrentUser = async () => {
  try {
    const storedUser = await AsyncStorage.getItem('starlight_current_user');

    if (!storedUser) {
      return { success: false, error: 'No user found' };
    }

    const user = JSON.parse(storedUser);

    // Verify user still exists and is active
    const { data: verifiedUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .eq('status', 'active')
      .single();

    if (error || !verifiedUser) {
      // User no longer exists or is inactive - clear storage
      console.log('⚠️ User session expired');

      // Capture expired session
      Sentry.captureException(new Error('User session expired'), {
        tags: { component: 'auth', action: 'getCurrentUser' },
        contexts: {
          auth: {
            userId: user.id,
            error: error?.message,
          },
        },
      });

      await clearStoredAccessCode();
      return { success: false, error: 'User session expired' };
    }

    return { success: true, user: verifiedUser };
  } catch (error) {
    console.error('Error getting current user:', error);

    // Capture unexpected error
    Sentry.captureException(error, {
      tags: { component: 'auth', action: 'getCurrentUser', type: 'unexpected' },
    });

    return { success: false, error: error.message };
  }
};

export const autoSignInWithStoredCode = async () => {
  try {
    const storedCode = await AsyncStorage.getItem('starlight_access_code');
    
    if (!storedCode) {
      return { success: false, error: 'No stored access code found' };
    }
    
    console.log('🔄 Auto-signing in with stored code...');
    return await signInWithAccessCode(storedCode);
    
  } catch (error) {
    console.error('Error auto-signing in:', error);
    return { success: false, error: error.message };
  }
};

export const clearStoredAccessCode = async () => {
  try {
    // Add Sentry breadcrumb
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Clearing stored credentials',
      level: 'info',
    });

    await AsyncStorage.removeItem('starlight_current_user');
    await AsyncStorage.removeItem('starlight_access_code');

    console.log('🚪 Signed out and cleared stored data');
    return { success: true };
  } catch (error) {
    console.error('Error clearing access code:', error);

    // Capture error
    Sentry.captureException(error, {
      tags: { component: 'auth', action: 'clearStorage' },
    });

    return { success: false, error: error.message };
  }
};

export const createAccessCode = async (accessCode, displayName, groupName = null) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          access_code: accessCode.toLowerCase(),
          display_name: displayName,
          group_name: groupName
        }
      ])
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Created access code: ${accessCode} for ${displayName}`);
    return { success: true, data };
    
  } catch (error) {
    console.error('Error creating access code:', error);
    return { success: false, error: error.message };
  }
};

// NEW: Mark onboarding as completed for a user
export const completeUserOnboarding = async (userId, spiritualStateId = null) => {
  try {
    console.log('🎯 Completing onboarding for user:', userId);

    // Add Sentry breadcrumb
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Completing user onboarding',
      data: { userId },
      level: 'info',
    });

    const updateData = {
      onboarding_completed_at: new Date().toISOString()
    };

    // Only add spiritual_state_id if provided (for future use)
    if (spiritualStateId) {
      updateData.spiritual_state_id = spiritualStateId;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Update local storage with the updated user data
    await AsyncStorage.setItem('starlight_current_user', JSON.stringify(data));

    console.log('✅ Onboarding marked as complete in database');

    // Add success breadcrumb
    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Onboarding completed successfully',
      data: { userId },
      level: 'info',
    });

    return { success: true, user: data };

  } catch (error) {
    console.error('❌ Error completing onboarding:', error);

    // Capture error
    Sentry.captureException(error, {
      tags: { component: 'auth', action: 'completeOnboarding' },
      contexts: { auth: { userId } },
    });

    return { success: false, error: error.message };
  }
};

// NEW: Check if user has completed onboarding
export const hasUserCompletedOnboarding = (user) => {
  return user && user.onboarding_completed_at !== null;
};

export const deleteAccount = async (userId) => {
  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Account deletion failed');
    }

    // Clear local session after successful server-side deletion
    await clearStoredAccessCode();

    return { success: true };
  } catch (error) {
    console.error('Error deleting account:', error);
    return { success: false, error: error.message };
  }
};