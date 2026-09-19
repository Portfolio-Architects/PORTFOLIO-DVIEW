/**
 * @module statsEngine
 * @description Pure Functional Real Estate Statistics Analysis Engine for Dongtan New Town.
 * Zero external I/O, zero direct Firestore reads, high-performance in-memory analytics.
 * Architecture Layer: Pure Domain / Analytics Engine
 */

import type {
  ComplexStatItem,
  HyperlocalInsightCardsData,
  MacroTimeSeriesPoint,
  PyeongFilter,
  PyeongTier,
  RawDataBundle,
  RawRentRecord,
  RawTransactionRecord,
  RegionFilter,
  SortOption,
  StatsAggregateResult,
  StatsEngineInput,
  StatsFilterState,
  TimeframeFilter,
  VolumeDistributionItem,
} from '@/types/stats';
import {
  ALL_LEGAL_DONGS,
  DONGTAN1_DONGS,
  DONGTAN2_DONGS,
} from '@/types/stats';
import type {
  AptTxSummary,
  DongtanMacroTrendPoint,
  RecentTransaction,
  TransactionRecord,
} from '@/types/transaction';

// Re-export constants for downstream consumption
export { DONGTAN1_DONGS, DONGTAN2_DONGS, ALL_LEGAL_DONGS };

/** Universal union for transaction records processed by the engine */
export type AnyTransaction =
  | RecentTransaction
  | TransactionRecord
  | RawTransactionRecord
  | Record<string, unknown>;

// ============================================================================
// 1. Safe Math & Conversion Utilities
// ============================================================================

/**
 * Division with zero-defense returning fallback (default 0) if denominator is zero or non-finite.
 */
export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!denominator || isNaN(denominator) || denominator === 0) return fallback;
  const result = numerator / denominator;
  return isNaN(result) || !isFinite(result) ? fallback : result;
}

/**
 * Precision-controlled rounding with NaN and Infinity safety.
 */
export function safeRound(val: number, precision = 0): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  const factor = Math.pow(10, precision);
  return Math.round(val * factor) / factor;
}

/**
 * Normalizes transaction price to integer 만원 (10,000 KRW).
 * Handles:
 * - 억원 floats (e.g. 6.0, 7.45, 10.15) -> Math.round(val * 10000)
 * - 만원 integers (e.g. 48000, 75000, 105000) -> preserved
 * - Korean string representations (e.g. "7억5,000", "6억")
 */
export function parsePriceToManWon(
  record: { priceVal?: number; price?: number; priceEok?: string; [key: string]: unknown } | null | undefined
): number {
  if (!record) return 0;

  const pr = record.price;
  if (typeof pr === 'number' && pr > 0 && isFinite(pr)) {
    return pr < 500 ? Math.round(pr * 10000) : Math.round(pr);
  }

  const pv = record.priceVal;
  if (typeof pv === 'number' && pv > 0 && isFinite(pv)) {
    return pv < 500 ? Math.round(pv * 10000) : Math.round(pv);
  }

  const pe = record.priceEok;
  if (typeof pe === 'string' && pe) {
    return parsePriceEokToMan(pe);
  }

  return 0;
}

/**
 * Parses Korean Eok string (e.g. "8억5,000", "10억", "7억 4,500만") to 만원 integer.
 */
export function parsePriceEokToMan(eokStr: string): number {
  if (!eokStr || typeof eokStr !== 'string') return 0;
  const clean = eokStr.replace(/,/g, '').trim();

  // Pattern: X억 Y or X억
  const match = clean.match(/(\d+)\s*억\s*(\d+)?/);
  if (match) {
    const eok = parseInt(match[1], 10) * 10000;
    const remainder = match[2] ? parseInt(match[2], 10) : 0;
    return eok + remainder;
  }

  // Fallback purely numeric
  const numericOnly = parseInt(clean.replace(/[^0-9]/g, ''), 10);
  return isNaN(numericOnly) ? 0 : numericOnly;
}

/**
 * Formats 만원 integer to Korean Eok display string.
 * Example: 85000 -> "8억5,000", 60000 -> "6억", 74500 -> "7억4,500"
 */
export function formatPriceEok(manWon: number): string {
  if (!manWon || manWon <= 0) return '0';
  const eok = Math.floor(manWon / 10000);
  const remainder = manWon % 10000;

  if (eok === 0) {
    return `${remainder.toLocaleString()}만`;
  }
  if (remainder === 0) {
    return `${eok}억`;
  }
  return `${eok}억${remainder.toLocaleString()}`;
}

/**
 * Computes price per pyeong (만원/평).
 * Uses explicit areaPyeong if available and > 0, otherwise standard 3.30578㎡ conversion.
 */
export function computePyeongPrice(
  priceValWon: number,
  areaM2: number,
  areaPyeong?: number
): number {
  if (!priceValWon || priceValWon <= 0 || !isFinite(priceValWon)) return 0;

  const pyeong =
    areaPyeong && areaPyeong > 0
      ? areaPyeong
      : areaM2 && areaM2 > 0
      ? areaM2 / 3.30578
      : 0;

  if (pyeong <= 0 || !isFinite(pyeong)) return 0;
  const result = Math.round(priceValWon / pyeong);
  return isFinite(result) ? result : 0;
}

// ============================================================================
// 2. Normalization & Categorization Rules
// ============================================================================

/**
 * Bidirectional normalization of Dongtan legal dongs.
 * Maps administrative / MOLIT '오산동' to D-VIEW canonical '여울동'.
 */
