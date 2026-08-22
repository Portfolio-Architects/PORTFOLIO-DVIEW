import { NextRequest } from 'next/server';
import { getOfficeTransactions } from '@/lib/services/officeTx.service';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const rateLimit = await checkRateLimit(request, {
    prefix: 'ratelimit_technovalley_transactions',
    requestsPerLimit: 60,
  });
  if (!rateLimit.success) {
    return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
  }

  const { searchParams } = new URL(request.url);
  const lawdCd = searchParams.get('lawdCd') || '41591';
  const dealYmd = searchParams.get('dealYmd') || 'all';

  try {
    const list = await getOfficeTransactions(lawdCd, dealYmd);
    logger.info('GET /api/technovalley/transactions', 'Fetched office transactions successfully', { count: list.length, lawdCd, dealYmd });

    return apiSuccess(list, undefined, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    logger.error('GET /api/technovalley/transactions', 'Failed to fetch office transactions', { lawdCd, dealYmd }, err as Error);
    return apiError('OFFICE_TRANSACTIONS_FAILED', '지식산업센터 실거래 조회 실패', 500);
  }
}
