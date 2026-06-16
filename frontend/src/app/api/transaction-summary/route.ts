import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { readJsonFileCached } from '@/lib/utils/server/fileReader';

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

export async function GET(request: Request) {
  try {
    const TX_SUMMARY = await getTxSummary();
    const { searchParams } = new URL(request.url);
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

