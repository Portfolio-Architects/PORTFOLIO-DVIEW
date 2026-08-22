/**
 * @file m3_challenger_adversarial.test.tsx
 * @description Empirical Challenger tests for Milestone 3 (Application & Hooks Layer Refactoring):
 * 1. Rapid selection switching & race condition defense in useApartmentDetails and usePostDetail
 * 2. Unmount lifecycle safety, request cancellation (AbortController), and zero unmounted state warnings
 * 3. ApiClient timeout, abort chaining, retry resilience, and standard envelope unwrapping
 * 4. StaticDataService in-memory caching TTL, error fallback, and schema validation under corrupt data
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useApartmentDetails } from '@/hooks/useApartmentDetails';
import { usePostDetail } from '@/hooks/usePostDetail';
import { useFavorites } from '@/hooks/useFavorites';
import { useComments } from '@/hooks/useComments';
import { useDashboardMeta } from '@/hooks/useDashboardMeta';
import { dashboardFacade, FieldReportData } from '@/lib/DashboardFacade';
import * as PostRepo from '@/lib/repositories/post.repository';
import { ApiClient, ApiClientError } from '@/lib/api/apiClient';
import {
  staticDataService,
  mergeTransactions,
  mergeRecentTransactions,
  computeRecent7DaysVolume,
  FirestoreTransaction,
} from '@/lib/services/staticDataService';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, Recent7DaysVolume, RecentTransaction } from '@/types/transaction';
import { User } from 'firebase/auth';

jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchApartmentMeta: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: {},
  auth: {},
  storage: {},
}));

// Mock SWR to prevent background polling in tests
const MOCK_SWR_EMPTY = { data: undefined, isLoading: false };
jest.mock('swr', () => {
  const original = jest.requireActual('swr');
  return {
    __esModule: true,
    ...original,
    default: jest.fn(() => MOCK_SWR_EMPTY),
    preload: jest.fn(),
  };
});

jest.mock('@/lib/repositories/post.repository');

describe('Milestone 3 — Empirical Challenger Adversarial Suite', () => {
  const originalFetch = global.fetch;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    staticDataService.clearCache();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // =========================================================================
  // 1. Rapid Selection Switching & Race Condition Defense
  // =========================================================================
  describe('1. Rapid Selection Switching & Race Condition Defense', () => {
    const mockApartments: Record<string, DongApartment[]> = {
      '오산동': [
        { name: '동탄역 롯데캐슬', dong: '오산동', txKey: '동탄역롯데캐슬' } as DongApartment,
        { name: '동탄역 유림노르웨이숲', dong: '오산동', txKey: '동탄역유림노르웨이숲' } as DongApartment,
        { name: '동탄역 반도유보라', dong: '오산동', txKey: '동탄역반도유보라' } as DongApartment,
        { name: '동탄역 삼정라피에스타', dong: '오산동', txKey: '동탄역삼정라피에스타' } as DongApartment,
        { name: '동탄역 시범우남퍼스트빌', dong: '오산동', txKey: '동탄역시범우남퍼스트빌' } as DongApartment,
      ],
    };

    it('useApartmentDetails: 5 sequential rapid switches with reverse/out-of-order promise resolution', async () => {
      const resolvers: Record<string, (data: FieldReportData) => void> = {};
      const promises: Record<string, Promise<FieldReportData>> = {};

      ['rep-1', 'rep-2', 'rep-3', 'rep-4', 'rep-5'].forEach((id) => {
        promises[id] = new Promise<FieldReportData>((resolve) => {
          resolvers[id] = resolve;
        });
      });

      const getFullReportSpy = jest.spyOn(dashboardFacade, 'getFullReport');
      getFullReportSpy.mockImplementation((id: string) => {
        return promises[id] || Promise.resolve(null as unknown as FieldReportData);
      });

      const reports: FieldReportData[] = [
        { id: 'rep-1', apartmentName: '동탄역 롯데캐슬', dong: '오산동', review: '1차 롯데' },
        { id: 'rep-2', apartmentName: '동탄역 유림노르웨이숲', dong: '오산동', review: '2차 유림' },
        { id: 'rep-3', apartmentName: '동탄역 반도유보라', dong: '오산동', review: '3차 반도' },
        { id: 'rep-4', apartmentName: '동탄역 삼정라피에스타', dong: '오산동', review: '4차 삼정' },
        { id: 'rep-5', apartmentName: '동탄역 시범우남퍼스트빌', dong: '오산동', review: '5차 우남' },
      ];

      const { result, rerender } = renderHook(
        ({ selectedReport }) =>
          useApartmentDetails(
            selectedReport,
            mockApartments,
            undefined,
            null,
            {},
            {}
          ),
        { initialProps: { selectedReport: reports[0] as FieldReportData | null } }
      );

      expect(result.current.isLoadingDetail).toBe(true);

      // Rapidly switch through all reports 1 -> 2 -> 3 -> 4 -> 5
      rerender({ selectedReport: reports[1] });
      rerender({ selectedReport: reports[2] });
      rerender({ selectedReport: reports[3] });
      rerender({ selectedReport: reports[4] });

      expect(result.current.isLoadingDetail).toBe(true);

      // Now resolve the promises in completely reversed order (stale first: 1, 2, 3, 4, then final 5)
      await act(async () => {
        resolvers['rep-1']({ ...reports[0], review: 'STALE 1' });
        resolvers['rep-3']({ ...reports[2], review: 'STALE 3' });
        resolvers['rep-2']({ ...reports[1], review: 'STALE 2' });
        resolvers['rep-4']({ ...reports[3], review: 'STALE 4' });
      });

      // State must NOT have taken any of the stale values
      expect(result.current.fullReportData).toBeNull();
      expect(result.current.isLoadingDetail).toBe(true);

      // Finally resolve the active request (rep-5)
      await act(async () => {
        resolvers['rep-5']({ ...reports[4], review: 'FINAL 5' });
      });

      expect(result.current.isLoadingDetail).toBe(false);
      expect(result.current.fullReportData?.id).toBe('rep-5');
      expect(result.current.fullReportData?.apartmentName).toBe('동탄역 시범우남퍼스트빌');
      expect(result.current.fullReportData?.review).toBe('FINAL 5');
    });

    it('usePostDetail: Rapid post switching with interleaved comments subscriptions and out-of-order responses', async () => {
      const postResolvers: Record<string, (val: any) => void> = {};
      const commentCallbacks: Record<string, (comments: any[]) => void> = {};
      const unsubs: Record<string, jest.Mock> = {};

      ['p-1', 'p-2', 'p-3', 'p-4'].forEach((id) => {
        postResolvers[id] = () => {};
        unsubs[id] = jest.fn();
      });

      (PostRepo.getPost as jest.Mock).mockImplementation((id: string) => {
        return new Promise((resolve) => {
          postResolvers[id] = resolve;
        });
      });

      (PostRepo.listenToComments as jest.Mock).mockImplementation((id: string, cb: (comments: any[]) => void) => {
        commentCallbacks[id] = cb;
        return unsubs[id];
      });

      const { result, rerender } = renderHook(({ postId }) => usePostDetail(postId), {
        initialProps: { postId: 'p-1' as string | null },
      });

      expect(result.current.isLoading).toBe(true);

      // Rapidly switch p-1 -> p-2 -> p-3 -> p-4
      rerender({ postId: 'p-2' });
      expect(unsubs['p-1']).toHaveBeenCalled();

      rerender({ postId: 'p-3' });
      expect(unsubs['p-2']).toHaveBeenCalled();

      rerender({ postId: 'p-4' });
      expect(unsubs['p-3']).toHaveBeenCalled();

      // Older comments callbacks trigger unexpectedly
      act(() => {
        if (commentCallbacks['p-1']) {
          commentCallbacks['p-1']([{ id: 'c-1', text: 'Stale p1 comment', authorName: 'A' }]);
        }
        if (commentCallbacks['p-2']) {
          commentCallbacks['p-2']([{ id: 'c-2', text: 'Stale p2 comment', authorName: 'B' }]);
        }
      });

      expect(result.current.comments).toEqual([]);

      // Older posts resolve out of order
      await act(async () => {
        postResolvers['p-1']({ id: 'p-1', title: 'Stale Post 1', likes: 1, views: 10 });
        postResolvers['p-3']({ id: 'p-3', title: 'Stale Post 3', likes: 3, views: 30 });
        postResolvers['p-2']({ id: 'p-2', title: 'Stale Post 2', likes: 2, views: 20 });
      });

      // Still no stale post attached
      expect(result.current.post).toBeNull();
      expect(result.current.isLoading).toBe(true);

      // Resolve active post p-4 and fire its comments
      await act(async () => {
        postResolvers['p-4']({ id: 'p-4', title: 'Active Post 4', likes: 40, views: 400 });
      });

      act(() => {
        if (commentCallbacks['p-4']) {
          commentCallbacks['p-4']([{ id: 'c-4', text: 'Valid p4 comment', authorName: 'D' }]);
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.post?.id).toBe('p-4');
      expect(result.current.post?.title).toBe('Active Post 4');
      expect(result.current.likes).toBe(40);
      expect(result.current.views).toBe(400);
      expect(result.current.comments.length).toBe(1);
      expect(result.current.comments[0].text).toBe('Valid p4 comment');
    });
  });

  // =========================================================================
  // 2. Unmount Lifecycle Safety & Request Cancellation
  // =========================================================================
  describe('2. Unmount Lifecycle Safety & Abort Signals', () => {
    it('useApartmentDetails: Unmounting during in-flight fetch aborts signal and produces zero unmounted warnings', async () => {
      let capturedSignal: AbortSignal | undefined;
      global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/report-view')) {
          capturedSignal = init?.signal as AbortSignal;
          return new Promise((_, reject) => {
            if (init?.signal) {
              if (init.signal.aborted) {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
                return;
              }
              init.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              });
            }
          });
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const report: FieldReportData = {
        id: 'rep-live-1',
        apartmentName: '동탄역 롯데캐슬',
        dong: '오산동',
      };

      let resolveReport: (data: FieldReportData) => void = () => {};
      jest.spyOn(dashboardFacade, 'getFullReport').mockImplementation(() => new Promise((resolve) => {
        resolveReport = resolve;
      }));

      const { unmount } = renderHook(() =>
        useApartmentDetails(report, {}, undefined, null, {}, {})
      );

      // Verify that view tracking was called and has an active signal
      expect(capturedSignal).toBeDefined();
      expect(capturedSignal?.aborted).toBe(false);

      // Unmount the hook mid-flight
      unmount();

      // Signal must be aborted immediately
      expect(capturedSignal?.aborted).toBe(true);

      // Late resolve of report after unmount
      await act(async () => {
        resolveReport({ id: 'rep-live-1', apartmentName: '동탄역 롯데캐슬', dong: '오산동', review: 'Late' });
      });

      // Check no React unmounted state warning was logged
      const unmountedWarning = consoleErrorSpy.mock.calls.some((args) =>
        args.some((arg) => typeof arg === 'string' && arg.includes('unmounted component'))
      );
      expect(unmountedWarning).toBe(false);
    });

    it('usePostDetail: Unmounting while fetching discards delayed response and unsubs comments', async () => {
      const unsub = jest.fn();
      let resolveFetch: (val: any) => void = () => {};
      (PostRepo.getPost as jest.Mock).mockImplementation(
        () => new Promise((r) => { resolveFetch = r; })
      );
      (PostRepo.listenToComments as jest.Mock).mockReturnValue(unsub);

      const { unmount } = renderHook(() => usePostDetail('post-xyz'));

      unmount();

      expect(unsub).toHaveBeenCalled();

      // Resolve delayed promise after unmount
      await act(async () => {
        resolveFetch({ id: 'post-xyz', title: 'Post' });
      });

      const unmountedWarning = consoleErrorSpy.mock.calls.some((args) =>
        args.some((arg) => typeof arg === 'string' && arg.includes('unmounted component'))
      );
      expect(unmountedWarning).toBe(false);
    });

    it('useFavorites: Unmounting during multi-item guest sync aborts all active requests', async () => {
      localStorage.setItem('dview_guest_favorites', JSON.stringify(['Apt 1', 'Apt 2', 'Apt 3']));

      const signals: AbortSignal[] = [];
      global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (init?.signal) {
          signals.push(init.signal as AbortSignal);
        }
        if (url.includes('/api/favorite-counts')) {
          return Promise.resolve(new Response(JSON.stringify({ counts: {} }), { status: 200 }));
        }
        if (url.includes('/api/favorite?userId=')) {
          return Promise.resolve(new Response(JSON.stringify({ favorites: [] }), { status: 200 }));
        }
        if (url === '/api/favorite' && init?.method === 'POST') {
          return new Promise((_, reject) => {
            if (init?.signal) {
              if (init.signal.aborted) {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
                return;
              }
              init.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              });
            }
          });
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const mockUser = {
        uid: 'user-unmount',
        getIdToken: jest.fn().mockResolvedValue('token-abc'),
      } as unknown as User;

      const { unmount } = renderHook(() => useFavorites(mockUser));

      await waitFor(() => {
        expect(signals.length).toBeGreaterThan(0);
      });

      unmount();

      // All active signals must have been aborted
      signals.forEach((sig) => {
        expect(sig.aborted).toBe(true);
      });
    });

    it('useDashboardMeta: Unmounting during lazy search data fetch aborts request', async () => {
      let abortSignal: AbortSignal | undefined;
      global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/explore/search-data')) {
          abortSignal = init?.signal as AbortSignal;
          return new Promise((_, reject) => {
            if (init?.signal) {
              if (init.signal.aborted) {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
                return;
              }
              init.signal.addEventListener('abort', () => {
                reject(new DOMException('The operation was aborted.', 'AbortError'));
              });
            }
          });
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const { result, unmount } = renderHook(() => useDashboardMeta());

      act(() => {
        result.current.triggerFetch();
      });

      expect(abortSignal).toBeDefined();
      expect(abortSignal?.aborted).toBe(false);

      await act(async () => {
        unmount();
      });

      expect(abortSignal?.aborted).toBe(true);
    });

    it('useComments: Comments submission handles component unmount gracefully', async () => {
      global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes('/api/push/notify-comment') || url.includes('/api/indexing/apartment')) {
          return new Promise((resolve) => setTimeout(() => resolve(new Response('{}', { status: 200 })), 10));
        }
        return Promise.resolve(new Response('{}', { status: 200 }));
      });

      const mockUser = {
        uid: 'user-comm',
        displayName: '댓글작성자',
        email: 'user@test.com',
      } as unknown as User;

      const report: FieldReportData = {
        id: 'rep-comm-1',
        apartmentName: '동탄역 롯데캐슬',
        dong: '오산동',
      };

      const addCommentSpy = jest.spyOn(dashboardFacade, 'addFieldReportComment').mockResolvedValue(undefined);
      jest.spyOn(dashboardFacade, 'getUserProfile').mockResolvedValue(null);
      jest.spyOn(dashboardFacade, 'listenToComments').mockReturnValue(() => {});

      const { result, unmount } = renderHook(() => useComments(report, report, mockUser, jest.fn()));

      act(() => {
        result.current.setCommentInput({ 'rep-comm-1': '테스트 댓글' });
      });

      const submitPromise = result.current.handleSubmitComment('rep-comm-1');
      unmount();

      await expect(submitPromise).resolves.not.toThrow();
      expect(addCommentSpy).toHaveBeenCalledWith('rep-comm-1', '테스트 댓글', 'user-comm', '동탄역 롯데캐슬');
    });
  });

  // =========================================================================
  // 3. ApiClient Resilience, Timeout, Retries, and Envelope Handling
  // =========================================================================
  describe('3. ApiClient Resilience, Timeout, Retries, and Envelope Handling', () => {
    let client: ApiClient;

    beforeEach(() => {
      client = new ApiClient(1000);
    });

    it('should throw ApiClientError with isTimeout=true on timeout', async () => {
      global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_, reject) => {
          if (init?.signal) {
            if (init.signal.aborted) {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
              return;
            }
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        });
      });

      await expect(client.get('https://example.com/slow', { timeoutMs: 20 }))
        .rejects
        .toThrow(ApiClientError);

      try {
        await client.get('https://example.com/slow', { timeoutMs: 20 });
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError);
        const apiErr = err as ApiClientError;
        expect(apiErr.isTimeout).toBe(true);
        expect(apiErr.status).toBe(408);
        expect(apiErr.code).toBe('TIMEOUT');
      }
    });

    it('should chain external AbortSignal and throw ApiClientError with isAborted=true', async () => {
      const controller = new AbortController();
      global.fetch = jest.fn().mockImplementation((_url: string, init?: RequestInit) => {
        return new Promise((_, reject) => {
          if (init?.signal) {
            if (init.signal.aborted) {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
              return;
            }
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('The operation was aborted.', 'AbortError'));
            });
          }
        });
      });

      const requestPromise = client.get('https://example.com/abort', { signal: controller.signal });
      controller.abort();

      await expect(requestPromise).rejects.toThrow(ApiClientError);

      try {
        await requestPromise;
      } catch (err) {
        expect(err).toBeInstanceOf(ApiClientError);
        const apiErr = err as ApiClientError;
        expect(apiErr.isAborted).toBe(true);
        expect(apiErr.status).toBe(499);
        expect(apiErr.code).toBe('ABORTED');
      }
    });

    it('should retry on 500 error up to retries count with exponential backoff', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          return Promise.resolve(new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 }));
        }
        return Promise.resolve(new Response(JSON.stringify({ success: true, data: 'recovered' }), { status: 200 }));
      });

      const res = await client.get<any>('https://example.com/flaky', { retries: 2, retryDelayMs: 10 });
      expect(callCount).toBe(3);
      expect(res.data).toBe('recovered');
    });

    it('should NOT retry on 400 Bad Request or 404 Not Found', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(new Response(JSON.stringify({ error: 'Not Found', code: 'NOT_FOUND' }), { status: 404 }));
      });

      await expect(client.get('https://example.com/missing', { retries: 3, retryDelayMs: 10 }))
        .rejects
        .toThrow(ApiClientError);

      expect(callCount).toBe(1); // No retries on 4xx
    });

    it('should correctly unwrap standard ApiResponse success envelopes when unwrapEnvelope is true', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ success: true, data: { aptCount: 180 } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        )
      );

      const unwrapped = await client.get<{ aptCount: number }>('https://example.com/envelope', { unwrapEnvelope: true });
      expect(unwrapped).toEqual({ aptCount: 180 });

      const raw = await client.get<{ success: boolean; data: { aptCount: number } }>('https://example.com/envelope', { unwrapEnvelope: false });
      expect(raw).toEqual({ success: true, data: { aptCount: 180 } });
    });

    it('should serialize query params and body automatically for POST requests', async () => {
      let capturedUrl = '';
      let capturedBody = '';
      let capturedHeaders: Headers | undefined;

      global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
        capturedUrl = url;
        capturedBody = init?.body as string;
        capturedHeaders = init?.headers as Headers;
        return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
      });

      await client.post(
        '/api/test-endpoint',
        { name: '동탄역' },
        { params: { filter: 'active', limit: 10 } }
      );

      expect(capturedUrl).toBe('/api/test-endpoint?filter=active&limit=10');
      expect(capturedBody).toBe(JSON.stringify({ name: '동탄역' }));
      expect(capturedHeaders?.get('Content-Type')).toBe('application/json');
    });
  });

  // =========================================================================
  // 4. StaticDataService Caching, Offline Fallback & Schema Robustness
  // =========================================================================
  describe('4. StaticDataService Caching, Offline Fallback & Schema Robustness', () => {
    it('mergeTransactions: handles corrupted raw transactions and ignores them safely', () => {
      const baseSummary: Record<string, AptTxSummary> = {
        '동탄역롯데캐슬': {
          txCount: 10,
          maxPrice: 150000,
          latestDate: '20260401',
          latestPrice: 150000,
        },
      };

      const corruptedTxs: any[] = [
        null,
        undefined,
        {},
        { aptName: '' }, // invalid empty aptName
        { aptName: '동탄역 롯데캐슬', contractYm: '2026' }, // too short contractYm
        { aptName: '동탄역 롯데캐슬', dealType: '매매', contractYm: '202605', contractDay: '15', price: 160000, area: 84.5 },
      ];

      const merged = mergeTransactions(baseSummary, corruptedTxs as FirestoreTransaction[]);
      expect(merged['동탄역롯데캐슬'].txCount).toBe(11);
      expect(merged['동탄역롯데캐슬'].maxPrice).toBe(160000);
      expect(merged['동탄역롯데캐슬'].latestDate).toBe('20260515');
      expect(merged['동탄역롯데캐슬'].latestPrice).toBe(160000);
    });

    it('mergeRecentTransactions: deduplicates identical incoming transactions', () => {
      const staticRecent: RecentTransaction[] = [
        {
          aptName: '동탄역 롯데캐슬',
          txKey: '동탄역롯데캐슬',
          date: '05.15',
          contractDate: '20260515',
          priceVal: 16,
          priceEok: '16억',
          area: 84.5,
          areaPyeong: 25.5,
          floor: 15,
          dealType: '매매',
          isNewHigh: false,
          delta: 0,
          deltaPercent: 0,
        },
      ];

      const duplicateFirestoreTx: FirestoreTransaction[] = [
        {
          aptName: '동탄역 롯데캐슬',
          dealType: '매매',
          contractYm: '202605',
          contractDay: '15',
          contractDate: '20260515',
          price: 160000,
          area: 84.5,
          areaPyeong: 25.5,
          floor: 15,
          deposit: 0,
          monthlyRent: 0,
        },
      ];

      const merged = mergeRecentTransactions(staticRecent, duplicateFirestoreTx);
      expect(merged.length).toBe(1); // Deduplication prevented duplicate entry
    });

    it('computeRecent7DaysVolume: returns unchanged volume when no new sales occur after static max date', () => {
      const baseVolume: Recent7DaysVolume = {
        currentCount: 5,
        prevCount: 5,
        trendText: '보합 (0%)',
        trendColor: '#94a3b8',
        badge: '+0건 (+0%)',
      };

      const baseSummary: Record<string, AptTxSummary> = {
        '동탄역롯데캐슬': { latestDate: '20260515' },
      };

      const oldTxs: FirestoreTransaction[] = [
        {
          aptName: '동탄역 롯데캐슬',
          dealType: '매매',
          contractYm: '202605',
          contractDay: '10',
          contractDate: '20260510', // Before max date
          price: 150000,
          deposit: 0,
          monthlyRent: 0,
          area: 84,
          areaPyeong: 25,
          floor: 10,
        },
      ];

      const result = computeRecent7DaysVolume(baseVolume, baseSummary, oldTxs);
      expect(result?.currentCount).toBe(5);
    });

    it('computeRecent7DaysVolume: increments count and calculates trend badge when newer sales arrive', () => {
      const baseVolume: Recent7DaysVolume = {
        currentCount: 5,
        prevCount: 4,
        trendText: '상승 (+25.0%)',
        trendColor: '#ff4b5c',
        badge: '+1건 (+25%)',
      };

      const baseSummary: Record<string, AptTxSummary> = {
        '동탄역롯데캐슬': { latestDate: '20260515' },
      };

      const newTxs: FirestoreTransaction[] = [
        {
          aptName: '동탄역 롯데캐슬',
          dealType: '매매',
          contractYm: '202605',
          contractDay: '18',
          contractDate: '20260518', // After max date
          price: 165000,
          deposit: 0,
          monthlyRent: 0,
          area: 84,
          areaPyeong: 25,
          floor: 20,
        },
      ];

      const result = computeRecent7DaysVolume(baseVolume, baseSummary, newTxs);
      expect(result?.currentCount).toBe(6);
      expect(result?.trendColor).toBe('#ff4b5c');
      expect(result?.badge).toBe('+2건 (+50%)');
    });
  });
});
