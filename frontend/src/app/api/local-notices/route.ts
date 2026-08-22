import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { getLocalNotices } from '@/lib/services/newsData';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LocalNoticesQuerySchema = z.object({
  dongtan: z.preprocess((val) => val !== 'false', z.boolean()),
});

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_localnotices',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('LocalNoticesAPI.GET', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const { searchParams } = request.nextUrl;
    const queryParse = LocalNoticesQuerySchema.safeParse({
      dongtan: searchParams.get('dongtan'),
    });

    if (!queryParse.success) {
      logger.warn('LocalNoticesAPI.GET', 'Invalid query parameters', { errors: queryParse.error.format() });
      return apiError('INVALID_QUERY', 'Invalid query parameters', 400);
    }

    const { dongtan: filterDongtan } = queryParse.data;
    const responseData = await getLocalNotices(filterDongtan);

    return apiSuccess(
      responseData,
      typeof responseData === 'object' && responseData !== null ? (responseData as unknown as Record<string, unknown>) : undefined,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
        },
      }
    );
  } catch (error: unknown) {
    logger.error('LocalNoticesAPI.GET', 'Error fetching local notices', {}, error as Error);
    return apiSuccess({
      notices: [],
      lastUpdated: null,
      source: 'fallback_error',
    }, {
      notices: [],
      lastUpdated: null,
      source: 'fallback_error',
      error: 'Failed to fetch local notices',
    });
  }
}
