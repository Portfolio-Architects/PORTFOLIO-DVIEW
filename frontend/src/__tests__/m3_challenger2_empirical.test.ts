/**
 * @file m3_challenger2_empirical.test.ts
 * @description Empirical Challenger 2 Verification Suite for Milestone 3
 * Deep stress testing for staticDataService and apiClient:
 * - TTL expiration, in-memory hits, partitioned caches, and fallback resilience on network/Firestore outages
 * - Retry resilience (5xx vs 4xx vs network), exponential backoff, timeout aborts, external signal cancellation, typed ApiClientError extraction, and envelope unwrapping.
 */

import {
  staticDataService,
  formatPriceEok,
  parsePriceEokToMan,
  updateSaleAveragesWithNewTx,
  mergeTransactions,
  mergeRecentTransactions,
  computeRecent7DaysVolume,
  FirestoreTransaction,
} from '@/lib/services/staticDataService';
import { ApiClient, ApiClientError, apiClient } from '@/lib/api/apiClient';
import type { AptTxSummary, RecentTransaction, Recent7DaysVolume } from '@/types/transaction';
import * as firestoreModule from 'firebase/firestore';

// Mock Firebase Config to supply mock db
jest.mock('@/lib/firebaseConfig', () => ({
  db: { _isMockDb: true },
  auth: null,
  storage: null,
}));

// Mock Firestore getDocs and query
jest.mock('firebase/firestore', () => ({
  collection: jest.fn().mockReturnValue('transactions-ref'),
  query: jest.fn().mockReturnValue('transactions-query'),
  where: jest.fn().mockReturnValue('where-clause'),
  getDocs: jest.fn(),
}));

