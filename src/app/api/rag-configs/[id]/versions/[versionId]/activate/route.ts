import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  getRagConfigDetail,
  getRagConfigVersion,
  activateRagConfigVersion,
} from '@/lib/db/queries/rag-configs';

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>;
}

/**
 * PUT /api/rag-configs/[id]/versions/[versionId]/activate
 * Activate a specific RAG config version
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id, versionId } = await params;

    // Check if config exists
    const config = await getRagConfigDetail(id, session.tenantId);
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'RAG config not found' },
        { status: 404 }
      );
    }

    // Check if version exists
    const version = await getRagConfigVersion(versionId, session.tenantId);
    if (!version) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      );
    }

    // Verify version belongs to this config
    if (version.ragConfigId !== id) {
      return NextResponse.json(
        { success: false, error: 'Version does not belong to this RAG config' },
        { status: 400 }
      );
    }

    // Activate the version
    const activatedVersion = await activateRagConfigVersion(versionId, id, session.tenantId);

    return NextResponse.json({
      success: true,
      data: activatedVersion,
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
