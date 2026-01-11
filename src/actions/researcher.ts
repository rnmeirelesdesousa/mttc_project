'use server';

import { createClient } from '@/lib/supabase';
import { db } from '@/lib/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

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



