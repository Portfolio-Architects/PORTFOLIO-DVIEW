/**
 * @module transaction
 * @description Canonical domain models for Real Estate Transactions, Price Summaries, and Volume Metrics.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Canonical Transaction Record */
export type { LocationScoreItem, LocationScore } from './apartment';

export interface TransactionRecord {
  dong: string;
  aptName: string;
  area: number;
  areaPyeong: number;
  contractYm: string;
  contractDay: string;
  price: number;
  priceEok: string;
  deposit?: number;
  monthlyRent?: number;
  floor: number;
  buildYear: number;
  dealType: string;
  reqGb?: string;
  rnuYn?: string;
  cancelDate?: string;
  isOutlier?: boolean;
  areaLabelM2?: string;
  areaLabelPyeong?: string;
  buyer?: string;
  seller?: string;
  roadName?: string;
  contractDate?: string;
  priceVal?: number;
  isNewHigh?: boolean;
  newHighDelta?: number;
  prevPriceVal?: number;
  delta?: number;
  deltaPercent?: number;
  dateLabel?: string;
}

export type RawTransactionRecord = Partial<TransactionRecord> & Record<string, unknown>;

/** Recent transaction record representation */
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

/** Dashboard recent transaction card item */
export interface RecentTransaction {
  aptName: string;
  txKey: string;
  date: string;
  contractDate: string;
  priceVal: number;
  priceEok: string;
  area: number;
  areaPyeong: number;
  floor: number | string;
  dealType: string;
  isNewHigh?: boolean;
  prevPriceVal?: number;
  delta?: number;
  deltaPercent?: number;
  dateLabel?: string;
}

/** Comprehensive apartment transaction and rental statistics summary */
export interface AptTxSummary {
  // 매매 (Sale)
  latestPrice: number;
  latestPriceEok: string;
  latestArea: number;
  latestFloor: number;
  latestDate: string;
  maxPrice: number;
  maxPriceEok: string;
  maxPriceByArea?: Record<string, number>;
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
  recent: RecentTx[];

  // 전월세 (Rent / Jeonse)
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

/** 7-day rolling volume trend badge data */
export interface Recent7DaysVolume {
  currentCount: number;
  prevCount: number;
  trendText: string;
  trendColor: string;
  badge: string;
}

/** Dongtan Macro Trend chart data point */
export interface DongtanMacroTrendPoint {
  name: string;
  '동탄 아파트 전체': number;
  '동탄 아파트 전세 평균': number;
}

/** MOLIT Open Data XML raw parsed record */
export interface MolTransactionXml {
  buildingName: string;
  type: '매매' | '임대';
  priceRaw: string;
  depositRaw?: string;
  sizeSqM: number;
  floor: number;
  year: string;
  month: string;
  day: string;
  jibun?: string;
}
