import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/authUtils';
import { getAdminAnalyticsLKG } from '@/lib/analytics-service';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const data = await getAdminAnalyticsLKG();
    logger.info('AdminAnalyticsAPI.GET', 'Analytics data fetched successfully');
    return NextResponse.json({ data });
  } catch (error: unknown) {
    logger.error('AdminAnalyticsAPI.GET', 'GA4 API Fetch Error', {}, error as Error);
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error)?.message }, { status: 500 });
  }
}
