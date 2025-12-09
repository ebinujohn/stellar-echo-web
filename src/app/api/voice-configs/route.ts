import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getVoiceConfigs, createVoiceConfig } from '@/lib/db/queries/voice-configs';
import { createVoiceConfigSchema } from '@/lib/validations/voice-configs';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

/**
 * GET /api/voice-configs
 * List all Voice configs (system-level catalog)
 */
export async function GET() {
  try {
    await requireAuth();
    const configs = await getVoiceConfigs();
    return successResponse(configs);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/voice-configs
 * Create a new Voice config
 */
export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const data = createVoiceConfigSchema.parse(await request.json());
    const newConfig = await createVoiceConfig(data);
    return successResponse(newConfig, 201);
  } catch (error) {
    return handleApiError(error, { resourceName: 'Voice config', fieldName: 'name' });
  }
}
