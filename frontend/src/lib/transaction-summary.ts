/**
 * 실거래가 및 전월세 요약 데이터
 * 
 * Single Source of Truth: public/data/tx-summary.json
 * Replaces legacy hardcoded 8,000+ line static snapshot with live typed dataset.
 */

import txSummaryJson from '../../public/data/tx-summary.json';

export interface RecentTx {
  date: string;
  priceEok: string;
  areaPyeong: number;
  floor: number;
  area: number;
  priceVal?: number;
  dealType?: string;
  isNewHigh?: boolean;
  newHighDelta?: number;
  prevPriceVal?: number;
  delta?: number;
  deltaPercent?: number;
  contractDate?: string;
  dateLabel?: string;
}

export interface AptTxSummary {
  // 매매 (Sale)
  latestPrice: number;
  latestPriceEok: string;
  latestArea: number;
  latestFloor: number;
  latestDate: string;
  maxPrice: number;
  maxPriceEok: string;
  minPrice: number;
  minPriceEok: string;
  txCount: number;
  avg1MPrice: number;
  avg1MPriceEok: string;
  avg1MPerPyeong?: number;
  avg1MTxCount?: number;
  avg3MPrice?: number;
  avg3MPriceEok?: string;
  avg3MPerPyeong?: number;
  avg3MTxCount?: number;
  recent?: RecentTx[];
  
  // 전월세 (Rent/Jeonse)
  rentTxCount?: number;
  latestRentDeposit?: number;
  latestRentDepositEok?: string;
  latestRentMonthly?: number;
  latestRentDate?: string;
  avg1MRentDeposit?: number;
  avg1MRentDepositEok?: string;
  avg3MRentDeposit?: number;
  avg3MRentDepositEok?: string;

  // 법정동
  dong?: string;
}

export interface DongtanMacroTrendPoint {
  name: string;
  '동탄 아파트 전체': number;
  '동탄 아파트 전세 평균': number;
}

const rawSummary =
  (txSummaryJson as unknown as { summary?: Record<string, AptTxSummary> })?.summary ||
  (txSummaryJson as unknown as Record<string, AptTxSummary>);

export const TX_SUMMARY: Record<string, AptTxSummary> = rawSummary || {};
