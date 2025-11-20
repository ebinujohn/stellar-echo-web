import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  updatePhoneMapping,
  deletePhoneMapping,
} from '@/lib/db/queries/agents';
import { updatePhoneMappingSchema } from '@/lib/validations/agents';
import { z } from 'zod';

type RouteContext = {
  params: Promise<{ phone: string }>;
};

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    const { phone } = await context.params;
    const phoneNumber = decodeURIComponent(phone);
    const body = await request.json();

    // Validate input
    const data = updatePhoneMappingSchema.parse(body);

    // Update mapping
    const mapping = await updatePhoneMapping(
      phoneNumber,
      data.agentId,
      session.tenantId
    );

    if (!mapping) {
      return NextResponse.json(
        { success: false, error: 'Phone mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mapping,
    });
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

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await requireAuth();
    const { phone } = await context.params;
    const phoneNumber = decodeURIComponent(phone);

    // Delete mapping
    const mapping = await deletePhoneMapping(phoneNumber, session.tenantId);

    if (!mapping) {
      return NextResponse.json(
        { success: false, error: 'Phone mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mapping,
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
