'use server';

import { db } from '@/lib/db';
import { constructions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { isAdmin } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

/**
 * Admin Server Actions
 * 
 * These actions require admin role verification before execution.
 */

/**
 * Updates the status of a construction
 * 
 * Security: Verifies that the performing user has 'admin' role
 * 
 * @param id - Construction UUID
 * @param status - New status ('published' | 'review' | 'draft')
 * @returns Standardized response: { success: true, data?: T } or { success: false, error: string }
 */
export async function updateConstructionStatus(
  id: string,
  status: 'published' | 'review' | 'draft'
): Promise<
  | { success: true; data: { id: string; status: string } }
  | { success: false; error: string }
> {
  try {
    // Verify admin role
    const hasAdminRole = await isAdmin();
    if (!hasAdminRole) {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    // Validate input
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Construction ID is required' };
    }

    if (!['published', 'review', 'draft'].includes(status)) {
      return { success: false, error: 'Invalid status value' };
    }

    // Update construction status
    const result = await db
      .update(constructions)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(constructions.id, id))
      .returning({ id: constructions.id, status: constructions.status });

    if (!result || result.length === 0) {
      return { success: false, error: 'Construction not found' };
    }

    // Revalidate the review page to reflect changes
    // Revalidate all locale variants of the dashboard routes
    revalidatePath('/en/dashboard/review');
    revalidatePath('/pt/dashboard/review');
    revalidatePath('/en/dashboard');
    revalidatePath('/pt/dashboard');

    return { success: true, data: result[0]! };
  } catch (error) {
    console.error('[updateConstructionStatus]:', error);
    return { success: false, error: 'An error occurred while updating construction status' };
  }
}

