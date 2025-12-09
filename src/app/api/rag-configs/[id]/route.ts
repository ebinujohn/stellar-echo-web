import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getRagConfigDetail, updateRagConfig, deleteRagConfig } from '@/lib/db/queries/rag-configs';
import { updateRagConfigSchema } from '@/lib/validations/rag-configs';
import { handleApiError, successResponse } from '@/lib/api/error-handler';
import { handleGetById } from '@/lib/api/handlers';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/rag-configs/[id] */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return handleGetById(id, getRagConfigDetail, 'RAG config');
}

/** PUT /api/rag-configs/[id] */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const data = updateRagConfigSchema.parse(await request.json());
    const ctx = { tenantId: session.tenantId, isGlobalUser: session.isGlobalUser };
    const updatedConfig = await updateRagConfig(id, data, ctx);
    if (!updatedConfig) throw new Error('RAG config not found');
    return successResponse(updatedConfig);
  } catch (error) {
    return handleApiError(error, { resourceName: 'RAG config', fieldName: 'name' });
  }
}

/** DELETE /api/rag-configs/[id] */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const ctx = { tenantId: session.tenantId, isGlobalUser: session.isGlobalUser };
    const deletedConfig = await deleteRagConfig(id, ctx);
    if (!deletedConfig) throw new Error('RAG config not found');
    return successResponse(deletedConfig);
  } catch (error) {
    return handleApiError(error);
  }
}
