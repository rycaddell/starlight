import { supabase } from './client';

// Save feedback to database
export const saveFeedback = async (customUserId, feedbackType, message) => {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert([
        {
          custom_user_id: customUserId,
          feedback_type: feedbackType,
          message: message,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error saving feedback:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Feedback saved successfully:', data[0]);
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('Error saving feedback:', error);
    return { success: false, error: 'Failed to save feedback' };
  }
};

// Get user's feedback (for admin purposes)
export const getUserFeedback = async (customUserId, limit = null) => {
  try {
    let query = supabase
      .from('feedback')
      .select('*')
      .eq('custom_user_id', customUserId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feedback:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return { success: false, error: 'Failed to fetch feedback' };
  }
};