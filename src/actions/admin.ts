'use server';

import { db } from '@/lib/db';
import { constructions, constructionTranslations, millsData, waterLines, waterLineTranslations, pocasData } from '@/db/schema';
import { eq, and, desc, sql, or, like } from 'drizzle-orm';
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
 * Gets the current user's role and ID for client-side permission checks
 * 
 * Phase 5.9.7.2: Helper for UI permission checks
 * 
 * @returns Standardized response with user role and ID
 */
export async function getCurrentUserInfo(): Promise<
  | { success: true; data: { userId: string; role: 'admin' | 'researcher' | 'public' } }
  | { success: false; error: string }
> {
  try {
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    const isUserAdmin = await isAdmin();
    const isUserResearcher = await isResearcherOrAdmin();
    
    const role = isUserAdmin ? 'admin' : (isUserResearcher ? 'researcher' : 'public');

    return { success: true, data: { userId, role } };
  } catch (error) {
    console.error('[getCurrentUserInfo]:', error);
    return { success: false, error: 'An error occurred while fetching user info' };
  }
}

/**
 * Deletes a construction (MILL, POCA, or water_line) with role-based permissions
 * 
 * Phase 5.9.7.2: Scoped Deletion
 * - Researchers: Can delete ONLY if status === 'draft' AND they are the author (created_by)
 * - Admins: Can delete ANY item in the inventory or review queue
 * 
 * Audit: This function receives the construction UUID from the constructions table.
 * All queries use eq(constructions.id, id) to ensure we're targeting the correct record.
 * 
 * @param id - Construction UUID from the constructions table (NOT a slug or extension-specific ID)
 * @returns Standardized response: { success: true } or { success: false, error: string }
 */
export async function deleteConstruction(
  id: string
): Promise<
  | { success: true }
  | { success: false; error: string }
> {
  try {
    // Verify researcher or admin role
    const hasPermission = await isResearcherOrAdmin();
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Researcher or Admin role required' };
    }

    // Validate input - must be a valid UUID string
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return { success: false, error: 'Construction ID is required' };
    }

    // Get current user ID and role
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }
    const isUserAdmin = await isAdmin();

    // AUDIT: Log the ID being searched and current user ID for debugging
    console.log('[deleteConstruction]: Attempting to delete construction', {
      constructionId: id,
      currentUserId: userId,
      isAdmin: isUserAdmin,
    });

    // AUDIT: Direct find query to verify the construction exists
    // This query targets the constructions table directly
    const directFindResult = await db
      .select()
      .from(constructions)
      .where(eq(constructions.id, id));
    
    console.log('[deleteConstruction]: Direct find query result', {
      constructionId: id,
      found: directFindResult.length > 0,
      resultCount: directFindResult.length,
      result: directFindResult.length > 0 ? {
        id: directFindResult[0]!.id,
        slug: directFindResult[0]!.slug,
        typeCategory: directFindResult[0]!.typeCategory,
        status: directFindResult[0]!.status,
        createdBy: directFindResult[0]!.createdBy,
      } : null,
    });

    // Check if construction exists and get its status and author
    // CRITICAL: Use eq(constructions.id, id) - NOT slug or extension-specific ID
    // This query targets the constructions table
    const existing = await db
      .select({
        id: constructions.id,
        status: constructions.status,
        createdBy: constructions.createdBy,
        typeCategory: constructions.typeCategory,
      })
      .from(constructions)
      .where(eq(constructions.id, id))
      .limit(1);

    if (existing.length === 0) {
      console.log('[deleteConstruction]: Construction not found in constructions table', { 
        constructionId: id,
        directFindResultCount: directFindResult.length,
      });
      return { success: false, error: 'Construction not found' };
    }

    const construction = existing[0]!;

    // AUDIT: Log the found construction details
    console.log('[deleteConstruction]: Found construction', {
      constructionId: construction.id,
      status: construction.status,
      createdBy: construction.createdBy,
      typeCategory: construction.typeCategory,
      currentUserId: userId,
    });

    // Phase 5.9.7.2: Scoped deletion logic - STRICT ENFORCEMENT
    // Researchers: Can delete ONLY if status === 'draft' AND they are the author
    // Admins: Can delete ANY item
    if (!isUserAdmin) {
      // Check if record exists but createdBy doesn't match - return "Unauthorized" for better debugging
      if (construction.createdBy !== userId) {
        console.log('[deleteConstruction]: Unauthorized - createdBy mismatch', {
          constructionId: construction.id,
          constructionCreatedBy: construction.createdBy,
          currentUserId: userId,
        });
        return { 
          success: false, 
          error: 'Unauthorized: You can only delete your own draft constructions'
        };
      }

      // Check if status is not draft
      if (construction.status !== 'draft') {
        console.log('[deleteConstruction]: Unauthorized - status is not draft', {
          constructionId: construction.id,
          status: construction.status,
          currentUserId: userId,
        });
        return { 
          success: false, 
          error: 'Only draft constructions can be deleted by the author'
        };
      }
    }
    // Admins: Can delete any item (no additional checks needed)

    // Use transaction to ensure atomicity
    // Note: Foreign key constraints are set to onDelete: 'cascade' in schema.ts:
    // - mills_data.constructionId -> constructions.id (cascade)
    // - pocas_data.constructionId -> constructions.id (cascade)
    // - construction_translations.constructionId -> constructions.id (cascade)
    // - water_lines.constructionId -> constructions.id (cascade)
    // However, we manually delete water_lines first as a safety measure
    await db.transaction(async (tx) => {
      // Check if this construction is a water line and delete the water_lines record first
      // This handles cases where the database constraint might not cascade properly
      const waterLineCheck = await tx
        .select({ id: waterLines.id })
        .from(waterLines)
        .where(eq(waterLines.constructionId, id))
        .limit(1);

      if (waterLineCheck.length > 0) {
        console.log('[deleteConstruction]: Deleting water_line record first', {
          waterLineId: waterLineCheck[0]!.id,
          constructionId: id,
        });
        // Delete the water line first to avoid foreign key constraint violation
        await tx
          .delete(waterLines)
          .where(eq(waterLines.constructionId, id));
      }

      // Delete construction (cascade will handle other related records like mills_data, pocas_data, etc.)
      const result = await tx
        .delete(constructions)
        .where(eq(constructions.id, id))
        .returning({ id: constructions.id });

      if (!result || result.length === 0) {
        throw new Error('Failed to delete construction - no rows affected');
      }

      console.log('[deleteConstruction]: Successfully deleted construction', {
        constructionId: id,
        deletedId: result[0]!.id,
      });
    });

    // Revalidate dashboard pages
    revalidatePath('/en/dashboard');
    revalidatePath('/pt/dashboard');
    revalidatePath('/en/dashboard/review');
    revalidatePath('/pt/dashboard/review');
    revalidatePath('/en/dashboard/inventory');
    revalidatePath('/pt/dashboard/inventory');

    return { success: true };
  } catch (error) {
    console.error('[deleteConstruction]: Error occurred', {
      constructionId: id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return { success: false, error: 'An error occurred while deleting the construction' };
  }
}

/**
 * Updates the status of a construction
 * 
 * Phase 5.9.7.2: Lifecycle Actions
 * - 'Publish' (Admin only - sets status to published)
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
    // Verify admin role (only admins can publish)
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
    revalidatePath('/en/dashboard/inventory');
    revalidatePath('/pt/dashboard/inventory');

    return { success: true, data: result[0]! };
  } catch (error) {
    console.error('[updateConstructionStatus]:', error);
    return { success: false, error: 'An error occurred while updating construction status' };
  }
}

/**
 * Submits a construction for review (sets status to 'review')
 * 
 * Phase 5.9.7.2: Lifecycle Actions
 * - 'Submit for Review' (sets status to review)
 * 
 * Security: Verifies that the performing user is the author or has admin role
 * 
 * @param id - Construction UUID
 * @returns Standardized response: { success: true, data?: T } or { success: false, error: string }
 */
export async function submitForReview(
  id: string
): Promise<
  | { success: true; data: { id: string; status: string } }
  | { success: false; error: string }
> {
  try {
    // Verify researcher or admin role
    const hasPermission = await isResearcherOrAdmin();
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Researcher or Admin role required' };
    }

    // Validate input
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Construction ID is required' };
    }

    // Get current user ID and role
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }
    const isUserAdmin = await isAdmin();

    // Check if construction exists and get its status and author
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

    // Security check: Only author or admin can submit for review
    if (!isUserAdmin && construction.createdBy !== userId) {
      return { success: false, error: 'Unauthorized: You can only submit your own constructions for review' };
    }

    // Only allow submitting drafts for review
    if (construction.status !== 'draft') {
      return { success: false, error: 'Only draft constructions can be submitted for review' };
    }

    // Update construction status to 'review'
    const result = await db
      .update(constructions)
      .set({
        status: 'review',
        updatedAt: new Date(),
      })
      .where(eq(constructions.id, id))
      .returning({ id: constructions.id, status: constructions.status });

    if (!result || result.length === 0) {
      return { success: false, error: 'Failed to update construction status' };
    }

    // Revalidate dashboard pages
    revalidatePath('/en/dashboard/review');
    revalidatePath('/pt/dashboard/review');
    revalidatePath('/en/dashboard');
    revalidatePath('/pt/dashboard');
    revalidatePath('/en/dashboard/inventory');
    revalidatePath('/pt/dashboard/inventory');

    return { success: true, data: result[0]! };
  } catch (error) {
    console.error('[submitForReview]:', error);
    return { success: false, error: 'An error occurred while submitting for review' };
  }
}

