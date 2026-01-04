'use server';

import { createClient } from '@/lib/supabase';
import { db } from '@/lib/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

/**
 * Sign in with Magic Link
 * 
 * Sends a magic link email to the user for passwordless authentication.
 * The user will receive an email with a link that authenticates them.
 * 
 * @param email - User's email address
 * @returns Standardized response: { success: true } or { success: false, error: string }
 */
export async function signInWithMagicLink(
  email: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Validate input
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return { success: false, error: 'Valid email is required' };
    }

    const supabase = await createClient();

    // Get the site URL for redirect (must be absolute)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Send magic link email
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redirect URL after email confirmation (root-level callback handles locale)
        emailRedirectTo: `${siteUrl}/auth/callback`,
      },
    });

    if (error) {
      console.error('[signInWithMagicLink]:', error);
      return { success: false, error: error.message || 'Failed to send magic link' };
    }

    return { success: true };
  } catch (error) {
    console.error('[signInWithMagicLink]:', error);
    return { success: false, error: 'An error occurred while sending magic link' };
  }
}

/**
 * Sign out the current user
 * 
 * Clears the Supabase session and redirects to the login page.
 */
export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login');
  } catch (error) {
    console.error('[signOut]:', error);
    redirect('/login');
  }
}

/**
 * Get the current authenticated user's role
 * 
 * @returns User role ('admin' | 'researcher' | 'public') or null if not authenticated
 */
export async function getCurrentUserRole(): Promise<'admin' | 'researcher' | 'public' | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    // Retrieve user's role from public.profiles
    const profileResult = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    const profile = profileResult[0];
    return profile?.role ?? null;
  } catch (error) {
    console.error('[getCurrentUserRole]:', error);
    return null;
  }
}

