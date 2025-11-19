import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getCallVolumeTimeSeries } from '@/lib/db/queries/calls';
import { z } from 'zod';

const querySchema = z.object({
  days: z.coerce.number().min(1).max(90).optional().default(7),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(request.url);
    const params = querySchema.parse(Object.fromEntries(searchParams));

    const data = await getCallVolumeTimeSeries(session.tenantId, params.days);

    return NextResponse.json({
      success: true,
      data,
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
