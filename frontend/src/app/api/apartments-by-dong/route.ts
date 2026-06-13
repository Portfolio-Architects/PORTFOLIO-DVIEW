import { NextRequest, NextResponse } from 'next/server';
import { fetchSheetApartmentsByDong } from '@/lib/services/googleSheets';
import { rateLimiter } from '@/lib/rate-limit';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const revalidate = 0; // force-dynamic

const ApartmentsQuerySchema = z.object({
  bypassCache: z.preprocess((val) => val === 'true', z.boolean()),
});

export async function GET(request: NextRequest) {
  try {
    if (rateLimiter) {
      const ip = request.headers.get('x-forwarded-for') ?? '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_${ip}`);
      if (!success) {
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    const { searchParams } = request.nextUrl;
    const queryParse = ApartmentsQuerySchema.safeParse({
      bypassCache: searchParams.get('bypassCache'),
    });

    if (!queryParse.success) {
      logger.warn('ApartmentsByDongAPI.GET', 'Invalid query parameters', { errors: queryParse.error.format() });
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    const { bypassCache } = queryParse.data;
    const result = await fetchSheetApartmentsByDong(bypassCache);
    return NextResponse.json(result);
  } catch (err: unknown) {
    logger.error('ApartmentsByDongAPI.GET', 'Error loading apartments', {}, err as Error);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
