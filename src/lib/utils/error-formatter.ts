import { z } from 'zod';

/**
 * Error types that can be formatted into user-friendly messages
 */
export type FormattableError =
  | z.ZodError
  | Error
  | { error: string; details?: z.core.$ZodIssue[] }
  | string
  | unknown;

/**
 * Field-level error structure for form validation
 */
export interface FieldError {
  path: string;
  message: string;
}

/**
 * Structured error result with summary and field-level errors
 */
export interface FormattedError {
  summary: string;
  fieldErrors: FieldError[];
  isValidationError: boolean;
}

/**
 * Common field name mappings for user-friendly display
 */
const FIELD_NAME_MAPPINGS: Record<string, string> = {
  name: 'Name',
  email: 'Email address',
  password: 'Password',
  confirmPassword: 'Password confirmation',
  phone: 'Phone number',
  phoneNumber: 'Phone number',
  description: 'Description',
  systemPrompt: 'System prompt',
  targetNode: 'Target node',
  conditionType: 'Condition type',
  confidenceThreshold: 'Confidence threshold',
  maxTokens: 'Max tokens',
  temperature: 'Temperature',
  apiKey: 'API key',
  url: 'URL',
  endpoint: 'Endpoint',
  ragConfigId: 'RAG configuration',
  voiceConfigId: 'Voice configuration',
  agentId: 'Agent',
  tenantId: 'Tenant',
};

/**
 * Format a field path into a human-readable label
 */
function formatFieldPath(path: PropertyKey[]): string {
  if (path.length === 0) return 'Value';

  return path
    .map((segment) => {
      if (typeof segment === 'number') {
        return `item ${segment + 1}`;
      }
      if (typeof segment === 'symbol') {
        return String(segment);
      }
      // Check for known field name mapping
      const mapped = FIELD_NAME_MAPPINGS[segment];
      if (mapped) return mapped;

      // Convert camelCase to Title Case
      return segment
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
    })
    .join(' > ');
}

/**
 * Format a Zod issue into a user-friendly message
 * Works with Zod v4's issue structure
 */
function formatZodIssue(issue: z.core.$ZodIssue): string {
  const fieldName = formatFieldPath(issue.path);

  // Use the message from Zod if available, with field name prefix
  if (issue.message) {
    // Check if the message already includes common patterns
    const lowerMessage = issue.message.toLowerCase();

    if (lowerMessage.includes('required')) {
      return `${fieldName} is required`;
    }

    if (lowerMessage.includes('too short') || lowerMessage.includes('at least')) {
      return `${fieldName} ${issue.message.toLowerCase()}`;
    }

    if (lowerMessage.includes('too long') || lowerMessage.includes('at most')) {
      return `${fieldName} ${issue.message.toLowerCase()}`;
    }

    if (lowerMessage.includes('invalid') || lowerMessage.includes('expected')) {
      return `${fieldName} is invalid`;
    }

    // For other messages, prefix with field name if not already included
    if (!lowerMessage.includes(fieldName.toLowerCase())) {
      return `${fieldName}: ${issue.message}`;
    }

    return issue.message;
  }

  // Fallback for issues without messages
  return `${fieldName} is invalid`;
}

/**
 * Format a Zod error into a summary message
 */
export function formatZodErrorSummary(error: z.ZodError): string {
  const issueCount = error.issues.length;

  if (issueCount === 1) {
    return formatZodIssue(error.issues[0]);
  }

  // Group issues by field for better summary
  const fieldNames = [...new Set(error.issues.map((i) => formatFieldPath(i.path)))];

  if (fieldNames.length === 1) {
    return `${fieldNames[0]} has ${issueCount} validation errors`;
  }

  if (fieldNames.length <= 3) {
    return `Please fix issues with: ${fieldNames.join(', ')}`;
  }

  return `Please fix ${issueCount} validation errors`;
}

/**
 * Extract field-level errors from a Zod error
 */
export function extractFieldErrors(error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: formatZodIssue(issue),
  }));
}

/**
 * Format any error into a user-friendly structured result
 */
export function formatError(error: FormattableError): FormattedError {
  // Handle Zod errors
  if (error instanceof z.ZodError) {
    return {
      summary: formatZodErrorSummary(error),
      fieldErrors: extractFieldErrors(error),
      isValidationError: true,
    };
  }

  // Handle API response with Zod details
  if (
    error &&
    typeof error === 'object' &&
    'details' in error &&
    Array.isArray((error as { details?: unknown }).details)
  ) {
    const apiError = error as { error: string; details: z.core.$ZodIssue[] };
    const zodError = new z.ZodError(apiError.details);
    return {
      summary: formatZodErrorSummary(zodError),
      fieldErrors: extractFieldErrors(zodError),
      isValidationError: true,
    };
  }

  // Handle API response with error message
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = error as { error: string };
    return {
      summary: formatApiErrorMessage(apiError.error),
      fieldErrors: [],
      isValidationError: false,
    };
  }

  // Handle standard Error
  if (error instanceof Error) {
    return {
      summary: formatApiErrorMessage(error.message),
      fieldErrors: [],
      isValidationError: false,
    };
  }

  // Handle string error
  if (typeof error === 'string') {
    return {
      summary: formatApiErrorMessage(error),
      fieldErrors: [],
      isValidationError: false,
    };
  }

  // Unknown error
  return {
    summary: 'An unexpected error occurred. Please try again.',
    fieldErrors: [],
    isValidationError: false,
  };
}

/**
 * Format API error messages into user-friendly text
 */
function formatApiErrorMessage(message: string): string {
  const lowerMessage = message.toLowerCase();

  // Authentication errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    return 'Your session has expired. Please sign in again.';
  }

  if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
    return "You don't have permission to perform this action.";
  }

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  if (lowerMessage.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }

  // Server errors
  if (lowerMessage.includes('internal server error') || lowerMessage.includes('500')) {
    return 'Something went wrong on our end. Please try again later.';
  }

  if (lowerMessage.includes('bad gateway') || lowerMessage.includes('502')) {
    return 'The server is temporarily unavailable. Please try again later.';
  }

  if (lowerMessage.includes('service unavailable') || lowerMessage.includes('503')) {
    return 'The service is temporarily unavailable. Please try again later.';
  }

  // Database errors
  if (lowerMessage.includes('unique') || lowerMessage.includes('duplicate')) {
    return 'This item already exists. Please use a different name or identifier.';
  }

  if (lowerMessage.includes('foreign key') || lowerMessage.includes('reference')) {
    return 'This item is linked to other data and cannot be modified.';
  }

  // Not found errors
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return 'The requested item could not be found.';
  }

  // Rate limiting
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('429')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Validation errors
  if (lowerMessage.includes('invalid input') || lowerMessage.includes('validation')) {
    return 'Please check your input and try again.';
  }

  // Return original if no mapping found, but capitalize first letter
  if (message.length > 0) {
    return message.charAt(0).toUpperCase() + message.slice(1);
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Get a simple error message string from any error type
 */
export function getErrorMessage(error: FormattableError): string {
  return formatError(error).summary;
}

/**
 * Check if an error is a validation error
 */
export function isValidationError(error: FormattableError): boolean {
  return formatError(error).isValidationError;
}

/**
 * Get field error for a specific field path
 */
export function getFieldError(error: FormattableError, fieldPath: string): string | undefined {
  const formatted = formatError(error);
  const fieldError = formatted.fieldErrors.find((e) => e.path === fieldPath);
  return fieldError?.message;
}
