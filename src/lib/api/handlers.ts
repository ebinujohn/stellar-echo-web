import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError, successResponse } from './error-handler';
import type { QueryContext } from '@/lib/db/queries/types';

/**
 * Generic handler for simple GET endpoints that fetch data.
 * Handles auth, fetching, and error handling automatically.
 */
export async function handleGet<T>(
  queryFn: (ctx: QueryContext) => Promise<T>
) {
  try {
    const session = await requireAuth();
    const ctx: QueryContext = {
      tenantId: session.tenantId,
      isGlobalUser: session.isGlobalUser,
    };
    const data = await queryFn(ctx);
    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Generic handler for GET endpoints that fetch data by ID.
 */
export async function handleGetById<T>(
  id: string,
  queryFn: (id: string, ctx: QueryContext) => Promise<T | null>,
  resourceName = 'Resource'
) {
  try {
    const session = await requireAuth();
    const ctx: QueryContext = {
      tenantId: session.tenantId,
      isGlobalUser: session.isGlobalUser,
    };
    const data = await queryFn(id, ctx);

    if (!data) {
      return NextResponse.json(
        { success: false, error: `${resourceName} not found` },
        { status: 404 }
      );
    }

    return successResponse(data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Generic handler for dropdown endpoints (simplified list for select elements).
 * @deprecated Use handleGet directly - this is just a wrapper with no additional logic
 */
export const handleDropdownGet = handleGet;
