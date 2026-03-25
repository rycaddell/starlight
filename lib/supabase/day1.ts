// lib/supabase/day1.ts
// Service layer for Day 1 onboarding flow
// Manages progress through 5-step journey ending with mini-mirror generation

import { supabase } from './client';
import * as Sentry from '@sentry/react-native';

/**
 * Get or create Day 1 progress for user
 */
export async function getDay1Progress(
  userId: string
): Promise<{ success: boolean; progress?: any; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

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

      Sentry.addBreadcrumb({
        category: 'day1',
        message: 'Creating initial Day 1 progress',
        data: { userId },
        level: 'info',
      });

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

        Sentry.captureException(new Error('Failed to create Day 1 progress'), {
          tags: { component: 'day1', action: 'createProgress' },
          contexts: {
            day1: {
              userId,
              error: createError.message,
            },
          },
        });

        return { success: false, error: createError.message };
      }

      return { success: true, progress: newProgress };
    }

    if (error) {
      console.error('❌ Error fetching progress:', error);

      Sentry.captureException(new Error('Failed to fetch Day 1 progress'), {
        tags: { component: 'day1', action: 'getProgress' },
        contexts: {
          day1: {
            userId,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    console.log('✅ Progress loaded:', data);
    return { success: true, progress: data };
  } catch (error: any) {
    console.error('❌ Error in getDay1Progress:', error);

    Sentry.captureException(error, {
      tags: { component: 'day1', action: 'getProgress', type: 'unexpected' },
      contexts: { day1: { userId } },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Update current step in Day 1 flow
 */
export async function updateCurrentStep(
  userId: string,
  step: number
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

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
  } catch (error: any) {
    console.error('❌ Error in updateCurrentStep:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Save spiritual place selection (Step 1)
 */
export async function saveSpiritualPlace(
  userId: string,
  spiritualPlace: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('💾 Saving spiritual place:', spiritualPlace, 'for user:', userId);

    Sentry.addBreadcrumb({
      category: 'day1',
      message: 'Saving spiritual place',
      data: { userId, spiritualPlace },
      level: 'info',
    });

    const { error } = await supabase
      .from('day_1_progress')
      .update({
        spiritual_place: spiritualPlace,
        current_step: 2, // Advance to step 2
      })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error saving spiritual place:', error);

      Sentry.captureException(new Error('Failed to save spiritual place'), {
        tags: { component: 'day1', action: 'saveSpiritualPlace' },
        contexts: {
          day1: {
            userId,
            spiritualPlace,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    console.log('✅ Spiritual place saved');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in saveSpiritualPlace:', error);

    Sentry.captureException(error, {
      tags: { component: 'day1', action: 'saveSpiritualPlace', type: 'unexpected' },
      contexts: { day1: { userId, spiritualPlace } },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Save journal ID for a specific step (Steps 2 or 3)
 */
export async function saveStepJournal(
  userId: string,
  step: number,
  journalId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log(`💾 Saving journal for step ${step}:`, journalId);

    Sentry.addBreadcrumb({
      category: 'day1',
      message: `Saving step ${step} journal`,
      data: { userId, step, journalId },
      level: 'info',
    });

    const field = step === 2 ? 'step_2_journal_id' : 'step_3_journal_id';
    const nextStep = step === 2 ? 3 : 3; // Step 2 → 3, Step 3 → 3 (generation handled by modal)

    const { error } = await supabase
      .from('day_1_progress')
      .update({
        [field]: journalId,
        current_step: nextStep,
      })
      .eq('user_id', userId);

    if (error) {
      console.error('❌ Error saving step journal:', error);

      Sentry.captureException(new Error(`Failed to save step ${step} journal`), {
        tags: { component: 'day1', action: 'saveStepJournal' },
        contexts: {
          day1: {
            userId,
            step,
            journalId,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    console.log('✅ Step journal saved');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in saveStepJournal:', error);

    Sentry.captureException(error, {
      tags: { component: 'day1', action: 'saveStepJournal', type: 'unexpected' },
      contexts: { day1: { userId, step, journalId } },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Check if both transcriptions are ready for mini-mirror generation
 */
export async function checkBothTranscriptionsReady(userId: string): Promise<{
  ready: boolean;
  step2Ready: boolean;
  step3Ready: boolean;
  error?: string;
}> {
  if (!supabase) return { ready: false, step2Ready: false, step3Ready: false, error: 'Supabase not initialized' };

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

    const step2Journal = (journals ?? []).find((j: any) => j.id === progress.step_2_journal_id);
    const step3Journal = (journals ?? []).find((j: any) => j.id === progress.step_3_journal_id);

    console.log(
      '🔎 [DEBUG] Step 2 journal:',
      step2Journal ? `Found (status: ${step2Journal.transcription_status})` : 'NOT FOUND'
    );
    console.log(
      '🔎 [DEBUG] Step 3 journal:',
      step3Journal ? `Found (status: ${step3Journal.transcription_status})` : 'NOT FOUND'
    );

    const step2Ready = step2Journal?.transcription_status === 'completed';
    const step3Ready = step3Journal?.transcription_status === 'completed';
    const bothReady = step2Ready && step3Ready;

    console.log('📊 [DEBUG] Final status:', {
      step2Ready,
      step3Ready,
      bothReady,
    });

    return { ready: bothReady, step2Ready, step3Ready };
  } catch (error: any) {
    console.error('❌ [DEBUG] Error in checkBothTranscriptionsReady:', error);
    return { ready: false, step2Ready: false, step3Ready: false, error: error.message };
  }
}

/**
 * Trigger mini-mirror generation (synchronous with timeout fallback)
 */
export async function generateMiniMirror(userId: string): Promise<{
  success: boolean;
  mirror?: any;
  summaries?: any;
  error?: string;
}> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('🚀 Triggering mini-mirror generation for user:', userId);

    Sentry.addBreadcrumb({
      category: 'day1',
      message: 'Generating mini-mirror',
      data: { userId },
      level: 'info',
    });

    // Update status to 'generating'
    await supabase
      .from('day_1_progress')
      .update({ generation_status: 'generating' })
      .eq('user_id', userId);

    // Call edge function
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const edgeFunctionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-day-1-mirror`;
    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log('📡 Calling edge function:', edgeFunctionUrl);

    const GENERATION_TIMEOUT_MS = 90_000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('GENERATION_TIMEOUT')), GENERATION_TIMEOUT_MS)
    );

    const response = await Promise.race([
      fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: anonKey ?? '',
        },
        body: JSON.stringify({}),
      }),
      timeoutPromise,
    ]);

    const responseText = await response.text();
    console.log('📥 Edge function response status:', response.status);

    let data: any;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch (parseError: any) {
      console.error('❌ Failed to parse response:', parseError);

      Sentry.captureException(parseError, {
        tags: { component: 'day1', action: 'generateMiniMirror' },
        contexts: {
          day1: {
            userId,
            status: response.status,
            responsePreview: responseText.substring(0, 100),
          },
        },
      });

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

      const errorMessage = data?.error || 'Mini-mirror generation failed';
      const isTranscriptionPending = errorMessage === 'Transcriptions not yet complete';

      // Don't mark as failed or log to Sentry for a transient transcription-pending state
      if (!isTranscriptionPending) {
        Sentry.captureException(new Error('Mini-mirror generation failed'), {
          tags: { component: 'day1', action: 'generateMiniMirror' },
          contexts: {
            day1: {
              userId,
              status: response.status,
              error: data?.error,
            },
          },
        });

        await supabase
          .from('day_1_progress')
          .update({ generation_status: 'failed' })
          .eq('user_id', userId);
      }

      return {
        success: false,
        error: errorMessage,
      };
    }

    console.log('✅ Mini-mirror generated successfully');

    Sentry.addBreadcrumb({
      category: 'day1',
      message: 'Mini-mirror generated successfully',
      data: { userId, mirrorId: data.mirror?.id },
      level: 'info',
    });

    return {
      success: true,
      mirror: data.mirror,
      summaries: data.summaries,
    };
  } catch (error: any) {
    const isTimeout = error?.message === 'GENERATION_TIMEOUT';
    console.error(`❌ Error in generateMiniMirror (${isTimeout ? 'timeout' : 'unexpected'}):`, error);

    Sentry.captureException(error, {
      tags: { component: 'day1', action: 'generateMiniMirror', type: isTimeout ? 'timeout' : 'unexpected' },
      contexts: { day1: { userId } },
    });

    // Mark as failed
    await supabase
      .from('day_1_progress')
      .update({ generation_status: 'failed' })
      .eq('user_id', userId);

    return { success: false, error: isTimeout ? 'GENERATION_TIMEOUT' : error.message };
  }
}

/**
 * Save focus areas input (Step 5)
 */
export async function saveFocusAreas(
  userId: string,
  mirrorId: string,
  focusAreas: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('💾 Saving focus areas for mirror:', mirrorId);

    Sentry.addBreadcrumb({
      category: 'day1',
      message: 'Saving focus areas',
      data: { userId, mirrorId, focusAreasLength: focusAreas?.length || 0 },
      level: 'info',
    });

    const { error } = await supabase
      .from('mirrors')
      .update({ focus_areas: focusAreas })
      .eq('id', mirrorId);

    if (error) {
      console.error('❌ Error saving focus areas:', error);

      Sentry.captureException(new Error('Failed to save focus areas'), {
        tags: { component: 'day1', action: 'saveFocusAreas' },
        contexts: {
          day1: {
            userId,
            mirrorId,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    console.log('✅ Focus areas saved');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in saveFocusAreas:', error);

    Sentry.captureException(error, {
      tags: { component: 'day1', action: 'saveFocusAreas', type: 'unexpected' },
      contexts: { day1: { userId, mirrorId } },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Complete Day 1 flow
 */
export async function completeDay1(
  userId: string,
  focusTheme: string | null = null
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('🎉 Completing Day 1 for user:', userId);
    if (focusTheme) {
      console.log('🎯 Focus theme:', focusTheme);
    }

    Sentry.addBreadcrumb({
      category: 'day1',
      message: 'Completing Day 1',
      data: { userId, hasFocusTheme: !!focusTheme },
      level: 'info',
    });

    const now = new Date().toISOString();

    // Update day_1_progress
    const { error: progressError } = await supabase
      .from('day_1_progress')
      .update({ completed_at: now })
      .eq('user_id', userId);

    if (progressError) {
      console.error('❌ Error updating progress:', progressError);

      Sentry.captureException(new Error('Failed to update Day 1 progress'), {
        tags: { component: 'day1', action: 'completeDay1' },
        contexts: {
          day1: {
            userId,
            error: progressError.message,
          },
        },
      });

      return { success: false, error: progressError.message };
    }

    // Update users table with completion time and theme
    const updateData: Record<string, string> = { day_1_completed_at: now };
    if (focusTheme) {
      updateData.day_1_focus_theme = focusTheme;
    }

    const { error: userError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (userError) {
      console.error('❌ Error updating user:', userError);

      Sentry.captureException(new Error('Failed to update user Day 1 completion'), {
        tags: { component: 'day1', action: 'completeDay1' },
        contexts: {
          day1: {
            userId,
            error: userError.message,
          },
        },
      });

      return { success: false, error: userError.message };
    }

    console.log('✅ Day 1 completed successfully');

    Sentry.addBreadcrumb({
      category: 'day1',
      message: 'Day 1 completed successfully',
      data: { userId, focusTheme },
      level: 'info',
    });

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in completeDay1:', error);

    Sentry.captureException(error, {
      tags: { component: 'day1', action: 'completeDay1', type: 'unexpected' },
      contexts: { day1: { userId } },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Save focus theme to user record (called after focus is submitted in Step 5)
 * completeDay1() is called at generation time; this just adds the theme.
 */
export async function updateFocusTheme(
  userId: string,
  theme: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    const { error } = await supabase
      .from('users')
      .update({ day_1_focus_theme: theme })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error updating focus theme:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Focus theme updated:', theme);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in updateFocusTheme:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get Day 1 mirror for user
 */
export async function getDay1Mirror(userId: string): Promise<{
  success: boolean;
  mirror?: any;
  progress?: { spiritualPlace: string; completedAt: string } | null;
  error?: string;
}> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    // Get progress to find mirror_id and spiritual place
    const { data: progress, error: progressError } = await supabase
      .from('day_1_progress')
      .select('mini_mirror_id, spiritual_place, completed_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (progressError) {
      console.error('❌ Error fetching Day 1 progress:', progressError);
      return { success: false, error: progressError.message };
    }

    if (!progress || !progress.mini_mirror_id) {
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

    return {
      success: true,
      mirror,
      progress: {
        spiritualPlace: progress.spiritual_place,
        completedAt: progress.completed_at,
      },
    };
  } catch (error: any) {
    console.error('❌ Error in getDay1Mirror:', error);
    return { success: false, error: error.message };
  }
}
