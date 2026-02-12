// lib/supabase/day1.js
// Service layer for Day 1 onboarding flow
// Manages progress through 5-step journey ending with mini-mirror generation

import { supabase } from './client';

/**
 * Get or create Day 1 progress for user
 * @param {string} userId - UUID of the user
 * @returns {Promise<{success: boolean, progress?: object, error?: string}>}
 */
export async function getDay1Progress(userId) {
  try {
    console.log('📊 Fetching Day 1 progress for user:', userId);

    let { data, error } = await supabase
      .from('day_1_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    // If no progress exists, create initial record
    if (error && error.code === 'PGRST116') {
      console.log('📝 No progress found, creating initial record');

      const { data: newProgress, error: createError } = await supabase
        .from('day_1_progress')
        .insert({
          user_id: userId,
          current_step: 1,
          generation_status: 'pending',
        })
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating progress:', createError);
        return { success: false, error: createError.message };
      }

      return { success: true, progress: newProgress };
    }

    if (error) {
      console.error('❌ Error fetching progress:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Progress loaded:', data);
    return { success: true, progress: data };

  } catch (error) {
    console.error('❌ Error in getDay1Progress:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update current step in Day 1 flow
 * @param {string} userId - UUID of the user
 * @param {number} step - Step number (1-5)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateCurrentStep(userId, step) {
  try {
    console.log(`📍 Updating current step to ${step} for user:`, userId);

    const { error } = await supabase
      .from('day_1_progress')
      .update({ current_step: step })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error updating step:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Step updated successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Error in updateCurrentStep:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save spiritual place selection (Step 1)
 * @param {string} userId - UUID of the user
 * @param {string} spiritualPlace - Selected spiritual place
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveSpiritualPlace(userId, spiritualPlace) {
  try {
    console.log('💾 Saving spiritual place:', spiritualPlace, 'for user:', userId);

    const { error } = await supabase
      .from('day_1_progress')
      .update({
        spiritual_place: spiritualPlace,
        current_step: 2, // Advance to step 2
      })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error saving spiritual place:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Spiritual place saved');
    return { success: true };

  } catch (error) {
    console.error('❌ Error in saveSpiritualPlace:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save journal ID for a specific step (Steps 2 or 3)
 * @param {string} userId - UUID of the user
 * @param {number} step - Step number (2 or 3)
 * @param {string} journalId - UUID of the created journal
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveStepJournal(userId, step, journalId) {
  try {
    console.log(`💾 Saving journal for step ${step}:`, journalId);

    const field = step === 2 ? 'step_2_journal_id' : 'step_3_journal_id';
    const nextStep = step === 2 ? 3 : 4; // Step 2 → 3, Step 3 → 4 (loading)

    const { error } = await supabase
      .from('day_1_progress')
      .update({
        [field]: journalId,
        current_step: nextStep,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error saving step journal:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Step journal saved');
    return { success: true };

  } catch (error) {
    console.error('❌ Error in saveStepJournal:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if both transcriptions are ready for mini-mirror generation
 * @param {string} userId - UUID of the user
 * @returns {Promise<{ready: boolean, step2Ready: boolean, step3Ready: boolean, error?: string}>}
 */
export async function checkBothTranscriptionsReady(userId) {
  try {
    console.log('🔍 [DEBUG] Checking transcription status for user:', userId);

    // Get progress to find journal IDs
    const { data: progress, error: progressError } = await supabase
      .from('day_1_progress')
      .select('step_2_journal_id, step_3_journal_id')
      .eq('user_id', userId)
      .single();

    if (progressError) {
      console.error('❌ [DEBUG] Error fetching progress:', progressError);
      return { ready: false, step2Ready: false, step3Ready: false, error: progressError.message };
    }

    console.log('📋 [DEBUG] Progress data:', {
      step_2_journal_id: progress.step_2_journal_id,
      step_3_journal_id: progress.step_3_journal_id,
    });

    if (!progress.step_2_journal_id || !progress.step_3_journal_id) {
      console.log('⏳ [DEBUG] Journals not yet created');
      return { ready: false, step2Ready: false, step3Ready: false };
    }

    // Check both journal transcription statuses
    const { data: journals, error: journalsError } = await supabase
      .from('journals')
      .select('id, transcription_status')
      .in('id', [progress.step_2_journal_id, progress.step_3_journal_id]);

    if (journalsError) {
      console.error('❌ [DEBUG] Error fetching journals:', journalsError);
      return { ready: false, step2Ready: false, step3Ready: false, error: journalsError.message };
    }

    console.log('📄 [DEBUG] Journals fetched:', journals?.length, 'journals');
    console.log('📄 [DEBUG] Raw journals data:', JSON.stringify(journals, null, 2));

    const step2Journal = journals.find(j => j.id === progress.step_2_journal_id);
    const step3Journal = journals.find(j => j.id === progress.step_3_journal_id);

    console.log('🔎 [DEBUG] Step 2 journal:', step2Journal ? `Found (status: ${step2Journal.transcription_status})` : 'NOT FOUND');
    console.log('🔎 [DEBUG] Step 3 journal:', step3Journal ? `Found (status: ${step3Journal.transcription_status})` : 'NOT FOUND');

    const step2Ready = step2Journal?.transcription_status === 'completed';
    const step3Ready = step3Journal?.transcription_status === 'completed';
    const bothReady = step2Ready && step3Ready;

    console.log('📊 [DEBUG] Final status:', {
      step2Ready,
      step3Ready,
      bothReady,
    });

    return { ready: bothReady, step2Ready, step3Ready };

  } catch (error) {
    console.error('❌ [DEBUG] Error in checkBothTranscriptionsReady:', error);
    return { ready: false, step2Ready: false, step3Ready: false, error: error.message };
  }
}

/**
 * Trigger mini-mirror generation (synchronous with timeout fallback)
 * @param {string} userId - UUID of the user
 * @returns {Promise<{success: boolean, mirror?: object, summaries?: object, error?: string}>}
 */
export async function generateMiniMirror(userId) {
  try {
    console.log('🚀 Triggering mini-mirror generation for user:', userId);

    // Update status to 'generating'
    await supabase
      .from('day_1_progress')
      .update({ generation_status: 'generating' })
      .eq('user_id', userId);

    // Call edge function
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const edgeFunctionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-day-1-mirror`;

    console.log('📡 Calling edge function:', edgeFunctionUrl);

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ userId }),
    });

    const responseText = await response.text();
    console.log('📥 Edge function response status:', response.status);

    let data;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.error('❌ Failed to parse response:', parseError);

      // Mark as failed
      await supabase
        .from('day_1_progress')
        .update({ generation_status: 'failed' })
        .eq('user_id', userId);

      return {
        success: false,
        error: `Invalid response from server: ${responseText.substring(0, 100)}`,
      };
    }

    if (!response.ok || !data.success) {
      console.error('❌ Generation failed:', data);

      // Mark as failed
      await supabase
        .from('day_1_progress')
        .update({ generation_status: 'failed' })
        .eq('user_id', userId);

      return {
        success: false,
        error: data?.error || 'Mini-mirror generation failed',
      };
    }

    console.log('✅ Mini-mirror generated successfully');
    return {
      success: true,
      mirror: data.mirror,
      summaries: data.summaries,
    };

  } catch (error) {
    console.error('❌ Error in generateMiniMirror:', error);

    // Mark as failed
    await supabase
      .from('day_1_progress')
      .update({ generation_status: 'failed' })
      .eq('user_id', userId);

    return { success: false, error: error.message };
  }
}

/**
 * Save focus areas input (Step 5)
 * @param {string} userId - UUID of the user
 * @param {string} mirrorId - UUID of the mini-mirror
 * @param {string} focusAreas - User-entered focus areas
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function saveFocusAreas(userId, mirrorId, focusAreas) {
  try {
    console.log('💾 Saving focus areas for mirror:', mirrorId);

    const { error } = await supabase
      .from('mirrors')
      .update({ focus_areas: focusAreas })
      .eq('id', mirrorId);

    if (error) {
      console.error('❌ Error saving focus areas:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Focus areas saved');
    return { success: true };

  } catch (error) {
    console.error('❌ Error in saveFocusAreas:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Complete Day 1 flow
 * @param {string} userId - UUID of the user
 * @param {string} focusTheme - Optional 1-2 word theme from focus areas
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function completeDay1(userId, focusTheme = null) {
  try {
    console.log('🎉 Completing Day 1 for user:', userId);
    if (focusTheme) {
      console.log('🎯 Focus theme:', focusTheme);
    }

    const now = new Date().toISOString();

    // Update day_1_progress
    const { error: progressError } = await supabase
      .from('day_1_progress')
      .update({ completed_at: now })
      .eq('user_id', userId);

    if (progressError) {
      console.error('❌ Error updating progress:', progressError);
      return { success: false, error: progressError.message };
    }

    // Update users table with completion time and theme
    const updateData = { day_1_completed_at: now };
    if (focusTheme) {
      updateData.day_1_focus_theme = focusTheme;
    }

    const { error: userError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (userError) {
      console.error('❌ Error updating user:', userError);
      return { success: false, error: userError.message };
    }

    console.log('✅ Day 1 completed successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Error in completeDay1:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Day 1 mirror for user
 * @param {string} userId - UUID of the user
 * @returns {Promise<{success: boolean, mirror?: object, progress?: object, error?: string}>}
 */
export async function getDay1Mirror(userId) {
  try {
    console.log('🔍 Fetching Day 1 mirror for user:', userId);

    // Get progress to find mirror_id and spiritual place
    const { data: progress, error: progressError } = await supabase
      .from('day_1_progress')
      .select('mini_mirror_id, spiritual_place, completed_at')
      .eq('user_id', userId)
      .single();

    if (progressError) {
      console.error('❌ Error fetching Day 1 progress:', progressError);
      return { success: false, error: progressError.message };
    }

    if (!progress || !progress.mini_mirror_id) {
      console.log('⚠️ No Day 1 mirror found for user');
      return { success: true, mirror: null };
    }

    // Get mirror data
    const { data: mirror, error: mirrorError } = await supabase
      .from('mirrors')
      .select('*')
      .eq('id', progress.mini_mirror_id)
      .single();

    if (mirrorError) {
      console.error('❌ Error fetching Day 1 mirror:', mirrorError);
      return { success: false, error: mirrorError.message };
    }

    console.log('✅ Day 1 mirror loaded');
    return {
      success: true,
      mirror,
      progress: {
        spiritualPlace: progress.spiritual_place,
        completedAt: progress.completed_at,
      },
    };

  } catch (error) {
    console.error('❌ Error in getDay1Mirror:', error);
    return { success: false, error: error.message };
  }
}
