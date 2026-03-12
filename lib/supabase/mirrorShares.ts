// lib/supabase/mirrorShares.ts
// Service layer for sharing mirrors with friends

import { supabase } from './client';
import * as Sentry from '@sentry/react-native';

/**
 * Share a mirror with a friend
 */
export async function shareMirror(
  mirrorId: string,
  senderUserId: string,
  recipientUserId: string
): Promise<{ success: boolean; shareId?: string; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('📤 Sharing mirror:', mirrorId, 'to:', recipientUserId);

    Sentry.addBreadcrumb({
      category: 'mirrorShares',
      message: 'Sharing mirror with friend',
      data: { mirrorId, senderUserId, recipientUserId },
      level: 'info',
    });

    // 1. Verify sender owns the mirror
    const { data: mirror, error: mirrorError } = await supabase
      .from('mirrors')
      .select('id, custom_user_id')
      .eq('id', mirrorId)
      .single();

    if (mirrorError || !mirror) {
      console.error('❌ Mirror not found:', mirrorError);

      Sentry.captureException(new Error('Mirror not found during share'), {
        tags: { component: 'mirrorShares', action: 'shareMirror' },
        contexts: {
          mirrorShares: {
            mirrorId,
            senderUserId,
            error: mirrorError?.message,
          },
        },
      });

      return { success: false, error: 'Mirror not found' };
    }

    if (mirror.custom_user_id !== senderUserId) {
      console.error('❌ User does not own this mirror');

      Sentry.captureException(new Error('Unauthorized mirror share attempt'), {
        tags: { component: 'mirrorShares', action: 'shareMirror' },
        contexts: {
          mirrorShares: {
            mirrorId,
            senderUserId,
            ownerId: mirror.custom_user_id,
          },
        },
      });

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

      Sentry.captureException(new Error('Failed to create mirror share'), {
        tags: { component: 'mirrorShares', action: 'shareMirror' },
        contexts: {
          mirrorShares: {
            mirrorId,
            senderUserId,
            recipientUserId,
            error: shareError.message,
          },
        },
      });

      return { success: false, error: 'Failed to share mirror' };
    }

    console.log('✅ Mirror shared successfully:', share.id);

    Sentry.addBreadcrumb({
      category: 'mirrorShares',
      message: 'Mirror shared successfully',
      data: { shareId: share.id },
      level: 'info',
    });

    // 5. Send push notification to recipient
    try {
      // Get sender's display name
      const { data: senderData } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', senderUserId)
        .single();

      const senderName = senderData?.display_name || 'Someone';

      // Call edge function to send push notification
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const pushResponse = await fetch(
        'https://olqdyikgelidrytiiwfm.supabase.co/functions/v1/send-push-notification',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey ?? '',
          },
          body: JSON.stringify({
            userId: recipientUserId,
            title: `${senderName} shared their Mirror with you`,
            body: 'Tap to view their latest spiritual reflection',
            data: {
              type: 'mirror_share',
              shareId: share.id,
              senderId: senderUserId,
            },
          }),
        }
      );

      if (!pushResponse.ok) {
        console.warn('⚠️ Failed to send push notification (non-blocking)');
      } else {
        console.log('✅ Push notification sent');
      }
    } catch (notifError: any) {
      // Don't fail the share if notification fails
      console.warn('⚠️ Error sending push notification:', notifError.message);
    }

    return { success: true, shareId: share.id };
  } catch (error: any) {
    console.error('❌ Error in shareMirror:', error);

    Sentry.captureException(error, {
      tags: { component: 'mirrorShares', action: 'shareMirror', type: 'unexpected' },
      contexts: {
        mirrorShares: {
          mirrorId,
          senderUserId,
          recipientUserId,
        },
      },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Get mirrors shared with the user (incoming)
 */
export async function fetchIncomingShares(
  userId: string
): Promise<{ success: boolean; shares?: any[]; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

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

      Sentry.captureException(new Error('Failed to fetch incoming shares'), {
        tags: { component: 'mirrorShares', action: 'fetchIncoming' },
        contexts: {
          mirrorShares: {
            userId,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    const formattedShares = (shares || []).map((share: any) => ({
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
  } catch (error: any) {
    console.error('❌ Error in fetchIncomingShares:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get mirrors the user has shared with others (outgoing)
 */
export async function fetchSentShares(
  userId: string
): Promise<{ success: boolean; shares?: any[]; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

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

    const formattedShares = (shares || []).map((share: any) => {
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
  } catch (error: any) {
    console.error('❌ Error in fetchSentShares:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get count of unviewed incoming shares (for badge)
 */
export async function getUnviewedSharesCount(
  userId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

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
  } catch (error: any) {
    console.error('❌ Error in getUnviewedSharesCount:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get full mirror details for a shared mirror
 */
export async function getSharedMirrorDetails(
  shareId: string,
  userId: string
): Promise<{ success: boolean; mirror?: any; senderName?: string; sharedAt?: string; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

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
          mirror_type,
          screen_1_themes,
          screen_2_biblical,
          screen_3_observations,
          screen_4_suggestions,
          created_at,
          journal_count,
          focus_areas
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

      Sentry.captureException(new Error('Shared mirror not found'), {
        tags: { component: 'mirrorShares', action: 'getDetails' },
        contexts: {
          mirrorShares: {
            shareId,
            userId,
            error: error?.message,
          },
        },
      });

      return { success: false, error: 'Share not found' };
    }

    // Verify user is sender or recipient
    if (share.sender_user_id !== userId && share.recipient_user_id !== userId) {
      console.error('❌ User not authorized to view this share');

      Sentry.captureException(new Error('Unauthorized shared mirror access'), {
        tags: { component: 'mirrorShares', action: 'getDetails' },
        contexts: {
          mirrorShares: {
            shareId,
            userId,
            senderId: share.sender_user_id,
            recipientId: share.recipient_user_id,
          },
        },
      });

      return { success: false, error: 'Not authorized' };
    }

    console.log('✅ Shared mirror details retrieved');
    const m = share.mirrors as any;
    const u = share.users as any;
    return {
      success: true,
      mirror: {
        id: m.id,
        custom_user_id: m.custom_user_id,
        mirror_type: m.mirror_type,
        screen_1_themes: m.screen_1_themes,
        screen_2_biblical: m.screen_2_biblical,
        screen_3_observations: m.screen_3_observations,
        screen_4_suggestions: m.screen_4_suggestions,
        created_at: m.created_at,
        journal_count: m.journal_count,
        focus_areas: m.focus_areas,
      },
      senderName: u?.display_name || 'Unknown',
      sharedAt: share.created_at,
    };
  } catch (error: any) {
    console.error('❌ Error in getSharedMirrorDetails:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mark a shared mirror as viewed by recipient
 */
export async function markShareAsViewed(
  shareId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('👁️ Marking share as viewed:', shareId);

    Sentry.addBreadcrumb({
      category: 'mirrorShares',
      message: 'Marking share as viewed',
      data: { shareId, userId },
      level: 'info',
    });

    const { error } = await supabase
      .from('mirror_shares')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', shareId)
      .eq('recipient_user_id', userId) // Only recipient can mark as viewed
      .is('viewed_at', null); // Only update if not already viewed

    if (error) {
      console.error('❌ Error marking share as viewed:', error);

      Sentry.captureException(new Error('Failed to mark share as viewed'), {
        tags: { component: 'mirrorShares', action: 'markViewed' },
        contexts: {
          mirrorShares: {
            shareId,
            userId,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    console.log('✅ Share marked as viewed');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in markShareAsViewed:', error);

    Sentry.captureException(error, {
      tags: { component: 'mirrorShares', action: 'markViewed', type: 'unexpected' },
      contexts: { mirrorShares: { shareId, userId } },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Check if user can share a specific mirror with a specific friend
 */
export async function canShareMirror(
  mirrorId: string,
  senderUserId: string,
  recipientUserId: string
): Promise<{ canShare: boolean; reason?: string }> {
  if (!supabase) return { canShare: false, reason: 'Supabase not initialized' };

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
  } catch (error: any) {
    console.error('❌ Error in canShareMirror:', error);
    return { canShare: false, reason: error.message };
  }
}
