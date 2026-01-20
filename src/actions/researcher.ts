'use server';

import { createClient } from '@/lib/supabase';
import { db } from '@/lib/db';
import { profiles, constructions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSessionUserId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Verifies if the current authenticated user has researcher or admin role
 * 
 * This server action checks:
 * 1. If a Supabase session exists
 * 2. If the user has a profile in the profiles table
 * 3. If the user's role is either 'researcher' or 'admin'
 * 
 * @returns true if user is researcher or admin, false otherwise
 */
export async function getIsResearcher(): Promise<boolean> {
  try {
    const supabase = await createClient();
    
    // Get the current authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return false;
    }

    // Query the profiles table for the user's role
    const profileResult = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);

    const profile = profileResult[0];

    if (!profile) {
      return false;
    }

    // Check if role is researcher or admin
    return profile.role === 'researcher' || profile.role === 'admin';
  } catch (error) {
    console.error('[getIsResearcher]:', error);
    return false;
  }
}

/**
 * Deletes a draft construction (MILL or POCA)
 * 
 * Security: Verifies that the performing user is the author of the draft
 * Only drafts can be deleted by the author (Phase 5.9.7.1)
 * 
 * @param id - Construction UUID
 * @returns Standardized response: { success: true } or { success: false, error: string }
 */
export async function deleteDraftConstruction(
  id: string
): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  try {
    // Get current user ID
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Validate input
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Construction ID is required' };
    }

    // Check if construction exists and is a draft owned by the user
    const existing = await db
      .select({
        id: constructions.id,
        status: constructions.status,
        createdBy: constructions.createdBy,
      })
      .from(constructions)
      .where(eq(constructions.id, id))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: 'Construction not found' };
    }

    const construction = existing[0]!;

    // Security check: Only author can delete, and only if status is 'draft'
    if (construction.status !== 'draft') {
      return { success: false, error: 'Only draft constructions can be deleted by the author' };
    }

    if (construction.createdBy !== userId) {
      return { success: false, error: 'Unauthorized: You can only delete your own draft constructions' };
    }

    // Delete construction (cascade will handle related records)
    const result = await db
      .delete(constructions)
      .where(eq(constructions.id, id))
      .returning({ id: constructions.id });

    if (!result || result.length === 0) {
      return { success: false, error: 'Failed to delete construction' };
    }

    // Revalidate dashboard pages
    revalidatePath('/en/dashboard');
    revalidatePath('/pt/dashboard');
    revalidatePath('/en/dashboard/inventory');
    revalidatePath('/pt/dashboard/inventory');

    return { success: true };
  } catch (error) {
    console.error('[deleteDraftConstruction]:', error);
    return { success: false, error: 'An error occurred while deleting the construction' };
  }
}



