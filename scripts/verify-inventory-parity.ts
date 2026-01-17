// scripts/verify-inventory-parity.ts
/**
 * Direct Database Enum Validation Script
 * 
 * Purpose: Identify all enum mismatches between Drizzle schema and Supabase database
 * by testing direct database inserts with diverse scientific field combinations.
 * 
 * This script bypasses Server Actions (which require cookies) and directly tests
 * database inserts to isolate enum validation issues.
 * 
 * Test Cases:
 * - Test Case A: Hydraulic mill (rodizio) with quadrangular plan and weir captation
 * - Test Case B: Wind mill (torre_fixa) with sails apparatus and thatch roof
 * - Test Case C: Conservation ratings with extreme values (very_bad_ruin)
 * 
 * Usage: npx tsx scripts/verify-inventory-parity.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  constructions,
  millsData,
  constructionTranslations,
} from '../src/db/schema';
import { generateSlug } from '../src/lib/slug';
import { eq } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a standalone connection for the script
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

// Hardcoded admin UUID for createdBy foreign key
const ADMIN_USER_ID = '79ba2960-6c22-4cb7-b6ce-65fe4a83f661';

// Type guard to check if error is a PostgresError
function isPostgresError(error: unknown): error is { 
  code?: string; 
  detail?: string; 
  message?: string;
  column?: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'detail' in error)
  );
}

// Extract enum value from error detail
// Pattern: "invalid input value for enum <enum_name>: \"<value>\""
function extractEnumValueFromError(detail: string | undefined): { enumName: string; value: string } | null {
  if (!detail) return null;
  
  // Pattern: "invalid input value for enum <enum_name>: \"<value>\""
  const enumMatch = detail.match(/invalid input value for enum\s+(\w+):\s*"([^"]+)"/i);
  if (enumMatch) {
    return {
      enumName: enumMatch[1] || 'Unknown',
      value: enumMatch[2] || 'Unknown',
    };
  }
  
  // Alternative pattern: "invalid input value for enum <enum_name>"
  const simpleMatch = detail.match(/invalid input value for enum\s+(\w+)/i);
  if (simpleMatch) {
    return {
      enumName: simpleMatch[1] || 'Unknown',
      value: 'Unknown',
    };
  }
  
  return null;
}

// Generate unique slug with timestamp to avoid conflicts
function generateTestSlug(title: string): string {
  const baseSlug = generateSlug(title);
  const timestamp = Date.now();
  return `${baseSlug}-${timestamp}`;
}

async function runTest(
  testName: string,
  testData: {
    title: string;
    locale: 'pt' | 'en';
    latitude: number;
    longitude: number;
    district?: string;
    municipality?: string;
    parish?: string;
    address?: string;
    drainageBasin?: string;
    // Characterization
    typology: 'azenha' | 'rodizio' | 'mare' | 'torre_fixa' | 'giratorio' | 'velas' | 'armacao';
    epoch?: '18th_c' | '19th_c' | '20th_c' | 'pre_18th_c';
    setting?: 'rural' | 'urban' | 'isolated' | 'riverbank';
    currentUse?: 'milling' | 'housing' | 'tourism' | 'ruin' | 'museum';
    // Access & Legal
    access?: 'pedestrian' | 'car' | 'difficult_none';
    legalProtection?: 'inexistent' | 'under_study' | 'classified';
    propertyStatus?: 'private' | 'public' | 'unknown';
    // Architecture
    planShape?: 'circular' | 'rectangular' | 'square' | 'polygonal' | 'irregular' | 'circular_tower' | 'quadrangular';
    volumetry?: 'cylindrical' | 'conical' | 'prismatic_sq_rec';
    constructionTechnique?: 'dry_stone' | 'mortared_stone' | 'mixed_other';
    exteriorFinish?: 'exposed' | 'plastered' | 'whitewashed';
    roofShape?: 'conical' | 'gable' | 'lean_to' | 'inexistent';
    roofMaterial?: 'tile' | 'zinc' | 'thatch' | 'slate';
    // Motive Systems - Hydraulic
    captationType?: 'weir' | 'pool' | 'direct';
    conductionType?: 'levada' | 'modern_pipe';
    conductionState?: 'operational_clean' | 'clogged' | 'damaged_broken';
    admissionRodizio?: 'cubo' | 'calha';
    admissionAzenha?: 'calha_superior' | 'canal_inferior';
    wheelTypeRodizio?: 'penas' | 'colheres';
    wheelTypeAzenha?: 'copeira' | 'dezio_palas';
    rodizioQty?: number;
    azenhaQty?: number;
    // Motive Systems - Wind
    motiveApparatus?: 'sails' | 'shells' | 'tail' | 'cap';
    // Grinding Mechanism
    millstoneQuantity?: number;
    millstoneDiameter?: string;
    millstoneState?: 'complete' | 'disassembled' | 'fragmented' | 'missing';
    hasTremonha?: boolean;
    hasQuelha?: boolean;
    hasUrreiro?: boolean;
    hasAliviadouro?: boolean;
    hasFarinaleiro?: boolean;
    // Epigraphy
    epigraphyPresence?: boolean;
    epigraphyLocation?: 'door_jambs' | 'interior_walls' | 'millstones' | 'other';
    epigraphyType?: 'dates' | 'initials' | 'religious_symbols' | 'counting_marks';
    epigraphyDescription?: string;
    // Conservation Ratings
    ratingStructure?: 'very_good' | 'good' | 'reasonable' | 'bad' | 'very_bad_ruin';
    ratingRoof?: 'very_good' | 'good' | 'reasonable' | 'bad' | 'very_bad_ruin';
    ratingHydraulic?: 'very_good' | 'good' | 'reasonable' | 'bad' | 'very_bad_ruin';
    ratingMechanism?: 'very_good' | 'good' | 'reasonable' | 'bad' | 'very_bad_ruin';
    ratingOverall?: 'very_good' | 'good' | 'reasonable' | 'bad' | 'very_bad_ruin';
    // Observations
    observationsStructure?: string;
    observationsRoof?: string;
    observationsHydraulic?: string;
    observationsMechanism?: string;
    observationsGeneral?: string;
    // Annexes
    hasOven?: boolean;
    hasMillerHouse?: boolean;
    hasStable?: boolean;
    hasFullingMill?: boolean;
    // Description
    description?: string;
  }
): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 ${testName}`);
  console.log('='.repeat(60));
  
  const slug = generateTestSlug(testData.title);
  let constructionId: string | null = null;
  
  try {
    // Use database transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Step 1: Insert into constructions
      const [newConstruction] = await tx
        .insert(constructions)
        .values({
          slug,
          typeCategory: 'MILL',
          geom: [testData.longitude, testData.latitude] as [number, number], // PostGIS: [lng, lat]
          district: testData.district || null,
          municipality: testData.municipality || null,
          parish: testData.parish || null,
          address: testData.address || null,
          drainageBasin: testData.drainageBasin || null,
          status: 'draft' as const,
          createdBy: ADMIN_USER_ID,
        })
        .returning({ id: constructions.id, slug: constructions.slug });

      if (!newConstruction) {
        throw new Error('Failed to create construction');
      }

      constructionId = newConstruction.id;

      // Step 2: Insert into construction_translations
      await tx.insert(constructionTranslations).values({
        constructionId: newConstruction.id,
        langCode: testData.locale,
        title: testData.title,
        description: testData.description || null,
        observationsStructure: testData.observationsStructure || null,
        observationsRoof: testData.observationsRoof || null,
        observationsHydraulic: testData.observationsHydraulic || null,
        observationsMechanism: testData.observationsMechanism || null,
        observationsGeneral: testData.observationsGeneral || null,
      });

      // Step 3: Insert into mills_data (this is where enum errors will occur)
      await tx.insert(millsData).values({
        constructionId: newConstruction.id,
        typology: testData.typology,
        // Characterization
        epoch: testData.epoch || null,
        setting: testData.setting || null,
        currentUse: testData.currentUse || null,
        // Access & Legal
        access: testData.access || null,
        legalProtection: testData.legalProtection || null,
        propertyStatus: testData.propertyStatus || null,
        // Architecture (Section III)
        planShape: testData.planShape || null,
        volumetry: testData.volumetry || null,
        constructionTechnique: testData.constructionTechnique || null,
        exteriorFinish: testData.exteriorFinish || null,
        roofShape: testData.roofShape || null,
        roofMaterial: testData.roofMaterial || null,
        // Motive Systems - Hydraulic (Section IV)
        captationType: testData.captationType || null,
        conductionType: testData.conductionType || null,
        conductionState: testData.conductionState || null,
        admissionRodizio: testData.admissionRodizio || null,
        admissionAzenha: testData.admissionAzenha || null,
        wheelTypeRodizio: testData.wheelTypeRodizio || null,
        wheelTypeAzenha: testData.wheelTypeAzenha || null,
        rodizioQty: testData.rodizioQty || null,
        azenhaQty: testData.azenhaQty || null,
        // Motive Systems - Wind
        motiveApparatus: testData.motiveApparatus || null,
        // Grinding Mechanism
        millstoneQuantity: testData.millstoneQuantity || null,
        millstoneDiameter: testData.millstoneDiameter || null,
        millstoneState: testData.millstoneState || null,
        hasTremonha: testData.hasTremonha || false,
        hasQuelha: testData.hasQuelha || false,
        hasUrreiro: testData.hasUrreiro || false,
        hasAliviadouro: testData.hasAliviadouro || false,
        hasFarinaleiro: testData.hasFarinaleiro || false,
        // Epigraphy (Section V)
        epigraphyPresence: testData.epigraphyPresence || false,
        epigraphyLocation: testData.epigraphyLocation || null,
        epigraphyType: testData.epigraphyType || null,
        epigraphyDescription: testData.epigraphyDescription || null,
        // Conservation Ratings (Section VI)
        ratingStructure: testData.ratingStructure || null,
        ratingRoof: testData.ratingRoof || null,
        ratingHydraulic: testData.ratingHydraulic || null,
        ratingMechanism: testData.ratingMechanism || null,
        ratingOverall: testData.ratingOverall || null,
        // Annexes
        hasOven: testData.hasOven || false,
        hasMillerHouse: testData.hasMillerHouse || false,
        hasStable: testData.hasStable || false,
        hasFullingMill: testData.hasFullingMill || false,
      });

      return newConstruction;
    });

    console.log(`✅ SUCCESS: Created mill with slug "${result.slug}" (ID: ${result.id})`);
  } catch (error) {
    // Clean up if construction was created but mills_data insert failed
    if (constructionId) {
      try {
        await db.delete(constructions).where(eq(constructions.id, constructionId));
        console.log(`   (Cleaned up partial construction record)`);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    // Extract and log PostgresError details
    if (isPostgresError(error)) {
      const enumInfo = extractEnumValueFromError(error.detail);
      
      if (enumInfo) {
        console.log(`❌ FAILED: Enum "${enumInfo.enumName}" - Value "${enumInfo.value}" is missing in Supabase`);
        console.log(`   Error Code: ${error.code || 'Unknown'}`);
        console.log(`   Detail: ${error.detail || error.message || 'Unknown error'}`);
      } else {
        console.log(`❌ FAILED: ${error.detail || error.message || 'Unknown error'}`);
        if (error.code) {
          console.log(`   Error Code: ${error.code}`);
        }
        if (error.column) {
          console.log(`   Column: ${error.column}`);
        }
      }
    } else if (error instanceof Error) {
      console.log(`❌ FAILED: ${error.message}`);
      
      // Try to extract enum info from error message
      const enumInfo = extractEnumValueFromError(error.message);
      if (enumInfo) {
        console.log(`   Enum: ${enumInfo.enumName}, Value: ${enumInfo.value}`);
      }
    } else {
      console.log(`❌ FAILED: Unknown error - ${String(error)}`);
    }
  }
}

async function main() {
  console.log('🔬 Starting Direct Database Enum Parity Verification');
  console.log('This script tests direct database inserts to identify enum mismatches');
  console.log('between Drizzle schema and Supabase database.\n');
  console.log(`Using admin user ID: ${ADMIN_USER_ID}\n`);

  // ============================================================================
  // TEST CASE A: Hydraulic Mill (Rodízio)
  // ============================================================================
  await runTest(
    'Test Case A: Hydraulic Mill (Rodízio)',
    {
      title: 'Test Rodízio Mill - Quadrangular Plan',
      description: 'Automated test for rodizio typology with quadrangular plan and weir captation',
      locale: 'pt',
      latitude: 41.1579,
      longitude: -8.6125,
      district: 'Porto',
      municipality: 'Porto',
      parish: 'Cedofeita',
      // Characterization
      typology: 'rodizio',
      epoch: '19th_c',
      setting: 'rural',
      currentUse: 'ruin',
      // Access & Legal
      access: 'pedestrian',
      legalProtection: 'classified',
      propertyStatus: 'private',
      // Architecture (Section III)
      planShape: 'quadrangular',
      volumetry: 'prismatic_sq_rec',
      constructionTechnique: 'mortared_stone',
      exteriorFinish: 'exposed',
      roofShape: 'gable',
      roofMaterial: 'tile',
      // Motive Systems - Hydraulic (Section IV)
      captationType: 'weir',
      conductionType: 'levada',
      conductionState: 'operational_clean',
      admissionRodizio: 'cubo',
      wheelTypeRodizio: 'penas',
      rodizioQty: 2,
      // Grinding Mechanism
      millstoneQuantity: 1,
      millstoneDiameter: '1.2',
      millstoneState: 'complete',
      hasTremonha: true,
      hasQuelha: true,
      // Conservation Ratings (Section VI)
      ratingStructure: 'reasonable',
      ratingRoof: 'bad',
      ratingHydraulic: 'good',
      ratingMechanism: 'reasonable',
      ratingOverall: 'reasonable',
    }
  );

  // ============================================================================
  // TEST CASE B: Wind Mill (Torre Fixa)
  // ============================================================================
  await runTest(
    'Test Case B: Wind Mill (Torre Fixa)',
    {
      title: 'Test Torre Fixa Mill - Sails Apparatus',
      description: 'Automated test for torre_fixa typology with sails apparatus and thatch roof',
      locale: 'en',
      latitude: 38.7223,
      longitude: -9.1393,
      district: 'Lisboa',
      municipality: 'Lisboa',
      parish: 'Alfama',
      // Characterization
      typology: 'torre_fixa',
      epoch: '18th_c',
      setting: 'isolated',
      currentUse: 'tourism',
      // Access & Legal
      access: 'car',
      legalProtection: 'under_study',
      propertyStatus: 'public',
      // Architecture (Section III)
      planShape: 'circular_tower',
      volumetry: 'cylindrical',
      constructionTechnique: 'dry_stone',
      exteriorFinish: 'whitewashed',
      roofShape: 'conical',
      roofMaterial: 'thatch',
      // Motive Systems - Wind
      motiveApparatus: 'sails',
      // Grinding Mechanism
      millstoneQuantity: 2,
      millstoneDiameter: '1.5',
      millstoneState: 'complete',
      hasTremonha: true,
      hasQuelha: false,
      hasUrreiro: true,
      // Conservation Ratings (Section VI)
      ratingStructure: 'good',
      ratingRoof: 'reasonable',
      ratingMechanism: 'good',
      ratingOverall: 'good',
    }
  );

  // ============================================================================
  // TEST CASE C: Conservation Ratings (Extreme Values)
  // ============================================================================
  await runTest(
    'Test Case C: Conservation Ratings (Extreme Values)',
    {
      title: 'Test Conservation Ratings - Very Bad Ruin',
      description: 'Automated test for extreme conservation rating values (very_bad_ruin)',
      locale: 'pt',
      latitude: 40.2033,
      longitude: -8.4103,
      district: 'Coimbra',
      municipality: 'Coimbra',
      parish: 'Sé Nova',
      // Characterization
      typology: 'rodizio',
      epoch: 'pre_18th_c',
      setting: 'rural',
      currentUse: 'ruin',
      // Access & Legal
      access: 'difficult_none',
      legalProtection: 'inexistent',
      propertyStatus: 'unknown',
      // Architecture (Section III)
      planShape: 'irregular',
      volumetry: 'conical',
      constructionTechnique: 'mixed_other',
      exteriorFinish: 'exposed',
      roofShape: 'inexistent',
      roofMaterial: 'slate',
      // Motive Systems - Hydraulic (Section IV)
      captationType: 'pool',
      conductionType: 'modern_pipe',
      conductionState: 'damaged_broken',
      admissionRodizio: 'calha',
      wheelTypeRodizio: 'colheres',
      rodizioQty: 1,
      // Grinding Mechanism
      millstoneQuantity: 0,
      millstoneState: 'missing',
      hasTremonha: false,
      hasQuelha: false,
      // Conservation Ratings (Section VI) - EXTREME VALUES
      ratingStructure: 'very_bad_ruin',
      ratingRoof: 'very_bad_ruin',
      ratingHydraulic: 'very_bad_ruin',
      ratingMechanism: 'very_bad_ruin',
      ratingOverall: 'very_bad_ruin',
      // Observations
      observationsStructure: 'Severely degraded structure',
      observationsHydraulic: 'Hydraulic system completely destroyed',
      observationsMechanism: 'No mechanism remains',
      observationsGeneral: 'Complete ruin state',
    }
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Enum Parity Verification Complete');
  console.log('='.repeat(60));
  console.log('\n📋 Summary:');
  console.log('Review the output above to identify all enum mismatches.');
  console.log('Each FAILED entry indicates an enum value that needs to be synced in Supabase.');
  console.log('\n💡 Next Steps:');
  console.log('1. Collect all failed enum names and values from the output above');
  console.log('2. Generate SQL migration to add missing enum values in Supabase');
  console.log('3. Run the migration to sync Drizzle schema with Supabase database');
}

// Run the script
main()
  .then(() => {
    console.log('\n✅ Script execution completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error running verification script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
