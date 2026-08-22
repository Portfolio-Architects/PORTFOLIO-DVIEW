import { NextRequest } from 'next/server';
import { getPublicAnalyticsLKG } from '@/lib/analytics-service';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_public_analytics',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const data = await getPublicAnalyticsLKG();
    return apiSuccess(
      data,
      typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined
    );
  } catch (error: unknown) {
    logger.error('PublicAnalyticsAPI.GET', 'Failed to load analytics data', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to load analytics data', 500);
  }
}
