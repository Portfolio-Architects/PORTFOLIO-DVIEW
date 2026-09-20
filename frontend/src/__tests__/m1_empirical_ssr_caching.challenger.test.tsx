/**
 * @file m1_empirical_ssr_caching.challenger.test.tsx
 * @description Empirical Challenger Test Suite for Milestone M1 (Data Ingestion, SSR Payload & Caching Optimization).
 * 
 * Verifies:
 * 1. `dashboardData.ts` SSR output contains non-empty `typeMap` and `locationScores` when `fetchFreshData()` runs.
 * 2. In client hydration, `hasInitialTypeMap` is true so `/api/dashboard-init` is NOT requested.
 * 3. `fetchJson` caching behavior (versioned requests use `cache: 'default'`, unversioned use `cache: 'no-store'`).
 * 4. `useTxData` and `useLocationScores` SWR options eliminate mount revalidation when SSR fallbackData is present.
 * 5. `requestIdleCallback` fallback in `DashboardClient` executes without throwing across all browser and non-browser/SSR environments.
 */

import React from 'react';
import { render, act, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import fs from 'fs';

// Services & Hooks to verify
import { getInitialData, InitialPageDataWithScores } from '@/lib/services/dashboardData';
import { clearFileReaderCache, readJsonFileCached } from '@/lib/utils/server/fileReader';
import { staticDataService } from '@/lib/services/staticDataService';
import { useDashboardMeta } from '@/hooks/useDashboardMeta';
import { useTxData, useLocationScores } from '@/hooks/useStaticData';
import { preloadApartmentModal, preloadDashboardFeatures } from '@/components/common/preload';
import DashboardClient from '@/components/DashboardClient';

// Mock dependencies for DashboardClient rendering
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockPrefetch = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: mockPrefetch,
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    userProfile: null,
    anonProfile: null,
    handleLogin: jest.fn(),
    handleLogout: jest.fn(),
  }),
}));

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    triggerCustomA2HSModal: jest.fn(),
  }),
}));

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    favorites: [],
    toggleFavorite: jest.fn(),
    isFavorite: () => false,
  }),
}));

jest.mock('@/hooks/usePreloadApartmentTx', () => ({
  usePreloadApartmentTx: () => jest.fn(),
}));

jest.mock('@/components/MacroDashboardClient', () => {
  return function MockMacroDashboardClient() {
    return <div data-testid="mock-macro-dashboard-client">Macro Dashboard Mock</div>;
  };
});

jest.mock('@/components/LoungeHeader', () => {
  return function MockLoungeHeader() {
    return <header data-testid="mock-lounge-header">Header</header>;
  };
});

jest.mock('@/components/pwa/MobileDock', () => {
  return function MockMobileDock() {
    return <nav data-testid="mock-mobile-dock">Dock</nav>;
  };
});

jest.mock('@/components/PageHeroHeader', () => {
  return function MockPageHeroHeader() {
    return <div data-testid="mock-hero-header">Hero Header</div>;
  };
});

// Spy on common preloader functions
jest.mock('@/components/common/preload', () => {
  const actual = jest.requireActual('@/components/common/preload');
  return {
    ...actual,
    preloadApartmentModal: jest.fn(actual.preloadApartmentModal),
    preloadDashboardFeatures: jest.fn(actual.preloadDashboardFeatures),
  };
});

