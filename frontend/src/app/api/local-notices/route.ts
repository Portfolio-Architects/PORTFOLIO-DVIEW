import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { getLocalNotices } from '@/lib/services/newsData';
import { rateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const LocalNoticesQuerySchema = z.object({
  dongtan: z.preprocess((val) => val !== 'false', z.boolean()),
});

export async function GET(request: NextRequest) {
  try {
    // 1. IP 속도 제한 (Rate Limiting) 가드
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_localnotices_${rawIp}`);
      if (!success) {
        logger.warn('LocalNoticesAPI.GET', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    const { searchParams } = request.nextUrl;
    const queryParse = LocalNoticesQuerySchema.safeParse({
      dongtan: searchParams.get('dongtan'),
    });

    if (!queryParse.success) {
      logger.warn('LocalNoticesAPI.GET', 'Invalid query parameters', { errors: queryParse.error.format() });
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const { dongtan: filterDongtan } = queryParse.data;

    const responseData = await getLocalNotices(filterDongtan);

    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300'
      }
    });

  } catch (error: unknown) {
    logger.error('LocalNoticesAPI.GET', 'Error fetching local notices', {}, error as Error);
    return NextResponse.json({ 
      notices: [], 
      lastUpdated: null, 
      source: 'fallback_error', 
      error: 'Failed to fetch local notices'
    });
  }
}
