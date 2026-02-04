/**
 * Retry utilities with exponential backoff
 * For use with external API calls that may fail transiently
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;
  /** Add random jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Function to determine if error is retryable (default: retry on 429 and 5xx) */
  isRetryable?: (error: unknown) => boolean;
  /** Called on each retry with retry count and delay */
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  isRetryable: defaultIsRetryable,
  onRetry: () => {},
};

/**
 * Default function to determine if an error is retryable
 * Retries on rate limits (429) and server errors (5xx)
 */
function defaultIsRetryable(error: unknown): boolean {
  if (!error) return false;

  // Check for status code in error object
  const errWithStatus = error as { status?: number; statusCode?: number; code?: string };
  const status = errWithStatus.status || errWithStatus.statusCode;

  // Rate limited - definitely retry
  if (status === 429) return true;

  // Server errors - retry
  if (status && status >= 500 && status < 600) return true;

  // Network errors - retry
  if (errWithStatus.code === 'ECONNRESET' ||
      errWithStatus.code === 'ETIMEDOUT' ||
      errWithStatus.code === 'ENOTFOUND') {
    return true;
  }

  // Check error message for common patterns
  const message = (error as Error).message?.toLowerCase() || '';
  if (message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('service unavailable')) {
    return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  // Exponential backoff: initialDelay * multiplier^attempt
  let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);

  // Cap at max delay
  delay = Math.min(delay, maxDelayMs);

  // Add jitter (0-25% of delay)
  if (jitter) {
    delay = delay * (1 + Math.random() * 0.25);
  }

  return Math.round(delay);
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @example
 * const result = await withRetry(
 *   () => fetch('https://api.example.com/data'),
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt or if error isn't retryable
      if (attempt >= opts.maxRetries || !opts.isRetryable(error)) {
        throw error;
      }

      // Calculate delay for next attempt
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier,
        opts.jitter
      );

      opts.onRetry(attempt + 1, delay, error);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError;
}

/**
 * Wrapper for fetch with retry logic
 * Automatically handles response status codes
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, init);

    // Throw on retryable status codes so we can retry
    if (response.status === 429 || response.status >= 500) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      throw error;
    }

    return response;
  }, options);
}

/**
 * Create a retry wrapper with preset options
 * Useful for API clients with consistent retry behavior
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return {
    withRetry: <T>(fn: () => Promise<T>, options?: RetryOptions) =>
      withRetry(fn, { ...defaultOptions, ...options }),
    fetchWithRetry: (url: string, init?: RequestInit, options?: RetryOptions) =>
      fetchWithRetry(url, init, { ...defaultOptions, ...options }),
  };
}

// Pre-configured retry wrappers for common use cases
export const apiRetry = createRetryWrapper({
  maxRetries: 3,
  initialDelayMs: 1000,
  onRetry: (attempt, delay, error) => {
    console.log(`API retry attempt ${attempt} after ${delay}ms:`, (error as Error).message);
  },
});

export const aggressiveRetry = createRetryWrapper({
  maxRetries: 5,
  initialDelayMs: 500,
  maxDelayMs: 60000,
  onRetry: (attempt, delay, error) => {
    console.log(`Aggressive retry attempt ${attempt} after ${delay}ms:`, (error as Error).message);
  },
});