describe('M1 Empirical Challenger: SSR Payload, Hydration & Caching Verification', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    clearFileReaderCache();
    window.scrollTo = jest.fn();
    // Default safe fetch mock for unhandled background calls
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    // Clear in-memory singleton cache in dashboardData
    delete (globalThis as any)._initialPageDataCache;
    (globalThis as any)._activeFreshDataPromise = null;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    global.fetch = originalFetch;
  });

  // =========================================================================
  // 1. SSR Output Verification: typeMap & locationScores Hydration
  // =========================================================================
  describe('1. SSR Payload Integrity (dashboardData.ts & fileReader.ts)', () => {
    it('1.1 should include populated typeMap and locationScores in getInitialData() result', async () => {
      const ssrData = await getInitialData();

      // 1. typeMap assertion
      expect(ssrData.typeMap).toBeDefined();
      expect(Array.isArray(ssrData.typeMap)).toBe(true);
      expect(ssrData.typeMap.length).toBeGreaterThan(0);
      expect(ssrData.typeMap.length).toBeGreaterThanOrEqual(100); // Expect ~592 entries

      const sampleType = ssrData.typeMap[0];
      expect(sampleType).toHaveProperty('aptName');
      expect(sampleType).toHaveProperty('area');
      expect(sampleType).toHaveProperty('typeM2');
      expect(sampleType).toHaveProperty('typePyeong');
      expect(typeof sampleType.aptName).toBe('string');
      expect(sampleType.aptName.length).toBeGreaterThan(0);

      // 2. locationScores assertion
      expect(ssrData.locationScores).toBeDefined();
      expect(typeof ssrData.locationScores).toBe('object');
      const scoreKeys = Object.keys(ssrData.locationScores || {});
      expect(scoreKeys.length).toBeGreaterThan(0);
      expect(scoreKeys.length).toBeGreaterThanOrEqual(50); // Expect ~127 complexes

      const firstScoreKey = scoreKeys[0];
      const sampleScore = (ssrData.locationScores as Record<string, any>)[firstScoreKey];
      expect(sampleScore).toBeDefined();

      // 3. sheetApartments assertion
      expect(ssrData.sheetApartments).toBeDefined();
      expect(typeof ssrData.sheetApartments).toBe('object');
      const dongKeys = Object.keys(ssrData.sheetApartments || {});
      expect(dongKeys.length).toBeGreaterThan(0);

      // 4. apartmentMeta fallback derivation from apartmentsByDong
      expect(ssrData.apartmentMeta).toBeDefined();
      expect(Object.keys(ssrData.apartmentMeta).length).toBeGreaterThan(0);
    });

    it('1.2 should return in-memory cached instance on subsequent getInitialData() calls within TTL', async () => {
      const firstCall = await getInitialData();
      const secondCall = await getInitialData();

      // In-memory reference equality confirms no re-reading or recalculation
      expect(firstCall).toBe(secondCall);
    });

    it('1.3 should coalesce concurrent calls during cache miss into a single fetch promise', async () => {
      delete (globalThis as any)._initialPageDataCache;
      (globalThis as any)._activeFreshDataPromise = null;

      // Launch 5 concurrent calls simultaneously
      const promises = [
        getInitialData(),
        getInitialData(),
        getInitialData(),
        getInitialData(),
        getInitialData(),
      ];

      const results = await Promise.all(promises);
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBe(results[0]);
      }
    });

    it('1.4 should utilize in-memory Map cache in fileReader.ts without calling fs in production mode', async () => {
      process.env.NODE_ENV = 'production';
      clearFileReaderCache();

      const readFileSpy = jest.spyOn(fs.promises, 'readFile');

      // First read: reads from disk and populates cache
      const data1 = await readJsonFileCached<any>('public/data/macro-trend.json', []);
      expect(readFileSpy).toHaveBeenCalledTimes(1);

      // Second read: should hit memory cache immediately without calling readFile
      const data2 = await readJsonFileCached<any>('public/data/macro-trend.json', []);
      expect(readFileSpy).toHaveBeenCalledTimes(1);
      expect(data2).toBe(data1);

      readFileSpy.mockRestore();
    });
  });

  // =========================================================================
  // 2. Client Hydration & Double-Fetch Elimination
  // =========================================================================
  describe('2. Client Hydration: hasInitialTypeMap & /api/dashboard-init Elimination', () => {
    it('2.1 should set hasInitialTypeMap=true and skip /api/dashboard-init when SSR typeMap is present', async () => {
      const mockFetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      global.fetch = mockFetch;

      const mockSSRData: InitialPageDataWithScores = {
        favoriteCounts: {},
        typeMap: [
          { aptName: '동탄역반도유보라', area: 84, typeM2: '84A', typePyeong: '25평형' },
          { aptName: '동탄역시범우남퍼스트빌', area: 59, typeM2: '59B', typePyeong: '18평형' },
        ],
        apartmentMeta: {
          동탄역반도유보라: { dong: '청계동', txKey: '동탄역반도유보라', isPublicRental: false },
        },
        fieldReports: [],
        kpis: [] as any,
        macroTrend: [],
        txSummary: {},
        recentTransactions: [],
        sheetApartments: { 청계동: [{ name: '동탄역반도유보라', dong: '청계동' } as any] },
        locationScores: { 동탄역반도유보라: { overallScore: 92 } },
      };

      const { result } = renderHook(() => useDashboardMeta(mockSSRData));

      // Assert typeMap is immediately populated in client state
      expect(result.current.typeMap).toBeDefined();
      expect(result.current.typeMap['동탄역반도유보라']).toBeDefined();
      expect(result.current.typeMap['동탄역반도유보라']['84']).toEqual({
        typeM2: '84A',
        typePyeong: '25평형',
      });

      // Assert nameMapping and publicRentalSet are initialized from SSR apartmentMeta
      expect(result.current.nameMapping).toEqual({ 동탄역반도유보라: '동탄역반도유보라' });

      // Assert /api/dashboard-init was NEVER fetched via network
      const initCalls = mockFetch.mock.calls.filter((call) =>
        typeof call[0] === 'string' && call[0].includes('/api/dashboard-init')
      );
      expect(initCalls.length).toBe(0);
    });

    it('2.2 (Adversarial) should trigger /api/dashboard-init when SSR typeMap is empty or missing', async () => {
      const mockFetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              typeMap: [{ aptName: '동탄테스트단지', area: 84, typeM2: '84A', typePyeong: '25평' }],
              apartmentMeta: {},
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        )
      );
      global.fetch = mockFetch;

      const emptySSRData: InitialPageDataWithScores = {
        favoriteCounts: {},
        typeMap: [], // EMPTY
        apartmentMeta: {},
        fieldReports: [],
        kpis: [] as any,
        macroTrend: [],
        txSummary: {},
        recentTransactions: [],
      };

      let hookResult: any;
      await act(async () => {
        hookResult = renderHook(() => useDashboardMeta(emptySSRData));
        await new Promise((r) => setTimeout(r, 50));
      });

      // Without initial typeMap, /api/dashboard-init MUST be requested
      const initCalls = mockFetch.mock.calls.filter((call) =>
        typeof call[0] === 'string' && call[0].includes('/api/dashboard-init')
      );
      expect(initCalls.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 3. fetchJson & SWR Caching: Network Roundtrip Elimination
  // =========================================================================
  describe('3. fetchJson & SWR Mount Caching Verification', () => {
    it('3.1 should use cache: "default" for versioned URLs and cache: "no-store" for unversioned URLs', async () => {
      const mockFetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      global.fetch = mockFetch;

      // Versioned call (?v=)
      await staticDataService.fetchJson('/data/tx-summary.json?v=v2.0.0');
      expect(mockFetch).toHaveBeenLastCalledWith('/data/tx-summary.json?v=v2.0.0', {
        cache: 'default',
        signal: undefined,
      });

      // Versioned call (&v=)
      await staticDataService.fetchJson('/data/macro-trend.json?period=90d&v=v2.0.0');
      expect(mockFetch).toHaveBeenLastCalledWith('/data/macro-trend.json?period=90d&v=v2.0.0', {
        cache: 'default',
        signal: undefined,
      });

      // Unversioned call
      await staticDataService.fetchJson('/data/tx-summary.json');
      expect(mockFetch).toHaveBeenLastCalledWith('/data/tx-summary.json', {
        cache: 'no-store',
        signal: undefined,
      });
    });

    it('3.2 should disable revalidateOnMount and revalidateIfStale in useTxData when SSR fallbackData exists', async () => {
      const mockFetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      global.fetch = mockFetch;

      const fallbackSummary = {
        단지A: {
          latestPrice: 100000,
          latestPriceEok: '10억',
          latestArea: 84,
          latestFloor: 10,
          latestDate: '20260901',
          maxPrice: 110000,
          maxPriceEok: '11억',
          minPrice: 90000,
          minPriceEok: '9억',
          txCount: 15,
          recent: [],
        },
      };
      const fallbackRecent = [
        {
          aptName: '단지A',
          txKey: '단지A',
          date: '09.01',
          contractDate: '20260901',
          priceVal: 10,
          priceEok: '10억',
          area: 84,
          areaPyeong: 25,
          floor: 10,
          dealType: '매매',
        },
      ];

      // Note parameter ordering: (initialMacroTrend, initialTxSummary, initialRecent7DaysVolume, initialRecentTransactions)
      const { result } = renderHook(() =>
        useTxData(undefined, fallbackSummary as any, undefined, fallbackRecent as any)
      );

      // Verify merged summary and transactions are available immediately from fallbackData
      expect(result.current.txSummary).toBeDefined();
      expect(result.current.txSummary?.단지A?.latestPrice).toBe(100000);
      expect(result.current.recentTransactions?.length).toBe(1);

      // Verify NO network requests for tx-summary.json or recent-transactions.json were made
      const txRequests = mockFetch.mock.calls.filter((c) =>
        typeof c[0] === 'string' && (c[0].includes('tx-summary.json') || c[0].includes('recent-transactions.json'))
      );
      expect(txRequests.length).toBe(0);
    });

    it('3.3 should disable mount revalidation in useLocationScores when SSR fallbackData exists', async () => {
      const mockFetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );
      global.fetch = mockFetch;

      const fallbackScores = {
        단지A: { overallScore: 88, infra: 90, education: 85 } as any,
      };

      const { result } = renderHook(() => useLocationScores(fallbackScores));

      expect(result.current.locationScores).toBeDefined();
      expect(result.current.locationScores?.단지A?.overallScore).toBe(88);

      // Verify no network request for location-scores.json
      const scoreRequests = mockFetch.mock.calls.filter((c) =>
        typeof c[0] === 'string' && c[0].includes('location-scores.json')
      );
      expect(scoreRequests.length).toBe(0);
    });
  });

  // =========================================================================
  // 4. requestIdleCallback Fallback & SSR Resilience in DashboardClient
  // =========================================================================
  describe('4. requestIdleCallback Fallback & Preloader Resilience', () => {
    it('4.1 should schedule deferred chunks via requestIdleCallback when supported and cancel on unmount', () => {
      jest.useFakeTimers();

      const mockIdleCallback = jest.fn().mockReturnValue(999);
      const mockCancelIdleCallback = jest.fn();

      (window as any).requestIdleCallback = mockIdleCallback;
      (window as any).cancelIdleCallback = mockCancelIdleCallback;

      const mockData: InitialPageDataWithScores = {
        favoriteCounts: {},
        typeMap: [{ aptName: '테스트', area: 84, typeM2: '84', typePyeong: '25' }],
        apartmentMeta: {},
        fieldReports: [],
        kpis: [] as any,
        macroTrend: [],
        txSummary: {},
        recentTransactions: [],
        locationScores: {},
      };

      const { unmount } = render(<DashboardClient initialDashboardData={mockData} />);

      // Verify requestIdleCallback was scheduled with { timeout: 3000 } by DashboardClient
      const dashboardIdleCall = mockIdleCallback.mock.calls.find(
        (call) => call[1] && call[1].timeout === 3000
      );
      expect(dashboardIdleCall).toBeDefined();

      // Trigger the 3000ms idle callback manually
      const idleHandler = dashboardIdleCall![0];
      act(() => {
        idleHandler();
      });

      expect(preloadApartmentModal).toHaveBeenCalled();
      expect(preloadDashboardFeatures).toHaveBeenCalled();

      // Unmount component and verify cancelIdleCallback cleanup
      unmount();
      expect(mockCancelIdleCallback).toHaveBeenCalledWith(999);

      jest.useRealTimers();
      delete (window as any).requestIdleCallback;
      delete (window as any).cancelIdleCallback;
    });

    it('4.2 should fall back to setTimeout without throwing when requestIdleCallback is undefined', () => {
      jest.useFakeTimers();

      delete (window as any).requestIdleCallback;
      delete (window as any).cancelIdleCallback;

      const mockData: InitialPageDataWithScores = {
        favoriteCounts: {},
        typeMap: [{ aptName: '테스트', area: 84, typeM2: '84', typePyeong: '25' }],
        apartmentMeta: {},
        fieldReports: [],
        kpis: [] as any,
        macroTrend: [],
        txSummary: {},
        recentTransactions: [],
        locationScores: {},
      };

      const { unmount } = render(<DashboardClient initialDashboardData={mockData} />);

      // Advance timers by 3000ms to trigger the fallback setTimeout in DashboardClient
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      expect(preloadApartmentModal).toHaveBeenCalled();
      expect(preloadDashboardFeatures).toHaveBeenCalled();

      // Verify unmount completes cleanly
      expect(() => unmount()).not.toThrow();

      jest.useRealTimers();
    });

    it('4.3 should safely no-op in non-browser/SSR environment (window undefined)', () => {
      // Direct invocation of preload functions outside browser environment
      const originalWindow = global.window;
      try {
        delete (global as any).window;

        expect(() => {
          preloadApartmentModal();
          preloadDashboardFeatures();
        }).not.toThrow();
      } finally {
        global.window = originalWindow;
      }
    });
  });
});
