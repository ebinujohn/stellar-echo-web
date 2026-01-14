import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { loadEnv } from '../env';

// Load environment variables from .env.local if it exists,
// otherwise use environment variables from the deployment environment
loadEnv();

// Lazy initialization for database connection
// This prevents connection attempts during Next.js build when env vars aren't available
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _queryClient: ReturnType<typeof postgres> | null = null;

function getConnectionString(): string {
  const { DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME } = process.env;
  return `postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

function createDb() {
  if (!_db) {
    const connectionString = getConnectionString();
    // Enable SSL for production database connections (required by most cloud databases)
    const sslEnabled = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';
    _queryClient = postgres(connectionString, {
      max: 10, // Maximum number of connections
      idle_timeout: 20, // Close connections after 20 seconds of inactivity
      connect_timeout: 10, // Connection timeout in seconds
      ssl: sslEnabled ? 'require' : false,
    });
    _db = drizzle(_queryClient, { schema });
  }
  return _db;
}

// Export a proxy that lazily initializes the database connection
// This allows the module to be imported during build without establishing a connection
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const realDb = createDb();
    const value = realDb[prop as keyof typeof realDb];
    if (typeof value === 'function') {
      return value.bind(realDb);
    }
    return value;
  },
});

// Types
export type Database = typeof db;
