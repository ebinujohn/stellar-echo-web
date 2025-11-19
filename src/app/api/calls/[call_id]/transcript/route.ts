import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getCallTranscript } from '@/lib/db/queries/call-details';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ call_id: string }> }
) {
  try {
    const session = await requireAuth();
    const { call_id: callId } = await params;

    const transcript = await getCallTranscript(callId, session.tenantId);

    return NextResponse.json({
      success: true,
      data: transcript,
    });
  } catch (error) {
    console.error('Error fetching call transcript:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch call transcript' },
      { status: 500 }
    );
  }
}
