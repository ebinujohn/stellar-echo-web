import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getCallDebugTrace, isAdminApiConfigured } from '@/lib/external-apis/admin-api';
import { getCallDetail } from '@/lib/db/queries/call-details';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  try {
    const session = await requireAuth();
    const { call_id: callId } = await params;

    // Check if Admin API is configured
    if (!isAdminApiConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Admin API is not configured. Set ADMIN_API_BASE_URL and ADMIN_API_KEY.' },
        { status: 503 }
      );
    }

    // First verify the call belongs to this tenant (authorization check)
    const call = await getCallDetail(callId, {
      tenantId: session.tenantId,
      isGlobalUser: session.isGlobalUser,
    });

    if (!call) {
      return NextResponse.json(
        { success: false, error: 'Call not found' },
        { status: 404 }
      );
    }

    // Fetch debug trace from orchestrator Admin API
    const debugTrace = await getCallDebugTrace(callId);

    return NextResponse.json({
      success: true,
      data: debugTrace,
    });
  } catch (error) {
    console.error('Error fetching call debug trace:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch call debug trace';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
