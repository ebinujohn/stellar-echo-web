import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  getPhoneMappings,
  createPhoneMapping,
  isPhoneNumberMapped,
} from '@/lib/db/queries/agents';
import { createPhoneMappingSchema } from '@/lib/validations/agents';
import { handleApiError, successResponse } from '@/lib/api/error-handler';

export async function GET() {
  try {
    const session = await requireAuth();
    const mappings = await getPhoneMappings({ tenantId: session.tenantId, isGlobalUser: session.isGlobalUser });
    return successResponse(mappings);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = createPhoneMappingSchema.parse(body);

    // Check if phone number is already mapped
    const alreadyMapped = await isPhoneNumberMapped(data.phoneNumber, session.tenantId);
    if (alreadyMapped) {
      throw new Error('Phone number is already mapped (unique)');
    }

    const mapping = await createPhoneMapping(data.phoneNumber, data.agentId, session.tenantId);
    return successResponse(mapping, 201);
  } catch (error) {
    return handleApiError(error, { resourceName: 'Phone mapping', fieldName: 'phone number' });
  }
}
