// lib/supabase/friends.ts
// Service layer for friend linking functionality

import { supabase } from './client';
import * as Sentry from '@sentry/react-native';

/**
 * Generate a UUID v4 (works in React Native)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a unique invite link for a user to share with friends
 */
export async function createInviteLink(
  inviterUserId: string,
  inviterName: string,
  mirrorId?: string
): Promise<{ success: boolean; shareUrl?: string; token?: string; inviteId?: string; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('🔗 Creating friend invite link for:', inviterUserId);

    Sentry.addBreadcrumb({
      category: 'friends',
      message: 'Creating friend invite link',
      data: { inviterUserId },
      level: 'info',
    });

    // Generate unique token
    const token = generateUUID();

    // Store invite in database for analytics
    const { data, error } = await supabase
      .from('friend_invites')
      .insert({
        inviter_user_id: inviterUserId,
        token: token,
        mirror_id: mirrorId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating invite:', error);

      Sentry.captureException(new Error('Failed to create friend invite link'), {
        tags: { component: 'friends', action: 'createInvite' },
        contexts: {
          friends: {
            inviterUserId,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    // Internal deep link — embedded in the LinkRunner campaign link
    const deepLink = `oxbow://friend-invite/${token}?inviter=${inviterUserId}&name=${encodeURIComponent(inviterName)}`;

    // Create a shareable LinkRunner short URL wrapping the deep link
    let shareUrl = deepLink; // fallback to oxbow:// if API call fails
    try {
      const response = await fetch('https://api.linkrunner.io/api/v1/create-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'linkrunner-key': process.env.EXPO_PUBLIC_LINKRUNNER_API_KEY ?? '',
        },
        body: JSON.stringify({
          name: `friend-invite-${token}`,
          deeplink: `https://get.oxbowjournal.com/friend-invite/${token}?inviter=${inviterUserId}&name=${encodeURIComponent(inviterName)}`,
          ios_web_redirect: 'https://apps.apple.com/us/app/oxbow-journal/id6749494345',
          is_shortlink: true,
          domain: 'get.oxbowjournal.com',
        }),
      });
      const json = await response.json();
      if (json?.data?.link) {
        shareUrl = json.data.link;
        console.log('✅ LinkRunner short URL created:', shareUrl);
      } else {
        console.warn('[LinkRunner] Unexpected response shape:', json);
      }
    } catch (linkrunnerError) {
      console.error('[LinkRunner] ❌ Failed to create short URL:', linkrunnerError);
      Sentry.captureException(linkrunnerError, {
        tags: { component: 'friends', action: 'createInvite_linkrunner' },
        contexts: { friends: { inviterUserId, token } },
      });
    }

    console.log('✅ Invite link created:', data.id);
    return {
      success: true,
      token,
      shareUrl,
      inviteId: data.id,
    };
  } catch (error: any) {
    console.error('❌ Error in createInviteLink:', error);

    Sentry.captureException(error, {
      tags: { component: 'friends', action: 'createInvite', type: 'unexpected' },
      contexts: { friends: { inviterUserId } },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Accept a friend invite and create friend link
 */
export async function acceptInvite(
  token: string,
  inviteeUserId: string
): Promise<{
  success: boolean;
  linkId?: string;
  inviterName?: string | null;
  inviterProfilePicUrl?: string | null;
  error?: string;
}> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('🤝 Accepting invite with token:', token);

    Sentry.addBreadcrumb({
      category: 'friends',
      message: 'Accepting friend invite',
      data: { inviteeUserId },
      level: 'info',
    });

    // 1. Validate token exists and not yet accepted
    const { data: invite, error: inviteError } = await supabase
      .from('friend_invites')
      .select('*, users!friend_invites_inviter_user_id_fkey(display_name, profile_picture_url)')
      .eq('token', token)
      .is('accepted_at', null)
      .single();

    if (inviteError || !invite) {
      console.error('❌ Invalid invite:', inviteError);

      Sentry.captureException(new Error('Invalid or used invite token'), {
        tags: { component: 'friends', action: 'acceptInvite' },
        contexts: {
          friends: {
            inviteeUserId,
            error: inviteError?.message,
          },
        },
      });

      return {
        success: false,
        error: 'Invite not found or already used.',
      };
    }

    // 2. Check 72-hour expiry
    const createdAt = new Date(invite.created_at);
    const expiresAt = new Date(createdAt.getTime() + 72 * 60 * 60 * 1000);
    if (new Date() > expiresAt) {
      console.log('❌ Invite expired');
      return {
        success: false,
        error: 'Invite expired. Ask your friend to send a new one.',
      };
    }

    // 3. Check not linking to self
    if (invite.inviter_user_id === inviteeUserId) {
      console.log('❌ Cannot link to self');
      return {
        success: false,
        error: 'You cannot link with yourself.',
      };
    }

    // 4. Check not already linked
    const { data: existingLink } = await supabase
      .from('friend_links')
      .select('id')
      .or(
        `and(user_a_id.eq.${invite.inviter_user_id},user_b_id.eq.${inviteeUserId}),` +
          `and(user_a_id.eq.${inviteeUserId},user_b_id.eq.${invite.inviter_user_id})`
      )
      .eq('status', 'active')
      .maybeSingle();

    if (existingLink) {
      console.log('❌ Already linked');
      return {
        success: false,
        error: "You're already linked.",
      };
    }

    // 5. Create friend link (normalize IDs: lower UUID = user_a, higher UUID = user_b)
    const userAId =
      invite.inviter_user_id < inviteeUserId ? invite.inviter_user_id : inviteeUserId;
    const userBId =
      invite.inviter_user_id < inviteeUserId ? inviteeUserId : invite.inviter_user_id;

    const { data: link, error: linkError } = await supabase
      .from('friend_links')
      .insert({
        user_a_id: userAId,
        user_b_id: userBId,
        status: 'active',
      })
      .select()
      .single();

    if (linkError) {
      console.error('❌ Error creating friend link:', linkError);

      Sentry.captureException(new Error('Failed to create friend link'), {
        tags: { component: 'friends', action: 'acceptInvite' },
        contexts: {
          friends: {
            inviteeUserId,
            inviterUserId: invite.inviter_user_id,
            error: linkError.message,
          },
        },
      });

      return {
        success: false,
        error: 'Failed to create friend link. Please try again.',
      };
    }

    // 6a. If this invite carried a mirror, share it automatically
    if (invite.mirror_id) {
      const { error: shareError } = await supabase.from('mirror_shares').insert({
        mirror_id: invite.mirror_id,
        sender_user_id: invite.inviter_user_id,
        recipient_user_id: inviteeUserId,
      });
      if (shareError) {
        // Non-blocking — friendship succeeds even if this insert fails
        console.warn('⚠️ Failed to auto-create mirror_share on invite acceptance:', shareError.message);
        Sentry.captureException(new Error('Failed to auto-create mirror_share on invite acceptance'), {
          tags: { component: 'friends', action: 'acceptInvite_autoShare' },
          contexts: { friends: { inviteId: invite.id, mirrorId: invite.mirror_id, error: shareError.message } },
        });
      } else {
        console.log('✅ Auto-created mirror_share for invited user');
      }
    }

    // 6. Mark invite as accepted
    const { error: markError } = await supabase
      .from('friend_invites')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: inviteeUserId,
      })
      .eq('id', invite.id);

    if (markError) {
      // Non-fatal: link was created; log so we can detect reuse potential
      Sentry.captureException(new Error('Failed to mark invite as accepted'), {
        tags: { component: 'friends', action: 'acceptInvite' },
        contexts: { friends: { inviteId: invite.id, error: markError.message } },
      });
    }

    console.log('✅ Friend link created:', link.id);

    Sentry.addBreadcrumb({
      category: 'friends',
      message: 'Friend invite accepted successfully',
      data: { linkId: link.id },
      level: 'info',
    });

    return {
      success: true,
      linkId: link.id,
      inviterName: (invite.users as any)?.display_name ?? null,
      inviterProfilePicUrl: (invite.users as any)?.profile_picture_url ?? null,
    };
  } catch (error: any) {
    console.error('❌ Error in acceptInvite:', error);

    Sentry.captureException(error, {
      tags: { component: 'friends', action: 'acceptInvite', type: 'unexpected' },
      contexts: { friends: { inviteeUserId } },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Decline a friend invite so it is not shown again
 */
export async function declineInvite(
  token: string,
  inviteeUserId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    const { error } = await supabase
      .from('friend_invites')
      .update({
        declined_at: new Date().toISOString(),
        declined_by_user_id: inviteeUserId,
      })
      .eq('token', token)
      .is('accepted_at', null)
      .is('declined_at', null);

    if (error) {
      console.error('❌ Error declining invite:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in declineInvite:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get list of user's active friends
 */
export async function fetchFriends(
  userId: string
): Promise<{ success: boolean; friends?: any[]; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('👥 Fetching friends for:', userId);

    // Query friend_links where user is either user_a or user_b
    const { data: links, error } = await supabase
      .from('friend_links')
      .select('*')
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching friends:', error);
      return { success: false, error: error.message };
    }

    if (!links || links.length === 0) {
      console.log('📭 No friends found');
      return { success: true, friends: [] };
    }

    // Get friend user IDs (the other user in each link)
    const friendIds = links.map((link) =>
      link.user_a_id === userId ? link.user_b_id : link.user_a_id
    );

    // Fetch friend user data
    const { data: friendUsers, error: usersError } = await supabase
      .from('users')
      .select('id, display_name, access_code, profile_picture_url')
      .in('id', friendIds);

    if (usersError) {
      console.error('❌ Error fetching friend users:', usersError);
      return { success: false, error: usersError.message };
    }

    // Combine link data with user data
    const friends = links.map((link) => {
      const friendId = link.user_a_id === userId ? link.user_b_id : link.user_a_id;
      const friendUser = (friendUsers ?? []).find((u: any) => u.id === friendId);

      return {
        linkId: link.id,
        userId: friendId,
        displayName: friendUser?.display_name || 'Unknown',
        profilePictureUrl: friendUser?.profile_picture_url || null,
        linkedAt: link.created_at,
        status: link.status,
      };
    });

    console.log(`✅ Found ${friends.length} friends`);
    return { success: true, friends };
  } catch (error: any) {
    console.error('❌ Error in fetchFriends:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unlink a friend (soft delete - sets status to 'revoked')
 */
export async function unlinkFriend(
  linkId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    console.log('💔 Unlinking friend:', linkId);

    const { error } = await supabase
      .from('friend_links')
      .update({ status: 'revoked' })
      .eq('id', linkId);

    if (error) {
      console.error('❌ Error unlinking friend:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Friend unlinked successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in unlinkFriend:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if user can create more invites (future: add rate limiting)
 */
export async function checkCanInvite(
  _userId: string
): Promise<{ canInvite: boolean; reason?: string }> {
  // For MVP, always allow invites
  // Future: Add rate limiting, max pending invites, etc.
  return { canInvite: true };
}

/**
 * Count user's active friends
 */
export async function countFriends(
  userId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    const { count, error } = await supabase
      .from('friend_links')
      .select('*', { count: 'exact', head: true })
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
      .eq('status', 'active');

    if (error) {
      console.error('❌ Error counting friends:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error: any) {
    console.error('❌ Error in countFriends:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get inviter information from an invite token
 */
export async function getInviterInfo(token: string): Promise<{
  success: boolean;
  inviterName?: string;
  inviterProfilePicUrl?: string | null;
  error?: string;
}> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    const { data: invite, error } = await supabase
      .from('friend_invites')
      .select('created_at, users!friend_invites_inviter_user_id_fkey(display_name, profile_picture_url)')
      .eq('token', token)
      .is('accepted_at', null)
      .is('declined_at', null)
      .single();

    if (error || !invite) {
      return { success: false, error: 'Invite not found' };
    }

    const expiresAt = new Date(new Date(invite.created_at).getTime() + 72 * 60 * 60 * 1000);
    if (new Date() > expiresAt) {
      return { success: false, error: 'Invite expired. Ask your friend to send a new one.' };
    }

    return {
      success: true,
      inviterName: (invite.users as any).display_name,
      inviterProfilePicUrl: (invite.users as any).profile_picture_url,
    };
  } catch (error: any) {
    console.error('❌ Error in getInviterInfo:', error);
    return { success: false, error: error.message };
  }
}
