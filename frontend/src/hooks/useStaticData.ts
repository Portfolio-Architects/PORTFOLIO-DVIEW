import useSWR from 'swr';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/lib/types/transaction';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useTxData() {
  const { data, error, isLoading } = useSWR<{
    summary: Record<string, AptTxSummary>;
    macroTrend: DongtanMacroTrendPoint[];
  }>('/data/tx-summary.json', fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
    dedupingInterval: 3600000 // 1 hour cache
  });
  
  return {
    txSummary: data?.summary,
    macroTrend: data?.macroTrend,
    isLoading,
    error
  };
}

export function useLocationScores() {
  const { data, error, isLoading } = useSWR<Record<string, any>>('/data/location-scores.json', fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    revalidateOnReconnect: false,
    dedupingInterval: 3600000 // 1 hour cache
  });
  
  return {
    locationScores: data,
    isLoading,
    error
  };
}