/**
 * Fetches construction statistics for the current user
 * 
 * Security: Verifies that the performing user is authenticated
 * 
 * @returns Standardized response with counts grouped by status (draft, published)
 */
export async function getUserConstructionStats(): Promise<
  | {
      success: true;
      data: {
        draft: number;
        published: number;
      };
    }
  | { success: false; error: string }
> {
  try {
    // Get current user ID
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Query constructions created by the user, grouped by status
    const stats = await db
      .select({
        status: constructions.status,
        count: sql<number>`count(*)::int`,
      })
      .from(constructions)
      .where(eq(constructions.createdBy, userId))
      .groupBy(constructions.status);

    // Initialize counts
    let draftCount = 0;
    let publishedCount = 0;

    // Aggregate counts from query results
    for (const stat of stats) {
      if (stat.status === 'draft') {
        draftCount = stat.count;
      } else if (stat.status === 'published') {
        publishedCount = stat.count;
      }
    }

    return {
      success: true,
      data: {
        draft: draftCount,
        published: publishedCount,
      },
    };
  } catch (error) {
    console.error('[getUserConstructionStats]:', error);
    return { success: false, error: 'An error occurred while fetching statistics' };
  }
}

/**
 * Fetches comprehensive dashboard statistics
 * 
 * Security: Verifies that the performing user is authenticated (researcher or admin)
 * 
 * @returns Standardized response with comprehensive stats including total mills, pending reviews, draft count, and total levadas
 */
export async function getDashboardStats(): Promise<
  | {
      success: true;
      data: {
        totalMills: number;
        totalLevadas: number;
        pendingReviews: number;
        draftCount: number;
        publishedCount: number;
      };
    }
  | { success: false; error: string }
> {
  try {
    // Verify researcher or admin role
    const hasPermission = await isResearcherOrAdmin();
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Researcher or Admin role required' };
    }

    // Get current user ID for user-specific stats
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Count total mills (all constructions)
    const totalMillsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(constructions)
      .where(eq(constructions.typeCategory, 'MILL'));

    const totalMills = totalMillsResult[0]?.count || 0;

    // Count total levadas (water lines) - count from constructions with typeCategory = 'water_line'
    const totalLevadasResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(constructions)
      .where(eq(constructions.typeCategory, 'water_line'));

    const totalLevadas = totalLevadasResult[0]?.count || 0;

    // Count pending reviews (constructions with 'review' status)
    const pendingReviewsResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(constructions)
      .where(eq(constructions.status, 'review'));

    const pendingReviews = pendingReviewsResult[0]?.count || 0;

    // Count user's draft constructions
    const draftResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(constructions)
      .where(
        and(
          eq(constructions.createdBy, userId),
          eq(constructions.status, 'draft')
        )
      );

    const draftCount = draftResult[0]?.count || 0;

    // Count user's published constructions
    const publishedResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(constructions)
      .where(
        and(
          eq(constructions.createdBy, userId),
          eq(constructions.status, 'published')
        )
      );

    const publishedCount = publishedResult[0]?.count || 0;

    return {
      success: true,
      data: {
        totalMills,
        totalLevadas,
        pendingReviews,
        draftCount,
        publishedCount,
      },
    };
  } catch (error) {
    console.error('[getDashboardStats]:', error);
    return { success: false, error: 'An error occurred while fetching dashboard statistics' };
  }
}

/**
 * Fetches a construction by slug for admin review
 * 
 * Security: Verifies that the performing user has 'admin' role
 * 
 * @param slug - Construction slug identifier
 * @param locale - Current locale code ('en' | 'pt')
 * @returns Standardized response with full construction data including all scientific fields
 */
export async function getConstructionForReview(
  slug: string,
  locale: string
): Promise<
  | {
      success: true;
      data: {
        id: string;
        slug: string;
        status: string;
        legacyId: string | null;
        district: string | null;
        municipality: string | null;
        parish: string | null;
        address: string | null;
        drainageBasin: string | null;
        mainImage: string | null;
        galleryImages: string[] | null;
        lat: number;
        lng: number;
        title: string | null;
        description: string | null;
        // Mills data fields
        typology: string;
        epoch: string | null;
        setting: string | null;
        currentUse: string | null;
        access: string | null;
        legalProtection: string | null;
        propertyStatus: string | null;
        planShape: string | null;
        volumetry: string | null;
        constructionTechnique: string | null;
        exteriorFinish: string | null;
        roofShape: string | null;
        roofMaterial: string | null;
        length: number | null;
        width: number | null;
        height: number | null;
        stoneTypeGranite: boolean;
        stoneTypeSchist: boolean;
        stoneTypeOther: boolean;
        captationType: string | null;
        conductionType: string | null;
        conductionState: string | null;
        admissionRodizio: string | null;
        admissionAzenha: string | null;
        wheelTypeRodizio: string | null;
        wheelTypeAzenha: string | null;
        rodizioQty: number | null;
        azenhaQty: number | null;
        motiveApparatus: string | null;
        millstoneQuantity: number | null;
        millstoneDiameter: string | null;
        millstoneState: string | null;
        hasTremonha: boolean;
        hasQuelha: boolean;
        hasUrreiro: boolean;
        hasAliviadouro: boolean;
        hasFarinaleiro: boolean;
        epigraphyPresence: boolean;
        epigraphyLocation: string | null;
        epigraphyType: string | null;
        epigraphyDescription: string | null;
        ratingStructure: string | null;
        ratingRoof: string | null;
        ratingHydraulic: string | null;
        ratingMechanism: string | null;
        ratingOverall: string | null;
        observationsStructure: string | null;
        observationsRoof: string | null;
        observationsHydraulic: string | null;
        observationsMechanism: string | null;
        observationsGeneral: string | null;
        hasOven: boolean;
        hasMillerHouse: boolean;
        hasStable: boolean;
        hasFullingMill: boolean;
      };
    }
  | { success: false; error: string }
