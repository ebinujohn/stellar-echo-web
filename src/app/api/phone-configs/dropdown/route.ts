import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getPhoneConfigsForDropdown } from '@/lib/db/queries/phone-configs';

/**
 * GET /api/phone-configs/dropdown
 * Get simplified list of phone configs for dropdown selection
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const configs = await getPhoneConfigsForDropdown(session.tenantId);

    return NextResponse.json({
      success: true,
      data: configs,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
