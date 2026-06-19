import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { getLocalNotices } from '@/lib/services/newsData';

export const dynamic = 'force-dynamic';

const LocalNoticesQuerySchema = z.object({
  dongtan: z.preprocess((val) => val !== 'false', z.boolean()),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
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
