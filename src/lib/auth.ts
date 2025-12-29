import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Pure Mock Auth Helper Functions
 * 
 * These functions are used in Server Components to:
 * - Get the current user's session UUID from cookie
 * - Retrieve user role from public.profiles
 * - Verify admin/researcher permissions
 */

/**
 * Gets the current user's UUID from the mock-session cookie
 * @returns User UUID if authenticated, null otherwise
 */
export async function getSessionUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('mock-session');
    return sessionCookie?.value ?? null;
  } catch (error) {
    console.error('[getSessionUserId]:', error);
    return null;
  }
}

/**
 * Gets the current user's role from public.profiles
 * @returns User role ('admin' | 'researcher' | 'public') or null if not found
 */
export async function getCurrentUserRole(): Promise<'admin' | 'researcher' | 'public' | null> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return null;
    }

    const profileResult = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    const profile = profileResult[0];
    return profile?.role ?? null;
  } catch (error) {
    console.error('[getCurrentUserRole]:', error);
    return null;
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

