import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  process.env.SUPABASE_URL && 
  process.env.SUPABASE_URL !== 'https://placeholder.supabase.co' &&
  (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY)
);

/**
 * Initialized Supabase Client for Cloud Database Operations
 */
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

if (isSupabaseConfigured) {
  console.log(`[Supabase] Cloud PostgreSQL Database initialized at ${supabaseUrl}`);
} else {
  console.log(`[Supabase] SUPABASE_URL not provided. Falling back to local SQLite database.`);
}
