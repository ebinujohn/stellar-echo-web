import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  getAgentVersions,
  createAgentVersion,
} from '@/lib/db/queries/agents';
import { createVersionSchema, workflowConfigSchema } from '@/lib/validations/agents';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const versions = await getAgentVersions(id, session.tenantId);

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

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    const { id: agentId } = await context.params;
    const body = await request.json();

    // Validate input
    const data = createVersionSchema.parse(body);

    // Validate workflow config
    try {
      workflowConfigSchema.parse(data.configJson);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid workflow configuration',
            details: validationError.issues,
          },
          { status: 400 }
        );
      }
      throw validationError;
    }

    // Create new version
    // voiceConfigId is FK to voice_configs table (voice selection)
    // TTS tuning params are in configJson.workflow.tts
    const newVersion = await createAgentVersion(
      agentId,
      data.configJson,
      session.email,
      session.tenantId,
      data.notes,
      data.globalPrompt,
      data.ragEnabled,
      data.ragConfigId,
      data.voiceConfigId
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
