import { useState, useEffect } from 'react';
import useSWR from 'swr';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/lib/types/transaction';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useTxData() {
  const [shouldFetch, setShouldFetch] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => setShouldFetch(true), { timeout: 2000 });
    } else {
      setTimeout(() => setShouldFetch(true), 500);
    }
  }, []);

  const { data, error, isLoading } = useSWR<{
    summary: Record<string, AptTxSummary>;
    macroTrend: DongtanMacroTrendPoint[];
  }>(shouldFetch ? '/data/tx-summary.json' : null, fetcher, {
    revalidateOnFocus: true,
    revalidateIfStale: true,
    revalidateOnReconnect: true,
    dedupingInterval: 300000 // 5분 캐시로 단축하여 실거래 갱신 반영 보장
  });
  
  return {
    txSummary: data?.summary,
    macroTrend: data?.macroTrend,
    isLoading: !shouldFetch || isLoading,
    error
  };
}

export function useLocationScores() {
  const [shouldFetch, setShouldFetch] = useState(false);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => setShouldFetch(true), { timeout: 2000 });
    } else {
      setTimeout(() => setShouldFetch(true), 500);
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
