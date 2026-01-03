'use server';

import { db } from '@/lib/db';
import { constructions, millsData, constructionTranslations } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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
 * Fetches all published mills with their related data
 * 
 * Security: Only returns constructions with status = 'published'
 * GIS Logic: Extracts lat/lng from PostGIS geom field using ST_X/ST_Y
 * Localization: Fetches translation matching the provided locale
 * 
 * @param locale - Language code ('pt' | 'en')
 * @returns Standardized response with array of published mills
 */
export async function getPublishedMills(
  locale: string
): Promise<
  | { success: true; data: PublishedMill[] }
  | { success: false; error: string }
> {
  try {
    // Validate locale
    if (!locale || (locale !== 'pt' && locale !== 'en')) {
      return { success: false, error: 'Invalid locale. Must be "pt" or "en"' };
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
      .where(eq(constructions.status, 'published'));

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

