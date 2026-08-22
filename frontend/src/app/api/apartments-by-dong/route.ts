import { NextRequest } from 'next/server';
import { fetchSheetApartmentsByDong } from '@/lib/services/googleSheets';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ApartmentsQuerySchema = z.object({
  bypassCache: z.preprocess((val) => val === 'true', z.boolean()),
});

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_apartments_by_dong',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const { searchParams } = request.nextUrl;
    const queryParse = ApartmentsQuerySchema.safeParse({
      bypassCache: searchParams.get('bypassCache'),
    });

    if (!queryParse.success) {
      logger.warn('ApartmentsByDongAPI.GET', 'Invalid query parameters', { errors: queryParse.error.format() });
      return apiError('INVALID_QUERY', 'Invalid query parameters', 400);
    }

    const { bypassCache } = queryParse.data;
    const result = await fetchSheetApartmentsByDong(bypassCache);

    return apiSuccess(
      result,
      typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : undefined,
      {
        headers: {
          'Cache-Control': bypassCache
            ? 'no-store, no-cache, must-revalidate, max-age=0'
            : 'public, s-maxage=3600, stale-while-revalidate=600',
        },
      }
    );
  } catch (err: unknown) {
    logger.error('ApartmentsByDongAPI.GET', 'Error loading apartments', {}, err as Error);
    return apiError('INTERNAL_ERROR', 'Failed to load apartments', 500);
  }
}
