import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * Health check endpoint for container orchestration (ECS, Kubernetes, etc.)
 * Verifies database connectivity and returns service health status.
 * Note: No logging here to avoid noise from frequent health checks.
 */
export async function GET() {
  const headers = {
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  try {
    // Quick database connectivity check (safe: no user input)
    // nosemgrep: no-raw-sql-queries
    await db.execute(sql`SELECT 1`);

    return NextResponse.json(
      {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers }
    );
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Database connection failed',
      },
      { status: 503, headers }
    );
  }
}
