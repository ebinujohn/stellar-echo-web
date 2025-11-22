import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getPhoneConfigs, createPhoneConfig, isPhoneNumberExists } from '@/lib/db/queries/phone-configs';
import { createPhoneConfigSchema } from '@/lib/validations/phone-configs';
import { z } from 'zod';

/**
 * GET /api/phone-configs
 * List all phone configs for the tenant
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const configs = await getPhoneConfigs(session.tenantId);

    return NextResponse.json({
      success: true,
      data: configs,
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
 * POST /api/phone-configs
 * Create a new phone config
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    // Validate input
    const data = createPhoneConfigSchema.parse(body);

    // Check if phone number already exists
    const exists = await isPhoneNumberExists(data.phoneNumber, session.tenantId);
    if (exists) {
      return NextResponse.json(
        { success: false, error: 'A phone config with this number already exists' },
        { status: 409 }
      );
    }

    // Create phone config
    const newConfig = await createPhoneConfig(data, session.tenantId);

    return NextResponse.json(
      {
        success: true,
        data: newConfig,
      },
      { status: 201 }
    );
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
