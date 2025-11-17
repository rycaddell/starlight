// lib/supabase/mirrors.js - UPDATED FOR SERVER-SIDE GENERATION
import { supabase } from './client';
import { MIRROR_THRESHOLD } from '../config/constants';

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
  console.log('🚀 Requesting Mirror generation from Edge Function...');
  
  try {
    // Get the anon key for authentication
    const { data: { session } } = await supabase.auth.getSession();
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    // Call Edge Function
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ customUserId }),
    });

    const data = await response.json();
    console.log('Edge function response status:', response.status, data);

    if (!response.ok) {
      console.error('❌ Edge Function error:', data);
      return { 
        success: false, 
        error: data.error || 'Mirror generation request failed' 
      };
    }

    console.log('✅ Mirror generation request successful');
    return {
      success: true,
      mirror: data.mirror,
      message: 'Mirror generated successfully!',
    };

  } catch (error) {
    console.error('❌ Error requesting Mirror generation:', error);
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
      return { success: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { success: true, status: 'none' };
    }
    const requestData = data[0];

    console.log(`📊 Generation status: ${requestData.status}`);

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

    return {
      success: true,
      status: requestData.status, // 'pending', 'processing', 'completed', 'failed'
      requestedAt: requestData.requested_at,
      completedAt: requestData.completed_at,
      error: requestData.status === 'failed' ? 'Mirror generation failed' : null,
    };

  } catch (error) {
    console.error('❌ Error checking Mirror status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if user can generate a Mirror
 * Returns: { canGenerate: boolean, reason: string, journalCount: number }
 */
export const checkCanGenerateMirror = async (customUserId) => {
  try {
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

    if (journalCount < MIRROR_THRESHOLD) {
      return {
        canGenerate: false,
        reason: `Need ${MIRROR_THRESHOLD - journalCount} more journal${MIRROR_THRESHOLD - journalCount > 1 ? 's' : ''}`,
        journalCount,
      };
    }

    // Check rate limit (1 per 24 hours)
    const { data: recentRequests, error: requestError } = await supabase
      .from('mirror_generation_requests')
      .select('requested_at, status')
      .eq('custom_user_id', customUserId)
      .gte('requested_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .in('status', ['pending', 'processing', 'completed']);

    if (requestError) {
      console.error('❌ Error checking rate limit:', requestError);
      // Don't block generation if rate limit check fails
    }

    if (recentRequests && recentRequests.length > 0) {
      const latestRequest = recentRequests[0];
      const hoursRemaining = Math.ceil(
        (24 - (Date.now() - new Date(latestRequest.requested_at).getTime()) / (1000 * 60 * 60))
      );
      
      return {
        canGenerate: false,
        reason: `Please wait ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} before generating another Mirror`,
        journalCount,
        rateLimited: true,
      };
    }

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
    console.log('🔍 Loading Mirror:', mirrorId);
    
    const { data: mirror, error } = await supabase
      .from('mirrors')
      .select('*')
      .eq('id', mirrorId)
      .single();

    if (error) {
      console.error('❌ Error loading Mirror:', error);
      return { success: false, error: error.message };
    }

    if (!mirror) {
      return { success: false, error: 'Mirror not found' };
    }

    // Reconstruct the Mirror content in the expected format
    const mirrorContent = {
      screen1_themes: mirror.screen_1_themes,
      screen2_biblical: mirror.screen_2_biblical,
      screen3_observations: mirror.screen_3_observations,
      screen4_suggestions: mirror.screen_4_suggestions
    };

    console.log('✅ Mirror loaded successfully');
    return { 
      success: true, 
      mirror: mirror,
      content: mirrorContent 
    };

  } catch (error) {
    console.error('❌ Error in getMirrorById:', error);
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
  console.log('🚀 Requesting onboarding preview from Edge Function...');
  
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
    console.log('Edge function response status:', response.status);

    // Check if generation was successful
    if (data.success && data.content) {
      console.log('✅ Preview generation successful');
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

export async function markMirrorAsViewed(mirrorId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('👁️ Marking mirror as viewed:', mirrorId);
    
    const { error } = await supabase
      .from('mirrors')
      .update({ has_been_viewed: true })
      .eq('id', mirrorId);

    if (error) {
      console.error('❌ Error marking mirror as viewed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Mirror marked as viewed in database');
    return { success: true };
  } catch (error) {
    console.error('❌ Exception marking mirror as viewed:', error);
    return { success: false, error: error.message };
  }
};