import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getCallAnalysis } from '@/lib/db/queries/call-details';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  try {
    const session = await requireAuth();
    const { call_id: callId } = await params;

    const analysis = await getCallAnalysis(callId, session.tenantId);

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error) {
    console.error('Error fetching call analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call analysis' },
      { status: 500 }
    );
  }
}
