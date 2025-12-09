import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getVoiceConfigDetail, updateVoiceConfig, deleteVoiceConfig } from '@/lib/db/queries/voice-configs';
import { updateVoiceConfigSchema } from '@/lib/validations/voice-configs';
import { handleApiError, successResponse } from '@/lib/api/error-handler';
import { handleGetById } from '@/lib/api/handlers';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/voice-configs/[id] */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  return handleGetById(id, (id) => getVoiceConfigDetail(id), 'Voice config');
}

/** PUT /api/voice-configs/[id] */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;
    const data = updateVoiceConfigSchema.parse(await request.json());
    const updatedConfig = await updateVoiceConfig(id, data);
    if (!updatedConfig) throw new Error('Voice config not found');
    return successResponse(updatedConfig);
  } catch (error) {
    return handleApiError(error, { resourceName: 'Voice config', fieldName: 'name' });
  }
}

/** DELETE /api/voice-configs/[id] */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await requireAuth();
    const { id } = await params;
    const deletedConfig = await deleteVoiceConfig(id);
    if (!deletedConfig) throw new Error('Voice config not found');
    return successResponse(deletedConfig);
  } catch (error) {
    return handleApiError(error);
  }
}
