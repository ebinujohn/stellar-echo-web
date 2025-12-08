import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getCallTimeline } from '@/lib/db/queries/call-details';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  try {
    const session = await requireAuth();
    const { call_id: callId } = await params;

    const timeline = await getCallTimeline(callId, { tenantId: session.tenantId, isGlobalUser: session.isGlobalUser });

    return NextResponse.json({
      success: true,
      data: timeline,
    });
  } catch (error) {
    console.error('Error fetching call timeline:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call timeline' },
      { status: 500 }
    );
  }
}
