import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { activateVoiceConfigVersion } from '@/lib/db/queries/voice-configs';

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * PUT /api/voice-configs/[id]/versions/[versionId]/activate
 * Activate a specific Voice config version
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id, versionId } = await params;

    const activatedVersion = await activateVoiceConfigVersion(versionId, id, session.tenantId);

    if (!activatedVersion) {
      return NextResponse.json(
        { success: false, error: 'Voice config version not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: activatedVersion,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
