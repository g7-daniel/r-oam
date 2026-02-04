import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  formatDate as formatDateUtil,
  formatDateRange as formatDateRangeUtil,
  toDate,
  type DateInput,
  type DateFormatPreset,
} from './date-utils';

/**
 * Combines clsx and tailwind-merge for conditional class merging
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a date for display.
 * Uses the centralized date-utils for timezone-safe formatting.
 *
 * @param date - Date object or ISO string (YYYY-MM-DD)
 * @param options - Either Intl.DateTimeFormatOptions for custom format or DateFormatPreset
 *
 * @example
 * formatDate('2024-01-15')                    // "Jan 15, 2024"
 * formatDate('2024-01-15', 'medium')          // "Mon, Jan 15"
 * formatDate('2024-01-15', { weekday: 'long' }) // "Monday"
 */
export function formatDate(
  date: DateInput,
  options?: Intl.DateTimeFormatOptions | DateFormatPreset
): string {
  const d = toDate(date);
  if (!d) return '';

  // If options is a string preset, use the date-utils formatter
  if (typeof options === 'string') {
    return formatDateUtil(d, options);
  }

  // If options is provided as Intl options, use Intl.DateTimeFormat
  if (options) {
    return d.toLocaleDateString('en-US', options);
  }

  // Default format: "Jan 15, 2024"
  return formatDateUtil(d, 'full');
}

/**
 * Format a date range for display.
 * Uses the centralized date-utils for consistent formatting.
 *
 * @example
 * formatDateRange('2024-01-15', '2024-01-20')  // "Jan 15 - 20, 2024"
 * formatDateRange('2024-01-15', '2024-02-20')  // "Jan 15 - Feb 20, 2024"
 */
export function formatDateRange(start: DateInput, end: DateInput): string {
  return formatDateRangeUtil(start, end);
}

// Re-export date utilities for convenience
export {
  toDate,
  toDateString,
  parseLocalDate,
  getTodayString,
  getToday,
  addDays,
  getNights,
  getDaysBetween,
  getDateForDay,
  isBefore,
  isAfter,
  isSameDay,
  isPast,
  isFuture,
  isToday,
  isWithinRange,
  isValidDateString,
  validateDateRange,
  getItineraryDates,
  getDayLabel,
  getRelativeDate,
  formatTime,
  formatDateIntl,
  startOfDay,
  endOfDay,
} from './date-utils';

export type { DateInput, DateFormatPreset } from './date-utils';

/**
 * Truncate text to a maximum length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Delay execution for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate a random ID
 */
export function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Re-export from geo utils for backwards compatibility
export { calculateHaversineDistance as calculateDistance } from './utils/geo';

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)}km`;
  return `${Math.round(km)}km`;
}

// ============================================================================
// IMAGE FALLBACK UTILITIES
// ============================================================================

/**
 * SVG placeholder data URIs for different content types
 * These are reliable, self-contained fallbacks that don't require external requests
 */
export const PLACEHOLDER_IMAGES = {
  hotel: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="#e2e8f0"/><path d="M20 70h60v5H20zm0-5h60v5H20zm5-25h10v25H25zm15 0h10v25H40zm15 0h10v25H55zm15 0h10v25H70zm-45-5h50v5H25zm5-15h40v15H30zm5 5h30v5H35z" fill="#94a3b8"/></svg>`)}`,
  restaurant: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="#fef3c7"/><path d="M35 25v50M35 25c0-5 5-10 10-5v30h-10m30-25v50m0-50c-5 0-10 5-10 15h10m0 35c5 0 10-5 10-15H65" stroke="#d97706" stroke-width="4" stroke-linecap="round"/></svg>`)}`,
  experience: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="#ede9fe"/><circle cx="50" cy="40" r="15" stroke="#7c3aed" stroke-width="4"/><path d="M50 55v25m-15-10l15 15 15-15" stroke="#7c3aed" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`,
  map: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="#dbeafe"/><path d="M20 25l20 10v40l-20-10zm20 10l20-10v40l-20 10zm20-10l20 10v40l-20-10z" stroke="#3b82f6" stroke-width="2" fill="#bfdbfe"/></svg>`)}`,
  generic: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="#f1f5f9"/><rect x="20" y="20" width="60" height="60" rx="5" stroke="#94a3b8" stroke-width="2"/><circle cx="35" cy="35" r="5" fill="#94a3b8"/><path d="M20 65l20-20 15 15 10-10 15 15v15H20z" fill="#cbd5e1"/></svg>`)}`,
  airline: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" fill="#f0f9ff"/><path d="M50 20l30 50H20z" fill="#0ea5e9"/><path d="M35 70h30v10H35z" fill="#0ea5e9"/></svg>`)}`,
} as const;

export type PlaceholderType = keyof typeof PLACEHOLDER_IMAGES;

/**
 * Get a placeholder image URL for a specific content type
 */
export function getPlaceholderImage(type: PlaceholderType = 'generic'): string {
  return PLACEHOLDER_IMAGES[type] || PLACEHOLDER_IMAGES.generic;
}

/**
 * Handle image error by replacing src with a placeholder
 * This maintains the image element and prevents layout shift
 */
export function handleImageError(
  e: React.SyntheticEvent<HTMLImageElement>,
  type: PlaceholderType = 'generic'
): void {
  const target = e.currentTarget;
  // Prevent infinite error loops
  if (target.dataset.fallbackApplied === 'true') return;
  target.dataset.fallbackApplied = 'true';
  target.src = getPlaceholderImage(type);
}
