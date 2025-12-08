import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getCallMetrics } from '@/lib/db/queries/call-details';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  try {
    const session = await requireAuth();
    const { call_id: callId } = await params;

    const metrics = await getCallMetrics(callId, { tenantId: session.tenantId, isGlobalUser: session.isGlobalUser });

    if (!metrics) {
      return NextResponse.json(
        { success: false, error: 'Metrics not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching call metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call metrics' },
      { status: 500 }
    );
  }
}
