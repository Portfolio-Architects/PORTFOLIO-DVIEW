/**
 * @module staticDataService
 * @description Encapsulated client-side data service & repository for static JSON data
 * and Firestore real-time transaction synchronization with in-memory caching and offline/local fallback.
 * Architecture Layer: Infrastructure / Services (`src/lib/services/`)
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import type {
  AptTxSummary,
  DongtanMacroTrendPoint,
  RecentTransaction,
  Recent7DaysVolume,
  LocationScoreItem,
} from '@/types/transaction';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { BUILD_VERSION } from '@/lib/build-version';

export const FirestoreTransactionSchema = z.object({
  aptName: z.string().min(1),
  dealType: z.string().catch('매매'),
  contractYm: z.union([z.string(), z.number()]).transform((val) => String(val)),
  contractDay: z.union([z.string(), z.number()]).transform((val) => String(val)),
  price: z.number().catch(0),
  deposit: z.number().catch(0),
  monthlyRent: z.number().catch(0),
  area: z.number().catch(0),
  areaPyeong: z.number().catch(0),
  floor: z.number().catch(0),
  contractDate: z.string().optional(),
});

export type FirestoreTransaction = z.infer<typeof FirestoreTransactionSchema>;

export interface TxSummaryResponse {
  summary: Record<string, AptTxSummary>;
  recent7DaysVolume?: Recent7DaysVolume;
}

// In-memory cache store
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const DEFAULT_FIRESTORE_CACHE_TTL = 300000; // 5 minutes

/**
 * Format price in 10,000 KRW (만원) to Korean Eok (억) string representation
 */
export function formatPriceEok(priceMan: number): string {
  const eok = Math.floor(priceMan / 10000);
  const remainder = priceMan % 10000;
  if (eok === 0) return `${priceMan.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억${remainder.toLocaleString()}`;
}

/**
 * Parse Korean price string (e.g. "8억5,000") to integer in 10,000 KRW (만원)
 */
export function parsePriceEokToMan(priceStr: string): number {
  if (typeof priceStr !== 'string') return 0;
  const clean = priceStr.split('/')[0].replace(/,/g, '').trim();
  let totalMan = 0;
  if (clean.includes('억')) {
    const parts = clean.split('억');
    const eokVal = parseFloat(parts[0]) || 0;
    totalMan += eokVal * 10000;
    if (parts[1]) {
      const manVal = parseFloat(parts[1].replace(/[^0-9.]/g, '')) || 0;
      totalMan += manVal;
    }
  } else {
    const manVal = parseFloat(clean.replace(/[^0-9.]/g, '')) || 0;
    totalMan += manVal;
  }
  return Math.round(totalMan);
}

/**
 * Weighted average price update helper for 1-month and 3-month windows
 */
