'use server';

import { db } from '@/lib/db';
import { constructions, millsData, constructionTranslations } from '@/db/schema';
import { eq, and, sql, inArray, or } from 'drizzle-orm';

/**
 * Public Server Actions
 * 
 * These actions are accessible to all users (no authentication required).
 * They only return published constructions.
 */

/**
 * Type definition for a published mill with all related data
 */
export interface PublishedMill {
  id: string;
  slug: string;
  district: string | null;
  municipality: string | null;
  parish: string | null;
  address: string | null;
  drainageBasin: string | null;
  lat: number;
  lng: number;
  // Mills data
  typology: string;
  access: string | null;
  legalProtection: string | null;
  propertyStatus: string | null;
  // Translation (may be null if translation for locale doesn't exist)
  title: string | null;
  description: string | null;
}

/**
 * Filter options for published mills
 */
export interface MillFilters {
  typology?: string[];
  district?: string;
}

/**
 * Fetches all published mills with their related data
 * 
 * Security: Only returns constructions with status = 'published'
 * GIS Logic: Extracts lat/lng from PostGIS geom field using ST_X/ST_Y
 * Localization: Fetches translation matching the provided locale
 * 
 * @param locale - Language code ('pt' | 'en')
 * @param filters - Optional filters for typology and district
 * @returns Standardized response with array of published mills
 */
export async function getPublishedMills(
  locale: string,
  filters?: MillFilters
): Promise<
  | { success: true; data: PublishedMill[] }
  | { success: false; error: string }
> {
  try {
    // Validate locale
    if (!locale || (locale !== 'pt' && locale !== 'en')) {
      return { success: false, error: 'Invalid locale. Must be "pt" or "en"' };
    }

    // Build where conditions
    const whereConditions = [eq(constructions.status, 'published')];

    // Apply typology filter (if provided)
    if (filters?.typology && filters.typology.length > 0) {
      whereConditions.push(inArray(millsData.typology, filters.typology));
    }

    // Apply district filter (if provided)
    if (filters?.district) {
      whereConditions.push(eq(constructions.district, filters.district));
    }

    // Query published mills with joins and PostGIS coordinate extraction
    const results = await db
      .select({
        // Construction fields
        id: constructions.id,
        slug: constructions.slug,
        district: constructions.district,
        municipality: constructions.municipality,
        parish: constructions.parish,
        address: constructions.address,
        drainageBasin: constructions.drainageBasin,
        // PostGIS coordinate extraction: ST_X returns longitude, ST_Y returns latitude
        // Cast geography to geometry for ST_X/ST_Y functions
        lng: sql<number>`ST_X(${constructions.geom}::geometry)`,
        lat: sql<number>`ST_Y(${constructions.geom}::geometry)`,
        // Mills data fields
        typology: millsData.typology,
        access: millsData.access,
        legalProtection: millsData.legalProtection,
        propertyStatus: millsData.propertyStatus,
        // Translation fields
        title: constructionTranslations.title,
        description: constructionTranslations.description,
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
      .where(and(...whereConditions));

    // Transform results to ensure lat/lng are numbers
    const mills: PublishedMill[] = results.map((row) => ({
      id: row.id,
      slug: row.slug,
      district: row.district,
      municipality: row.municipality,
      parish: row.parish,
      address: row.address,
      drainageBasin: row.drainageBasin,
      lat: Number(row.lat),
      lng: Number(row.lng),
      typology: row.typology,
      access: row.access,
      legalProtection: row.legalProtection,
      propertyStatus: row.propertyStatus,
      title: row.title,
      description: row.description,
    }));

    return { success: true, data: mills };
  } catch (error) {
    console.error('[getPublishedMills]:', error);
    return {
      success: false,
      error: 'An error occurred while fetching published mills',
    };
  }
}

/**
 * Gets unique districts from published mills
 * 
 * @returns Array of unique district names (sorted)
 */
export async function getUniqueDistricts(): Promise<
  | { success: true; data: string[] }
  | { success: false; error: string }
> {
  try {
    const results = await db
      .select({
        district: constructions.district,
      })
      .from(constructions)
      .innerJoin(millsData, eq(millsData.constructionId, constructions.id))
      .where(eq(constructions.status, 'published'));

    // Extract districts, filter out nulls, get unique values, and sort
    const districtsSet = new Set<string>();
    results.forEach((row) => {
      if (row.district && row.district.trim() !== '') {
        districtsSet.add(row.district);
      }
    });

    const districts = Array.from(districtsSet).sort();

    return { success: true, data: districts };
  } catch (error) {
    console.error('[getUniqueDistricts]:', error);
    return {
      success: false,
      error: 'An error occurred while fetching districts',
    };
  }
}

