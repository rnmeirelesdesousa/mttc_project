/**
 * One-time cleanup script to re-parent existing water_lines
 * 
 * This script creates parent construction records for all water_lines that don't have one.
 * It uses the first point of the water line path as the construction's geom location.
 * 
 * Run with: npx tsx scripts/reparent-water-lines.ts
 */

import { db } from '../src/lib/db';
import { constructions, waterLines } from '../src/db/schema';
import { eq, isNull, sql } from 'drizzle-orm';
import { generateSlug, generateUniqueSlug } from '../src/lib/slug';

async function reparentWaterLines() {
  console.log('Starting water lines re-parenting...');

  try {
    // Find all water lines that don't have a parent construction
    const orphanedWaterLines = await db
      .select({
        id: waterLines.id,
        slug: waterLines.slug,
        pathText: sql<string>`ST_AsText(${waterLines.path})`.as('path_text'),
        color: waterLines.color,
        createdAt: waterLines.createdAt,
        updatedAt: waterLines.updatedAt,
      })
      .from(waterLines)
      .where(isNull(waterLines.constructionId));

    console.log(`Found ${orphanedWaterLines.length} orphaned water lines`);

    if (orphanedWaterLines.length === 0) {
      console.log('No orphaned water lines found. Exiting.');
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const waterLine of orphanedWaterLines) {
      try {
        // Parse PostGIS LINESTRING format: LINESTRING(lng1 lat1, lng2 lat2, ...)
        const match = waterLine.pathText.match(/LINESTRING\((.+)\)/);
        if (!match) {
          console.error(`Invalid geometry for water line ${waterLine.id}: ${waterLine.pathText}`);
          errorCount++;
          continue;
        }

        const coordsStr = match[1];
        const coordPairs = coordsStr.split(',').map(coord => coord.trim());
        
        // Parse coordinates - get first point [lng, lat]
        const firstCoord = coordPairs[0]!.trim();
        const [lng, lat] = firstCoord.split(/\s+/).map(parseFloat);

        if (isNaN(lng) || isNaN(lat)) {
          console.error(`Invalid coordinates for water line ${waterLine.id}: ${firstCoord}`);
          errorCount++;
          continue;
        }

        // Generate unique slug (check against constructions table)
        const baseSlug = waterLine.slug;
        const slugExists = async (slug: string): Promise<boolean> => {
          const existing = await db
            .select({ id: constructions.id })
            .from(constructions)
            .where(eq(constructions.slug, slug))
            .limit(1);
          return existing.length > 0;
        };

        const uniqueSlug = await generateUniqueSlug(baseSlug, slugExists);

        // Create parent construction in a transaction
        await db.transaction(async (tx) => {
          // Insert construction
          const [newConstruction] = await tx
            .insert(constructions)
            .values({
              slug: uniqueSlug,
              typeCategory: 'water_line',
              geom: [lng, lat] as [number, number], // PostGIS: [lng, lat]
              status: 'published', // Water lines are always considered published
              createdAt: waterLine.createdAt,
              updatedAt: waterLine.updatedAt,
            })
            .returning({ id: constructions.id });

          if (!newConstruction) {
            throw new Error('Failed to create construction');
          }

          // Update water line with constructionId
          await tx
            .update(waterLines)
            .set({
              constructionId: newConstruction.id,
            })
            .where(eq(waterLines.id, waterLine.id));
        });

        console.log(`✓ Re-parented water line: ${waterLine.slug} (${waterLine.id})`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to re-parent water line ${waterLine.id}:`, error);
        errorCount++;
      }
    }

    console.log('\n=== Summary ===');
    console.log(`Successfully re-parented: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Total processed: ${orphanedWaterLines.length}`);
  } catch (error) {
    console.error('Fatal error during re-parenting:', error);
    process.exit(1);
  }
}

// Run the script
reparentWaterLines()
  .then(() => {
    console.log('\nRe-parenting completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