export function normalizeDongName(dong: string | null | undefined): string {
  if (!dong) return '';
  const trimmed = dong.trim();
  if (trimmed === '오산동') return '여울동';
  return trimmed;
}

/** Alias for normalizeDongName */
export const normalizeDong = normalizeDongName;

/**
 * Determines whether a given dong matches the specified RegionFilter.
 */
export function matchesRegion(dong: string | null | undefined, filter: RegionFilter): boolean {
  if (!filter || filter === 'ALL' || (filter as string) === 'all' || (filter as string) === '전체') {
    return true;
  }
  const canonical = normalizeDongName(dong);
  if (!canonical) return false;

  if (filter === 'DONGTAN1' || filter === 'dongtan1' || filter === '동탄1') {
    return (DONGTAN1_DONGS as readonly string[]).includes(canonical);
  }
  if (filter === 'DONGTAN2' || filter === 'dongtan2' || filter === '동탄2') {
    return (DONGTAN2_DONGS as readonly string[]).includes(canonical);
  }

  return canonical === normalizeDongName(filter);
}

/** Alias for matchesRegion */
export const matchRegion = matchesRegion;

/**
 * Infers regional division ('동탄1' | '동탄2') from legal dong name.
 */
export function getRegionFromDong(dong: string | null | undefined): '동탄1' | '동탄2' {
  const canonical = normalizeDongName(dong);
  return (DONGTAN1_DONGS as readonly string[]).includes(canonical) ? '동탄1' : '동탄2';
}

/** Alias for getRegionFromDong */
export const getRegionByDong = getRegionFromDong;

/**
 * Classifies an apartment by exclusive area (㎡) or pyeong into 4 standard tiers.
 */
export function getPyeongTier(area: number, areaPyeong?: number): PyeongTier {
  if (area > 0) {
    if (area <= 60.0) return 'SMALL';
    if (area <= 85.0) return 'MEDIUM_SMALL';
    if (area <= 102.0) return 'MEDIUM_LARGE';
    return 'LARGE';
  }

  const p = areaPyeong || 0;
  if (p > 0) {
    if (p < 20.0) return 'SMALL';
    if (p < 30.0) return 'MEDIUM_SMALL';
    if (p < 40.0) return 'MEDIUM_LARGE';
    return 'LARGE';
  }

  return 'MEDIUM_SMALL';
}

/**
 * Checks whether an area matches the given PyeongFilter tier.
 */
export function matchesPyeong(
  area: number,
  areaPyeong: number | undefined,
  filter: PyeongFilter
): boolean {
  if (!filter || filter === 'ALL' || (filter as string) === 'all' || (filter as string) === '전체') {
    return true;
  }
  return getPyeongTier(area, areaPyeong) === filter;
}

/**
 * Direct area-based pyeong filter match for contract test compatibility.
 */
export function matchPyeong(area: number, filter: PyeongFilter): boolean {
  if (!filter || filter === 'ALL' || (filter as string) === 'all' || (filter as string) === '전체') {
    return true;
  }
  if (filter === 'SMALL') return area <= 60.0;
  if (filter === 'MEDIUM_SMALL') return area > 60.0 && area <= 85.0;
  if (filter === 'MEDIUM_LARGE') return area > 85.0 && area <= 102.0;
  if (filter === 'LARGE') return area > 102.0;
  return true;
}

// ============================================================================
// 3. Sanitization & Edge-Case Defense
// ============================================================================

/**
 * Determines whether a record is a retracted / cancelled transaction.
 * Accurately filters out cancellations while safeguarding valid deals with placeholder strings.
 */
function isPresentDate(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  if (!s || s === '-' || s === 'null' || s === 'undefined' || s === 'nan') return false;
  return true;
}

export function isCancelledTransaction(t: unknown): boolean {
  if (!t || typeof t !== 'object') return false;
  const record = t as Record<string, unknown>;

  if (record.isCanceled === true) return true;
  if (record.cdealType === 'O' || record.cdealType === '해제') return true;

  if (typeof record.cdealType === 'string') {
    const cd = record.cdealType.trim().toLowerCase();
    if (cd && cd !== '-' && cd !== 'null' && cd !== 'undefined' && cd !== 'nan') {
      return true;
    }
  }

  if (record.cancelDate && isPresentDate(record.cancelDate)) return true;
  if (record.cdealDay && isPresentDate(record.cdealDay)) return true;

  return false;
}

/** Alias for isCancelledTransaction */
export const isCanceledTransaction = isCancelledTransaction;

/**
 * Identifies flagged statistical outliers or unrealistic price bounds.
 */
export function isOutlierTransaction(t: unknown): boolean {
  if (!t || typeof t !== 'object') return false;
  const record = t as Record<string, unknown>;
  if (record.isOutlier === true) return true;

  const priceMan = parsePriceToManWon(record as { priceVal?: number; price?: number; priceEok?: string });
  if (priceMan > 0 && (priceMan < 1000 || priceMan > 1000000)) {
    return true;
  }
  return false;
}

/**
 * Identifies direct (non-brokerage / family) deals.
 */
export function isDirectDeal(t: unknown): boolean {
  if (!t || typeof t !== 'object') return false;
  const record = t as Record<string, unknown>;
  return record.dealType === '직거래' || record.isDirectDeal === true;
}

/**
 * Validates sale deal type (excludes pure rentals).
 */