> {
  try {
    // Verify admin role
    const hasAdminRole = await isAdmin();
    if (!hasAdminRole) {
      return { success: false, error: 'Unauthorized: Admin role required' };
    }

    // Validate inputs
    if (!slug || typeof slug !== 'string') {
      return { success: false, error: 'Slug is required' };
    }

    if (!locale || typeof locale !== 'string') {
      return { success: false, error: 'Locale is required' };
    }

    // Query construction with all related data
    const results = await db
      .select({
        // Construction fields
        id: constructions.id,
        slug: constructions.slug,
        status: constructions.status,
        legacyId: constructions.legacyId,
        district: constructions.district,
        municipality: constructions.municipality,
        parish: constructions.parish,
        address: constructions.address,
        drainageBasin: constructions.drainageBasin,
        mainImage: constructions.mainImage,
        galleryImages: constructions.galleryImages,
        // PostGIS coordinate extraction
        lng: sql<number>`ST_X(${constructions.geom}::geometry)`,
        lat: sql<number>`ST_Y(${constructions.geom}::geometry)`,
        // Mills data fields
        typology: millsData.typology,
        epoch: millsData.epoch,
        setting: millsData.setting,
        currentUse: millsData.currentUse,
        access: millsData.access,
        legalProtection: millsData.legalProtection,
        propertyStatus: millsData.propertyStatus,
        planShape: millsData.planShape,
        volumetry: millsData.volumetry,
        constructionTechnique: millsData.constructionTechnique,
        exteriorFinish: millsData.exteriorFinish,
        roofShape: millsData.roofShape,
        roofMaterial: millsData.roofMaterial,
        length: millsData.length,
        width: millsData.width,
        height: millsData.height,
        stoneTypeGranite: millsData.stoneTypeGranite,
        stoneTypeSchist: millsData.stoneTypeSchist,
        stoneTypeOther: millsData.stoneTypeOther,
        captationType: millsData.captationType,
        conductionType: millsData.conductionType,
        conductionState: millsData.conductionState,
        admissionRodizio: millsData.admissionRodizio,
        admissionAzenha: millsData.admissionAzenha,
        wheelTypeRodizio: millsData.wheelTypeRodizio,
        wheelTypeAzenha: millsData.wheelTypeAzenha,
        rodizioQty: millsData.rodizioQty,
        azenhaQty: millsData.azenhaQty,
        motiveApparatus: millsData.motiveApparatus,
        millstoneQuantity: millsData.millstoneQuantity,
        millstoneDiameter: millsData.millstoneDiameter,
        millstoneState: millsData.millstoneState,
        hasTremonha: millsData.hasTremonha,
        hasQuelha: millsData.hasQuelha,
        hasUrreiro: millsData.hasUrreiro,
        hasAliviadouro: millsData.hasAliviadouro,
        hasFarinaleiro: millsData.hasFarinaleiro,
        epigraphyPresence: millsData.epigraphyPresence,
        epigraphyLocation: millsData.epigraphyLocation,
        epigraphyType: millsData.epigraphyType,
        epigraphyDescription: millsData.epigraphyDescription,
        ratingStructure: millsData.ratingStructure,
        ratingRoof: millsData.ratingRoof,
        ratingHydraulic: millsData.ratingHydraulic,
        ratingMechanism: millsData.ratingMechanism,
        ratingOverall: millsData.ratingOverall,
        // Translation fields
        title: constructionTranslations.title,
        description: constructionTranslations.description,
        observationsStructure: constructionTranslations.observationsStructure,
        observationsRoof: constructionTranslations.observationsRoof,
        observationsHydraulic: constructionTranslations.observationsHydraulic,
        observationsMechanism: constructionTranslations.observationsMechanism,
        observationsGeneral: constructionTranslations.observationsGeneral,
        // Annexes
        hasOven: millsData.hasOven,
        hasMillerHouse: millsData.hasMillerHouse,
        hasStable: millsData.hasStable,
        hasFullingMill: millsData.hasFullingMill,
      })
      .from(constructions)
      .innerJoin(millsData, eq(millsData.constructionId, constructions.id))
      .leftJoin(
        constructionTranslations,
        and(
          eq(constructionTranslations.constructionId, constructions.id),
          eq(constructionTranslations.langCode, locale)
        )
      )
      .where(eq(constructions.slug, slug))
      .limit(1);

    if (results.length === 0) {
      return { success: false, error: 'Construction not found' };
    }

    const row = results[0]!;

    return {
      success: true,
      data: {
        id: row.id,
        slug: row.slug,
        status: row.status,
        legacyId: row.legacyId,
        district: row.district,
        municipality: row.municipality,
        parish: row.parish,
        address: row.address,
        drainageBasin: row.drainageBasin,
        mainImage: row.mainImage,
        galleryImages: row.galleryImages,
        lat: Number(row.lat),
        lng: Number(row.lng),
        title: row.title,
        description: row.description,
        typology: row.typology,
        epoch: row.epoch,
        setting: row.setting,
        currentUse: row.currentUse,
        access: row.access,
        legalProtection: row.legalProtection,
        propertyStatus: row.propertyStatus,
        planShape: row.planShape,
        volumetry: row.volumetry,
        constructionTechnique: row.constructionTechnique,
        exteriorFinish: row.exteriorFinish,
        roofShape: row.roofShape,
        roofMaterial: row.roofMaterial,
        length: row.length,
        width: row.width,
        height: row.height,
        stoneTypeGranite: row.stoneTypeGranite,
        stoneTypeSchist: row.stoneTypeSchist,
        stoneTypeOther: row.stoneTypeOther,
        captationType: row.captationType,
        conductionType: row.conductionType,
        conductionState: row.conductionState,
        admissionRodizio: row.admissionRodizio,
        admissionAzenha: row.admissionAzenha,
        wheelTypeRodizio: row.wheelTypeRodizio,
        wheelTypeAzenha: row.wheelTypeAzenha,
        rodizioQty: row.rodizioQty,
        azenhaQty: row.azenhaQty,
        motiveApparatus: row.motiveApparatus,
        millstoneQuantity: row.millstoneQuantity,
        millstoneDiameter: row.millstoneDiameter,
        millstoneState: row.millstoneState,
        hasTremonha: row.hasTremonha,
        hasQuelha: row.hasQuelha,
        hasUrreiro: row.hasUrreiro,
        hasAliviadouro: row.hasAliviadouro,
        hasFarinaleiro: row.hasFarinaleiro,
        epigraphyPresence: row.epigraphyPresence,
        epigraphyLocation: row.epigraphyLocation,
        epigraphyType: row.epigraphyType,
        epigraphyDescription: row.epigraphyDescription,
        ratingStructure: row.ratingStructure,
        ratingRoof: row.ratingRoof,
        ratingHydraulic: row.ratingHydraulic,
        ratingMechanism: row.ratingMechanism,
        ratingOverall: row.ratingOverall,
        observationsStructure: row.observationsStructure,
        observationsRoof: row.observationsRoof,
        observationsHydraulic: row.observationsHydraulic,
        observationsMechanism: row.observationsMechanism,
        observationsGeneral: row.observationsGeneral,
        hasOven: row.hasOven,
        hasMillerHouse: row.hasMillerHouse,
        hasStable: row.hasStable,
        hasFullingMill: row.hasFullingMill,
      },
    };
  } catch (error) {
    console.error('[getConstructionForReview]:', error);
    return { success: false, error: 'An error occurred while fetching construction data' };
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

    // Query constructions with status = 'review' (Phase 5.9.7.1: Review queue shows only 'review' status)
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
      .where(eq(constructions.status, 'review'))
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
  setting: z.enum(['rural', 'urban', 'isolated', 'riverbank']).optional(),
  currentUse: z.enum(['milling', 'housing', 'tourism', 'ruin', 'museum']).optional(),
  
  // Access & Legal
  access: z.enum(['pedestrian', 'car', 'difficult_none', 'traditional_track']).optional(),
  legalProtection: z.enum(['inexistent', 'under_study', 'classified']).optional(),
  propertyStatus: z.enum(['private', 'public', 'unknown']).optional(),
  
  // Architecture (Section III)
  // Phase 5.9.20.4: Restricted to 4 approved plan shapes
  planShape: z.enum(['circular', 'quadrangular', 'rectangular', 'irregular']).optional(),
  volumetry: z.enum(['cylindrical', 'conical', 'prismatic_sq_rec']).optional(),
  constructionTechnique: z.enum(['dry_stone', 'mortared_stone', 'mixed_other']).optional(),
  exteriorFinish: z.enum(['exposed', 'plastered', 'whitewashed']).optional(),
  roofShape: z.enum(['conical', 'gable', 'lean_to', 'inexistent', 'false_dome']).optional(),
  roofMaterial: z.enum(['tile', 'zinc', 'thatch', 'slate', 'stone']).optional(),
  // Physical Dimensions (Phase 5.9.3.10)
  length: z.number().min(0).optional(),
  width: z.number().min(0).optional(),
  height: z.number().min(0).optional(),
  
  // Data Transition: Stone Material (replacing packed strings in observations)
  stoneTypeGranite: z.boolean().optional(),
  stoneTypeSchist: z.boolean().optional(),
  stoneTypeOther: z.boolean().optional(),
  stoneMaterialDescription: z.string().optional(),
  
  // Data Transition: Gable Roof Materials (replacing packed strings in observations)
  gableMaterialLusa: z.boolean().optional(),
  gableMaterialMarselha: z.boolean().optional(),
  gableMaterialMeiaCana: z.boolean().optional(),
  
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
  
  // Hydraulic Infrastructure (Phase 5.9.2.3)
  waterLineId: z.string().uuid().optional().nullable(),
  
  // Images
  mainImage: z.string().optional(),
  galleryImages: z.array(z.string()).optional(),
  
  // Phase 5.9.7.1: Status for workflow
  status: z.enum(['draft', 'review']).optional(),
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
      const insertValues = {
        slug: uniqueSlug,
        legacyId: validated.legacyId || null,
        typeCategory: 'MILL',
        geom: [validated.longitude, validated.latitude] as [number, number], // PostGIS: [lng, lat]
        district: validated.district || null,
        municipality: validated.municipality || null,
        parish: validated.parish || null,
        address: validated.address || null,
        drainageBasin: validated.drainageBasin || null,
        mainImage: validated.mainImage || null,
        galleryImages: validated.galleryImages && validated.galleryImages.length > 0 
          ? validated.galleryImages 
          : null,
        status: (validated.status || 'draft') as 'draft' | 'review', // Phase 5.9.7.1: Use provided status or default to draft
        createdBy: userId,
      };
      
      // Debug logging: Print the exact values being sent to the database
      console.log('[createMillConstruction]: Inserting into constructions table with values:', JSON.stringify(insertValues, null, 2));
      
      const [newConstruction] = await tx
        .insert(constructions)
        .values(insertValues)
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
        // Physical Dimensions (Phase 5.9.3.10)
        length: validated.length || null,
        width: validated.width || null,
        height: validated.height || null,
        // Data Transition: Stone Material
        stoneTypeGranite: validated.stoneTypeGranite || false,
        stoneTypeSchist: validated.stoneTypeSchist || false,
        stoneTypeOther: validated.stoneTypeOther || false,
        stoneMaterialDescription: validated.stoneMaterialDescription || null,
        // Data Transition: Gable Roof Materials
        gableMaterialLusa: validated.gableMaterialLusa || false,
        gableMaterialMarselha: validated.gableMaterialMarselha || false,
        gableMaterialMeiaCana: validated.gableMaterialMeiaCana || false,
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
        // Hydraulic Infrastructure (Phase 5.9.2.3)
        waterLineId: validated.waterLineId || null,
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

/**
 * Zod schema for water line creation
 */
const createWaterLineSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format'),
  path: z.array(z.tuple([z.number(), z.number()])).min(2, 'Path must have at least 2 points'),
  locale: z.enum(['pt', 'en']),
  // Phase 5.9.7.1: Status for workflow (water lines don't have status in schema, but we'll handle it if added later)
  // Note: Water lines currently don't have status field, so this is for future compatibility
});

