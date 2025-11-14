import { supabase } from './client';

// Save a new journal entry (UPDATED FOR PROMPT TEXT)
export const saveJournalEntry = async (
  content, 
  customUserId, 
  entryType = null,
  promptText = null  // NEW: Store the guided prompt text
) => {
  try {
    const { data, error } = await supabase
      .from('journals')
      .insert([
        {
          content: content,
          custom_user_id: customUserId,
          journal_entry_type: entryType,
          prompt_text: promptText,  // NEW: Store prompt text
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error saving journal:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error saving journal:', error);
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
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching journals:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching journals:', error);
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
      .is('mirror_id', null); // Only count journals not yet assigned to a Mirror

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
    
    const { error } = await supabase
      .from('journals')
      .delete()
      .eq('id', journalId);

    if (error) {
      console.error('❌ Error deleting journal:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Journal entry deleted successfully');
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error in deleteJournalEntry:', error);
    return { success: false, error: error.message };
  }
};