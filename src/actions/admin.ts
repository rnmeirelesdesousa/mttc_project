'use server';

import { db } from '@/lib/db';
import { constructions, constructionTranslations } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
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

/**
 * Fetches all constructions with draft status for review
 * 
 * Security: Verifies that the performing user has 'admin' role
 * 
 * @param locale - Current locale code ('en' | 'pt')
 * @returns Standardized response with array of draft constructions including localized title
 */
export async function getReviewQueue(
  locale: string
): Promise<
  | {
      success: true;
      data: Array<{
        id: string;
        slug: string;
        title: string | null;
        typeCategory: string;
        createdAt: Date;
        updatedAt: Date;
      }>;
    }
  | { success: false; error: string }
> {
  try {
    // Verify admin role
    const hasAdminRole = await isAdmin();
    if (!hasAdminRole) {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    // Validate locale
    if (!locale || typeof locale !== 'string') {
      return { success: false, error: 'Locale is required' };
    }

    // Query constructions with status = 'draft'
    // Join with construction_translations to get title for current locale
    const drafts = await db
      .select({
        id: constructions.id,
        slug: constructions.slug,
        typeCategory: constructions.typeCategory,
        createdAt: constructions.createdAt,
        updatedAt: constructions.updatedAt,
        title: constructionTranslations.title,
      })
      .from(constructions)
      .leftJoin(
        constructionTranslations,
        and(
          eq(constructionTranslations.constructionId, constructions.id),
          eq(constructionTranslations.langCode, locale)
        )
      )
      .where(eq(constructions.status, 'draft'))
      .orderBy(desc(constructions.createdAt));

    return {
      success: true,
      data: drafts.map((draft) => ({
        id: draft.id,
        slug: draft.slug,
        title: draft.title,
        typeCategory: draft.typeCategory,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      })),
    };
  } catch (error) {
    console.error('[getReviewQueue]:', error);
    return { success: false, error: 'An error occurred while fetching review queue' };
  }
}