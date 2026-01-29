'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input, type InputProps } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export interface FormFieldProps {
  /** Field name/id for form binding */
  name: string;
  /** Label text displayed above the input */
  label: string;
  /** Optional helper text displayed below the input */
  helperText?: string;
  /** Error message to display (overrides helperText when present) */
  error?: string;
  /** Show success state */
  success?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Optional character count (current/max) */
  characterCount?: { current: number; max: number };
  /** Additional class name for the wrapper */
  className?: string;
  /** Children to render instead of default input */
  children?: React.ReactNode;
}

export interface FormInputProps extends FormFieldProps, Omit<InputProps, 'name'> {
  /** Input type */
  type?: string;
}

export interface FormTextareaProps extends FormFieldProps {
  /** Textarea value */
  value?: string;
  /** Textarea onChange handler */
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Number of rows */
  rows?: number;
}

/**
 * FormField wrapper component for consistent form field layout with validation display
 */
export function FormField({
  name,
  label,
  helperText,
  error,
  success,
  required,
  disabled,
  characterCount,
  className,
  children,
}: FormFieldProps) {
  const hasError = !!error;
  const showCharacterCount = characterCount && characterCount.max > 0;
  const isOverLimit = showCharacterCount && characterCount.current > characterCount.max;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={name}
          className={cn(
            hasError && 'text-destructive',
            disabled && 'opacity-50'
          )}
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
        {showCharacterCount && (
          <span
            className={cn(
              'text-xs',
              isOverLimit ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {characterCount.current}/{characterCount.max}
          </span>
        )}
      </div>

      {children}

      {/* Error or helper text */}
      <div className="min-h-[20px]">
        {hasError ? (
          <p className="flex items-center gap-1 text-xs text-destructive" role="alert">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>{error}</span>
          </p>
        ) : success ? (
          <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-500">
            <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
            <span>Looks good!</span>
          </p>
        ) : helperText ? (
          <p className="text-xs text-muted-foreground">{helperText}</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * FormInput - Input field with integrated validation display
 */
export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      name,
      label,
      helperText,
      error,
      success,
      required,
      disabled,
      characterCount,
      className,
      type = 'text',
      ...inputProps
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <FormField
        name={name}
        label={label}
        helperText={helperText}
        error={error}
        success={success}
        required={required}
        disabled={disabled}
        characterCount={characterCount}
        className={className}
      >
        <Input
          ref={ref}
          id={name}
          name={name}
          type={type}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : helperText ? `${name}-helper` : undefined}
          className={cn(
            hasError && 'border-destructive focus-visible:ring-destructive',
            success && 'border-green-500 focus-visible:ring-green-500'
          )}
          {...inputProps}
        />
      </FormField>
    );
  }
);
FormInput.displayName = 'FormInput';

/**
 * FormTextarea - Textarea field with integrated validation display
 */
export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      name,
      label,
      helperText,
      error,
      success,
      required,
      disabled,
      characterCount,
      className,
      value,
      onChange,
      placeholder,
      rows = 3,
    },
    ref
  ) => {
    const hasError = !!error;

    return (
      <FormField
        name={name}
        label={label}
        helperText={helperText}
        error={error}
        success={success}
        required={required}
        disabled={disabled}
        characterCount={characterCount}
        className={className}
      >
        <Textarea
          ref={ref}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${name}-error` : helperText ? `${name}-helper` : undefined}
          className={cn(
            hasError && 'border-destructive focus-visible:ring-destructive',
            success && 'border-green-500 focus-visible:ring-green-500'
          )}
        />
      </FormField>
    );
  }
);
FormTextarea.displayName = 'FormTextarea';

/**
 * FormSelect wrapper - Use with Select component
 */
export function FormSelect({
  name,
  label,
  helperText,
  error,
  success,
  required,
  disabled,
  className,
  children,
}: FormFieldProps) {
  return (
    <FormField
      name={name}
      label={label}
      helperText={helperText}
      error={error}
      success={success}
      required={required}
      disabled={disabled}
      className={className}
    >
      {children}
    </FormField>
  );
}
