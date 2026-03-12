// lib/supabase/mirrors.js - UPDATED FOR SERVER-SIDE GENERATION
import { supabase } from './client';
import * as Sentry from '@sentry/react-native';
import { MIRROR_THRESHOLD, getMirrorThreshold } from '../config/constants';

// Edge Function URL
const EDGE_FUNCTION_URL = 'https://olqdyikgelidrytiiwfm.supabase.co/functions/v1/generate-mirror';

// ============================================================================
// SERVER-SIDE GENERATION (New Flow)
// ============================================================================

/**
 * Request Mirror generation from Edge Function
 * Returns immediately - generation happens in background
 */
export const requestMirrorGeneration = async (customUserId) => {
  // Add Sentry breadcrumb
  Sentry.addBreadcrumb({
    category: 'mirror',
    message: 'Requesting mirror generation',
    data: { customUserId },
    level: 'info',
  });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    // Call Edge Function
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({}),
    });

    // Get response text first to handle non-JSON responses
    const responseText = await response.text();

    // Try to parse as JSON
    let data;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      console.error('Response text was:', responseText);

      // Capture JSON parse error
      Sentry.captureException(parseError, {
        tags: { component: 'mirrors', action: 'requestGeneration' },
        contexts: {
          mirror: {
            customUserId,
            status: response.status,
            responsePreview: responseText.substring(0, 100),
          },
        },
      });

      return {
        success: false,
        error: `Server returned invalid response: ${responseText.substring(0, 100)}`
      };
    }

    if (!response.ok) {
      console.error('❌ Edge Function error:', data);

      // Capture generation request failure
      Sentry.captureException(new Error('Mirror generation request failed'), {
        tags: { component: 'mirrors', action: 'requestGeneration' },
        contexts: {
          mirror: {
            customUserId,
            status: response.status,
            error: data?.error,
          },
        },
      });

      return {
        success: false,
        error: data?.error || 'Mirror generation request failed'
      };
    }

    // Add success breadcrumb
    Sentry.addBreadcrumb({
      category: 'mirror',
      message: 'Mirror generation requested successfully',
      data: { customUserId, mirrorId: data?.mirror?.id },
      level: 'info',
    });

    return {
      success: true,
      mirror: data?.mirror,
      message: 'Mirror generated successfully!',
    };

  } catch (error) {
    console.error('❌ Error requesting Mirror generation:', error);

    // Capture unexpected error
    Sentry.captureException(error, {
      tags: { component: 'mirrors', action: 'requestGeneration', type: 'unexpected' },
      contexts: { mirror: { customUserId } },
    });

    return {
      success: false,
      error: error.message || 'Failed to request Mirror generation'
    };
  }
};

/**
 * Check Mirror generation status by polling the latest request
 */