export function updateSaleAveragesWithNewTx(target: AptTxSummary, price: number, txDate: Date): void {
  const latestDateStr = target.latestDate ? String(target.latestDate) : '';
  let refDate = new Date();
  if (latestDateStr.length === 8) {
    const y = parseInt(latestDateStr.substring(0, 4), 10);
    const m = parseInt(latestDateStr.substring(4, 6), 10);
    const d = parseInt(latestDateStr.substring(6, 8), 10);
    refDate = new Date(y, m - 1, d);
  }

  const oneMonthAgo = new Date(refDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(refDate.getTime() - 90 * 24 * 60 * 60 * 1000);

  if (txDate >= oneMonthAgo) {
    const prevCount = target.avg1MTxCount || 0;
    const prevAvg = target.avg1MPrice || 0;
    const newCount = prevCount + 1;
    const newAvg = Math.round((prevAvg * prevCount + price) / newCount / 100) * 100;
    target.avg1MTxCount = newCount;
    target.avg1MPrice = newAvg;
    target.avg1MPriceEok = formatPriceEok(newAvg);
  }

  if (txDate >= threeMonthsAgo) {
    const prevCount = target.avg3MTxCount || 0;
    const prevAvg = target.avg3MPrice || 0;
    const newCount = prevCount + 1;
    const newAvg = Math.round((prevAvg * prevCount + price) / newCount / 100) * 100;
    target.avg3MTxCount = newCount;
    target.avg3MPrice = newAvg;
    target.avg3MPriceEok = formatPriceEok(newAvg);
  }
}

/**
 * Merge static apartment transaction summary with new real-time Firestore transactions
 */
export function mergeTransactions(
  staticSummary: Record<string, AptTxSummary>,
  newTxs: FirestoreTransaction[]
): Record<string, AptTxSummary> {
  if (!newTxs || newTxs.length === 0) return staticSummary;

  const merged = { ...staticSummary };
  const updatedKeys = new Set<string>();

  newTxs.forEach((tx) => {
    const validation = FirestoreTransactionSchema.safeParse(tx);
    if (!validation.success) return;

    const validatedTx = validation.data;
    const rawAptName = validatedTx.aptName;

    const aptKey = rawAptName
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\[.*?\]\s*/g, '')
      .replace(/\s+/g, '')
      .replace(/[()（）]/g, '')
      .trim();

    const staticTarget = staticSummary[aptKey];
    if (!staticTarget) return;

    if (!updatedKeys.has(aptKey)) {
      merged[aptKey] = { ...staticTarget };
      if (staticTarget.maxPriceByArea) {
        merged[aptKey].maxPriceByArea = { ...staticTarget.maxPriceByArea };
      }
      updatedKeys.add(aptKey);
    }

    const target = merged[aptKey];
    const contractYmStr = validatedTx.contractYm;
    if (contractYmStr.length < 6) return;

    const isSale = validatedTx.dealType !== '전세' && validatedTx.dealType !== '월세';
    const txFullDate = validatedTx.contractDate || `${contractYmStr}${validatedTx.contractDay}`;

    if (isSale) {
      target.txCount = (target.txCount || 0) + 1;

      if (validatedTx.price > (target.maxPrice || 0)) {
        target.maxPrice = validatedTx.price;
        target.maxPriceEok = formatPriceEok(validatedTx.price);
      }

      const areaKey = (Math.round(validatedTx.area * 100) / 100).toFixed(2);
      if (!target.maxPriceByArea) target.maxPriceByArea = {};
      if (!target.maxPriceByArea[areaKey] || validatedTx.price > target.maxPriceByArea[areaKey]) {
        target.maxPriceByArea[areaKey] = validatedTx.price;
      }

      if (!target.latestDate || txFullDate >= target.latestDate) {
        target.latestDate = txFullDate;
        target.latestPrice = validatedTx.price || 0;
        target.latestPriceEok = formatPriceEok(validatedTx.price);
        target.latestArea = validatedTx.areaPyeong || validatedTx.area * 0.3025 * 1.33;
        target.latestFloor = validatedTx.floor || 0;
      }

      const latestYear = parseInt(contractYmStr.substring(0, 4), 10);
      const latestMonth = parseInt(contractYmStr.substring(4, 6), 10);
      const dayVal = parseInt(validatedTx.contractDay, 10) || 1;
      const txDate = new Date(latestYear, latestMonth - 1, dayVal);
      updateSaleAveragesWithNewTx(target, validatedTx.price, txDate);
    } else {
      const deposit = validatedTx.deposit || 0;
      const monthlyRent = validatedTx.monthlyRent || 0;
      const convertedDeposit = deposit + (monthlyRent ? Math.round((monthlyRent * 12) / 0.055) : 0);

      if (!target.latestRentDate || txFullDate >= target.latestRentDate) {
        const isRentDup =
          target.latestRentDate === txFullDate &&
          target.latestRentDeposit === convertedDeposit &&
          target.latestRentMonthly === monthlyRent;
        if (!isRentDup) {
          target.latestRentDate = txFullDate;
          target.latestRentDeposit = convertedDeposit;
          target.latestRentDepositEok = formatPriceEok(convertedDeposit);
          target.latestRentMonthly = monthlyRent;
          target.rentTxCount = (target.rentTxCount || 0) + 1;
        }
      }
    }
  });

  return merged;
}

