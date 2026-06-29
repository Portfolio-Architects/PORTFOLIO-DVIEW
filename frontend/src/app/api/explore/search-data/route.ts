import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '@/lib/services/googleSheets';
import { serverLruCache } from '@/lib/utils/server/lruCache';
import { logger } from '@/lib/services/logger';
import { rateLimiter } from '@/lib/rate-limit';
import { redis } from '@/lib/redis';

// Set L1 Cache TTL (10 minutes)
const CACHE_TTL_MS = 600 * 1000;

export async function GET(request: NextRequest) {
  try {
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_explore_searchdata_get_${rawIp}`);
      if (!success) {
        logger.warn('ExploreSearchDataAPI.GET', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    // 1. Try to read from L1 Cache (Memory)
    const cachedData = serverLruCache.get('exploreSearchData');
    if (cachedData) {
      return new NextResponse(JSON.stringify(cachedData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=1800',
        },
      });
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
          // Save to L1 Cache
          serverLruCache.set('exploreSearchData', parsedL2, CACHE_TTL_MS);
          return new NextResponse(JSON.stringify(parsedL2), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=1800',
            },
          });
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

    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('ExploreSearchDataAPI', 'Unhandled error in GET', {}, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
