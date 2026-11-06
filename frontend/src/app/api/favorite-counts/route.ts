import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { redis } from '@/lib/redis';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
};

const L1_TTL_MS = 300_000; // 5 minutes
let l1FavoriteCounts: { counts: Record<string, number>; expiresAt: number } | null = null;
let inFlightCountsPromise: Promise<Record<string, number>> | null = null;

async function resolveFavoriteCounts(isTest: boolean): Promise<Record<string, number>> {
  if (redis) {
    try {
      const cachedCounts = await redis.hgetall<Record<string, number | string>>('DTDLS:cache:favoriteCounts');
      if (cachedCounts && Object.keys(cachedCounts).length > 0) {
        const coerced: Record<string, number> = {};
        for (const [key, val] of Object.entries(cachedCounts)) {
          coerced[key] = Number(val);
        }
        if (!isTest) {
          l1FavoriteCounts = { counts: coerced, expiresAt: Date.now() + L1_TTL_MS };
        }
        return coerced;
      }
    } catch (err) {
      logger.warn('FavoriteCountsAPI.GET', 'Redis read error, falling back to Firestore', {}, err as Error);
    }
  }

  if (!adminDb) return {};

  const isDev = process.env.NODE_ENV === 'development';
  const timeoutMs = isDev ? 1000 : 3000;

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Firebase timeout')), ms);
    });
    return Promise.race([
      promise.then((val) => {
        clearTimeout(timeoutId);
        return val;
      }).catch((err) => {
        clearTimeout(timeoutId);
        throw err;
      }),
      timeoutPromise,
    ]);
  };

  const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), timeoutMs);
  const counts: Record<string, number> = {};
  const docsIterable = Array.isArray(snap?.docs) ? snap.docs : snap;
  if (docsIterable && typeof (docsIterable as { forEach?: unknown }).forEach === 'function') {
    docsIterable.forEach((doc: { id: string; data: () => Record<string, unknown> }) => {
      const data = doc.data();
      if (typeof data?.count === 'number' && data.count > 0) {
        counts[(data.aptName as string) || doc.id] = data.count;
      }
    });
  }

  if (redis && Object.keys(counts).length > 0) {
    await redis.hset('DTDLS:cache:favoriteCounts', counts).catch((err) => {
      logger.warn('FavoriteCountsAPI.GET', 'Redis HSET error', {}, err as Error);
    });
  }

  if (!isTest) {
    l1FavoriteCounts = { counts, expiresAt: Date.now() + L1_TTL_MS };
  }

  return counts;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_favoritecounts',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('FavoriteCountsAPI.GET', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const isTest = process.env.NODE_ENV === 'test';
    if (!isTest && l1FavoriteCounts && Date.now() < l1FavoriteCounts.expiresAt) {
      return apiSuccess(
        { counts: l1FavoriteCounts.counts },
        { counts: l1FavoriteCounts.counts },
        { headers: CACHE_HEADERS }
      );
    }

    let counts: Record<string, number>;
    if (!isTest) {
      if (!inFlightCountsPromise) {
        inFlightCountsPromise = resolveFavoriteCounts(false).finally(() => {
          inFlightCountsPromise = null;
        });
      }
      counts = await inFlightCountsPromise;
    } else {
      counts = await resolveFavoriteCounts(true);
    }

    return apiSuccess({ counts }, { counts }, { headers: CACHE_HEADERS });
  } catch (error) {
    logger.error('FavoriteCountsAPI.GET', 'Failed to fetch favorite counts', {}, error as Error);
    const fallbackCounts = process.env.NODE_ENV !== 'test' && l1FavoriteCounts ? l1FavoriteCounts.counts : {};
    return apiSuccess({ counts: fallbackCounts }, { counts: fallbackCounts }, { headers: CACHE_HEADERS });
  }
}
