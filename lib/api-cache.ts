/**
 * Simple in-memory cache for API responses
 * Used to reduce external API calls and improve response times
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes default

  /**
   * Get a cached value if it exists and hasn't expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in the cache with optional TTL
   */
  set<T>(key: string, data: T, ttlMs: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
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
    for (const key of keys) {
      const entry = this.cache.get(key);
      if (entry && now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats for debugging
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance for area discovery results
export const areaDiscoveryCache = new APICache();

// Singleton instance for Google Places results
export const placesCache = new APICache();

// Singleton instance for Reddit results
export const redditCache = new APICache();

// Cache TTL constants
export const CACHE_TTL = {
  AREAS: 30 * 60 * 1000,      // 30 minutes for area discovery
  PLACES: 15 * 60 * 1000,     // 15 minutes for Google Places
  REDDIT: 60 * 60 * 1000,     // 1 hour for Reddit data
  HOTELS: 10 * 60 * 1000,     // 10 minutes for hotel searches
  RESTAURANTS: 15 * 60 * 1000, // 15 minutes for restaurant searches
  EXPERIENCES: 15 * 60 * 1000, // 15 minutes for experiences
};

/**
 * Create a cache key from request parameters
 */
export function createCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}:${JSON.stringify(params[k])}`)
    .join('|');
  return `${prefix}:${sortedParams}`;
}
