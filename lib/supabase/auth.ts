import * as Sentry from '@sentry/react-native';
import { supabase } from './client';

// Send OTP to phone number (must be E.164 format, e.g. +15551234567)
export const sendPhoneOTP = async (
  phone: string
): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Sending phone OTP',
    level: 'info',
  });

  try {
    const { error } = await supabase.auth.signInWithOtp({ phone });

    if (error) {
      Sentry.captureException(error, {
        tags: { component: 'auth', action: 'sendOTP' },
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending OTP:', error);
    Sentry.captureException(error, {
      tags: { component: 'auth', action: 'sendOTP', type: 'unexpected' },
    });
    return { success: false, error: error.message || 'Failed to send code. Please try again.' };
  }
};

function normalizeOtpError(message: string): string {
  if (/expired/i.test(message)) return 'That code has expired. Tap "Resend code" to get a new one.';
  if (/invalid/i.test(message)) return 'That code is incorrect. Please try again.';
  if (/max.*attempts/i.test(message)) return 'Too many attempts. Please request a new code.';
  return 'Something went wrong. Please try again.';
}

// Verify 6-digit OTP — returns Supabase session on success
export const verifyPhoneOTP = async (
  phone: string,
  token: string
): Promise<{ success: boolean; session?: any; authUser?: any; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Verifying phone OTP',
    level: 'info',
  });

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      Sentry.captureException(error, {
        tags: { component: 'auth', action: 'verifyOTP' },
      });
      return { success: false, error: normalizeOtpError(error.message) };
    }

    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'OTP verified successfully',
      data: { authUserId: data.user?.id },
      level: 'info',
    });

    return { success: true, session: data.session, authUser: data.user };
  } catch (error: any) {
    console.error('Error verifying OTP:', error);
    Sentry.captureException(error, {
      tags: { component: 'auth', action: 'verifyOTP', type: 'unexpected' },
    });
    return { success: false, error: error.message || 'Failed to verify code. Please try again.' };
  }
};

// Create or link a users row after first sign-in.
// - Phone matches an existing unlinked row → migrates legacy user by setting auth_user_id
// - No match → inserts a new row for a brand-new user
//
// NOTE: This runs while RLS is still disabled (Phase 2-3). Once RLS is enabled
// (Phase 4) only new users reach this path; the INSERT policy is satisfied because
// we write auth_user_id = authUserId which equals auth.uid() at call time.
export const completeProfileSetup = async (
  authUserId: string,
  phone: string,
  displayName: string | null
): Promise<{ success: boolean; user?: any; isExistingUser?: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  // Supabase strips the leading + from session.user.phone on the way out.
  // Normalize to E.164 (with +) so it matches what we stored in users.phone.
  const normalizedPhone = phone?.startsWith('+') ? phone : `+${phone}`;

  try {
    // Look for an existing user with this phone that hasn't been migrated yet
    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('phone', normalizedPhone)
      .is('auth_user_id', null)
      .maybeSingle();

    if (existing) {
      // Migrate existing user — link their auth identity
      const { data, error } = await supabase
        .from('users')
        .update({
          auth_user_id: authUserId,
          auth_migrated_at: new Date().toISOString(),
          // Only overwrite display_name if the existing row has none
          ...(!existing.display_name && displayName ? { display_name: displayName } : {}),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        Sentry.captureException(error, {
          tags: { component: 'auth', action: 'completeProfileSetup', type: 'migration' },
        });
        return { success: false, error: error.message };
      }

      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Existing user migrated',
        data: { userId: data.id, authUserId },
        level: 'info',
      });

      return { success: true, user: data, isExistingUser: true };
    }

    // New user — create users row
    const { data, error } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUserId,
        phone: normalizedPhone,
        display_name: displayName || null,
        status: 'active',
        first_login_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      Sentry.captureException(error, {
        tags: { component: 'auth', action: 'completeProfileSetup', type: 'newUser' },
      });
      return { success: false, error: error.message };
    }

    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'New user profile created',
      data: { userId: data.id, authUserId },
      level: 'info',
    });

    return { success: true, user: data, isExistingUser: false };
  } catch (error: any) {
    console.error('Error in completeProfileSetup:', error);
    Sentry.captureException(error, {
      tags: { component: 'auth', action: 'completeProfileSetup', type: 'unexpected' },
    });
    return { success: false, error: error.message || 'Failed to complete profile setup.' };
  }
};

// Sign out — Supabase clears the SecureStore session automatically
export const signOut = async (): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  Sentry.addBreadcrumb({
    category: 'auth',
    message: 'Signing out',
    level: 'info',
  });

  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error signing out:', error);
    Sentry.captureException(error, {
      tags: { component: 'auth', action: 'signOut' },
    });
    return { success: false, error: error.message };
  }
};

// Mark onboarding as completed for a user
export const completeUserOnboarding = async (
  userId: string,
  spiritualStateId: string | null = null
): Promise<{ success: boolean; user?: any; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('🎯 Completing onboarding for user:', userId);

    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Completing user onboarding',
      data: { userId },
      level: 'info',
    });

    const updateData: Record<string, string> = {
      onboarding_completed_at: new Date().toISOString(),
    };

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

    console.log('✅ Onboarding marked as complete in database');

    Sentry.addBreadcrumb({
      category: 'auth',
      message: 'Onboarding completed successfully',
      data: { userId },
      level: 'info',
    });

    return { success: true, user: data };
  } catch (error: any) {
    console.error('❌ Error completing onboarding:', error);

    Sentry.captureException(error, {
      tags: { component: 'auth', action: 'completeOnboarding' },
      contexts: { auth: { userId } },
    });

    return { success: false, error: error.message };
  }
};

// Check if user has completed onboarding
export const hasUserCompletedOnboarding = (user: any): boolean => {
  return user && user.onboarding_completed_at !== null;
};

export const deleteAccount = async (
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    // Use the authenticated session JWT so the edge function can verify identity
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? anonKey;

    const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: anonKey ?? '',
      },
      body: JSON.stringify({}),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Account deletion failed');
    }

    // Sign out after server-side deletion (clears SecureStore session)
    await signOut();

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return { success: false, error: error.message };
  }
};
