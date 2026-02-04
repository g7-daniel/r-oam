/**
 * Form Validation Utilities
 * Provides common validation functions for forms across the app
 */

import { toDate, isAfter, getToday, getNights } from './date-utils';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation
export function validateEmail(email: string): ValidationResult {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  return { isValid: true };
}

// Required field validation
export function validateRequired(value: string | number | null | undefined, fieldName: string): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

// Minimum length validation
export function validateMinLength(value: string, minLength: number, fieldName: string): ValidationResult {
  if (!value || value.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  return { isValid: true };
}

// Maximum length validation
export function validateMaxLength(value: string, maxLength: number, fieldName: string): ValidationResult {
  if (value && value.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be less than ${maxLength} characters` };
  }
  return { isValid: true };
}

// Number range validation
export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }
  if (value < min || value > max) {
    return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  return { isValid: true };
}

// Date validation
export function validateDate(date: Date | string | null, fieldName: string): ValidationResult {
  if (!date) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  const d = toDate(date);
  if (!d) {
    return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }
  return { isValid: true };
}

// Future date validation
export function validateFutureDate(date: Date | string | null, fieldName: string): ValidationResult {
  const dateResult = validateDate(date, fieldName);
  if (!dateResult.isValid) return dateResult;

  const d = toDate(date);
  if (!d) {
    return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }

  const today = getToday();
  if (d < today) {
    return { isValid: false, error: `${fieldName} must be in the future` };
  }
  return { isValid: true };
}

// Date range validation
export function validateDateRange(
  startDate: Date | string | null,
  endDate: Date | string | null
): ValidationResult {
  if (!startDate || !endDate) {
    return { isValid: false, error: 'Both start and end dates are required' };
  }

  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) {
    return { isValid: false, error: 'Please enter valid dates' };
  }

  if (!isAfter(end, start)) {
    return { isValid: false, error: 'End date must be after start date' };
  }

  return { isValid: true };
}

// Budget validation
export function validateBudget(min: number, max: number): ValidationResult {
  if (isNaN(min) || isNaN(max)) {
    return { isValid: false, error: 'Budget must be a number' };
  }
  if (min < 0 || max < 0) {
    return { isValid: false, error: 'Budget cannot be negative' };
  }
  if (min > max) {
    return { isValid: false, error: 'Minimum budget cannot exceed maximum budget' };
  }
  return { isValid: true };
}

// Travelers validation
export function validateTravelers(adults: number, children: number = 0): ValidationResult {
  if (adults < 1) {
    return { isValid: false, error: 'At least 1 adult is required' };
  }
  if (adults > 10) {
    return { isValid: false, error: 'Maximum 10 adults allowed' };
  }
  if (children < 0) {
    return { isValid: false, error: 'Number of children cannot be negative' };
  }
  if (children > 10) {
    return { isValid: false, error: 'Maximum 10 children allowed' };
  }
  if (adults + children > 15) {
    return { isValid: false, error: 'Maximum 15 travelers allowed' };
  }
  return { isValid: true };
}

// Destination validation
export function validateDestination(destination: string | null | undefined): ValidationResult {
  if (!destination || destination.trim() === '') {
    return { isValid: false, error: 'Please select a destination' };
  }
  if (destination.length < 2) {
    return { isValid: false, error: 'Destination name is too short' };
  }
  return { isValid: true };
}

// Trip length validation
export function validateTripLength(nights: number): ValidationResult {
  if (isNaN(nights) || nights < 1) {
    return { isValid: false, error: 'Trip must be at least 1 night' };
  }
  if (nights > 60) {
    return { isValid: false, error: 'Trip cannot exceed 60 nights' };
  }
  return { isValid: true };
}

// Combine multiple validations
export function validateAll(validations: ValidationResult[]): ValidationResult {
  for (const validation of validations) {
    if (!validation.isValid) {
      return validation;
    }
  }
  return { isValid: true };
}

// Quick Plan preferences validation
export function validateQuickPlanPreferences(prefs: {
  destination?: string | null;
  tripLength?: number;
  adults?: number;
  children?: number;
  budgetMin?: number;
  budgetMax?: number;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
}): ValidationResult {
  // Destination is required
  const destResult = validateDestination(prefs.destination);
  if (!destResult.isValid) return destResult;

  // Either trip length or dates required
  if (!prefs.tripLength && (!prefs.startDate || !prefs.endDate)) {
    return { isValid: false, error: 'Please specify trip dates or length' };
  }

  // Validate trip length if provided
  if (prefs.tripLength) {
    const lengthResult = validateTripLength(prefs.tripLength);
    if (!lengthResult.isValid) return lengthResult;
  }

  // Validate dates if provided
  if (prefs.startDate && prefs.endDate) {
    const dateResult = validateDateRange(prefs.startDate, prefs.endDate);
    if (!dateResult.isValid) return dateResult;
  }

  // Validate travelers
  const travelerResult = validateTravelers(prefs.adults || 2, prefs.children || 0);
  if (!travelerResult.isValid) return travelerResult;

  // Validate budget if provided
  if (prefs.budgetMin !== undefined && prefs.budgetMax !== undefined) {
    const budgetResult = validateBudget(prefs.budgetMin, prefs.budgetMax);
    if (!budgetResult.isValid) return budgetResult;
  }

  return { isValid: true };
}

// ============================================================================
// FORM FIELD STATE TYPES
// ============================================================================

export interface FieldState {
  value: unknown;
  error: string | null;
  touched: boolean;
  dirty: boolean;
  isValidating: boolean;
}

export interface FormFieldsState {
  [fieldName: string]: FieldState;
}

// ============================================================================
// FIELD-SPECIFIC VALIDATORS FOR QUICK PLAN
// ============================================================================

export const quickPlanValidators = {
  destination: (value: unknown): ValidationResult => {
    if (!value) {
      return { isValid: false, error: 'Please select where you want to go' };
    }
    const dest = value as { canonicalName?: string; rawInput?: string };
    if (!dest.canonicalName && !dest.rawInput) {
      return { isValid: false, error: 'Please select a destination from the suggestions' };
    }
    return { isValid: true };
  },

  dateRange: (value: unknown): ValidationResult => {
    if (!value) {
      return { isValid: false, error: 'Please select your travel dates' };
    }
    const dates = value as { startDate?: Date | string; endDate?: Date | string; nights?: number };
    if (!dates.startDate) {
      return { isValid: false, error: 'Please select a start date' };
    }
    if (!dates.endDate) {
      return { isValid: false, error: 'Please select an end date' };
    }
    if (dates.nights !== undefined && dates.nights < 1) {
      return { isValid: false, error: 'Your trip must be at least 1 night' };
    }
    if (dates.nights !== undefined && dates.nights > 60) {
      return { isValid: false, error: 'Trip cannot exceed 60 nights' };
    }
    return { isValid: true };
  },

  party: (value: unknown): ValidationResult => {
    if (!value) {
      return { isValid: false, error: 'Please specify your travel party' };
    }
    const party = value as { adults?: number; children?: number };
    if (!party.adults || party.adults < 1) {
      return { isValid: false, error: 'At least one adult traveler is required' };
    }
    if (party.adults > 20) {
      return { isValid: false, error: 'Maximum 20 adults per booking' };
    }
    if (party.children && party.children > 10) {
      return { isValid: false, error: 'Maximum 10 children per booking' };
    }
    return { isValid: true };
  },

  budget: (value: unknown): ValidationResult => {
    if (value === undefined || value === null) {
      return { isValid: false, error: 'Please set your budget preference' };
    }
    const budget = value as { value?: number; min?: number; max?: number };
    const budgetValue = budget.value ?? budget.min ?? 0;
    if (budgetValue < 25) {
      return { isValid: false, error: 'Budget must be at least $25 per night' };
    }
    return { isValid: true };
  },

  activities: (value: unknown): ValidationResult => {
    if (!value || !Array.isArray(value)) {
      return { isValid: false, error: 'Please select at least one activity' };
    }
    if (value.length === 0) {
      return { isValid: false, error: 'Select at least one activity you\'d like to do' };
    }
    return { isValid: true };
  },

  areas: (value: unknown): ValidationResult => {
    if (!value || !Array.isArray(value)) {
      return { isValid: false, error: 'Please select at least one area' };
    }
    if (value.length === 0) {
      return { isValid: false, error: 'Select at least one area to explore' };
    }
    if (value.length > 5) {
      return { isValid: false, error: 'Select up to 5 areas for a balanced trip' };
    }
    return { isValid: true };
  },

  hotel: (value: unknown): ValidationResult => {
    if (!value) {
      return { isValid: false, error: 'Please select a hotel' };
    }
    return { isValid: true };
  },

  restaurants: (value: unknown): ValidationResult => {
    if (!value || !Array.isArray(value)) {
      return { isValid: true }; // Optional
    }
    return { isValid: true };
  },

  experiences: (value: unknown): ValidationResult => {
    if (!value || !Array.isArray(value)) {
      return { isValid: true }; // Optional
    }
    return { isValid: true };
  },

  text: (value: unknown, options?: { minLength?: number; maxLength?: number; required?: boolean }): ValidationResult => {
    const text = (value as string) || '';

    if (options?.required && text.trim() === '') {
      return { isValid: false, error: 'This field is required' };
    }

    if (text && options?.minLength && text.length < options.minLength) {
      return { isValid: false, error: `Please enter at least ${options.minLength} characters` };
    }

    if (text && options?.maxLength && text.length > options.maxLength) {
      return { isValid: false, error: `Please keep under ${options.maxLength} characters` };
    }

    return { isValid: true };
  },
};

// ============================================================================
// VALIDATION ERROR DISPLAY HELPERS
// ============================================================================

/**
 * Gets CSS classes for field validation state
 */
export function getValidationClasses(
  error: string | null,
  touched: boolean,
  baseClasses: string = ''
): string {
  if (!touched) return baseClasses;

  if (error) {
    return `${baseClasses} border-red-500 focus:border-red-500 focus:ring-red-500`;
  }

  return `${baseClasses} border-green-500 focus:border-green-500 focus:ring-green-500`;
}

/**
 * Gets inline error classes for displaying error messages
 */
export function getErrorMessageClasses(): string {
  return 'text-sm text-red-600 dark:text-red-400 mt-1 flex items-center gap-1';
}

/**
 * Get field label with proper formatting
 */
export function getFieldDisplayName(fieldName: string): string {
  const labels: Record<string, string> = {
    destination: 'Destination',
    dates: 'Travel dates',
    dateRange: 'Travel dates',
    startDate: 'Start date',
    endDate: 'End date',
    party: 'Travel party',
    adults: 'Number of adults',
    children: 'Number of children',
    budget: 'Budget',
    activities: 'Activities',
    pace: 'Trip pace',
    areas: 'Areas to visit',
    hotels: 'Hotel',
    restaurants: 'Restaurants',
    experiences: 'Experiences',
    cuisinePreferences: 'Cuisine preferences',
    dining: 'Dining preferences',
    hotelPreferences: 'Hotel preferences',
  };

  return labels[fieldName] || fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1');
}
