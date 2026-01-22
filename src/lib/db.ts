import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { schema } from '@/db/schema';

// Prevent connection exhaustion in Next.js hot-reloading
declare global {
  // eslint-disable-next-line no-var
  var dbClient: postgres.Sql | undefined;
  // eslint-disable-next-line no-var
  var db: ReturnType<typeof drizzle> | undefined;
}

if (!global.dbClient) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  global.dbClient = postgres(process.env.DATABASE_URL, { prepare: false });
}

if (!global.db) {
  global.db = drizzle(global.dbClient, { schema });
}

export const db = global.db;

