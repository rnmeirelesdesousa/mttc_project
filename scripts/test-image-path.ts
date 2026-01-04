// scripts/test-image-path.ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { constructions } from '../src/db/schema';
import { eq } from 'drizzle-orm';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a standalone connection for the script
const client = postgres(process.env.DATABASE_URL);
const db = drizzle(client);

/**
 * Test Image Path Update Script
 * 
 * Updates a published mill's main_image column with a test path.
 * This allows us to verify:
 * 1. The storage helper correctly constructs URLs
 * 2. The UI displays placeholders when images don't exist
 * 3. The translation keys work correctly
 * 
 * Usage: npx tsx scripts/test-image-path.ts
 */
async function testImagePath() {
  console.log('🖼️  Testing Image Path Infrastructure\n');

  try {
    // Find the first published mill (from seed data: moinho-do-rio-douro or azenha-do-ribeiro)
    const publishedMills = await db
      .select({
        id: constructions.id,
        slug: constructions.slug,
        mainImage: constructions.mainImage,
      })
      .from(constructions)
      .where(eq(constructions.status, 'published'))
      .limit(1);

    if (publishedMills.length === 0) {
      console.log('⚠️  No published mills found. Run seed.ts first!');
      return;
    }

    const mill = publishedMills[0]!;
    console.log(`📝 Found published mill: ${mill.slug} (ID: ${mill.id})`);
    console.log(`   Current main_image: ${mill.mainImage || '(null)'}\n`);

    // Update with a test image path
    // This path doesn't exist in Supabase yet, so it will show the placeholder
    const testImagePath = 'test/scientific-verification.jpg';
    
    console.log(`🔄 Updating main_image to: "${testImagePath}"...`);
    
    await db
      .update(constructions)
      .set({ mainImage: testImagePath })
      .where(eq(constructions.id, mill.id));

    console.log('✅ Update successful!\n');
    
    // Verify the update
    const updated = await db
      .select({
        slug: constructions.slug,
        mainImage: constructions.mainImage,
      })
      .from(constructions)
      .where(eq(constructions.id, mill.id))
      .limit(1);

    console.log('📊 Verification:');
    console.log(`   Slug: ${updated[0]!.slug}`);
    console.log(`   main_image: ${updated[0]!.mainImage}\n`);

    console.log('🎯 Next Steps:');
    console.log('   1. Visit http://localhost:3000/[locale]/map');
    console.log('   2. Click on the mill marker to see the popup with placeholder');
    console.log('   3. Visit http://localhost:3000/[locale]/mill/' + mill.slug);
    console.log('   4. Verify the detail page shows the "No image available" placeholder\n');

    console.log('💡 To test with a real image:');
    console.log('   - Upload an image to your Supabase "constructions" bucket');
    console.log('   - Update the path above to match your actual file path');
    console.log('   - Re-run this script with the real path\n');

  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

testImagePath()
  .then(() => {
    console.log('✅ Script execution completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });

