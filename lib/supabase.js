export * from './supabase/client';
export * from './supabase/auth';
export * from './supabase/journals';
export * from './supabase/mirrors';
export * from './supabase/testData';
export * from './supabase/feedback';

// Deprecated functions (keep for now, remove later)
export const signInAnonymously = async () => {
  console.warn('⚠️ signInAnonymously is deprecated - use signInWithAccessCode instead');
  return { success: false, error: 'Function deprecated - use custom auth' };
};