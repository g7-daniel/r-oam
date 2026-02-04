/**
 * Centralized Date Utilities
 *
 * This module provides consistent date handling across the entire application.
 *
 * CONVENTIONS:
 * - Storage: Always use ISO format (YYYY-MM-DD) for dates stored in state or sent to APIs
 * - Display: Use the formatting functions for user-facing date strings
 * - Parsing: Always use timezone-safe parsing to avoid off-by-one errors
 *
 * TIMEZONE HANDLING:
 * - We parse date strings as local dates (not UTC) to avoid timezone shifts
 * - When creating Date objects from YYYY-MM-DD strings, we set time to noon
 *   to avoid any potential date boundary issues
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/** Days of the week, starting from Sunday */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/** Short day names */
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/** Month names */
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

/** Short month names */
export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Valid date input: Date object, ISO string, or null/undefined */
export type DateInput = Date | string | null | undefined;

/** Date format presets for display */
export type DateFormatPreset =
  | 'short'           // "Jan 15"
  | 'medium'          // "Mon, Jan 15"
  | 'long'            // "Monday, January 15, 2024"
  | 'iso'             // "2024-01-15"
  | 'monthYear'       // "January 2024"
  | 'dayMonth'        // "15 Jan"
  | 'full'            // "January 15, 2024"
  | 'time'            // "2:30 PM"
  | 'time24';         // "14:30"

// ============================================================================
// PARSING UTILITIES
// ============================================================================

/**
 * Parse a date string (YYYY-MM-DD) into a Date object WITHOUT timezone conversion.
 * Sets time to noon local time to avoid date boundary issues.
 *
 * @example
 * parseLocalDate('2024-01-15') // Date object for Jan 15, 2024 at 12:00:00 local
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) {
    throw new Error('Date string is required');
  }

  // Handle ISO date strings (YYYY-MM-DD)
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1; // JS months are 0-indexed
    const day = parseInt(dayStr, 10);

    // Create date at noon to avoid timezone boundary issues
    return new Date(year, month, day, 12, 0, 0, 0);
  }

  // Fallback: try native Date parsing
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return date;
}

/**
 * Safely convert any date input to a Date object.
 * Returns null if input is invalid or null/undefined.
 *
 * @example
 * toDate('2024-01-15')     // Date object
 * toDate(new Date())       // Same Date object
 * toDate(null)             // null
 * toDate('invalid')        // null
 */
export function toDate(value: DateInput): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  try {
    return parseLocalDate(value);
  } catch {
    return null;
  }
}

/**
 * Convert a Date to an ISO string without timezone conversion.
 * Returns null if date is invalid.
 *
 * @example
 * toDateString(new Date(2024, 0, 15)) // "2024-01-15"
 */
