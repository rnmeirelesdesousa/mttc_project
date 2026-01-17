// scripts/seed-scientific-validation.ts
/**
 * Comprehensive Scientific Data Validation Script
 * 
 * Purpose: Stress test the database schema by inserting a 100% complete scientific record
 * with every single field populated. This identifies any missing enum values or columns
 * in Supabase that need to be synced with the Drizzle schema.
 * 
 * Strategy: Direct database insertion bypassing Server Actions to avoid cookies/auth issues.
 * Uses realistic scientific data based on mills_data_spec.md.
 * 
 * Usage: npx tsx scripts/seed-scientific-validation.ts
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

// Generate unique slug with timestamp to avoid conflicts
function generateTestSlug(title: string): string {
  const baseSlug = generateSlug(title);
  const timestamp = Date.now();
  return `${baseSlug}-${timestamp}`;
}

// Extract enum value from error detail
function extractEnumInfo(error: unknown): { enumName?: string; value?: string; column?: string } | null {
  if (typeof error !== 'object' || error === null) return null;

  const errorObj = error as Record<string, unknown>;
  const detail = String(errorObj.detail || errorObj.message || '');
  
  // Pattern: "invalid input value for enum <enum_name>: \"<value>\""
  const enumMatch = detail.match(/invalid input value for enum\s+(\w+):\s*"([^"]+)"/i);
  if (enumMatch) {
    return {
      enumName: enumMatch[1] || undefined,
      value: enumMatch[2] || undefined,
    };
  }
  
  // Pattern: "column \"<column_name>\" does not exist"
  const columnMatch = detail.match(/column\s+"(\w+)"\s+does not exist/i);
  if (columnMatch) {
    return {
      column: columnMatch[1] || undefined,
    };
  }
  
  // Pattern: "invalid input value for enum <enum_name>"
  const simpleEnumMatch = detail.match(/invalid input value for enum\s+(\w+)/i);
  if (simpleEnumMatch) {
    return {
      enumName: simpleEnumMatch[1] || undefined,
    };
  }
  
  return null;
}

async function seedCompleteScientificRecord() {
  console.log('🔬 Starting Comprehensive Scientific Data Validation');
  console.log('This script tests a 100% complete scientific record with ALL fields populated.\n');
  console.log(`Using admin user ID: ${ADMIN_USER_ID}\n`);

  const title = 'Complete Scientific Inventory Test - Quadrangular Rodízio';
  const slug = generateTestSlug(title);
  let constructionId: string | null = null;

  try {
    console.log('📝 Attempting to insert complete scientific record...\n');
    console.log('Testing fields:');
    console.log('  ✓ All Characterization fields (typology, epoch, setting, currentUse)');
    console.log('  ✓ All Architecture fields (planShape: quadrangular, volumetry, constructionTechnique, exteriorFinish, roofShape, roofMaterial)');
    console.log('  ✓ All Hydraulic Motive System fields (captation, conduction, admission, wheel types, quantities)');
    console.log('  ✓ All Grinding Mechanism fields (millstones, components)');
    console.log('  ✓ All Epigraphy fields (presence, location, type, description)');
    console.log('  ✓ All Conservation Ratings (structure, roof, hydraulic, mechanism, overall)');
    console.log('  ✓ All Annexes (oven, miller house, stable, fulling mill)');
    console.log('  ✓ All Observation fields in construction_translations\n');

    // Use database transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Step 1: Insert into constructions (core data)
      const [newConstruction] = await tx
        .insert(constructions)
        .values({
          slug,
          legacyId: 'TEST-INV-2024-001', // Test legacy ID
          typeCategory: 'MILL',
          geom: [-8.6125, 41.1579] as [number, number], // Porto area, PostGIS: [lng, lat]
          district: 'Porto',
          municipality: 'Porto',
          parish: 'Cedofeita',
          address: 'Rua do Moinho, 123',
          drainageBasin: 'Rio Douro',
          status: 'draft' as const,
          createdBy: ADMIN_USER_ID,
        })
        .returning({ id: constructions.id, slug: constructions.slug });

      if (!newConstruction) {
        throw new Error('Failed to create construction');
      }

      constructionId = newConstruction.id;
      console.log(`✅ Created construction: ${newConstruction.id} (slug: ${newConstruction.slug})\n`);

      // Step 2: Insert into construction_translations (i18n + ALL observation fields)
      await tx.insert(constructionTranslations).values({
        constructionId: newConstruction.id,
        langCode: 'pt',
        title,
        description: 'Registo científico completo para validação do esquema de base de dados. Inclui todos os campos do inventário molinológico português.',
        // ALL observation fields filled
        observationsStructure: 'Estrutura em pedra granítica com aparelho regular. Algumas fissuras verticais na parede norte, possivelmente devido a movimentos do terreno.',
        observationsRoof: 'Cobertura em telha tradicional portuguesa, parcialmente degradada. Falta de telhas na zona nordeste, com infiltrações visíveis.',
        observationsHydraulic: 'Sistema hidráulico completo e funcional. Açude em bom estado, levada limpa e operacional. Roda de rodízio com penas de madeira em bom estado de conservação.',
        observationsMechanism: 'Par de mós completo e funcional. Tremonha e quelha presentes. Mecanismo de transmissão em madeira, necessitando de manutenção preventiva.',
        observationsGeneral: 'Moinho em bom estado geral de conservação, representativo da tipologia de rodízio horizontal do Norte de Portugal. Requer intervenção na cobertura e manutenção do mecanismo.',
      });

      console.log('✅ Created construction_translations with all observation fields\n');

      // Step 3: Insert into mills_data (COMPLETE scientific record - ALL fields)
      await tx.insert(millsData).values({
        constructionId: newConstruction.id,
        
        // ========================================================================
        // CHARACTERIZATION (Section II)
        // ========================================================================
        typology: 'rodizio', // Required field
        epoch: '19th_c',
        setting: 'rural',
        currentUse: 'tourism',
        
        // ========================================================================
        // GEOGRAPHIC ATTRIBUTES
        // ========================================================================
        access: 'pedestrian',
        legalProtection: 'classified',
        propertyStatus: 'private',
        
        // ========================================================================
        // ARCHITECTURE (Section III) - ALL FIELDS
        // ========================================================================
        planShape: 'quadrangular', // STRESS TEST: This is the key field we're testing
        volumetry: 'prismatic_sq_rec',
        constructionTechnique: 'mortared_stone',
        exteriorFinish: 'exposed',
        roofShape: 'gable',
        roofMaterial: 'tile',
        
        // ========================================================================
        // MOTIVE SYSTEMS - HYDRAULIC (Section IV) - ALL FIELDS
        // ========================================================================
        captationType: 'weir',
        conductionType: 'levada',
        conductionState: 'operational_clean',
        admissionRodizio: 'cubo',
        wheelTypeRodizio: 'penas',
        rodizioQty: 2,
        // Note: admissionAzenha and wheelTypeAzenha are for vertical wheels (azenha),
        // so we leave them null for a rodizio (horizontal wheel)
        admissionAzenha: null,
        wheelTypeAzenha: null,
        azenhaQty: null,
        
        // ========================================================================
        // MOTIVE SYSTEMS - WIND
        // ========================================================================
        // Not applicable for rodizio, leave null
        motiveApparatus: null,
        
        // ========================================================================
        // GRINDING MECHANISM - ALL FIELDS
        // ========================================================================
        millstoneQuantity: 2,
        millstoneDiameter: '1.25', // Stored as text for precision
        millstoneState: 'complete',
        // ALL component boolean flags
        hasTremonha: true,
        hasQuelha: true,
        hasUrreiro: true,
        hasAliviadouro: true,
        hasFarinaleiro: true,
        
        // ========================================================================
        // EPIGRAPHY (Section V) - ALL FIELDS
        // ========================================================================
        epigraphyPresence: true,
        epigraphyLocation: 'door_jambs',
        epigraphyType: 'dates',
        epigraphyDescription: 'Data gravada nas ombreiras da porta: "1875". Iniciais "J.M." gravadas na pedra.',
        
        // ========================================================================
        // CONSERVATION RATINGS (Section VI) - ALL FIELDS
        // ========================================================================
        ratingStructure: 'good',
        ratingRoof: 'reasonable',
        ratingHydraulic: 'very_good',
        ratingMechanism: 'good',
        ratingOverall: 'good',
        
        // ========================================================================
        // ANNEXES - ALL BOOLEAN FLAGS
        // ========================================================================
        hasOven: true,
        hasMillerHouse: true,
        hasStable: false,
        hasFullingMill: false,
      });

      console.log('✅ Inserted complete mills_data record with ALL fields populated\n');
      console.log('🎉 SUCCESS: Complete scientific record inserted successfully!');
      console.log(`   Construction ID: ${newConstruction.id}`);
      console.log(`   Slug: ${newConstruction.slug}`);
      console.log('\n✅ Database schema validation PASSED - All fields accepted!');

      return newConstruction;
    });

    console.log('\n📊 Summary:');
    console.log('  ✓ All characterization fields accepted');
    console.log('  ✓ All architecture fields accepted (including planShape: quadrangular)');
    console.log('  ✓ All hydraulic motive system fields accepted');
    console.log('  ✓ All grinding mechanism fields accepted');
    console.log('  ✓ All epigraphy fields accepted');
    console.log('  ✓ All conservation rating fields accepted');
    console.log('  ✓ All annexes fields accepted');
    console.log('  ✓ All observation fields in construction_translations accepted');

  } catch (error) {
    // Clean up if construction was created but mills_data insert failed
    if (constructionId) {
      try {
        await db.delete(constructions).where(eq(constructions.id, constructionId));
        console.log(`\n   (Cleaned up partial construction record)`);
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
    }

    console.error('\n❌ FAILED: Scientific record insertion failed\n');
    
    // Detailed error diagnostics
    const errorObj = error as Record<string, unknown>;
    const errorMessage = String(errorObj.message || 'Unknown error');
    const errorCause = errorObj.cause ? String(errorObj.cause) : undefined;
    const errorCode = errorObj.code ? String(errorObj.code) : undefined;
    const errorDetail = errorObj.detail ? String(errorObj.detail) : undefined;

    console.log('📋 Error Diagnostics:');
    console.log(`   Message: ${errorMessage}`);
    if (errorCause) {
      console.log(`   Cause: ${errorCause}`);
    }
    if (errorCode) {
      console.log(`   Code: ${errorCode}`);
    }
    if (errorDetail) {
      console.log(`   Detail: ${errorDetail}`);
    }

    // Extract enum/column information
    const enumInfo = extractEnumInfo(error);
    if (enumInfo) {
      console.log('\n🔍 Identified Issue:');
      if (enumInfo.column) {
        console.log(`   ❌ Missing Column: "${enumInfo.column}"`);
        console.log(`   💡 Action: Add this column to the mills_data table in Supabase`);
      } else if (enumInfo.enumName && enumInfo.value) {
        console.log(`   ❌ Missing Enum Value: "${enumInfo.value}" in enum "${enumInfo.enumName}"`);
        console.log(`   💡 Action: Add this value to the ${enumInfo.enumName} enum type in Supabase`);
        console.log(`   💡 SQL: ALTER TYPE ${enumInfo.enumName} ADD VALUE '${enumInfo.value}';`);
      } else if (enumInfo.enumName) {
        console.log(`   ❌ Enum Issue: "${enumInfo.enumName}"`);
        console.log(`   💡 Action: Check if this enum type exists in Supabase`);
      }
    }

    console.log('\n💡 Next Steps:');
    console.log('1. Review the error details above');
    console.log('2. Identify the missing enum value or column');
    console.log('3. Generate SQL migration to add the missing enum/column');
    console.log('4. Run the migration in Supabase');
    console.log('5. Re-run this script to validate');

    throw error;
  }
}

// Run the script
seedCompleteScientificRecord()
  .then(() => {
    console.log('\n✅ Script execution completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error running validation script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