export const checkMirrorGenerationStatus = async (customUserId) => {
  try {
    // Get the latest generation request for this user
    const { data, error } = await supabase
      .from('mirror_generation_requests')
      .select('*')
      .eq('custom_user_id', customUserId)
      .order('requested_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Error checking status:', error);

      // Capture status check error
      Sentry.captureException(new Error('Failed to check mirror generation status'), {
        tags: { component: 'mirrors', action: 'checkStatus' },
        contexts: {
          mirror: {
            customUserId,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: true, status: 'none' };
    }
    const requestData = data[0];

    // If completed, fetch the Mirror
    if (requestData.status === 'completed' && requestData.mirror_id) {
      const mirrorResult = await getMirrorById(requestData.mirror_id);

      if (mirrorResult.success) {
        return {
          success: true,
          status: 'completed',
          mirror: mirrorResult.mirror,
          content: mirrorResult.content,
        };
      }
    }

    // Capture failed generation
    if (requestData.status === 'failed') {
      Sentry.captureException(new Error('Mirror generation failed'), {
        tags: { component: 'mirrors', action: 'generation' },
        contexts: {
          mirror: {
            customUserId,
            errorType: requestData.error_type,
            errorMessage: requestData.error_message,
            requestedAt: requestData.requested_at,
          },
        },
      });
    }

    return {
      success: true,
      status: requestData.status, // 'pending', 'processing', 'completed', 'failed'
      requestedAt: requestData.requested_at,
      completedAt: requestData.completed_at,
      error: requestData.status === 'failed' ? (requestData.error_message || 'Mirror generation failed') : null,
      errorType: requestData.error_type || null,
    };

  } catch (error) {
    console.error('❌ Error checking Mirror status:', error);

    // Capture unexpected error
    Sentry.captureException(error, {
      tags: { component: 'mirrors', action: 'checkStatus', type: 'unexpected' },
      contexts: { mirror: { customUserId } },
    });

    return { success: false, error: error.message };
  }
};

/**
 * Check if user can generate a Mirror
 * Returns: { canGenerate: boolean, reason: string, journalCount: number }
 */
export const checkCanGenerateMirror = async (customUserId, user = null) => {
  try {
    // Get user data if not provided (for group threshold)
    let userData = user;
    if (!userData) {
      const { data, error: userError } = await supabase
        .from('users')
        .select('group_name')
        .eq('id', customUserId)
        .single();

      if (userError) {
        console.error('⚠️ Could not fetch user data for threshold check:', userError);
        // Fall back to default threshold if user lookup fails
        userData = null;
      } else {
        userData = data;
      }
    }

    // Determine threshold based on user group
    const threshold = getMirrorThreshold(userData);

    // Check unassigned journal count
    const { data: journals, error: journalsError } = await supabase
      .from('journals')
      .select('id')
      .eq('custom_user_id', customUserId)
      .is('mirror_id', null);

    if (journalsError) {
      return {
        canGenerate: false,
        reason: 'Failed to check journals',
        journalCount: 0,
      };
    }

    const journalCount = journals?.length || 0;

    if (journalCount < threshold) {
      return {
        canGenerate: false,
        reason: `Need ${threshold - journalCount} more journal${threshold - journalCount > 1 ? 's' : ''}`,
        journalCount,
      };
    }

    // Rate limiting is handled server-side only

    return {
      canGenerate: true,
      reason: 'Ready to generate Mirror',
      journalCount,
    };

  } catch (error) {
    console.error('❌ Error in checkCanGenerateMirror:', error);
    return {
      canGenerate: false,
      reason: 'Error checking eligibility',
      journalCount: 0,
    };
  }
};

// ============================================================================
// EXISTING FUNCTIONS (Keep these for viewing Mirrors)
// ============================================================================

/**
 * Get existing Mirror by ID
 */
export const getMirrorById = async (mirrorId) => {
  try {
    const { data: mirror, error } = await supabase
      .from('mirrors')
      .select('*')
      .eq('id', mirrorId)
      .single();

    if (error) {
      console.error('❌ Error loading Mirror:', error);

      // Capture mirror loading error
      Sentry.captureException(new Error('Failed to load mirror'), {
        tags: { component: 'mirrors', action: 'load' },
        contexts: {
          mirror: {
            mirrorId,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    if (!mirror) {
      // Capture mirror not found
      Sentry.captureException(new Error('Mirror not found'), {
        tags: { component: 'mirrors', action: 'load' },
        contexts: { mirror: { mirrorId } },
      });

      return { success: false, error: 'Mirror not found' };
    }

    // Reconstruct the Mirror content in the expected format
    const mirrorContent = {
      screen1_themes: mirror.screen_1_themes,
      screen2_biblical: mirror.screen_2_biblical,
      screen3_observations: mirror.screen_3_observations,
      screen4_suggestions: mirror.screen_4_suggestions
    };

    return {
      success: true,
      mirror: mirror,
      content: mirrorContent
    };

  } catch (error) {
    console.error('❌ Error in getMirrorById:', error);

    // Capture unexpected error
    Sentry.captureException(error, {
      tags: { component: 'mirrors', action: 'load', type: 'unexpected' },
      contexts: { mirror: { mirrorId } },
    });

    return { success: false, error: error.message };
  }
};

// ============================================================================
// ONBOARDING PREVIEW (Edge Function)
// ============================================================================

// Edge Function URL for onboarding preview
const ONBOARDING_PREVIEW_URL = 'https://olqdyikgelidrytiiwfm.supabase.co/functions/v1/generate-onboarding-preview';

/**
 * Generate onboarding preview using Edge Function
 * Returns preview content or fallback on error
 */
export const generateOnboardingPreview = async (journalContent) => {
  try {
    // Get the anon key for authentication
    const { data: { session } } = await supabase.auth.getSession();
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    // Call Edge Function
    const response = await fetch(ONBOARDING_PREVIEW_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ journalContent }),
    });

    const data = await response.json();

    if (data.success && data.content) {
      return {
        success: true,
        content: data.content,
        usedFallback: false
      };
    }

    // If not successful, use fallback content
    console.error('⚠️ Edge Function returned error, using fallback');
    return { 
      success: true, 
      content: data.fallback,
      usedFallback: true 
    };

  } catch (error) {
    console.error('❌ Error requesting preview generation:', error);
    
    // Return fallback content on network error
    return { 
      success: true, 
      content: {
        biblical_profile: {
          character: "David",
          connection: "Like David in the Psalms, you're bringing your honest thoughts and feelings to God. David didn't hide his struggles or doubts - he brought them into the light through writing and prayer. Your willingness to reflect like this is already a step toward spiritual growth."
        },
        encouraging_verse: {
          reference: "Psalm 139:23-24",
          text: "Search me, God, and know my heart; test me and know my anxious thoughts. See if there is any offensive way in me, and lead me in the way everlasting.",
          application: "This verse reminds us that honest self-reflection before God is not just acceptable - it's invited. As you continue journaling, you're creating space for God to reveal patterns, growth areas, and His leading in your life."
        }
      },
      usedFallback: true,
      error: error.message 
    };
  }
};

/**
 * Get all completed mirrors for a user, ordered by most recent first.
 * Queries the mirrors table directly — independent of whether journals still exist.
 */
export const getUserMirrors = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('mirrors')
      .select('id, created_at, screen_2_biblical, reflection_focus, reflection_action, mirror_type, focus_areas, status, has_been_viewed')
      .eq('custom_user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading user mirrors:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('❌ Exception loading user mirrors:', error);
    return { success: false, error: error.message };
  }
};

export async function markMirrorAsViewed(mirrorId) {
  try {
    const { error } = await supabase
      .from('mirrors')
      .update({ has_been_viewed: true })
      .eq('id', mirrorId);

    if (error) {
      console.error('❌ Error marking mirror as viewed:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Exception marking mirror as viewed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save reflection focus for a mirror
 */
export const saveReflectionFocus = async (mirrorId, reflectionText) => {
  try {
    const { error } = await supabase
      .from('mirrors')
      .update({
        reflection_focus: reflectionText,
        reflection_completed_at: new Date().toISOString()
      })
      .eq('id', mirrorId);

    if (error) {
      console.error('❌ Error saving reflection:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('❌ Exception saving reflection:', error);
    return { success: false, error: error.message };
  }
};