export function isSaleDeal(t: unknown): boolean {
  if (!t || typeof t !== 'object') return false;
  const record = t as Record<string, unknown>;
  const dealType = record.dealType;
  if (typeof dealType !== 'string') return true;
  return dealType !== '전세' && dealType !== '월세' && dealType !== '임대';
}

// ============================================================================
// 4. Timeframe & Date Utilities
// ============================================================================

/**
 * Parses 8-digit date string or number into Date object.
 */
export function parseContractDate(dateStr: unknown): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).replace(/[^0-9]/g, '');
  if (s.length < 8) return null;
  const y = parseInt(s.substring(0, 4), 10);
  const m = parseInt(s.substring(4, 6), 10) - 1;
  const d = parseInt(s.substring(6, 8), 10);
  return new Date(y, m, d);
}

/**
 * Checks if a transaction date falls within the selected timeframe relative to reference date.
 */
export function matchTimeframe(
  contractDate: string | number | undefined,
  timeframe: TimeframeFilter,
  refDateStr: string | Date = '2026-09-19'
): boolean {
  if (timeframe === 'ALL' || (timeframe as string) === 'all') return true;
  if (!contractDate) return false;

  let txDateNum: number;
  if (typeof contractDate === 'number') {
    if (contractDate >= 10000000 && contractDate <= 99999999) {
      txDateNum = contractDate;
    } else {
      const s = String(contractDate);
      if (s.length < 8) return false;
      txDateNum = parseInt(s.substring(0, 8), 10);
    }
  } else if (typeof contractDate === 'string') {
    if (contractDate.length === 8 && /^\d{8}$/.test(contractDate)) {
      txDateNum = parseInt(contractDate, 10);
    } else {
      const s = contractDate.replace(/[^0-9]/g, '');
      if (s.length < 8) return false;
      txDateNum = parseInt(s.substring(0, 8), 10);
    }
  } else {
    return false;
  }

  if (isNaN(txDateNum)) return false;

  const refDate =
    refDateStr instanceof Date
      ? refDateStr
      : parseContractDate(refDateStr) ??
        (typeof refDateStr === 'string' && refDateStr.includes('-')
          ? new Date(refDateStr)
          : new Date('2026-09-19'));

  const daysMap: Record<Exclude<TimeframeFilter, 'ALL'>, number> = {
    '1M': 31,
    '3M': 92,
    '6M': 183,
    '1Y': 365,
  };

  const days = daysMap[timeframe as Exclude<TimeframeFilter, 'ALL'>] || 365;
  const refYear = refDate.getFullYear();
  const refMonth = refDate.getMonth();
  const refDay = refDate.getDate();

  const cutoffDate = new Date(refYear, refMonth, refDay - days);
  const cutoffNum =
    cutoffDate.getFullYear() * 10000 +
    (cutoffDate.getMonth() + 1) * 100 +
    cutoffDate.getDate();

  const maxDate = new Date(refYear, refMonth, refDay + 1);
  const maxNum =
    maxDate.getFullYear() * 10000 +
    (maxDate.getMonth() + 1) * 100 +
    maxDate.getDate();

  return txDateNum >= cutoffNum && txDateNum <= maxNum;
}

