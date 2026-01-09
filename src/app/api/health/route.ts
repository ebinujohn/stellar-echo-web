import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';

const logger = createLogger('health');

/**
 * Health check endpoint for container orchestration (ECS, Kubernetes, etc.)
 * Returns a simple JSON response indicating the service is healthy.
 */
export async function GET(request: NextRequest) {
  logger.debug(
    {
      url: request.url,
      method: request.method,
      pathname: request.nextUrl.pathname,
      headers: {
        host: request.headers.get('host'),
        'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
        'x-forwarded-for': request.headers.get('x-forwarded-for'),
        'user-agent': request.headers.get('user-agent'),
      },
    },
    'Health check endpoint called'
  );

  return NextResponse.json(
    {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
