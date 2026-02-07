/**
 * Request Deduplication Utility
 *
 * Prevents duplicate API calls by tracking in-flight requests and returning
 * the same promise for identical requests made in quick succession.
 *
 * Features:
 * - Tracks in-flight requests by unique key
 * - Returns same promise for duplicate requests (deduplication)
 * - Optional result caching with TTL
 * - Request timeout support
 * - Automatic cleanup of completed requests
 * - Statistics tracking for debugging
 */

// ============================================================================
// TYPES
// ============================================================================

/** Error with HTTP status and response data for API error handling */
interface FetchError extends Error {
  status: number;
  data: unknown;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

interface CachedResult<T> {
  data: T;
  expiresAt: number;
}

interface DedupStats {
  totalRequests: number;
  dedupedRequests: number;
  cacheHits: number;
  errors: number;
}

export interface DedupOptions {
  /** Time in ms to cache successful results (default: 0 = no caching) */
  cacheTTL?: number;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Whether to cache errors (default: false) */
  cacheErrors?: boolean;
  /** Error cache TTL in ms (default: 5000) */
  errorCacheTTL?: number;
}

// ============================================================================
// REQUEST DEDUPLICATION CLASS
// ============================================================================

class RequestDeduplicator {
  private inFlight = new Map<string, InFlightRequest<unknown>>();
  private cache = new Map<string, CachedResult<unknown>>();
  private errorCache = new Map<string, CachedResult<Error>>();
  private stats: DedupStats = {
    totalRequests: 0,
    dedupedRequests: 0,
    cacheHits: 0,
    errors: 0,
  };

  private readonly defaultOptions: Required<DedupOptions> = {
    cacheTTL: 0,
    timeout: 30000,
    cacheErrors: false,
    errorCacheTTL: 5000,
  };

  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodic cleanup every 60 seconds
    if (typeof setInterval !== 'undefined') {
      this.cleanupIntervalId = setInterval(() => this.cleanup(), 60000);
      // Unref the interval so it doesn't prevent Node.js from exiting
      if (this.cleanupIntervalId && typeof this.cleanupIntervalId === 'object' && 'unref' in this.cleanupIntervalId) {
        (this.cleanupIntervalId as NodeJS.Timeout).unref();
      }
    }
  }

  /**
   * Stop the periodic cleanup timer
   */
  destroy(): void {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Execute a request with deduplication
   * If an identical request is in flight, returns the same promise
   * If result is cached and valid, returns cached result
   */
  async dedupe<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: DedupOptions = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    this.stats.totalRequests++;

    // Check cache first
    if (opts.cacheTTL > 0) {
      const cached = this.cache.get(key);
      if (cached && Date.now() < cached.expiresAt) {
        this.stats.cacheHits++;
        return cached.data as T;
      }
    }

    // Check error cache
    if (opts.cacheErrors) {
      const cachedError = this.errorCache.get(key);
      if (cachedError && Date.now() < cachedError.expiresAt) {
        this.stats.errors++;
        throw cachedError.data;
      }
    }

    // Check for in-flight request
    const existing = this.inFlight.get(key);
    if (existing) {
      this.stats.dedupedRequests++;
      return existing.promise as Promise<T>;
    }

    // Create new request with timeout
    const requestPromise = this.executeWithTimeout(fetcher, opts.timeout);

    // Wrap to handle caching and cleanup
    const wrappedPromise = requestPromise
      .then((result) => {
        // Cache successful result
        if (opts.cacheTTL > 0) {
          this.cache.set(key, {
            data: result,
            expiresAt: Date.now() + opts.cacheTTL,
          });
        }
        return result;
      })
      .catch((error) => {
        this.stats.errors++;
        // Cache error if configured
        if (opts.cacheErrors) {
          this.errorCache.set(key, {
            data: error,
            expiresAt: Date.now() + opts.errorCacheTTL,
          });
        }
        throw error;
      })
      .finally(() => {
        // Remove from in-flight after completion
        this.inFlight.delete(key);
      });

    // Track in-flight request
    this.inFlight.set(key, {
      promise: wrappedPromise,
      timestamp: Date.now(),
    });

    return wrappedPromise;
  }

