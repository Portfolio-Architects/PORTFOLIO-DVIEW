import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const runtime = 'edge';
import { SHEET_ID, SHEET_TABS, parseCsvLine } from '@/lib/constants';

const TYPE_MAP_TAB = SHEET_TABS.TYPE_MAP;

export const revalidate = 0; // force-dynamic

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedQuery = typeMapQuerySchema.safeParse({
      refresh: searchParams.get('refresh') || undefined,
    });

    if (!parsedQuery.success) {
      logger.warn('TypeMapAPI.GET', 'Invalid query parameters', {
        errors: parsedQuery.error.format(),
      });
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TYPE_MAP_TAB)}&_t=${Date.now()}`;
    const res = await fetch(csvUrl, { cache: 'no-store' });

    if (!res.ok) {
      logger.warn('TypeMapAPI.GET', 'Sheet fetch failed, using fallback', {});
      return NextResponse.json({ entries: FALLBACK_MAP });
    }

    const csvText = await res.text();
    const lines = csvText.split('\n').filter(l => l.trim());

    // Header row (row 0): 아파트명, 전용면적, 타입명
    const entries: TypeMapEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 3) continue;
      const aptName = cols[1]?.trim(); // 인덱스 보정
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

    // If sheet returned no data, use fallback
    if (entries.length === 0) {
      logger.warn('TypeMapAPI.GET', 'Sheet returned 0 entries, using fallback', {});
      return NextResponse.json({ entries: FALLBACK_MAP, source: 'fallback' });
    }

    return NextResponse.json({ entries, source: 'sheet' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    logger.error('TypeMapAPI.GET', 'Error in type-map API route', {}, error as Error);
    return NextResponse.json({ entries: FALLBACK_MAP, source: 'fallback' });
  }
}

/** 하드코딩 폴백 (시트 접근 실패 시 사용) */
const FALLBACK_MAP: TypeMapEntry[] = [
  { aptName: '힐스테이트동탄역', area: '54.5533', typeM2: '78A', typePyeong: '' },
  { aptName: '힐스테이트동탄역', area: '54.4202', typeM2: '78B', typePyeong: '' },
];
