import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getPhoneConfigDetail, updatePhoneConfig, deletePhoneConfig, isPhoneNumberExists } from '@/lib/db/queries/phone-configs';
import { updatePhoneConfigSchema } from '@/lib/validations/phone-configs';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

type RouteParams = { params: Promise<{ id: string }> };

/** GET /api/phone-configs/[id] */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const config = await getPhoneConfigDetail(id, session.tenantId);
    if (!config) throw new Error('Phone config not found');
    return successResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}

/** PUT /api/phone-configs/[id] */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const data = updatePhoneConfigSchema.parse(await request.json());

    // Check if phone number already exists (if changing number)
    if (data.phoneNumber) {
      const exists = await isPhoneNumberExists(data.phoneNumber, session.tenantId, id);
      if (exists) throw new Error('A phone config with this number already exists (unique)');
    }

    const updatedConfig = await updatePhoneConfig(id, data, session.tenantId);
    if (!updatedConfig) throw new Error('Phone config not found');
    return successResponse(updatedConfig);
  } catch (error) {
    return handleApiError(error, { resourceName: 'Phone config', fieldName: 'number' });
  }
}

/** DELETE /api/phone-configs/[id] */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const deletedConfig = await deletePhoneConfig(id, session.tenantId);
    if (!deletedConfig) throw new Error('Phone config not found');
    return successResponse(deletedConfig);
  } catch (error) {
    return handleApiError(error);
  }
}
