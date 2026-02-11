import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError, successResponse } from '@/lib/api/error-handler';
import { exportAgentQuerySchema } from '@/lib/validations/agents';
import {
  exportAgentConfig,
  isAdminApiConfigured,
} from '@/lib/external-apis/admin-api';

/**
 * GET /api/agents/[id]/export
 *
 * Export an agent configuration as import-compatible JSON.
 * Proxies to the orchestrator's Admin API.
 * Returns raw snake_case response to preserve round-trip compatibility.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: agentId } = await params;

    if (!isAdminApiConfigured()) {
      return successResponse(
        { error: 'Agent export is not configured. Please contact your administrator.' },
        503
      );
    }

    // Parse optional version query param
    const searchParams = request.nextUrl.searchParams;
    const query = exportAgentQuerySchema.parse({
      version: searchParams.get('version') || undefined,
    });

    const result = await exportAgentConfig({
      tenantId: session.tenantId,
      agentId,
      version: query.version,
    });

    // Return raw snake_case response to preserve round-trip compatibility
    return successResponse(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return successResponse({ error: error.message }, 404);
      }
      if (error.message.includes('Invalid')) {
        return successResponse({ error: error.message }, 400);
      }
    }

    return handleApiError(error, { resourceName: 'Agent Export' });
  }
}
