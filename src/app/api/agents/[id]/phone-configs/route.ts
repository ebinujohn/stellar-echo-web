import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAgentPhoneConfigs } from '@/lib/db/queries/phone-configs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/agents/[id]/phone-configs
 * Get phone configs mapped to a specific agent
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id: agentId } = await params;

    const phoneConfigs = await getAgentPhoneConfigs(agentId, { tenantId: session.tenantId, isGlobalUser: session.isGlobalUser });

    return NextResponse.json({
      success: true,
      data: phoneConfigs,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
