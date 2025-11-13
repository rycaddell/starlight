import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get environment variables with extensive fallbacks
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl || 
                   process.env.EXPO_PUBLIC_SUPABASE_URL || 
                   null;

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey || 
                       process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
                       null;

const openaiApiKey = Constants.expoConfig?.extra?.openaiApiKey || 
                    process.env.EXPO_PUBLIC_OPENAI_API_KEY || 
                    null;

// Only log if there are missing environment variables (keep for debugging)
if (!supabaseUrl || !supabaseAnonKey || !openaiApiKey) {
  console.warn('⚠️ Missing environment variables:', {
    supabaseUrl: supabaseUrl ? 'Found' : 'Missing',
    supabaseAnonKey: supabaseAnonKey ? 'Found' : 'Missing',
    openaiApiKey: openaiApiKey ? 'Found' : 'Missing'
  });
}

// Create clients with safety checks
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;