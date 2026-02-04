/**
 * Bounded cache utilities to prevent memory exhaustion
 * Implements LRU (Least Recently Used) eviction with max size and TTL
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  lastAccess: number;
}

/**
 * A Map with maximum size and TTL support
 * When capacity is reached, oldest entries are evicted
 */
export class BoundedMap<K, V> {
  private cache = new Map<K, CacheEntry<V>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 1000, ttlMinutes = 60) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Update last access time
    entry.lastAccess = Date.now();
    return entry.value;
  }

  set(key: K, value: V): void {
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      lastAccess: Date.now(),
    });
  }

  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }

  private evictOldest(): void {
    let oldestKey: K | undefined;
    let oldestAccess = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    });

    if (oldestKey !== undefined) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired entries (can be called periodically)
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    const keysToDelete: K[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > this.ttlMs) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      cleaned++;
    });

    return cleaned;
  }
}

/**
 * A Set with maximum size and TTL support
 */
export class BoundedSet<T> {
  private set = new Map<T, number>(); // value -> timestamp
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = 1000, ttlMinutes = 60) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  add(value: T): void {
    // Evict if at capacity
    if (this.set.size >= this.maxSize && !this.set.has(value)) {
      this.evictOldest();
    }

    this.set.set(value, Date.now());
  }

  has(value: T): boolean {
    const timestamp = this.set.get(value);
    if (timestamp === undefined) return false;

    // Check TTL
    if (Date.now() - timestamp > this.ttlMs) {
      this.set.delete(value);
      return false;
    }

    return true;
  }

  delete(value: T): boolean {
    return this.set.delete(value);
  }

  get size(): number {
    return this.set.size;
  }

  clear(): void {
    this.set.clear();
  }

  private evictOldest(): void {
    let oldestValue: T | undefined;
    let oldestTime = Infinity;

    this.set.forEach((timestamp, value) => {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestValue = value;
      }
    });

    if (oldestValue !== undefined) {
      this.set.delete(oldestValue);
    }
  }

  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    const valuesToDelete: T[] = [];

    this.set.forEach((timestamp, value) => {
      if (now - timestamp > this.ttlMs) {
        valuesToDelete.push(value);
      }
    });

    valuesToDelete.forEach(value => {
      this.set.delete(value);
      cleaned++;
    });

    return cleaned;
  }
}

// Pre-configured instances for common use cases
export const createPhotoCache = () => new BoundedMap<string, string>(500, 60); // 500 photos, 1 hour TTL
export const createIndexingSet = () => new BoundedSet<string>(100, 10); // 100 items, 10 min TTL
export const createSearchTimestamps = () => new BoundedMap<string, number>(200, 5); // 200 searches, 5 min TTL
