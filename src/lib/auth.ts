import { createClient } from '@/lib/supabase';
import { db } from '@/lib/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Supabase Auth Helper Functions
 * 
 * These functions are used in Server Components to:
 * - Get the current user's session from Supabase
 * - Retrieve user role from public.profiles
 * - Verify admin/researcher permissions
 */

/**
 * Gets the current authenticated user from Supabase session
 * @returns User object if authenticated, null otherwise
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error('[getCurrentUser]: Auth error:', error.message);
      return null;
    }

    if (!user) {
      console.log('[getCurrentUser]: No user found in session');
      return null;
    }

    console.log('[getCurrentUser]: User found:', user.id);
    return user;
  } catch (error) {
    console.error('[getCurrentUser]: Exception:', error);
    return null;
  }
}

/**
 * Gets the current user's UUID from Supabase session
 * @returns User UUID if authenticated, null otherwise
 */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user?.id ?? null;
  } catch (error) {
    console.error('[getSessionUserId]:', error);
    return null;
  }
}

/**
 * Gets the current user's role from public.profiles
 * 
 * Security: If a user is authenticated in Supabase but missing a profiles entry,
 * they are treated as having "No Access" (returns 'public').
 * This is a closed system - only users with pre-provisioned profiles can access.
 * 
 * @returns User role ('admin' | 'researcher' | 'public'). 
 * Returns 'public' (No Access) if user is not authenticated, profile not found, or on error.
 */
export async function getCurrentUserRole(): Promise<'admin' | 'researcher' | 'public'> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      console.log('[getCurrentUserRole]: No user ID found, returning public (No Access)');
      return 'public';
    }

    console.log('[getCurrentUserRole]: Querying profile for user ID:', userId);

    const profileResult = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    const profile = profileResult[0];
    
    if (!profile) {
      // User is authenticated but has no profile - treat as "No Access"
      console.warn(`[getCurrentUserRole]: User ${userId} authenticated but missing profile - returning public (No Access)`);
      return 'public';
    }

    console.log('[getCurrentUserRole]: Found role:', profile.role);
    return profile.role;
  } catch (error) {
    console.error('[getCurrentUserRole]: Exception:', error, '- returning public (No Access)');
    return 'public';
  }
}

/**
 * Verifies if the current user has admin role
 * @returns true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'admin';
}

/**
 * Verifies if the current user has researcher or admin role
 * @returns true if user is researcher or admin, false otherwise
 */
export async function isResearcherOrAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === 'researcher' || role === 'admin';
}

