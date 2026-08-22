import { NextRequest } from 'next/server';
import { requestGoogleIndexing } from '@/lib/utils/server/googleIndexing';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { verifyAdmin } from '@/lib/authUtils';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const IndexingInputSchema = z.object({
  url: z.string().url(),
  action: z.enum(['URL_UPDATED', 'URL_DELETED']).optional().default('URL_UPDATED'),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_admin_indexing',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      logger.warn('IndexingAPI.POST', 'Unauthorized attempts to trigger Google Indexing');
      return apiError('UNAUTHORIZED', 'Unauthorized: Admin access required', 403);
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return apiError('BAD_REQUEST', 'Bad Request: Invalid JSON', 400);
    }

    const parsed = IndexingInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      logger.warn('IndexingAPI.POST', 'Invalid indexing request payload', { errors: parsed.error.format() });
      return apiError('INVALID_PAYLOAD', 'Invalid request payload', 400, parsed.error.issues);
    }

    const { url, action } = parsed.data;
    const result = await requestGoogleIndexing(url, action);
    logger.info('IndexingAPI.POST', 'Successfully requested Google Indexing', { url, action, result });
    return apiSuccess(result, typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : undefined);
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('IndexingAPI.POST', 'Error during Google Indexing request', {}, err);
    return apiError('INDEXING_FAILED', 'Failed to request indexing', 500);
  }
}
