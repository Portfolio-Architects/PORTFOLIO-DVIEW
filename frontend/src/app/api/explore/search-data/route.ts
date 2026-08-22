import { NextRequest } from 'next/server';
import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '@/lib/services/googleSheets';
import { serverLruCache } from '@/lib/utils/server/lruCache';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { redis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_TTL_MS = 600 * 1000;

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_explore_searchdata_get',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('ExploreSearchDataAPI.GET', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const headers = {
      'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=1800',
    };

    // 1. Try to read from L1 Cache (Memory)
    const cachedData = serverLruCache.get('exploreSearchData');
    if (cachedData) {
      return apiSuccess(
        cachedData,
        typeof cachedData === 'object' && cachedData !== null ? (cachedData as Record<string, unknown>) : undefined,
        { headers }
      );
    }

    // 2. Try to read from L2 Cache (Redis)
    if (redis) {
      try {
        const l2Cached = await redis.get('DTDLS:cache:exploreSearchData');
        if (l2Cached) {
          logger.info('ExploreSearchDataAPI', 'L1 Cache miss, L2 Redis Cache hit.');
          let parsedL2 = l2Cached;
          if (typeof l2Cached === 'string') {
            parsedL2 = JSON.parse(l2Cached);
          }
          serverLruCache.set('exploreSearchData', parsedL2, CACHE_TTL_MS);
          return apiSuccess(
            parsedL2,
            typeof parsedL2 === 'object' && parsedL2 !== null ? (parsedL2 as Record<string, unknown>) : undefined,
            { headers }
          );
        }
      } catch (redisError) {
        logger.warn('ExploreSearchDataAPI', 'L2 Redis read failed, falling back to Google Sheets', {}, redisError as Error);
      }
    }

    // 3. Fetch fresh data from Google Sheets parallelly
    logger.info('ExploreSearchDataAPI', 'L1 & L2 Cache miss, fetching fresh search metadata from Google Sheets.');
    const [typeMap, aptData] = await Promise.all([
      fetchSheetTypeMap().catch((e) => {
        logger.error('ExploreSearchDataAPI', 'Failed to fetch typeMap', {}, e);
        return [];
      }),
      fetchSheetApartmentsByDong().catch((e) => {
        logger.error('ExploreSearchDataAPI', 'Failed to fetch apartments by dong', {}, e);
        return { byDong: {} };
      }),
    ]);

    const result = {
      typeMap,
      sheetApartments: aptData?.byDong || {},
    };

    // 4. Save to L1 Cache
    serverLruCache.set('exploreSearchData', result, CACHE_TTL_MS);

    // 5. Save to L2 Cache (Redis)
    if (redis) {
      redis.set('DTDLS:cache:exploreSearchData', JSON.stringify(result), { ex: 86400 }).catch((e: unknown) =>
        logger.warn('ExploreSearchDataAPI', 'Failed to write back to Redis L2 cache', {}, e as Error)
      );
    }

    return apiSuccess(result, result, { headers });
  } catch (error) {
    logger.error('ExploreSearchDataAPI', 'Unhandled error in GET', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
}
