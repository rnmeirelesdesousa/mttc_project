'use server';

import { db } from '@/lib/db';
import { constructions, millsData, constructionTranslations, waterLines, waterLineTranslations } from '@/db/schema';
import { eq, and, sql, inArray, or, ne } from 'drizzle-orm';

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
  legacyId: string | null;
  district: string | null;
  municipality: string | null;
  parish: string | null;
  address: string | null;
  place: string | null; // Phase 5.9.20.10: Lugar field
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
  // Phase 5.9.8: Water line color for dynamic SVG marker tinting
  waterLineColor: string | null;
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
  roofMaterial?: string[];
  roofShape?: string[];
  access?: string[];
  motiveApparatus?: string[];
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

    // Apply roof material filter (if provided)
    if (filters?.roofMaterial && filters.roofMaterial.length > 0) {
      whereConditions.push(inArray(millsData.roofMaterial, filters.roofMaterial));
    }

    // Apply roof shape filter (if provided)
    if (filters?.roofShape && filters.roofShape.length > 0) {
      whereConditions.push(inArray(millsData.roofShape, filters.roofShape));
    }

    // Apply access filter (if provided)
    if (filters?.access && filters.access.length > 0) {
      whereConditions.push(inArray(millsData.access, filters.access));
    }

    // Apply motive apparatus filter (if provided)
    if (filters?.motiveApparatus && filters.motiveApparatus.length > 0) {
      whereConditions.push(inArray(millsData.motiveApparatus, filters.motiveApparatus));
    }

    // Query published mills with joins and PostGIS coordinate extraction
    // Use try/catch for coordinate extraction to handle malformed geometries gracefully
    const results = await db
      .select({
        // Construction fields
        id: constructions.id,
        slug: constructions.slug,
        legacyId: constructions.legacyId,
        district: constructions.district,
        municipality: constructions.municipality,
        parish: constructions.parish,
        address: constructions.address,
        place: constructions.place, // Phase 5.9.20.10: Lugar field
        drainageBasin: constructions.drainageBasin,
        mainImage: constructions.mainImage,
        galleryImages: constructions.galleryImages,
        // PostGIS coordinate extraction: ST_X returns longitude, ST_Y returns latitude
        // Cast geography to geometry for ST_X/ST_Y functions
        // Wrap in COALESCE to handle null/errors gracefully
        lng: sql<number | null>`COALESCE(ST_X(${constructions.geom}::geometry), NULL)`,
        lat: sql<number | null>`COALESCE(ST_Y(${constructions.geom}::geometry), NULL)`,
        // Mills data fields
        typology: millsData.typology,
        access: millsData.access,
        legalProtection: millsData.legalProtection,
        propertyStatus: millsData.propertyStatus,
        // Phase 5.9.2: Custom icon and water line reference
        customIconUrl: constructions.customIconUrl,
        waterLineId: millsData.waterLineId,
        // Phase 5.9.8: Water line color for dynamic SVG marker tinting
        waterLineColor: waterLines.color,
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
      .leftJoin(
        waterLines,
        eq(waterLines.id, millsData.waterLineId)
      )
      .where(and(...whereConditions));

    // Transform results to ensure lat/lng are numbers
    // Filter out mills with invalid coordinates
    const mills: PublishedMill[] = results
      .map((row) => {
        const lat = row.lat !== null ? Number(row.lat) : null;
        const lng = row.lng !== null ? Number(row.lng) : null;
        
        // Skip mills with invalid coordinates
        if (lat === null || lng === null || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn('[getPublishedMills]: Skipping mill with invalid coordinates:', row.slug);
          return null;
        }
        
        return {
          id: row.id,
          slug: row.slug,
          legacyId: row.legacyId,
          district: row.district,
          municipality: row.municipality,
          parish: row.parish,
          address: row.address,
          drainageBasin: row.drainageBasin,
          mainImage: row.mainImage,
          galleryImages: row.galleryImages,
          lat,
          lng,
          typology: row.typology,
          access: row.access,
          legalProtection: row.legalProtection,
          propertyStatus: row.propertyStatus,
          customIconUrl: row.customIconUrl,
          waterLineId: row.waterLineId,
          waterLineColor: row.waterLineColor,
          title: row.title,
          description: row.description,
        };
      })
      .filter((mill): mill is PublishedMill => mill !== null);

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
  volumetry: string | null;
  constructionTechnique: string | null;
  exteriorFinish: string | null;
  roofShape: string | null;
  roofMaterial: string | null;
  // Physical Dimensions (Phase 5.9.3.10)
  length: number | null;
  width: number | null;
  height: number | null;
  // Motive Systems - Hydraulic
  captationType: string | null;
  conductionType: string | null;
  conductionState: string | null;
  admissionRodizio: string | null;
  admissionAzenha: string | null;
  wheelTypeRodizio: string | null;
  wheelTypeAzenha: string | null;
  rodizioQty: number | null;
  azenhaQty: number | null;
  // Motive Systems - Wind
  motiveApparatus: string | null;
  // Grinding Mechanism
  millstoneQuantity: number | null;
  millstoneDiameter: string | null;
  millstoneState: string | null;
  hasTremonha: boolean;
  hasQuelha: boolean;
  hasUrreiro: boolean;
  hasAliviadouro: boolean;
  hasFarinaleiro: boolean;
  // Epigraphy
  epigraphyPresence: boolean;
  epigraphyLocation: string | null;
  epigraphyType: string | null;
  epigraphyDescription: string | null;
  // Conservation Ratings
  ratingStructure: string | null;
  ratingRoof: string | null;
  ratingHydraulic: string | null;
  ratingMechanism: string | null;
  ratingOverall: string | null;
  // Annexes
  hasOven: boolean;
  hasMillerHouse: boolean;
  hasStable: boolean;
  hasFullingMill: boolean;
  // Characterization
  epoch: string | null;
  setting: string | null;
  currentUse: string | null;
  // Phase 5.9.2: Water line information
  waterLineName: string | null;
  waterLineSlug: string | null;
  // Phase 5.9.4: Stone material boolean flags
  stoneTypeGranite: boolean;
  stoneTypeSchist: boolean;
  stoneTypeOther: boolean;
  stoneMaterialDescription: string | null;
  // Phase 5.9.4: Gable roof material boolean flags
  gableMaterialLusa: boolean;
  gableMaterialMarselha: boolean;
  gableMaterialMeiaCana: boolean;
  // Phase 5.9.20: Conservation observations
  observationsStructure: string | null;
  observationsRoof: string | null;
  observationsHydraulic: string | null;
  observationsMechanism: string | null;
  observationsGeneral: string | null;
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
    // Use COALESCE and NULL handling for coordinate extraction to handle malformed geometries
    const results = await db
      .select({
        // Construction fields
        id: constructions.id,
        slug: constructions.slug,
        legacyId: constructions.legacyId,
        district: constructions.district,
        municipality: constructions.municipality,
        parish: constructions.parish,
        address: constructions.address,
        place: constructions.place, // Phase 5.9.20.10: Lugar field
        drainageBasin: constructions.drainageBasin,
        mainImage: constructions.mainImage,
        galleryImages: constructions.galleryImages,
        customIconUrl: constructions.customIconUrl,
        // PostGIS coordinate extraction with error handling
        lng: sql<number | null>`COALESCE(ST_X(${constructions.geom}::geometry), NULL)`,
        lat: sql<number | null>`COALESCE(ST_Y(${constructions.geom}::geometry), NULL)`,
        // Mills data fields - Characterization
        typology: millsData.typology,
        epoch: millsData.epoch,
        setting: millsData.setting,
        currentUse: millsData.currentUse,
        // Access & Legal
        access: millsData.access,
        legalProtection: millsData.legalProtection,
        propertyStatus: millsData.propertyStatus,
        // Architecture
        planShape: millsData.planShape,
        volumetry: millsData.volumetry,
        constructionTechnique: millsData.constructionTechnique,
        exteriorFinish: millsData.exteriorFinish,
        roofShape: millsData.roofShape,
        roofMaterial: millsData.roofMaterial,
        // Physical Dimensions (Phase 5.9.3.10)
        length: millsData.length,
        width: millsData.width,
        height: millsData.height,
        // Motive Systems - Hydraulic
        captationType: millsData.captationType,
        conductionType: millsData.conductionType,
        conductionState: millsData.conductionState,
        admissionRodizio: millsData.admissionRodizio,
        admissionAzenha: millsData.admissionAzenha,
        wheelTypeRodizio: millsData.wheelTypeRodizio,
        wheelTypeAzenha: millsData.wheelTypeAzenha,
        rodizioQty: millsData.rodizioQty,
        azenhaQty: millsData.azenhaQty,
        // Motive Systems - Wind
        motiveApparatus: millsData.motiveApparatus,
        // Grinding Mechanism
        millstoneQuantity: millsData.millstoneQuantity,
        millstoneDiameter: millsData.millstoneDiameter,
        millstoneState: millsData.millstoneState,
        hasTremonha: millsData.hasTremonha,
        hasQuelha: millsData.hasQuelha,
        hasUrreiro: millsData.hasUrreiro,
        hasAliviadouro: millsData.hasAliviadouro,
        hasFarinaleiro: millsData.hasFarinaleiro,
        // Epigraphy
        epigraphyPresence: millsData.epigraphyPresence,
        epigraphyLocation: millsData.epigraphyLocation,
        epigraphyType: millsData.epigraphyType,
        epigraphyDescription: millsData.epigraphyDescription,
        // Conservation Ratings
        ratingStructure: millsData.ratingStructure,
        ratingRoof: millsData.ratingRoof,
        ratingHydraulic: millsData.ratingHydraulic,
        ratingMechanism: millsData.ratingMechanism,
        ratingOverall: millsData.ratingOverall,
        // Annexes
        hasOven: millsData.hasOven,
        hasMillerHouse: millsData.hasMillerHouse,
        hasStable: millsData.hasStable,
        hasFullingMill: millsData.hasFullingMill,
        // Phase 5.9.2: Water line reference
        waterLineId: millsData.waterLineId,
        // Phase 5.9.4: Stone material boolean flags
        stoneTypeGranite: millsData.stoneTypeGranite,
        stoneTypeSchist: millsData.stoneTypeSchist,
        stoneTypeOther: millsData.stoneTypeOther,
        stoneMaterialDescription: millsData.stoneMaterialDescription,
        // Phase 5.9.4: Gable roof material boolean flags
        gableMaterialLusa: millsData.gableMaterialLusa,
        gableMaterialMarselha: millsData.gableMaterialMarselha,
        gableMaterialMeiaCana: millsData.gableMaterialMeiaCana,
        // Translation fields
        title: constructionTranslations.title,
        description: constructionTranslations.description,
        // Phase 5.9.20: Conservation observations
        observationsStructure: constructionTranslations.observationsStructure,
        observationsRoof: constructionTranslations.observationsRoof,
        observationsHydraulic: constructionTranslations.observationsHydraulic,
        observationsMechanism: constructionTranslations.observationsMechanism,
        observationsGeneral: constructionTranslations.observationsGeneral,
        // Phase 5.9.3: Water line translation (for connected levada)
        waterLineName: waterLineTranslations.name,
        waterLineSlug: waterLines.slug,
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
      .leftJoin(
        waterLines,
        eq(waterLines.id, millsData.waterLineId)
      )
      .leftJoin(
        waterLineTranslations,
        and(
          eq(waterLineTranslations.waterLineId, waterLines.id),
          eq(waterLineTranslations.locale, locale)
        )
      )
      .where(and(eq(constructions.slug, slug), eq(constructions.status, 'published')))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const row = results[0]!;

    // Validate and extract coordinates with error handling
    const lat = row.lat !== null ? Number(row.lat) : null;
    const lng = row.lng !== null ? Number(row.lng) : null;
    
    // Return null if coordinates are invalid
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error('[getMillBySlug]: Invalid coordinates for slug:', slug);
      return null;
    }

    // Transform result to MillDetail
    return {
      id: row.id,
      slug: row.slug,
      legacyId: row.legacyId,
      district: row.district,
      municipality: row.municipality,
      parish: row.parish,
      address: row.address,
      place: row.place, // Phase 5.9.20.10: Lugar field
      drainageBasin: row.drainageBasin,
      mainImage: row.mainImage,
      galleryImages: row.galleryImages,
      lat,
      lng,
      typology: row.typology,
      access: row.access,
      legalProtection: row.legalProtection,
      propertyStatus: row.propertyStatus,
      customIconUrl: row.customIconUrl,
      waterLineId: row.waterLineId,
      waterLineColor: row.waterLineColor,
      title: row.title,
      description: row.description,
      // Architecture
      planShape: row.planShape,
      volumetry: row.volumetry,
      constructionTechnique: row.constructionTechnique,
      exteriorFinish: row.exteriorFinish,
      roofShape: row.roofShape,
      roofMaterial: row.roofMaterial,
      // Physical Dimensions (Phase 5.9.3.10)
      length: row.length,
      width: row.width,
      height: row.height,
      // Motive Systems - Hydraulic
      captationType: row.captationType,
      conductionType: row.conductionType,
      conductionState: row.conductionState,
      admissionRodizio: row.admissionRodizio,
      admissionAzenha: row.admissionAzenha,
      wheelTypeRodizio: row.wheelTypeRodizio,
      wheelTypeAzenha: row.wheelTypeAzenha,
      rodizioQty: row.rodizioQty,
      azenhaQty: row.azenhaQty,
      // Motive Systems - Wind
      motiveApparatus: row.motiveApparatus,
      // Grinding Mechanism
      millstoneQuantity: row.millstoneQuantity,
      millstoneDiameter: row.millstoneDiameter,
      millstoneState: row.millstoneState,
      hasTremonha: row.hasTremonha,
      hasQuelha: row.hasQuelha,
      hasUrreiro: row.hasUrreiro,
      hasAliviadouro: row.hasAliviadouro,
      hasFarinaleiro: row.hasFarinaleiro,
      // Epigraphy
      epigraphyPresence: row.epigraphyPresence,
      epigraphyLocation: row.epigraphyLocation,
      epigraphyType: row.epigraphyType,
      epigraphyDescription: row.epigraphyDescription,
      // Conservation Ratings
      ratingStructure: row.ratingStructure,
      ratingRoof: row.ratingRoof,
      ratingHydraulic: row.ratingHydraulic,
      ratingMechanism: row.ratingMechanism,
      ratingOverall: row.ratingOverall,
      // Annexes
      hasOven: row.hasOven,
      hasMillerHouse: row.hasMillerHouse,
      hasStable: row.hasStable,
      hasFullingMill: row.hasFullingMill,
      // Characterization
      epoch: row.epoch,
      setting: row.setting,
      currentUse: row.currentUse,
      // Phase 5.9.3: Water line information
      waterLineName: row.waterLineName,
      waterLineSlug: row.waterLineSlug,
      // Phase 5.9.4: Stone material boolean flags
      stoneTypeGranite: row.stoneTypeGranite,
      stoneTypeSchist: row.stoneTypeSchist,
      stoneTypeOther: row.stoneTypeOther,
      stoneMaterialDescription: row.stoneMaterialDescription,
      // Phase 5.9.4: Gable roof material boolean flags
      gableMaterialLusa: row.gableMaterialLusa,
      gableMaterialMarselha: row.gableMaterialMarselha,
      gableMaterialMeiaCana: row.gableMaterialMeiaCana,
      // Phase 5.9.20: Conservation observations
      observationsStructure: row.observationsStructure,
      observationsRoof: row.observationsRoof,
      observationsHydraulic: row.observationsHydraulic,
      observationsMechanism: row.observationsMechanism,
      observationsGeneral: row.observationsGeneral,
    };
  } catch (error) {
    console.error('[getMillBySlug]:', error);
    return null;
  }
}

/**
 * Fetches a single published mill by ID
 * 
 * Security: Only returns constructions with status = 'published'
 * Returns null if mill doesn't exist or is not published (caller should handle 404)
 * 
 * @param id - Mill UUID identifier
 * @param locale - Language code ('pt' | 'en')
 * @returns Mill detail data or null if not found/not published
 */
export async function getMillById(
  id: string,
  locale: string
): Promise<MillDetail | null> {
  try {
    // Validate locale
    if (!locale || (locale !== 'pt' && locale !== 'en')) {
      return null;
    }

    // Query single mill by ID with all joins
    // Use COALESCE and NULL handling for coordinate extraction to handle malformed geometries
    const results = await db
      .select({
        // Construction fields
        id: constructions.id,
        slug: constructions.slug,
        legacyId: constructions.legacyId,
        district: constructions.district,
        municipality: constructions.municipality,
        parish: constructions.parish,
        address: constructions.address,
        place: constructions.place, // Phase 5.9.20.10: Lugar field
        drainageBasin: constructions.drainageBasin,
        mainImage: constructions.mainImage,
        galleryImages: constructions.galleryImages,
        customIconUrl: constructions.customIconUrl,
        // PostGIS coordinate extraction with error handling
        lng: sql<number | null>`COALESCE(ST_X(${constructions.geom}::geometry), NULL)`,
        lat: sql<number | null>`COALESCE(ST_Y(${constructions.geom}::geometry), NULL)`,
        // Mills data fields - Characterization
        typology: millsData.typology,
        epoch: millsData.epoch,
        setting: millsData.setting,
        currentUse: millsData.currentUse,
        // Access & Legal
        access: millsData.access,
        legalProtection: millsData.legalProtection,
        propertyStatus: millsData.propertyStatus,
        // Architecture
        planShape: millsData.planShape,
        volumetry: millsData.volumetry,
        constructionTechnique: millsData.constructionTechnique,
        exteriorFinish: millsData.exteriorFinish,
        roofShape: millsData.roofShape,
        roofMaterial: millsData.roofMaterial,
        // Physical Dimensions (Phase 5.9.3.10)
        length: millsData.length,
        width: millsData.width,
        height: millsData.height,
        // Motive Systems - Hydraulic
        captationType: millsData.captationType,
        conductionType: millsData.conductionType,
        conductionState: millsData.conductionState,
        admissionRodizio: millsData.admissionRodizio,
        admissionAzenha: millsData.admissionAzenha,
        wheelTypeRodizio: millsData.wheelTypeRodizio,
        wheelTypeAzenha: millsData.wheelTypeAzenha,
        rodizioQty: millsData.rodizioQty,
        azenhaQty: millsData.azenhaQty,
        // Motive Systems - Wind
        motiveApparatus: millsData.motiveApparatus,
        // Grinding Mechanism
        millstoneQuantity: millsData.millstoneQuantity,
        millstoneDiameter: millsData.millstoneDiameter,
        millstoneState: millsData.millstoneState,
        hasTremonha: millsData.hasTremonha,
        hasQuelha: millsData.hasQuelha,
        hasUrreiro: millsData.hasUrreiro,
        hasAliviadouro: millsData.hasAliviadouro,
        hasFarinaleiro: millsData.hasFarinaleiro,
        // Epigraphy
        epigraphyPresence: millsData.epigraphyPresence,
        epigraphyLocation: millsData.epigraphyLocation,
        epigraphyType: millsData.epigraphyType,
        epigraphyDescription: millsData.epigraphyDescription,
        // Conservation Ratings
        ratingStructure: millsData.ratingStructure,
        ratingRoof: millsData.ratingRoof,
        ratingHydraulic: millsData.ratingHydraulic,
        ratingMechanism: millsData.ratingMechanism,
        ratingOverall: millsData.ratingOverall,
        // Annexes
        hasOven: millsData.hasOven,
        hasMillerHouse: millsData.hasMillerHouse,
        hasStable: millsData.hasStable,
        hasFullingMill: millsData.hasFullingMill,
        // Phase 5.9.2: Water line reference
        waterLineId: millsData.waterLineId,
        // Phase 5.9.4: Stone material boolean flags
        stoneTypeGranite: millsData.stoneTypeGranite,
        stoneTypeSchist: millsData.stoneTypeSchist,
        stoneTypeOther: millsData.stoneTypeOther,
        stoneMaterialDescription: millsData.stoneMaterialDescription,
        // Phase 5.9.4: Gable roof material boolean flags
        gableMaterialLusa: millsData.gableMaterialLusa,
        gableMaterialMarselha: millsData.gableMaterialMarselha,
        gableMaterialMeiaCana: millsData.gableMaterialMeiaCana,
        // Translation fields
        title: constructionTranslations.title,
        description: constructionTranslations.description,
        // Phase 5.9.20: Conservation observations
        observationsStructure: constructionTranslations.observationsStructure,
        observationsRoof: constructionTranslations.observationsRoof,
        observationsHydraulic: constructionTranslations.observationsHydraulic,
        observationsMechanism: constructionTranslations.observationsMechanism,
        observationsGeneral: constructionTranslations.observationsGeneral,
        // Phase 5.9.3: Water line translation (for connected levada)
        waterLineName: waterLineTranslations.name,
        waterLineSlug: waterLines.slug,
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
      .leftJoin(
        waterLines,
        eq(waterLines.id, millsData.waterLineId)
      )
      .leftJoin(
        waterLineTranslations,
        and(
          eq(waterLineTranslations.waterLineId, waterLines.id),
          eq(waterLineTranslations.locale, locale)
        )
      )
      .where(and(eq(constructions.id, id), eq(constructions.status, 'published')))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    const row = results[0]!;

    // Validate and extract coordinates with error handling
    const lat = row.lat !== null ? Number(row.lat) : null;
    const lng = row.lng !== null ? Number(row.lng) : null;
    
    // Return null if coordinates are invalid
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error('[getMillById]: Invalid coordinates for id:', id);
      return null;
    }

    // Transform result to MillDetail
    return {
      id: row.id,
      slug: row.slug,
      legacyId: row.legacyId,
      district: row.district,
      municipality: row.municipality,
      parish: row.parish,
      address: row.address,
      place: row.place, // Phase 5.9.20.10: Lugar field
      drainageBasin: row.drainageBasin,
      mainImage: row.mainImage,
      galleryImages: row.galleryImages,
      lat,
      lng,
      typology: row.typology,
      access: row.access,
      legalProtection: row.legalProtection,
      propertyStatus: row.propertyStatus,
      customIconUrl: row.customIconUrl,
      waterLineId: row.waterLineId,
      waterLineColor: row.waterLineColor,
      title: row.title,
      description: row.description,
      // Architecture
      planShape: row.planShape,
      volumetry: row.volumetry,
      constructionTechnique: row.constructionTechnique,
      exteriorFinish: row.exteriorFinish,
      roofShape: row.roofShape,
      roofMaterial: row.roofMaterial,
      // Physical Dimensions (Phase 5.9.3.10)
      length: row.length,
      width: row.width,
      height: row.height,
      // Motive Systems - Hydraulic
      captationType: row.captationType,
      conductionType: row.conductionType,
      conductionState: row.conductionState,
      admissionRodizio: row.admissionRodizio,
      admissionAzenha: row.admissionAzenha,
      wheelTypeRodizio: row.wheelTypeRodizio,
      wheelTypeAzenha: row.wheelTypeAzenha,
      rodizioQty: row.rodizioQty,
      azenhaQty: row.azenhaQty,
      // Motive Systems - Wind
      motiveApparatus: row.motiveApparatus,
      // Grinding Mechanism
      millstoneQuantity: row.millstoneQuantity,
      millstoneDiameter: row.millstoneDiameter,
      millstoneState: row.millstoneState,
      hasTremonha: row.hasTremonha,
      hasQuelha: row.hasQuelha,
      hasUrreiro: row.hasUrreiro,
      hasAliviadouro: row.hasAliviadouro,
      hasFarinaleiro: row.hasFarinaleiro,
      // Epigraphy
      epigraphyPresence: row.epigraphyPresence,
      epigraphyLocation: row.epigraphyLocation,
      epigraphyType: row.epigraphyType,
      epigraphyDescription: row.epigraphyDescription,
      // Conservation Ratings
      ratingStructure: row.ratingStructure,
      ratingRoof: row.ratingRoof,
      ratingHydraulic: row.ratingHydraulic,
      ratingMechanism: row.ratingMechanism,
      ratingOverall: row.ratingOverall,
      // Annexes
      hasOven: row.hasOven,
      hasMillerHouse: row.hasMillerHouse,
      hasStable: row.hasStable,
      hasFullingMill: row.hasFullingMill,
      // Characterization
      epoch: row.epoch,
      setting: row.setting,
      currentUse: row.currentUse,
      // Phase 5.9.3: Water line information
      waterLineName: row.waterLineName,
      waterLineSlug: row.waterLineSlug,
      // Phase 5.9.4: Stone material boolean flags
      stoneTypeGranite: row.stoneTypeGranite,
      stoneTypeSchist: row.stoneTypeSchist,
      stoneTypeOther: row.stoneTypeOther,
      stoneMaterialDescription: row.stoneMaterialDescription,
      // Phase 5.9.4: Gable roof material boolean flags
      gableMaterialLusa: row.gableMaterialLusa,
      gableMaterialMarselha: row.gableMaterialMarselha,
      gableMaterialMeiaCana: row.gableMaterialMeiaCana,
      // Phase 5.9.20: Conservation observations
      observationsStructure: row.observationsStructure,
      observationsRoof: row.observationsRoof,
      observationsHydraulic: row.observationsHydraulic,
      observationsMechanism: row.observationsMechanism,
      observationsGeneral: row.observationsGeneral,
    };
  } catch (error) {
    console.error('[getMillById]:', error);
    return null;
  }
}

/**
 * Fetches all published mills connected to the same water line as the given mill
 * 
 * Security: Only returns published mills
 * 
 * @param millId - UUID of the mill to find connected mills for
 * @param locale - Language code ('pt' | 'en')
 * @returns Array of connected mills (excluding the mill itself) or empty array
 */
export async function getConnectedMills(
  millId: string,
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

    // First, get the waterLineId for the given mill
    const millResult = await db
      .select({
        waterLineId: millsData.waterLineId,
      })
      .from(constructions)
      .innerJoin(millsData, eq(millsData.constructionId, constructions.id))
      .where(and(eq(constructions.id, millId), eq(constructions.status, 'published')))
      .limit(1);

    if (millResult.length === 0 || !millResult[0]!.waterLineId) {
      // Mill not found or has no water line connection
      return { success: true, data: [] };
    }

    const waterLineId = millResult[0]!.waterLineId;

    // Fetch all published mills connected to the same water line (excluding the mill itself)
    const results = await db
      .select({
        // Construction fields
        id: constructions.id,
        slug: constructions.slug,
        legacyId: constructions.legacyId,
        district: constructions.district,
        municipality: constructions.municipality,
        parish: constructions.parish,
        address: constructions.address,
        place: constructions.place, // Phase 5.9.20.10: Lugar field
        drainageBasin: constructions.drainageBasin,
        mainImage: constructions.mainImage,
        galleryImages: constructions.galleryImages,
        // PostGIS coordinate extraction
        lng: sql<number | null>`COALESCE(ST_X(${constructions.geom}::geometry), NULL)`,
        lat: sql<number | null>`COALESCE(ST_Y(${constructions.geom}::geometry), NULL)`,
        // Mills data fields
        typology: millsData.typology,
        access: millsData.access,
        legalProtection: millsData.legalProtection,
        propertyStatus: millsData.propertyStatus,
        // Phase 5.9.2: Custom icon and water line reference
        customIconUrl: constructions.customIconUrl,
        waterLineId: millsData.waterLineId,
        // Phase 5.9.8: Water line color for dynamic SVG marker tinting
        waterLineColor: waterLines.color,
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
      .leftJoin(
        waterLines,
        eq(waterLines.id, millsData.waterLineId)
      )
      .where(
        and(
          eq(constructions.status, 'published'),
          eq(millsData.waterLineId, waterLineId),
          ne(constructions.id, millId) // Exclude the mill itself
        )
      );

    // Transform results to ensure lat/lng are numbers
    // Filter out mills with invalid coordinates
    const connectedMills: PublishedMill[] = results
      .map((row) => {
        const lat = row.lat !== null ? Number(row.lat) : null;
        const lng = row.lng !== null ? Number(row.lng) : null;
        
        // Skip mills with invalid coordinates
        if (lat === null || lng === null || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn('[getConnectedMills]: Skipping mill with invalid coordinates:', row.slug);
          return null;
        }
        
        return {
          id: row.id,
          slug: row.slug,
          legacyId: row.legacyId,
          district: row.district,
          municipality: row.municipality,
          parish: row.parish,
          address: row.address,
          drainageBasin: row.drainageBasin,
          mainImage: row.mainImage,
          galleryImages: row.galleryImages,
          lat,
          lng,
          typology: row.typology,
          access: row.access,
          legalProtection: row.legalProtection,
          propertyStatus: row.propertyStatus,
          customIconUrl: row.customIconUrl,
          waterLineId: row.waterLineId,
          title: row.title,
          description: row.description,
        };
      })
      .filter((mill): mill is PublishedMill => mill !== null);

    return { success: true, data: connectedMills };
  } catch (error) {
    console.error('[getConnectedMills]:', error);
    return {
      success: false,
      error: 'An error occurred while fetching connected mills',
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
  locale: string,
  options?: {
    /**
     * Phase 5.9.7.2: Filter for published constructions only
     * When true, only returns water lines where constructions.status === 'published'
     * This is used in Mill/Poça entry forms to ensure only published levadas can be selected
     */
    publishedOnly?: boolean;
  }
): Promise<
  | { success: true; data: WaterLineListItem[] }
  | { success: false; error: string }
> {
  try {
    // Validate locale
    if (!locale || (locale !== 'pt' && locale !== 'en')) {
      return { success: false, error: 'Invalid locale. Must be "pt" or "en"' };
    }

    // Build where conditions
    const whereConditions = [eq(constructions.typeCategory, 'water_line')];
    
    // Phase 5.9.7.2: Filter for published constructions when requested
    if (options?.publishedOnly) {
      whereConditions.push(eq(constructions.status, 'published'));
    }

    // Query water lines with their translations
    // Use INNER JOIN with constructions to ensure valid parent-child relationship
    // Use inner join to only get water lines that have translations for the locale
    const results = await db
      .select({
        id: waterLines.id,
        slug: constructions.slug, // Use construction slug
        name: waterLineTranslations.name,
      })
      .from(constructions)
      .innerJoin(
        waterLines,
        eq(waterLines.constructionId, constructions.id)
      )
      .innerJoin(
        waterLineTranslations,
        and(
          eq(waterLineTranslations.waterLineId, waterLines.id),
          eq(waterLineTranslations.locale, locale)
        )
      )
      .where(and(...whereConditions))
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
 * Water line detail with translation and connected mills
 */
export interface WaterLineDetail {
  id: string;
  slug: string;
  color: string;
  path: [number, number][]; // Array of [lat, lng] coordinate pairs (Leaflet format)
  name: string; // Translated name
  description: string | null; // Translated description
  connectedMills: PublishedMill[]; // Array of published mills linked to this water line
}

/**
 * Map data response containing both mills and water lines
 */
export interface MapData {
  mills: PublishedMill[];
  waterLines: MapWaterLine[];
}

/**
 * Fetches a single water line (Levada) by slug with its translation and connected mills
 * 
 * Security: Only returns published mills connected to the water line
 * 
 * @param slug - Water line slug identifier
 * @param locale - Language code ('pt' | 'en')
 * @returns Water line detail data or null if not found
 */
export async function getWaterLineBySlug(
  slug: string,
  locale: string
): Promise<WaterLineDetail | null> {
  try {
    // Validate locale
    if (!locale || (locale !== 'pt' && locale !== 'en')) {
      return null;
    }

    // Query water line by slug with translation
    // Use INNER JOIN with constructions to ensure valid parent-child relationship
    const waterLineResults = await db
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
          eq(constructions.slug, slug),
          eq(constructions.typeCategory, 'water_line')
        )
      )
      .limit(1);

    if (waterLineResults.length === 0) {
      return null;
    }

    const waterLineRow = waterLineResults[0]!;

    // Parse PostGIS LINESTRING format: LINESTRING(lng1 lat1, lng2 lat2, ...)
    const match = waterLineRow.pathText.match(/LINESTRING\((.+)\)/);
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

    // Fetch all published mills connected to this water line
    const millsResults = await db
      .select({
        // Construction fields
        id: constructions.id,
        slug: constructions.slug,
        legacyId: constructions.legacyId,
        district: constructions.district,
        municipality: constructions.municipality,
        parish: constructions.parish,
        address: constructions.address,
        place: constructions.place, // Phase 5.9.20.10: Lugar field
        drainageBasin: constructions.drainageBasin,
        mainImage: constructions.mainImage,
        galleryImages: constructions.galleryImages,
        // PostGIS coordinate extraction
        lng: sql<number | null>`COALESCE(ST_X(${constructions.geom}::geometry), NULL)`,
        lat: sql<number | null>`COALESCE(ST_Y(${constructions.geom}::geometry), NULL)`,
        // Mills data fields
        typology: millsData.typology,
        access: millsData.access,
        legalProtection: millsData.legalProtection,
        propertyStatus: millsData.propertyStatus,
        // Phase 5.9.2: Custom icon and water line reference
        customIconUrl: constructions.customIconUrl,
        waterLineId: millsData.waterLineId,
        // Phase 5.9.8: Water line color for dynamic SVG marker tinting
        waterLineColor: waterLines.color,
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
      .leftJoin(
        waterLines,
        eq(waterLines.id, millsData.waterLineId)
      )
      .where(
        and(
          eq(constructions.status, 'published'),
          eq(millsData.waterLineId, waterLineRow.id)
        )
      );

    // Transform mills results
    const connectedMills: PublishedMill[] = millsResults
      .map((row) => {
        const lat = row.lat !== null ? Number(row.lat) : null;
        const lng = row.lng !== null ? Number(row.lng) : null;
        
        // Skip mills with invalid coordinates
        if (lat === null || lng === null || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          console.warn('[getWaterLineBySlug]: Skipping mill with invalid coordinates:', row.slug);
          return null;
        }
        
        return {
          id: row.id,
          slug: row.slug,
          legacyId: row.legacyId,
          district: row.district,
          municipality: row.municipality,
          parish: row.parish,
          address: row.address,
          drainageBasin: row.drainageBasin,
          mainImage: row.mainImage,
          galleryImages: row.galleryImages,
          lat,
          lng,
          typology: row.typology,
          access: row.access,
          legalProtection: row.legalProtection,
          propertyStatus: row.propertyStatus,
          customIconUrl: row.customIconUrl,
          waterLineId: row.waterLineId,
          title: row.title,
          description: row.description,
        };
      })
      .filter((mill): mill is PublishedMill => mill !== null);

    return {
      id: waterLineRow.id,
      slug: waterLineRow.slug,
      color: waterLineRow.color,
      path: leafletPath,
      name: waterLineRow.name || waterLineRow.slug, // Fallback to slug if name is null
      description: waterLineRow.description,
      connectedMills,
    };
  } catch (error) {
    console.error('[getWaterLineBySlug]:', error);
    return null;
  }
}

/**
 * Fetches all data needed for the map display
 * 
 * Returns both published mills (with custom icons and water line references) and all water lines.
 * Water lines are always shown regardless of filters (as per Phase 5.9.2.4 requirements).
 * 
 * Strategy: Properly awaits getPublishedMills and getWaterLinesList separately, then merges
 * their results into a clean GeoJSON/Feature structure.
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
    // This properly handles all mill filtering logic internally
    const millsResult = await getPublishedMills(locale, filters);
    if (!millsResult.success) {
      return millsResult;
    }

    // Fetch all water lines with translations (separate call)
    // This fetches the list of water lines with their translated names
    const waterLinesResult = await getWaterLinesList(locale);
    if (!waterLinesResult.success) {
      return waterLinesResult;
    }

    // Fetch water line geometries and colors separately
    // Use INNER JOIN with constructions to ensure valid parent-child relationship
    // Use ST_AsText to get the raw PostGIS text, then parse it manually
    // since Drizzle custom types may not always parse correctly in selects
    // Only show published water lines on the public map
    const waterLinesWithGeometry = await db
      .select({
        id: waterLines.id,
        slug: constructions.slug, // Use construction slug
        pathText: sql<string>`ST_AsText(${waterLines.path})`.as('path_text'),
        color: waterLines.color,
      })
      .from(constructions)
      .innerJoin(
        waterLines,
        eq(waterLines.constructionId, constructions.id)
      )
      .where(
        and(
          eq(constructions.typeCategory, 'water_line'),
          eq(constructions.status, 'published')
        )
      );

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

/**
 * Searchable mill data for global search functionality
 */
export interface SearchableMill {
  id: string;
  title: string | null; // Title from current locale (fallback)
  titleLangCode: string | null; // Language code of the title (for display)
  slug: string;
  district: string | null;
  municipality: string | null;
  parish: string | null;
  address: string | null;
  typology: string;
  roofMaterial: string | null;
  motiveApparatus: string | null;
  // All translations for cross-language search
  translations: Array<{
    langCode: string;
    title: string;
    description: string | null;
  }>;
  lat: number;
  lng: number;
}

/**
 * Fetches all published mills with searchable fields for global search
 * 
 * Cross-language search: Fetches all translations for each construction to enable
 * searching across all languages. Returns titles from all languages.
 * 
 * Searchable fields:
 * - Names (title) - all languages
 * - Descriptions - all languages
 * - Location data (district, municipality, parish, address)
 * - Construction data (typology, roofMaterial, motiveApparatus)
 * 
 * @param locale - Language code ('pt' | 'en') - used as fallback for title display
 * @returns Standardized response with array of searchable mills
 */
export async function getSearchableMills(
  locale: string
): Promise<
  | { success: true; data: SearchableMill[] }
  | { success: false; error: string }
> {
  try {
    // Validate locale
    if (!locale || (locale !== 'pt' && locale !== 'en')) {
      return { success: false, error: 'Invalid locale. Must be "pt" or "en"' };
    }

    // Query published mills with all searchable fields and ALL translations
    const results = await db
      .select({
        id: constructions.id,
        slug: constructions.slug,
        district: constructions.district,
        municipality: constructions.municipality,
        parish: constructions.parish,
        address: constructions.address,
        typology: millsData.typology,
        roofMaterial: millsData.roofMaterial,
        motiveApparatus: millsData.motiveApparatus,
        lng: sql<number | null>`COALESCE(ST_X(${constructions.geom}::geometry), NULL)`,
        lat: sql<number | null>`COALESCE(ST_Y(${constructions.geom}::geometry), NULL)`,
        // Translation fields (will be joined separately for all languages)
        translationLangCode: constructionTranslations.langCode,
        translationTitle: constructionTranslations.title,
        translationDescription: constructionTranslations.description,
      })
      .from(constructions)
      .innerJoin(millsData, eq(millsData.constructionId, constructions.id))
      .leftJoin(
        constructionTranslations,
        eq(constructionTranslations.constructionId, constructions.id)
        // Note: No langCode filter - we want ALL translations
      )
      .where(eq(constructions.status, 'published'));

    // Group results by construction ID and collect all translations
    const millsMap = new Map<string, {
      id: string;
      slug: string;
      district: string | null;
      municipality: string | null;
      parish: string | null;
      address: string | null;
      typology: string;
      roofMaterial: string | null;
      motiveApparatus: string | null;
      lat: number | null;
      lng: number | null;
      translations: Array<{
        langCode: string;
        title: string;
        description: string | null;
      }>;
    }>();

    for (const row of results) {
      const lat = row.lat !== null ? Number(row.lat) : null;
      const lng = row.lng !== null ? Number(row.lng) : null;
      
      // Skip mills with invalid coordinates
      if (lat === null || lng === null || isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        continue;
      }

      if (!millsMap.has(row.id)) {
        millsMap.set(row.id, {
          id: row.id,
          slug: row.slug,
          district: row.district,
          municipality: row.municipality,
          parish: row.parish,
          address: row.address,
          typology: row.typology,
          roofMaterial: row.roofMaterial,
          motiveApparatus: row.motiveApparatus,
          lat,
          lng,
          translations: [],
        });
      }

      const mill = millsMap.get(row.id)!;
      
      // Add translation if it exists and hasn't been added yet
      if (row.translationLangCode && row.translationTitle) {
        const existingTranslation = mill.translations.find(
          (t) => t.langCode === row.translationLangCode
        );
        if (!existingTranslation) {
          mill.translations.push({
            langCode: row.translationLangCode,
            title: row.translationTitle,
            description: row.translationDescription,
          });
        }
      }
    }

    // Transform to SearchableMill format
    const mills: SearchableMill[] = Array.from(millsMap.values())
      .map((mill) => {
        // Find title from current locale (fallback), or first available
        const currentLocaleTranslation = mill.translations.find(
          (t) => t.langCode === locale
        );
        const fallbackTranslation = mill.translations[0] || null;

        return {
          id: mill.id,
          slug: mill.slug,
          title: currentLocaleTranslation?.title || fallbackTranslation?.title || null,
          titleLangCode: currentLocaleTranslation?.langCode || fallbackTranslation?.langCode || null,
          district: mill.district,
          municipality: mill.municipality,
          parish: mill.parish,
          address: mill.address,
          typology: mill.typology,
          roofMaterial: mill.roofMaterial,
          motiveApparatus: mill.motiveApparatus,
          translations: mill.translations,
          lat: mill.lat!,
          lng: mill.lng!,
        };
      });

    return { success: true, data: mills };
  } catch (error) {
    console.error('[getSearchableMills]:', error);
    return {
      success: false,
      error: 'An error occurred while fetching searchable mills',
    };
  }
}