/** Alias for matchTimeframe */
export function isWithinTimeframe(
  txDate: Date,
  referenceDate: Date,
  timeframe: TimeframeFilter
): boolean {
  if (timeframe === 'ALL') return true;
  const diffDays = Math.floor((referenceDate.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < -1) return false;

  switch (timeframe) {
    case '1M':
      return diffDays <= 31;
    case '3M':
      return diffDays <= 92;
    case '6M':
      return diffDays <= 183;
    case '1Y':
      return diffDays <= 365;
    default:
      return true;
  }
}

/**
 * Calculates cutoff date (YYYYMMDD) for a timeframe relative to reference date.
 */
export function getCutoffDate(referenceDateStr: string, timeframe: TimeframeFilter): string {
  if (timeframe === 'ALL') return '00000000';

  const ref = parseContractDate(referenceDateStr) ?? new Date(referenceDateStr);
  const daysMap: Record<Exclude<TimeframeFilter, 'ALL'>, number> = {
    '1M': 31,
    '3M': 92,
    '6M': 183,
    '1Y': 365,
  };

  const days = daysMap[timeframe as Exclude<TimeframeFilter, 'ALL'>] || 365;
  const target = new Date(ref.getTime() - days * 24 * 60 * 60 * 1000);

  const ty = target.getFullYear();
  const tm = String(target.getMonth() + 1).padStart(2, '0');
  const td = String(target.getDate()).padStart(2, '0');
  return `${ty}${tm}${td}`;
}

// ============================================================================
// 5. Canonical Empty State Result (Zero-Division Safe Object)
// ============================================================================

export const EMPTY_STATS_RESULT: Readonly<StatsAggregateResult> = Object.freeze({
  totalVolume: 0,
  avgSalePrice: 0,
  avgPyeongPrice: 0,
  avgJeonseRatio: 0,
  volumeChangeMoM: 0,
  timeSeriesTrend: [],
  pyeongRankings: [],
  volumeDistribution: [],
  insights: {
    newHighComplex: null,
    optimalGapComplex: null,
    volumeSurgeComplex: null,
    urgentBargainComplex: null,
  },
  isLoading: false,
  isEmpty: true,
});

// ============================================================================
// 6. Pure Calculation Functions (6 Core Functions)
// ============================================================================

/**
 * 1. filterTransactions
 * High-performance single-pass multi-dimensional filtering.
 * Supports both object filter state and positional arguments for test suite compatibility.
 */
export function filterTransactions<T extends AnyTransaction = AnyTransaction>(
  transactions: T[],
  filtersOrRegion?: StatsFilterState | RegionFilter,
  pyeong?: PyeongFilter,
  timeframe?: TimeframeFilter,
  refDate?: string | Date
): T[] {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    return [];
  }

  let region: RegionFilter = 'ALL';
  let pyeongFilter: PyeongFilter = 'ALL';
  let timeframeFilter: TimeframeFilter = 'ALL';
  let excludeCanceled = true;
  let excludeOutliers = true;
  let excludeDirectDeals = false;
  let effectiveRefDate: string | Date = refDate ?? '2026-09-19';

  if (filtersOrRegion && typeof filtersOrRegion === 'object' && !('substring' in filtersOrRegion)) {
    const f = filtersOrRegion as StatsFilterState;
    region = f.region ?? 'ALL';
    pyeongFilter = f.pyeong ?? 'ALL';
    timeframeFilter = f.timeframe ?? 'ALL';
    if (f.excludeCanceled !== undefined) excludeCanceled = f.excludeCanceled;
    if (f.excludeOutliers !== undefined) excludeOutliers = f.excludeOutliers;
    if (f.excludeDirectDeals !== undefined) excludeDirectDeals = f.excludeDirectDeals;
    if (f.referenceDate) effectiveRefDate = f.referenceDate;
  } else if (typeof filtersOrRegion === 'string') {
    region = filtersOrRegion;
    if (pyeong) pyeongFilter = pyeong;
    if (timeframe) timeframeFilter = timeframe;
  }

  // If no reference date provided in options, find maximum contractDate in dataset
  if (!refDate && (!filtersOrRegion || typeof filtersOrRegion !== 'object' || !filtersOrRegion.referenceDate)) {
    let maxDate = '';
    for (let i = 0; i < transactions.length; i++) {
      const cd = String((transactions[i] as any).contractDate || '');
      if (cd.length >= 8 && cd > maxDate) {
        maxDate = cd;
      }
    }
    if (maxDate.length >= 8) {
      effectiveRefDate = `${maxDate.substring(0, 4)}-${maxDate.substring(4, 6)}-${maxDate.substring(6, 8)}`;
    }
  }

  let cutoffNum = 0;
  let maxNum = 99999999;
  const isTimeframeBounded = timeframeFilter !== 'ALL' && (timeframeFilter as string) !== 'all';

  if (isTimeframeBounded) {
    const refDateObj =
      effectiveRefDate instanceof Date
        ? effectiveRefDate
        : parseContractDate(effectiveRefDate) ??
          (typeof effectiveRefDate === 'string' && effectiveRefDate.includes('-')
            ? new Date(effectiveRefDate)
            : new Date('2026-09-19'));

    const daysMap: Record<string, number> = {
      '1M': 31,
      '3M': 92,
      '6M': 183,
      '1Y': 365,
    };
    const days = daysMap[timeframeFilter] || 365;
    const refYear = refDateObj.getFullYear();
    const refMonth = refDateObj.getMonth();
    const refDay = refDateObj.getDate();

    const cutoffDate = new Date(refYear, refMonth, refDay - days);
    cutoffNum =
      cutoffDate.getFullYear() * 10000 +
      (cutoffDate.getMonth() + 1) * 100 +
      cutoffDate.getDate();

    const maxDate = new Date(refYear, refMonth, refDay + 1);
    maxNum =
      maxDate.getFullYear() * 10000 +
      (maxDate.getMonth() + 1) * 100 +
      maxDate.getDate();
  }

  const result: T[] = [];
  const len = transactions.length;
  for (let i = 0; i < len; i++) {
    const tx = transactions[i];
    if (!tx || typeof tx !== 'object') continue;
    const txRecord = tx as Record<string, any>;

    // 1. Direct deal exclusion
    if (excludeDirectDeals && isDirectDeal(txRecord)) {
      continue;
    }

    // 2. Sale deal type check
    if (!isSaleDeal(txRecord)) {
      continue;
    }

    // 3. Cancellation exclusion
    if (excludeCanceled && isCancelledTransaction(txRecord)) {
      continue;
    }

    // 4. Valid price check
    const price = parsePriceToManWon(txRecord);
    if (price <= 0) {
      continue;
    }

    // 5. Outlier & extreme corruption exclusion
    if (excludeOutliers) {
      if (txRecord.isOutlier === true || price < 1000 || price > 1000000) {
        continue;
      }
    }

    // 6. Region / Dong match
    if (!matchesRegion(txRecord.dong, region)) {
      continue;
    }

    // 7. Pyeong match
    const area = txRecord.area ?? 0;
    const areaP = txRecord.areaPyeong;
    if (!matchesPyeong(area, areaP, pyeongFilter)) {
      continue;
    }

    // 8. Timeframe match
    if (isTimeframeBounded) {
      const cd = txRecord.contractDate;
      if (!cd) continue;
      let txDateNum: number;
      if (typeof cd === 'number') {
        txDateNum = cd >= 10000000 && cd <= 99999999 ? cd : parseInt(String(cd).substring(0, 8), 10);
      } else if (typeof cd === 'string') {
        if (cd.length === 8 && cd >= '10000000' && cd <= '99999999') {
          txDateNum = parseInt(cd, 10);
        } else {
          const s = cd.replace(/[^0-9]/g, '');
          if (s.length < 8) continue;
          txDateNum = parseInt(s.substring(0, 8), 10);
        }
      } else {
        continue;
      }
      if (isNaN(txDateNum) || txDateNum < cutoffNum || txDateNum > maxNum) {
        continue;
      }
    }

    result.push(tx);
  }

  return result;
}

