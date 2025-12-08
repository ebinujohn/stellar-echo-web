import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  getPhoneMappings,
  createPhoneMapping,
  isPhoneNumberMapped,
} from '@/lib/db/queries/agents';
import { createPhoneMappingSchema } from '@/lib/validations/agents';
import { z } from 'zod';

export async function GET() {
  try {
    const session = await requireAuth();

    const mappings = await getPhoneMappings({ tenantId: session.tenantId, isGlobalUser: session.isGlobalUser });

    return NextResponse.json({
      success: true,
      data: mappings,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    // Validate input
    const data = createPhoneMappingSchema.parse(body);

    // Check if phone number is already mapped
    const alreadyMapped = await isPhoneNumberMapped(
      data.phoneNumber,
      session.tenantId
    );

    if (alreadyMapped) {
      return NextResponse.json(
        {
          success: false,
          error: 'Phone number is already mapped',
        },
        { status: 409 }
      );
    }

    // Create mapping
    const mapping = await createPhoneMapping(
      data.phoneNumber,
      data.agentId,
      session.tenantId
    );

    return NextResponse.json({
      success: true,
      data: mapping,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
