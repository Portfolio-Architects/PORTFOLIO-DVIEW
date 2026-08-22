/**
 * @module useTechnoValleyData
 * @description Hook for fetching Dongtan TechnoValley industrial metrics, growth trends,
 * and knowledge industry center (지식산업센터) status with typed envelope parsing and cancellation safety.
 * Architecture Layer: Application / Hooks (`src/hooks/`)
 */

import useSWR from 'swr';
import { apiClient } from '@/lib/api/apiClient';
import type { JisanStatusItem, JisanStatusResponse, TrendRecord } from '@/types/technovalley';

const fetcher = <T>(url: string): Promise<T> => apiClient.get<T>(url);

export interface TechnoValleyDistributionItem {
  name: string;
  count: number;
  color: string;
  [key: string]: unknown;
}

export interface UseTechnoValleyDataReturn {
  distributionData?: TechnoValleyDistributionItem[];
  trendData?: TrendRecord[];
  jisanStatus?: JisanStatusResponse;
  isLoading: boolean;
  isTrendLoading: boolean;
  error?: unknown;
}

export function useTechnoValleyData(): UseTechnoValleyDataReturn {
  const {
    data: distributionRes,
    error: distributionError,
    isLoading: isDistLoading,
  } = useSWR<{ success?: boolean; data?: TechnoValleyDistributionItem[] } | TechnoValleyDistributionItem[]>(
    '/api/technovalley/industry-distribution',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  const {
    data: trendRes,
    error: trendError,
    isLoading: isTrendLoading,
  } = useSWR<{ success?: boolean; data?: TrendRecord[] } | TrendRecord[]>(
    '/api/technovalley/trend',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  const {
    data: jisanRes,
    error: jisanError,
    isLoading: isJisanLoading,
  } = useSWR<JisanStatusResponse>(
    '/api/technovalley/jisan-status',
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  const distributionData =
    distributionRes && typeof distributionRes === 'object' && 'data' in distributionRes && Array.isArray(distributionRes.data)
      ? distributionRes.data
      : Array.isArray(distributionRes)
      ? distributionRes
      : undefined;

  const trendData =
    trendRes && typeof trendRes === 'object' && 'data' in trendRes && Array.isArray(trendRes.data)
      ? trendRes.data
      : Array.isArray(trendRes)
      ? trendRes
      : undefined;

  return {
    distributionData,
    trendData,
    jisanStatus: jisanRes,
    isLoading: isDistLoading || isTrendLoading || isJisanLoading,
    isTrendLoading,
    error: distributionError || trendError || jisanError,
  };
}

export type { JisanStatusItem, JisanStatusResponse, TrendRecord };
