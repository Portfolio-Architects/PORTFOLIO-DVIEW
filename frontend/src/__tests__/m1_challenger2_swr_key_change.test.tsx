/**
 * @module m1_challenger2_swr_key_change.test
 * @description Empirical Challenger 2 Test Suite for SWR Deduplication & Key-Change Dynamics in useStaticData.ts
 * Verifies:
 * 1. SWR deduplication in usePeriodTransactions does not cause stale data issues when keys change across periods (90d, 1y, 3y, all).
 * 2. Rapid key switching returns correct dataset for each period and caches appropriately within dedupingInterval.
 * 3. Fallback data for 90d is never erroneously returned for other periods (1y, 3y, all).
 * 4. Deduplication behavior in useTxData and useLocationScores preserves cache consistency.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import {
  usePeriodTransactions,
  useTxData,
  useLocationScores,
} from '@/hooks/useStaticData';
import { staticDataService } from '@/lib/services/staticDataService';
import type { RecentTransaction, TimelinePeriod } from '@/types/transaction';

// Mock staticDataService.fetchJson
jest.mock('@/lib/services/staticDataService', () => {
  const actual = jest.requireActual('@/lib/services/staticDataService');
  return {
    ...actual,
    staticDataService: {
      ...actual.staticDataService,
      fetchJson: jest.fn(),
      fetchRecentTransactionsFromFirestore: jest.fn().mockResolvedValue([]),
    },
  };
});

const mockFetchJson = staticDataService.fetchJson as jest.MockedFunction<typeof staticDataService.fetchJson>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 300000 }}>
    {children}
  </SWRConfig>
);

describe('Empirical Challenger 2: useStaticData SWR Deduplication & Key Changes', () => {
  const mock90dData: RecentTransaction[] = [
    {
      aptName: '동탄역린스트라우스',
      dong: '오산동',
      contractDate: '2026-09-10',
      price: '11억',
      priceVal: 110000,
      area: 84.8,
      floor: 15,
      dealType: '중개거래',
    },
  ];

  const mock1yData = [
    {
      aptName: '동탄역반도유보라',
      dong: '오산동',
      contractDate: '2026-05-15',
      price: '9.5억',
      priceVal: 95000,
      area: 84.8,
      floor: 10,
      dealType: '중개거래',
    },
  ];

  const mock3yData = [
    {
      aptName: '동탄역시범우남퍼스트빌',
      dong: '청계동',
      contractDate: '2024-03-20',
      price: '8.2억',
      priceVal: 82000,
      area: 84.8,
      floor: 8,
      dealType: '중개거래',
    },
  ];

  const mockAllData = [
    {
      aptName: '동탄시범다은포스코',
      dong: '반송동',
      contractDate: '2015-11-10',
      price: '4.5억',
      priceVal: 45000,
      area: 84.8,
      floor: 5,
      dealType: '중개거래',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    mockFetchJson.mockImplementation(async (url: string) => {
      if (url.includes('recent-transactions.json')) return mock90dData as any;
      if (url.includes('transactions-1y.json')) return mock1yData as any;
      if (url.includes('transactions-3y.json')) return mock3yData as any;
      if (url.includes('transactions-all.json')) return mockAllData as any;
      if (url.includes('tx-summary.json')) return { summary: {} } as any;
      if (url.includes('macro-trend.json')) return [] as any;
      if (url.includes('location-scores.json')) return { 'apt-1': { score: 95 } } as any;
      return null as any;
    });
  });

  describe('1. Key Changes in usePeriodTransactions', () => {
    it('fetches fresh data when period key transitions from 90d to 1y without returning stale 90d data', async () => {
      const { result, rerender } = renderHook(
        ({ period }: { period: TimelinePeriod }) =>
          usePeriodTransactions(period, mock90dData),
        {
          initialProps: { period: '90d' },
          wrapper,
        }
      );

      // Initial state: 90d uses fallback
      expect(result.current.transactions).toEqual(mock90dData);

      // Transition key to 1y
      rerender({ period: '1y' });

      // Wait for SWR to resolve the new 1y key
      await waitFor(() => {
        expect(result.current.transactions.length).toBeGreaterThan(0);
      });

      // Assert: Data must be 1y data, NOT stale 90d data
      expect(result.current.transactions[0].aptName).toBe('동탄역반도유보라');
      expect(result.current.transactions[0].priceVal).toBe(95000);

      // Assert fetcher was invoked for 1y URL
      expect(mockFetchJson).toHaveBeenCalledWith(expect.stringContaining('transactions-1y.json'));
    });

    it('cycles through all period keys (90d -> 1y -> 3y -> all) and returns distinct accurate data per key', async () => {
      const { result, rerender } = renderHook(
        ({ period }: { period: TimelinePeriod }) =>
          usePeriodTransactions(period),
        {
          initialProps: { period: '90d' },
          wrapper,
        }
      );

      await waitFor(() => {
        expect(result.current.transactions.length).toBe(1);
      });
      expect(result.current.transactions[0].aptName).toBe('동탄역린스트라우스');

      // Switch to 1y
      rerender({ period: '1y' });
      await waitFor(() => {
        expect(result.current.transactions[0].aptName).toBe('동탄역반도유보라');
      });

      // Switch to 3y
      rerender({ period: '3y' });
      await waitFor(() => {
        expect(result.current.transactions[0].aptName).toBe('동탄역시범우남퍼스트빌');
      });

      // Switch to all
      rerender({ period: 'all' });
      await waitFor(() => {
        expect(result.current.transactions[0].aptName).toBe('동탄시범다은포스코');
      });

      // Switch back to 90d: should return cached 90d immediately without error
      rerender({ period: '90d' });
      await waitFor(() => {
        expect(result.current.transactions[0].aptName).toBe('동탄역린스트라우스');
      });
    });

    it('strictly does NOT apply 90d fallback data to 1y, 3y, or all periods', async () => {
      // Delay response for 1y to inspect intermediate state
      let resolvePromise: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockFetchJson.mockImplementation(async (url: string) => {
        if (url.includes('transactions-1y.json')) {
          return delayedPromise as any;
        }
        return mock90dData as any;
      });

      const { result, rerender } = renderHook(
        ({ period }: { period: TimelinePeriod }) =>
          usePeriodTransactions(period, mock90dData),
        {
          initialProps: { period: '90d' },
          wrapper,
        }
      );

      expect(result.current.transactions).toEqual(mock90dData);

      // Switch to 1y
      rerender({ period: '1y' });

      // While 1y is loading, it must NOT return the 90d fallback
      expect(result.current.transactions).toEqual([]);
      expect(result.current.isLoading).toBe(true);

      // Resolve 1y fetch
      await act(async () => {
        resolvePromise!(mock1yData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.transactions[0].aptName).toBe('동탄역반도유보라');
    });

    it('deduplicates calls within dedupingInterval when toggling rapidly between already fetched keys', async () => {
      const { result, rerender } = renderHook(
        ({ period }: { period: TimelinePeriod }) => usePeriodTransactions(period),
        {
          initialProps: { period: '90d' },
          wrapper,
        }
      );

      await waitFor(() => expect(result.current.transactions.length).toBe(1));
      const fetchCallsAfter90d = mockFetchJson.mock.calls.length;

      // Switch to 1y
      rerender({ period: '1y' });
      await waitFor(() => expect(result.current.transactions[0].aptName).toBe('동탄역반도유보라'));
      const fetchCallsAfter1y = mockFetchJson.mock.calls.length;
      expect(fetchCallsAfter1y).toBe(fetchCallsAfter90d + 1);

      // Toggle back to 90d immediately
      rerender({ period: '90d' });
      expect(result.current.transactions[0].aptName).toBe('동탄역린스트라우스');

      // Toggle back to 1y immediately
      rerender({ period: '1y' });
      expect(result.current.transactions[0].aptName).toBe('동탄역반도유보라');

      // Fetcher count must NOT increase because both keys are within dedupingInterval
      expect(mockFetchJson.mock.calls.length).toBe(fetchCallsAfter1y);
    });
  });

  describe('2. SWR Deduplication & Revalidation Controls in useTxData', () => {
    it('skips immediate fetch on mount when SSR fallbackData is provided', () => {
      const initialTxSummary = {
        'apt-1': {
          txCount: 5,
          avgPrice: 85000,
          latestPrice: 85000,
          highestPrice: 90000,
          lowestPrice: 80000,
          monthlyAvg: {},
        } as any,
      };

      const { result } = renderHook(
        () => useTxData(undefined, initialTxSummary, undefined, mock90dData),
        { wrapper }
      );

      expect(result.current.txSummary).toBeDefined();
      expect(result.current.recentTransactions).toEqual(mock90dData);

      // staticJsonFetcher for tx-summary and recent-transactions should NOT be called immediately due to revalidateOnMount: false
      const summaryCalls = mockFetchJson.mock.calls.filter((c) =>
        c[0].includes('tx-summary.json')
      );
      const recentCalls = mockFetchJson.mock.calls.filter((c) =>
        c[0].includes('recent-transactions.json')
      );

      expect(summaryCalls.length).toBe(0);
      expect(recentCalls.length).toBe(0);
    });
  });

  describe('3. useLocationScores Caching & Fallback Behavior', () => {
    it('serves fallbackData immediately and avoids redundant network requests', () => {
      const fallbackScores = {
        'apt-1': { name: '동탄역린스트라우스', overallScore: 92 } as any,
      };

      const { result } = renderHook(() => useLocationScores(fallbackScores), { wrapper });

      expect(result.current.locationScores).toEqual(fallbackScores);
      expect(result.current.isLoading).toBe(false);

      const locationCalls = mockFetchJson.mock.calls.filter((c) =>
        c[0].includes('location-scores.json')
      );
      expect(locationCalls.length).toBe(0);
    });
  });
});
