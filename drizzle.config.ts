// drizzle.config.ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
  // Add this filter to ignore PostGIS system tables
  tablesFilter: ["!spatial_ref_sys", "!geography_columns", "!geometry_columns"],
});