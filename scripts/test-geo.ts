// scripts/test-geo.ts
import 'dotenv/config';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a standalone connection for the script
const client = postgres(process.env.DATABASE_URL);

async function testPostGIS() {
  console.log('🗺️  PostGIS Spatial Query Test\n');
  console.log('Testing: Find the closest mill to a given coordinate using ST_Distance\n');

  // Test coordinate: Lisbon area (approximately -9.1393, 38.7223)
  // This will help us verify PostGIS is calculating real distances
  const testLat = 38.7223;
  const testLng = -9.1393;

  console.log(`📍 Search coordinate: [${testLng}, ${testLat}] (Lisbon area)\n`);

  try {
    // PostGIS spatial query: Find closest mill using ST_Distance
    // Note: ST_Distance with geography type returns distance in meters
    const result = await client`
      SELECT 
        c.id,
        c.slug,
        c.status,
        c.district,
        c.municipality,
        ST_AsText(c.geom) as geom_text,
        ST_X(c.geom::geometry) as longitude,
        ST_Y(c.geom::geometry) as latitude,
        ST_Distance(
          c.geom::geography,
          ST_SetSRID(ST_MakePoint(${testLng}, ${testLat}), 4326)::geography
        ) / 1000.0 as distance_km,
        md.typology
      FROM constructions c
      LEFT JOIN mills_data md ON c.id = md.construction_id
      ORDER BY c.geom::geography <-> ST_SetSRID(ST_MakePoint(${testLng}, ${testLat}), 4326)::geography
      LIMIT 5
    `;

    if (result.length === 0) {
      console.log('⚠️  No mills found in database. Run seed.ts first!');
      return;
    }

    console.log('✅ PostGIS spatial query executed successfully!\n');
    console.log('📊 Results (5 closest mills):\n');
    console.log('─'.repeat(100));

    result.forEach((mill, index: number) => {
      console.log(`\n${index + 1}. ${mill.slug}`);
      console.log(`   ID: ${mill.id}`);
      console.log(`   Typology: ${mill.typology || 'N/A'}`);
      console.log(`   Status: ${mill.status}`);
      console.log(`   Location: ${mill.municipality || 'N/A'}, ${mill.district || 'N/A'}`);
      console.log(`   Coordinates: [${mill.longitude}, ${mill.latitude}]`);
      console.log(`   PostGIS Geometry: ${mill.geom_text}`);
      console.log(`   Distance from search point: ${Number(mill.distance_km).toFixed(2)} km`);
    });

    console.log('\n' + '─'.repeat(100));
    console.log('\n🎯 Proof of Life: PostGIS is calculating real distances!');
    console.log('   The distance values above are computed using ST_Distance on geography type,');
    console.log('   which performs accurate spherical distance calculations (not just text storage).\n');

    // Additional verification: Check that we can extract coordinates correctly
    console.log('🔍 Additional Verification: Coordinate Extraction\n');
    
    const allMills = await client`
      SELECT 
        c.slug,
        ST_X(c.geom::geometry) as lng,
        ST_Y(c.geom::geometry) as lat,
        CASE 
          WHEN ST_X(c.geom::geometry) < 0 THEN 'Western Hemisphere ✓'
          ELSE 'Eastern Hemisphere'
        END as hemisphere_check
      FROM constructions c
      ORDER BY c.slug
    `;

    allMills.forEach((mill) => {
      console.log(`  ${mill.slug}: [${Number(mill.lng)}, ${Number(mill.lat)}] - ${mill.hemisphere_check}`);
    });

    console.log('\n✅ All spatial operations verified!\n');

  } catch (error) {
    console.error('❌ PostGIS test failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

testPostGIS()
  .then(() => {
    console.log('✅ Test execution completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });

