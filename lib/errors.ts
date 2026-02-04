/**
 * Centralized error handling utilities for the Roam app
 * Provides consistent error messages, logging, and user-friendly error handling
 */

import { NextResponse } from 'next/server';

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Custom error class for API errors with user-friendly messages
 */
export class APIError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly userMessage: string;
  public readonly details?: Record<string, unknown>;

  constructor(options: {
    message: string;
    code: string;
    statusCode?: number;
    userMessage?: string;
    details?: Record<string, unknown>;
    cause?: Error;
  }) {
    super(options.message);
    this.name = 'APIError';
    this.code = options.code;
    this.statusCode = options.statusCode || 500;
    this.userMessage = options.userMessage || 'Something went wrong. Please try again.';
    this.details = options.details;
    if (options.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends APIError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      message,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      userMessage: message,
      details,
    });
    this.name = 'ValidationError';
  }
}

/**
 * Error for missing configuration
 */
export class ConfigurationError extends APIError {
  constructor(configName: string) {
    super({
      message: `Missing required configuration: ${configName}`,
      code: 'CONFIGURATION_ERROR',
      statusCode: 500,
      userMessage: 'The service is temporarily unavailable. Please try again later.',
    });
    this.name = 'ConfigurationError';
  }
}

/**
 * Error for external API failures
 */
export class ExternalAPIError extends APIError {
  public readonly apiName: string;

  constructor(apiName: string, originalError?: Error, statusCode?: number) {
    super({
      message: `${apiName} API request failed: ${originalError?.message || 'Unknown error'}`,
      code: 'EXTERNAL_API_ERROR',
      statusCode: statusCode || 502,
      userMessage: `We're having trouble connecting to an external service. Please try again in a moment.`,
      cause: originalError,
    });
    this.name = 'ExternalAPIError';
    this.apiName = apiName;
  }
}

/**
 * Error for rate limiting
 */
export class RateLimitError extends APIError {
  public readonly retryAfterSeconds?: number;

  constructor(retryAfterSeconds?: number) {
    super({
      message: 'Rate limit exceeded',
      code: 'RATE_LIMIT_ERROR',
      statusCode: 429,
      userMessage: 'Too many requests. Please wait a moment and try again.',
    });
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Error for not found resources
 */
export class NotFoundError extends APIError {
  constructor(resource: string) {
    super({
      message: `${resource} not found`,
      code: 'NOT_FOUND',
      statusCode: 404,
      userMessage: `The requested ${resource.toLowerCase()} could not be found.`,
    });
    this.name = 'NotFoundError';
  }
}

// ============================================================================
// ERROR CODES AND MESSAGES
// ============================================================================

/**
 * Standard error codes with user-friendly messages
 */
export const ERROR_MESSAGES: Record<string, { userMessage: string; logLevel: 'error' | 'warn' | 'info' }> = {
  // Validation errors
  MISSING_DESTINATION: {
    userMessage: 'Please enter a destination to continue.',
    logLevel: 'warn',
  },
  INVALID_DATES: {
    userMessage: 'Please select valid travel dates.',
    logLevel: 'warn',
  },
  INVALID_BUDGET: {
    userMessage: 'Please enter a valid budget amount.',
    logLevel: 'warn',
  },
  MISSING_AREAS: {
    userMessage: 'Please select at least one area to stay in.',
    logLevel: 'warn',
  },

  // API configuration errors
  MISSING_API_KEY: {
    userMessage: 'The service is temporarily unavailable. Please try again later.',
    logLevel: 'error',
  },

  // External service errors
  GOOGLE_API_ERROR: {
    userMessage: 'Unable to fetch location data. Please try again.',
    logLevel: 'error',
  },
  REDDIT_API_ERROR: {
    userMessage: 'Unable to fetch recommendations. Showing alternative results.',
    logLevel: 'warn',
  },
  LLM_API_ERROR: {
    userMessage: 'Our AI assistant is temporarily unavailable. Please try again.',
    logLevel: 'error',
  },
  HOTEL_API_ERROR: {
    userMessage: 'Unable to fetch hotel information. Please try again.',
    logLevel: 'error',
  },

  // Network errors
  NETWORK_TIMEOUT: {
    userMessage: 'The request took too long. Please check your connection and try again.',
    logLevel: 'warn',
  },
  NETWORK_ERROR: {
    userMessage: 'Unable to connect. Please check your internet connection.',
    logLevel: 'warn',
  },

  // Generic errors
  UNKNOWN_ERROR: {
    userMessage: 'Something went wrong. Please try again.',
    logLevel: 'error',
  },
};

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Log an error with consistent formatting
 */
export function logError(
  context: string,
  error: unknown,
  additionalInfo?: Record<string, unknown>
): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`[${timestamp}] [${context}] Error:`, {
    message: errorMessage,
    stack: errorStack,
    ...additionalInfo,
  });

  // Log additional details for APIError
  if (error instanceof APIError) {
    console.error(`  Code: ${error.code}, Status: ${error.statusCode}`);
    if (error.details) {
      console.error('  Details:', error.details);
    }
  }
}

/**
 * Get a user-friendly error message from an error
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof APIError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    // Check for common error patterns
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return ERROR_MESSAGES.NETWORK_TIMEOUT.userMessage;
    }
    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_MESSAGES.NETWORK_ERROR.userMessage;
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
  }

  return ERROR_MESSAGES.UNKNOWN_ERROR.userMessage;
}

/**
 * Create a standardized error response for API routes
 */
export function createErrorResponse(
  error: unknown,
  context: string
): NextResponse {
  logError(context, error);

  const userMessage = getUserFriendlyMessage(error);

  if (error instanceof APIError) {
    return NextResponse.json(
      {
        error: error.code,
        message: userMessage,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof Error && error.message.includes('Rate limit')) {
    return NextResponse.json(
      { error: 'RATE_LIMIT', message: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  return NextResponse.json(
    { error: 'INTERNAL_ERROR', message: userMessage },
    { status: 500 }
  );
}

/**
 * Check if an error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof RateLimitError) return true;

  const message = error instanceof Error ? error.message : String(error);
  return (
    message.toLowerCase().includes('rate limit') ||
    message.includes('429') ||
    message.toLowerCase().includes('too many requests') ||
    message.toLowerCase().includes('quota')
  );
}

/**
 * Check if an error is a network/timeout error
 */
export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.toLowerCase().includes('timeout') ||
    message.toLowerCase().includes('network') ||
    message.toLowerCase().includes('fetch') ||
    message.toLowerCase().includes('econnrefused') ||
    message.toLowerCase().includes('enotfound')
  );
}

// ============================================================================
// TRY-CATCH WRAPPERS
// ============================================================================

/**
 * Wrapper for async functions that provides consistent error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string,
  options?: {
    fallbackValue?: T;
    rethrow?: boolean;
    onError?: (error: unknown) => void;
  }
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(context, error);

    if (options?.onError) {
      options.onError(error);
    }

    if (options?.rethrow) {
      throw error;
    }

    if (options?.fallbackValue !== undefined) {
      return options.fallbackValue;
    }

    throw new APIError({
      message: error instanceof Error ? error.message : String(error),
      code: 'OPERATION_FAILED',
      userMessage: getUserFriendlyMessage(error),
      cause: error instanceof Error ? error : undefined,
    });
  }
}

/**
 * Wrapper specifically for API route handlers
 */
export async function withAPIErrorHandling<T>(
  fn: () => Promise<NextResponse<T>>,
  context: string
): Promise<NextResponse> {
  try {
    return await fn();
  } catch (error) {
    return createErrorResponse(error, context);
  }
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Assert that a required value exists
 */
export function assertRequired<T>(
  value: T | null | undefined,
  fieldName: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`);
  }
}

/**
 * Assert that an array is not empty
 */
export function assertNotEmpty<T>(
  array: T[] | null | undefined,
  fieldName: string
): asserts array is T[] {
  if (!array || array.length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`);
  }
}

/**
 * Validate coordinates are within valid ranges
 */
export function assertValidCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
  fieldName: string = 'Coordinates'
): void {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    throw new ValidationError(`${fieldName} are required`);
  }
  if (lat < -90 || lat > 90) {
    throw new ValidationError(`${fieldName}: latitude must be between -90 and 90`);
  }
  if (lng < -180 || lng > 180) {
    throw new ValidationError(`${fieldName}: longitude must be between -180 and 180`);
  }
  if (lat === 0 && lng === 0) {
    throw new ValidationError(`${fieldName}: null island coordinates (0, 0) are not valid`);
  }
}

// ============================================================================
// FRONTEND ERROR HANDLING
// ============================================================================

/**
 * Parse an API error response and return user-friendly message
 */
export async function parseAPIErrorResponse(response: Response): Promise<string> {
  try {
    const data = await response.json();

    // Check for our standard error format
    if (data.message && typeof data.message === 'string') {
      return data.message;
    }

    // Check for error field
    if (data.error && typeof data.error === 'string') {
      // Don't show internal error codes to users
      const errorMessages = ERROR_MESSAGES[data.error as keyof typeof ERROR_MESSAGES];
      if (errorMessages) {
        return errorMessages.userMessage;
      }
      // If it looks like a user message (not all caps, has spaces), use it
      if (!/^[A-Z_]+$/.test(data.error)) {
        return data.error;
      }
    }

    // Fallback based on status code
    return getMessageForStatusCode(response.status);
  } catch {
    // If we can't parse the response, use status-based message
    return getMessageForStatusCode(response.status);
  }
}

/**
 * Get a user-friendly message for an HTTP status code
 */
export function getMessageForStatusCode(status: number): string {
  const statusMessages: Record<number, string> = {
    400: 'The request was invalid. Please check your input and try again.',
    401: 'Please sign in to continue.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested information could not be found.',
    408: 'The request took too long. Please try again.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'Something went wrong on our end. Please try again.',
    502: 'We are having trouble connecting to our services. Please try again.',
    503: 'The service is temporarily unavailable. Please try again later.',
    504: 'The request timed out. Please try again.',
  };

  return statusMessages[status] || 'An unexpected error occurred. Please try again.';
}

/**
 * Safely fetch with timeout and error handling
 * Returns { data, error } - only one will be set
 */
export async function safeFetch<T>(
  url: string,
  options?: RequestInit & { timeoutMs?: number },
  context?: string
): Promise<{ data: T | null; error: string | null }> {
  const { timeoutMs = 30000, ...fetchOptions } = options || {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorMessage = await parseAPIErrorResponse(response);
      if (context) {
        logError(context, new Error(`HTTP ${response.status}: ${errorMessage}`));
      }
      return { data: null, error: errorMessage };
    }

    const data = await response.json() as T;
    return { data, error: null };
  } catch (error) {
    clearTimeout(timeoutId);

    if (context) {
      logError(context, error);
    }

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      return { data: null, error: 'The request took too long. Please try again.' };
    }

    // Handle other errors
    return { data: null, error: getUserFriendlyMessage(error) };
  }
}

/**
 * Execute an async operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: {
    maxRetries?: number;
    delayMs?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown) => boolean;
    context?: string;
  }
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    shouldRetry = isRetryableError,
    context = 'withRetry',
  } = options || {};

  let lastError: unknown;
  let currentDelay = delayMs;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries - 1 && shouldRetry(error)) {
        logError(context, error, { attempt: attempt + 1, nextRetryMs: currentDelay });
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        currentDelay *= backoffMultiplier;
      }
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable (network issues, rate limits with backoff, etc.)
 */
export function isRetryableError(error: unknown): boolean {
  // Network errors are retryable
  if (isNetworkError(error)) {
    return true;
  }

  // Rate limit errors should be retried with backoff
  if (isRateLimitError(error)) {
    return true;
  }

  // 5xx errors are often transient
  if (error instanceof APIError && error.statusCode >= 500) {
    return true;
  }

  return false;
}

// ============================================================================
// ERROR BOUNDARY HELPERS
// ============================================================================

/**
 * Format error for error boundary display
 */
export interface FormattedError {
  title: string;
  message: string;
  canRetry: boolean;
  showRefresh: boolean;
}

/**
 * Format an error for display in error boundaries
 */
export function formatErrorForBoundary(error: Error & { digest?: string }): FormattedError {
  // Check for specific error types
  if (isNetworkError(error)) {
    return {
      title: 'Connection Problem',
      message: 'We are having trouble connecting. Please check your internet connection and try again.',
      canRetry: true,
      showRefresh: true,
    };
  }

  if (isRateLimitError(error)) {
    return {
      title: 'Too Many Requests',
      message: 'We are processing a lot of requests right now. Please wait a moment and try again.',
      canRetry: true,
      showRefresh: false,
    };
  }

  // Check for specific error messages
  const lowerMessage = error.message.toLowerCase();

  if (lowerMessage.includes('chunk') || lowerMessage.includes('loading')) {
    return {
      title: 'Loading Error',
      message: 'There was a problem loading part of the page. Please refresh to try again.',
      canRetry: false,
      showRefresh: true,
    };
  }

  if (lowerMessage.includes('hydration')) {
    return {
      title: 'Display Error',
      message: 'There was a problem displaying the page. Please refresh to fix it.',
      canRetry: false,
      showRefresh: true,
    };
  }

  // Default error
  return {
    title: 'Something Went Wrong',
    message: error.message || 'An unexpected error occurred. Please try again.',
    canRetry: true,
    showRefresh: true,
  };
}
