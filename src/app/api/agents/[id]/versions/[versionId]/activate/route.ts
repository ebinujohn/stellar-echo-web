import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { activateVersion } from '@/lib/db/queries/agents';
import { refreshAgentConfigCache } from '@/lib/external-apis/admin-api';

type RouteContext = {
  params: Promise<{ id: string; versionId: string }>;
};

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id: agentId, versionId } = await context.params;

    // Activate the version in the database
    const activatedVersion = await activateVersion(versionId, agentId, { tenantId: session.tenantId, isGlobalUser: session.isGlobalUser });

    if (!activatedVersion) {
      return NextResponse.json({ success: false, error: 'Version not found' }, { status: 404 });
    }

    // Refresh the agent config cache in the orchestrator
    // This ensures the orchestrator picks up the new active configuration
    // Note: Cache refresh failure should not block the activation response
    const cacheRefreshResult = await refreshAgentConfigCache({
      tenantId: session.tenantId,
      agentId,
    });

    return NextResponse.json({
      success: true,
      data: activatedVersion,
      cacheRefreshed: cacheRefreshResult !== null,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
