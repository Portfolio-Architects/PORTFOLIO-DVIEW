#!/usr/bin/env node
/**
 * 🔄 Google Sheets (MACRO_DATA) → macro-summary.ts 동기화 스크립트
 * 
 * 사용법: npm run sync-macro
 * 
 * Google Sheets에서 거시 경제 데이터 및 공급 파이프라인 정보를 읽어와
 * frontend/src/lib/macro-summary.ts 정적 파일로 생성합니다.
 */

require('dotenv').config({ path: '.env.local', override: true });
const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.resolve(__dirname, '../src/lib/macro-summary.ts');
const SHEET_ID = process.env.SHEET_ID || '1rKMt-B2FdN5nGaxaU0y2Pqv1WqnEv1AGnY7XXE7pCEE';

// Fallback (기본) 데이터
const DEFAULT_MACRO_CONFIG = {
  macroEnvironment: {
    riskFreeRate: 3.25, // 국고채 3년물 (예시)
    fundingCost: 4.10,  // 시중은행 전세자금대출 평균금리 (예시)
    baseDate: new Date().toISOString().split('T')[0],
    jeonseConversionRate: 0.05, // 법정/시장 평균 전월세 전환율 5.0%
    baseInflationRate: 0.02,    // 장기 기대 인플레이션 2.0%
  },
  supplyPipelines: {
    '동탄2신도시': {
      region: '동탄2신도시',
      baseYear: new Date().getFullYear(),
      expectedMoveInVolume: 12500, // 26~27년 누적 입주예정
      historicalAvgVolume: 8000,
      populationTrend: '증가',
    },
    '화성시': {
      region: '화성시',
      baseYear: new Date().getFullYear(),
      expectedMoveInVolume: 22000,
      historicalAvgVolume: 15000,
      populationTrend: '증가',
    }
  }
};

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
  console.log('📡 Google Sheets에서 거시(Macro) 데이터를 동기화합니다...');
  
  let config = JSON.parse(JSON.stringify(DEFAULT_MACRO_CONFIG));
  
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=MACRO_DATA`;
    const res = await fetch(csvUrl);
    
    if (res.ok) {
      const csvText = await res.text();
      const lines = csvText.split('\n').filter(l => l.trim());
      
      // 구글 시트 MACRO_DATA 구조 가정:
      // Type (Environment | Pipeline), Key (ex: riskFreeRate | 동탄2신도시), Value1, Value2, Value3...
      
      let parsedSuccessfully = false;
      
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]).map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length < 3) continue;
        
        const type = cols[0].toLowerCase();
        const key = cols[1];
        
        if (type === 'environment') {
          parsedSuccessfully = true;
          // Key: riskFreeRate, Value: 3.25
          const val = parseFloat(cols[2]);
          if (!isNaN(val)) {
            config.macroEnvironment[key] = val;
          } else if (key === 'baseDate') {
            config.macroEnvironment.baseDate = cols[2];
          }
        } else if (type === 'pipeline') {
          parsedSuccessfully = true;
          // Key: 동탄2신도시, Value1(expected): 12500, Value2(historical): 8000, Value3(trend): 증가
          config.supplyPipelines[key] = {
            region: key,
            baseYear: new Date().getFullYear(),
            expectedMoveInVolume: parseFloat(cols[2]) || 0,
            historicalAvgVolume: parseFloat(cols[3]) || 0,
            populationTrend: cols[4] || '보합'
          };
        }
      }
      
      if (!parsedSuccessfully) {
         console.log('⚠️ MACRO_DATA 시트를 찾지 못했거나 포맷이 다릅니다. (Type, Key, Value 컬럼 필요)');
         console.log('   기본(Fallback) 거시 데이터를 사용합니다.');
      } else {
         console.log('✅ Google Sheets에서 성공적으로 데이터를 파싱했습니다.');
      }

    } else {
      console.log(`⚠️ HTTP ${res.status}: MACRO_DATA 시트를 불러오지 못했습니다. 기본값을 사용합니다.`);
    }
  } catch(e) {
    console.error('⚠️ 데이터 동기화 중 오류 발생. 기본값을 사용합니다.', e.message);
  }

  // TypeScript 파일 생성
  let ts = `/**
 * 거시 경제 지표 및 공급 파이프라인 (빌드 타임 동기화)
 * 
 * ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
 * 동기화: npm run sync-macro
 */

import { MacroDataConfig } from './types/macro.types';

export const MACRO_CONFIG: MacroDataConfig = ${JSON.stringify(config, null, 2)};
`;

  fs.writeFileSync(OUTPUT_PATH, ts, 'utf8');
  console.log(`\n📁 파일 생성 완료: ${OUTPUT_PATH}`);
}

main();
