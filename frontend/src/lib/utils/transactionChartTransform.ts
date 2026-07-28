import { TransactionRecord } from '@/components/apartment-modal/TransactionTable';

const MAX_CACHE_SIZE = 250;
const TARGET_CACHE_SIZE = 200;
const globalTsCache = new Map<string, number>();

/**
 * Clear timestamp cache for testing and memory purging
 */
const sharedSecondaryByMonth = new Map<number, number[]>();
const sharedSecondaryMonthly = new Map<number, number>();

/**
 * Clear timestamp cache and Map buffers for testing and memory purging
 */
export const clearTsCache = (): void => {
  globalTsCache.clear();
  sharedSecondaryByMonth.clear();
  sharedSecondaryMonthly.clear();
};

/**
 * Get cached Unix timestamp for contract year-month and day string (Bounded LRU cache max 250)
 */
export const getCachedTimestamp = (ymStr: string, dayStr: string): number => {
  const key = `${ymStr}-${dayStr}`;
  let ts = globalTsCache.get(key);
  if (ts !== undefined) {
    // Re-insert to refresh LRU ordering
    globalTsCache.delete(key);
    globalTsCache.set(key, ts);
    return ts;
  }

  const year = parseInt(ymStr.slice(0, 4)) || 2026;
  const month = parseInt(ymStr.slice(4, 6)) || 6;
  const day = parseInt(dayStr) || 15;
  const tsVal = new Date(year, month - 1, day).getTime();
  ts = isNaN(tsVal) ? new Date(2026, 5, 15).getTime() : tsVal;

  while (globalTsCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = globalTsCache.keys().next().value;
    if (oldestKey !== undefined) {
      globalTsCache.delete(oldestKey);
    } else {
      break;
    }
  }

  globalTsCache.set(key, ts);
  return ts;
};

/**
 * Format price in 억/만 currency notation
 */
export const formatAvgPriceEok = (avgPrice?: number | null): string => {
  if (!avgPrice || isNaN(avgPrice)) return '-';
  const roundedAvg = Math.round(avgPrice * 100) / 100;
  const eok = Math.floor(roundedAvg);
  const rem = Math.round((roundedAvg % 1) * 10000);
  return `${eok >= 1 ? `${eok}억` : ''}${rem > 0 ? rem.toLocaleString() : (eok > 0 ? '' : '0')}`;
};

export interface ProcessedMonthlyPoint {
  ts: number;
  monthAvg?: number;
  secondaryAvg?: number;
  saleAvg?: number;
  jeonseAvg?: number;
  volume: number;
  ym: number;
  bandHigh?: number;
  bandLow?: number;
}

/**
 * Safely compute monthly transaction averages and price boundaries using reusable Map buffers
 */
export const calculateMonthlyAverages = (
  transactions: TransactionRecord[] | null | undefined,
  chartType: 'sale' | 'jeonse',
  cutoffYm: number,
  byMonthTier: Map<number, { all: number[] }>,
  bandHigh?: number,
  bandLow?: number
): ProcessedMonthlyPoint[] => {
  const safeList = transactions || [];
  if (!safeList.length) return [];

  sharedSecondaryByMonth.clear();
  sharedSecondaryMonthly.clear();

  for (let i = 0; i < safeList.length; i++) {
    const tx = safeList[i];
    const isSecondary = chartType === 'sale'
      ? (tx.dealType === '전세' || tx.dealType === '월세')
      : (tx.dealType !== '전세' && tx.dealType !== '월세');
    if (!isSecondary) continue;

    let rawPrice = tx.price;
    if (chartType === 'sale') {
      rawPrice = (tx.deposit || 0) + Math.round(((tx.monthlyRent || 0) * 12) / 0.055);
    }
    let priceEokNum = rawPrice / 10000;
    if (priceEokNum > 100) priceEokNum = rawPrice / 100000000;
    const price = Math.round(priceEokNum * 1000) / 1000;

    const ym = parseInt(tx.contractYm || '0');
    if (ym >= cutoffYm) {
      let arr = sharedSecondaryByMonth.get(ym);
      if (!arr) {
        arr = [];
        sharedSecondaryByMonth.set(ym, arr);
      }
      arr.push(price);
    }
  }

  sharedSecondaryByMonth.forEach((prices, ym) => {
    if (prices.length > 0) {
      const sorted = [...prices].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.1)] || 0;
      const q3 = sorted[Math.floor(sorted.length * 0.9)] || 10;
      const filtered = prices.filter((p) => p >= q1 * 0.8 && p <= q3 * 1.2);
      const valid = filtered.length > 0 ? filtered : prices;
      let sum = 0;
      for (let i = 0; i < valid.length; i++) sum += valid[i];
      sharedSecondaryMonthly.set(
        ym,
        Math.round((sum / valid.length) * 1000) / 1000
      );
    }
  });

  const avg = (arr: number[]) => {
    if (arr.length === 0) return undefined;
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i];
    return Math.round((sum / arr.length) * 1000) / 1000;
  };

  const allYms = Array.from(new Set([...byMonthTier.keys(), ...sharedSecondaryMonthly.keys()]));

  const result = allYms
    .map((ym) => {
      const buckets = byMonthTier.get(ym);
      const tsVal = new Date(Math.floor(ym / 100) || 2026, ((ym % 100) || 6) - 1, 15).getTime();
      const ts = isNaN(tsVal) ? new Date(2026, 5, 15).getTime() : tsVal;

      return {
        ts,
        monthAvg: buckets ? avg(buckets.all) : undefined,
        secondaryAvg: sharedSecondaryMonthly.get(ym),
        saleAvg:
          chartType === 'sale' ? (buckets ? avg(buckets.all) : undefined) : sharedSecondaryMonthly.get(ym),
        jeonseAvg:
          chartType === 'sale' ? sharedSecondaryMonthly.get(ym) : (buckets ? avg(buckets.all) : undefined),
        volume: buckets ? buckets.all.length : 0,
        ym,
        bandHigh,
        bandLow,
      };
    })
    .filter((d) => !isNaN(d.ts))
    .sort((a, b) => a.ts - b.ts);

  sharedSecondaryByMonth.clear();
  sharedSecondaryMonthly.clear();

  return result;
};
