'use server';

import { db } from '@/lib/db';
import { constructions, millsData, constructionTranslations, waterLines, waterLineTranslations } from '@/db/schema';
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
  mainImage: string | null;
  galleryImages: string[] | null;
  lat: number;
  lng: number;
  // Mills data
  typology: string;
  access: string | null;
  legalProtection: string | null;
  propertyStatus: string | null;
  // Phase 5.9.2: Custom icon and water line reference
  customIconUrl: string | null;
  waterLineId: string | null;
  // Translation (may be null if translation for locale doesn't exist)
  title: string | null;
  description: string | null;
}

/**
 * Type definition for a water line on the map
 */
export interface MapWaterLine {
  id: string;
  slug: string;
  path: [number, number][]; // Array of [lng, lat] coordinate pairs
  color: string; // Hex color code
  name: string; // Translated name
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
        mainImage: constructions.mainImage,
        galleryImages: constructions.galleryImages,
        // PostGIS coordinate extraction: ST_X returns longitude, ST_Y returns latitude
        // Cast geography to geometry for ST_X/ST_Y functions
        lng: sql<number>`ST_X(${constructions.geom}::geometry)`,
        lat: sql<number>`ST_Y(${constructions.geom}::geometry)`,
        // Mills data fields
        typology: millsData.typology,
        access: millsData.access,
        legalProtection: millsData.legalProtection,
        propertyStatus: millsData.propertyStatus,
        // Phase 5.9.2: Custom icon and water line reference
        customIconUrl: constructions.customIconUrl,
        waterLineId: millsData.waterLineId,
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
      mainImage: row.mainImage,
      galleryImages: row.galleryImages,
      lat: Number(row.lat),
      lng: Number(row.lng),
      typology: row.typology,
      access: row.access,
      legalProtection: row.legalProtection,
      propertyStatus: row.propertyStatus,
      customIconUrl: row.customIconUrl,
      waterLineId: row.waterLineId,
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
 * Detailed mill data for the detail page
 */
export interface MillDetail extends PublishedMill {
  // Additional fields from mills_data
  planShape: string | null;
  constructionTechnique: string | null;
  roofShape: string | null;
  roofMaterial: string | null;
  waterCaptation: string | null;
  rodizioQty: number | null;
  windApparatus: string | null;
  millstonesPairs: number | null;
  ratingStructure: string | null;
  ratingRoof: string | null;
  ratingHydraulic: string | null;
  ratingMechanism: string | null;
  ratingOverall: string | null;
  hasOven: boolean;
  hasMillerHouse: boolean;
  epigraphyPresence: boolean;
  epoch: string | null;
  currentUse: string | null;
}

/**
 * Fetches a single published mill by slug
 * 
 * Security: Only returns constructions with status = 'published'
 * Returns null if mill doesn't exist or is not published (caller should handle 404)
 * 
 * @param slug - Mill slug identifier
 * @param locale - Language code ('pt' | 'en')
 * @returns Mill detail data or null if not found/not published
 */
export async function getMillBySlug(
  slug: string,
  locale: string
): Promise<MillDetail | null> {
  try {
    // Validate locale
    if (!locale || (locale !== 'pt' && locale !== 'en')) {
      return null;
    }

    // Query single mill by slug with all joins
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
        mainImage: constructions.mainImage,
        galleryImages: constructions.galleryImages,
        // PostGIS coordinate extraction
        lng: sql<number>`ST_X(${constructions.geom}::geometry)`,
        lat: sql<number>`ST_Y(${constructions.geom}::geometry)`,
        // Mills data fields
        typology: millsData.typology,
        access: millsData.access,
        legalProtection: millsData.legalProtection,
        propertyStatus: millsData.propertyStatus,
        planShape: millsData.planShape,
        constructionTechnique: millsData.constructionTechnique,
        roofShape: millsData.roofShape,
        roofMaterial: millsData.roofMaterial,
        waterCaptation: millsData.waterCaptation,
        rodizioQty: millsData.rodizioQty,
        windApparatus: millsData.windApparatus,
        millstonesPairs: millsData.millstonesPairs,
        ratingStructure: millsData.ratingStructure,
        ratingRoof: millsData.ratingRoof,
        ratingHydraulic: millsData.ratingHydraulic,
        ratingMechanism: millsData.ratingMechanism,
        ratingOverall: millsData.ratingOverall,
        hasOven: millsData.hasOven,
        hasMillerHouse: millsData.hasMillerHouse,
        epigraphyPresence: millsData.epigraphyPresence,
        epoch: millsData.epoch,
        currentUse: millsData.currentUse,
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
      .where(and(eq(constructions.slug, slug), eq(constructions.status, 'published')))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const row = results[0]!;

    // Transform result to MillDetail
    return {
      id: row.id,
      slug: row.slug,
      district: row.district,
      municipality: row.municipality,
      parish: row.parish,
      address: row.address,
      drainageBasin: row.drainageBasin,
      mainImage: row.mainImage,
      galleryImages: row.galleryImages,
      lat: Number(row.lat),
      lng: Number(row.lng),
      typology: row.typology,
      access: row.access,
      legalProtection: row.legalProtection,
      propertyStatus: row.propertyStatus,
      title: row.title,
      description: row.description,
      planShape: row.planShape,
      constructionTechnique: row.constructionTechnique,
      roofShape: row.roofShape,
      roofMaterial: row.roofMaterial,
      waterCaptation: row.waterCaptation,
      rodizioQty: row.rodizioQty,
      windApparatus: row.windApparatus,
      millstonesPairs: row.millstonesPairs,
      ratingStructure: row.ratingStructure,
      ratingRoof: row.ratingRoof,
      ratingHydraulic: row.ratingHydraulic,
      ratingMechanism: row.ratingMechanism,
      ratingOverall: row.ratingOverall,
      hasOven: row.hasOven,
      hasMillerHouse: row.hasMillerHouse,
      epigraphyPresence: row.epigraphyPresence,
      epoch: row.epoch,
      currentUse: row.currentUse,
    };
  } catch (error) {
    console.error('[getMillBySlug]:', error);
    return null;
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

/**
 * Water line list item with translated name
 */
export interface WaterLineListItem {
  id: string;
  slug: string;
  name: string;
}

/**
 * Fetches all water lines with their translated names
 * 
 * @param locale - Language code ('pt' | 'en')
 * @returns Standardized response with array of water lines (id, slug, translated name)
 */
export async function getWaterLinesList(
  locale: string
): Promise<
  | { success: true; data: WaterLineListItem[] }
  | { success: false; error: string }
> {
  try {
    // Validate locale
    if (!locale || (locale !== 'pt' && locale !== 'en')) {
      return { success: false, error: 'Invalid locale. Must be "pt" or "en"' };
    }

    // Query all water lines with their translations
    // Use inner join to only get water lines that have translations for the locale
    const results = await db
      .select({
        id: waterLines.id,
        slug: waterLines.slug,
        name: waterLineTranslations.name,
      })
      .from(waterLines)
      .innerJoin(
        waterLineTranslations,
        and(
          eq(waterLineTranslations.waterLineId, waterLines.id),
          eq(waterLineTranslations.locale, locale)
        )
      )
      .orderBy(waterLineTranslations.name);

    // Transform results
    const waterLinesList: WaterLineListItem[] = results.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
    }));

    return { success: true, data: waterLinesList };
  } catch (error) {
    console.error('[getWaterLinesList]:', error);
    return {
      success: false,
      error: 'An error occurred while fetching water lines',
    };
  }
}

