import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getLlmModels, getLlmModelsForDropdown } from '@/lib/db/queries/llm-models';

/**
 * GET /api/llm-models
 * List all available LLM models (system-wide)
 */
export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format');

    // Return simplified format for dropdowns
    if (format === 'dropdown') {
      const models = await getLlmModelsForDropdown();
      return NextResponse.json({
        success: true,
        data: models,
      });
    }

    // Return full model details
    const models = await getLlmModels();

    return NextResponse.json({
      success: true,
      data: models,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
