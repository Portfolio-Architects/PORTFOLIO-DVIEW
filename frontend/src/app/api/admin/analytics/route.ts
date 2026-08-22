import { NextRequest } from 'next/server';
import { verifyAdmin } from '@/lib/authUtils';
import { getAdminAnalyticsLKG } from '@/lib/analytics-service';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_admin_analytics',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return apiError('UNAUTHORIZED', 'Unauthorized: Admin access required', 403);
    }

    const data = await getAdminAnalyticsLKG();
    logger.info('AdminAnalyticsAPI.GET', 'Analytics data fetched successfully');
    return apiSuccess(data, { data });
  } catch (error: unknown) {
    logger.error('AdminAnalyticsAPI.GET', 'GA4 API Fetch Error', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to fetch analytics data', 500);
  }
}
