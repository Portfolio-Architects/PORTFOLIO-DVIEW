import { NextRequest, NextResponse } from 'next/server';
import { getOfficeTransactions } from '@/lib/services/officeTx.service';
import { logger } from '@/lib/services/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lawdCd = searchParams.get('lawdCd') || '41591';
  const dealYmd = searchParams.get('dealYmd') || 'all';

  try {
    const list = await getOfficeTransactions(lawdCd, dealYmd);
    logger.info('GET /api/technovalley/transactions', 'Fetched office transactions successfully', { count: list.length, lawdCd, dealYmd });
    
    return NextResponse.json(list, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
      }
    });
  } catch (err) {
    logger.error('GET /api/technovalley/transactions', 'Failed to fetch office transactions', { lawdCd, dealYmd }, err);
    return NextResponse.json({ error: '지식산업센터 실거래 조회 실패' }, { status: 500 });
  }
}
