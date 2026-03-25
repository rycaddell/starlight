// lib/supabase/notifications.ts
// Service layer for notification rhythm and opt-in management

import { supabase } from './client';
import * as Sentry from '@sentry/react-native';

export async function saveRhythm(
  userId: string,
  slots: any[],
  enabled = true
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  Sentry.addBreadcrumb({
    category: 'notifications',
    message: 'Saving spiritual rhythm',
    data: { userId, slotCount: slots.length, enabled },
    level: 'info',
  });

  try {
    const { error } = await supabase
      .from('users')
      .update({ spiritual_rhythm: slots, notifications_enabled: enabled })
      .eq('id', userId);

    if (error) {
      Sentry.captureException(error, {
        tags: { component: 'notifications', action: 'saveRhythm' },
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: { component: 'notifications', action: 'saveRhythm', type: 'unexpected' },
    });
    return { success: false, error: error.message };
  }
}

export async function dismissNotifCard(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  Sentry.addBreadcrumb({
    category: 'notifications',
    message: 'Dismissing notification card',
    data: { userId },
    level: 'info',
  });

  try {
    const { error } = await supabase
      .from('users')
      .update({ notif_card_dismissed: true })
      .eq('id', userId);

    if (error) {
      Sentry.captureException(error, {
        tags: { component: 'notifications', action: 'dismissNotifCard' },
      });
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    Sentry.captureException(error, {
      tags: { component: 'notifications', action: 'dismissNotifCard', type: 'unexpected' },
    });
    return { success: false, error: error.message };
  }
}

export async function updateLastOpenedAt(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    const { error } = await supabase
      .from('users')
      .update({ last_opened_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
