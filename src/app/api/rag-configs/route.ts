import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getRagConfigs, createRagConfig } from '@/lib/db/queries/rag-configs';
import { createRagConfigSchema } from '@/lib/validations/rag-configs';
import { handleApiError, successResponse } from '@/lib/api/error-handler';
import { handleGet } from '@/lib/api/handlers';

/**
 * GET /api/rag-configs
 * List all RAG configs for the tenant
 */
export const GET = () => handleGet(getRagConfigs);

/**
 * POST /api/rag-configs
 * Create a new RAG config with initial version
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = createRagConfigSchema.parse(body);
    const newConfig = await createRagConfig(data, session.tenantId, session.userId);
    return successResponse(newConfig, 201);
  } catch (error) {
    return handleApiError(error, { resourceName: 'RAG config', fieldName: 'name' });
  }
}
