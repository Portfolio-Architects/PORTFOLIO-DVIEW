/**
 * 거시 경제 지표 및 공급 파이프라인 (빌드 타임 동기화)
 * 
 * ⚠️ 이 파일은 자동 생성됩니다. 직접 수정하지 마세요!
 * 동기화: npm run sync-macro
 */

import { MacroDataConfig } from './types/macro.types';

export const MACRO_CONFIG: MacroDataConfig = {
  "macroEnvironment": {
    "riskFreeRate": 3.25,
    "fundingCost": 4.1,
    "baseDate": "2026-06-13",
    "jeonseConversionRate": 0.05,
    "baseInflationRate": 0.02
  },
  "supplyPipelines": {
    "동탄2신도시": {
      "region": "동탄2신도시",
      "baseYear": 2026,
      "expectedMoveInVolume": 12500,
      "historicalAvgVolume": 8000,
      "populationTrend": "증가"
    },
    "화성시": {
      "region": "화성시",
      "baseYear": 2026,
      "expectedMoveInVolume": 22000,
      "historicalAvgVolume": 15000,
      "populationTrend": "증가"
    }
  }
};
