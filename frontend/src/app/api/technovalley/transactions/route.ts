import { NextRequest, NextResponse } from 'next/server';
import { getOfficeTransactions } from '@/lib/services/officeTx.service';
import { logger } from '@/lib/services/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lawdCd = searchParams.get('lawdCd') || '41590';
  const dealYmd = searchParams.get('dealYmd') || '202605';

  try {
    const list = await getOfficeTransactions(lawdCd, dealYmd);
    logger.info('GET /api/technovalley/transactions', 'Fetched office transactions successfully', { count: list.length, lawdCd, dealYmd });
    
    // Add brief cache header for performance (max-age 60s, stale-while-revalidate 30s)
    return NextResponse.json(list, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30'
      }
    });
  } catch (err) {
    logger.error('GET /api/technovalley/transactions', 'Failed to fetch office transactions', { lawdCd, dealYmd }, err);
    return NextResponse.json({ error: '지식산업센터 실거래 조회 실패' }, { status: 500 });
  }
}
