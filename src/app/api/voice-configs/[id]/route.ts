import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  getVoiceConfigDetail,
  updateVoiceConfig,
  deleteVoiceConfig,
} from '@/lib/db/queries/voice-configs';
import { updateVoiceConfigSchema } from '@/lib/validations/voice-configs';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/voice-configs/[id]
 * Get a single Voice config with active version
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const config = await getVoiceConfigDetail(id, session.tenantId);

    if (!config) {
      return NextResponse.json({ success: false, error: 'Voice config not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/voice-configs/[id]
 * Update Voice config metadata (name, description)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const data = updateVoiceConfigSchema.parse(body);

    const updatedConfig = await updateVoiceConfig(id, data, session.tenantId);

    if (!updatedConfig) {
      return NextResponse.json({ success: false, error: 'Voice config not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedConfig,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
        { success: false, error: 'A Voice config with this name already exists' },
        { status: 409 }
      );
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/voice-configs/[id]
 * Soft delete a Voice config
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const deletedConfig = await deleteVoiceConfig(id, session.tenantId);

    if (!deletedConfig) {
      return NextResponse.json({ success: false, error: 'Voice config not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: deletedConfig,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
