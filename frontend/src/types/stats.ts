/**
 * @module stats
 * @description Canonical domain models, filter types, and aggregated statistics interfaces
 * for the D-VIEW Real Estate Statistics Engine and Interactive Report Dashboard.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

import type { AptTxSummary, DongtanMacroTrendPoint, RecentTransaction, TransactionRecord } from './transaction';
import type { DongApartment } from './apartment';

// ============================================================================
// 1. Filter Dimension Types
// ============================================================================

/** Region & Legal Dong Filter Dimension */
export type RegionFilter = 'ALL' | 'DONGTAN1' | 'DONGTAN2' | string;

/** Pyeong Tier Filter Dimension */
export type PyeongFilter = 'ALL' | 'SMALL' | 'MEDIUM_SMALL' | 'MEDIUM_LARGE' | 'LARGE';

/** Multi-Timeframe Aggregation Filter Dimension */
export type TimeframeFilter = '1M' | '3M' | '6M' | '1Y' | 'ALL';

/** Ranking and Table Sort Options */
export type SortOption = 'VOLUME_DESC' | 'PRICE_DESC' | 'PRICE_ASC' | 'PYEONG_DESC' | 'JEONSE_DESC';

/** Consolidated Filter State for UI Controls and Stats Engine */
export interface StatsFilterState {
  region: RegionFilter;
  pyeong: PyeongFilter;
  timeframe: TimeframeFilter;
  sort?: SortOption;
  dong?: string;
  excludeOutliers?: boolean;
  excludeCanceled?: boolean;
  excludeDirectDeals?: boolean;
  referenceDate?: string | Date;
}

// ============================================================================
// 2. Canonical Constants & Meta Types
// ============================================================================

export const DONGTAN1_DONGS = ['반송동', '석우동', '능동'] as const;
export const DONGTAN2_DONGS = ['청계동', '여울동', '영천동', '목동', '산척동', '송동', '신동', '장지동'] as const;
export const ALL_LEGAL_DONGS = [...DONGTAN1_DONGS, ...DONGTAN2_DONGS] as const;

export type Dongtan1Dong = typeof DONGTAN1_DONGS[number];
export type Dongtan2Dong = typeof DONGTAN2_DONGS[number];
export type LegalDongName = Dongtan1Dong | Dongtan2Dong;

export type PyeongTier = 'SMALL' | 'MEDIUM_SMALL' | 'MEDIUM_LARGE' | 'LARGE';

export interface PyeongTierMeta {
  tier: PyeongFilter;
  label: string;
  subLabel: string;
  minAreaM2: number;
  maxAreaM2: number;
  minPyeong: number;
  maxPyeong: number;
}

// ============================================================================
// 3. Statistical Data Items & Aggregates
// ============================================================================

/** Statistics for an individual apartment complex within the active filter scope */
export interface ComplexStatItem {
  aptKey: string;
  aptName: string;
  dong: string;
  region: '동탄1' | '동탄2';
  txCount: number;
  avgPrice: number; // in 만원 (10,000 KRW)
  avgPyeongPrice: number; // in 만원/평
  jeonseRatio: number; // percentage, e.g. 68.5
  latestPrice: number; // in 만원
  highestPrice: number; // in 만원
  lowestPrice: number; // in 만원
  urgentSaleDiscountRate?: number; // percentage, e.g. 8.5
  isNewHigh: boolean;
}

/** Time-series trend point for macro composed chart (price & volume) */
export interface MacroTimeSeriesPoint {
  date: string; // YYYY-MM
  avgSalePrice: number; // in 만원
  avgRentDeposit: number; // in 만원
  volume: number; // transaction count
}

/** Volume distribution item for pie/donut charts */
export interface VolumeDistributionItem {
  name: string; // e.g. "소형 (60㎡ 이하)" or "청계동"
  value: number; // transaction count
  percentage: number; // e.g. 35.5
}

/** 4 High-Dwell-Time Hyperlocal Insight Summary Cards Data */
export interface HyperlocalInsightCardsData {
  newHighComplex: ComplexStatItem | null;
  optimalGapComplex: ComplexStatItem | null;
  volumeSurgeComplex: ComplexStatItem | null;
  urgentBargainComplex: ComplexStatItem | null;
}

/** Top-level aggregated statistics result returned by statsEngine */
export interface StatsAggregateResult {
  totalVolume: number; // total matched transaction count
  avgSalePrice: number; // in 만원
  avgPyeongPrice: number; // in 만원/평
  avgJeonseRatio: number; // percentage
  volumeChangeMoM: number; // percentage change vs previous month
  timeSeriesTrend: MacroTimeSeriesPoint[];
  pyeongRankings: ComplexStatItem[];
  volumeDistribution: VolumeDistributionItem[];
  insights: HyperlocalInsightCardsData;
  isLoading: boolean;
  isEmpty: boolean;
}

// ============================================================================
// 4. Raw Data Loader & Input Contracts
// ============================================================================

/** Raw rent record structure for input to stats engine */
export interface RawRentRecord {
  aptKey?: string;
  aptName: string;
  dong: string;
  contractDate: string; // YYYYMMDD
  deposit: number; // in 만원
  monthlyRent?: number;
  area: number;
}

/** Raw transaction record structure compatible with tests and legacy models */
export interface RawTransactionRecord {
  aptKey?: string;
  aptName: string;
  dong?: string;
  contractDate?: string; // YYYYMMDD
  date?: string; // MM.DD
  priceVal?: number; // in 억원 or 만원 (detected by magnitude)
  price?: number; // in 만원
  priceEok?: string;
  area?: number; // ㎡
  areaPyeong?: number;
  floor?: number | string;
  dealType?: string;
  isNewHigh?: boolean | number;
  newHighDelta?: number;
  isOutlier?: boolean;
  isDirectDeal?: boolean;
  isCanceled?: boolean;
  cancelDate?: string | number | null;
  cdealDay?: string | number | null;
  cdealType?: string | null;
  [key: string]: unknown;
}

/** Raw data bundle passed to engine */
export interface RawDataBundle {
  transactions: (RecentTransaction | TransactionRecord | RawTransactionRecord)[];
  macroTrend?: DongtanMacroTrendPoint[];
  summaryMap?: Record<string, AptTxSummary>;
  rents?: RawRentRecord[];
}

/** Input dataset injected into the pure analytics engine */
export interface StatsEngineInput {
  transactions: (RecentTransaction | TransactionRecord | RawTransactionRecord)[];
  txSummary?: Record<string, AptTxSummary>;
  macroTrend?: DongtanMacroTrendPoint[];
  rents?: RawRentRecord[];
  filter: StatsFilterState;
}

/** Data loader service interface for stats dataset fetching */
export interface IStatsDataLoader {
  loadSummary(signal?: AbortSignal): Promise<Record<string, AptTxSummary>>;
  loadTransactions(timeframe: TimeframeFilter, signal?: AbortSignal): Promise<RecentTransaction[]>;
  loadMacroTrend(signal?: AbortSignal): Promise<DongtanMacroTrendPoint[]>;
}

/** Pre-loaded static bundle for SSR or test harness injection */
export interface StatsDataLoaderInput {
  txSummary: Record<string, AptTxSummary>;
  transactions: RecentTransaction[];
  macroTrend: DongtanMacroTrendPoint[];
  apartmentsByDong?: Record<string, DongApartment[]>;
}
