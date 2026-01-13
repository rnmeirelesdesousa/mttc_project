'use server';

import { createClient } from '@/lib/supabase';
import { db } from '@/lib/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';

/**
 * Zod schema for login form validation
 */
const loginSchema = z.object({
  email: z.string().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Sign in with Email/Password
 * 
 * Authenticates a user with email and password.
 * Only users with existing profiles (researcher or admin role) can sign in.
 * This is a closed system - no public sign-ups allowed.
 * 
 * @param email - User's email address
 * @param password - User's password
 * @returns Standardized response: { success: true } or { success: false, error: string }
 */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Validate input with Zod
    const validationResult = loginSchema.safeParse({ email, password });
    if (!validationResult.success) {
      // Return translation key for invalid input
      return { success: false, error: 'errors.auth.invalidInput' };
    }

    const supabase = await createClient();

    // Attempt to sign in with password
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: validationResult.data.email,
      password: validationResult.data.password,
    });

    if (authError) {
      console.error('[signInWithPassword]: Auth error:', authError);
      // Return translation key for generic error (don't reveal if email exists)
      return { success: false, error: 'errors.auth.invalidEmailOrPassword' };
    }

    if (!authData.user) {
      return { success: false, error: 'errors.auth.authenticationFailed' };
    }

    // Verify user has a profile with researcher or admin role
    // This is a closed system - profiles must be pre-provisioned by admin
    const profileResult = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, authData.user.id))
      .limit(1);

    const profile = profileResult[0];

    if (!profile) {
      // User authenticated but has no profile - sign them out and deny access
      console.warn(`[signInWithPassword]: User ${authData.user.id} authenticated but has no profile - denying access`);
      await supabase.auth.signOut();
      return { success: false, error: 'errors.auth.accessDenied' };
    }

    if (profile.role !== 'researcher' && profile.role !== 'admin') {
      // User has profile but wrong role - sign them out and deny access
      console.warn(`[signInWithPassword]: User ${authData.user.id} has role ${profile.role} - denying access`);
      await supabase.auth.signOut();
      return { success: false, error: 'errors.auth.insufficientPermissions' };
    }

    // Success - user is authenticated and has valid role
    return { success: true };
  } catch (error) {
    console.error('[signInWithPassword]:', error);
    return { success: false, error: 'errors.auth.genericError' };
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
 * @returns User role ('admin' | 'researcher' | 'public'). Returns 'public' as fallback if not authenticated or profile not found.
 */
export async function getCurrentUserRole(): Promise<'admin' | 'researcher' | 'public'> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return 'public';
    }

    // Retrieve user's role from public.profiles
    const profileResult = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    const profile = profileResult[0];
    return profile?.role ?? 'public';
  } catch (error) {
    console.error('[getCurrentUserRole]:', error);
    return 'public';
  }
}

