import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  getRagConfigDetail,
  getRagConfigVersions,
  createRagConfigVersion,
} from '@/lib/db/queries/rag-configs';
import { createRagConfigVersionSchema } from '@/lib/validations/rag-configs';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/rag-configs/[id]/versions
 * List all versions for a RAG config
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Check if config exists
    const config = await getRagConfigDetail(id, session.tenantId);
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'RAG config not found' },
        { status: 404 }
      );
    }

    const versions = await getRagConfigVersions(id, session.tenantId);

    return NextResponse.json({
      success: true,
      data: versions,
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

/**
 * POST /api/rag-configs/[id]/versions
 * Create a new version for a RAG config
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const data = createRagConfigVersionSchema.parse(body);

    // Check if config exists
    const config = await getRagConfigDetail(id, session.tenantId);
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'RAG config not found' },
        { status: 404 }
      );
    }

    // Create new version
    const newVersion = await createRagConfigVersion(
      id,
      data,
      session.tenantId,
      session.userId
    );

    return NextResponse.json({
      success: true,
      data: newVersion,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
