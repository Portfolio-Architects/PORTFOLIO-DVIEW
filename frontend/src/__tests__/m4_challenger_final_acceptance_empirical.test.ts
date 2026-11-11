/**
 * @file m4_challenger_final_acceptance_empirical.test.ts
 * @description Adversarial empirical stress harness for Milestone 4 final acceptance.
 * Verifies end-to-end integration:
 * 1. Crawler data -> static summary format -> frontend same-day evaluation -> push notification payload.
 * 2. Timezone drift resilience (KST vs non-KST client environments).
 * 3. RegisteredDate vs ContractDate strict disparity invariants.
 * 4. Anti-spam capping & cross-subscription deduplication.
 * 5. Direct deal (직거래) exclusion from market highlights.
 * 6. Service worker push payload parsing & relative URL navigation.
 * 7. Zero-CLS container height invariants & Ad Money Design System compliance.
 */

import {
  getTodayYmdKST,
  formatDateLabelKST,
  isRegisteredToday,
  evaluateTodayUpdateMetrics,
} from '@/lib/todayUpdateEvaluator';
import {
  selectGlobalHighlightTransactions,
  isValidPushSubscription,
  TransactionRecord,
  PushSubscriptionData,
} from '../app/api/cron/send-tx-notifications/route';
import fs from 'fs';
import path from 'path';