export function toDateString(date: DateInput): string | null {
  const d = toDate(date);
  if (!d) return null;

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as an ISO string (YYYY-MM-DD).
 */
export function getTodayString(): string {
  return toDateString(new Date()) as string;
}

/**
 * Get today's date at midnight local time.
 */
export function getToday(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

// ============================================================================
// FORMATTING UTILITIES
// ============================================================================

/**
 * Format a date for display using a preset format.
 * All formats are timezone-safe and consistent across the app.
 *
 * @example
 * formatDate('2024-01-15', 'short')   // "Jan 15"
 * formatDate('2024-01-15', 'medium')  // "Mon, Jan 15"
 * formatDate('2024-01-15', 'long')    // "Monday, January 15, 2024"
 * formatDate('2024-01-15', 'iso')     // "2024-01-15"
 */
export function formatDate(date: DateInput, format: DateFormatPreset = 'medium'): string {
  const d = toDate(date);
  if (!d) return '';

  const day = d.getDate();
  const dayOfWeek = d.getDay();
  const month = d.getMonth();
  const year = d.getFullYear();
  const hours = d.getHours();
  const minutes = d.getMinutes();

  switch (format) {
    case 'short':
      // "Jan 15"
      return `${MONTH_NAMES_SHORT[month]} ${day}`;

    case 'medium':
      // "Mon, Jan 15"
      return `${DAY_NAMES_SHORT[dayOfWeek]}, ${MONTH_NAMES_SHORT[month]} ${day}`;

    case 'long':
      // "Monday, January 15, 2024"
      return `${DAY_NAMES[dayOfWeek]}, ${MONTH_NAMES[month]} ${day}, ${year}`;

    case 'iso':
      // "2024-01-15"
      return toDateString(d) || '';

    case 'monthYear':
      // "January 2024"
      return `${MONTH_NAMES[month]} ${year}`;

    case 'dayMonth':
      // "15 Jan"
      return `${day} ${MONTH_NAMES_SHORT[month]}`;

    case 'full':
      // "January 15, 2024"
      return `${MONTH_NAMES[month]} ${day}, ${year}`;

    case 'time':
      // "2:30 PM"
      const hour12 = hours % 12 || 12;
      const ampm = hours < 12 ? 'AM' : 'PM';
      return `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;

    case 'time24':
      // "14:30"
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    default:
      return `${MONTH_NAMES_SHORT[month]} ${day}, ${year}`;
  }
}

/**
 * Format a date using Intl.DateTimeFormat for locale-aware display.
 * Use this when you need more control over the format.
 *
 * @example
 * formatDateIntl('2024-01-15', { weekday: 'long', month: 'long', day: 'numeric' })
 * // "Monday, January 15"
 */
export function formatDateIntl(
  date: DateInput,
  options: Intl.DateTimeFormatOptions,
  locale: string = 'en-US'
): string {
  const d = toDate(date);
  if (!d) return '';

  return d.toLocaleDateString(locale, options);
}

/**
 * Format a date range for display.
 * Intelligently omits redundant information (same year, same month).
 *
 * @example
 * formatDateRange('2024-01-15', '2024-01-20')  // "Jan 15 - 20, 2024"
 * formatDateRange('2024-01-15', '2024-02-20')  // "Jan 15 - Feb 20, 2024"
 * formatDateRange('2024-01-15', '2025-01-20')  // "Jan 15, 2024 - Jan 20, 2025"
 */
export function formatDateRange(
  startDate: DateInput,
  endDate: DateInput,
  options?: {
    showYear?: boolean;
    separator?: string;
  }
): string {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) {
    if (start) return formatDate(start, 'full');
    if (end) return formatDate(end, 'full');
    return '';
  }

  const separator = options?.separator ?? ' - ';
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    // "Jan 15 - 20, 2024"
    return `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()}${separator}${end.getDate()}, ${end.getFullYear()}`;
  }

  if (sameYear) {
    // "Jan 15 - Feb 20, 2024"
    return `${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getDate()}${separator}${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`;
  }

  // "Jan 15, 2024 - Feb 20, 2025"
  return `${formatDate(start, 'full')}${separator}${formatDate(end, 'full')}`;
}

/**
 * Format a time string (HH:MM or HH:MM:SS) for display.
 *
 * @example
 * formatTime('14:30')      // "2:30 PM"
 * formatTime('14:30', true) // "14:30"
 */
export function formatTime(timeString: string, use24Hour: boolean = false): string {
  const match = timeString.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return timeString;

  const hours = parseInt(match[1], 10);
  const minutes = match[2];

  if (use24Hour) {
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  const hour12 = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${hour12}:${minutes} ${ampm}`;
}

// ============================================================================
// DATE CALCULATION UTILITIES
// ============================================================================

/**
 * Add days to a date.
 *
 * @example
 * addDays('2024-01-15', 7)  // Date for Jan 22, 2024
 */
export function addDays(date: DateInput, days: number): Date | null {
  const d = toDate(date);
  if (!d) return null;

  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate the number of nights between two dates.
 *
 * @example
 * getNights('2024-01-15', '2024-01-20')  // 5
 */
export function getNights(startDate: DateInput, endDate: DateInput): number {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) return 0;

  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Calculate the number of days between two dates (inclusive).
 *
 * @example
 * getDaysBetween('2024-01-15', '2024-01-20')  // 6
 */
export function getDaysBetween(startDate: DateInput, endDate: DateInput): number {
  return getNights(startDate, endDate) + 1;
}

/**
 * Get the date that is N days from start date.
 * Useful for calculating itinerary day dates.
 *
 * @example
 * getDateForDay('2024-01-15', 3)  // Date for Jan 18, 2024
 */
export function getDateForDay(startDate: DateInput, dayIndex: number): Date | null {
  return addDays(startDate, dayIndex);
}

/**
 * Get the start of day (midnight) for a given date.
 */
export function startOfDay(date: DateInput): Date | null {
  const d = toDate(date);
  if (!d) return null;

  const result = new Date(d);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of day (23:59:59.999) for a given date.
 */
export function endOfDay(date: DateInput): Date | null {
  const d = toDate(date);
  if (!d) return null;

  const result = new Date(d);
  result.setHours(23, 59, 59, 999);
  return result;
}

// ============================================================================
// COMPARISON UTILITIES
// ============================================================================

/**
 * Check if a date is before another date (comparing only the date, not time).
 */
export function isBefore(date: DateInput, compareDate: DateInput): boolean {
  const d1 = toDate(date);
  const d2 = toDate(compareDate);

  if (!d1 || !d2) return false;

  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());

  return date1 < date2;
}

/**
 * Check if a date is after another date (comparing only the date, not time).
 */
export function isAfter(date: DateInput, compareDate: DateInput): boolean {
  const d1 = toDate(date);
  const d2 = toDate(compareDate);

  if (!d1 || !d2) return false;

  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());

  return date1 > date2;
}

/**
 * Check if two dates are the same day.
 */
export function isSameDay(date1: DateInput, date2: DateInput): boolean {
  const d1 = toDate(date1);
  const d2 = toDate(date2);

  if (!d1 || !d2) return false;

  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Check if a date is in the past (before today).
 */
export function isPast(date: DateInput): boolean {
  return isBefore(date, getToday());
}

/**
 * Check if a date is in the future (after today).
 */
export function isFuture(date: DateInput): boolean {
  return isAfter(date, getToday());
}

/**
 * Check if a date is today.
 */
export function isToday(date: DateInput): boolean {
  return isSameDay(date, getToday());
}

/**
 * Check if a date is within a range (inclusive).
 */
export function isWithinRange(
  date: DateInput,
  startDate: DateInput,
  endDate: DateInput
): boolean {
  const d = toDate(date);
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!d || !start || !end) return false;

  return !isBefore(d, start) && !isAfter(d, end);
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate that a string is a valid date in YYYY-MM-DD format.
 */
export function isValidDateString(dateString: string | null | undefined): boolean {
  if (!dateString) return false;

  // Check format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return false;

  // Check it's a real date
  const date = toDate(dateString);
  if (!date) return false;

  // Verify the date components match (catches invalid dates like 2024-02-30)
  const [year, month, day] = dateString.split('-').map(Number);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Validate a date range.
 */
export function validateDateRange(
  startDate: DateInput,
  endDate: DateInput,
  options?: {
    requireFutureStart?: boolean;
    maxNights?: number;
    minNights?: number;
  }
): { valid: boolean; error?: string } {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start) {
    return { valid: false, error: 'Start date is required' };
  }

  if (!end) {
    return { valid: false, error: 'End date is required' };
  }

  if (!isAfter(end, start)) {
    return { valid: false, error: 'End date must be after start date' };
  }

  if (options?.requireFutureStart && isPast(start)) {
    return { valid: false, error: 'Start date must be in the future' };
  }

  const nights = getNights(start, end);

  if (options?.minNights && nights < options.minNights) {
    return { valid: false, error: `Trip must be at least ${options.minNights} night${options.minNights > 1 ? 's' : ''}` };
  }

  if (options?.maxNights && nights > options.maxNights) {
    return { valid: false, error: `Trip cannot exceed ${options.maxNights} nights` };
  }

  return { valid: true };
}

// ============================================================================
// ITINERARY HELPERS
// ============================================================================

/**
 * Generate an array of dates for an itinerary.
 *
 * @example
 * getItineraryDates('2024-01-15', '2024-01-17')
 * // [Date(Jan 15), Date(Jan 16), Date(Jan 17)]
 */
export function getItineraryDates(startDate: DateInput, endDate: DateInput): Date[] {
  const start = toDate(startDate);
  const end = toDate(endDate);

  if (!start || !end) return [];

  const dates: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Get formatted label for an itinerary day.
 *
 * @example
 * getDayLabel('2024-01-15', 0)  // "Day 1 - Mon, Jan 15"
 */
export function getDayLabel(startDate: DateInput, dayIndex: number): string {
  const date = getDateForDay(startDate, dayIndex);
  if (!date) return `Day ${dayIndex + 1}`;

  return `Day ${dayIndex + 1} - ${formatDate(date, 'medium')}`;
}

// ============================================================================
// RELATIVE DATE HELPERS
// ============================================================================

/**
 * Get a human-readable relative date description.
 *
 * @example
 * getRelativeDate(tomorrow)  // "Tomorrow"
 * getRelativeDate(nextWeek)  // "In 7 days"
 * getRelativeDate(yesterday) // "Yesterday"
 */
export function getRelativeDate(date: DateInput): string {
  const d = toDate(date);
  if (!d) return '';

  const today = getToday();
  const diffDays = getNights(today, d);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;

  return formatDate(d, 'medium');
}