/**
 * Merge static recent transaction flat list with new real-time Firestore transactions
 */
export function mergeRecentTransactions(
  staticRecent: RecentTransaction[],
  newTxs: FirestoreTransaction[],
  targetAptKeys?: Set<string>
): RecentTransaction[] {
  if (!newTxs || newTxs.length === 0) return staticRecent;

  const merged = [...staticRecent];

  newTxs.forEach((tx) => {
    const validation = FirestoreTransactionSchema.safeParse(tx);
    if (!validation.success) return;

    const validatedTx = validation.data;
    const isSale = validatedTx.dealType !== '전세' && validatedTx.dealType !== '월세';
    if (!isSale) return;

    const aptKey = validatedTx.aptName
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\[.*?\]\s*/g, '')
      .replace(/\s+/g, '')
      .replace(/[()（）]/g, '')
      .trim();

    if (targetAptKeys && targetAptKeys.size > 0 && !targetAptKeys.has(aptKey)) return;

    const txDateFormatted = `${validatedTx.contractYm.substring(4)}.${validatedTx.contractDay}`;
    const contractDate = validatedTx.contractDate || `${validatedTx.contractYm}${validatedTx.contractDay}`;

    const isDup = merged.some(
      (r) =>
        r.contractDate === contractDate &&
        r.txKey === aptKey &&
        Math.abs(r.area - validatedTx.area) < 0.01 &&
        r.floor === validatedTx.floor &&
        r.priceVal === validatedTx.price / 10000
    );
    if (isDup) return;

    const newTxItem = {
      aptName: validatedTx.aptName,
      txKey: aptKey,
      date: txDateFormatted,
      contractDate: contractDate,
      priceVal: validatedTx.price / 10000,
      priceEok: formatPriceEok(validatedTx.price),
      area: validatedTx.area,
      areaPyeong: validatedTx.areaPyeong || validatedTx.area * 0.3025 * 1.33,
      floor: validatedTx.floor,
      dealType: validatedTx.dealType || '매매',
      isNewHigh: false,
      delta: 0,
      deltaPercent: 0,
    };

    merged.unshift(newTxItem);
  });

  merged.sort((a, b) => b.contractDate.localeCompare(a.contractDate));
  return merged;
}

/**
 * Compute 7-day transaction volume and trend metric incorporating real-time Firestore updates
 */
export function computeRecent7DaysVolume(
  activeVolume: Recent7DaysVolume | undefined,
  activeSummary: Record<string, AptTxSummary> | undefined,
  recentFirestoreTxs: FirestoreTransaction[] | undefined
): Recent7DaysVolume | undefined {
  if (!activeVolume || !activeSummary) return undefined;
  if (!recentFirestoreTxs || recentFirestoreTxs.length === 0) return activeVolume;

  let maxStaticDate = '00000000';
  Object.values(activeSummary).forEach((s) => {
    if (s.latestDate && s.latestDate > maxStaticDate) {
      maxStaticDate = s.latestDate;
    }
  });

  const newTxsAfterStatic = recentFirestoreTxs.filter((tx) => {
    const isSale = tx.dealType !== '전세' && tx.dealType !== '월세';
    const txFullDate = tx.contractDate || `${tx.contractYm}${tx.contractDay}`;
    return isSale && txFullDate > maxStaticDate;
  });

  if (newTxsAfterStatic.length === 0) return activeVolume;

  const currentCount = activeVolume.currentCount + newTxsAfterStatic.length;
  const prevCount = activeVolume.prevCount;
  const diff = currentCount - prevCount;
  const rate = prevCount > 0 ? (diff / prevCount) * 100 : 0;
  const isUp = diff > 0;
  const isDown = diff < 0;
  let trendText = '보합 (0%)';
  let trendColor = '#94a3b8';

  if (isUp) {
    trendText = `상승 (+${rate.toFixed(1)}%)`;
    trendColor = '#ff4b5c';
  } else if (isDown) {
    trendText = `하락 (${rate.toFixed(1)}%)`;
    trendColor = '#2e7cf6';
  }

  return {
    currentCount,
    prevCount,
    trendText,
    trendColor,
    badge: `${diff >= 0 ? '+' : ''}${diff}건 (${diff >= 0 ? '+' : ''}${rate.toFixed(0)}%)`,
  };
}

