import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Database connection URL from environment
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/shcheck';

// Connection pooling configuration
// Using postgres.js with pooling for production workloads
const connectionOptions: postgres.Options<{}> = {
  max: 10,                    // Maximum number of connections in pool
  idle_timeout: 20,           // Close idle connections after 20 seconds
  connect_timeout: 10,        // Connection timeout in seconds
  prepare: false,             // Disable prepared statements for compatibility with connection pooling
};

// Create postgres client with connection pooling
const client = postgres(connectionString, connectionOptions);

// Create Drizzle ORM instance with schema
export const db = drizzle(client, { schema });

// Export schema for direct access when needed
export { schema };

// Export types from schema
export type { Scan, NewScan, ScanOptions, ScanResult } from './schema.js';

// Graceful shutdown helper
export async function closeDatabase(): Promise<void> {
  await client.end();
}
