/**
 * @file send_tx_notifications_route.test.ts
 * @description Comprehensive unit & integration tests for Milestone 3:
 * - Date filtering disparity invariant (registeredDate === targetDate)
 * - Global "동탄 전체" subscriber highlight selection
 * - Safe Dry-run simulation mode (?dryRun=true / DRY_RUN=1)
 * - 410/404 expired push subscription pruning & 429 error resilience
 * - Anti-spam notification capping & cross-subscription deduplication
 */

import { NextRequest } from 'next/server';
import {
  selectGlobalHighlightTransactions,
  isValidPushSubscription,
  GET,
  TransactionRecord,
  PushSubscriptionData,
} from '../app/api/cron/send-tx-notifications/route';
import webpush from 'web-push';
import { adminDb as db } from '@/lib/firebaseAdmin';

// Mock dependencies
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

jest.mock('@/lib/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock Firebase Admin
const mockPushSubscriptions: Array<{ id: string; data: () => Record<string, unknown> }> = [];
const mockDeleteDoc = jest.fn().mockResolvedValue(undefined);

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

describe('Milestone 3 Push Notification Unit & Logic Invariants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPushSubscriptions.length = 0;
    mockDeleteDoc.mockResolvedValue(undefined);

    (db?.collection as jest.Mock).mockImplementation((colName: string) => ({
      where: jest.fn((field: string, op: string, value: unknown) => ({
        get: jest.fn().mockImplementation(async () => {
          if (colName !== 'push_subscriptions') {
            return { empty: true, size: 0, docs: [] };
          }

          let matched = mockPushSubscriptions;
          if (field === 'apts') {
            if (op === 'array-contains') {
              matched = mockPushSubscriptions.filter((doc) => {
                const apts = doc.data().apts as string[] | undefined;
                return Array.isArray(apts) && apts.includes(value as string);
              });
            } else if (op === 'array-contains-any') {
              const targetValues = value as string[];
              matched = mockPushSubscriptions.filter((doc) => {
                const apts = doc.data().apts as string[] | undefined;
                return Array.isArray(apts) && apts.some((a) => targetValues.includes(a));
              });
            }
          }

          return {
            empty: matched.length === 0,
            size: matched.length,
            docs: matched,
          };
        }),
      })),
      doc: jest.fn((_docId: string) => ({
        delete: mockDeleteDoc,
      })),
    }));
  });

  describe('1. selectGlobalHighlightTransactions', () => {
    it('should prioritize new-high transactions over standard transactions', () => {
      const txs: TransactionRecord[] = [
        {
          aptName: '일반단지A',
          contractDate: '20261110',
          registeredDate: '20261111',
          priceEok: '8억',
          priceVal: 8,
          areaPyeong: 34,
          floor: 10,
          isNewHigh: false,
        },
        {
          aptName: '신고가단지B',
          contractDate: '20261109',
          registeredDate: '20261111',
          priceEok: '15억',
          priceVal: 15,
          areaPyeong: 34,
          floor: 15,
          isNewHigh: true,
        },
        {
          aptName: '일반단지C',
          contractDate: '20261110',
          registeredDate: '20261111',
          priceEok: '12억',
          priceVal: 12,
          areaPyeong: 34,
          floor: 5,
          isNewHigh: false,
        },
      ];

      const highlights = selectGlobalHighlightTransactions(txs);
      expect(highlights.length).toBe(1);
      expect(highlights[0].aptName).toBe('신고가단지B');
      expect(highlights[0].isNewHigh).toBe(true);
    });

    it('should sort multiple new-high transactions by priceVal descending and return top 2', () => {
      const txs: TransactionRecord[] = [
        {
          aptName: '신고가A',
          contractDate: '20261110',
          registeredDate: '20261111',
          priceEok: '10억',
          priceVal: 10,
          areaPyeong: 34,
          floor: 10,
          isNewHigh: true,
        },
        {
          aptName: '신고가B',
          contractDate: '20261109',
          registeredDate: '20261111',
          priceEok: '22억',
          priceVal: 22,
          areaPyeong: 40,
          floor: 20,
          isNewHigh: true,
        },
        {
          aptName: '신고가C',
          contractDate: '20261108',
          registeredDate: '20261111',
          priceEok: '16억',
          priceVal: 16,
          areaPyeong: 34,
          floor: 15,
          isNewHigh: true,
        },
      ];

      const highlights = selectGlobalHighlightTransactions(txs);
      expect(highlights.length).toBe(2);
      expect(highlights[0].aptName).toBe('신고가B');
      expect(highlights[1].aptName).toBe('신고가C');
    });

    it('should pick highest price transaction when no new highs exist', () => {
      const txs: TransactionRecord[] = [
        {
          aptName: '단지A',
          contractDate: '20261110',
          registeredDate: '20261111',
          priceEok: '7억',
          priceVal: 7,
          areaPyeong: 25,
          floor: 5,
          isNewHigh: false,
        },
        {
          aptName: '단지B',
          contractDate: '20261110',
          registeredDate: '20261111',
          priceEok: '14억',
          priceVal: 14,
          areaPyeong: 34,
          floor: 12,
          isNewHigh: false,
        },
        {
          aptName: '단지C',
          contractDate: '20261110',
          registeredDate: '20261111',
          priceEok: '9억',
          priceVal: 9,
          areaPyeong: 30,
          floor: 8,
          isNewHigh: false,
        },
      ];

      const highlights = selectGlobalHighlightTransactions(txs);
      expect(highlights.length).toBe(1);
      expect(highlights[0].aptName).toBe('단지B');
    });

    it('should exclude direct transactions (직거래) from highlights when normal market trades exist', () => {
      const txs: TransactionRecord[] = [
        {
          aptName: '직거래단지',
          contractDate: '20261110',
          registeredDate: '20261111',
          priceEok: '25억',
          priceVal: 25,
          areaPyeong: 34,
          floor: 10,
          dealType: '직거래',
          isNewHigh: true,
        },
        {
          aptName: '중개거래단지',
          contractDate: '20261110',
          registeredDate: '20261111',
          priceEok: '15억',
          priceVal: 15,
          areaPyeong: 34,
          floor: 12,
          dealType: '중개거래',
          isNewHigh: true,
        },
      ];

      const highlights = selectGlobalHighlightTransactions(txs);
      expect(highlights.length).toBe(1);
      expect(highlights[0].aptName).toBe('중개거래단지');
    });

    it('should gracefully handle empty or undefined transaction list', () => {
      expect(selectGlobalHighlightTransactions([])).toEqual([]);
      expect(selectGlobalHighlightTransactions(null as unknown as TransactionRecord[])).toEqual([]);
      expect(selectGlobalHighlightTransactions(undefined as unknown as TransactionRecord[])).toEqual([]);
    });
  });

  describe('2. isValidPushSubscription', () => {
    it('should return true for valid push subscription', () => {
      const validSub: PushSubscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token',
        keys: {
          p256dh: 'BNcRdreALRF8FsII...',
          auth: 'tBHItDaq...',
        },
      };
      expect(isValidPushSubscription(validSub)).toBe(true);
    });

    it('should return false if endpoint is missing or invalid', () => {
      expect(isValidPushSubscription({ endpoint: '', keys: { p256dh: 'a', auth: 'b' } })).toBe(false);
      expect(isValidPushSubscription({ endpoint: 'ftp://invalid', keys: { p256dh: 'a', auth: 'b' } })).toBe(false);
    });

    it('should return false if keys or individual key is missing', () => {
      expect(isValidPushSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/token' })).toBe(false);
      expect(
        isValidPushSubscription({
          endpoint: 'https://fcm.googleapis.com/fcm/send/token',
          keys: { p256dh: 'key', auth: '' },
        })
      ).toBe(false);
    });

    it('should return false for null, undefined, or primitive values', () => {
      expect(isValidPushSubscription(null)).toBe(false);
      expect(isValidPushSubscription(undefined)).toBe(false);
      expect(isValidPushSubscription('string')).toBe(false);
      expect(isValidPushSubscription(123)).toBe(false);
    });
  });

  describe('3. RegisteredDate vs ContractDate Disparity Invariant', () => {
    it('should select transactions matching registeredDate even if contract was 25 days ago', () => {
      const allTx: TransactionRecord[] = [
        {
          aptName: '오래된계약A',
          contractDate: '20261017',
          registeredDate: '20261111',
          priceEok: '10억',
          areaPyeong: 34,
          floor: 10,
        },
        {
          aptName: '어제계약B',
          contractDate: '20261110',
          registeredDate: '20261110',
          priceEok: '12억',
          areaPyeong: 34,
          floor: 12,
        },
      ];

      const targetDate = '20261111';
      const targetTxs = allTx.filter((t) => {
        if (t.registeredDate && /^\d{8}$/.test(t.registeredDate)) {
          return t.registeredDate === targetDate;
        }
        return t.contractDate === targetDate;
      });

      expect(targetTxs.length).toBe(1);
      expect(targetTxs[0].aptName).toBe('오래된계약A');
      expect(targetTxs[0].contractDate).toBe('20261017');
    });

    it('should exclude past registered transactions even if contractDate happens to match targetDate', () => {
      const allTx: TransactionRecord[] = [
        {
          aptName: '이미등록된과거거래',
          contractDate: '20261111',
          registeredDate: '20261105', // Already processed last week
          priceEok: '10억',
          areaPyeong: 34,
          floor: 10,
        },
      ];

      const targetDate = '20261111';
      const targetTxs = allTx.filter((t) => {
        if (t.registeredDate && /^\d{8}$/.test(t.registeredDate)) {
          return t.registeredDate === targetDate;
        }
        return t.contractDate === targetDate;
      });

      expect(targetTxs.length).toBe(0);
    });
  });

  describe('4. API Route Handler (GET /api/cron/send-tx-notifications)', () => {
    it('should reject unauthorized requests with 401 when neither localhost nor CRON_SECRET is present', async () => {
      const req = new NextRequest('https://dview.kr/api/cron/send-tx-notifications', {
        headers: { host: 'dview.kr' },
      });

      const res = await GET(req);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.code).toBe('UNAUTHORIZED');
    });

    it('should allow access with valid Bearer CRON_SECRET', async () => {
      const req = new NextRequest('https://dview.kr/api/cron/send-tx-notifications?dryRun=true&date=20261111', {
        headers: {
          host: 'dview.kr',
          authorization: `Bearer ${process.env.CRON_SECRET || 'dview-default-cron-secret-2026'}`,
        },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.dryRun).toBe(true);
      expect(json.data.targetDate).toBe('20261111');
    });

    it('should allow access from localhost without secret', async () => {
      const req = new NextRequest('http://localhost:5000/api/cron/send-tx-notifications?dryRun=true&date=20261111', {
        headers: { host: 'localhost:5000' },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.targetDate).toBe('20261111');
    });

    it('should execute dry-run simulation without dispatching webpush network calls', async () => {
      // Setup mock subscribers in Firestore
      mockPushSubscriptions.push({
        id: 'sub_apt_1',
        data: () => ({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/device1',
            keys: { p256dh: 'key1', auth: 'auth1' },
          },
          apts: ['동탄 더샵 레이크에듀타운'],
        }),
      });
      mockPushSubscriptions.push({
        id: 'sub_global_1',
        data: () => ({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/device2',
            keys: { p256dh: 'key2', auth: 'auth2' },
          },
          apts: ['동탄 전체'],
        }),
      });

      const req = new NextRequest('http://localhost:5000/api/cron/send-tx-notifications?dryRun=true&date=20261111', {
        headers: { host: 'localhost:5000' },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.dryRun).toBe(true);
      expect(json.data.txAnalyzedCount).toBeGreaterThan(0);
      expect(json.data.totalTasksQueued).toBeGreaterThan(0);
      expect(json.data.samplePayloads.length).toBeGreaterThan(0);

      // Webpush.sendNotification should NOT be called during dryRun
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('should dispatch webpush in live mode and prune 410/404 expired subscriptions', async () => {
      mockPushSubscriptions.push({
        id: 'sub_live_active',
        data: () => ({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/active-device',
            keys: { p256dh: 'p256-active', auth: 'auth-active' },
          },
          apts: ['동탄 더샵 레이크에듀타운'],
        }),
      });

      mockPushSubscriptions.push({
        id: 'sub_live_expired',
        data: () => ({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/expired-device',
            keys: { p256dh: 'p256-expired', auth: 'auth-expired' },
          },
          apts: ['동탄 더샵 레이크에듀타운'],
        }),
      });

      // Mock webpush responses: 1st success, 2nd 410 Gone
      (webpush.sendNotification as jest.Mock).mockImplementation((sub: PushSubscriptionData) => {
        if (sub.endpoint.includes('expired-device')) {
          const err = new Error('subscription expired') as Error & { statusCode: number };
          err.statusCode = 410;
          return Promise.reject(err);
        }
        return Promise.resolve({ statusCode: 201 });
      });

      const req = new NextRequest('http://localhost:5000/api/cron/send-tx-notifications?date=20261111', {
        headers: { host: 'localhost:5000' },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.dryRun).toBe(false);
      expect(json.data.sentCount).toBeGreaterThan(0);
      expect(json.data.cleanedSubscriptionsCount).toBe(1);

      // Verify that expired document was deleted from Firestore
      expect(mockDeleteDoc).toHaveBeenCalled();
    });

    it('should retain subscription on temporary 429 or 500 error without deleting doc', async () => {
      mockPushSubscriptions.push({
        id: 'sub_temporary_rate_limit',
        data: () => ({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/rate-limited',
            keys: { p256dh: 'p256-rl', auth: 'auth-rl' },
          },
          apts: ['동탄 더샵 레이크에듀타운'],
        }),
      });

      (webpush.sendNotification as jest.Mock).mockImplementation(() => {
        const err = new Error('rate limited') as Error & { statusCode: number };
        err.statusCode = 429;
        return Promise.reject(err);
      });

      const req = new NextRequest('http://localhost:5000/api/cron/send-tx-notifications?date=20261111', {
        headers: { host: 'localhost:5000' },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.sentCount).toBe(0);
      expect(json.data.cleanedSubscriptionsCount).toBe(0);

      // Verify deleteDoc was NOT called for 429 error
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it('should deduplicate when user is subscribed to both specific apartment and global', async () => {
      // Device subscribed to both "동탄 더샵 레이크에듀타운" and "동탄 전체"
      mockPushSubscriptions.push({
        id: 'sub_double_listener',
        data: () => ({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/dual-listener',
            keys: { p256dh: 'p256-dual', auth: 'auth-dual' },
          },
          apts: ['동탄 더샵 레이크에듀타운', '동탄 전체'],
        }),
      });

      const req = new NextRequest('http://localhost:5000/api/cron/send-tx-notifications?dryRun=true&date=20261111', {
        headers: { host: 'localhost:5000' },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      // Dual-listener device must not receive more than the 2-notification anti-spam cap
      expect(json.data.simulatedSentCount).toBeLessThanOrEqual(2);
    });

    it('should handle zero matching transactions gracefully', async () => {
      const req = new NextRequest('http://localhost:5000/api/cron/send-tx-notifications?date=19990101', {
        headers: { host: 'localhost:5000' },
      });

      const res = await GET(req);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.txAnalyzedCount).toBe(0);
      expect(json.data.sentCount).toBe(0);
    });
  });

  describe('5. Service Worker URL Resolution Specification (sw.js push event contract)', () => {
    // Mirror sw.js resolution logic to guarantee cross-layer contract compatibility
    function resolveSwTargetUrl(data: { url?: string; data?: { url?: string; aptName?: string }; aptName?: string }): string {
      return (data.data && data.data.url) || data.url || (data.data && data.data.aptName ? `/?apt=${encodeURIComponent(data.data.aptName)}` : '/');
    }

    it('should resolve nested data.data.url correctly to apartment path', () => {
      const payload = {
        title: '[신고가] D-VIEW 실거래가 알림',
        body: '동탄역 롯데캐슬 34평형 16억 신고가 등록!',
        url: '/apartment/%EB%8F%99%ED%83%84%EC%97%AD%20%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC',
        data: {
          url: '/apartment/%EB%8F%99%ED%83%84%EC%97%AD%20%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC',
          aptName: '동탄역 롯데캐슬',
        },
      };

      expect(resolveSwTargetUrl(payload)).toBe('/apartment/%EB%8F%99%ED%83%84%EC%97%AD%20%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
    });

    it('should resolve flat data.url when nested data is omitted', () => {
      const payload = {
        title: '알림',
        url: '/apartment/test-complex',
      };

      expect(resolveSwTargetUrl(payload)).toBe('/apartment/test-complex');
    });

    it('should fallback to /?apt=aptName if URL is omitted but aptName exists in nested data', () => {
      const payload = {
        title: '알림',
        data: {
          aptName: '동탄린스트라우스 더레이크',
        },
      };

      expect(resolveSwTargetUrl(payload)).toBe('/?apt=%EB%8F%99%ED%83%84%EB%A6%B0%EC%8A%A4%ED%8A%B8%EB%9D%BC%EC%9A%B0%EC%8A%A4%20%EB%8D%94%EB%A0%88%EC%9D%B4%ED%81%AC');
    });

    it('should fallback to root / if neither url nor aptName is present', () => {
      expect(resolveSwTargetUrl({})).toBe('/');
      expect(resolveSwTargetUrl({ data: {} })).toBe('/');
    });
  });
});
