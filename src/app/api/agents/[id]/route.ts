import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getAgentDetail, updateAgent, deleteAgent } from '@/lib/db/queries/agents';
import { updateAgentSchema } from '@/lib/validations/agents';
import { handleApiError, successResponse } from '@/lib/api/error-handler';
import { handleGetById } from '@/lib/api/handlers';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/agents/[id] */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return handleGetById(id, getAgentDetail, 'Agent');
}

/** PUT /api/agents/[id] */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const data = updateAgentSchema.parse(await request.json());
    const updatedAgent = await updateAgent(id, data, session.tenantId);
    if (!updatedAgent) throw new Error('Agent not found');
    return successResponse(updatedAgent);
  } catch (error) {
    return handleApiError(error, { resourceName: 'Agent', fieldName: 'name' });
  }
}

/** DELETE /api/agents/[id] */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const deletedAgent = await deleteAgent(id, session.tenantId);
    if (!deletedAgent) throw new Error('Agent not found');
    return successResponse(deletedAgent);
  } catch (error) {
    return handleApiError(error);
  }
}