/**
 * Creates a new water line with translation
 * 
 * Security: Verifies that the performing user has 'researcher' or 'admin' role
 * 
 * This action uses a database transaction to ensure atomicity:
 * 1. Inserts into constructions (parent record with type_category: 'water_line' and geom from first point of path)
 * 2. Inserts into water_lines (core data including PostGIS LineString geometry, linked to construction)
 * 3. Inserts into water_line_translations (name/description for locale)
 * 
 * @param data - Form data containing water line information
 * @returns Standardized response: { success: true, data?: { id: string, slug: string } } or { success: false, error: string }
 */
export async function createWaterLine(
  data: z.infer<typeof createWaterLineSchema>
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
    const validationResult = createWaterLineSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return { success: false, error: `Validation failed: ${errors}` };
    }

    const validated = validationResult.data;

    // Validate path has at least 2 points
    if (!validated.path || validated.path.length < 2) {
      return { success: false, error: 'Path must have at least 2 points' };
    }

    // Generate unique slug from name
    const baseSlug = generateSlug(validated.name);
    
    // Check if slug exists in constructions (since water lines now use construction slugs)
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
      // Step 1: Insert into constructions (parent record)
      // Use the first point of the path as the representative location
      // Path is in [lng, lat] format (PostGIS format), which is what constructions.geom expects
      const firstPoint = validated.path[0]!;
      const [lng, lat] = firstPoint; // Already in [lng, lat] format
      
      const [newConstruction] = await tx
        .insert(constructions)
        .values({
          slug: uniqueSlug,
          typeCategory: 'water_line',
          geom: [lng, lat] as [number, number], // PostGIS: [lng, lat]
          status: 'published', // Water lines are always considered published
          createdBy: userId,
        })
        .returning({ id: constructions.id, slug: constructions.slug });

      if (!newConstruction) {
        throw new Error('Failed to create construction for water line');
      }

      // Step 2: Insert into water_lines (core data with PostGIS LineString, linked to construction)
      // The path is already in [lng, lat] format (PostGIS format)
      const [newWaterLine] = await tx
        .insert(waterLines)
        .values({
          constructionId: newConstruction.id,
          slug: uniqueSlug, // Use same slug as construction
          path: validated.path as [number, number][], // PostGIS: array of [lng, lat] tuples
          color: validated.color,
        })
        .returning({ id: waterLines.id, slug: waterLines.slug });

      if (!newWaterLine) {
        throw new Error('Failed to create water line');
      }

      // Step 3: Insert into water_line_translations (i18n)
      await tx.insert(waterLineTranslations).values({
        waterLineId: newWaterLine.id,
        locale: validated.locale,
        name: validated.name,
        description: validated.description || null,
      });

      return newWaterLine;
    });

    // Revalidate dashboard pages
    revalidatePath('/en/dashboard');
    revalidatePath('/pt/dashboard');

    return { success: true, data: { id: result.id, slug: result.slug } };
  } catch (error) {
    console.error('[createWaterLine]:', error);
    return { success: false, error: 'An error occurred while creating the water line' };
  }
}

/**
 * Zod schema for poça creation (Phase 5.9.7: The Poças Identity)
 */
const createPocaConstructionSchema = z.object({
  // General Info
  title: z.string().min(1, 'Title is required'),
  locale: z.enum(['pt', 'en']),
  
  // Location
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  
  // Link to water line (required)
  waterLineId: z.string().uuid('Valid water line ID is required'),
  
  // Phase 5.9.7.1: Status for workflow
  status: z.enum(['draft', 'review']).optional(),
});

/**
 * Creates a new poça construction with all related data
 * 
 * Security: Verifies that the performing user has 'researcher' or 'admin' role
 * 
 * This action uses a database transaction to ensure atomicity:
 * 1. Inserts into constructions (core data, status='draft', typeCategory='POCA')
 * 2. Inserts into construction_translations (title for locale)
 * 3. Inserts into pocas_data (link to water line)
 * 
 * @param data - Form data containing poça information
 * @returns Standardized response: { success: true, data?: { id: string, slug: string } } or { success: false, error: string }
 */
export async function createPocaConstruction(
  data: z.infer<typeof createPocaConstructionSchema>
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
    const validationResult = createPocaConstructionSchema.safeParse(data);
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
          typeCategory: 'POCA',
          geom: [validated.longitude, validated.latitude] as [number, number], // PostGIS: [lng, lat]
          status: (validated.status || 'draft') as 'draft' | 'review', // Phase 5.9.7.1: Use provided status or default to draft
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
      });

      // Step 3: Insert into pocas_data (link to water line)
      await tx.insert(pocasData).values({
        constructionId: newConstruction.id,
        waterLineId: validated.waterLineId,
      });

      return newConstruction;
    });

    // Revalidate dashboard pages to show new draft
    revalidatePath('/en/dashboard');
    revalidatePath('/pt/dashboard');
    revalidatePath('/en/dashboard/inventory');
    revalidatePath('/pt/dashboard/inventory');

    return { success: true, data: { id: result.id, slug: result.slug } };
  } catch (error) {
    console.error('[createPocaConstruction]:', error);
    return { success: false, error: 'An error occurred while creating the poça' };
  }
}

/**
 * Inventory item type for the master list
 */
export interface InventoryItem {
  id: string;
  slug: string;
  type: 'MILL' | 'LEVADA' | 'POCA';
  title: string | null;
  status: 'draft' | 'review' | 'published';
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null; // Phase 5.9.7.2: Include for permission checks
}

