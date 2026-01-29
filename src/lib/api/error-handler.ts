import { NextResponse } from 'next/server';
import { z } from 'zod';
import { formatZodErrorSummary, extractFieldErrors } from '@/lib/utils/error-formatter';

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
      { success: false, error: 'Your session has expired. Please sign in again.' },
      { status: 401 }
    );
  }

  // Zod validation error - include user-friendly summary
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: formatZodErrorSummary(error),
        details: error.issues,
        fieldErrors: extractFieldErrors(error),
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

  // Generic error - log details but return user-friendly message
  console.error('API Error:', error);
  return NextResponse.json(
    { success: false, error: 'Something went wrong on our end. Please try again later.' },
    { status: 500 }
  );
}

/**
 * Create a success response with data
 */
export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}
