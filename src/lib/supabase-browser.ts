/**
 * Supabase Browser Client Utility
 * 
 * Provides browser-side Supabase client using @supabase/ssr for Next.js App Router.
 * This handles cookie-based session management for authentication in Client Components.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

/**
 * Creates a Supabase browser client for use in Client Components.
 * Automatically handles session cookies via @supabase/ssr.
 * 
 * @returns Supabase client instance with authenticated session if available
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