/**
 * Fetches all constructions and water lines for the inventory master list
 * 
 * Security: Verifies that the performing user has 'researcher' or 'admin' role
 * 
 * @param locale - Current locale code ('en' | 'pt')
 * @param filters - Optional filters for type and status
 * @param searchQuery - Optional text search query (searches in title/name)
 * @returns Standardized response with array of inventory items
 */
export async function getInventoryItems(
  locale: string,
  filters?: {
    type?: 'MILL' | 'LEVADA' | 'POCA' | 'ALL';
    status?: 'draft' | 'review' | 'published' | 'ALL';
    myProjects?: boolean; // Phase 5.9.7.1: Filter by current user's drafts
  },
  searchQuery?: string
): Promise<
  | { success: true; data: InventoryItem[] }
  | { success: false; error: string }
> {
  try {
    // Verify researcher or admin role
    const hasPermission = await isResearcherOrAdmin();
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Researcher or Admin role required' };
    }

    // Validate locale
    if (!locale || typeof locale !== 'string') {
      return { success: false, error: 'Locale is required' };
    }

    // Phase 5.9.7.2: Get user role and ID for role-based filtering
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }
    const isUserAdmin = await isAdmin();

    const items: InventoryItem[] = [];

    // Fetch constructions (mills and pocas)
    // Strategy: Query constructions directly without joining extension tables
    // This ensures one physical site = one row in the inventory
    // Extension data (mills_data, pocas_data) is not needed for the inventory list
    if (!filters?.type || filters.type === 'MILL' || filters.type === 'POCA' || filters.type === 'ALL') {
      const whereConditions = [];
      
      // Filter by type category if specific type requested
      // Only include constructions that match the requested type_category
      if (filters?.type === 'MILL') {
        whereConditions.push(eq(constructions.typeCategory, 'MILL'));
      } else if (filters?.type === 'POCA') {
        whereConditions.push(eq(constructions.typeCategory, 'POCA'));
      } else if (filters?.type === 'ALL') {
        // Include both MILL and POCA, but exclude water_line (handled separately)
        whereConditions.push(
          or(
            eq(constructions.typeCategory, 'MILL'),
            eq(constructions.typeCategory, 'POCA')
          )
        );
      }
      // If no type filter, default behavior includes MILL and POCA
      
      // Phase 5.9.7.2: Role-based filtering
      if (filters?.myProjects) {
        // "My Projects" tab: show only user's drafts
        whereConditions.push(eq(constructions.createdBy, userId));
        whereConditions.push(eq(constructions.status, 'draft'));
      } else if (!isUserAdmin) {
        // Researchers: see only their own draft items + all published items
        // Apply status filter if specified, but respect role-based restrictions
        if (filters?.status && filters.status !== 'ALL') {
          if (filters.status === 'draft') {
            // Only show drafts owned by the user
            whereConditions.push(eq(constructions.createdBy, userId));
            whereConditions.push(eq(constructions.status, 'draft'));
          } else if (filters.status === 'published') {
            // Show all published items
            whereConditions.push(eq(constructions.status, 'published'));
          } else if (filters.status === 'review') {
            // Researchers don't see review items in inventory (only admins do)
            whereConditions.push(sql`1 = 0`); // Always false - no results
          }
        } else {
          // No status filter: show user's drafts + all published
          whereConditions.push(
            or(
              and(
                eq(constructions.createdBy, userId),
                eq(constructions.status, 'draft')
              ),
              eq(constructions.status, 'published')
            )
          );
        }
      } else {
        // Admins: see everything - apply status filter if specified
        if (filters?.status && filters.status !== 'ALL') {
          whereConditions.push(eq(constructions.status, filters.status));
        }
      }
      
      // Apply search query (searches in title)
      if (searchQuery && searchQuery.trim()) {
        const searchPattern = `%${searchQuery.trim()}%`;
        whereConditions.push(
          sql`LOWER(${constructionTranslations.title}) LIKE LOWER(${searchPattern})`
        );
      }

      // Query constructions with translations only
      // Strategy: No joins to mills_data or pocas_data - ensures one row per construction.id
      // The left join with construction_translations is safe because it has a composite
      // primary key (constructionId, langCode), so it won't create duplicates
      const constructionsQuery = db
        .select({
          id: constructions.id,
          slug: constructions.slug,
          typeCategory: constructions.typeCategory,
          status: constructions.status,
          createdAt: constructions.createdAt,
          updatedAt: constructions.updatedAt,
          title: constructionTranslations.title,
          createdBy: constructions.createdBy, // Phase 5.9.7.2: Include for permission checks
        })
        .from(constructions)
        .leftJoin(
          constructionTranslations,
          and(
            eq(constructionTranslations.constructionId, constructions.id),
            eq(constructionTranslations.langCode, locale)
          )
        )
        .where(
          whereConditions.length > 0
            ? and(...whereConditions)
            : undefined
        )
        .orderBy(desc(constructions.updatedAt));

      const constructionsResults = await constructionsQuery;

      // Ensure uniqueness by construction.id (safety measure)
      // One physical site = One row in the Inventory table
      const uniqueConstructions = new Map<string, typeof constructionsResults[0]>();
      for (const row of constructionsResults) {
        if (!uniqueConstructions.has(row.id)) {
          uniqueConstructions.set(row.id, row);
        }
      }

      items.push(
        ...Array.from(uniqueConstructions.values()).map((row) => ({
          id: row.id,
          slug: row.slug,
          type: (row.typeCategory === 'POCA' ? 'POCA' : 'MILL') as 'MILL' | 'POCA',
          title: row.title,
          status: row.status as 'draft' | 'review' | 'published',
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          createdBy: row.createdBy, // Phase 5.9.7.2: Include for permission checks
        }))
      );
    }

    // Fetch water lines (levadas) - using INNER JOIN with constructions
    if (!filters?.type || filters.type === 'LEVADA' || filters.type === 'ALL') {
      // Note: Water lines don't have status, so we only filter by search query
      const whereConditions = [
        eq(constructions.typeCategory, 'water_line'), // Only water_line constructions
      ];
      
      // Apply search query (searches in name)
      if (searchQuery && searchQuery.trim()) {
        const searchPattern = `%${searchQuery.trim()}%`;
        whereConditions.push(
          sql`LOWER(${waterLineTranslations.name}) LIKE LOWER(${searchPattern})`
        );
      }

      const waterLinesQuery = db
        .select({
          id: constructions.id, // BUG FIX: Use constructions.id, NOT waterLines.id
          slug: constructions.slug, // Use construction slug
          createdAt: constructions.createdAt,
          updatedAt: constructions.updatedAt,
          name: waterLineTranslations.name,
          createdBy: constructions.createdBy, // Phase 5.9.7.2: Include for permission checks
        })
        .from(constructions)
        .innerJoin(
          waterLines,
          eq(waterLines.constructionId, constructions.id)
        )
        .leftJoin(
          waterLineTranslations,
          and(
            eq(waterLineTranslations.waterLineId, waterLines.id),
            eq(waterLineTranslations.locale, locale)
          )
        )
        .where(
          whereConditions.length > 0
            ? and(...whereConditions)
            : undefined
        )
        .orderBy(desc(constructions.updatedAt));

      const waterLinesResults = await waterLinesQuery;

      items.push(
        ...waterLinesResults.map((row) => ({
          id: row.id, // Now correctly uses constructions.id
          slug: row.slug,
          type: 'LEVADA' as const,
          title: row.name,
          status: 'published' as const, // Water lines are always considered published
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          createdBy: row.createdBy, // Phase 5.9.7.2: Include for permission checks
        }))
      );
    }

    // Sort all items by updatedAt descending
    items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return { success: true, data: items };
  } catch (error) {
    console.error('[getInventoryItems]:', error);
    return { success: false, error: 'An error occurred while fetching inventory items' };
  }
}

/**
 * Gets the type of an item by ID (MILL, POCA, or LEVADA)
 * 
 * Security: Verifies that the performing user has 'researcher' or 'admin' role
 * 
 * @param id - Item UUID
 * @returns Standardized response with item type or null if not found
 */
export async function getItemTypeById(
  id: string
): Promise<
  | { success: true; data: { type: 'MILL' | 'POCA' | 'LEVADA'; slug: string } }
  | { success: false; error: string }