/**
 * Map data response containing both mills and water lines
 */
export interface MapData {
  mills: PublishedMill[];
  waterLines: MapWaterLine[];
}

/**
 * Fetches all data needed for the map display
 * 
 * Returns both published mills (with custom icons and water line references) and all water lines.
 * Water lines are always shown regardless of filters (as per Phase 5.9.2.4 requirements).
 * 
 * @param locale - Language code ('pt' | 'en')
 * @param filters - Optional filters for mills (typology and district)
 * @returns Standardized response with mills and water lines
 */
export async function getMapData(
  locale: string,
  filters?: MillFilters
): Promise<
  | { success: true; data: MapData }
  | { success: false; error: string }
> {
  try {
    // Validate locale
    if (!locale || (locale !== 'pt' && locale !== 'en')) {
      return { success: false, error: 'Invalid locale. Must be "pt" or "en"' };
    }

    // Fetch mills with filters (reuse existing function)
    const millsResult = await getPublishedMills(locale, filters);
    if (!millsResult.success) {
      return millsResult;
    }

    // Fetch all water lines with translations
    const waterLinesResult = await getWaterLinesList(locale);
    if (!waterLinesResult.success) {
      return waterLinesResult;
    }

    // Fetch water line geometries and colors
    // Use ST_AsText to get the raw PostGIS text, then parse it manually
    // since Drizzle custom types may not always parse correctly in selects
    const waterLinesWithGeometry = await db
      .select({
        id: waterLines.id,
        slug: waterLines.slug,
        pathText: sql<string>`ST_AsText(${waterLines.path})`.as('path_text'),
        color: waterLines.color,
      })
      .from(waterLines);

    // Combine water line data with translations
    const mapWaterLines: MapWaterLine[] = waterLinesWithGeometry
      .map((wl) => {
        const translation = waterLinesResult.data.find((t) => t.id === wl.id);
        if (!translation) {
          return null; // Skip water lines without translations
        }

        // Parse PostGIS LINESTRING format: LINESTRING(lng1 lat1, lng2 lat2, ...)
        const match = wl.pathText.match(/LINESTRING\((.+)\)/);
        if (!match) {
          return null; // Skip invalid geometries
        }

        const coordsStr = match[1];
        const coordPairs = coordsStr.split(',').map(coord => coord.trim());
        
        // Parse coordinates and convert from [lng, lat] to [lat, lng] for Leaflet
        const leafletPath: [number, number][] = coordPairs.map(coord => {
          const [lng, lat] = coord.split(/\s+/).map(parseFloat);
          return [lat, lng] as [number, number];
        });

        if (leafletPath.length < 2) {
          return null; // Skip invalid paths
        }

        return {
          id: wl.id,
          slug: wl.slug,
          path: leafletPath, // Leaflet uses [lat, lng] format
          color: wl.color,
          name: translation.name,
        };
      })
      .filter((wl): wl is MapWaterLine => wl !== null);

    return {
      success: true,
      data: {
        mills: millsResult.data,
        waterLines: mapWaterLines,
      },
    };
  } catch (error) {
    console.error('[getMapData]:', error);
    return {
      success: false,
      error: 'An error occurred while fetching map data',
    };
  }
}

