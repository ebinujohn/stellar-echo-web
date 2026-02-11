import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError, successResponse } from '@/lib/api/error-handler';
import { bulkImportAgentsSchema } from '@/lib/validations/agents';
import {
  bulkImportAgentConfigs,
  isAdminApiConfigured,
} from '@/lib/external-apis/admin-api';

/**
 * POST /api/agents/import/bulk
 *
 * Bulk import multiple agent JSON configurations.
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
    const validatedData = bulkImportAgentsSchema.parse(body);

    const result = await bulkImportAgentConfigs({
      agents: validatedData.agents.map((agent) => ({
        tenantId: session.tenantId,
        agentJson: agent.agentJson,
        notes: agent.notes,
      })),
    });

    return successResponse({
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results.map((r) => ({
        success: r.success,
        tenantId: r.tenant_id,
        agentId: r.agent_id,
        agentName: r.agent_name,
        action: r.action,
        version: r.version,
        validationWarnings: r.validation_warnings,
        errorMessage: r.error_message,
      })),
    });
  } catch (error) {
    return handleApiError(error, { resourceName: 'Agent Bulk Import' });
  }
}