/**
 * 2. computeMacroTimeSeries
 * Monthly time-series trend breakdown for price, rent, and volume.
 */
export function computeMacroTimeSeries(
  transactions: AnyTransaction[],
  macroTrend?: DongtanMacroTrendPoint[],
  timeframe: TimeframeFilter = 'ALL',
  referenceDate?: string | Date
): MacroTimeSeriesPoint[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  const monthlyGroups = new Map<
    string,
    { saleSum: number; saleCount: number; rentSum: number; rentCount: number }
  >();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i] as Record<string, any>;
    const rawCd = tx.contractDate;
    if (!rawCd) continue;
    let cd: string;
    if (typeof rawCd === 'string') {
      cd = rawCd.length === 8 && rawCd >= '10000000' && rawCd <= '99999999' ? rawCd : rawCd.replace(/[^0-9]/g, '');
    } else {
      cd = String(rawCd);
    }
    if (cd.length < 6) continue;
    const month = `${cd.substring(0, 4)}-${cd.substring(4, 6)}`;
    const priceMan = parsePriceToManWon(tx);
    if (priceMan <= 0) continue;

    const g = monthlyGroups.get(month);
    if (g) {
      g.saleSum += priceMan;
      g.saleCount += 1;
    } else {
      monthlyGroups.set(month, { saleSum: priceMan, saleCount: 1, rentSum: 0, rentCount: 0 });
    }
  }

  // Integrate macroTrend if provided
  if (macroTrend && Array.isArray(macroTrend)) {
    macroTrend.forEach((pt) => {
      let ym = pt.name;
      if (ym.includes('.') && ym.length === 5) {
        const [yy, mm] = ym.split('.');
        const fullYear = parseInt(yy, 10) > 50 ? `19${yy}` : `20${yy}`;
        ym = `${fullYear}-${mm.padStart(2, '0')}`;
      }
      const rentDepositMan = Math.round((pt['동탄 아파트 전세 평균'] || 0) * 10000);
      if (rentDepositMan > 0) {
        const g = monthlyGroups.get(ym) || { saleSum: 0, saleCount: 0, rentSum: 0, rentCount: 0 };
        g.rentSum = rentDepositMan;
        g.rentCount = 1;
        monthlyGroups.set(ym, g);
      }
    });
  }

  const sortedMonths = Array.from(monthlyGroups.keys()).sort();
  return sortedMonths.map((m) => {
    const g = monthlyGroups.get(m)!;
    return {
      date: m,
      avgSalePrice: g.saleCount > 0 ? Math.round(g.saleSum / g.saleCount) : 0,
      avgRentDeposit: g.rentCount > 0 ? Math.round(g.rentSum / g.rentCount) : 0,
      volume: g.saleCount,
    };
  });
}

/**
 * 3. computeComplexRankings
 * Aggregates transactions by complex and returns sorted rankings.
 */
export interface RankingOptions {
  sortBy?: SortOption;
  minTransactions?: number;
  limit?: number;
  summaryMap?: Record<string, AptTxSummary>;
  dongLookup?: Record<string, string>;
  rents?: RawRentRecord[];
  outTotals?: { sumPrice: number; sumPyeongPrice: number };
}

