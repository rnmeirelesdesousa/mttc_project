// scripts/seed.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  constructions,
  millsData,
  constructionTranslations,
} from '../src/db/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a standalone connection for the script
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

async function seed() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // ============================================================================
    // MILL 1: Rodízio in Northern Portugal (negative longitude)
    // ============================================================================
    console.log('📝 Inserting Mill 1: Rodízio (Northern Portugal)...');
    
    const mill1Construction = await db
      .insert(constructions)
      .values({
        slug: 'moinho-do-rio-douro',
        typeCategory: 'MILL',
        geom: [-8.6125, 41.1579] as [number, number], // Porto area, negative longitude
        district: 'Porto',
        municipality: 'Porto',
        parish: 'Cedofeita',
        address: 'Rua do Moinho, 123',
        drainageBasin: 'Rio Douro',
        status: 'published',
      })
      .returning();

    const mill1Id = mill1Construction[0]!.id;

    await db.insert(millsData).values({
      constructionId: mill1Id,
      typology: 'rodizio',
      access: 'pedestrian',
      legalProtection: 'classified',
      propertyStatus: 'private',
      planShape: 'circular',
      constructionTechnique: 'stone_masonry',
      roofShape: 'conical',
      waterCaptation: 'direct',
      rodizioQty: 2,
      millstonesPairs: 1,
      ratingOverall: 'good',
      epoch: '19th_c',
      currentUse: 'tourism',
    });

    await db.insert(constructionTranslations).values([
      {
        constructionId: mill1Id,
        langCode: 'pt',
        title: 'Moinho do Rio Douro',
        description: 'Um moinho de rodízio histórico localizado nas margens do Rio Douro, representativo da arquitetura tradicional do Norte de Portugal.',
        observationsStructure: 'Estrutura em pedra granítica bem preservada.',
      },
      {
        constructionId: mill1Id,
        langCode: 'en',
        title: 'Douro River Mill',
        description: 'A historic rodízio mill located on the banks of the Douro River, representative of traditional Northern Portuguese architecture.',
        observationsStructure: 'Well-preserved granite stone structure.',
      },
    ]);

    console.log(`✅ Mill 1 inserted: ${mill1Id} (slug: moinho-do-rio-douro)\n`);

    // ============================================================================
    // MILL 2: Azenha with 'Published' status
    // ============================================================================
    console.log('📝 Inserting Mill 2: Azenha (Published)...');
    
    const mill2Construction = await db
      .insert(constructions)
      .values({
        slug: 'azenha-do-ribeiro',
        typeCategory: 'MILL',
        geom: [-7.9351, 40.6405] as [number, number], // Central Portugal, Coimbra area
        district: 'Coimbra',
        municipality: 'Coimbra',
        parish: 'Santo António dos Olivais',
        address: 'Ribeiro das Azenhas',
        drainageBasin: 'Rio Mondego',
        status: 'published',
      })
      .returning();

    const mill2Id = mill2Construction[0]!.id;

    await db.insert(millsData).values({
      constructionId: mill2Id,
      typology: 'azenha',
      access: 'car',
      legalProtection: 'under_study',
      propertyStatus: 'public',
      planShape: 'rectangular',
      constructionTechnique: 'stone_masonry',
      roofShape: 'gabled',
      waterCaptation: 'channel',
      millstonesPairs: 2,
      ratingOverall: 'very_good',
      epoch: '18th_c',
      currentUse: 'milling',
      hasMillerHouse: true,
    });

    await db.insert(constructionTranslations).values([
      {
        constructionId: mill2Id,
        langCode: 'pt',
        title: 'Azenha do Ribeiro',
        description: 'Azenha tradicional ainda em funcionamento, utilizando a força da água para moer cereais. Exemplo notável de engenharia hidráulica portuguesa.',
        observationsStructure: 'Mecanismo hidráulico completo e funcional.',
        observationsRoof: 'Cobertura em telha tradicional portuguesa.',
      },
      {
        constructionId: mill2Id,
        langCode: 'en',
        title: 'Ribeiro Watermill',
        description: 'Traditional watermill still in operation, using water power to grind cereals. Notable example of Portuguese hydraulic engineering.',
        observationsStructure: 'Complete and functional hydraulic mechanism.',
        observationsRoof: 'Traditional Portuguese tile roofing.',
      },
    ]);

    console.log(`✅ Mill 2 inserted: ${mill2Id} (slug: azenha-do-ribeiro)\n`);

    // ============================================================================
    // MILL 3: Windmill (Velas) in 'Draft' status
    // ============================================================================
    console.log('📝 Inserting Mill 3: Windmill/Velas (Draft)...');
    
    const mill3Construction = await db
      .insert(constructions)
      .values({
        slug: 'moinho-de-vento-alentejo',
        typeCategory: 'MILL',
        geom: [-7.4432, 38.7223] as [number, number], // Alentejo region
        district: 'Évora',
        municipality: 'Évora',
        parish: 'Sé e São Pedro',
        address: 'Estrada dos Moinhos de Vento',
        status: 'draft',
      })
      .returning();

    const mill3Id = mill3Construction[0]!.id;

    await db.insert(millsData).values({
      constructionId: mill3Id,
      typology: 'velas',
      access: 'difficult_none',
      legalProtection: 'inexistent',
      propertyStatus: 'unknown',
      planShape: 'circular',
      constructionTechnique: 'stone_masonry',
      roofShape: 'conical',
      windApparatus: 'rotating',
      millstonesPairs: 1,
      ratingOverall: 'bad',
      epoch: '19th_c',
      currentUse: 'ruin',
    });

    await db.insert(constructionTranslations).values([
      {
        constructionId: mill3Id,
        langCode: 'pt',
        title: 'Moinho de Vento do Alentejo',
        description: 'Moinho de vento tradicional do Alentejo, atualmente em estado de ruína. Característico da paisagem alentejana com velas rotativas.',
        observationsStructure: 'Estrutura circular em pedra, parcialmente colapsada.',
        observationsRoof: 'Cobertura cónica ausente ou muito degradada.',
      },
      {
        constructionId: mill3Id,
        langCode: 'en',
        title: 'Alentejo Windmill',
        description: 'Traditional Alentejo windmill, currently in a state of ruin. Characteristic of the Alentejo landscape with rotating sails.',
        observationsStructure: 'Circular stone structure, partially collapsed.',
        observationsRoof: 'Conical roof missing or severely degraded.',
      },
    ]);

    console.log(`✅ Mill 3 inserted: ${mill3Id} (slug: moinho-de-vento-alentejo)\n`);

    console.log('🎉 Seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Mill 1: Rodízio (Northern Portugal, Published)');
    console.log('  - Mill 2: Azenha (Published)');
    console.log('  - Mill 3: Windmill/Velas (Draft)');
    console.log('  - All mills have translations in pt and en\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

seed()
  .then(() => {
    console.log('✅ Script execution completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });

