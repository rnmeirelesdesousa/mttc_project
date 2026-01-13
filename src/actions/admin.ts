'use server';

import { db } from '@/lib/db';
import { constructions, constructionTranslations, millsData } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { isAdmin, isResearcherOrAdmin, getSessionUserId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { generateSlug, generateUniqueSlug } from '@/lib/slug';

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

/**
 * Zod schema for mill construction creation
 */
const createMillConstructionSchema = z.object({
  // General Info
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  locale: z.enum(['pt', 'en']),
  
  // Location
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  district: z.string().optional(),
  municipality: z.string().optional(),
  parish: z.string().optional(),
  address: z.string().optional(),
  drainageBasin: z.string().optional(),
  
  // Technical Specs (Mills)
  typology: z.enum(['azenha', 'rodizio', 'mare', 'torre_fixa', 'giratorio', 'velas', 'armacao']),
  access: z.enum(['pedestrian', 'car', 'difficult_none']).optional(),
  legalProtection: z.enum(['inexistent', 'under_study', 'classified']).optional(),
  propertyStatus: z.enum(['private', 'public', 'unknown']).optional(),
  epoch: z.enum(['18th_c', '19th_c', '20th_c', 'pre_18th_c']).optional(),
  currentUse: z.enum(['milling', 'housing', 'tourism', 'ruin', 'museum']).optional(),
});

/**
 * Creates a new mill construction with all related data
 * 
 * Security: Verifies that the performing user has 'researcher' or 'admin' role
 * 
 * This action uses a database transaction to ensure atomicity:
 * 1. Inserts into constructions (core data, status='draft')
 * 2. Inserts into construction_translations (title/description for locale)
 * 3. Inserts into mills_data (scientific/technical details)
 * 
 * @param data - Form data containing all construction information
 * @returns Standardized response: { success: true, data?: { id: string, slug: string } } or { success: false, error: string }
 */
export async function createMillConstruction(
  data: z.infer<typeof createMillConstructionSchema>
): Promise<
  | { success: true; data: { id: string; slug: string } }
  | { success: false; error: string }
> {
  try {
    // Verify researcher or admin role
    const hasPermission = await isResearcherOrAdmin();
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Researcher or Admin role required' };
    }

    // Get current user ID for audit trail
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Validate input with Zod
    const validationResult = createMillConstructionSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return { success: false, error: `Validation failed: ${errors}` };
    }

    const validated = validationResult.data;

    // Generate unique slug from title
    const baseSlug = generateSlug(validated.title);
    
    // Check if slug exists
    const slugExists = async (slug: string): Promise<boolean> => {
      const existing = await db
        .select({ id: constructions.id })
        .from(constructions)
        .where(eq(constructions.slug, slug))
        .limit(1);
      return existing.length > 0;
    };

    const uniqueSlug = await generateUniqueSlug(baseSlug, slugExists);

    // Use database transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Step 1: Insert into constructions (core data)
      const [newConstruction] = await tx
        .insert(constructions)
        .values({
          slug: uniqueSlug,
          typeCategory: 'MILL',
          geom: [validated.longitude, validated.latitude] as [number, number], // PostGIS: [lng, lat]
          district: validated.district || null,
          municipality: validated.municipality || null,
          parish: validated.parish || null,
          address: validated.address || null,
          drainageBasin: validated.drainageBasin || null,
          status: 'draft', // Always start as draft
          createdBy: userId,
        })
        .returning({ id: constructions.id, slug: constructions.slug });

      if (!newConstruction) {
        throw new Error('Failed to create construction');
      }

      // Step 2: Insert into construction_translations (i18n)
      await tx.insert(constructionTranslations).values({
        constructionId: newConstruction.id,
        langCode: validated.locale,
        title: validated.title,
        description: validated.description || null,
      });

      // Step 3: Insert into mills_data (scientific/technical details)
      await tx.insert(millsData).values({
        constructionId: newConstruction.id,
        typology: validated.typology,
        access: validated.access || null,
        legalProtection: validated.legalProtection || null,
        propertyStatus: validated.propertyStatus || null,
        epoch: validated.epoch || null,
        currentUse: validated.currentUse || null,
      });

      return newConstruction;
    });

    // Revalidate dashboard pages to show new draft
    revalidatePath('/en/dashboard');
    revalidatePath('/pt/dashboard');
    revalidatePath('/en/dashboard/review');
    revalidatePath('/pt/dashboard/review');

    return { success: true, data: { id: result.id, slug: result.slug } };
  } catch (error) {
    console.error('[createMillConstruction]:', error);
    return { success: false, error: 'An error occurred while creating the construction' };
  }
}