export function computeComplexRankings(
  transactions: AnyTransaction[],
  options?: RankingOptions
): ComplexStatItem[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  interface ComplexAgg {
    aptKey: string;
    aptName: string;
    dong: string;
    count: number;
    sumPrice: number;
    sumPyeongPrice: number;
    maxPrice: number;
    minPrice: number;
    hasNewHigh: boolean;
    maxDiscountRate: number;
    latestContractDate: string;
    latestPrice: number;
  }

  const complexMap = new Map<string, ComplexAgg>();
  const outTotals = options?.outTotals;

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i] as Record<string, any>;
    const aptName = tx.aptName || '미확인 단지';
    const aptKey = tx.aptKey || tx.txKey || aptName;

    let entry = complexMap.get(aptName);
    if (!entry) {
      const dong = normalizeDongName(
        tx.dong || options?.dongLookup?.[aptKey] || options?.summaryMap?.[aptKey]?.dong || ''
      );
      entry = {
        aptKey,
        aptName,
        dong,
        count: 0,
        sumPrice: 0,
        sumPyeongPrice: 0,
        maxPrice: -Infinity,
        minPrice: Infinity,
        hasNewHigh: false,
        maxDiscountRate: 0,
        latestContractDate: '',
        latestPrice: 0,
      };
      complexMap.set(aptName, entry);
    } else if (!entry.dong && tx.dong) {
      entry.dong = normalizeDongName(tx.dong);
    }

    const p = parsePriceToManWon(tx);
    const cd = String(tx.contractDate || '');

    entry.count++;
    entry.sumPrice += p;
    if (p > entry.maxPrice) entry.maxPrice = p;
    if (p < entry.minPrice) entry.minPrice = p;

    if (entry.count === 1 || cd > entry.latestContractDate) {
      entry.latestContractDate = cd;
      entry.latestPrice = p;
    }

    const pp = computePyeongPrice(p, tx.area ?? 0, tx.areaPyeong);
    entry.sumPyeongPrice += pp;

    if (outTotals) {
      outTotals.sumPrice += p;
      outTotals.sumPyeongPrice += pp;
    }

    if (tx.isNewHigh === true || tx.isNewHigh === 1) {
      entry.hasNewHigh = true;
    }

    if (typeof tx.deltaPercent === 'number' && tx.deltaPercent <= -5.0) {
      const discount = Math.abs(tx.deltaPercent);
      if (discount > entry.maxDiscountRate) entry.maxDiscountRate = discount;
    }
  }

  const minTx = options?.minTransactions ?? 1;

  const complexStats: ComplexStatItem[] = Array.from(complexMap.values())
    .filter((entry) => entry.count >= minTx)
    .map((entry) => {
      const count = entry.count;
      const avgPrice = Math.round(entry.sumPrice / count);
      const avgPyeongPrice = Math.round(entry.sumPyeongPrice / count);
      const highestPrice = entry.maxPrice > -Infinity ? entry.maxPrice : avgPrice;
      const lowestPrice = entry.minPrice < Infinity ? entry.minPrice : avgPrice;
      const latestPrice = entry.latestPrice;

      let maxDiscountRate = entry.maxDiscountRate;
      if (maxDiscountRate === 0 && highestPrice > latestPrice && highestPrice > 0) {
        maxDiscountRate = parseFloat((((highestPrice - latestPrice) / highestPrice) * 100).toFixed(1));
      }

      let hasNewHigh = entry.hasNewHigh;
      const summary = options?.summaryMap?.[entry.aptKey];
      if (!hasNewHigh && summary?.allTimeHigh && latestPrice >= summary.allTimeHigh) {
        hasNewHigh = true;
      }

      // Jeonse Ratio calculation
      let jeonseRatio = 0;
      if (options?.rents && options.rents.length > 0 && avgPrice > 0) {
        const cRents = options.rents.filter((r) => r.aptName === entry.aptName);
        if (cRents.length > 0) {
          const avgRentDeposit =
            cRents.reduce((acc, r) => acc + (r.deposit || 0), 0) / cRents.length;
          jeonseRatio = parseFloat(((avgRentDeposit / avgPrice) * 100).toFixed(1));
        }
      }

      if (jeonseRatio === 0 && summary && avgPrice > 0) {
        if (summary.avg3MRentDeposit && summary.avg3MRentDeposit > 0) {
          const basePrice = summary.avg3MPrice || avgPrice;
          jeonseRatio = parseFloat(((summary.avg3MRentDeposit / basePrice) * 100).toFixed(1));
        } else if (summary.latestRentDeposit && summary.latestRentDeposit > 0) {
          jeonseRatio = parseFloat(((summary.latestRentDeposit / avgPrice) * 100).toFixed(1));
        }
      }

      // Clamp jeonseRatio between 0 and 120%
      if (jeonseRatio < 0) jeonseRatio = 0;
      if (jeonseRatio > 120) jeonseRatio = 120;

      const dong = entry.dong || '여울동';
      const region = getRegionFromDong(dong);

      return {
        aptKey: entry.aptKey,
        aptName: entry.aptName,
        dong,
        region,
        txCount: count,
        avgPrice,
        avgPyeongPrice,
        jeonseRatio,
        latestPrice,
        highestPrice,
        lowestPrice,
        urgentSaleDiscountRate: maxDiscountRate > 0 ? maxDiscountRate : undefined,
        isNewHigh: hasNewHigh,
      };
    });

  const sortBy = options?.sortBy ?? 'PYEONG_DESC';

  complexStats.sort((a, b) => {
    switch (sortBy) {
      case 'VOLUME_DESC':
        return b.txCount - a.txCount || b.avgPyeongPrice - a.avgPyeongPrice;
      case 'PRICE_DESC':
        return b.avgPrice - a.avgPrice || b.txCount - a.txCount;
      case 'PRICE_ASC':
        return a.avgPrice - b.avgPrice || b.txCount - a.txCount;
      case 'JEONSE_DESC':
        return b.jeonseRatio - a.jeonseRatio || b.txCount - a.txCount;
      case 'PYEONG_DESC':
      default:
        return b.avgPyeongPrice - a.avgPyeongPrice || b.txCount - a.txCount;
    }
  });

  const limit = options?.limit;
  return typeof limit === 'number' && limit > 0 ? complexStats.slice(0, limit) : complexStats;
}

/**
 * 4. computeVolumeDistribution
 * Volume distribution breakdown by pyeong tier or legal dong.
 */
