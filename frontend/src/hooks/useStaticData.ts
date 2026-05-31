import { useState, useEffect } from 'react';
import useSWR from 'swr';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/lib/types/transaction';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useTxData(initialMacroTrend?: DongtanMacroTrendPoint[]) {
  const [shouldFetch, setShouldFetch] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => setShouldFetch(true), { timeout: 150 });
    } else {
      setTimeout(() => setShouldFetch(true), 100);
    }
  }, []);

  const { data: summaryData, error: summaryError, isLoading: isSummaryLoading } = useSWR<{
    summary: Record<string, AptTxSummary>;
  }>(shouldFetch ? '/data/tx-summary.json' : null, fetcher, {
    revalidateOnFocus: true,
    revalidateIfStale: true,
    revalidateOnReconnect: true,
    dedupingInterval: 300000 // 5분 캐시로 단축하여 실거래 갱신 반영 보장
  });

  const { data: trendData, error: trendError, isLoading: isTrendLoading } = useSWR<DongtanMacroTrendPoint[]>(
    shouldFetch ? '/data/macro-trend.json' : null,
    fetcher,
    {
      fallbackData: initialMacroTrend,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000 // 1 hour cache
    }
  );
  
  return {
    txSummary: summaryData?.summary,
    macroTrend: trendData || initialMacroTrend,
    isLoading: (!shouldFetch && !initialMacroTrend) || isSummaryLoading || (isTrendLoading && !initialMacroTrend),
    error: summaryError || trendError
  };
}

export function useLocationScores() {
  const [shouldFetch, setShouldFetch] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => setShouldFetch(true), { timeout: 150 });
    } else {
      setTimeout(() => setShouldFetch(true), 100);
    }
  }, []);

  const { data, error, isLoading } = useSWR<Record<string, any>>(shouldFetch ? '/data/location-scores.json' : null, fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
    dedupingInterval: 3600000 // 1 hour cache
  });
  
  return {
    locationScores: data,
    isLoading: !shouldFetch || isLoading,
    error
  };
}
