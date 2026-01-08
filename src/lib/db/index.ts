import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { loadEnv } from '../env';

// Load environment variables from .env.local if it exists,
// otherwise use environment variables from the deployment environment
loadEnv();

// Get database credentials from environment variables
const connectionString = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// For query purposes
const queryClient = postgres(connectionString, {
  max: 10, // Maximum number of connections
  idle_timeout: 20, // Close connections after 20 seconds of inactivity
  connect_timeout: 10, // Connection timeout in seconds
});

export const db = drizzle(queryClient, { schema });

// Types
export type Database = typeof db;