> {
  try {
    // Verify researcher or admin role
    const hasPermission = await isResearcherOrAdmin();
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Researcher or Admin role required' };
    }

    // Validate input
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Item ID is required' };
    }

    // Try to find in constructions table (includes MILL, POCA, and water_line)
    const construction = await db
      .select({
        id: constructions.id,
        slug: constructions.slug,
        typeCategory: constructions.typeCategory,
      })
      .from(constructions)
      .where(eq(constructions.id, id))
      .limit(1);

    if (construction.length > 0) {
      const typeCategory = construction[0]!.typeCategory;
      if (typeCategory === 'water_line') {
        return { success: true, data: { type: 'LEVADA', slug: construction[0]!.slug } };
      }
      const type = typeCategory === 'POCA' ? 'POCA' : 'MILL';
      return { success: true, data: { type, slug: construction[0]!.slug } };
    }

    // If not found in constructions, it might be an old water_line without a parent
    // Try to find in water_lines table (for backward compatibility during migration)
    const waterLine = await db
      .select({
        id: waterLines.id,
        slug: waterLines.slug,
      })
      .from(waterLines)
      .where(eq(waterLines.id, id))
      .limit(1);

    if (waterLine.length > 0) {
      return { success: true, data: { type: 'LEVADA', slug: waterLine[0]!.slug } };
    }

    return { success: false, error: 'Item not found' };
  } catch (error) {
    console.error('[getItemTypeById]:', error);
    return { success: false, error: 'An error occurred while fetching item type' };
  }
}

/**
 * Gets a construction by ID for editing
 * 
 * Security: Verifies that the performing user has 'researcher' or 'admin' role
 * Also verifies that the user is the author or an admin
 * 
 * @param id - Construction UUID
 * @param locale - Current locale code ('en' | 'pt')
 * @returns Standardized response with full construction data
 */
export async function getConstructionByIdForEdit(
  id: string,
  locale: string
): Promise<
  | {
      success: true;
      data: {
        id: string;
        slug: string;
        status: string;
        legacyId: string | null;
        district: string | null;
        municipality: string | null;
        parish: string | null;
        address: string | null;
        drainageBasin: string | null;
        mainImage: string | null;
        galleryImages: string[] | null;
        lat: number;
        lng: number;
        title: string | null;
        description: string | null;
        typology: string;
        epoch: string | null;
        setting: string | null;
        currentUse: string | null;
        access: string | null;
        legalProtection: string | null;
        propertyStatus: string | null;
        planShape: string | null;
        volumetry: string | null;
        constructionTechnique: string | null;
        exteriorFinish: string | null;
        roofShape: string | null;
        roofMaterial: string | null;
        captationType: string | null;
        conductionType: string | null;
        conductionState: string | null;
        admissionRodizio: string | null;
        admissionAzenha: string | null;
        wheelTypeRodizio: string | null;
        wheelTypeAzenha: string | null;
        rodizioQty: number | null;
        azenhaQty: number | null;
        motiveApparatus: string | null;
        millstoneQuantity: number | null;
        millstoneDiameter: string | null;
        millstoneState: string | null;
        hasTremonha: boolean;
        hasQuelha: boolean;
        hasUrreiro: boolean;
        hasAliviadouro: boolean;
        hasFarinaleiro: boolean;
        epigraphyPresence: boolean;
        epigraphyLocation: string | null;
        epigraphyType: string | null;
        epigraphyDescription: string | null;
        ratingStructure: string | null;
        ratingRoof: string | null;
        ratingHydraulic: string | null;
        ratingMechanism: string | null;
        ratingOverall: string | null;
        observationsStructure: string | null;
        observationsRoof: string | null;
        observationsHydraulic: string | null;
        observationsMechanism: string | null;
        observationsGeneral: string | null;
        hasOven: boolean;
        hasMillerHouse: boolean;
        hasStable: boolean;
        hasFullingMill: boolean;
        waterLineId: string | null;
        createdBy: string | null;
      };
    }
  | { success: false; error: string }
> {
  try {
    // Verify researcher or admin role
    const hasPermission = await isResearcherOrAdmin();
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Researcher or Admin role required' };
    }

    // Get current user ID
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user is admin
    const isUserAdmin = await isAdmin();

    // Validate inputs
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Construction ID is required' };
    }

    if (!locale || typeof locale !== 'string') {
      return { success: false, error: 'Locale is required' };
    }

    // Query construction with all related data
    const results = await db
      .select({
        // Construction fields
        id: constructions.id,
        slug: constructions.slug,
        status: constructions.status,
        legacyId: constructions.legacyId,
        district: constructions.district,
        municipality: constructions.municipality,
        parish: constructions.parish,
        address: constructions.address,
        drainageBasin: constructions.drainageBasin,
        mainImage: constructions.mainImage,
        galleryImages: constructions.galleryImages,
        createdBy: constructions.createdBy,
        // PostGIS coordinate extraction
        lng: sql<number>`ST_X(${constructions.geom}::geometry)`,
        lat: sql<number>`ST_Y(${constructions.geom}::geometry)`,
        // Mills data fields
        typology: millsData.typology,
        epoch: millsData.epoch,
        setting: millsData.setting,
        currentUse: millsData.currentUse,
        access: millsData.access,
        legalProtection: millsData.legalProtection,
        propertyStatus: millsData.propertyStatus,
        planShape: millsData.planShape,
        volumetry: millsData.volumetry,
        constructionTechnique: millsData.constructionTechnique,
        exteriorFinish: millsData.exteriorFinish,
        roofShape: millsData.roofShape,
        roofMaterial: millsData.roofMaterial,
        length: millsData.length,
        width: millsData.width,
        height: millsData.height,
        captationType: millsData.captationType,
        conductionType: millsData.conductionType,
        conductionState: millsData.conductionState,
        admissionRodizio: millsData.admissionRodizio,
        admissionAzenha: millsData.admissionAzenha,
        wheelTypeRodizio: millsData.wheelTypeRodizio,
        wheelTypeAzenha: millsData.wheelTypeAzenha,
        rodizioQty: millsData.rodizioQty,
        azenhaQty: millsData.azenhaQty,
        motiveApparatus: millsData.motiveApparatus,
        millstoneQuantity: millsData.millstoneQuantity,
        millstoneDiameter: millsData.millstoneDiameter,
        millstoneState: millsData.millstoneState,
        hasTremonha: millsData.hasTremonha,
        hasQuelha: millsData.hasQuelha,
        hasUrreiro: millsData.hasUrreiro,
        hasAliviadouro: millsData.hasAliviadouro,
        hasFarinaleiro: millsData.hasFarinaleiro,
        epigraphyPresence: millsData.epigraphyPresence,
        epigraphyLocation: millsData.epigraphyLocation,
        epigraphyType: millsData.epigraphyType,
        epigraphyDescription: millsData.epigraphyDescription,
        ratingStructure: millsData.ratingStructure,
        ratingRoof: millsData.ratingRoof,
        ratingHydraulic: millsData.ratingHydraulic,
        ratingMechanism: millsData.ratingMechanism,
        ratingOverall: millsData.ratingOverall,
        waterLineId: millsData.waterLineId,
        // Translation fields
        title: constructionTranslations.title,
        description: constructionTranslations.description,
        observationsStructure: constructionTranslations.observationsStructure,
        observationsRoof: constructionTranslations.observationsRoof,
        observationsHydraulic: constructionTranslations.observationsHydraulic,
        observationsMechanism: constructionTranslations.observationsMechanism,
        observationsGeneral: constructionTranslations.observationsGeneral,
        // Annexes
        hasOven: millsData.hasOven,
        hasMillerHouse: millsData.hasMillerHouse,
        hasStable: millsData.hasStable,
        hasFullingMill: millsData.hasFullingMill,
      })
      .from(constructions)
      .innerJoin(millsData, eq(millsData.constructionId, constructions.id))
      .leftJoin(
        constructionTranslations,
        and(
          eq(constructionTranslations.constructionId, constructions.id),
          eq(constructionTranslations.langCode, locale)
        )
      )
      .where(eq(constructions.id, id))
      .limit(1);

    if (results.length === 0) {
      return { success: false, error: 'Construction not found' };
    }

    const row = results[0]!;

    // Security check: Only author or admin can edit
    if (!isUserAdmin && row.createdBy !== userId) {
      return { success: false, error: 'Unauthorized: You can only edit your own constructions' };
    }

    return {
      success: true,
      data: {
        id: row.id,
        slug: row.slug,
        status: row.status,
        legacyId: row.legacyId,
        district: row.district,
        municipality: row.municipality,
        parish: row.parish,
        address: row.address,
        drainageBasin: row.drainageBasin,
        mainImage: row.mainImage,
        galleryImages: row.galleryImages || [],
        lat: Number(row.lat),
        lng: Number(row.lng),
        title: row.title,
        description: row.description,
        typology: row.typology,
        epoch: row.epoch,
        setting: row.setting,
        currentUse: row.currentUse,
        access: row.access,
        legalProtection: row.legalProtection,
        propertyStatus: row.propertyStatus,
        planShape: row.planShape,
        volumetry: row.volumetry,
        constructionTechnique: row.constructionTechnique,
        exteriorFinish: row.exteriorFinish,
        roofShape: row.roofShape,
        roofMaterial: row.roofMaterial,
        length: row.length,
        width: row.width,
        height: row.height,
        captationType: row.captationType,
        conductionType: row.conductionType,
        conductionState: row.conductionState,
        admissionRodizio: row.admissionRodizio,
        admissionAzenha: row.admissionAzenha,
        wheelTypeRodizio: row.wheelTypeRodizio,
        wheelTypeAzenha: row.wheelTypeAzenha,
        rodizioQty: row.rodizioQty,
        azenhaQty: row.azenhaQty,
        motiveApparatus: row.motiveApparatus,
        millstoneQuantity: row.millstoneQuantity,
        millstoneDiameter: row.millstoneDiameter,
        millstoneState: row.millstoneState,
        hasTremonha: row.hasTremonha,
        hasQuelha: row.hasQuelha,
        hasUrreiro: row.hasUrreiro,
        hasAliviadouro: row.hasAliviadouro,
        hasFarinaleiro: row.hasFarinaleiro,
        epigraphyPresence: row.epigraphyPresence,
        epigraphyLocation: row.epigraphyLocation,
        epigraphyType: row.epigraphyType,
        epigraphyDescription: row.epigraphyDescription,
        ratingStructure: row.ratingStructure,
        ratingRoof: row.ratingRoof,
        ratingHydraulic: row.ratingHydraulic,
        ratingMechanism: row.ratingMechanism,
        ratingOverall: row.ratingOverall,
        observationsStructure: row.observationsStructure,
        observationsRoof: row.observationsRoof,
        observationsHydraulic: row.observationsHydraulic,
        observationsMechanism: row.observationsMechanism,
        observationsGeneral: row.observationsGeneral,
        hasOven: row.hasOven,
        hasMillerHouse: row.hasMillerHouse,
        hasStable: row.hasStable,
        hasFullingMill: row.hasFullingMill,
        waterLineId: row.waterLineId,
        createdBy: row.createdBy,
      },
    };
  } catch (error) {
    console.error('[getConstructionByIdForEdit]:', error);
    return { success: false, error: 'An error occurred while fetching construction data' };
  }
}

