import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { handleApiError, successResponse } from './error-handler';

/**
 * Generic handler for simple GET endpoints that fetch data.
 * Handles auth, fetching, and error handling automatically.
 */
export async function handleGet<T>(
  queryFn: (tenantId: string) => Promise<T>
) {
  try {
    const session = await requireAuth();
    const data = await queryFn(session.tenantId);
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
  queryFn: (id: string, tenantId: string) => Promise<T | null>,
  resourceName = 'Resource'
) {
  try {
    const session = await requireAuth();
    const data = await queryFn(id, session.tenantId);

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
 */
export async function handleDropdownGet<T>(
  queryFn: (tenantId: string) => Promise<T>
) {
  return handleGet(queryFn);
}
