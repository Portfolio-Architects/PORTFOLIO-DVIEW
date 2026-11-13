/**
 * @file challenger_m3_stress.test.ts
 * @description Adversarial Verification Suite for Milestone 3 (Push Notification Dispatch & SW Contract).
 * Authored by EMPIRICAL CHALLENGER (challenger_m3_1).
 *
 * Verifies:
 * 1. Date Filtering Disparity Invariant & Edge Dates (registeredDate vs contractDate)
 * 2. Global Subscriber ("동탄 전체") Deduplication & Anti-Spam Stress (100 subscribers)
 * 3. Dry-Run Security Isolation (Absolute zero network dispatch under dry-run flags)
 * 4. Service Worker Event Parsing & Navigation Contract
 */

import { NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import {
  selectGlobalHighlightTransactions,
  isValidPushSubscription,
  GET,
  TransactionRecord,
  PushSubscriptionData,
  PushSubscriptionDoc,
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

// In-memory Firestore mock store
interface MockDoc {
  id: string;
  data: () => PushSubscriptionDoc;
}

const mockSubStore: MockDoc[] = [];
const mockDeleteDoc = jest.fn();

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

const rawRecentDataPath = path.resolve(__dirname, '../../public/data/recent-transactions.json');
const realRecentTransactions: TransactionRecord[] = JSON.parse(fs.readFileSync(rawRecentDataPath, 'utf8'));
const latestRealRegDate =
  realRecentTransactions
    .map((t) => t.registeredDate)
    .filter((d): d is string => Boolean(d && /^\d{8}$/.test(d)))
    .sort()
    .pop() || '20261111';
const sampleRealAptName =
  realRecentTransactions.find((t) => t.registeredDate === latestRealRegDate && t.aptName)?.aptName ||
  '동탄 더샵 레이크에듀타운';

describe('CHALLENGER Milestone 3 Empirical Verification Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSubStore.length = 0;
    mockDeleteDoc.mockResolvedValue(undefined);

    (db?.collection as jest.Mock).mockImplementation((colName: string) => ({
      where: jest.fn((field: string, op: string, value: unknown) => ({
        get: jest.fn().mockImplementation(async () => {
          if (colName !== 'push_subscriptions') {
            return { empty: true, size: 0, docs: [] };
          }

          let matched = mockSubStore;
          if (field === 'apts') {
            if (op === 'array-contains') {
              matched = mockSubStore.filter((doc) => {
                const apts = doc.data().apts;
                return Array.isArray(apts) && apts.includes(value as string);
              });
            } else if (op === 'array-contains-any') {
              const targetValues = value as string[];
              matched = mockSubStore.filter((doc) => {
                const apts = doc.data().apts;
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

  // =========================================================================
  // 1. Date Filtering Disparity Stress
  // =========================================================================
  describe('1. Date Filtering Disparity Stress', () => {
    const realTransactions: TransactionRecord[] = realRecentTransactions;

    it('EMPIRICAL PROOF: registeredDate captures full MOLIT daily disclosure batch while contractDate misses prior-day signed contracts', () => {
      const targetDate = latestRealRegDate;

      // New filtering logic: evaluates registeredDate
      const registeredMatches = realTransactions.filter((t) => {
        if (t.registeredDate && /^\d{8}$/.test(t.registeredDate)) {
          return t.registeredDate === targetDate;
        }
        return t.contractDate === targetDate;
      });

      // Same-day signed AND disclosed on targetDate (almost always 0 due to D+1 ~ D+30 reporting lag)
      const sameDaySignedAndDisclosed = registeredMatches.filter((t) => t.contractDate === targetDate);
      const delayedDisclosures = registeredMatches.filter(
        (t) => Number(t.contractDate) < Number(t.registeredDate)
      );

      expect(registeredMatches.length).toBeGreaterThan(0);
      expect(delayedDisclosures.length).toBeGreaterThan(0);
      expect(registeredMatches.length).toBeGreaterThan(sameDaySignedAndDisclosed.length);

      // Verify every disclosed transaction on targetDate has registeredDate === targetDate and contractDate <= registeredDate
      for (const tx of registeredMatches) {
        expect(tx.registeredDate).toBe(targetDate);
        expect(Number(tx.contractDate)).toBeLessThanOrEqual(Number(tx.registeredDate));
      }
    });

    it('Edge dates: missing registeredDate falls back to contractDate correctly', () => {
      const mockList: TransactionRecord[] = [
        {
          aptName: '단지Legacy',
          contractDate: '20261111',
          registeredDate: undefined,
          priceEok: '10억',
          areaPyeong: 34,
          floor: 10,
        },
        {
          aptName: '단지Modern',
          contractDate: '20261020',
          registeredDate: '20261111',
          priceEok: '12억',
          areaPyeong: 34,
          floor: 8,
        },
        {
          aptName: '단지OtherDate',
          contractDate: '20261110',
          registeredDate: undefined,
          priceEok: '9억',
          areaPyeong: 25,
          floor: 5,
        },
      ];

      const targetDate = '20261111';
      const matched = mockList.filter((t) => {
        if (t.registeredDate && /^\d{8}$/.test(t.registeredDate)) {
          return t.registeredDate === targetDate;
        }
        return t.contractDate === targetDate;
      });

      expect(matched.length).toBe(2);
      expect(matched.map((m) => m.aptName)).toEqual(['단지Legacy', '단지Modern']);
    });

    it('Edge dates: malformed registeredDate values do not throw or falsely match', () => {
      const malformedList: TransactionRecord[] = [
        {
          aptName: '하이픈날짜',
          contractDate: '20261111',
          registeredDate: '2026-11-11', // Malformed format
          priceEok: '10억',
          areaPyeong: 34,
          floor: 5,
        },
        {
          aptName: '문자열날짜',
          contractDate: '20261110',
          registeredDate: 'INVALID_DATE',
          priceEok: '11억',
          areaPyeong: 34,
          floor: 6,
        },
        {
          aptName: '공백날짜',
          contractDate: '20261110',
          registeredDate: '',
          priceEok: '12억',
          areaPyeong: 34,
          floor: 7,
        },
      ];

      const targetDate = '20261111';
      const matched = malformedList.filter((t) => {
        if (t.registeredDate && /^\d{8}$/.test(t.registeredDate)) {
          return t.registeredDate === targetDate;
        }
        return t.contractDate === targetDate;
      });

      // '하이픈날짜' fails registeredDate regex, but its contractDate matches 20261111, so fallback matches it.
      // The other two fail both and are safely excluded.
      expect(matched.length).toBe(1);
      expect(matched[0].aptName).toBe('하이픈날짜');
    });

    it('Edge dates: year and month boundary dates filter accurately', () => {
      const boundaryList: TransactionRecord[] = [
        {
          aptName: '연말거래',
          contractDate: '20261220',
          registeredDate: '20261231',
          priceEok: '10억',
          areaPyeong: 34,
          floor: 5,
        },
        {
          aptName: '연초거래',
          contractDate: '20261230',
          registeredDate: '20270101',
          priceEok: '11억',
          areaPyeong: 34,
          floor: 6,
        },
        {
          aptName: '월초거래',
          contractDate: '20261025',
          registeredDate: '20261101',
          priceEok: '12억',
          areaPyeong: 34,
          floor: 7,
        },
      ];

      const filterBy = (date: string) =>
        boundaryList.filter((t) => {
          if (t.registeredDate && /^\d{8}$/.test(t.registeredDate)) {
            return t.registeredDate === date;
          }
          return t.contractDate === date;
        });

      expect(filterBy('20261231').map((m) => m.aptName)).toEqual(['연말거래']);
      expect(filterBy('20270101').map((m) => m.aptName)).toEqual(['연초거래']);
      expect(filterBy('20261101').map((m) => m.aptName)).toEqual(['월초거래']);
      expect(filterBy('20261102')).toEqual([]);
    });
  });

  // =========================================================================
  // 2. Global "동탄 전체" Subscriber Deduplication & Stress
  // =========================================================================
  describe('2. Global "동탄 전체" Subscriber Deduplication & Stress', () => {
    it('Dual-subscription deduplication: subscriber with both specific apartment and "동탄 전체" receives NO duplicates', async () => {
      const dualSubDoc: MockDoc = {
        id: 'device_dual_sub_1',
        data: () => ({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/dual-sub-token',
            keys: { p256dh: 'p256dh_dual', auth: 'auth_dual' },
          },
          apts: [sampleRealAptName, '동탄 전체'],
        }),
      };

      mockSubStore.push(dualSubDoc);

      const req = new NextRequest(`http://localhost:5000/api/cron/send-tx-notifications?dryRun=true&date=${latestRealRegDate}`, {
        headers: { host: 'localhost:5000' },
      });

      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      // Verify device was targeted
      expect(json.data.uniqueDevicesTargeted).toBe(1);

      // Due to MAX_NOTIFICATIONS_PER_DEVICE = 2, total tasks queued for this single device MUST be <= 2
      expect(json.data.totalTasksQueued).toBeLessThanOrEqual(2);
    });

    it('Global highlight selection prioritizes open market trades over direct trades (직거래)', () => {
      const txs: TransactionRecord[] = [
        {
          aptName: '직거래최고가단지',
          contractDate: '20261109',
          registeredDate: '20261111',
          priceEok: '30억',
          priceVal: 30,
          areaPyeong: 50,
          floor: 30,
          dealType: '직거래',
          isNewHigh: true,
        },
        {
          aptName: '중개거래정상단지',
          contractDate: '20261110',
          registeredDate: '20261111',
          priceEok: '18억',
          priceVal: 18,
          areaPyeong: 34,
          floor: 15,
          dealType: '중개거래',
          isNewHigh: true,
        },
      ];

      const highlights = selectGlobalHighlightTransactions(txs);
      expect(highlights.length).toBe(1);
      expect(highlights[0].aptName).toBe('중개거래정상단지');
    });

    it('High-volume subscriber simulation: 100 subscribers with varied subscriptions observe capping and deduplication invariants', async () => {
      // Create 100 mock subscribers:
      // - 40 for sampleRealAptName
      // - 30 for "동탄 전체"
      // - 20 for "동탄 전역"
      // - 10 dual subscribers (sampleRealAptName + "동탄 전체")
      for (let i = 1; i <= 40; i++) {
        mockSubStore.push({
          id: `sub_apt_only_${i}`,
          data: () => ({
            subscription: {
              endpoint: `https://fcm.googleapis.com/fcm/send/apt_only_${i}`,
              keys: { p256dh: `p256_${i}`, auth: `auth_${i}` },
            },
            apts: [sampleRealAptName],
          }),
        });
      }

      for (let i = 1; i <= 30; i++) {
        mockSubStore.push({
          id: `sub_global_all_${i}`,
          data: () => ({
            subscription: {
              endpoint: `https://fcm.googleapis.com/fcm/send/global_all_${i}`,
              keys: { p256dh: `p256_g_${i}`, auth: `auth_g_${i}` },
            },
            apts: ['동탄 전체'],
          }),
        });
      }

      for (let i = 1; i <= 20; i++) {
        mockSubStore.push({
          id: `sub_global_region_${i}`,
          data: () => ({
            subscription: {
              endpoint: `https://fcm.googleapis.com/fcm/send/global_region_${i}`,
              keys: { p256dh: `p256_r_${i}`, auth: `auth_r_${i}` },
            },
            apts: ['동탄 전역'],
          }),
        });
      }

      for (let i = 1; i <= 10; i++) {
        mockSubStore.push({
          id: `sub_dual_${i}`,
          data: () => ({
            subscription: {
              endpoint: `https://fcm.googleapis.com/fcm/send/dual_${i}`,
              keys: { p256dh: `p256_d_${i}`, auth: `auth_d_${i}` },
            },
            apts: [sampleRealAptName, '동탄 전체'],
          }),
        });
      }

      expect(mockSubStore.length).toBe(100);

      const req = new NextRequest(`http://localhost:5000/api/cron/send-tx-notifications?dryRun=true&date=${latestRealRegDate}`, {
        headers: { host: 'localhost:5000' },
      });

      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.dryRun).toBe(true);

      // Verify that all 100 devices were targeted
      expect(json.data.uniqueDevicesTargeted).toBe(100);

      // Verify anti-spam cap: at most 2 notifications per device -> total tasks <= 100 * 2 = 200
      expect(json.data.totalTasksQueued).toBeLessThanOrEqual(200);
      expect(json.data.totalTasksQueued).toBeGreaterThan(0);

      // Verify sample payloads conform to spec
      expect(json.data.samplePayloads.length).toBeLessThanOrEqual(5);
      for (const sample of json.data.samplePayloads) {
        expect(['apartment', 'global']).toContain(sample.recipientType);
        expect(sample.aptName).toBeTruthy();
        expect(sample.title).toMatch(/(\[.*\] D-VIEW|\[D-VIEW\])/);
        expect(sample.body.length).toBeGreaterThan(5);
      }
    });
  });

  // =========================================================================
  // 3. Dry-Run Security Isolation Oracle
  // =========================================================================
  describe('3. Dry-Run Security Isolation', () => {
    beforeEach(() => {
      // Add a test subscriber
      mockSubStore.push({
        id: 'sub_security_test',
        data: () => ({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/security-token',
            keys: { p256dh: 'p256_sec', auth: 'auth_sec' },
          },
          apts: [sampleRealAptName, '동탄 전체'],
        }),
      });
    });

    it('NEVER calls webpush.sendNotification when ?dryRun=true is passed', async () => {
      const req = new NextRequest(`http://localhost:5000/api/cron/send-tx-notifications?dryRun=true&date=${latestRealRegDate}`, {
        headers: { host: 'localhost:5000' },
      });

      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.dryRun).toBe(true);
      expect(webpush.sendNotification).not.toHaveBeenCalled();
      expect(mockDeleteDoc).not.toHaveBeenCalled();
    });

    it('NEVER calls webpush.sendNotification when DRY_RUN=1 environment variable is set', async () => {
      const prevEnv = process.env.DRY_RUN;
      process.env.DRY_RUN = '1';

      try {
        const req = new NextRequest(`http://localhost:5000/api/cron/send-tx-notifications?date=${latestRealRegDate}`, {
          headers: { host: 'localhost:5000' },
        });

        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.data.dryRun).toBe(true);
        expect(webpush.sendNotification).not.toHaveBeenCalled();
      } finally {
        process.env.DRY_RUN = prevEnv;
      }
    });

    it('Aliases ?dry_run=true and ?dryrun=true trigger dryRun safely', async () => {
      for (const query of ['dry_run=true', 'dryrun=true']) {
        jest.clearAllMocks();
        const req = new NextRequest(`http://localhost:5000/api/cron/send-tx-notifications?${query}&date=${latestRealRegDate}`, {
          headers: { host: 'localhost:5000' },
        });

        const res = await GET(req);
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.data.dryRun).toBe(true);
        expect(webpush.sendNotification).not.toHaveBeenCalled();
      }
    });
  });

  // =========================================================================
  // 4. Service Worker Push & Click Event Contract Stress
  // =========================================================================
  describe('4. Service Worker Push & Click Event Contract Stress', () => {
    // Pure function simulating sw.js push URL extraction
    function extractSwUrl(data: {
      url?: string;
      data?: { url?: string; aptName?: string };
      aptName?: string;
    }): string {
      return (
        (data.data && data.data.url) ||
        data.url ||
        (data.data && data.data.aptName ? `/?apt=${encodeURIComponent(data.data.aptName)}` : '/')
      );
    }

    it('Correctly extracts nested data.data.url', () => {
      const eventData = {
        title: '신고가 알림',
        url: '/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC',
        data: {
          url: '/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC',
          aptName: '동탄역롯데캐슬',
        },
      };

      expect(extractSwUrl(eventData)).toBe(
        '/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC'
      );
    });

    it('Correctly falls back to query url when nested url is missing', () => {
      const eventData = {
        title: '알림',
        data: {
          aptName: '동탄 포레너스',
        },
      };

      expect(extractSwUrl(eventData)).toBe('/?apt=%EB%8F%99%ED%83%84%20%ED%8F%AC%EB%A0%88%EB%84%88%EC%8A%A4');
    });

    it('Resolves absolute URL correctly against origin in notificationclick', () => {
      const origin = 'https://dview.kr';
      const relativeUrl = '/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%8D%94%EC%83%B5';
      const absoluteUrl = new URL(relativeUrl, origin).toString();

      expect(absoluteUrl).toBe('https://dview.kr/apartment/%EB%8F%99%ED%83%84%EC%97%AD%EB%8D%94%EC%83%B5');
    });
  });
});