/**
 * Gets a water line by ID for editing
 * 
 * Security: Verifies that the performing user has 'researcher' or 'admin' role
 * 
 * @param id - Water line UUID
 * @param locale - Current locale code ('en' | 'pt')
 * @returns Standardized response with water line data
 */
export async function getWaterLineByIdForEdit(
  id: string,
  locale: string
): Promise<
  | {
      success: true;
      data: {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        color: string;
        path: [number, number][]; // Array of [lng, lat] coordinate pairs
      };
    }
  | { success: false; error: string }
> {
  try {
    // Verify researcher or admin role
    const hasPermission = await isResearcherOrAdmin();
    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Researcher or Admin role required' };
    }

    // Validate inputs
    if (!id || typeof id !== 'string') {
      return { success: false, error: 'Water line ID is required' };
    }

    if (!locale || typeof locale !== 'string') {
      return { success: false, error: 'Locale is required' };
    }

    // Query water line by ID with translation
    // Use INNER JOIN with constructions to ensure valid parent-child relationship
    const results = await db
      .select({
        id: waterLines.id,
        slug: constructions.slug, // Use construction slug
        pathText: sql<string>`ST_AsText(${waterLines.path})`.as('path_text'),
        color: waterLines.color,
        name: waterLineTranslations.name,
        description: waterLineTranslations.description,
      })
      .from(constructions)
      .innerJoin(
        waterLines,
        eq(waterLines.constructionId, constructions.id)
      )
      .leftJoin(
        waterLineTranslations,
        and(
          eq(waterLineTranslations.waterLineId, waterLines.id),
          eq(waterLineTranslations.locale, locale)
        )
      )
      .where(
        and(
          eq(waterLines.id, id),
          eq(constructions.typeCategory, 'water_line')
        )
      )
      .limit(1);

    if (results.length === 0) {
      return { success: false, error: 'Water line not found' };
    }

    const row = results[0]!;

    // Parse PostGIS LINESTRING format: LINESTRING(lng1 lat1, lng2 lat2, ...)
    const match = row.pathText.match(/LINESTRING\((.+)\)/);
    if (!match) {
      return { success: false, error: 'Invalid water line geometry' };
    }

    const coordsStr = match[1];
    const coordPairs = coordsStr.split(',').map(coord => coord.trim());
    
    // Parse coordinates - keep as [lng, lat] for database format
    const path: [number, number][] = coordPairs.map(coord => {
      const [lng, lat] = coord.split(/\s+/).map(parseFloat);
      return [lng, lat] as [number, number];
    });

    if (path.length < 2) {
      return { success: false, error: 'Invalid water line path' };
    }

    return {
      success: true,
      data: {
        id: row.id,
        slug: row.slug,
        name: row.name || row.slug,
        description: row.description,
        color: row.color,
        path,
      },
    };
  } catch (error) {
    console.error('[getWaterLineByIdForEdit]:', error);
    return { success: false, error: 'An error occurred while fetching water line data' };
  }
}

/**
 * Zod schema for mill construction update (same as create, but with id)
 */
const updateMillConstructionSchema = createMillConstructionSchema.extend({
  id: z.string().uuid('Invalid construction ID'),
});

/**
 * Updates an existing mill construction with all related data
 * 
 * Security: Verifies that the performing user has 'researcher' or 'admin' role
 * Also verifies that the user is the author or an admin
 * 
 * This action uses a database transaction to ensure atomicity:
 * 1. Updates constructions (core data)
 * 2. Updates or inserts construction_translations (title/description for locale)
 * 3. Updates mills_data (scientific/technical details)
 * 
 * @param data - Form data containing all construction information including id
 * @returns Standardized response: { success: true, data?: { id: string, slug: string } } or { success: false, error: string }
 */
