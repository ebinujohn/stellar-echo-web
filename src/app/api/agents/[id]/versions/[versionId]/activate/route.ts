import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { activateVersion } from '@/lib/db/queries/agents';

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    const { id: agentId, versionId } = await context.params;

    // Activate the version
    const activatedVersion = await activateVersion(
      versionId,
      agentId,
      session.tenantId
    );

    if (!activatedVersion) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: activatedVersion,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
