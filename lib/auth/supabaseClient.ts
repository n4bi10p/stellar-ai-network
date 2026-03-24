// ── Supabase Client (Browser + Server) ──
// Central Supabase instance for auth & database queries

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
  );
}

/** Browser-safe Supabase client (uses anon key) */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Utility to get current auth session */
export async function getAuthSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Auth session error:', error);
    return null;
  }
  return data.session;
}

/** Utility to get current user from session */
export async function getCurrentUser() {
  const session = await getAuthSession();
  return session?.user ?? null;
}
