import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getVoiceConfigs, createVoiceConfig } from '@/lib/db/queries/voice-configs';
import { createVoiceConfigSchema } from '@/lib/validations/voice-configs';
import { z } from 'zod';

/**
 * GET /api/voice-configs
 * List all Voice configs for the tenant
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const configs = await getVoiceConfigs(session.tenantId);

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

/**
 * POST /api/voice-configs
 * Create a new Voice config with initial version
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    // Validate input
    const data = createVoiceConfigSchema.parse(body);

    // Create Voice config with initial version
    const newConfig = await createVoiceConfig(data, session.tenantId, session.userId);

    return NextResponse.json(
      {
        success: true,
        data: newConfig,
      },
      { status: 201 }
    );
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
