import { NextResponse } from 'next/server';

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



export async function GET() {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(TYPE_MAP_TAB)}&_t=${Date.now()}`;
    const res = await fetch(csvUrl, { cache: 'no-store' });

    if (!res.ok) {
      console.warn('[TYPE_MAP] Sheet fetch failed, using fallback');
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
        entries.push({ aptName, area, typeM2, typePyeong });
      }
    }

    // If sheet returned no data, use fallback
    if (entries.length === 0) {
      console.warn('[TYPE_MAP] Sheet returned 0 entries, using fallback');
      return NextResponse.json({ entries: FALLBACK_MAP, source: 'fallback' });
    }

    return NextResponse.json({ entries, source: 'sheet' }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: unknown) {
    console.error('[TYPE_MAP] Error:', (error as Error).message);
    return NextResponse.json({ entries: FALLBACK_MAP, source: 'fallback' });
  }
}

/** 하드코딩 폴백 (시트 접근 실패 시 사용) */
const FALLBACK_MAP: TypeMapEntry[] = [
  { aptName: '힐스테이트동탄역', area: '54.5533', typeM2: '78A', typePyeong: '' },
  { aptName: '힐스테이트동탄역', area: '54.4202', typeM2: '78B', typePyeong: '' },
];
