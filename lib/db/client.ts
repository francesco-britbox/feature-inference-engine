/**
 * Database client with connection pooling
 * Single source of truth for database access
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. Please configure it in .env.local'
  );
}

/**
 * PostgreSQL connection pool
 * Reuses connections for better performance
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Timeout connecting to database
});

/**
 * Drizzle ORM database instance
 * Type-safe database queries
 */
export const db = drizzle(pool, { schema });

/**
 * Close database connection pool
 * Call this on application shutdown
 */
export async function closeDatabaseConnection(): Promise<void> {
  await pool.end();
}

/**
 * Test database connection
 * Returns true if connection successful, throws error otherwise
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    return true;
  } catch (error) {
    throw new Error(
      `Database connection failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
