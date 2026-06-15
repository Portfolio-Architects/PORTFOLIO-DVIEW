import { NextResponse } from 'next/server';
import { getPublicAnalyticsLKG } from '@/lib/analytics-service';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic'; // LKG handles caching explicitly now

export async function GET() {
  try {
    const data = await getPublicAnalyticsLKG();
    return NextResponse.json(data);
  } catch (error: unknown) {
    logger.error('PublicAnalyticsAPI.GET', 'Failed to load analytics data', {}, error as Error);
    return NextResponse.json({ error: 'Failed to load analytics data' }, { status: 500 });
  }
}
