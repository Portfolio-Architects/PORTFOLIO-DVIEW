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
      initialTxSummary && Object.keys(initialTxSummary).length > 0
        ? { summary: initialTxSummary, recent7DaysVolume: initialRecent7DaysVolume }
        : undefined,
    revalidateOnFocus: false,
    revalidateIfStale: true,
    revalidateOnReconnect: false,
    dedupingInterval: 3600000,
  });

  // 1-2. Recent transactions list fetching (recent-transactions.json)
  const { data: recentTxData, error: recentTxError, isLoading: isRecentTxLoading } = useSWR<RecentTransaction[]>(
    isBrowser ? `/data/recent-transactions.json?v=${BUILD_VERSION}` : null,
    staticJsonFetcher,
    {
      fallbackData: initialRecentTransactions,
      revalidateOnFocus: false,
      revalidateIfStale: true,
      revalidateOnMount: true,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    }
  );

  // 2. Real-time recent transactions via encapsulated staticDataService
  const { data: recentFirestoreTxs, error: firestoreError } = useSWR<FirestoreTransaction[]>(
    shouldFetch ? 'recent-firestore-txs' : null,
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

export function useLocationScores() {
  const { data, error, isLoading } = useSWR<Record<string, LocationScoreItem>>(
    `/data/location-scores.json?v=${BUILD_VERSION}`,
    staticJsonFetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnMount: false,
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
