import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getRagConfigDetail, updateRagConfig, deleteRagConfig } from '@/lib/db/queries/rag-configs';
import { updateRagConfigSchema } from '@/lib/validations/rag-configs';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/rag-configs/[id]
 * Get a single RAG config with its active version
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const config = await getRagConfigDetail(id, session.tenantId);

    if (!config) {
      return NextResponse.json(
        { success: false, error: 'RAG config not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: config,
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
 * PUT /api/rag-configs/[id]
 * Update RAG config metadata (name, description)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const data = updateRagConfigSchema.parse(body);

    // Check if config exists
    const existingConfig = await getRagConfigDetail(id, session.tenantId);
    if (!existingConfig) {
      return NextResponse.json(
        { success: false, error: 'RAG config not found' },
        { status: 404 }
      );
    }

    // Update the config
    const updatedConfig = await updateRagConfig(id, data, session.tenantId);

    return NextResponse.json({
      success: true,
      data: updatedConfig,
    });

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

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { success: false, error: 'A RAG config with this name already exists' },
        { status: 409 }
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
 * DELETE /api/rag-configs/[id]
 * Soft delete a RAG config (set isActive = false)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Check if config exists
    const existingConfig = await getRagConfigDetail(id, session.tenantId);
    if (!existingConfig) {
      return NextResponse.json(
        { success: false, error: 'RAG config not found' },
        { status: 404 }
      );
    }

    // Soft delete the config
    const deletedConfig = await deleteRagConfig(id, session.tenantId);

    return NextResponse.json({
      success: true,
      data: deletedConfig,
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
