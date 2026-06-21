import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { readJsonFileCached } from '@/lib/utils/server/fileReader';
import { rateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

async function getTxSummary(): Promise<Record<string, any>> {
  try {
    const parsed = await readJsonFileCached<{ summary: Record<string, any> }>('public/data/tx-summary.json', { summary: {} });
    return parsed?.summary || parsed || {};
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
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_txsummary_get_${rawIp}`);
      if (!success) {
        logger.warn('TransactionSummaryAPI.GET', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
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
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const { apartment } = parsedQuery.data;

    if (apartment) {
      const filtered = TX_SUMMARY[apartment] || null;
      if (!filtered) {
        logger.warn('TransactionSummaryAPI.GET', 'Apartment not found in transaction summary', {
          apartment,
        });
        return NextResponse.json({ error: 'Apartment not found' }, { status: 404 });
      }
      return NextResponse.json(filtered);
    }

    return NextResponse.json(TX_SUMMARY);
  } catch (error) {
    logger.error('TransactionSummaryAPI.GET', 'Error fetching transaction summary', {}, error as Error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

