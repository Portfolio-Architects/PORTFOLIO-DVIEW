import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { getMacroNews } from '@/lib/services/newsData';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const macroNewsQuerySchema = z.object({
  limit: z.string().optional().transform((v) => {
    if (!v) return 100;
    const parsed = parseInt(v, 10);
    return isNaN(parsed) ? 100 : Math.min(Math.max(parsed, 1), 100);
  }),
});

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_macro_news',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('MacroNewsAPI.GET', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const { searchParams } = new URL(request.url);
    const parsedQuery = macroNewsQuerySchema.safeParse({
      limit: searchParams.get('limit') || undefined,
    });

    if (!parsedQuery.success) {
      logger.warn('MacroNewsAPI.GET', 'Invalid query parameters', {
        errors: parsedQuery.error.format(),
      });
      return apiError('INVALID_QUERY', 'Bad Request', 400);
    }

    const { limit } = parsedQuery.data;
    const newsItems = await getMacroNews(limit);

    return apiSuccess(newsItems, { status: 'success' });
  } catch (error) {
    logger.error('MacroNewsAPI.GET', 'Error during GET request', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch news data', 500);
  }
}
