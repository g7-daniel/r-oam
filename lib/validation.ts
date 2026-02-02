/**
 * Form Validation Utilities
 * Provides common validation functions for forms across the app
 */

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
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) {
    return { isValid: false, error: `Please enter a valid ${fieldName.toLowerCase()}` };
  }
  return { isValid: true };
}

// Future date validation
export function validateFutureDate(date: Date | string | null, fieldName: string): ValidationResult {
  const dateResult = validateDate(date, fieldName);
  if (!dateResult.isValid) return dateResult;

  const d = typeof date === 'string' ? new Date(date) : date!;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Please enter valid dates' };
  }

  if (end <= start) {
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
