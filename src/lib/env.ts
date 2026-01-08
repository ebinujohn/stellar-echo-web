import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

/**
 * Load environment variables from .env.local if it exists.
 *
 * This utility handles both development and production environments:
 * - Development: Loads variables from .env.local file
 * - Production (Docker): Uses environment variables passed directly to the container
 *
 * Note: dotenv won't override existing environment variables, so this is safe
 * to call even when env vars are already set by the deployment environment.
 *
 * Usage:
 * - Import at the top of scripts that run outside Next.js context
 * - For Next.js app code, environment variables are loaded automatically
 */
export function loadEnv(): void {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');

  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
  }
  // If .env.local doesn't exist, rely on existing environment variables
  // which are typically set by the deployment environment (Docker, etc.)
}
