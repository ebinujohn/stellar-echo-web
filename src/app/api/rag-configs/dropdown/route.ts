import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getRagConfigsForDropdown } from '@/lib/db/queries/rag-configs';

/**
 * GET /api/rag-configs/dropdown
 * Get simplified RAG configs list for dropdown selection
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const configs = await getRagConfigsForDropdown(session.tenantId);

    return NextResponse.json({
      success: true,
      data: configs,
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
