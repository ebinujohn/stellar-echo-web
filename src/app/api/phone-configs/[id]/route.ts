import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  getPhoneConfigDetail,
  updatePhoneConfig,
  deletePhoneConfig,
  isPhoneNumberExists,
} from '@/lib/db/queries/phone-configs';
import { updatePhoneConfigSchema } from '@/lib/validations/phone-configs';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/phone-configs/[id]
 * Get a single phone config with its mapping
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const config = await getPhoneConfigDetail(id, session.tenantId);

    if (!config) {
      return NextResponse.json({ success: false, error: 'Phone config not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/phone-configs/[id]
 * Update phone config (number, name, description, agent mapping)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const data = updatePhoneConfigSchema.parse(body);

    // Check if phone number already exists (if changing number)
    if (data.phoneNumber) {
      const exists = await isPhoneNumberExists(data.phoneNumber, session.tenantId, id);
      if (exists) {
        return NextResponse.json(
          { success: false, error: 'A phone config with this number already exists' },
          { status: 409 }
        );
      }
    }

    const updatedConfig = await updatePhoneConfig(id, data, session.tenantId);

    if (!updatedConfig) {
      return NextResponse.json({ success: false, error: 'Phone config not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: updatedConfig,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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

    // Handle unique constraint violation
    if (error instanceof Error && error.message.includes('unique')) {
      return NextResponse.json(
        { success: false, error: 'A phone config with this number already exists' },
        { status: 409 }
      );
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/phone-configs/[id]
 * Soft delete a phone config
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const deletedConfig = await deletePhoneConfig(id, session.tenantId);

    if (!deletedConfig) {
      return NextResponse.json({ success: false, error: 'Phone config not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: deletedConfig,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
