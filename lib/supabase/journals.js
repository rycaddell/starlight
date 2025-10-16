import { supabase } from './client';

// Save a new journal entry (UPDATED FOR CUSTOM USERS + ENTRY TYPE)
export const saveJournalEntry = async (content, customUserId, entryType = null) => {
  try {
    const { data, error } = await supabase
      .from('journals')
      .insert([
        {
          content: content,
          custom_user_id: customUserId,
          journal_entry_type: entryType,  // NEW: Store entry type
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