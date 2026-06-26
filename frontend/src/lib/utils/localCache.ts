import { z } from 'zod';
import { logger } from '@/lib/services/logger';

interface CacheItem<T> {
  value: T;
  expiry: number; // timestamp ms (0 for infinite)
}

/**
 * Robust Client-side localStorage Cache Manager with TTL (Expiration) and Zod Schema validation.
 * Prevents UI crashes caused by JSON parsing errors or corrupted data.
 */
export const localCache = {
  /**
   * Set cache item with optional TTL (Time to Live) in seconds.
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    if (typeof window === 'undefined') return;
    try {
      const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0;
      const item: CacheItem<T> = { value, expiry };
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e: unknown) {
      logger.error('localCache.set', `Failed to write to localStorage for key: ${key}`, { key }, e instanceof Error ? e : new Error(String(e)));
    }
  },

  /**
   * Get cache item safely, validate with schema if provided, check TTL, and return fallback on failure.
   */
  get<T>(key: string, schema: z.ZodType<T> | undefined, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e: unknown) {
        // Fallback for legacy format: try parsing as a direct value (not wrapped in CacheItem)
        try {
          const directParsed = JSON.parse(raw);
          if (schema) {
            const validation = schema.safeParse(directParsed);
            if (validation.success) {
              // Convert to new format and write back
              this.set(key, validation.data);
              return validation.data;
            }
          } else {
            this.set(key, directParsed);
            return directParsed as T;
          }
        } catch (innerError: unknown) {}

        logger.warn('localCache.get', `Corrupted JSON for key: ${key}. Clearing cache.`, { key });
        localStorage.removeItem(key);
        return fallback;
      }

      // Check if it matches CacheItem structure
      if (parsed && typeof parsed === 'object' && 'value' in parsed && 'expiry' in parsed) {
        const item = parsed as CacheItem<unknown>;
        if (item.expiry > 0 && Date.now() > item.expiry) {
          logger.info('localCache.get', `Cache expired for key: ${key}. Clearing cache.`, { key });
          localStorage.removeItem(key);
          return fallback;
        }

        const value = item.value;
        if (schema) {
          const validation = schema.safeParse(value);
          if (validation.success) {
            return validation.data;
          } else {
            logger.warn('localCache.get', `Schema validation failed for key: ${key}. Clearing cache.`, { key, error: validation.error.format() });
            localStorage.removeItem(key);
            return fallback;
          }
        }
        return value as T;
      } else {
        // Handle direct parsed format (legacy migration)
        if (schema) {
          const validation = schema.safeParse(parsed);
          if (validation.success) {
            this.set(key, validation.data);
            return validation.data;
          }
        } else {
          this.set(key, parsed);
          return parsed as T;
        }
        localStorage.removeItem(key);
        return fallback;
      }
    } catch (e: unknown) {
      logger.error('localCache.get', `Failed to read or parse localStorage for key: ${key}`, { key }, e instanceof Error ? e : new Error(String(e)));
      return fallback;
    }
  },

  /**
   * Remove item from cache
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e: unknown) {
      logger.error('localCache.remove', `Failed to remove key: ${key}`, { key }, e instanceof Error ? e : new Error(String(e)));
    }
  }
};
