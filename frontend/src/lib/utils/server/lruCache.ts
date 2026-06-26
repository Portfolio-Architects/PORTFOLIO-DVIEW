/**
 * @module lruCache
 * @description Lightweight In-Memory LRU (Least Recently Used) cache with TTL for server-side caching.
 * Prevents hot-reloading data loss in Next.js development by utilizing globalThis.
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class LRUCache<T = unknown> {
  private capacity: number;
  private cache: Map<string, CacheEntry<T>>;

  constructor(capacity = 50) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  public get<R = T>(key: string): R | null {
    if (!this.cache.has(key)) return null;

    const entry = this.cache.get(key)!;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU strategy
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value as unknown as R;
  }

  public set(key: string, value: T, ttlMs: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Evict oldest entry (the first item in the map iterator)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public clear(): void {
    this.cache.clear();
  }
}

declare global {
  var _lruCacheInstance: LRUCache<unknown> | undefined;
}

// Bind to globalThis to preserve cache across hot reloads in next dev
if (!globalThis._lruCacheInstance) {
  globalThis._lruCacheInstance = new LRUCache<unknown>(100);
}

export const serverLruCache = globalThis._lruCacheInstance;