export async function updateMillConstruction(
  data: z.infer<typeof updateMillConstructionSchema>
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

    // Get current user ID
    const userId = await getSessionUserId();
    if (!userId) {
      return { success: false, error: 'User not authenticated' };
    }

    // Check if user is admin
    const isUserAdmin = await isAdmin();

    // Validate input with Zod
    const validationResult = updateMillConstructionSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return { success: false, error: `Validation failed: ${errors}` };
    }

    const validated = validationResult.data;

    // Check if construction exists and verify permissions
    const existing = await db
      .select({
        id: constructions.id,
        createdBy: constructions.createdBy,
      })
      .from(constructions)
      .where(eq(constructions.id, validated.id))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: 'Construction not found' };
    }

    // Security check: Only author or admin can update
    if (!isUserAdmin && existing[0]!.createdBy !== userId) {
      return { success: false, error: 'Unauthorized: You can only edit your own constructions' };
    }

    // Use database transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Step 1: Update constructions (core data)
      // Phase 5.9.7.1: Update status if provided (for draft/review workflow)
      const updateData: {
        legacyId: string | null;
        geom: [number, number];
        district: string | null;
        municipality: string | null;
        parish: string | null;
        address: string | null;
        drainageBasin: string | null;
        mainImage: string | null;
        galleryImages: string[] | null;
        updatedAt: Date;
        status?: 'draft' | 'review';
      } = {
        legacyId: validated.legacyId || null,
        geom: [validated.longitude, validated.latitude] as [number, number], // PostGIS: [lng, lat]
        district: validated.district || null,
        municipality: validated.municipality || null,
        parish: validated.parish || null,
        address: validated.address || null,
        drainageBasin: validated.drainageBasin || null,
        mainImage: validated.mainImage || null,
        galleryImages: validated.galleryImages && validated.galleryImages.length > 0 
          ? validated.galleryImages 
          : null,
        updatedAt: new Date(),
      };
      
      // Only update status if provided (allows changing from draft to review)
      if (validated.status) {
        updateData.status = validated.status;
      }
      
      const [updatedConstruction] = await tx
        .update(constructions)
        .set(updateData)
        .where(eq(constructions.id, validated.id))
        .returning({ id: constructions.id, slug: constructions.slug });

      if (!updatedConstruction) {
        throw new Error('Failed to update construction');
      }

      // Step 2: Update or insert construction_translations (i18n + conservation observations)
      // Check if translation exists
      const existingTranslation = await tx
        .select({ constructionId: constructionTranslations.constructionId })
        .from(constructionTranslations)
        .where(
          and(
            eq(constructionTranslations.constructionId, validated.id),
            eq(constructionTranslations.langCode, validated.locale)
          )
        )
        .limit(1);

      if (existingTranslation.length > 0) {
        // Update existing translation
        await tx
          .update(constructionTranslations)
          .set({
            title: validated.title,
            description: validated.description || null,
            observationsStructure: validated.observationsStructure || null,
            observationsRoof: validated.observationsRoof || null,
            observationsHydraulic: validated.observationsHydraulic || null,
            observationsMechanism: validated.observationsMechanism || null,
            observationsGeneral: validated.observationsGeneral || null,
          })
          .where(
            and(
              eq(constructionTranslations.constructionId, validated.id),
              eq(constructionTranslations.langCode, validated.locale)
            )
          );
      } else {
        // Insert new translation
        await tx.insert(constructionTranslations).values({
          constructionId: validated.id,
          langCode: validated.locale,
          title: validated.title,
          description: validated.description || null,
          observationsStructure: validated.observationsStructure || null,
          observationsRoof: validated.observationsRoof || null,
          observationsHydraulic: validated.observationsHydraulic || null,
          observationsMechanism: validated.observationsMechanism || null,
          observationsGeneral: validated.observationsGeneral || null,
        });
      }

      // Step 3: Update mills_data (scientific/technical details - all sections)
      await tx
        .update(millsData)
        .set({
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
          // Physical Dimensions (Phase 5.9.3.10)
          length: validated.length || null,
          width: validated.width || null,
          height: validated.height || null,
          // Data Transition: Stone Material
          stoneTypeGranite: validated.stoneTypeGranite || false,
          stoneTypeSchist: validated.stoneTypeSchist || false,
          stoneTypeOther: validated.stoneTypeOther || false,
          stoneMaterialDescription: validated.stoneMaterialDescription || null,
          // Data Transition: Gable Roof Materials
          gableMaterialLusa: validated.gableMaterialLusa || false,
          gableMaterialMarselha: validated.gableMaterialMarselha || false,
          gableMaterialMeiaCana: validated.gableMaterialMeiaCana || false,
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
          // Hydraulic Infrastructure (Phase 5.9.2.3)
          waterLineId: validated.waterLineId || null,
        })
        .where(eq(millsData.constructionId, validated.id));

      return updatedConstruction;
    });

    // Revalidate dashboard pages and public pages
    revalidatePath('/en/dashboard');
    revalidatePath('/pt/dashboard');
    revalidatePath('/en/dashboard/review');
    revalidatePath('/pt/dashboard/review');
    revalidatePath('/en/dashboard/inventory');
    revalidatePath('/pt/dashboard/inventory');
    revalidatePath(`/en/mill/${result.slug}`);
    revalidatePath(`/pt/mill/${result.slug}`);

    return { success: true, data: { id: result.id, slug: result.slug } };
  } catch (error) {
    console.error('[updateMillConstruction]:', error);
    return { success: false, error: 'An error occurred while updating the construction' };
  }
}

/**
 * Zod schema for water line update (same as create, but with id)
 */
const updateWaterLineSchema = createWaterLineSchema.extend({
  id: z.string().uuid('Invalid water line ID'),
});

/**
 * Updates an existing water line with translation
 * 
 * Security: Verifies that the performing user has 'researcher' or 'admin' role
 * 
 * This action uses a database transaction to ensure atomicity:
 * 1. Updates water_lines (core data including PostGIS LineString geometry)
 * 2. Updates or inserts water_line_translations (name/description for locale)
 * 
 * @param data - Form data containing water line information including id
 * @returns Standardized response: { success: true, data?: { id: string, slug: string } } or { success: false, error: string }
 */
export async function updateWaterLine(
  data: z.infer<typeof updateWaterLineSchema>
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

    // Validate input with Zod
    const validationResult = updateWaterLineSchema.safeParse(data);
    if (!validationResult.success) {
      const errors = validationResult.error.errors.map((e) => e.message).join(', ');
      return { success: false, error: `Validation failed: ${errors}` };
    }

    const validated = validationResult.data;

    // Validate path has at least 2 points
    if (!validated.path || validated.path.length < 2) {
      return { success: false, error: 'Path must have at least 2 points' };
    }

    // Check if water line exists and get its constructionId
    const existing = await db
      .select({ 
        id: waterLines.id, 
        slug: waterLines.slug,
        constructionId: waterLines.constructionId,
      })
      .from(waterLines)
      .where(eq(waterLines.id, validated.id))
      .limit(1);

    if (existing.length === 0) {
      return { success: false, error: 'Water line not found' };
    }

    const existingWaterLine = existing[0]!;

    // Use database transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Step 1: Update constructions (update geom from first point of path)
      // Use the first point of the path as the representative location
      const firstPoint = validated.path[0]!;
      const [lng, lat] = firstPoint; // Already in [lng, lat] format
      
      await tx
        .update(constructions)
        .set({
          geom: [lng, lat] as [number, number], // PostGIS: [lng, lat]
          updatedAt: new Date(),
        })
        .where(eq(constructions.id, existingWaterLine.constructionId));

      // Step 2: Update water_lines (core data with PostGIS LineString)
      const [updatedWaterLine] = await tx
        .update(waterLines)
        .set({
          path: validated.path as [number, number][], // PostGIS: array of [lng, lat] tuples
          color: validated.color,
          updatedAt: new Date(),
        })
        .where(eq(waterLines.id, validated.id))
        .returning({ id: waterLines.id, slug: waterLines.slug });

      if (!updatedWaterLine) {
        throw new Error('Failed to update water line');
      }

      // Step 3: Update or insert water_line_translations (i18n)
      const existingTranslation = await tx
        .select({ waterLineId: waterLineTranslations.waterLineId })
        .from(waterLineTranslations)
        .where(
          and(
            eq(waterLineTranslations.waterLineId, validated.id),
            eq(waterLineTranslations.locale, validated.locale)
          )
        )
        .limit(1);

      if (existingTranslation.length > 0) {
        // Update existing translation
        await tx
          .update(waterLineTranslations)
          .set({
            name: validated.name,
            description: validated.description || null,
          })
          .where(
            and(
              eq(waterLineTranslations.waterLineId, validated.id),
              eq(waterLineTranslations.locale, validated.locale)
            )
          );
      } else {
        // Insert new translation
        await tx.insert(waterLineTranslations).values({
          waterLineId: validated.id,
          locale: validated.locale,
          name: validated.name,
          description: validated.description || null,
        });
      }

      return updatedWaterLine;
    });

    // Revalidate dashboard pages and public pages
    revalidatePath('/en/dashboard');
    revalidatePath('/pt/dashboard');
    revalidatePath('/en/dashboard/inventory');
    revalidatePath('/pt/dashboard/inventory');
    revalidatePath(`/en/levada/${result.slug}`);
    revalidatePath(`/pt/levada/${result.slug}`);

    return { success: true, data: { id: result.id, slug: result.slug } };
  } catch (error) {
    console.error('[updateWaterLine]:', error);
    return { success: false, error: 'An error occurred while updating the water line' };
  }
}