/**
 * Static Data Repository Service
 */
export const staticDataService = {
  /**
   * Fetch recent transactions from Firestore with in-memory caching and offline fallback
   */
  async fetchRecentTransactionsFromFirestore(
    days: number = 30,
    forceRefresh: boolean = false
  ): Promise<FirestoreTransaction[]> {
    const cacheKey = `firestore-txs-${days}`;
    const cached = memoryCache.get(cacheKey) as CacheEntry<FirestoreTransaction[]> | undefined;
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.timestamp < DEFAULT_FIRESTORE_CACHE_TTL) {
      return cached.data;
    }

    if (!db) {
      return cached?.data || [];
    }

    try {
      const thirtyDaysAgo = new Date(now - days * 24 * 60 * 60 * 1000);
      const y = thirtyDaysAgo.getFullYear();
      const m = String(thirtyDaysAgo.getMonth() + 1).padStart(2, '0');
      const d = String(thirtyDaysAgo.getDate()).padStart(2, '0');
      const cutoffDateStr = `${y}${m}${d}`;

      const q = query(
        collection(db, 'transactions'),
        where('contractDate', '>=', cutoffDateStr)
      );

      const snap = await getDocs(q);
      const txs: FirestoreTransaction[] = [];
      snap.forEach((doc) => {
        const raw = doc.data();
        const parsed = FirestoreTransactionSchema.safeParse(raw);
        if (parsed.success) {
          txs.push(parsed.data);
        }
      });

      memoryCache.set(cacheKey, { data: txs, timestamp: now });
      return txs;
    } catch (err) {
      logger.error(
        'staticDataService.fetchRecentTransactionsFromFirestore',
        'Failed to fetch recent transactions from Firestore; using fallback cache',
        {},
        err as Error
      );
      // Graceful offline fallback: return cached or empty
      return cached?.data || [];
    }
  },

  /**
   * Fetch static JSON data with build versioning and error checking
   */
  async fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(url, { cache: 'no-store', signal });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json() as Promise<T>;
  },

  /**
   * Fetch transaction summary (tx-summary.json)
   */
  async fetchTxSummary(buildVersion: string = BUILD_VERSION, signal?: AbortSignal): Promise<TxSummaryResponse> {
    return this.fetchJson<TxSummaryResponse>(`/data/tx-summary.json?v=${buildVersion}`, signal);
  },

  /**
   * Fetch recent transactions (recent-transactions.json)
   */
  async fetchRecentTransactions(buildVersion: string = BUILD_VERSION, signal?: AbortSignal): Promise<RecentTransaction[]> {
    return this.fetchJson<RecentTransaction[]>(`/data/recent-transactions.json?v=${buildVersion}`, signal);
  },

  /**
   * Fetch macro trend data (macro-trend.json)
   */
  async fetchMacroTrend(buildVersion: string = BUILD_VERSION, signal?: AbortSignal): Promise<DongtanMacroTrendPoint[]> {
    return this.fetchJson<DongtanMacroTrendPoint[]>(`/data/macro-trend.json?v=${buildVersion}`, signal);
  },

  /**
   * Fetch location scores (location-scores.json)
   */
  async fetchLocationScores(buildVersion: string = BUILD_VERSION, signal?: AbortSignal): Promise<Record<string, LocationScoreItem>> {
    return this.fetchJson<Record<string, LocationScoreItem>>(`/data/location-scores.json?v=${buildVersion}`, signal);
  },

  /**
   * Invalidate and clear memory cache
   */
  clearCache(): void {
    memoryCache.clear();
  },
};
