import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getPhoneConfigs, createPhoneConfig, isPhoneNumberExists } from '@/lib/db/queries/phone-configs';
import { createPhoneConfigSchema } from '@/lib/validations/phone-configs';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

/** GET /api/phone-configs */
export async function GET() {
  try {
    const session = await requireAuth();
    const configs = await getPhoneConfigs(session.tenantId);
    return successResponse(configs);
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/phone-configs */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const data = createPhoneConfigSchema.parse(await request.json());

    // Check if phone number already exists
    const exists = await isPhoneNumberExists(data.phoneNumber, session.tenantId);
    if (exists) {
      throw new Error('A phone config with this number already exists (unique)');
    }

    const newConfig = await createPhoneConfig(data, session.tenantId);
    return successResponse(newConfig, 201);
  } catch (error) {
    return handleApiError(error, { resourceName: 'Phone config', fieldName: 'number' });
  }
}
