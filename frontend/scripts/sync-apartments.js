#!/usr/bin/env node
/**
 * 🔄 Google Sheet → apartment-data.ts 동기화 스크립트
 * 
 * 사용법: npm run sync-apartments
 * 
 * Google Sheet의 'apartments' 탭에서 데이터를 읽어
 * frontend/src/lib/apartment-data.ts 파일을 자동 생성합니다.
 * 
 * Sheet 컬럼: 아파트명 | 좌표 | 세대수 | 사용승인 | 용적률 | 건폐율 | 주차대수 | 시공사 | Dong
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { z } = require('zod');

const StaticApartmentSchema = z.object({
  name: z.string().min(1, '아파트명은 필수입니다.'),
  dong: z.string().min(1, '동 정보는 필수입니다.'),
  householdCount: z.number().int().positive().optional(),
  yearBuilt: z.string().min(1).optional(),
  brand: z.string().optional(),
});

const SHEET_ID = '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';
const SHEET_TAB = 'apartments';
const OUTPUT_PATH = path.resolve(__dirname, '../src/lib/apartment-data.ts');

function fetchCSV(sheetId, tab) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}&headers=1`;
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Follow redirect
        https.get(res.headers.location, (res2) => {
          let data = '';
          res2.on('data', chunk => data += chunk);
          res2.on('end', () => resolve(data));
        }).on('error', reject);
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

async function main() {
  console.log('📡 Google Sheet에서 데이터 읽는 중...');
  
  const csvText = await fetchCSV(SHEET_ID, SHEET_TAB);
  const lines = csvText.split('\n').filter(l => l.trim());
  const rows = lines.map(l => parseCsvLine(l));

  // 헤더에서 각 컬럼 인덱스 찾기
  const header = rows[0].map(h => h.toLowerCase().replace(/\s+/g, '').trim());
  
  const findIdx = (keys) => {
    for (const k of keys) {
      const idx = header.findIndex(h => h === k.toLowerCase().replace(/\s+/g, ''));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  const nameIdx = findIdx(['아파트명', 'name', '이름']);
  const dongIdx = findIdx(['dong', '동']);
  const hhIdx = findIdx(['세대수', 'householdcount', 'households']);
  const yearIdx = findIdx(['시공&준공인', '사용승인', '준공연도', 'yearbuilt', '준공']);
  const brandIdx = findIdx(['시공사', 'brand', '브랜드']);

  console.log(`📋 헤더: ${rows[0].join(' | ')}`);
  console.log(`📍 Dong 컬럼 인덱스: ${dongIdx}, Name: ${nameIdx}, Households: ${hhIdx}, Year: ${yearIdx}, Brand: ${brandIdx}`);

  if (nameIdx === -1 || dongIdx === -1) {
    throw new Error('필수 컬럼(아파트명 또는 Dong)을 찾을 수 없습니다.');
  }

  // 파싱
  const byDong = {};
  let total = 0;

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const name = cols[nameIdx]?.trim();
    const dong = cols[dongIdx]?.trim();
    if (!name || !dong) continue;

    if (!byDong[dong]) byDong[dong] = [];

    const apt = { name, dong };
    
    // 선택적 필드 (있으면 추가)
    if (hhIdx !== -1) {
      const householdsStr = cols[hhIdx]?.replace(/,/g, '');
      const households = householdsStr ? parseInt(householdsStr) : NaN;
      if (!isNaN(households) && households > 0) apt.householdCount = households;
    }
    
    if (yearIdx !== -1) {
      const yearRaw = cols[yearIdx]?.trim();
      if (yearRaw) {
        const year = yearRaw.length >= 4 ? yearRaw.slice(0, 4) : yearRaw;
        apt.yearBuilt = year;
      }
    }
    
    if (brandIdx !== -1) {
      const brand = cols[brandIdx]?.trim();
      if (brand) {
        apt.brand = brand.replace(/\(주\)/g, '').replace(/주식회사/g, '').trim();
      }
    }

    const parsed = StaticApartmentSchema.safeParse(apt);
    if (parsed.success) {
      byDong[dong].push(parsed.data);
      total++;
    } else {
      console.warn(`[Sync Apartments] Skipping invalid record at line ${i + 1} for ${name}:`, parsed.error.format());
    }
  }


  // 동 내 이름순 정렬
  Object.values(byDong).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name, 'ko')));

  const dongNames = Object.keys(byDong).sort((a, b) => a.localeCompare(b, 'ko'));
  
  console.log(`\n✅ 파싱 완료: ${dongNames.length}개 동, ${total}개 아파트`);
  dongNames.forEach(d => console.log(`   ${d}: ${byDong[d].length}개`));

  // TypeScript 파일 생성
  let ts = `/**
 * 정적 아파트 데이터 — 빌드 타임에 포함되어 API 호출 없이 즉시 사용 가능
 * 
 * ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
 * 동기화: npm run sync-apartments
 * 마지막 동기화: ${new Date().toISOString().slice(0, 10)}
 */

export interface StaticApartment {
  name: string;
  dong: string;
  householdCount?: number;
  yearBuilt?: string;
  brand?: string;
}

/** 동별 아파트 데이터 (정렬됨) */
export const APARTMENTS_BY_DONG: Record<string, StaticApartment[]> = {\n`;

  for (const dong of dongNames) {
    ts += `  '${dong}': [\n`;
    for (const apt of byDong[dong]) {
      const fields = [`name: '${apt.name.replace(/'/g, "\\'")}', dong: '${dong}'`];
      if (apt.householdCount) fields.push(`householdCount: ${apt.householdCount}`);
      if (apt.yearBuilt) fields.push(`yearBuilt: '${apt.yearBuilt}'`);
      if (apt.brand) fields.push(`brand: '${apt.brand.replace(/'/g, "\\'")}'`);
      ts += `    { ${fields.join(', ')} },\n`;
    }
    ts += `  ],\n`;
  }

  ts += `};\n\n/** 전체 아파트 수 */\nexport const TOTAL_APARTMENTS = Object.values(APARTMENTS_BY_DONG).flat().length;\n`;

  fs.writeFileSync(OUTPUT_PATH, ts, 'utf-8');
  console.log(`\n📁 파일 생성: ${OUTPUT_PATH}`);
  console.log(`🎉 동기화 완료! git add + commit + push 하세요.`);
}

main().catch(err => {
  console.error('❌ 동기화 실패:', err.message);
  process.exit(1);
});
