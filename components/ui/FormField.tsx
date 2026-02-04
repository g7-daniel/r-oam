'use client';

import { ReactNode } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

// ============================================================================
// TYPES
// ============================================================================

export interface FormFieldProps {
  /** Field label */
  label?: string;
  /** Field name for accessibility */
  name: string;
  /** Error message to display */
  error?: string | null;
  /** Whether field has been touched/blurred */
  touched?: boolean;
  /** Whether to show success state when valid */
  showSuccess?: boolean;
  /** Whether field is required */
  required?: boolean;
  /** Helper text below the field */
  helperText?: string;
  /** The form input element(s) */
  children: ReactNode;
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** Whether to show inline error (below field) vs tooltip */
  inlineError?: boolean;
}

// ============================================================================
// FORM FIELD COMPONENT
// ============================================================================

export default function FormField({
  label,
  name,
  error,
  touched = false,
  showSuccess = false,
  required = false,
  helperText,
  children,
  className,
  inlineError = true,
}: FormFieldProps) {
  const hasError = touched && error;
  const isValid = touched && !error && showSuccess;

  return (
    <div className={clsx('space-y-1', className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={name}
          className={clsx(
            'block text-sm font-medium',
            hasError
              ? 'text-red-600 dark:text-red-400'
              : 'text-slate-700 dark:text-slate-300'
          )}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Field content with validation border wrapper */}
      <div className="relative">
        {children}

        {/* Validation icon (absolute positioned) */}
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <AlertCircle className="w-5 h-5 text-red-500" aria-hidden="true" />
          </div>
        )}
        {isValid && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <CheckCircle className="w-5 h-5 text-green-500" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Error message */}
      {inlineError && hasError && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 mt-1"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Helper text (only show when no error) */}
      {helperText && !hasError && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {helperText}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// INLINE ERROR MESSAGE COMPONENT
// ============================================================================

export interface InlineErrorProps {
  /** Error message */
  error?: string | null;
  /** Whether to show the error */
  show?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function InlineError({ error, show = true, className }: InlineErrorProps) {
  if (!error || !show) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={clsx(
        'flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 mt-1.5',
        className
      )}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span>{error}</span>
    </div>
  );
}

// ============================================================================
// VALIDATION INPUT WRAPPER
// ============================================================================

export interface ValidationInputWrapperProps {
  /** Error message */
  error?: string | null;
  /** Whether field has been touched */
  touched?: boolean;
  /** Whether to show success state */
  showSuccess?: boolean;
  /** Children (the input element) */
  children: ReactNode;
  /** Additional classes for the wrapper */
  className?: string;
}

export function ValidationInputWrapper({
  error,
  touched = false,
  showSuccess = false,
  children,
  className,
}: ValidationInputWrapperProps) {
  const hasError = touched && error;
  const isValid = touched && !error && showSuccess;

  return (
    <div className={clsx('relative', className)}>
      {/* Apply validation classes to child input via CSS */}
      <div
        className={clsx(
          '[&>input]:transition-colors [&>input]:duration-200',
          '[&>textarea]:transition-colors [&>textarea]:duration-200',
          '[&>select]:transition-colors [&>select]:duration-200',
          hasError && [
            '[&>input]:border-red-500 [&>input]:focus:border-red-500 [&>input]:focus:ring-red-500',
            '[&>textarea]:border-red-500 [&>textarea]:focus:border-red-500 [&>textarea]:focus:ring-red-500',
            '[&>select]:border-red-500 [&>select]:focus:border-red-500 [&>select]:focus:ring-red-500',
          ],
          isValid && [
            '[&>input]:border-green-500 [&>input]:focus:border-green-500 [&>input]:focus:ring-green-500',
            '[&>textarea]:border-green-500 [&>textarea]:focus:border-green-500 [&>textarea]:focus:ring-green-500',
            '[&>select]:border-green-500 [&>select]:focus:border-green-500 [&>select]:focus:ring-green-500',
          ]
        )}
      >
        {children}
      </div>

      {/* Show error below */}
      <InlineError error={error} show={touched && !!error} />
    </div>
  );
}

// ============================================================================
// CSS CLASS HELPERS
// ============================================================================

/**
 * Get CSS classes for an input based on validation state
 */
export function getInputValidationClasses(
  error: string | null | undefined,
  touched: boolean,
  baseClasses: string = ''
): string {
  if (!touched) return baseClasses;

  if (error) {
    return clsx(
      baseClasses,
      'border-red-500 focus:border-red-500 focus:ring-red-500',
      'pr-10' // Make room for error icon
    );
  }

  return clsx(
    baseClasses,
    'border-green-500 focus:border-green-500 focus:ring-green-500'
  );
}

/**
 * Get CSS classes for a button based on form validity
 */
export function getSubmitButtonClasses(
  isValid: boolean,
  isSubmitting: boolean = false,
  baseClasses: string = ''
): string {
  return clsx(
    baseClasses,
    'transition-all duration-200',
    !isValid && 'opacity-50 cursor-not-allowed',
    isSubmitting && 'opacity-70 cursor-wait'
  );
}
