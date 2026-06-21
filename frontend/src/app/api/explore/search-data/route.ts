import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetApartmentsByDong, fetchSheetTypeMap } from '@/lib/services/googleSheets';
import { serverLruCache } from '@/lib/utils/server/lruCache';
import { logger } from '@/lib/services/logger';
import { rateLimiter } from '@/lib/rate-limit';

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

    // 1. Try to read from L1 Cache
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

    // 2. Fetch fresh data from Google Sheets parallelly
    logger.info('ExploreSearchDataAPI', 'L1 Cache miss, fetching fresh search metadata.');
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

    // 3. Save to L1 Cache
    serverLruCache.set('exploreSearchData', result, CACHE_TTL_MS);

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
