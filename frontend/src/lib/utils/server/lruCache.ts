/**
 * @module lruCache
 * @description Lightweight In-Memory LRU (Least Recently Used) cache with TTL for server-side caching.
 * Prevents hot-reloading data loss in Next.js development by utilizing globalThis.
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

export class LRUCache<T = any> {
  private capacity: number;
  private cache: Map<string, CacheEntry<T>>;

  constructor(capacity = 50) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  public get(key: string): T | null {
    if (!this.cache.has(key)) return null;

    const entry = this.cache.get(key)!;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    // Refresh position for LRU strategy
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
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

// Bind to globalThis to preserve cache across hot reloads in next dev
const globalKey = '_lruCacheInstance';
if (!(globalThis as any)[globalKey]) {
  (globalThis as any)[globalKey] = new LRUCache(100);
}

export const serverLruCache = (globalThis as any)[globalKey] as LRUCache;
