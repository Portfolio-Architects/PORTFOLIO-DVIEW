import { NextRequest } from 'next/server';
import { getSearchConsoleStatus } from '@/lib/services/searchConsole';
import { verifyAdmin } from '@/lib/authUtils';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_admin_search_console',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      logger.warn('SearchConsoleAPI.GET', 'Unauthorized attempt to fetch Search Console status');
      return apiError('UNAUTHORIZED', 'Unauthorized: Admin access required', 403);
    }

    const status = await getSearchConsoleStatus();
    return apiSuccess(
      status,
      typeof status === 'object' && status !== null ? (status as Record<string, unknown>) : undefined,
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('SearchConsoleAPI.GET', 'Failed to fetch Search Console status', {}, err);
    return apiError('SEARCH_CONSOLE_ERROR', 'Failed to fetch search console status', 500);
  }
}
