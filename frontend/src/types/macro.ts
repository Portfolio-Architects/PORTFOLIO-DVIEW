/**
 * @module macro
 * @description Canonical macroeconomic indicators and supply pipeline domain models.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Macroeconomic environment state */
export interface MacroEnvironment {
  riskFreeRate: number; // e.g., KTB 3Y Yield (국고채 3년물 금리), percent
  fundingCost: number;  // e.g., COFIX or Average Jeonse Loan Rate (전세대출금리), percent
  baseDate: string;     // YYYY-MM-DD
  jeonseConversionRate: number; // 전월세 전환율 (e.g. 0.05 for 5%)
  baseInflationRate: number;    // 장기 기대 인플레이션 (e.g. 0.02 for 2%)
}

/** Regional apartment supply pipeline projection */
export interface SupplyPipeline {
  region: string;       // e.g., '동탄2신도시' or '화성시'
  baseYear: number;
  expectedMoveInVolume: number; // 입주 예정 물량 (세대)
  historicalAvgVolume: number;  // 과거 10년 연평균 입주 물량 (세대)
  populationTrend: '증가' | '보합' | '감소';
}

/** Complete macro configuration package */
export interface MacroDataConfig {
  macroEnvironment: MacroEnvironment;
  supplyPipelines: Record<string, SupplyPipeline>;
}