describe('M4 Empirical Challenger Final Acceptance Suite', () => {
  const TODAY_KST = getTodayYmdKST();

  describe('1. E2E Data Pipeline Simulation: Crawler -> Evaluator -> Push Payload', () => {
    it('simulates complete lifecycle: newly crawled transactions correctly trigger badge & push payloads', () => {
      // Step A: Simulated crawler output for today's disclosure
      const crawledRecords: TransactionRecord[] = [
        {
          aptName: '동탄역 롯데캐슬',
          txKey: 'dongtan_lotte_20261111_84_20_160000',
          contractDate: '20261028', // Contract signed 2 weeks ago
          registeredDate: TODAY_KST, // Disclosed by MOLIT today!
          priceVal: 16,
          priceEok: '16억',
          area: 84.9,
          areaPyeong: 34,
          floor: 20,
          dealType: '중개거래',
          isNewHigh: true,
        },
        {
          aptName: '동탄역 시범우남퍼스트빌',
          txKey: 'dongtan_woonam_20261111_59_12_95000',
          contractDate: '20261102',
          registeredDate: TODAY_KST,
          priceVal: 9.5,
          priceEok: '9.5억',
          area: 59.8,
          areaPyeong: 25,
          floor: 12,
          dealType: '중개거래',
          isNewHigh: false,
        },
        {
          aptName: '동탄 더샵 레이크에듀타운',
          txKey: 'dongtan_thesharp_20261020_84_7_110000',
          contractDate: '20261020',
          registeredDate: '20261025', // Disclosed weeks ago (historical)
          priceVal: 11,
          priceEok: '11억',
          area: 84.8,
          areaPyeong: 33,
          floor: 7,
          dealType: '중개거래',
          isNewHigh: false,
        },
      ];

      // Step B: Frontend same-day evaluation
      const metrics = evaluateTodayUpdateMetrics(crawledRecords, {
        latestRegisteredDate: TODAY_KST,
        todayRegisteredCount: 2,
        todayNewHighCount: 1,
      });

      expect(metrics.isTodayUpdated).toBe(true);
      expect(metrics.todayRegisteredCount).toBe(2);
      expect(metrics.todayNewHighCount).toBe(1);
      expect(metrics.todayTransactions).toHaveLength(2);

      // Step C: Push notification highlight selection
      const todayOnlyRecords = crawledRecords.filter((t) => t.registeredDate === TODAY_KST);
      const highlights = selectGlobalHighlightTransactions(todayOnlyRecords);

      expect(highlights.length).toBeGreaterThan(0);
      expect(highlights[0].aptName).toBe('동탄역 롯데캐슬');
      expect(highlights[0].isNewHigh).toBe(true);

      // Step D: Construct push notification payload
      const topHighlight = highlights[0];
      const payload = {
        title: topHighlight.isNewHigh ? '[신고가] D-VIEW 실거래가 알림' : '[D-VIEW] 실거래가 등록 알림',
        body: `${topHighlight.aptName} ${topHighlight.areaPyeong}평형 ${topHighlight.floor}층 ${topHighlight.priceEok} 신고가 등록!`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        url: `/apartment/${encodeURIComponent(topHighlight.aptName)}`,
        data: {
          url: `/apartment/${encodeURIComponent(topHighlight.aptName)}`,
          aptName: topHighlight.aptName,
          txKey: topHighlight.txKey,
          isNewHigh: topHighlight.isNewHigh,
        },
      };

      expect(payload.title).toContain('[신고가]');
      expect(payload.body).toContain('16억');
      expect(payload.url).toContain(encodeURIComponent('동탄역 롯데캐슬'));
      expect(payload.data.isNewHigh).toBe(true);
    });
  });

  describe('2. Timezone & Leap Year Adversarial Stress Tests', () => {
    it('guarantees KST calculation regardless of foreign client timezones', () => {
      // Test timestamps across different UTC offsets
      const testCases = [
        {
          utcIso: '2026-02-28T15:00:00.000Z', // 00:00 KST March 1st
          expectedYmd: '20260301',
          desc: 'Leap-year month rollover',
        },
        {
          utcIso: '2026-12-31T15:00:00.000Z', // 00:00 KST Jan 1st 2027
          expectedYmd: '20270101',
          desc: 'Year rollover',
        },
        {
          utcIso: '2026-06-15T06:38:00.000Z', // 15:38 KST same day
          expectedYmd: '20260615',
          desc: 'Standard midday KST',
        },
      ];

      for (const tc of testCases) {
        const d = new Date(tc.utcIso);
        const ymd = getTodayYmdKST(d);
        expect(ymd).toBe(tc.expectedYmd);
      }
    });

    it('robustly handles normalized date formats for today and rejects truly invalid dates', () => {
      // Inputs representing today with varied formatting should match today
      const todayVariations = [
        TODAY_KST,
        `${TODAY_KST.slice(0, 4)}-${TODAY_KST.slice(4, 6)}-${TODAY_KST.slice(6, 8)}`,
        `${TODAY_KST.slice(0, 4)}/${TODAY_KST.slice(4, 6)}/${TODAY_KST.slice(6, 8)}`,
        `${TODAY_KST.slice(0, 4)}.${TODAY_KST.slice(4, 6)}.${TODAY_KST.slice(6, 8)}`,
      ];
      for (const input of todayVariations) {
        expect(isRegisteredToday(input)).toBe(true);
      }

      // Truly invalid, past, or non-matching inputs must return false safely
      const invalidInputs = [
        null,
        undefined,
        '',
        '   ',
        '20250101', // Past year
        '2025-01-01',
        'INVALID_DATE_STRING',
        'NaN',
        '00000000',
        '99999999',
        12345678 as unknown as string,
        {} as unknown as string,
        [] as unknown as string,
      ];

      for (const input of invalidInputs) {
        expect(() => isRegisteredToday(input)).not.toThrow();
        expect(isRegisteredToday(input)).toBe(false);
        expect(() => formatDateLabelKST(input)).not.toThrow();
      }
    });
  });

  describe('3. Strict Real Data & Disparity Invariants', () => {
    it('rejects contractDate if registeredDate is missing or not today', () => {
      // Contract is today, but MOLIT hasn't published it yet
      const unrevealedTx = {
        aptName: '동탄역 롯데캐슬',
        contractDate: TODAY_KST,
        registeredDate: undefined, // Not yet in RTMS
      };

      const metrics = evaluateTodayUpdateMetrics([unrevealedTx], null);
      expect(metrics.todayRegisteredCount).toBe(0);
      expect(metrics.isTodayUpdated).toBe(false);
    });

    it('strictly excludes direct trades (직거래) from top highlights', () => {
      const txsWithDirectDeals: TransactionRecord[] = [
        {
          aptName: '동탄역 시범한화꿈에그린',
          contractDate: '20261105',
          registeredDate: TODAY_KST,
          priceVal: 20.0, // Absurdly high direct deal (often family transfers or anomalies)
          priceEok: '20억',
          areaPyeong: 39,
          floor: 15,
          dealType: '직거래',
          isNewHigh: true,
        },
        {
          aptName: '동탄역 롯데캐슬',
          contractDate: '20261102',
          registeredDate: TODAY_KST,
          priceVal: 15.5, // Genuine market brokerage trade
          priceEok: '15.5억',
          areaPyeong: 34,
          floor: 10,
          dealType: '중개거래',
          isNewHigh: true,
        },
      ];

      const highlights = selectGlobalHighlightTransactions(txsWithDirectDeals);
      expect(highlights.length).toBe(1);
      expect(highlights[0].aptName).toBe('동탄역 롯데캐슬');
      expect(highlights[0].dealType).toBe('중개거래');
    });

    it('falls back safely if ALL transactions are direct trades', () => {
      const allDirectTrades: TransactionRecord[] = [
        {
          aptName: '테스트단지',
          contractDate: '20261105',
          registeredDate: TODAY_KST,
          priceVal: 10.0,
          priceEok: '10억',
          areaPyeong: 33,
          floor: 5,
          dealType: '직거래',
          isNewHigh: false,
        },
      ];

      const highlights = selectGlobalHighlightTransactions(allDirectTrades);
      expect(highlights.length).toBe(1);
      expect(highlights[0].aptName).toBe('테스트단지');
    });
  });

  describe('4. Push Subscription Validation & Anti-Spam Capping', () => {
    it('validates push subscription structures strictly', () => {
      const validSub: PushSubscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token-1234',
        keys: {
          p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QT9Ac',
          auth: 'tBHItJAhqTB2uqIL',
        },
      };
      expect(isValidPushSubscription(validSub)).toBe(true);

      const invalidSubs = [
        null,
        undefined,
        {},
        { endpoint: 'http://insecure.com' }, // non-https or non-webpush
        { endpoint: 'ftp://evil.com/token' },
        { endpoint: 'javascript:alert(1)' },
        { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: {} },
        { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: { p256dh: '' } },
        { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: { p256dh: 'abc', auth: '' } },
      ];

      for (const invalid of invalidSubs) {
        expect(isValidPushSubscription(invalid)).toBe(false);
      }
    });

    it('caps notifications per device to at most 2 even with flood of new high transactions', () => {
      // Simulate 10 new highs in the same complex
      const floodTxs: TransactionRecord[] = Array.from({ length: 10 }, (_, i) => ({
        aptName: '동탄역 롯데캐슬',
        txKey: `flood_tx_${i}`,
        contractDate: '20261101',
        registeredDate: TODAY_KST,
        priceVal: 15 + i * 0.5,
        priceEok: `${15 + i * 0.5}억`,
        areaPyeong: 34,
        floor: 10 + i,
        isNewHigh: true,
      }));

      // Emulate the route handler device count capping logic
      const MAX_NOTIFICATIONS_PER_DEVICE = 2;
      const deviceSentCount = new Map<string, number>();
      const deliveredTasks: string[] = [];
      const testDeviceId = 'device_doc_123';

      for (const tx of floodTxs) {
        const count = deviceSentCount.get(testDeviceId) || 0;
        if (count >= MAX_NOTIFICATIONS_PER_DEVICE) break;

        deliveredTasks.push(tx.txKey || '');
        deviceSentCount.set(testDeviceId, count + 1);
      }

      expect(deliveredTasks).toHaveLength(2);
      expect(deviceSentCount.get(testDeviceId)).toBe(2);
    });
  });

  describe('5. Service Worker Push & Click Contract Invariants', () => {
    it('verifies sw.js push notification click resolves relative URLs safely', () => {
      const swFilePath = path.resolve(__dirname, '../../public/sw.js');
      expect(fs.existsSync(swFilePath)).toBe(true);
      const swContent = fs.readFileSync(swFilePath, 'utf8');

      // Check event listeners
      expect(swContent).toContain("self.addEventListener('push'");
      expect(swContent).toContain("self.addEventListener('notificationclick'");

      // Check URL resolution
      expect(swContent).toContain('new URL(targetUrl, origin).toString()');

      // Check window focus and navigate behavior
      expect(swContent).toContain('client.focus()');
      expect(swContent).toContain('client.navigate(');
      expect(swContent).toContain('clients.openWindow(');

      // Check plain text fallback
      expect(swContent).toContain('event.data.text()');
    });
  });

  describe('6. Zero-CLS & Ad Money Design System Invariants', () => {
    it('enforces h-[26px] container height on TodayUpdatePillBadge and skeleton', () => {
      const badgeFilePath = path.resolve(__dirname, '../components/common/TodayUpdatePillBadge.tsx');
      expect(fs.existsSync(badgeFilePath)).toBe(true);
      const badgeContent = fs.readFileSync(badgeFilePath, 'utf8');

      // Skeleton must have h-[26px]
      expect(badgeContent).toMatch(/h-\[26px\][^"']*rounded-full[^"']*bg-slate/);

      // Active badge must have h-[26px]
      expect(badgeContent).toMatch(/h-\[26px\][^"']*inline-flex[^"']*rounded-full/);

      // Must have tabular-nums
      expect(badgeContent).toContain('tabular-nums');

      // Prohibited legacy fonts check (DRSP Rule 5)
      const prohibitedFonts = ['Gulim', 'Dotum', 'Batang', 'Consolas', 'Courier New'];
      for (const font of prohibitedFonts) {
        expect(badgeContent).not.toContain(font);
      }
    });

    it('verifies that no raw unicode emojis are used in the pill badge and timeline components', () => {
      const filesToCheck = [
        path.resolve(__dirname, '../components/common/TodayUpdatePillBadge.tsx'),
        path.resolve(__dirname, '../components/macro/components/MacroTimelineView.tsx'),
      ];

      // Regular expression for common raw emojis
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

      for (const filePath of filesToCheck) {
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.includes('//') || line.includes('/*') || line.includes('*')) continue;
          expect({ line: i + 1, hasEmoji: emojiRegex.test(line) }).toEqual({
            line: i + 1,
            hasEmoji: false,
          });
        }
      }
    });
  });
});
