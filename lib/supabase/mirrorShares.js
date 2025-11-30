// lib/supabase/mirrorShares.js
// Service layer for sharing mirrors with friends

import { supabase } from './client';

/**
 * Share a mirror with a friend
 * @param {string} mirrorId - UUID of mirror to share
 * @param {string} senderUserId - UUID of user sharing the mirror
 * @param {string} recipientUserId - UUID of friend receiving the mirror
 * @returns {Promise<{success: boolean, shareId?: string, error?: string}>}
 */
export async function shareMirror(mirrorId, senderUserId, recipientUserId) {
  try {
    console.log('📤 Sharing mirror:', mirrorId, 'to:', recipientUserId);

    // 1. Verify sender owns the mirror
    const { data: mirror, error: mirrorError } = await supabase
      .from('mirrors')
      .select('id, custom_user_id')
      .eq('id', mirrorId)
      .single();

    if (mirrorError || !mirror) {
      console.error('❌ Mirror not found:', mirrorError);
      return { success: false, error: 'Mirror not found' };
    }

    if (mirror.custom_user_id !== senderUserId) {
      console.error('❌ User does not own this mirror');
      return { success: false, error: 'You can only share your own mirrors' };
    }

    // 2. Verify active friend link exists
    const { data: friendLink } = await supabase
      .from('friend_links')
      .select('id')
      .or(
        `and(user_a_id.eq.${senderUserId},user_b_id.eq.${recipientUserId}),` +
        `and(user_a_id.eq.${recipientUserId},user_b_id.eq.${senderUserId})`
      )
      .eq('status', 'active')
      .maybeSingle();

    if (!friendLink) {
      console.error('❌ Not friends with recipient');
      return {
        success: false,
        error: 'You can only share with linked friends',
      };
    }

    // 3. Check if already shared (unique constraint will catch this, but better UX to check)
    const { data: existingShare } = await supabase
      .from('mirror_shares')
      .select('id')
      .eq('mirror_id', mirrorId)
      .eq('recipient_user_id', recipientUserId)
      .maybeSingle();

    if (existingShare) {
      console.log('ℹ️ Mirror already shared to this friend');
      return {
        success: false,
        error: 'You have already shared this mirror with them',
      };
    }

    // 4. Create mirror share
    const { data: share, error: shareError } = await supabase
      .from('mirror_shares')
      .insert({
        mirror_id: mirrorId,
        sender_user_id: senderUserId,
        recipient_user_id: recipientUserId,
      })
      .select()
      .single();

    if (shareError) {
      console.error('❌ Error creating share:', shareError);
      return { success: false, error: 'Failed to share mirror' };
    }

    console.log('✅ Mirror shared successfully:', share.id);
    return { success: true, shareId: share.id };
  } catch (error) {
    console.error('❌ Error in shareMirror:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get mirrors shared with the user (incoming)
 * @param {string} userId - UUID of user
 * @returns {Promise<{success: boolean, shares?: Array, error?: string}>}
 */
export async function fetchIncomingShares(userId) {
  try {
    console.log('📥 Fetching incoming shares for:', userId);

    const { data: shares, error } = await supabase
      .from('mirror_shares')
      .select(
        `
        id,
        mirror_id,
        sender_user_id,
        created_at,
        viewed_at,
        mirrors!inner (
          id,
          screen_1_themes,
          screen_2_biblical,
          screen_3_observations,
          created_at,
          journal_count
        ),
        users!mirror_shares_sender_user_id_fkey (
          id,
          display_name
        )
      `
      )
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching incoming shares:', error);
      return { success: false, error: error.message };
    }

    const formattedShares = (shares || []).map((share) => ({
      shareId: share.id,
      mirrorId: share.mirror_id,
      senderId: share.sender_user_id,
      senderName: share.users?.display_name || 'Unknown',
      sharedAt: share.created_at,
      viewedAt: share.viewed_at,
      isNew: !share.viewed_at, // True if never viewed
      mirror: {
        id: share.mirrors.id,
        screen_1_themes: share.mirrors.screen_1_themes,
        screen_2_biblical: share.mirrors.screen_2_biblical,
        screen_3_observations: share.mirrors.screen_3_observations,
        created_at: share.mirrors.created_at,
        journal_count: share.mirrors.journal_count,
      },
    }));

    console.log(`✅ Found ${formattedShares.length} incoming shares`);
    return { success: true, shares: formattedShares };
  } catch (error) {
    console.error('❌ Error in fetchIncomingShares:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get mirrors the user has shared with others (outgoing)
 * @param {string} userId - UUID of user
 * @returns {Promise<{success: boolean, shares?: Array, error?: string}>}
 */
export async function fetchSentShares(userId) {
  try {
    console.log('📤 Fetching sent shares for:', userId);

    const { data: shares, error } = await supabase
      .from('mirror_shares')
      .select(
        `
        id,
        mirror_id,
        recipient_user_id,
        created_at,
        mirrors!inner (
          id,
          screen_1_themes,
          created_at
        ),
        users!mirror_shares_recipient_user_id_fkey (
          id,
          display_name
        )
      `
      )
      .eq('sender_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching sent shares:', error);
      return { success: false, error: error.message };
    }

    const formattedShares = (shares || []).map((share) => {
      // Extract first theme title for preview
      const firstTheme = share.mirrors.screen_1_themes?.themes?.[0];
      const mirrorPreview = firstTheme?.name || 'Mirror';

      return {
        shareId: share.id,
        mirrorId: share.mirror_id,
        recipientId: share.recipient_user_id,
        recipientName: share.users?.display_name || 'Unknown',
        sharedAt: share.created_at,
        mirrorPreview,
        mirrorCreatedAt: share.mirrors.created_at,
      };
    });

    console.log(`✅ Found ${formattedShares.length} sent shares`);
    return { success: true, shares: formattedShares };
  } catch (error) {
    console.error('❌ Error in fetchSentShares:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get count of unviewed incoming shares (for badge)
 * @param {string} userId - UUID of user
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export async function getUnviewedSharesCount(userId) {
  try {
    const { count, error } = await supabase
      .from('mirror_shares')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_user_id', userId)
      .is('viewed_at', null); // Only count unviewed shares

    if (error) {
      console.error('❌ Error counting unviewed shares:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('❌ Error in getUnviewedSharesCount:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get full mirror details for a shared mirror
 * @param {string} shareId - UUID of mirror_share
 * @param {string} userId - UUID of requesting user (must be sender or recipient)
 * @returns {Promise<{success: boolean, mirror?: Object, senderName?: string, error?: string}>}
 */
export async function getSharedMirrorDetails(shareId, userId) {
  try {
    console.log('🔍 Fetching shared mirror details:', shareId);

    const { data: share, error } = await supabase
      .from('mirror_shares')
      .select(
        `
        id,
        mirror_id,
        sender_user_id,
        recipient_user_id,
        created_at,
        mirrors!inner (
          id,
          custom_user_id,
          screen_1_themes,
          screen_2_biblical,
          screen_3_observations,
          screen_4_suggestions,
          created_at,
          journal_count
        ),
        users!mirror_shares_sender_user_id_fkey (
          display_name
        )
      `
      )
      .eq('id', shareId)
      .single();

    if (error || !share) {
      console.error('❌ Share not found:', error);
      return { success: false, error: 'Share not found' };
    }

    // Verify user is sender or recipient
    if (
      share.sender_user_id !== userId &&
      share.recipient_user_id !== userId
    ) {
      console.error('❌ User not authorized to view this share');
      return { success: false, error: 'Not authorized' };
    }

    console.log('✅ Shared mirror details retrieved');
    return {
      success: true,
      mirror: {
        id: share.mirrors.id,
        screen_1_themes: share.mirrors.screen_1_themes,
        screen_2_biblical: share.mirrors.screen_2_biblical,
        screen_3_observations: share.mirrors.screen_3_observations,
        screen_4_suggestions: share.mirrors.screen_4_suggestions,
        created_at: share.mirrors.created_at,
        journal_count: share.mirrors.journal_count,
      },
      senderName: share.users?.display_name || 'Unknown',
      sharedAt: share.created_at,
    };
  } catch (error) {
    console.error('❌ Error in getSharedMirrorDetails:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark a shared mirror as viewed by recipient
 * @param {string} shareId - UUID of mirror_share
 * @param {string} userId - UUID of user viewing (must be recipient)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function markShareAsViewed(shareId, userId) {
  try {
    console.log('👁️ Marking share as viewed:', shareId);

    const { error } = await supabase
      .from('mirror_shares')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', shareId)
      .eq('recipient_user_id', userId) // Only recipient can mark as viewed
      .is('viewed_at', null); // Only update if not already viewed

    if (error) {
      console.error('❌ Error marking share as viewed:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Share marked as viewed');
    return { success: true };
  } catch (error) {
    console.error('❌ Error in markShareAsViewed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user can share a specific mirror with a specific friend
 * @param {string} mirrorId - UUID of mirror
 * @param {string} senderUserId - UUID of sender
 * @param {string} recipientUserId - UUID of recipient
 * @returns {Promise<{canShare: boolean, reason?: string}>}
 */
export async function canShareMirror(mirrorId, senderUserId, recipientUserId) {
  try {
    // Check if already shared
    const { data: existingShare } = await supabase
      .from('mirror_shares')
      .select('id')
      .eq('mirror_id', mirrorId)
      .eq('recipient_user_id', recipientUserId)
      .maybeSingle();

    if (existingShare) {
      return {
        canShare: false,
        reason: 'Already shared with this friend',
      };
    }

    // Check if friends
    const { data: friendLink } = await supabase
      .from('friend_links')
      .select('id')
      .or(
        `and(user_a_id.eq.${senderUserId},user_b_id.eq.${recipientUserId}),` +
        `and(user_a_id.eq.${recipientUserId},user_b_id.eq.${senderUserId})`
      )
      .eq('status', 'active')
      .maybeSingle();

    if (!friendLink) {
      return {
        canShare: false,
        reason: 'Not linked as friends',
      };
    }

    return { canShare: true };
  } catch (error) {
    console.error('❌ Error in canShareMirror:', error);
    return { canShare: false, reason: error.message };
  }
}
