import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dsyzceytxnblzjbatsyv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzeXpjZXl0eG5ibHpqYmF0c3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5ODI2NDUsImV4cCI6MjA2ODU1ODY0NX0.PvAAcAPQiWJdMiWZc8B9MfmKm6oirHJadNGCTggMoiU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
