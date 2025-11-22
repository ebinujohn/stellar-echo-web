import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import {
  getWorkflowConfigTypes,
  getWorkflowConfigTypesByCategory,
  getNodeTypes,
  getTransitionConditions,
  getActionTypes,
  getSearchModes,
} from '@/lib/db/queries/workflow-config-types';
import type { ConfigTypeCategory } from '@/lib/db/schema/workflow-config-types';

/**
 * GET /api/workflow-config-types
 * List workflow configuration types for UI components
 *
 * Query params:
 * - category: Filter by category (node_type, transition_condition, action_type, search_mode)
 */
export async function GET(request: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as ConfigTypeCategory | null;

    let types;

    if (category) {
      // Return types for specific category
      switch (category) {
        case 'node_type':
          types = await getNodeTypes();
          break;
        case 'transition_condition':
          types = await getTransitionConditions();
          break;
        case 'action_type':
          types = await getActionTypes();
          break;
        case 'search_mode':
          types = await getSearchModes();
          break;
        default:
          types = await getWorkflowConfigTypesByCategory(category);
      }
    } else {
      // Return all types
      types = await getWorkflowConfigTypes();
    }

    return NextResponse.json({
      success: true,
      data: types,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    console.error('API Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
