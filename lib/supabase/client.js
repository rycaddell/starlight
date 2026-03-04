import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Get environment variables with extensive fallbacks
const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ||
                   process.env.EXPO_PUBLIC_SUPABASE_URL ||
                   null;

const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ||
                       process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
                       null;

// Only log if there are missing environment variables (keep for debugging)
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing environment variables:', {
    supabaseUrl: supabaseUrl ? 'Found' : 'Missing',
    supabaseAnonKey: supabaseAnonKey ? 'Found' : 'Missing'
  });
}

const ExpoSecureStoreAdapter = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

// Create client with safety checks
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;