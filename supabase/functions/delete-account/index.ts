// supabase/functions/delete-account/index.ts
// Permanently deletes a user account and all associated data.
// Called from the app's Settings > Delete Account flow.
//
// Deletion order (explicit, not relying solely on cascades):
//   1. Storage files (audio recordings, profile picture)
//   2. mirror_shares
//   3. mirror_generation_requests
//   4. transcription_jobs
//   5. day_1_progress
//   6. journals  (before mirrors — journals.mirror_id refs mirrors)
//   7. mirrors
//   8. friend_links
//   9. friend_invites
//  10. users     (last — cascades handle any remaining refs)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'userId is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('🗑️ Starting account deletion for user:', userId);

    // ─── 1. Storage: audio recordings ────────────────────────────────────────
    // List all files under {userId}/ in the audio-recordings bucket and delete them
    const { data: audioFiles } = await supabase.storage
      .from('audio-recordings')
      .list(userId);

    if (audioFiles && audioFiles.length > 0) {
      const paths = audioFiles.map((f) => `${userId}/${f.name}`);
      const { error: audioDeleteError } = await supabase.storage
        .from('audio-recordings')
        .remove(paths);
      if (audioDeleteError) {
        console.warn('⚠️ Failed to delete some audio files:', audioDeleteError.message);
      } else {
        console.log(`🗑️ Deleted ${paths.length} audio file(s)`);
      }
    }

    // ─── 2. Storage: profile picture ─────────────────────────────────────────
    // Profile pictures are stored as {userId}/profile.{ext} in profile-pictures bucket.
    // Attempt deletion; non-fatal if bucket doesn't exist or file is missing.
    try {
      const { data: profileFiles } = await supabase.storage
        .from('profile-pictures')
        .list(userId);

      if (profileFiles && profileFiles.length > 0) {
        const paths = profileFiles.map((f) => `${userId}/${f.name}`);
        const { error: profileDeleteError } = await supabase.storage
          .from('profile-pictures')
          .remove(paths);
        if (profileDeleteError) {
          console.warn('⚠️ Failed to delete profile picture:', profileDeleteError.message);
        } else {
          console.log('🗑️ Deleted profile picture');
        }
      }
    } catch (e) {
      console.warn('⚠️ Profile picture deletion skipped:', e.message);
    }

    // ─── 3. mirror_shares ────────────────────────────────────────────────────
    const { error: sharesError } = await supabase
      .from('mirror_shares')
      .delete()
      .or(`sender_user_id.eq.${userId},recipient_user_id.eq.${userId}`);
    if (sharesError) throw new Error(`mirror_shares: ${sharesError.message}`);
    console.log('🗑️ Deleted mirror_shares');

    // ─── 4. mirror_generation_requests ───────────────────────────────────────
    const { error: genReqError } = await supabase
      .from('mirror_generation_requests')
      .delete()
      .eq('custom_user_id', userId);
    if (genReqError) console.warn('⚠️ mirror_generation_requests delete:', genReqError.message);
    else console.log('🗑️ Deleted mirror_generation_requests');

    // ─── 5. transcription_jobs ───────────────────────────────────────────────
    const { error: txJobsError } = await supabase
      .from('transcription_jobs')
      .delete()
      .eq('custom_user_id', userId);
    if (txJobsError) console.warn('⚠️ transcription_jobs delete:', txJobsError.message);
    else console.log('🗑️ Deleted transcription_jobs');

    // ─── 6. day_1_progress ───────────────────────────────────────────────────
    const { error: day1Error } = await supabase
      .from('day_1_progress')
      .delete()
      .eq('user_id', userId);
    if (day1Error) throw new Error(`day_1_progress: ${day1Error.message}`);
    console.log('🗑️ Deleted day_1_progress');

    // ─── 7. journals ─────────────────────────────────────────────────────────
    const { error: journalsError } = await supabase
      .from('journals')
      .delete()
      .eq('custom_user_id', userId);
    if (journalsError) throw new Error(`journals: ${journalsError.message}`);
    console.log('🗑️ Deleted journals');

    // ─── 8. mirrors ──────────────────────────────────────────────────────────
    const { error: mirrorsError } = await supabase
      .from('mirrors')
      .delete()
      .eq('custom_user_id', userId);
    if (mirrorsError) throw new Error(`mirrors: ${mirrorsError.message}`);
    console.log('🗑️ Deleted mirrors');

    // ─── 9. friend_links ─────────────────────────────────────────────────────
    const { error: linksError } = await supabase
      .from('friend_links')
      .delete()
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
    if (linksError) throw new Error(`friend_links: ${linksError.message}`);
    console.log('🗑️ Deleted friend_links');

    // ─── 10. friend_invites ───────────────────────────────────────────────────
    const { error: invitesError } = await supabase
      .from('friend_invites')
      .delete()
      .eq('inviter_user_id', userId);
    if (invitesError) throw new Error(`friend_invites: ${invitesError.message}`);
    console.log('🗑️ Deleted friend_invites');

    // ─── 11. users (last) ────────────────────────────────────────────────────
    const { error: userError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    if (userError) throw new Error(`users: ${userError.message}`);
    console.log('✅ User record deleted — account deletion complete');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ delete-account failed:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
