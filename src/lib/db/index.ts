import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Isolated database client for aiattractiveness.
 * Connects lazily so that static build steps and environments
 * without DATABASE_URL can run without failing at import time.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[db] DATABASE_URL is not set — database operations will fail until configured.'
    );
  }
}

export const pool = new Pool({
  connectionString: connectionString || 'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  ssl: connectionString && !connectionString.includes('localhost')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 3,
  idleTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
export type DbClient = typeof db;
export { schema };
