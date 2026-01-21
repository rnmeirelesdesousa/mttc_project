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

/**
 * Lazy initialization function for database connection.
 * 
 * This ensures the connection is only created when actually used,
 * not when the module is imported (which happens during build).
 * Once created, the connection is cached in global.db for reuse.
 * 
 * Performance: No impact - connection is still cached and reused.
 * The only difference is when initialization happens (on first use vs module load).
 */
function getDb() {
  if (!global.db) {
    if (!global.dbClient) {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set');
      }
      global.dbClient = postgres(process.env.DATABASE_URL);
    }
    global.db = drizzle(global.dbClient, { schema });
  }
  return global.db;
}

/**
 * Lazy-initialized database instance.
 * 
 * Uses a Proxy to defer connection creation until first access.
 * This allows the build to complete even if DATABASE_URL isn't set during build.
 * Runtime performance is identical - connection is still cached globally.
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    const dbInstance = getDb();
    const value = dbInstance[prop as keyof typeof dbInstance];
    if (typeof value === 'function') {
      return value.bind(dbInstance);
    }
    return value;
  },
  ownKeys() {
    return Object.keys(getDb());
  },
  getOwnPropertyDescriptor(_target, prop) {
    const dbInstance = getDb();
    return Object.getOwnPropertyDescriptor(dbInstance, prop);
  },
  has(_target, prop) {
    return prop in getDb();
  },
});

