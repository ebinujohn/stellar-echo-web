import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getRagConfigs, createRagConfig } from '@/lib/db/queries/rag-configs';
import { createRagConfigSchema } from '@/lib/validations/rag-configs';
import { z } from 'zod';

/**
 * GET /api/rag-configs
 * List all RAG configs for the tenant
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const configs = await getRagConfigs(session.tenantId);

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

/**
 * POST /api/rag-configs
 * Create a new RAG config with initial version
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    // Validate input
    const data = createRagConfigSchema.parse(body);

    // Create RAG config with initial version
    const newConfig = await createRagConfig(data, session.tenantId, session.userId);

    return NextResponse.json({
      success: true,
      data: newConfig,
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

    // Handle unique constraint violation (duplicate name)
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