describe('Empirical Challenger 2: staticDataService & apiClient Deep Stress Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    staticDataService.clearCache();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // =========================================================================
  // SECTION 1: staticDataService Caching, TTL & Fallback Verification
  // =========================================================================
  describe('staticDataService: Caching, TTL & Fallback Behavior', () => {
    it('1.1 should cache Firestore transactions in-memory and avoid redundant network queries within 5-min TTL', async () => {
      const mockDocs = [
        {
          data: () => ({
            aptName: '목동14단지',
            dealType: '매매',
            contractYm: '202608',
            contractDay: '20',
            contractDate: '20260820',
            price: 160000,
            area: 84.5,
            floor: 10,
          }),
        },
      ];

      (firestoreModule.getDocs as jest.Mock).mockResolvedValue({
        forEach: (cb: (doc: any) => void) => mockDocs.forEach(cb),
      });

      // Call 1: fresh fetch from Firestore
      const firstResult = await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(firstResult.length).toBe(1);
      expect(firstResult[0].aptName).toBe('목동14단지');
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(1);

      // Call 2: should hit in-memory cache without calling getDocs again
      const secondResult = await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(secondResult.length).toBe(1);
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(1); // Call count unchanged!
    });

    it('1.2 should expire cache after TTL (5 minutes) and re-query Firestore', async () => {
      const mockDocs1 = [
        {
          data: () => ({
            aptName: '목동14단지',
            dealType: '매매',
            contractYm: '202608',
            contractDay: '10',
            price: 150000,
          }),
        },
      ];
      const mockDocs2 = [
        {
          data: () => ({
            aptName: '목동14단지',
            dealType: '매매',
            contractYm: '202608',
            contractDay: '21',
            price: 170000,
          }),
        },
      ];

      let callCount = 0;
      (firestoreModule.getDocs as jest.Mock).mockImplementation(() => {
        callCount++;
        const currentDocs = callCount === 1 ? mockDocs1 : mockDocs2;
        return Promise.resolve({
          forEach: (cb: (doc: any) => void) => currentDocs.forEach(cb),
        });
      });

      const initialTime = 1755800000000;
      jest.spyOn(Date, 'now').mockReturnValue(initialTime);

      // 1. Initial fetch at initialTime
      const res1 = await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(res1[0].price).toBe(150000);
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(1);

      // 2. Fetch at 4 minutes (240s) -> still cached
      jest.spyOn(Date, 'now').mockReturnValue(initialTime + 240000);
      const res2 = await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(res2[0].price).toBe(150000);
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(1);

      // 3. Fetch at 5 minutes + 1ms (300001ms) -> expired, re-queries
      jest.spyOn(Date, 'now').mockReturnValue(initialTime + 300001);
      const res3 = await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(res3[0].price).toBe(170000);
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(2);
    });

    it('1.3 should force refresh cache when forceRefresh=true even before TTL expires', async () => {
      (firestoreModule.getDocs as jest.Mock).mockResolvedValue({
        forEach: (cb: (doc: any) => void) => [
          {
            data: () => ({
              aptName: '신정현대',
              dealType: '매매',
              contractYm: '202608',
              contractDay: '15',
              price: 95000,
            }),
          },
        ].forEach(cb),
      });

      await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(1);

      // Force refresh
      await staticDataService.fetchRecentTransactionsFromFirestore(30, true);
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(2);
    });

    it('1.4 should partition cache by days parameter (e.g. 30 vs 60 days)', async () => {
      (firestoreModule.getDocs as jest.Mock).mockResolvedValue({
        forEach: (cb: (doc: any) => void) => [
          {
            data: () => ({
              aptName: '동탄역롯데캐슬',
              dealType: '매매',
              contractYm: '202608',
              contractDay: '19',
              price: 180000,
            }),
          },
        ].forEach(cb),
      });

      await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(1);

      // Fetching for 60 days should trigger a distinct query
      await staticDataService.fetchRecentTransactionsFromFirestore(60);
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(2);
    });

    it('1.5 should gracefully fallback to cached data when subsequent Firestore fetch throws error', async () => {
      // Step 1: Successful initial query
      (firestoreModule.getDocs as jest.Mock).mockResolvedValueOnce({
        forEach: (cb: (doc: any) => void) => [
          {
            data: () => ({
              aptName: '목동7단지',
              dealType: '매매',
              contractYm: '202608',
              contractDay: '10',
              price: 210000,
            }),
          },
        ].forEach(cb),
      });

      const initialTime = 1755800000000;
      jest.spyOn(Date, 'now').mockReturnValue(initialTime);
      const res1 = await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(res1.length).toBe(1);
      expect(res1[0].aptName).toBe('목동7단지');

      // Step 2: Time passes > 5min, next query encounters network crash
      jest.spyOn(Date, 'now').mockReturnValue(initialTime + 400000);
      (firestoreModule.getDocs as jest.Mock).mockRejectedValueOnce(new Error('Firestore network partition / UNAVAILABLE'));

      const fallbackRes = await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(fallbackRes.length).toBe(1);
      expect(fallbackRes[0].aptName).toBe('목동7단지'); // Preserved fallback data without throwing uncaught error!
    });

    it('1.6 should return empty array without crashing when initial Firestore fetch fails completely', async () => {
      (firestoreModule.getDocs as jest.Mock).mockRejectedValueOnce(new Error('Quota exceeded / PERMISSION_DENIED'));

      const result = await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(result).toEqual([]);
    });

    it('1.7 should sanitize and filter malformed records during Firestore schema validation', async () => {
      const corruptDocs = [
        {
          data: () => ({
            aptName: '', // Invalid empty aptName
            price: 100000,
          }),
        },
        {
          data: () => ({
            aptName: '올바른단지',
            contractYm: '202608',
            contractDay: '14',
            price: 'invalid-price', // invalid type, should catch to 0
          }),
        },
      ];

      (firestoreModule.getDocs as jest.Mock).mockResolvedValueOnce({
        forEach: (cb: (doc: any) => void) => corruptDocs.forEach(cb),
      });

      const result = await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(result.length).toBe(1);
      expect(result[0].aptName).toBe('올바른단지');
      expect(result[0].price).toBe(0); // Safely defaulted by Zod schema
    });

    it('1.8 should clear memoryCache completely on clearCache()', async () => {
      (firestoreModule.getDocs as jest.Mock).mockResolvedValue({
        forEach: (cb: (doc: any) => void) => [
          {
            data: () => ({
              aptName: '목동1단지',
              contractYm: '202608',
              contractDay: '05',
              price: 130000,
            }),
          },
        ].forEach(cb),
      });

      await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(1);

      staticDataService.clearCache();

      await staticDataService.fetchRecentTransactionsFromFirestore(30);
      expect(firestoreModule.getDocs).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // SECTION 2: staticDataService Static JSON Fetchers & Domain Calculations
  // =========================================================================
  describe('staticDataService: Static Fetchers & Domain Calculations', () => {
    it('2.1 should execute fetchJson with version query string and signal', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ summary: { '목동14단지': { latestPrice: 150000 } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const controller = new AbortController();
      const res = await staticDataService.fetchTxSummary('v2.5.0', controller.signal);
      expect(global.fetch).toHaveBeenCalledWith('/data/tx-summary.json?v=v2.5.0', {
        cache: 'no-store',
        signal: controller.signal,
      });
      expect(res.summary['목동14단지'].latestPrice).toBe(150000);
    });

    it('2.2 should throw HTTP error on non-200 static JSON response', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response('Service Unavailable', { status: 503 })
      );

      await expect(staticDataService.fetchRecentTransactions('v1.0')).rejects.toThrow('HTTP error! status: 503');
    });

    it('2.3 should parse complex Korean price strings and handle edge cases', () => {
      expect(parsePriceEokToMan('15억 5,000')).toBe(155000);
      expect(parsePriceEokToMan('10억 / 월 50만')).toBe(100000);
      expect(parsePriceEokToMan('3,500만')).toBe(3500);
      expect(parsePriceEokToMan('0')).toBe(0);
      expect(parsePriceEokToMan(null as any)).toBe(0);
      expect(parsePriceEokToMan(undefined as any)).toBe(0);
    });

    it('2.4 should accurately compute recent 7 days rolling volume trend and color coding', () => {
      const activeVolume: Recent7DaysVolume = {
        currentCount: 20,
        prevCount: 10,
        trendText: '상승 (+100.0%)',
        trendColor: '#ff4b5c',
        badge: '+10건 (+100%)',
      };

      const activeSummary: Record<string, AptTxSummary> = {
        '목동14단지': {
          latestDate: '20260810',
          latestPrice: 150000,
          latestPriceEok: '15억',
          latestArea: 84,
          latestFloor: 5,
          maxPrice: 150000,
          maxPriceEok: '15억',
          minPrice: 100000,
          minPriceEok: '10억',
          txCount: 10,
          recent: [],
        },
      };

      // Case: New transaction arriving AFTER latest static date
      const newTxs: FirestoreTransaction[] = [
        {
          aptName: '목동14단지',
          dealType: '매매',
          contractYm: '202608',
          contractDay: '15',
          contractDate: '20260815',
          price: 155000,
          deposit: 0,
          monthlyRent: 0,
          area: 84,
          areaPyeong: 25.5,
          floor: 6,
        },
      ];

      const res = computeRecent7DaysVolume(activeVolume, activeSummary, newTxs);
      expect(res?.currentCount).toBe(21);
      expect(res?.badge).toBe('+11건 (+110%)');
      expect(res?.trendColor).toBe('#ff4b5c');
    });

    it('2.5 should handle rent transactions with deposit conversion in mergeTransactions', () => {
      const staticSummary: Record<string, AptTxSummary> = {
        '목동14단지': {
          latestPrice: 150000,
          latestPriceEok: '15억',
          latestArea: 84,
          latestFloor: 5,
          latestDate: '20260801',
          maxPrice: 150000,
          maxPriceEok: '15억',
          minPrice: 100000,
          minPriceEok: '10억',
          txCount: 10,
          recent: [],
        },
      };

      // Monthly rent: 100만/월 with deposit 10,000만
      // Converted deposit = 10000 + round((100 * 12) / 0.055) = 10000 + 21818 = 31818
      const rentTx: FirestoreTransaction[] = [
        {
          aptName: '목동14단지',
          dealType: '월세',
          contractYm: '202608',
          contractDay: '12',
          contractDate: '20260812',
          price: 0,
          deposit: 10000,
          monthlyRent: 100,
          area: 84,
          areaPyeong: 25.5,
          floor: 4,
        },
      ];

      const merged = mergeTransactions(staticSummary, rentTx);
      expect(merged['목동14단지'].latestRentDate).toBe('20260812');
      expect(merged['목동14단지'].latestRentDeposit).toBe(31818);
      expect(merged['목동14단지'].latestRentMonthly).toBe(100);
      expect(merged['목동14단지'].rentTxCount).toBe(1);
    });
  });

  // =========================================================================
  // SECTION 3: apiClient Retry Resilience, Timeout & Error Extraction
  // =========================================================================
  describe('ApiClient: Retry Resilience, Timeout Aborts & Error Handling', () => {
    it('3.1 should retry on 500/502/503 server errors up to retries count with exponential backoff', async () => {
      let attempts = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: 'Server Error', code: 'GATEWAY_TIMEOUT' }), {
              status: 504,
              headers: { 'Content-Type': 'application/json' },
            })
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, recovered: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      const client = new ApiClient();
      const result = await client.get<{ success: boolean; recovered: boolean }>('/api/retry-test', {
        retries: 3,
        retryDelayMs: 10,
      });

      expect(attempts).toBe(3);
      expect(result.recovered).toBe(true);
    });

    it('3.2 should NOT retry on 4xx client errors (400, 401, 403, 404) and fail fast immediately', async () => {
      let attempts = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attempts++;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              error: 'BAD_REQUEST',
              code: 'BAD_REQUEST',
              message: '잘못된 요청 파라미터입니다.',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          )
        );
      });

      const client = new ApiClient();
      await expect(
        client.post('/api/validate', { foo: 'bar' }, { retries: 3, retryDelayMs: 10 })
      ).rejects.toThrow('잘못된 요청 파라미터입니다.');

      expect(attempts).toBe(1); // Failed immediately without wasteful retries!
    });

    it('3.3 should retry on transient network errors (fetch throw)', async () => {
      let attempts = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          return Promise.reject(new TypeError('Failed to fetch / DNS lookup failed'));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, connected: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      const client = new ApiClient();
      const res = await client.get<{ connected: boolean }>('/api/network-flaky', {
        retries: 2,
        retryDelayMs: 10,
      });

      expect(attempts).toBe(2);
      expect(res.connected).toBe(true);
    });

    it('3.4 should abort and throw ApiClientError when request exceeds timeoutMs', async () => {
      global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        });
      });

      const client = new ApiClient(30); // 30ms timeout

      try {
        await client.get('/api/hang');
        fail('Should have thrown timeout error');
      } catch (err: any) {
        expect(err instanceof ApiClientError).toBe(true);
        expect(err.status).toBe(408);
        expect(err.code).toBe('TIMEOUT');
        expect(err.isTimeout).toBe(true);
        expect(err.message).toContain('timed out after 30ms');
      }
    });

    it('3.5 should handle explicit external AbortSignal cancellation', async () => {
      const controller = new AbortController();

      global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        });
      });

      const client = new ApiClient(5000);
      const reqPromise = client.get('/api/cancel-target', { signal: controller.signal });

      controller.abort();

      try {
        await reqPromise;
        fail('Should have thrown abort error');
      } catch (err: any) {
        expect(err instanceof ApiClientError).toBe(true);
        expect(err.status).toBe(499);
        expect(err.code).toBe('ABORTED');
        expect(err.isAborted).toBe(true);
      }
    });

    it('3.6 should extract rich error details from standard ApiResponse envelope and preserve raw response', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: 'RATE_LIMIT_EXCEEDED',
            code: 'RATE_LIMIT_EXCEEDED',
            message: '요청 횟수 제한을 초과했습니다.',
            details: { retryAfter: 60 },
            meta: { timestamp: 1755800000000 },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const client = new ApiClient();
      try {
        await client.get('/api/rate-limited');
        fail('Should have thrown 429 ApiClientError');
      } catch (err: any) {
        expect(err instanceof ApiClientError).toBe(true);
        expect(err.status).toBe(429);
        expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(err.message).toBe('요청 횟수 제한을 초과했습니다.');
        expect(err.details).toEqual({ retryAfter: 60 });
        expect(err.rawResponse).toBeDefined();
      }
    });

    it('3.7 should handle plain text or non-JSON error responses gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response('502 Bad Gateway (Cloudflare)', {
          status: 502,
          statusText: 'Bad Gateway',
          headers: { 'Content-Type': 'text/plain' },
        })
      );

      const client = new ApiClient();
      try {
        await client.get('/api/nginx-down');
        fail('Should have thrown 502 error');
      } catch (err: any) {
        expect(err instanceof ApiClientError).toBe(true);
        expect(err.status).toBe(502);
        expect(err.rawResponse).toBe('502 Bad Gateway (Cloudflare)');
      }
    });

    it('3.8 should correctly format query params filtering null/undefined and preserving 0 and false', async () => {
      let requestedUrl = '';
      global.fetch = jest.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      });

      const client = new ApiClient();
      await client.get('/api/apartments', {
        params: {
          dong: '목동',
          page: 0,
          verified: false,
          empty: null,
          skipped: undefined,
        },
      });

      expect(requestedUrl).toBe('/api/apartments?dong=%EB%AA%A9%EB%8F%99&page=0&verified=false');
    });

    it('3.9 should support all HTTP methods (get, post, put, patch, delete, getEnvelope)', async () => {
      const methodsUsed: string[] = [];
      global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
        methodsUsed.push(init?.method || 'GET');
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, data: { status: 'ok' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      const client = new ApiClient();
      await client.get('/api/test');
      await client.post('/api/test', { a: 1 });
      await client.put('/api/test', { b: 2 });
      await client.patch('/api/test', { c: 3 });
      await client.delete('/api/test');
      const envRes = await client.getEnvelope('/api/test');

      expect(methodsUsed).toEqual(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'GET']);
      expect(envRes.success).toBe(true);
      expect(envRes.data).toEqual({ status: 'ok' });
    });

    it('3.10 should verify singleton export apiClient is pre-instantiated and operational', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, status: 'alive' }), { status: 200 })
      );

      const res = await apiClient.get<{ success: boolean; status: string }>('/api/health');
      expect(res.status).toBe('alive');
    });
  });
});