  /**
   * Execute fetcher with timeout
   */
  private async executeWithTimeout<T>(
    fetcher: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout);
    });

    try {
      return await Promise.race([fetcher(), timeoutPromise]);
    } finally {
      clearTimeout(timeoutId!);
    }
  }

  /**
   * Create a unique key from URL and options
   */
  static createKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? String(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Create a key from URL and params object
   */
  static createKeyFromParams(
    baseUrl: string,
    params: Record<string, unknown>
  ): string {
    const sortedParams = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== null)
      .sort()
      .map((k) => `${k}=${JSON.stringify(params[k])}`)
      .join('&');
    return `GET:${baseUrl}?${sortedParams}`;
  }

  /**
   * Invalidate cached result for a key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    this.errorCache.delete(key);
  }

  /**
   * Invalidate all cached results matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const cacheKeys = Array.from(this.cache.keys());
    const errorCacheKeys = Array.from(this.errorCache.keys());
    const keys = [...cacheKeys, ...errorCacheKeys];
    for (const key of keys) {
      const matches =
        typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key);
      if (matches) {
        this.cache.delete(key);
        this.errorCache.delete(key);
      }
    }
  }

  /**
   * Clear all caches and in-flight requests
   */
  clear(): void {
    this.inFlight.clear();
    this.cache.clear();
    this.errorCache.clear();
    this.stats = {
      totalRequests: 0,
      dedupedRequests: 0,
      cacheHits: 0,
      errors: 0,
    };
  }

  /**
   * Get statistics for debugging
   */
  getStats(): DedupStats & { inFlightCount: number; cacheSize: number } {
    return {
      ...this.stats,
      inFlightCount: this.inFlight.size,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Check if a request is currently in flight
   */
  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  /**
   * Clean up expired cache entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Clean expired cache entries
    const cacheEntries = Array.from(this.cache.entries());
    for (const [key, entry] of cacheEntries) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }

    // Clean expired error cache entries
    const errorCacheEntries = Array.from(this.errorCache.entries());
    for (const [key, entry] of errorCacheEntries) {
      if (now >= entry.expiresAt) {
        this.errorCache.delete(key);
      }
    }

    // Clean stale in-flight requests (older than 5 minutes - likely stuck)
    const staleThreshold = now - 5 * 60 * 1000;
    const inFlightEntries = Array.from(this.inFlight.entries());
    for (const [key, request] of inFlightEntries) {
      if (request.timestamp < staleThreshold) {
        this.inFlight.delete(key);
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

// Guard against HMR creating duplicate instances with stale intervals
const globalKey = '__requestDedup__' as const;
const globalObj = (typeof globalThis !== 'undefined' ? globalThis : {}) as Record<string, unknown>;
if (globalObj[globalKey]) {
  (globalObj[globalKey] as RequestDeduplicator).destroy();
}
export const requestDedup = new RequestDeduplicator();
globalObj[globalKey] = requestDedup;

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Deduplicated fetch wrapper
 * Automatically deduplicates requests with the same URL and options
 */
export async function dedupedFetch<T = unknown>(
  url: string,
  options?: RequestInit,
  dedupOptions?: DedupOptions
): Promise<T> {
  const key = RequestDeduplicator.createKey(url, options);

  return requestDedup.dedupe(
    key,
    async () => {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.message || `Request failed with status ${response.status}`
        ) as FetchError;
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      return response.json();
    },
    dedupOptions
  );
}

/**
 * Deduplicated POST request
 */
export async function dedupedPost<T = unknown, D = unknown>(
  url: string,
  data: D,
  dedupOptions?: DedupOptions
): Promise<T> {
  const body = JSON.stringify(data);
  const key = RequestDeduplicator.createKey(url, { method: 'POST', body });

  return requestDedup.dedupe(
    key,
    async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.message || `Request failed with status ${response.status}`
        ) as FetchError;
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      return response.json();
    },
    dedupOptions
  );
}

/**
 * Create a deduplicated fetch function for a specific endpoint
 * Useful for creating API client functions with built-in deduplication
 */
export function createDedupedEndpoint<TParams, TResult>(
  baseUrl: string,
  options: {
    method?: 'GET' | 'POST';
    cacheTTL?: number;
    timeout?: number;
  } = {}
): (params: TParams) => Promise<TResult> {
  const { method = 'GET', cacheTTL = 0, timeout = 30000 } = options;

  return async (params: TParams): Promise<TResult> => {
    if (method === 'GET') {
      // Build query string for GET requests
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      const url = `${baseUrl}?${searchParams.toString()}`;
      return dedupedFetch<TResult>(url, undefined, { cacheTTL, timeout });
    } else {
      return dedupedPost<TResult, TParams>(baseUrl, params, { cacheTTL, timeout });
    }
  };
}

// ============================================================================
// BUTTON CLICK DEDUPLICATION HOOK
// ============================================================================

/**
 * Hook for creating a debounced/deduplicated action handler
 * Prevents rapid button clicks from triggering multiple requests
 */
export function createDedupedAction<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  options: DedupOptions = {}
): (...args: T) => Promise<R> {
  return (...args: T): Promise<R> => {
    const key = keyGenerator(...args);
    return requestDedup.dedupe(key, () => action(...args), options);
  };
}

// Export the class for advanced usage
export { RequestDeduplicator };
