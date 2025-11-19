import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getCallDetail } from '@/lib/db/queries/call-details';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  try {
    const session = await requireAuth();
    const { call_id: callId } = await params;

    const call = await getCallDetail(callId, session.tenantId);

    if (!call) {
      return NextResponse.json(
        { success: false, error: 'Call not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: call,
    });
  } catch (error) {
    console.error('Error fetching call detail:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call detail' },
      { status: 500 }
    );
  }
}
