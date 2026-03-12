import { supabase } from './client';
import * as Sentry from '@sentry/react-native';

// Save a new journal entry (UPDATED FOR PROMPT TEXT)
/**
 * @param {string} content
 * @param {string} customUserId
 * @param {string | null} entryType - 'text' or 'voice'
 * @param {string | null} promptText
 * @param {string | null} transcriptionStatus
 */
export const saveJournalEntry = async (
  content,
  customUserId,
  entryType = null,
  promptText = null,
  transcriptionStatus = null
) => {
  try {
    // Add Sentry breadcrumb
    Sentry.addBreadcrumb({
      category: 'journal',
      message: 'Saving journal entry',
      data: {
        customUserId,
        entryType,
        hasPromptText: !!promptText,
        transcriptionStatus,
        contentLength: content?.length || 0,
      },
      level: 'info',
    });

    const journalEntry = {
      content: content,
      custom_user_id: customUserId,
      journal_entry_type: entryType,
      prompt_text: promptText,
      created_at: new Date().toISOString()
    };

    // Only set transcription_status if explicitly provided
    if (transcriptionStatus) {
      journalEntry.transcription_status = transcriptionStatus;
      console.log('📝 [saveJournalEntry] Setting transcription_status:', transcriptionStatus);
    }

    console.log('📝 [saveJournalEntry] Inserting journal entry:', JSON.stringify(journalEntry, null, 2));

    const { data, error } = await supabase
      .from('journals')
      .insert([journalEntry])
      .select();

    if (error) {
      console.error('❌ [saveJournalEntry] Error saving journal:', error);

      // Capture error in Sentry
      Sentry.captureException(new Error('Failed to save journal entry'), {
        tags: { component: 'journals', action: 'save' },
        contexts: {
          journal: {
            customUserId,
            entryType,
            hasPromptText: !!promptText,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    console.log('✅ [saveJournalEntry] Journal saved successfully:', JSON.stringify(data[0], null, 2));

    // Add success breadcrumb
    Sentry.addBreadcrumb({
      category: 'journal',
      message: 'Journal entry saved successfully',
      data: { journalId: data[0].id },
      level: 'info',
    });

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error saving journal:', error);

    // Capture unexpected error
    Sentry.captureException(error, {
      tags: { component: 'journals', action: 'save', type: 'unexpected' },
      contexts: {
        journal: {
          customUserId,
          entryType,
          hasPromptText: !!promptText,
        },
      },
    });

    return { success: false, error: 'Failed to save journal entry' };
  }
};

// Get user's journal entries (UPDATED FOR CUSTOM USERS)
export const getUserJournals = async (customUserId, limit = null) => {
  try {
    let query = supabase
      .from('journals')
      .select('*')
      .eq('custom_user_id', customUserId)
      // Hide in-progress voice journals with no content yet.
      // Show if: has content, OR status is null/completed/failed, OR no status set.
      .or('content.neq.,transcription_status.is.null,transcription_status.not.in.(pending,processing)')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching journals:', error);

      // Capture error in Sentry
      Sentry.captureException(new Error('Failed to fetch journals'), {
        tags: { component: 'journals', action: 'fetch' },
        contexts: {
          journal: {
            customUserId,
            limit,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching journals:', error);

    // Capture unexpected error
    Sentry.captureException(error, {
      tags: { component: 'journals', action: 'fetch', type: 'unexpected' },
      contexts: { journal: { customUserId, limit } },
    });

    return { success: false, error: 'Failed to fetch journals' };
  }
};

// Get today's answered guided prompts
export const getTodaysAnsweredPrompts = async (customUserId) => {
  try {
    // Get start of today in user's timezone
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const { data, error } = await supabase
      .from('journals')
      .select('prompt_text')
      .eq('custom_user_id', customUserId)
      .not('prompt_text', 'is', null)
      .gte('created_at', todayISO);

    if (error) {
      console.error('Error fetching today\'s prompts:', error);
      return { success: false, error: error.message };
    }

    // Extract just the prompt text strings
    const promptTexts = (data || [])
      .map(entry => entry.prompt_text)
      .filter(text => text !== null);

    return { success: true, data: promptTexts };
  } catch (error) {
    console.error('Error fetching today\'s prompts:', error);
    return { success: false, error: 'Failed to fetch today\'s prompts' };
  }
};

// Count user's journal entries (UPDATED FOR CUSTOM USERS)
export const getUserJournalCount = async (customUserId) => {
  try {
    const { count, error } = await supabase
      .from('journals')
      .select('*', { count: 'exact', head: true })
      .eq('custom_user_id', customUserId)
      .is('mirror_id', null) // Only count journals not yet assigned to a Mirror
      .or('content.neq.,transcription_status.is.null,transcription_status.not.in.(pending,processing)'); // Exclude empty in-progress voice journals

    if (error) {
      console.error('Error counting journals:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    console.error('Error counting journals:', error);
    return { success: false, error: 'Failed to count journals' };
  }
};

export const deleteJournalEntry = async (journalId) => {
  try {
    console.log('🗑️ Deleting journal entry:', journalId);

    // Add Sentry breadcrumb
    Sentry.addBreadcrumb({
      category: 'journal',
      message: 'Deleting journal entry',
      data: { journalId },
      level: 'info',
    });

    const { error } = await supabase
      .from('journals')
      .delete()
      .eq('id', journalId);

    if (error) {
      console.error('❌ Error deleting journal:', error);

      // Capture error in Sentry
      Sentry.captureException(new Error('Failed to delete journal entry'), {
        tags: { component: 'journals', action: 'delete' },
        contexts: {
          journal: {
            journalId,
            error: error.message,
          },
        },
      });

      return { success: false, error: error.message };
    }

    console.log('✅ Journal entry deleted successfully');
    return { success: true };

  } catch (error) {
    console.error('❌ Error in deleteJournalEntry:', error);

    // Capture unexpected error
    Sentry.captureException(error, {
      tags: { component: 'journals', action: 'delete', type: 'unexpected' },
      contexts: { journal: { journalId } },
    });

    return { success: false, error: error.message };
  }
};

// Get user's last journal entry type (for default tab selection)
export const getLastJournalType = async (customUserId) => {
  try {
    const { data, error } = await supabase
      .from('journals')
      .select('journal_entry_type')
      .eq('custom_user_id', customUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // User might have no journals yet (404 error)
      if (error.code === 'PGRST116') {
        return { success: true, journalType: null }; // New user
      }
      console.error('Error fetching last journal type:', error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      journalType: data?.journal_entry_type || null
    };
  } catch (error) {
    console.error('Error fetching last journal type:', error);
    return { success: false, error: 'Failed to fetch last journal type' };
  }
};