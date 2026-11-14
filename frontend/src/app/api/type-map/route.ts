import { NextRequest } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { resilientFetchText } from '@/lib/api/resilientFetch';
import { SHEET_ID, SHEET_TABS, parseCsvLine } from '@/lib/constants';
import { serverLruCache } from '@/lib/utils/server/lruCache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPE_MAP_TAB = SHEET_TABS.TYPE_MAP;
const TYPE_MAP_CACHE_KEY = 'api:type-map:entries';
const TYPE_MAP_EDGE_CACHE = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
const TYPE_MAP_FALLBACK_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';
const TYPE_MAP_BYPASS_CACHE = 'no-store, no-cache, must-revalidate, max-age=0';

export interface TypeMapEntry {
  aptName: string;
  area: string;
  typeM2: string;
  typePyeong: string;
}

const typeMapQuerySchema = z.object({
  refresh: z.string().optional().transform((v) => v === '1'),
});

const typeMapEntrySchema = z.object({
  aptName: z.string().min(1),
  area: z.string().min(1),
  typeM2: z.string().optional().default(''),
  typePyeong: z.string().optional().default(''),
});

const FALLBACK_MAP: TypeMapEntry[] = [
  { aptName: '힐스테이트동탄역', area: '54.5533', typeM2: '78A', typePyeong: '' },
  { aptName: '힐스테이트동탄역', area: '54.4202', typeM2: '78B', typePyeong: '' },
];

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_typemap',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('TypeMapAPI.GET', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const { searchParams } = request.nextUrl;
    const parsedQuery = typeMapQuerySchema.safeParse({
      refresh: searchParams.get('refresh') || undefined,
    });

    if (!parsedQuery.success) {
      logger.warn('TypeMapAPI.GET', 'Invalid query parameters', {
        errors: parsedQuery.error.format(),
      });
      return apiError('INVALID_QUERY', 'Bad Request', 400);
    }

    const isRefresh = parsedQuery.data.refresh;
    const fallbackHeaders = {
      'Cache-Control': isRefresh ? TYPE_MAP_BYPASS_CACHE : TYPE_MAP_FALLBACK_CACHE,
    };

    if (!isRefresh && process.env.NODE_ENV !== 'test') {
      const cachedEntries = serverLruCache.get<TypeMapEntry[]>(TYPE_MAP_CACHE_KEY);
      if (cachedEntries && cachedEntries.length > 0) {
        return apiSuccess(
          { entries: cachedEntries, source: 'sheet' },
          { entries: cachedEntries, source: 'sheet' },
          { headers: { 'Cache-Control': TYPE_MAP_EDGE_CACHE } }
        );
      }
    }

    const cacheBustParam = isRefresh ? `&_t=${Date.now()}` : '';
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TYPE_MAP_TAB)}${cacheBustParam}`;
    let csvText = '';
    try {
      csvText = await resilientFetchText(csvUrl, { timeoutMs: 3000, retries: 1 });
    } catch {
      logger.warn('TypeMapAPI.GET', 'Sheet fetch failed, using fallback', {});
      return apiSuccess(
        { entries: FALLBACK_MAP, source: 'fallback' },
        { entries: FALLBACK_MAP, source: 'fallback' },
        { headers: fallbackHeaders }
      );
    }

    const lines = csvText.split('\n').filter((l) => l.trim());
    const entries: TypeMapEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 3) continue;
      const aptName = cols[1]?.trim();
      const area = cols[2]?.trim();
      const typeM2 = cols[3]?.trim() || '';
      const typePyeong = cols[5]?.trim() || '';

      if (aptName && area && (typeM2 || typePyeong)) {
        const item = { aptName, area, typeM2, typePyeong };
        const parsedEntry = typeMapEntrySchema.safeParse(item);
        if (parsedEntry.success) {
          entries.push(parsedEntry.data);
        } else {
          logger.warn('TypeMapAPI.GET', 'Invalid CSV row format in type map sheet', {
            errors: parsedEntry.error.format(),
            row: i,
          });
        }
      }
    }

    if (entries.length === 0) {
      logger.warn('TypeMapAPI.GET', 'Sheet returned 0 entries, using fallback', {});
      return apiSuccess(
        { entries: FALLBACK_MAP, source: 'fallback' },
        { entries: FALLBACK_MAP, source: 'fallback' },
        { headers: fallbackHeaders }
      );
    }

    if (process.env.NODE_ENV !== 'test') {
      serverLruCache.set(TYPE_MAP_CACHE_KEY, entries, 300 * 1000);
    }

    return apiSuccess({ entries, source: 'sheet' }, { entries, source: 'sheet' }, {
      headers: {
        'Cache-Control': isRefresh ? TYPE_MAP_BYPASS_CACHE : TYPE_MAP_EDGE_CACHE,
      },
    });
  } catch (error: unknown) {
    logger.error('TypeMapAPI.GET', 'Error in type-map API route', {}, error as Error);
    return apiSuccess(
      { entries: FALLBACK_MAP, source: 'fallback' },
      { entries: FALLBACK_MAP, source: 'fallback' },
      { headers: { 'Cache-Control': TYPE_MAP_FALLBACK_CACHE } }
    );
  }
}
