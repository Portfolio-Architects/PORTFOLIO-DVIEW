import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { readJsonFileCached } from '@/lib/utils/server/fileReader';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getTxSummary(): Promise<Record<string, unknown>> {
  try {
    const parsed = await readJsonFileCached<{ summary: Record<string, unknown> }>('public/data/tx-summary.json', { summary: {} });
    return parsed?.summary || (parsed as unknown as Record<string, unknown>) || {};
  } catch (err) {
    logger.error('TransactionSummaryAPI.getTxSummary', 'Failed to read or parse tx-summary.json', {}, err as Error);
    return {};
  }
}

const transactionSummaryQuerySchema = z.object({
  apartment: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_txsummary_get',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('TransactionSummaryAPI.GET', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const TX_SUMMARY = await getTxSummary();
    const { searchParams } = request.nextUrl;
    const parsedQuery = transactionSummaryQuerySchema.safeParse({
      apartment: searchParams.get('apartment') || undefined,
    });

    if (!parsedQuery.success) {
      logger.warn('TransactionSummaryAPI.GET', 'Invalid query parameters', {
        errors: parsedQuery.error.format(),
      });
      return apiError('INVALID_QUERY', 'Bad Request', 400);
    }

    const { apartment } = parsedQuery.data;

    const cacheHeaders = {
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
    };

    if (apartment) {
      const filtered = TX_SUMMARY[apartment] || null;
      if (!filtered) {
        logger.warn('TransactionSummaryAPI.GET', 'Apartment not found in transaction summary', {
          apartment,
        });
        return apiError('NOT_FOUND', 'Apartment not found', 404);
      }
      return apiSuccess(
        filtered,
        typeof filtered === 'object' && filtered !== null ? (filtered as Record<string, unknown>) : undefined,
        { headers: cacheHeaders }
      );
    }

    return apiSuccess(TX_SUMMARY, TX_SUMMARY, { headers: cacheHeaders });
  } catch (error) {
    logger.error('TransactionSummaryAPI.GET', 'Error fetching transaction summary', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
}
