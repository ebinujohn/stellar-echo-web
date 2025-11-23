import { NextResponse } from 'next/server';
import { z } from 'zod';

export interface ErrorResponseOptions {
  resourceName?: string;
  fieldName?: string;
}

/**
 * Standard API error handler that handles common error types consistently.
 * Use this in catch blocks to reduce error handling boilerplate.
 */
export function handleApiError(error: unknown, options: ErrorResponseOptions = {}) {
  // Auth error
  if (error instanceof Error && error.message === 'Unauthorized') {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Zod validation error
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

  // Unique constraint violation
  if (error instanceof Error && error.message.includes('unique')) {
    const message = options.resourceName && options.fieldName
      ? `A ${options.resourceName} with this ${options.fieldName} already exists`
      : options.resourceName
        ? `A ${options.resourceName} already exists`
        : 'Resource already exists';
    return NextResponse.json(
      { success: false, error: message },
      { status: 409 }
    );
  }

  // Not found error
  if (error instanceof Error && error.message.includes('not found')) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 404 }
    );
  }

  // Generic error
  console.error('API Error:', error);
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}

/**
 * Create a success response with data
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
