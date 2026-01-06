import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { updatePhoneMapping, deletePhoneMapping } from '@/lib/db/queries/agents';
import { updatePhoneMappingSchema } from '@/lib/validations/agents';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

type RouteContext = { params: Promise<{ phone: string }> };

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { phone } = await context.params;
    const phoneNumber = decodeURIComponent(phone);
    const data = updatePhoneMappingSchema.parse(await request.json());

    const mapping = await updatePhoneMapping(phoneNumber, data.agentId, session.tenantId);
    if (!mapping) {
      throw new Error('Phone mapping not found');
    }
    return successResponse(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { phone } = await context.params;
    const phoneNumber = decodeURIComponent(phone);

    const mapping = await deletePhoneMapping(phoneNumber, session.tenantId);
    if (!mapping) {
      throw new Error('Phone mapping not found');
    }
    return successResponse(mapping);
  } catch (error) {
    return handleApiError(error);
  }
}
