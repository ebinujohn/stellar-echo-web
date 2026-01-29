'use client';

import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import {
  formatError,
  getFieldError as getFieldErrorFromFormatted,
  type FormattedError,
  type FieldError,
} from '@/lib/utils/error-formatter';

export interface UseFormValidationOptions<T extends z.ZodType> {
  /** Zod schema for validation */
  schema: T;
  /** Whether to validate on change (default: false, validates on blur) */
  validateOnChange?: boolean;
  /** Whether to validate on blur (default: true) */
  validateOnBlur?: boolean;
}

export interface FormValidationState {
  /** Map of field paths to error messages */
  fieldErrors: Record<string, string>;
  /** Overall form error summary */
  formError: string | null;
  /** Whether the form has any errors */
  hasErrors: boolean;
  /** Whether validation has been triggered at least once */
  isDirty: boolean;
  /** Set of fields that have been touched (blurred) */
  touchedFields: Set<string>;
}

export interface UseFormValidationReturn<T extends z.ZodType> {
  /** Current validation state */
  state: FormValidationState;
  /** Get error for a specific field */
  getFieldError: (fieldPath: string) => string | undefined;
  /** Check if a field has been touched */
  isFieldTouched: (fieldPath: string) => boolean;
  /** Mark a field as touched (call on blur) */
  touchField: (fieldPath: string) => void;
  /** Validate entire form data */
  validateForm: (data: unknown) => z.infer<T> | null;
  /** Validate a single field */
  validateField: (fieldPath: string, value: unknown, formData: unknown) => boolean;
  /** Set errors from an API response */
  setApiErrors: (error: unknown) => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Clear error for a specific field */
  clearFieldError: (fieldPath: string) => void;
  /** Reset validation state completely */
  reset: () => void;
}

/**
 * Hook for form validation with Zod schemas
 * Provides field-level error tracking and user-friendly error messages
 */
export function useFormValidation<T extends z.ZodType>(
  options: UseFormValidationOptions<T>
): UseFormValidationReturn<T> {
  const { schema, validateOnBlur = true } = options;

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  const hasErrors = useMemo(() => {
    return formError !== null || Object.keys(fieldErrors).length > 0;
  }, [formError, fieldErrors]);

  const state: FormValidationState = useMemo(
    () => ({
      fieldErrors,
      formError,
      hasErrors,
      isDirty,
      touchedFields,
    }),
    [fieldErrors, formError, hasErrors, isDirty, touchedFields]
  );

  const getFieldError = useCallback(
    (fieldPath: string): string | undefined => {
      return fieldErrors[fieldPath];
    },
    [fieldErrors]
  );

  const isFieldTouched = useCallback(
    (fieldPath: string): boolean => {
      return touchedFields.has(fieldPath);
    },
    [touchedFields]
  );

  const touchField = useCallback((fieldPath: string) => {
    setTouchedFields((prev) => {
      const next = new Set(prev);
      next.add(fieldPath);
      return next;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
  }, []);

  const clearFieldError = useCallback((fieldPath: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[fieldPath];
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
    setIsDirty(false);
    setTouchedFields(new Set());
  }, []);

  const applyFormattedError = useCallback((formatted: FormattedError) => {
    const newFieldErrors: Record<string, string> = {};
    formatted.fieldErrors.forEach((fe: FieldError) => {
      newFieldErrors[fe.path] = fe.message;
    });
    setFieldErrors(newFieldErrors);
    setFormError(formatted.summary);
  }, []);

  const validateForm = useCallback(
    (data: unknown): z.infer<T> | null => {
      setIsDirty(true);

      const result = schema.safeParse(data);

      if (result.success) {
        clearErrors();
        return result.data;
      }

      const formatted = formatError(result.error);
      applyFormattedError(formatted);
      return null;
    },
    [schema, clearErrors, applyFormattedError]
  );

  const validateField = useCallback(
    (fieldPath: string, value: unknown, formData: unknown): boolean => {
      // Only validate if the field has been touched or form is dirty
      if (!validateOnBlur && !isDirty) {
        return true;
      }

      // Create a partial object with the field value for validation
      const dataToValidate = { ...formData as object, [fieldPath]: value };
      const result = schema.safeParse(dataToValidate);

      if (result.success) {
        clearFieldError(fieldPath);
        return true;
      }

      // Find error for this specific field
      const errorMessage = getFieldErrorFromFormatted(result.error, fieldPath);
      if (errorMessage) {
        setFieldErrors((prev) => ({
          ...prev,
          [fieldPath]: errorMessage,
        }));
        return false;
      }

      // No error for this field specifically
      clearFieldError(fieldPath);
      return true;
    },
    [schema, validateOnBlur, isDirty, clearFieldError]
  );

  const setApiErrors = useCallback(
    (error: unknown) => {
      setIsDirty(true);
      const formatted = formatError(error);
      applyFormattedError(formatted);
    },
    [applyFormattedError]
  );

  return {
    state,
    getFieldError,
    isFieldTouched,
    touchField,
    validateForm,
    validateField,
    setApiErrors,
    clearErrors,
    clearFieldError,
    reset,
  };
}

/**
 * Simple hook for tracking form submission errors from API responses
 * Use this when you don't need full form validation, just error display
 */
export function useFormErrors() {
  const [error, setError] = useState<FormattedError | null>(null);

  const setApiError = useCallback((apiError: unknown) => {
    const formatted = formatError(apiError);
    setError(formatted);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getFieldError = useCallback(
    (fieldPath: string): string | undefined => {
      if (!error) return undefined;
      const fieldError = error.fieldErrors.find((fe) => fe.path === fieldPath);
      return fieldError?.message;
    },
    [error]
  );

  return {
    error,
    summary: error?.summary ?? null,
    fieldErrors: error?.fieldErrors ?? [],
    isValidationError: error?.isValidationError ?? false,
    hasError: error !== null,
    setApiError,
    clearError,
    getFieldError,
  };
}
