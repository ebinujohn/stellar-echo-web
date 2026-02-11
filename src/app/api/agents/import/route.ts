import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError, successResponse } from '@/lib/api/error-handler';
import { importAgentSchema } from '@/lib/validations/agents';
import {
  importAgentConfig,
  isAdminApiConfigured,
} from '@/lib/external-apis/admin-api';

/**
 * POST /api/agents/import
 *
 * Import a single agent JSON configuration.
 * Proxies to the orchestrator's Admin API.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    if (!isAdminApiConfigured()) {
      return successResponse(
        { error: 'Agent import is not configured. Please contact your administrator.' },
        503
      );
    }

    const body = await request.json();
    const validatedData = importAgentSchema.parse(body);

    const result = await importAgentConfig({
      tenantId: session.tenantId,
      agentJson: validatedData.agentJson,
      phoneNumbers: validatedData.phoneNumbers,
      notes: validatedData.notes,
      createdBy: session.email,
      dryRun: validatedData.dryRun,
    });

    const r = result.result;
    return successResponse(
      {
        success: r.success,
        tenantId: r.tenant_id,
        agentId: r.agent_id,
        agentName: r.agent_name,
        action: r.action,
        version: r.version,
        previousVersion: r.previous_version,
        voiceConfigLinked: r.voice_config_linked,
        ragEnabled: r.rag_enabled,
        phoneNumbersMapped: r.phone_numbers_mapped,
        validationWarnings: r.validation_warnings,
        errorMessage: r.error_message,
      },
      r.action === 'created' ? 201 : 200
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Missing required top-level key')) {
        return successResponse({ error: error.message }, 400);
      }
      if (error.message.includes('Tenant not found')) {
        return successResponse({ error: error.message }, 404);
      }
      if (error.message.includes('Workflow validation failed')) {
        return successResponse({ error: error.message }, 422);
      }
    }

    return handleApiError(error, { resourceName: 'Agent Import' });
  }
}
