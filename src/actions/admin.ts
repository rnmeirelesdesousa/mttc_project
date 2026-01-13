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
 * Based on mills_data_spec.md - Academic rigor required
 */
const createMillConstructionSchema = z.object({
  // General Info
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  legacyId: z.string().optional(), // Original paper inventory code or external reference
  locale: z.enum(['pt', 'en']),
  
  // Location
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  district: z.string().optional(),
  municipality: z.string().optional(),
  parish: z.string().optional(),
  address: z.string().optional(),
  drainageBasin: z.string().optional(),
  
  // Characterization (Section II)
  typology: z.enum(['azenha', 'rodizio', 'mare', 'torre_fixa', 'giratorio', 'velas', 'armacao']),
  epoch: z.enum(['18th_c', '19th_c', '20th_c', 'pre_18th_c']).optional(),
  setting: z.enum(['rural', 'urban', 'isolated', 'milling_cluster']).optional(),
  currentUse: z.enum(['milling', 'housing', 'tourism', 'ruin', 'museum']).optional(),
  
  // Access & Legal
  access: z.enum(['pedestrian', 'car', 'difficult_none']).optional(),
  legalProtection: z.enum(['inexistent', 'under_study', 'classified']).optional(),
  propertyStatus: z.enum(['private', 'public', 'unknown']).optional(),
  
  // Architecture (Section III)
  planShape: z.enum(['circular_tower', 'quadrangular', 'rectangular', 'irregular']).optional(),
  volumetry: z.enum(['cylindrical', 'conical', 'prismatic_sq_rec']).optional(),
  constructionTechnique: z.enum(['dry_stone', 'mortared_stone', 'mixed_other']).optional(),
  exteriorFinish: z.enum(['exposed', 'plastered', 'whitewashed']).optional(),
  roofShape: z.enum(['conical', 'gable', 'lean_to', 'inexistent']).optional(),
  roofMaterial: z.enum(['tile', 'zinc', 'thatch', 'slate']).optional(),
  
  // Motive Systems - Hydraulic (Section IV)
  captationType: z.enum(['weir', 'pool', 'direct']).optional(),
  conductionType: z.enum(['levada', 'modern_pipe']).optional(),
  conductionState: z.enum(['operational_clean', 'clogged', 'damaged_broken']).optional(),
  admissionRodizio: z.enum(['cubo', 'calha']).optional(),
  admissionAzenha: z.enum(['calha_superior', 'canal_inferior']).optional(),
  wheelTypeRodizio: z.enum(['penas', 'colheres']).optional(),
  wheelTypeAzenha: z.enum(['copeira', 'dezio_palas']).optional(),
  rodizioQty: z.number().int().min(0).optional(),
  azenhaQty: z.number().int().min(0).optional(),
  
  // Motive Systems - Wind
  motiveApparatus: z.enum(['sails', 'shells', 'tail', 'cap']).optional(),
  
  // Grinding Mechanism
  millstoneQuantity: z.number().int().min(0).optional(),
  millstoneDiameter: z.string().optional(), // Float as string for precision
  millstoneState: z.enum(['complete', 'disassembled', 'fragmented', 'missing']).optional(),
  hasTremonha: z.boolean().optional(),
  hasQuelha: z.boolean().optional(),
  hasUrreiro: z.boolean().optional(),
  hasAliviadouro: z.boolean().optional(),
  hasFarinaleiro: z.boolean().optional(),
  
  // Epigraphy (Section V)
  epigraphyPresence: z.boolean().optional(),
  epigraphyLocation: z.enum(['door_jambs', 'interior_walls', 'millstones', 'other']).optional(),
  epigraphyType: z.enum(['dates', 'initials', 'religious_symbols', 'counting_marks']).optional(),
  epigraphyDescription: z.string().optional(),
  
  // Conservation Ratings (Section VI)
  ratingStructure: z.enum(['very_good', 'good', 'reasonable', 'bad', 'very_bad_ruin']).optional(),
  ratingRoof: z.enum(['very_good', 'good', 'reasonable', 'bad', 'very_bad_ruin']).optional(),
  ratingHydraulic: z.enum(['very_good', 'good', 'reasonable', 'bad', 'very_bad_ruin']).optional(),
  ratingMechanism: z.enum(['very_good', 'good', 'reasonable', 'bad', 'very_bad_ruin']).optional(),
  ratingOverall: z.enum(['very_good', 'good', 'reasonable', 'bad', 'very_bad_ruin']).optional(),
  observationsStructure: z.string().optional(),
  observationsRoof: z.string().optional(),
  observationsHydraulic: z.string().optional(),
  observationsMechanism: z.string().optional(),
  observationsGeneral: z.string().optional(),
  
  // Annexes
  hasOven: z.boolean().optional(),
  hasMillerHouse: z.boolean().optional(),
  hasStable: z.boolean().optional(),
  hasFullingMill: z.boolean().optional(),
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
          legacyId: validated.legacyId || null,
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

      // Step 2: Insert into construction_translations (i18n + conservation observations)
      await tx.insert(constructionTranslations).values({
        constructionId: newConstruction.id,
        langCode: validated.locale,
        title: validated.title,
        description: validated.description || null,
        observationsStructure: validated.observationsStructure || null,
        observationsRoof: validated.observationsRoof || null,
        observationsHydraulic: validated.observationsHydraulic || null,
        observationsMechanism: validated.observationsMechanism || null,
        observationsGeneral: validated.observationsGeneral || null,
      });

      // Step 3: Insert into mills_data (scientific/technical details - all sections)
      await tx.insert(millsData).values({
        constructionId: newConstruction.id,
        typology: validated.typology,
        // Characterization
        epoch: validated.epoch || null,
        setting: validated.setting || null,
        currentUse: validated.currentUse || null,
        // Access & Legal
        access: validated.access || null,
        legalProtection: validated.legalProtection || null,
        propertyStatus: validated.propertyStatus || null,
        // Architecture (Section III)
        planShape: validated.planShape || null,
        volumetry: validated.volumetry || null,
        constructionTechnique: validated.constructionTechnique || null,
        exteriorFinish: validated.exteriorFinish || null,
        roofShape: validated.roofShape || null,
        roofMaterial: validated.roofMaterial || null,
        // Motive Systems - Hydraulic (Section IV)
        captationType: validated.captationType || null,
        conductionType: validated.conductionType || null,
        conductionState: validated.conductionState || null,
        admissionRodizio: validated.admissionRodizio || null,
        admissionAzenha: validated.admissionAzenha || null,
        wheelTypeRodizio: validated.wheelTypeRodizio || null,
        wheelTypeAzenha: validated.wheelTypeAzenha || null,
        rodizioQty: validated.rodizioQty || null,
        azenhaQty: validated.azenhaQty || null,
        // Motive Systems - Wind
        motiveApparatus: validated.motiveApparatus || null,
        // Grinding Mechanism
        millstoneQuantity: validated.millstoneQuantity || null,
        millstoneDiameter: validated.millstoneDiameter || null,
        millstoneState: validated.millstoneState || null,
        hasTremonha: validated.hasTremonha || false,
        hasQuelha: validated.hasQuelha || false,
        hasUrreiro: validated.hasUrreiro || false,
        hasAliviadouro: validated.hasAliviadouro || false,
        hasFarinaleiro: validated.hasFarinaleiro || false,
        // Epigraphy (Section V)
        epigraphyPresence: validated.epigraphyPresence || false,
        epigraphyLocation: validated.epigraphyLocation || null,
        epigraphyType: validated.epigraphyType || null,
        epigraphyDescription: validated.epigraphyDescription || null,
        // Conservation Ratings (Section VI)
        ratingStructure: validated.ratingStructure || null,
        ratingRoof: validated.ratingRoof || null,
        ratingHydraulic: validated.ratingHydraulic || null,
        ratingMechanism: validated.ratingMechanism || null,
        ratingOverall: validated.ratingOverall || null,
        // Annexes
        hasOven: validated.hasOven || false,
        hasMillerHouse: validated.hasMillerHouse || false,
        hasStable: validated.hasStable || false,
        hasFullingMill: validated.hasFullingMill || false,
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
