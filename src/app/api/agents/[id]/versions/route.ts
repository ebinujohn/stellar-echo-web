import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  getAgentVersions,
  createAgentVersion,
  activateVersion,
} from '@/lib/db/queries/agents';
import { createVersionSchema, validateAgentConfig } from '@/lib/validations/agents';
import { refreshAgentConfigCache } from '@/lib/external-apis/admin-api';
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

    const versions = await getAgentVersions(id, { tenantId: session.tenantId, isGlobalUser: session.isGlobalUser });

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

    // Validate input schema
    const data = createVersionSchema.parse(body);

    // Validate workflow config with enhanced validation
    // This provides structured errors and warnings
    const validationResult = validateAgentConfig(data.configJson);

    if (!validationResult.valid) {
      // Return detailed validation errors
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid workflow configuration',
          details: validationResult.errors,
          warnings: validationResult.warnings,
        },
        { status: 400 }
      );
    }

    // Log warnings if any (config is valid but has deprecated patterns)
    if (validationResult.warnings.length > 0) {
      console.warn('Agent config warnings:', validationResult.warnings);
    }

    // Create new version
    // voiceConfigId is FK to voice_configs table (voice selection)
    // TTS tuning params are in configJson.workflow.tts (per AGENT_JSON_SCHEMA.md)
    let newVersion = await createAgentVersion(
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

    // Auto-activate the new version if requested
    let cacheRefreshed = false;
    if (data.autoActivate) {
      newVersion = await activateVersion(newVersion.id, agentId, { tenantId: session.tenantId, isGlobalUser: session.isGlobalUser });

      // Refresh the agent config cache in the orchestrator
      // This ensures the orchestrator picks up the new active configuration
      // Note: Cache refresh failure should not block the response
      const cacheRefreshResult = await refreshAgentConfigCache({
        tenantId: session.tenantId,
        agentId,
      });
      cacheRefreshed = cacheRefreshResult !== null;
    }

    return NextResponse.json({
      success: true,
      data: newVersion,
      cacheRefreshed,
      // Include warnings in successful response so frontend can display them
      warnings: validationResult.warnings.length > 0 ? validationResult.warnings : undefined,
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
