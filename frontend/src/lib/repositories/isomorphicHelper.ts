import { logger } from '@/lib/services/logger';
import type { Redis } from '@upstash/redis';

interface IsomorphicQueryParams<T> {
  cacheKey: string;
  cacheEx?: number; // Cache expiration in seconds
  serverQuery: () => Promise<T | null>;
  clientQuery: () => Promise<T | null>;
  fallbackValue?: T | null;
}

// Module-level cache for dynamic redis import
let cachedRedis: Redis | null = null;
let isRedisLoaded = false;

async function getRedis(): Promise<Redis | null> {
  if (isRedisLoaded) return cachedRedis;
  try {
    const { redis } = await import('@/lib/redis');
    cachedRedis = (redis as unknown as Redis) || null;
  } catch (err) {
    logger.warn('isomorphicHelper.getRedis', 'Failed to dynamically import @/lib/redis', {}, err as Error);
    cachedRedis = null;
  }
  isRedisLoaded = true;
  return cachedRedis;
}

/**
 * Executes a query isomorphically:
 * 1. Checks Redis cache on server side.
 * 2. If server-side, executes serverQuery (usually via adminDb).
 * 3. If client-side or server query fails, executes clientQuery (via Client SDK).
 * 4. Caches the result in Redis if successful on server side.
 */
export async function executeIsomorphicQuery<T>({
  cacheKey,
  cacheEx = 60,
  serverQuery,
  clientQuery,
  fallbackValue = null,
}: IsomorphicQueryParams<T>): Promise<T | null> {
  const isServer = typeof window === 'undefined';

  // 1. Check Redis cache (Server-side only)
  if (isServer) {
    try {
      const redis = await getRedis();
      if (redis) {
        const cached = await redis.get<unknown>(cacheKey);
        if (cached !== null) {
          if (cached === 'null') return null;
          return cached as T;
        }
      }
    } catch (e) {
      logger.warn('isomorphicHelper.executeIsomorphicQuery', 'Redis read error', { cacheKey }, e as Error);
    }
  }

  let data: T | null = null;

  // 2. Execute Server-side Query
  if (isServer) {
    try {
      data = await serverQuery();
    } catch (err) {
      logger.warn('isomorphicHelper.executeIsomorphicQuery', 'Server query failed, falling back', { cacheKey }, err as Error);
    }
  }

  // 3. Execute Client-side Query (fallback if server query returned null/failed)
  if (!data) {
    try {
      data = await clientQuery();
    } catch (err) {
      logger.error('isomorphicHelper.executeIsomorphicQuery', 'Client/fallback query failed', { cacheKey }, err as Error);

      // Cache the failure key to prevent spamming DB on subsequent requests
      if (isServer) {
        try {
          const redis = await getRedis();
          if (redis) {
            await redis.set(cacheKey, 'null', { ex: cacheEx }).catch(() => {});
          }
        } catch (_) {}
      }
      return fallbackValue;
    }
  }

  // 4. Cache in Redis (Server-side only)
  if (isServer && data) {
    try {
      const redis = await getRedis();
      if (redis) {
        await redis.set(cacheKey, data, { ex: cacheEx }).catch(() => {});
      }
    } catch (e) {
      logger.warn('isomorphicHelper.executeIsomorphicQuery', 'Redis write error', { cacheKey }, e as Error);
    }
  }

  return data;
}
