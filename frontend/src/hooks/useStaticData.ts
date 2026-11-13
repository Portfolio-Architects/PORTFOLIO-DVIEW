/**
 * @module useStaticData
 * @description Application hook layer for static transaction summary and real-time Firestore transaction data.
 * Decoupled from direct Firestore SDK queries via staticDataService repository.
 * Architecture Layer: Application / Hooks (`src/hooks/`)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import useSWR from 'swr';
import type {
  AptTxSummary,
  DongtanMacroTrendPoint,
  RecentTransaction,
  Recent7DaysVolume,
  LocationScoreItem,
  TimelinePeriod,
} from '@/types/transaction';
import { BUILD_VERSION } from '@/lib/build-version';
import { logger } from '@/lib/services/logger';
import {
  staticDataService,
  FirestoreTransaction,
  FirestoreTransactionSchema,
  mergeTransactions,
  mergeRecentTransactions,
  computeRecent7DaysVolume,
  parsePeriodTransactions,
} from '@/lib/services/staticDataService';
import {
  useLiveTransactionDelta,
  mergeLiveDeltaRecentTransactions,
  hasDeltaAlreadyInRecent,
} from '@/hooks/useLiveTransactionDelta';

export { FirestoreTransactionSchema };
export type { FirestoreTransaction };

const staticJsonFetcher = <T>(url: string): Promise<T> => staticDataService.fetchJson<T>(url);

export function useTxData(
  initialMacroTrend?: DongtanMacroTrendPoint[],
  initialTxSummary?: Record<string, AptTxSummary>,
  initialRecent7DaysVolume?: Recent7DaysVolume,
  initialRecentTransactions?: RecentTransaction[]
) {
  const [shouldFetch, setShouldFetch] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setHasHydrated(true);
    if (typeof window === 'undefined') return;

    let idleId: number | null = null;
    let timerId: NodeJS.Timeout | null = null;

    if ('requestIdleCallback' in window && window.requestIdleCallback) {
      idleId = window.requestIdleCallback(() => {
        if (isMountedRef.current) setShouldFetch(true);
      }, { timeout: 150 });
    } else {
      timerId = setTimeout(() => {
        if (isMountedRef.current) setShouldFetch(true);
      }, 100);
    }

    return () => {
      isMountedRef.current = false;
      if (idleId !== null && window.cancelIdleCallback) {
        window.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, []);

  const isBrowser = typeof window !== 'undefined';

  // 1. Static summary data fetching (tx-summary.json) — gated behind hasHydrated for SSR hydration parity
  const hasTxSummaryFallback = !!(initialTxSummary && Object.keys(initialTxSummary).length > 0);
  const { data: summaryData, error: summaryError, isLoading: isSummaryLoading } = useSWR<{
    summary: Record<string, AptTxSummary>;
    recent7DaysVolume?: {
      currentCount: number;
      prevCount: number;
      trendText: string;
      trendColor: string;
      badge: string;
    };
  }>(hasHydrated ? `/data/tx-summary.json?v=${BUILD_VERSION}` : null, staticJsonFetcher, {
    fallbackData:
      hasTxSummaryFallback
        ? { summary: initialTxSummary, recent7DaysVolume: initialRecent7DaysVolume }
        : undefined,
    revalidateOnFocus: false,
    revalidateIfStale: !hasTxSummaryFallback,
    revalidateOnMount: !hasTxSummaryFallback,
    revalidateOnReconnect: false,
    dedupingInterval: 300000,
  });

  // 1-2. Recent transactions list fetching (recent-transactions.json)
  const hasRecentTxFallback = !!(initialRecentTransactions && initialRecentTransactions.length > 0);
  const { data: recentTxData, error: recentTxError, isLoading: isRecentTxLoading } = useSWR<RecentTransaction[]>(
    hasHydrated ? `/data/recent-transactions.json?v=${BUILD_VERSION}` : null,
    staticJsonFetcher,
    {
      fallbackData: hasRecentTxFallback ? initialRecentTransactions : undefined,
      revalidateOnFocus: false,
      revalidateIfStale: !hasRecentTxFallback,
      revalidateOnMount: !hasRecentTxFallback,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    }
  );

  // 2. Real-time recent transactions via encapsulated staticDataService (Zero-cost client reads: bypassed in browser)
  const shouldFetchFirestore = !isBrowser && shouldFetch;
  const { data: recentFirestoreTxs, error: firestoreError } = useSWR<FirestoreTransaction[]>(
    shouldFetchFirestore ? 'recent-firestore-txs' : null,
    () => staticDataService.fetchRecentTransactionsFromFirestore(30),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    }
  );

  // 2-2. CDN-cached post-build server delta (0 browser Firestore reads)
  const { data: liveDelta } = useLiveTransactionDelta(hasHydrated);

  const effectiveFirestoreTxs = useMemo(() => {
    const baseTxs = recentFirestoreTxs || [];
    if (!liveDelta?.hasDelta || !liveDelta.rawDeltaDocs || liveDelta.rawDeltaDocs.length === 0) {
      return baseTxs;
    }
    const isFromInitialSsr = !summaryData?.summary || summaryData.summary === initialTxSummary;
    let alreadyInSsr = false;
    if (isFromInitialSsr) {
      if (liveDelta.deltaTransactions && liveDelta.deltaTransactions.length > 0) {
        alreadyInSsr = hasDeltaAlreadyInRecent(initialRecentTransactions, liveDelta.deltaTransactions);
      } else if (liveDelta.marketStats?.latestRegisteredDate && initialRecentTransactions) {
        alreadyInSsr = initialRecentTransactions.some(
          (r) => r.registeredDate === liveDelta.marketStats?.latestRegisteredDate
        );
      }
    }
    if (alreadyInSsr) {
      return baseTxs;
    }
    return [...baseTxs, ...(liveDelta.rawDeltaDocs as unknown as FirestoreTransaction[])];
  }, [recentFirestoreTxs, liveDelta, summaryData?.summary, initialRecentTransactions]);

  // 3. Static data + real-time Firestore data merged summary
  const mergedSummary = useMemo(() => {
    const activeSummary = (!hasHydrated ? initialTxSummary : summaryData?.summary) || initialTxSummary;
    if (!activeSummary) return undefined;
    if (!effectiveFirestoreTxs || effectiveFirestoreTxs.length === 0) return activeSummary;
    return mergeTransactions(activeSummary, effectiveFirestoreTxs);
  }, [hasHydrated, summaryData?.summary, initialTxSummary, effectiveFirestoreTxs]);

  // 3-2. Static recent transactions + real-time Firestore data merged list
  const mergedRecentTxs = useMemo(() => {
    const activeRecent = (!hasHydrated ? initialRecentTransactions : recentTxData) || initialRecentTransactions || [];
    const targetAptKeys = new Set(Object.keys(summaryData?.summary || initialTxSummary || {}));
    const afterFirestore =
      recentFirestoreTxs && recentFirestoreTxs.length > 0
        ? mergeRecentTransactions(activeRecent, recentFirestoreTxs, targetAptKeys)
        : activeRecent;
    return mergeLiveDeltaRecentTransactions(afterFirestore, liveDelta?.deltaTransactions);
  }, [hasHydrated, recentTxData, initialRecentTransactions, recentFirestoreTxs, summaryData?.summary, initialTxSummary, liveDelta?.deltaTransactions]);

  // 4. 7-day transaction volume metric calculation
  const mergedRecent7DaysVolume = useMemo(() => {
    const activeVolume = (!hasHydrated ? initialRecent7DaysVolume : summaryData?.recent7DaysVolume) || initialRecent7DaysVolume;
    const activeSummary = (!hasHydrated ? initialTxSummary : summaryData?.summary) || initialTxSummary;
    return computeRecent7DaysVolume(activeVolume, activeSummary, effectiveFirestoreTxs);
  }, [hasHydrated, summaryData?.recent7DaysVolume, initialRecent7DaysVolume, summaryData?.summary, initialTxSummary, effectiveFirestoreTxs]);

  // 5. Macro trend data fetching (macro-trend.json)
  const hasMacroTrendFallback = !!(initialMacroTrend && initialMacroTrend.length > 0);
  const { data: trendData, error: trendError, isLoading: isTrendLoading } = useSWR<DongtanMacroTrendPoint[]>(
    hasHydrated ? `/data/macro-trend.json?v=${BUILD_VERSION}` : null,
    staticJsonFetcher,
    {
      fallbackData: initialMacroTrend,
      revalidateOnFocus: false,
      revalidateIfStale: !hasMacroTrendFallback,
      revalidateOnMount: !hasMacroTrendFallback,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000,
    }
  );

  if (summaryError) {
    const errorMsg =
      summaryError && typeof summaryError === 'object' && 'message' in summaryError
        ? (summaryError as Error).message
        : String(summaryError);

    logger.error(
      'useStaticData.useTxData',
      'useTxData SWR summary error',
      {
        errorMsg,
        isErrorInstance: String(summaryError instanceof Error),
      },
      summaryError as Error
    );
  }

  return {
    txSummary: mergedSummary,
    recentTransactions: mergedRecentTxs,
    recent7DaysVolume: mergedRecent7DaysVolume,
    macroTrend: (!hasHydrated ? initialMacroTrend : trendData) || initialMacroTrend,
    isLoading:
      (!shouldFetch && !initialMacroTrend) ||
      (hasHydrated && isSummaryLoading) ||
      (hasHydrated && isRecentTxLoading) ||
      (hasHydrated && isTrendLoading && !initialMacroTrend),
    error: summaryError || trendError || recentTxError || firestoreError,
  };
}

export function useLocationScores(fallbackData?: Record<string, LocationScoreItem>) {
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const hasFallback = !!(fallbackData && Object.keys(fallbackData).length > 0);
  const { data, error, isLoading } = useSWR<Record<string, LocationScoreItem>>(
    hasHydrated ? `/data/location-scores.json?v=${BUILD_VERSION}` : null,
    staticJsonFetcher,
    {
      fallbackData: hasFallback ? fallbackData : undefined,
      revalidateOnFocus: false,
      revalidateIfStale: !hasFallback,
      revalidateOnMount: !hasFallback,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // 1 hour cache
    }
  );

  const activeScores = (!hasHydrated ? fallbackData : data) || fallbackData;

  return {
    locationScores: activeScores,
    isLoading: (!hasHydrated ? !hasFallback : isLoading) || !activeScores,
    error,
  };
}

function filterTransactionsByLatestDay(txs: RecentTransaction[]): RecentTransaction[] {
  if (!Array.isArray(txs) || txs.length === 0) return [];
  let maxDateStr = '';
  for (let i = 0; i < txs.length; i++) {
    const cd = String(txs[i]?.registeredDate || txs[i]?.contractDate || txs[i]?.date || '');
    const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
    if (clean.length === 8 && clean > maxDateStr) maxDateStr = clean;
  }
  if (maxDateStr.length < 8) return txs;

  return txs.filter((tx) => {
    const cd = String(tx?.registeredDate || tx?.contractDate || tx?.date || '');
    const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
    if (clean.length < 8) return true;
    return clean === maxDateStr;
  });
}

function filterTransactionsByDays(txs: RecentTransaction[], days: number): RecentTransaction[] {
  if (!Array.isArray(txs) || txs.length === 0) return [];
  let maxDateStr = '';
  for (let i = 0; i < txs.length; i++) {
    const cd = String(txs[i]?.registeredDate || txs[i]?.contractDate || txs[i]?.date || '');
    const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
    if (clean > maxDateStr) maxDateStr = clean;
  }
  if (maxDateStr.length < 8) return txs;

  const y = parseInt(maxDateStr.slice(0, 4), 10);
  const m = parseInt(maxDateStr.slice(4, 6), 10) - 1;
  const d = parseInt(maxDateStr.slice(6, 8), 10);
  const cutoffD = new Date(y, m, d - days);
  const cutoffNum = cutoffD.getFullYear() * 10000 + (cutoffD.getMonth() + 1) * 100 + cutoffD.getDate();

  return txs.filter((tx) => {
    const cd = String(tx?.registeredDate || tx?.contractDate || tx?.date || '');
    const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
    if (clean.length < 8) return true;
    return parseInt(clean, 10) >= cutoffNum;
  });
}

export interface UsePeriodTransactionsOptions {
  chunked?: boolean;
}

/**
 * On-demand SWR static fetcher for period chunks (7d, 30d, 90d, 1y, 3y, all) with CDN caching and zero Firestore reads.
 * When `options.chunked` is true, uses progressive yearly chunk files (`tx-2026.json`, `tx-2025.json`, `tx-2024.json`, `tx-historical.json`)
 * so expanding `1y -> 3y -> all` reuses already-downloaded yearly chunks in memory (P2-2 / B12).
 */
