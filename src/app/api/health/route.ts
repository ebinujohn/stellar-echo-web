import { NextResponse } from 'next/server';

/**
 * Health check endpoint for container orchestration (ECS, Kubernetes, etc.)
 * Returns a simple JSON response indicating the service is healthy.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