export function computeVolumeDistribution(
  transactions: AnyTransaction[],
  groupBy: 'PYEONG_TIER' | 'DONG' | 'REGION' = 'PYEONG_TIER'
): VolumeDistributionItem[] {
  if (!transactions || transactions.length === 0) {
    return [];
  }

  const totalVolume = transactions.length;

  if (groupBy === 'PYEONG_TIER') {
    let smallCount = 0;
    let mediumSmallCount = 0;
    let mediumLargeCount = 0;
    let largeCount = 0;

    for (let i = 0; i < totalVolume; i++) {
      const tx = transactions[i] as Record<string, any>;
      const area = tx?.area ?? 0;
      const areaP = tx?.areaPyeong;
      const tier = getPyeongTier(area, areaP);
      if (tier === 'SMALL') smallCount++;
      else if (tier === 'MEDIUM_SMALL') mediumSmallCount++;
      else if (tier === 'MEDIUM_LARGE') mediumLargeCount++;
      else if (tier === 'LARGE') largeCount++;
    }

    return [
      {
        name: '소형 (60㎡ 이하)',
        value: smallCount,
        percentage: totalVolume > 0 ? safeRound((smallCount / totalVolume) * 100, 1) : 0,
      },
      {
        name: '중소형 (60~85㎡)',
        value: mediumSmallCount,
        percentage: totalVolume > 0 ? safeRound((mediumSmallCount / totalVolume) * 100, 1) : 0,
      },
      {
        name: '중대형 (85~102㎡)',
        value: mediumLargeCount,
        percentage: totalVolume > 0 ? safeRound((mediumLargeCount / totalVolume) * 100, 1) : 0,
      },
      {
        name: '대형 (102㎡ 초과)',
        value: largeCount,
        percentage: totalVolume > 0 ? safeRound((largeCount / totalVolume) * 100, 1) : 0,
      },
    ];
  }

  if (groupBy === 'REGION') {
    let d1Count = 0;
    for (let i = 0; i < totalVolume; i++) {
      const tx = transactions[i] as Record<string, any>;
      if (getRegionFromDong(tx?.dong) === '동탄1') {
        d1Count++;
      }
    }
    const d2Count = totalVolume - d1Count;

    return [
      {
        name: '동탄2',
        value: d2Count,
        percentage: totalVolume > 0 ? safeRound((d2Count / totalVolume) * 100, 1) : 0,
      },
      {
        name: '동탄1',
        value: d1Count,
        percentage: totalVolume > 0 ? safeRound((d1Count / totalVolume) * 100, 1) : 0,
      },
    ];
  }

  // Group by DONG
  const dongMap = new Map<string, number>();
  transactions.forEach((t) => {
    const tx = t as Record<string, any>;
    const dong = normalizeDongName(tx.dong) || '기타';
    dongMap.set(dong, (dongMap.get(dong) || 0) + 1);
  });

  return Array.from(dongMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalVolume > 0 ? safeRound((value / totalVolume) * 100, 1) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

/**
 * 5. computeHyperlocalInsights
 * Extracts top 4 high-dwell-time insight cards from complex rankings.
 */
export function computeHyperlocalInsights(
  complexStats: ComplexStatItem[],
  transactions: AnyTransaction[] = [],
  summaryMap?: Record<string, AptTxSummary>
): HyperlocalInsightCardsData {
  if (!complexStats || complexStats.length === 0) {
    return {
      newHighComplex: null,
      optimalGapComplex: null,
      volumeSurgeComplex: null,
      urgentBargainComplex: null,
    };
  }

  // 1. newHighComplex: Highest price amongst isNewHigh === true complexes
  const newHighCandidates = complexStats.filter((c) => c.isNewHigh === true);
  let newHighComplex: ComplexStatItem | null = null;
  if (newHighCandidates.length > 0) {
    newHighComplex = [...newHighCandidates].sort(
      (a, b) => b.latestPrice - a.latestPrice
    )[0];
  }

  // 2. optimalGapComplex: Highest jeonse ratio
  const gapCandidates = complexStats.filter((c) => c.jeonseRatio > 0);
  let optimalGapComplex: ComplexStatItem | null = null;
  if (gapCandidates.length > 0) {
    optimalGapComplex = [...gapCandidates].sort(
      (a, b) => b.jeonseRatio - a.jeonseRatio || b.txCount - a.txCount
    )[0];
  } else if (complexStats.length > 0) {
    optimalGapComplex = complexStats[0];
  }

  // 3. volumeSurgeComplex: Maximum transaction volume
  const volumeSurgeComplex =
    [...complexStats].sort((a, b) => b.txCount - a.txCount || b.avgPrice - a.avgPrice)[0] ||
    null;

  // 4. urgentBargainComplex: Highest urgent sale discount rate
  const bargainCandidates = complexStats.filter(
    (c) => c.urgentSaleDiscountRate && c.urgentSaleDiscountRate >= 5.0
  );
  let urgentBargainComplex: ComplexStatItem | null = null;
  if (bargainCandidates.length > 0) {
    urgentBargainComplex = [...bargainCandidates].sort(
      (a, b) => (b.urgentSaleDiscountRate || 0) - (a.urgentSaleDiscountRate || 0)
    )[0];
  }

  return {
    newHighComplex,
    optimalGapComplex,
    volumeSurgeComplex,
    urgentBargainComplex,
  };
}

/**
 * 6. aggregateStatistics (Master Aggregator)
 * Orchestrates full multi-dimensional analytics.
 */
export function aggregateStatistics(
  rawData: RawDataBundle | AnyTransaction[],
  filters?: StatsFilterState,
  options?: { sortBy?: SortOption; rankLimit?: number; referenceDate?: string | Date }
): StatsAggregateResult {
  const txs = Array.isArray(rawData) ? rawData : rawData?.transactions || [];
  const rents = Array.isArray(rawData) ? [] : rawData?.rents || [];
  const macroTrend = Array.isArray(rawData) ? undefined : rawData?.macroTrend;
  const summaryMap = Array.isArray(rawData) ? undefined : rawData?.summaryMap;

  if (!txs || txs.length === 0) {
    return { ...EMPTY_STATS_RESULT };
  }

  const activeFilters: StatsFilterState = filters || {
    region: 'ALL',
    pyeong: 'ALL',
    timeframe: 'ALL',
  };

  if (options?.referenceDate && !activeFilters.referenceDate) {
    activeFilters.referenceDate = options.referenceDate;
  }

  const validTxs = filterTransactions(txs, activeFilters);
  if (validTxs.length === 0) {
    return { ...EMPTY_STATS_RESULT };
  }

  const totalVolume = validTxs.length;

  // Filter rents if present
  const validRents = rents.length > 0 ? rents.filter((r) => {
    if (!matchesRegion(r.dong, activeFilters.region)) return false;
    if (!matchesPyeong(r.area ?? 0, undefined, activeFilters.pyeong)) return false;
    if (!matchTimeframe(r.contractDate, activeFilters.timeframe, activeFilters.referenceDate))
      return false;
    return (r.deposit || 0) > 0;
  }) : [];

  const totals = { sumPrice: 0, sumPyeongPrice: 0 };

  // Complex Rankings
  const pyeongRankings = computeComplexRankings(validTxs, {
    sortBy: options?.sortBy || activeFilters.sort || 'PYEONG_DESC',
    limit: options?.rankLimit || 20,
    summaryMap,
    rents: validRents,
    outTotals: totals,
  });

  const avgSalePrice = Math.round(totals.sumPrice / totalVolume);
  const avgPyeongPrice = Math.round(totals.sumPyeongPrice / totalVolume);

  let avgJeonseRatio = 0;
  if (validRents.length > 0 && avgSalePrice > 0) {
    const avgRentDeposit =
      validRents.reduce((acc, r) => acc + (r.deposit || 0), 0) / validRents.length;
    avgJeonseRatio = parseFloat(((avgRentDeposit / avgSalePrice) * 100).toFixed(1));
  } else if (macroTrend && macroTrend.length > 0 && avgSalePrice > 0) {
    const latestMacro = macroTrend[macroTrend.length - 1];
    const rentAvg = (latestMacro['동탄 아파트 전세 평균'] || 0) * 10000;
    if (rentAvg > 0) {
      avgJeonseRatio = parseFloat(((rentAvg / avgSalePrice) * 100).toFixed(1));
    }
  }

  // Time-series trend
  const timeSeriesTrend = computeMacroTimeSeries(
    validTxs,
    macroTrend,
    activeFilters.timeframe,
    activeFilters.referenceDate
  );

  // Month-over-Month volume change
  let volumeChangeMoM = 0;
  if (timeSeriesTrend.length >= 2) {
    const curr = timeSeriesTrend[timeSeriesTrend.length - 1].volume;
    const prev = timeSeriesTrend[timeSeriesTrend.length - 2].volume;
    if (prev > 0) {
      volumeChangeMoM = parseFloat((((curr - prev) / prev) * 100).toFixed(1));
    } else if (curr > 0) {
      volumeChangeMoM = 100.0;
    }
  }

  // Volume distribution
  const volumeDistribution = computeVolumeDistribution(validTxs, 'PYEONG_TIER');

  // Hyperlocal insights
  const insights = computeHyperlocalInsights(pyeongRankings, validTxs, summaryMap);

  return {
    totalVolume,
    avgSalePrice,
    avgPyeongPrice,
    avgJeonseRatio,
    volumeChangeMoM,
    timeSeriesTrend,
    pyeongRankings,
    volumeDistribution,
    insights,
    isLoading: false,
    isEmpty: false,
  };
}

/**
 * Flexible adapter alias `aggregateStats`.
 * Overloaded to support both object contracts and positional contract calls from tests:
 * - aggregateStats(txs, rents, region, pyeong, timeframe, refDate)
 * - aggregateStats(input, filters, options)
 */
export function aggregateStats(
  arg1: any,
  arg2?: any,
  arg3?: any,
  arg4?: any,
  arg5?: any,
  arg6?: any
): StatsAggregateResult {
  // Check if called positionally: (txs, rents, region, pyeong, timeframe, refDate)
  if (Array.isArray(arg1) && (Array.isArray(arg2) || arg2 === undefined || typeof arg2 === 'string')) {
    const txs = arg1;
    const rents = Array.isArray(arg2) ? arg2 : [];
    const region: RegionFilter = typeof arg2 === 'string' ? arg2 : arg3 ?? 'ALL';
    const pyeong: PyeongFilter = typeof arg3 === 'string' && typeof arg2 === 'string' ? arg3 : arg4 ?? 'ALL';
    const timeframe: TimeframeFilter = typeof arg4 === 'string' && typeof arg2 === 'string' ? arg4 : arg5 ?? 'ALL';
    const refDate = typeof arg5 === 'string' && typeof arg2 === 'string' ? arg5 : arg6 ?? '2026-09-19';

    return aggregateStatistics(
      { transactions: txs, rents },
      { region, pyeong, timeframe, referenceDate: refDate }
    );
  }

  // Check if called as: (txs, filters, options)
  if (Array.isArray(arg1) && typeof arg2 === 'object' && !Array.isArray(arg2)) {
    return aggregateStatistics(arg1, arg2, arg3);
  }

  // Called with object bundle: (rawData, filters, options)
  return aggregateStatistics(arg1, arg2, arg3);
}

/** Alias for computeStats (used in Explorer 3 unit test blueprint) */
export const computeStats = aggregateStats;
