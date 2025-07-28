/**
 * Supabase Client Configuration
 * 
 * Handles connection to Supabase database and provides helper functions
 * for journal storage, user authentication, and data retrieval.
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Journal Database Functions
 */

// Save a new journal entry
export const saveJournalEntry = async (content, userId) => {
  try {
    const { data, error } = await supabase
      .from('journals')
      .insert([
        {
          content: content,
          user_id: userId,
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

// Get user's journal entries (most recent first)
export const getUserJournals = async (userId, limit = null) => {
  try {
    let query = supabase
      .from('journals')
      .select('*')
      .eq('user_id', userId)
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

// Count user's journal entries (for progress tracking)
export const getUserJournalCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('journals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
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

/**
 * Authentication Helper Functions
 */

// Get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Error getting user:', error);
    return { success: false, error: 'Failed to get user' };
  }
};

// Sign in anonymously (for MVP - no login required)
export const signInAnonymously = async () => {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      console.error('Error signing in anonymously:', error);
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user };
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    return { success: false, error: 'Failed to sign in' };
  }
};