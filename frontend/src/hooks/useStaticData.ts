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
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
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

  // 1. Static summary data fetching (tx-summary.json)
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
  }>(isBrowser ? `/data/tx-summary.json?v=${BUILD_VERSION}` : null, staticJsonFetcher, {
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
    isBrowser ? `/data/recent-transactions.json?v=${BUILD_VERSION}` : null,
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

  // 3. Static data + real-time Firestore data merged summary
  const mergedSummary = useMemo(() => {
    const activeSummary = summaryData?.summary || initialTxSummary;
    if (!activeSummary) return undefined;
    if (!recentFirestoreTxs || recentFirestoreTxs.length === 0) return activeSummary;
    return mergeTransactions(activeSummary, recentFirestoreTxs);
  }, [summaryData?.summary, initialTxSummary, recentFirestoreTxs]);

  // 3-2. Static recent transactions + real-time Firestore data merged list
  const mergedRecentTxs = useMemo(() => {
    const activeRecent = recentTxData || initialRecentTransactions || [];
    if (!recentFirestoreTxs || recentFirestoreTxs.length === 0) return activeRecent;
    const targetAptKeys = new Set(Object.keys(summaryData?.summary || initialTxSummary || {}));
    return mergeRecentTransactions(activeRecent, recentFirestoreTxs, targetAptKeys);
  }, [recentTxData, initialRecentTransactions, recentFirestoreTxs, summaryData?.summary, initialTxSummary]);

  // 4. 7-day transaction volume metric calculation
  const mergedRecent7DaysVolume = useMemo(() => {
    const activeVolume = summaryData?.recent7DaysVolume || initialRecent7DaysVolume;
    const activeSummary = summaryData?.summary || initialTxSummary;
    return computeRecent7DaysVolume(activeVolume, activeSummary, recentFirestoreTxs);
  }, [summaryData?.recent7DaysVolume, initialRecent7DaysVolume, summaryData?.summary, initialTxSummary, recentFirestoreTxs]);

  // 5. Macro trend data fetching (macro-trend.json)
  const { data: trendData, error: trendError, isLoading: isTrendLoading } = useSWR<DongtanMacroTrendPoint[]>(
    isBrowser ? `/data/macro-trend.json?v=${BUILD_VERSION}` : null,
    staticJsonFetcher,
    {
      fallbackData: initialMacroTrend,
      revalidateOnFocus: false,
      revalidateIfStale: false,
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
    macroTrend: trendData || initialMacroTrend,
    isLoading:
      (!shouldFetch && !initialMacroTrend) ||
      isSummaryLoading ||
      isRecentTxLoading ||
      (isTrendLoading && !initialMacroTrend),
    error: summaryError || trendError || recentTxError || firestoreError,
  };
}

export function useLocationScores(fallbackData?: Record<string, LocationScoreItem>) {
  const hasFallback = !!(fallbackData && Object.keys(fallbackData).length > 0);
  const { data, error, isLoading } = useSWR<Record<string, LocationScoreItem>>(
    `/data/location-scores.json?v=${BUILD_VERSION}`,
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

  return {
    locationScores: data,
    isLoading: isLoading || !data,
    error,
  };
}

function filterTransactionsByDays(txs: RecentTransaction[], days: number): RecentTransaction[] {
  if (!Array.isArray(txs) || txs.length === 0) return [];
  let maxDateStr = '';
  for (let i = 0; i < txs.length; i++) {
    const cd = String(txs[i]?.contractDate || txs[i]?.date || '');
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
    const cd = String(tx?.contractDate || tx?.date || '');
    const clean = cd.replace(/[^0-9]/g, '').slice(0, 8);
    if (clean.length < 8) return true;
    return parseInt(clean, 10) >= cutoffNum;
  });
}

/**
 * On-demand SWR static fetcher for period chunks (7d, 30d, 90d, 1y, 3y, all) with CDN caching and zero Firestore reads.
 */
export function usePeriodTransactions(
  period: TimelinePeriod = '90d',
  fallbackRecentTransactions?: RecentTransaction[]
) {
  const isBrowser = typeof window !== 'undefined';
  const isRecentBased = period === '90d' || period === '7d' || period === '30d';

  const periodPathMap: Record<TimelinePeriod, string> = {
    '7d': `/data/recent-transactions.json?v=${BUILD_VERSION}`,
    '30d': `/data/recent-transactions.json?v=${BUILD_VERSION}`,
    '90d': `/data/recent-transactions.json?v=${BUILD_VERSION}`,
    '1y': `/data/transactions-1y.json?v=${BUILD_VERSION}`,
    '3y': `/data/transactions-3y.json?v=${BUILD_VERSION}`,
    'all': `/data/transactions-all.json?v=${BUILD_VERSION}`,
  };

  const url = isBrowser ? periodPathMap[period] : null;

  const { data: rawData, error, isLoading } = useSWR<unknown>(
    url,
    staticJsonFetcher,
    {
      fallbackData: isRecentBased ? fallbackRecentTransactions : undefined,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // 1 hour memory cache
    }
  );

  const transactions = useMemo(() => {
    let list: RecentTransaction[] = [];
    if (!rawData) {
      if (isRecentBased && fallbackRecentTransactions) {
        list = fallbackRecentTransactions;
      } else {
        return [];
      }
    } else {
      list = parsePeriodTransactions(rawData);
    }

    if (period === '7d') {
      return filterTransactionsByDays(list, 7);
    }
    if (period === '30d') {
      return filterTransactionsByDays(list, 30);
    }
    return list;
  }, [rawData, isRecentBased, fallbackRecentTransactions, period]);

  return {
    transactions,
    isLoading: isLoading && (!transactions || transactions.length === 0),
    error,
  };
}

