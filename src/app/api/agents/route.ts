import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAgentsList } from '@/lib/db/queries/calls';

export async function GET() {
  try {
    const session = await requireAuth();

    const agents = await getAgentsList(session.tenantId);

    return NextResponse.json({
      success: true,
      data: agents,
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
