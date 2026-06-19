import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { getMacroNews } from '@/lib/services/newsData';

export const dynamic = 'force-dynamic';

const macroNewsQuerySchema = z.object({
  limit: z.string().optional().transform((v) => {
    if (!v) return 100;
    const parsed = parseInt(v, 10);
    return isNaN(parsed) ? 100 : Math.min(Math.max(parsed, 1), 100);
  }),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = macroNewsQuerySchema.safeParse({
      limit: searchParams.get('limit') || undefined,
    });

    if (!parsedQuery.success) {
      logger.warn('MacroNewsAPI.GET', 'Invalid query parameters', {
        errors: parsedQuery.error.format(),
      });
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const { limit } = parsedQuery.data;
    const newsItems = await getMacroNews(limit);

    return NextResponse.json({
      status: 'success',
      data: newsItems,
    });
  } catch (error) {
    logger.error('MacroNewsAPI.GET', 'Error during GET request', {}, error as Error);
    return NextResponse.json(
      { status: 'error', message: 'Failed to fetch news data' },
      { status: 500 }
    );
  }
}
