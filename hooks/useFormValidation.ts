'use client';

import { useState, useCallback, useMemo } from 'react';
import type { ValidationResult } from '@/lib/validation';

// ============================================================================
// TYPES
// ============================================================================

export interface FieldState<T = unknown> {
  value: T;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

export interface FormState {
  [fieldName: string]: FieldState;
}

export interface ValidationConfig {
  validate: (value: unknown) => ValidationResult;
  required?: boolean;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface UseFormValidationOptions {
  /** Whether to validate on blur (default: true) */
  validateOnBlur?: boolean;
  /** Whether to validate on change (default: false for performance) */
  validateOnChange?: boolean;
  /** Whether to show errors only after field is touched (default: true) */
  showErrorsOnlyWhenTouched?: boolean;
}

export interface UseFormValidationReturn<T extends Record<string, unknown>> {
  /** Current form values */
  values: T;
  /** Current errors by field */
  errors: Record<keyof T, string | null>;
  /** Which fields have been touched */
  touched: Record<keyof T, boolean>;
  /** Whether the entire form is valid */
  isValid: boolean;
  /** Whether any field has been modified */
  isDirty: boolean;
  /** Set a field's value */
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Set a field as touched (e.g., on blur) */
  setTouched: (field: keyof T) => void;
  /** Validate a single field */
  validateField: (field: keyof T) => ValidationResult;
  /** Validate all fields */
  validateAll: () => boolean;
  /** Reset form to initial values */
  reset: () => void;
  /** Get field props for easy binding */
  getFieldProps: (field: keyof T) => {
    value: T[keyof T];
    error: string | null;
    touched: boolean;
    onBlur: () => void;
  };
  /** Get error display props */
  getErrorProps: (field: keyof T) => {
    error: string | null;
    show: boolean;
  };
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useFormValidation<T extends Record<string, unknown>>(
  initialValues: T,
  validators: Partial<Record<keyof T, ValidationConfig>>,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn<T> {
  const {
    validateOnBlur = true,
    validateOnChange = false,
    showErrorsOnlyWhenTouched = true,
  } = options;

  // Form state
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string | null>>(
    {} as Record<keyof T, string | null>
  );
  const [touched, setTouchedState] = useState<Record<keyof T, boolean>>(
    {} as Record<keyof T, boolean>
  );
  const [dirty, setDirty] = useState<Record<keyof T, boolean>>(
    {} as Record<keyof T, boolean>
  );

  // Validate a single field
  const validateField = useCallback(
    (field: keyof T): ValidationResult => {
      const validator = validators[field];
      if (!validator) {
        return { isValid: true };
      }

      const value = values[field];
      const result = validator.validate(value);

      setErrors((prev) => ({
        ...prev,
        [field]: result.error || null,
      }));

      return result;
    },
    [values, validators]
  );

  // Set a field's value
  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues((prev) => ({
        ...prev,
        [field]: value,
      }));

      setDirty((prev) => ({
        ...prev,
        [field]: true,
      }));

      // Validate on change if enabled
      if (validateOnChange) {
        const validator = validators[field];
        if (validator) {
          const result = validator.validate(value);
          setErrors((prev) => ({
            ...prev,
            [field]: result.error || null,
          }));
        }
      } else {
        // Clear error when user starts typing (better UX)
        setErrors((prev) => ({
          ...prev,
          [field]: null,
        }));
      }
    },
    [validateOnChange, validators]
  );

  // Mark a field as touched
  const setTouched = useCallback(
    (field: keyof T) => {
      setTouchedState((prev) => ({
        ...prev,
        [field]: true,
      }));

      // Validate on blur if enabled
      if (validateOnBlur) {
        validateField(field);
      }
    },
    [validateOnBlur, validateField]
  );

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    let allValid = true;
    const newErrors: Record<string, string | null> = {};
    const newTouched: Record<string, boolean> = {};

    for (const field of Object.keys(validators) as Array<keyof T>) {
      const validator = validators[field];
      if (validator) {
        const result = validator.validate(values[field]);
        newErrors[field as string] = result.error || null;
        newTouched[field as string] = true;
        if (!result.isValid) {
          allValid = false;
        }
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrors } as Record<keyof T, string | null>));
    setTouchedState((prev) => ({ ...prev, ...newTouched } as Record<keyof T, boolean>));

    return allValid;
  }, [values, validators]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({} as Record<keyof T, string | null>);
    setTouchedState({} as Record<keyof T, boolean>);
    setDirty({} as Record<keyof T, boolean>);
  }, [initialValues]);

  // Calculate if form is valid
  const isValid = useMemo(() => {
    for (const field of Object.keys(validators) as Array<keyof T>) {
      const validator = validators[field];
      if (validator) {
        const result = validator.validate(values[field]);
        if (!result.isValid) {
          return false;
        }
      }
    }
    return true;
  }, [values, validators]);

  // Calculate if form is dirty
  const isDirty = useMemo(() => {
    return Object.values(dirty).some(Boolean);
  }, [dirty]);

  // Get field props helper
  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field],
      error: errors[field] || null,
      touched: touched[field] || false,
      onBlur: () => setTouched(field),
    }),
    [values, errors, touched, setTouched]
  );

  // Get error display props
  const getErrorProps = useCallback(
    (field: keyof T) => {
      const error = errors[field] || null;
      const isTouched = touched[field] || false;
      const show = showErrorsOnlyWhenTouched ? (error !== null && isTouched) : error !== null;

      return {
        error,
        show,
      };
    },
    [errors, touched, showErrorsOnlyWhenTouched]
  );

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setValue,
    setTouched,
    validateField,
    validateAll,
    reset,
    getFieldProps,
    getErrorProps,
  };
}

// ============================================================================
// SIMPLE FIELD VALIDATION HOOK (for single fields)
// ============================================================================

export interface UseFieldValidationOptions {
  validate: (value: unknown) => ValidationResult;
  validateOnBlur?: boolean;
  validateOnChange?: boolean;
}

export interface UseFieldValidationReturn<T> {
  value: T;
  error: string | null;
  touched: boolean;
  isValid: boolean;
  setValue: (value: T) => void;
  onBlur: () => void;
  validate: () => ValidationResult;
  reset: (newValue?: T) => void;
}

export function useFieldValidation<T>(
  initialValue: T,
  options: UseFieldValidationOptions
): UseFieldValidationReturn<T> {
  const { validate, validateOnBlur = true, validateOnChange = false } = options;

  const [value, setValueState] = useState<T>(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const validateValue = useCallback(
    (val: T = value): ValidationResult => {
      const result = validate(val);
      setError(result.error || null);
      return result;
    },
    [value, validate]
  );

  const setValue = useCallback(
    (newValue: T) => {
      setValueState(newValue);

      if (validateOnChange) {
        const result = validate(newValue);
        setError(result.error || null);
      } else {
        // Clear error when user types (will re-validate on blur)
        setError(null);
      }
    },
    [validate, validateOnChange]
  );

  const onBlur = useCallback(() => {
    setTouched(true);
    if (validateOnBlur) {
      validateValue();
    }
  }, [validateOnBlur, validateValue]);

  const reset = useCallback(
    (newValue?: T) => {
      setValueState(newValue ?? initialValue);
      setError(null);
      setTouched(false);
    },
    [initialValue]
  );

  const isValid = error === null;

  return {
    value,
    error,
    touched,
    isValid,
    setValue,
    onBlur,
    validate: validateValue,
    reset,
  };
}

export default useFormValidation;
