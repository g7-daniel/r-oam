/**
 * Enhanced in-memory cache for API responses
 * Used to reduce external API calls and improve response times
 *
 * Features:
 * - TTL-based expiration
 * - Stale-while-revalidate pattern
 * - Cache statistics
 * - Automatic cleanup
 * - Hit/miss tracking
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  staleAt: number; // When data becomes stale (but still usable)
  createdAt: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  size: number;
  oldestEntry: number | null;
}

class APICache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes default
  // defaultStaleTTL is used when computing stale window for cache entries
  private readonly maxSize = 1000; // Max entries to prevent memory issues

  // Statistics
  private stats = { hits: 0, misses: 0, staleHits: 0 };

  constructor(private name: string = 'default') {
    // Run cleanup every 5 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * Get a cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();

    // Fully expired - remove and return null
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Check if data is stale (still valid but should be revalidated)
    if (now > entry.staleAt) {
      this.stats.staleHits++;
    } else {
      this.stats.hits++;
    }

    return entry.data as T;
  }

  /**
   * Get with stale-while-revalidate pattern
   * Returns data even if stale, with a flag indicating staleness
   */
  getWithStale<T>(key: string): { data: T | null; isStale: boolean; isMiss: boolean } {
    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return { data: null, isStale: false, isMiss: true };
    }

    const now = Date.now();

    // Fully expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return { data: null, isStale: false, isMiss: true };
    }

    const isStale = now > entry.staleAt;
    if (isStale) {
      this.stats.staleHits++;
    } else {
      this.stats.hits++;
    }

    return { data: entry.data as T, isStale, isMiss: false };
  }

  /**
   * Set a value in the cache with optional TTL
   * @param staleTTL - Time until data is considered stale (default: half of TTL)
   */
  set<T>(key: string, data: T, ttlMs: number = this.defaultTTL, staleTTL?: number): void {
    // Enforce max size by removing oldest entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const now = Date.now();
    const effectiveStaleTTL = staleTTL ?? Math.floor(ttlMs / 2);

    this.cache.set(key, {
      data,
      expiresAt: now + ttlMs,
      staleAt: now + effectiveStaleTTL,
      createdAt: now,
    });
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keys = Array.from(this.cache.keys());
    let cleaned = 0;
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[${this.name} Cache] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].createdAt - b[1].createdAt);

    // Remove oldest 10% of entries
    const toRemove = Math.max(1, Math.floor(this.maxSize * 0.1));
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
    console.log(`[${this.name} Cache] Evicted ${toRemove} oldest entries`);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, staleHits: 0 };
  }

  /**
   * Get detailed cache stats for debugging
   */
  getStats(): CacheStats {
    let oldestEntry: number | null = null;
    const entries = Array.from(this.cache.values());
    for (const entry of entries) {
      if (oldestEntry === null || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }
    }

    return {
      ...this.stats,
      size: this.cache.size,
      oldestEntry,
    };
  }

  /**
   * Get cache keys for debugging
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Singleton instance for area discovery results
export const areaDiscoveryCache = new APICache('areas');

// Singleton instance for Google Places results
export const placesCache = new APICache('places');

// Singleton instance for Reddit results
export const redditCache = new APICache('reddit');

// Singleton instance for geocoding results (very stable data)
export const geocodeCache = new APICache('geocode');

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  AREAS: 30 * 60 * 1000,        // 30 minutes for area discovery
  PLACES: 15 * 60 * 1000,       // 15 minutes for Google Places
  PLACE_DETAILS: 24 * 60 * 60 * 1000, // 24 hours for place details (stable data)
  REDDIT: 60 * 60 * 1000,       // 1 hour for Reddit data
  HOTELS: 10 * 60 * 1000,       // 10 minutes for hotel searches
  RESTAURANTS: 15 * 60 * 1000,  // 15 minutes for restaurant searches
  EXPERIENCES: 15 * 60 * 1000,  // 15 minutes for experiences
  GEOCODE: 7 * 24 * 60 * 60 * 1000, // 7 days for geocoding (very stable)
};

// Stale TTL constants (when data is usable but should be revalidated)
export const STALE_TTL = {
  AREAS: 20 * 60 * 1000,        // Stale after 20 minutes
  PLACES: 10 * 60 * 1000,       // Stale after 10 minutes
  PLACE_DETAILS: 12 * 60 * 60 * 1000, // Stale after 12 hours
  REDDIT: 30 * 60 * 1000,       // Stale after 30 minutes
  HOTELS: 5 * 60 * 1000,        // Stale after 5 minutes (prices change)
  RESTAURANTS: 10 * 60 * 1000,  // Stale after 10 minutes
  EXPERIENCES: 10 * 60 * 1000,  // Stale after 10 minutes
  GEOCODE: 3 * 24 * 60 * 60 * 1000, // Stale after 3 days
};

/**
 * Create a cache key from request parameters
 */
export function createCacheKey(prefix: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}:${JSON.stringify(params[k])}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}

/**
 * Normalize a cache key for better hit rates
 * - Lowercases strings
 * - Rounds coordinates to 2 decimal places
 * - Sorts object keys
 */
export function normalizeCacheKey(prefix: string, params: Record<string, unknown>): string {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;

    if (typeof value === 'string') {
      normalized[key] = value.toLowerCase().trim();
    } else if (typeof value === 'number') {
      // Round coordinates to 2 decimal places for better cache hits
      // This groups nearby locations together
      if (key === 'lat' || key === 'lng' || key === 'latitude' || key === 'longitude') {
        normalized[key] = Math.round(value * 100) / 100;
      } else {
        normalized[key] = value;
      }
    } else if (Array.isArray(value)) {
      normalized[key] = value.map(v =>
        typeof v === 'string' ? v.toLowerCase().trim() : v
      ).sort();
    } else {
      normalized[key] = value;
    }
  }

  return createCacheKey(prefix, normalized);
}

/**
 * Fetch with timeout support to prevent hanging requests
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default 30 seconds)
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  }
}

/**
 * Fetch with caching and stale-while-revalidate pattern
 * Returns cached data immediately if available (even if stale),
 * and revalidates in the background if stale
 */
export async function fetchWithCache<T>(
  cache: APICache,
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  staleTTL?: number
): Promise<{ data: T; fromCache: boolean; isStale: boolean }> {
  const cached = cache.getWithStale<T>(cacheKey);

  // Cache hit (fresh or stale)
  if (!cached.isMiss && cached.data !== null) {
    if (cached.isStale) {
      // Return stale data immediately, revalidate in background
      // Fire-and-forget revalidation
      fetcher().then(freshData => {
        cache.set(cacheKey, freshData, ttlMs, staleTTL);
      }).catch(err => {
        console.error(`[Cache] Background revalidation failed for ${cacheKey}:`, err);
      });
    }
    return { data: cached.data, fromCache: true, isStale: cached.isStale };
  }

  // Cache miss - fetch fresh data
  const data = await fetcher();
  cache.set(cacheKey, data, ttlMs, staleTTL);
  return { data, fromCache: false, isStale: false };
}

/**
 * Get all cache statistics for debugging
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  return {
    areas: areaDiscoveryCache.getStats(),
    places: placesCache.getStats(),
    reddit: redditCache.getStats(),
    geocode: geocodeCache.getStats(),
  };
}
