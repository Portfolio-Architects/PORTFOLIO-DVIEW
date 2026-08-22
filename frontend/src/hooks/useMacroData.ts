/**
 * @module useMacroData
 * @description Hook for fetching Dongtan macroeconomic trends, price indices,
 * and transaction volume data with typed envelope parsing and cancellation safety.
 * Architecture Layer: Application / Hooks (`src/hooks/`)
 */

import useSWR from 'swr';
import type { DongtanMacroTrendPoint } from '@/types/transaction';
import { BUILD_VERSION } from '@/lib/build-version';
import { staticDataService } from '@/lib/services/staticDataService';

export interface UseMacroDataReturn {
  macroTrend?: DongtanMacroTrendPoint[];
  isLoading: boolean;
  error?: unknown;
}

export function useMacroData(initialData?: DongtanMacroTrendPoint[]): UseMacroDataReturn {
  const { data, error, isLoading } = useSWR<DongtanMacroTrendPoint[]>(
    `/data/macro-trend.json?v=${BUILD_VERSION}`,
    (url: string) => staticDataService.fetchJson<DongtanMacroTrendPoint[]>(url),
    {
      fallbackData: initialData,
      revalidateOnFocus: false,
      revalidateIfStale: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000,
    }
  );

  return {
    macroTrend: data || initialData,
    isLoading: isLoading && !initialData,
    error,
  };
}