export function usePeriodTransactions(
  period: TimelinePeriod = '90d',
  fallbackRecentTransactions?: RecentTransaction[],
  options?: UsePeriodTransactionsOptions
) {
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const useChunked = Boolean(options?.chunked);
  const isRecentBased = period === '1d' || period === '7d' || period === '30d' || period === '90d';
  const hasRecentFallback = !!(isRecentBased && fallbackRecentTransactions && fallbackRecentTransactions.length > 0);

  const periodPathMap: Record<TimelinePeriod, string> = {
    '1d': `/data/recent-transactions.json?v=${BUILD_VERSION}`,
    '7d': `/data/recent-transactions.json?v=${BUILD_VERSION}`,
    '30d': `/data/recent-transactions.json?v=${BUILD_VERSION}`,
    '90d': `/data/recent-transactions.json?v=${BUILD_VERSION}`,
    '1y': `/data/transactions-1y.json?v=${BUILD_VERSION}`,
    '3y': `/data/transactions-3y.json?v=${BUILD_VERSION}`,
    'all': `/data/transactions-all.json?v=${BUILD_VERSION}`,
  };

  const { data: liveDelta } = useLiveTransactionDelta(hasHydrated);
  const chunkFiles = staticDataService.resolveYearlyChunkFiles(period);
  // Defer browser SWR key until after initial hydration so SSR and client initial render match 100%
  const swrKey = !hasHydrated
    ? null
    : useChunked && !isRecentBased
      ? `tx-chunks:${period}:${BUILD_VERSION}:${chunkFiles.join(',')}`
      : periodPathMap[period];

  const { data: rawData, error, isLoading } = useSWR<unknown>(
    swrKey,
    (key: string) =>
      key.startsWith('tx-chunks:')
        ? staticDataService.fetchPeriodTransactionsChunked(period, BUILD_VERSION)
        : staticJsonFetcher(key),
    {
      fallbackData: isRecentBased ? fallbackRecentTransactions : undefined,
      revalidateOnFocus: false,
      revalidateIfStale: !hasRecentFallback,
      revalidateOnMount: !hasRecentFallback,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // 1 hour memory cache
    }
  );

  const transactions = useMemo(() => {
    let list: RecentTransaction[] = [];
    if (!hasHydrated) {
      if (isRecentBased && fallbackRecentTransactions) {
        list = fallbackRecentTransactions;
      } else {
        return [];
      }
    } else if (!rawData) {
      if (isRecentBased && fallbackRecentTransactions) {
        list = fallbackRecentTransactions;
      } else {
        return [];
      }
    } else {
      list = parsePeriodTransactions(rawData);
      if (!isRecentBased && fallbackRecentTransactions && fallbackRecentTransactions.length > 0 && list.length > 0) {
        const regLookup = new Map<string, RecentTransaction>();
        for (let i = 0; i < fallbackRecentTransactions.length; i++) {
          const rTx = fallbackRecentTransactions[i];
          if (rTx?.registeredDate) {
            const k = `${rTx.txKey || rTx.aptName}|${rTx.contractDate}|${rTx.priceVal}|${rTx.floor}|${rTx.area}`;
            if (!regLookup.has(k)) regLookup.set(k, rTx);
          }
        }
        if (regLookup.size > 0) {
          const maxCheck = Math.min(list.length, fallbackRecentTransactions.length * 2);
          for (let i = 0; i < maxCheck; i++) {
            const item = list[i];
            if (item && !item.registeredDate) {
              const k = `${item.txKey || item.aptName}|${item.contractDate}|${item.priceVal}|${item.floor}|${item.area}`;
              const matched = regLookup.get(k);
              if (matched?.registeredDate) {
                list[i] = {
                  ...item,
                  registeredDate: matched.registeredDate,
                  registeredDateLabel: matched.registeredDateLabel,
                  ...(matched.prevPriceVal !== undefined ? { prevPriceVal: matched.prevPriceVal } : {}),
                };
              }
            }
          }
        }
      }
    }

    if (hasHydrated && liveDelta?.deltaTransactions?.length) {
      list = mergeLiveDeltaRecentTransactions(list, liveDelta.deltaTransactions);
    }

    if (period === '1d') {
      return filterTransactionsByLatestDay(list);
    }
    if (period === '7d') {
      return filterTransactionsByDays(list, 7);
    }
    if (period === '30d') {
      return filterTransactionsByDays(list, 30);
    }
    if (useChunked && period === '1y') {
      return filterTransactionsByDays(list, 365);
    }
    if (useChunked && period === '3y') {
      return filterTransactionsByDays(list, 365 * 3);
    }
    return list;
  }, [hasHydrated, rawData, isRecentBased, fallbackRecentTransactions, period, useChunked, liveDelta]);

  return {
    transactions,
    chunkFiles,
    isLoading: hasHydrated && isLoading && (!transactions || transactions.length === 0),
    error,
  };
}

/**
 * Progressive yearly chunked period transactions hook (P2-2).
 * Fetches and deduplicates yearly chunks (`tx-2026.json`, `tx-2025.json`, `tx-2024.json`, `tx-historical.json`)
 * so expanding from 1y -> 3y -> all only downloads incremental yearly chunks instead of monolithic 9.4MB payloads.
 */
export function useChunkedPeriodTransactions(
  period: TimelinePeriod = '90d',
  fallbackRecentTransactions?: RecentTransaction[]
) {
  return usePeriodTransactions(period, fallbackRecentTransactions, { chunked: true });
}
