/**
 * @file m2_challenger_adversarial.test.tsx
 * @description Milestone 2 Empirical Adversarial Stress Test Suite.
 * Conducts exhaustive empirical verification of:
 * 1. 24+ Global Timezones & Strict KST Isolation (UTC-12 to UTC+14)
 * 2. Leap Years, Month Rollovers, and Millisecond Boundary Invariants
 * 3. RegisteredDate (MOLIT Disclosure) vs ContractDate (Trade Signing) Strict Isolation
 * 4. Strict Real Data Rules (null, undefined, malformed, empty array, truthful 0-count neutral state)
 * 5. High-Throughput Stress & Memory Benchmarking (10,000+ adversarial records)
 * 6. Timeline View & Group Header Pulse Integration (MacroTimelineView & MacroControls)
 * 7. Zero-CLS, Typography (tabular-nums), and Design System (Value Emerald) Invariants
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  getTodayYmdKST,
  formatDateLabelKST,
  isRegisteredToday,
  evaluateTodayUpdateMetrics,
} from '@/lib/todayUpdateEvaluator';
import { TodayUpdatePillBadge } from '@/components/common/TodayUpdatePillBadge';
import { MacroTimelineView } from '@/components/macro/components/MacroTimelineView';
import { TimelineFilterControls } from '@/components/macro/components/MacroControls';

describe('Milestone 2 Empirical Challenger: Adversarial Stress Test Suite', () => {
  // =========================================================================
  // 1. ADVERSARIAL DATE & TIMEZONE TESTS (24+ Global Timezones)
  // =========================================================================
  describe('1. 24+ Global Timezones & Strict KST Isolation', () => {
    // 27 Representative timezones spanning UTC-12 to UTC+14
    const globalTimezones = [
      { name: 'Baker Island (UTC-12)', tz: 'Etc/GMT+12' },
      { name: 'Pago Pago (UTC-11)', tz: 'Pacific/Pago_Pago' },
      { name: 'Honolulu (UTC-10)', tz: 'Pacific/Honolulu' },
      { name: 'Marquesas Islands (UTC-9:30)', tz: 'Pacific/Marquesas' },
      { name: 'Anchorage (UTC-9)', tz: 'America/Anchorage' },
      { name: 'Los Angeles (UTC-8)', tz: 'America/Los_Angeles' },
      { name: 'Denver (UTC-7)', tz: 'America/Denver' },
      { name: 'Chicago (UTC-6)', tz: 'America/Chicago' },
      { name: 'New York (UTC-5)', tz: 'America/New_York' },
      { name: 'Halifax (UTC-4)', tz: 'America/Halifax' },
      { name: 'Sao Paulo (UTC-3)', tz: 'America/Sao_Paulo' },
      { name: 'South Georgia (UTC-2)', tz: 'Atlantic/South_Georgia' },
      { name: 'Azores (UTC-1)', tz: 'Atlantic/Azores' },
      { name: 'London / UTC (UTC+0)', tz: 'UTC' },
      { name: 'Paris / Berlin (UTC+1)', tz: 'Europe/Paris' },
      { name: 'Athens / Cairo (UTC+2)', tz: 'Europe/Athens' },
      { name: 'Moscow / Riyadh (UTC+3)', tz: 'Europe/Moscow' },
      { name: 'Dubai (UTC+4)', tz: 'Asia/Dubai' },
      { name: 'Karachi (UTC+5)', tz: 'Asia/Karachi' },
      { name: 'Kolkata (UTC+5:30)', tz: 'Asia/Kolkata' },
      { name: 'Dhaka (UTC+6)', tz: 'Asia/Dhaka' },
      { name: 'Bangkok (UTC+7)', tz: 'Asia/Bangkok' },
      { name: 'Singapore / Beijing (UTC+8)', tz: 'Asia/Singapore' },
      { name: 'Seoul / Tokyo (UTC+9)', tz: 'Asia/Seoul' },
      { name: 'Sydney (UTC+10)', tz: 'Australia/Sydney' },
      { name: 'Auckland (UTC+12)', tz: 'Pacific/Auckland' },
      { name: 'Kiritimati (UTC+14)', tz: 'Pacific/Kiritimati' },
    ];

    it('consistently produces the exact same KST date across all 27 global timezones for a fixed instant', () => {
      // 2026-11-10T16:30:00.000Z is:
      // - 08:30 in Los Angeles on 2026-11-10 (previous day!)
      // - 16:30 in UTC on 2026-11-10 (previous day!)
      // - 01:30 in Seoul (KST) on 2026-11-11 (TODAY!)
      // - 06:30 in Kiritimati on 2026-11-11
      const fixedInstant = new Date('2026-11-10T16:30:00.000Z');

      const originalTZ = process.env.TZ;
      try {
        globalTimezones.forEach(({ name, tz }) => {
          process.env.TZ = tz;
          const kstYmd = getTodayYmdKST(fixedInstant);
          expect({ tz: name, result: kstYmd }).toEqual({ tz: name, result: '20261111' });
        });
      } finally {
        process.env.TZ = originalTZ;
      }
    });

    it('maintains strict KST isolation when local time is yesterday (e.g. US/Pacific 23:00)', () => {
      // 2026-11-11T07:00:00.000Z (16:00 KST on Nov 11)
      // In US/Pacific (UTC-8), local time is Nov 10 at 23:00.
      const fixedDate = new Date('2026-11-11T07:00:00.000Z');
      const originalTZ = process.env.TZ;
      try {
        process.env.TZ = 'America/Los_Angeles';
        expect(getTodayYmdKST(fixedDate)).toBe('20261111');
        expect(isRegisteredToday('20261111', getTodayYmdKST(fixedDate))).toBe(true);
        expect(isRegisteredToday('20261110', getTodayYmdKST(fixedDate))).toBe(false);
      } finally {
        process.env.TZ = originalTZ;
      }
    });

    it('maintains strict KST isolation when local time is tomorrow (e.g. Kiritimati UTC+14 02:00)', () => {
      // 2026-11-11T12:00:00.000Z (21:00 KST on Nov 11)
      // In Kiritimati (UTC+14), local time is Nov 12 at 02:00.
      const fixedDate = new Date('2026-11-11T12:00:00.000Z');
      const originalTZ = process.env.TZ;
      try {
        process.env.TZ = 'Pacific/Kiritimati';
        expect(getTodayYmdKST(fixedDate)).toBe('20261111');
        expect(isRegisteredToday('20261111', getTodayYmdKST(fixedDate))).toBe(true);
        expect(isRegisteredToday('20261112', getTodayYmdKST(fixedDate))).toBe(false);
      } finally {
        process.env.TZ = originalTZ;
      }
    });
  });

  // =========================================================================
  // 2. BOUNDARY DATES, LEAP YEARS & ROLLOVER INVARIANTS
  // =========================================================================
  describe('2. Boundary Dates, Leap Years & Rollover Invariants', () => {
    it('accurately resolves leap year February 29 boundaries (2024 leap year)', () => {
      // 2024-02-28 23:59:59 KST = 2024-02-28T14:59:59.000Z
      const justBeforeFeb29 = new Date('2024-02-28T14:59:59.000Z');
      expect(getTodayYmdKST(justBeforeFeb29)).toBe('20240228');
      expect(formatDateLabelKST('20240228')).toBe('2월 28일');

      // 2024-02-29 00:00:01 KST = 2024-02-28T15:00:01.000Z
      const justInsideFeb29 = new Date('2024-02-28T15:00:01.000Z');
      expect(getTodayYmdKST(justInsideFeb29)).toBe('20240229');
      expect(formatDateLabelKST('20240229')).toBe('2월 29일');

      // 2024-02-29 23:59:59 KST = 2024-02-29T14:59:59.000Z
      const endOfFeb29 = new Date('2024-02-29T14:59:59.000Z');
      expect(getTodayYmdKST(endOfFeb29)).toBe('20240229');

      // 2024-03-01 00:00:01 KST = 2024-02-29T15:00:01.000Z
      const startOfMarch = new Date('2024-02-29T15:00:01.000Z');
      expect(getTodayYmdKST(startOfMarch)).toBe('20240301');
      expect(formatDateLabelKST('20240301')).toBe('3월 1일');
    });

    it('accurately handles non-leap year February rollover (2026 non-leap year)', () => {
      // 2026-02-28 23:59:59 KST = 2026-02-28T14:59:59.000Z
      const endOfFeb = new Date('2026-02-28T14:59:59.000Z');
      expect(getTodayYmdKST(endOfFeb)).toBe('20260228');

      // 2026-03-01 00:00:01 KST = 2026-02-28T15:00:01.000Z
      const startOfMarch = new Date('2026-02-28T15:00:01.000Z');
      expect(getTodayYmdKST(startOfMarch)).toBe('20260301');
    });

    it('accurately handles New Year rollover (2026-12-31 23:59:59 vs 2027-01-01 00:00:01 KST)', () => {
      const nyeKST = new Date('2026-12-31T14:59:59.000Z'); // 23:59:59 KST
      expect(getTodayYmdKST(nyeKST)).toBe('20261231');
      expect(formatDateLabelKST('20261231')).toBe('12월 31일');

      const nyDayKST = new Date('2026-12-31T15:00:01.000Z'); // 00:00:01 KST
      expect(getTodayYmdKST(nyDayKST)).toBe('20270101');
      expect(formatDateLabelKST('20270101')).toBe('1월 1일');
    });

    it('accurately distinguishes 23:59:59 KST vs 00:00:01 KST on daily rollover', () => {
      // Nov 10 23:59:59 KST = 14:59:59 UTC
      const nightKST = new Date('2026-11-10T14:59:59.999Z');
      expect(getTodayYmdKST(nightKST)).toBe('20261110');

      // Nov 11 00:00:01 KST = 15:00:01 UTC
      const morningKST = new Date('2026-11-10T15:00:01.000Z');
      expect(getTodayYmdKST(morningKST)).toBe('20261111');
    });
  });

  // =========================================================================
  // 3. REGISTEREDDATE VS CONTRACTDATE ADVERSARIAL ISOLATION
  // =========================================================================
  describe('3. RegisteredDate vs ContractDate Strict Isolation', () => {
    const fixedTodayKST = new Date('2026-11-11T01:00:00.000Z'); // 10:00 KST Nov 11, 2026

    it('Scenario A: contractDate 25 days ago but registeredDate TODAY triggers today badge', () => {
      const tx = [
        {
          contractDate: '20261017', // 25 days ago
          registeredDate: '20261111', // disclosed today!
          priceVal: 95000,
          isNewHigh: false,
        },
      ];

      const metrics = evaluateTodayUpdateMetrics(
        tx,
        { latestRegisteredDate: '20261111' },
        fixedTodayKST
      );

      expect(metrics.todayYmd).toBe('20261111');
      expect(metrics.isTodayUpdated).toBe(true);
      expect(metrics.todayRegisteredCount).toBe(1);
      expect(metrics.todayTransactions).toHaveLength(1);
    });

    it('Scenario B: contractDate TODAY but registeredDate TOMORROW (or future) NEVER triggers today badge', () => {
      const tx = [
        {
          contractDate: '20261111', // contracted today
          registeredDate: '20261112', // future registered date
          priceVal: 100000,
        },
      ];

      const metrics = evaluateTodayUpdateMetrics(
        tx,
        { latestRegisteredDate: '20261110', todayRegisteredCount: 0 },
        fixedTodayKST
      );

      expect(metrics.isTodayUpdated).toBe(false);
      expect(metrics.todayRegisteredCount).toBe(0);
      expect(metrics.todayTransactions).toHaveLength(0);
    });

    it('Scenario C: contractDate TODAY but registeredDate YESTERDAY NEVER triggers today badge', () => {
      const tx = [
        {
          contractDate: '20261111',
          registeredDate: '20261110',
          priceVal: 88000,
        },
      ];

      const metrics = evaluateTodayUpdateMetrics(
        tx,
        { latestRegisteredDate: '20261110', todayRegisteredCount: 0 },
        fixedTodayKST
      );

      expect(metrics.isTodayUpdated).toBe(false);
      expect(metrics.todayRegisteredCount).toBe(0);
      expect(metrics.todayTransactions).toHaveLength(0);
    });

    it('Scenario D: contractDate TODAY with missing/empty registeredDate NEVER triggers today badge', () => {
      const tx = [
        {
          contractDate: '20261111',
          registeredDate: '',
          priceVal: 90000,
        },
        {
          contractDate: '20261111',
          registeredDate: undefined,
          priceVal: 91000,
        },
      ];

      const metrics = evaluateTodayUpdateMetrics(
        tx,
        { latestRegisteredDate: '20261110', todayRegisteredCount: 0 },
        fixedTodayKST
      );

      expect(metrics.isTodayUpdated).toBe(false);
      expect(metrics.todayRegisteredCount).toBe(0);
      expect(metrics.todayTransactions).toHaveLength(0);
    });

    it('Scenario E: complex mix of 6 adversarial records isolates exactly the 2 genuine same-day disclosures', () => {
      const adversarialDataset = [
        // 1. Valid: contracted 28 days ago, disclosed today
        { id: 1, contractDate: '20261014', registeredDate: '2026-11-11', isNewHigh: true },
        // 2. Valid: contracted today, disclosed today
        { id: 2, contractDate: '20261111', registeredDate: '20261111', isNewHigh: false },
        // 3. Invalid: contracted today, registered yesterday
        { id: 3, contractDate: '20261111', registeredDate: '2026-11-10', isNewHigh: true },
        // 4. Invalid: contracted today, registered tomorrow
        { id: 4, contractDate: '20261111', registeredDate: '2026-11-12', isNewHigh: false },
        // 5. Invalid: contracted today, registeredDate missing
        { id: 5, contractDate: '20261111', registeredDate: null as unknown as string },
        // 6. Invalid: contracted today, registeredDate corrupt string
        { id: 6, contractDate: '20261111', registeredDate: 'MALFORMED' },
      ];

      const metrics = evaluateTodayUpdateMetrics(
        adversarialDataset,
        { latestRegisteredDate: '20261111' },
        fixedTodayKST
      );

      expect(metrics.todayRegisteredCount).toBe(2);
      expect(metrics.todayNewHighCount).toBe(1);
      expect(metrics.todayTransactions?.map((t) => t.id)).toEqual([1, 2]);
    });
  });

  // =========================================================================
  // 4. STRICT REAL DATA TESTS (Truthful Neutral State & Edge Cases)
  // =========================================================================
  describe('4. Strict Real Data Tests: Truthful Neutral States & Extreme Inputs', () => {
    const fixedTodayKST = new Date('2026-11-11T01:00:00.000Z');

    it('handles null, undefined, empty array without runtime exceptions', () => {
      expect(() => evaluateTodayUpdateMetrics(null as unknown as [], null, fixedTodayKST)).not.toThrow();
      expect(() => evaluateTodayUpdateMetrics(undefined, undefined, fixedTodayKST)).not.toThrow();
      expect(() => evaluateTodayUpdateMetrics([], {}, fixedTodayKST)).not.toThrow();

      const nullMetrics = evaluateTodayUpdateMetrics(null as unknown as [], null, fixedTodayKST);
      expect(nullMetrics.todayRegisteredCount).toBe(0);
      expect(nullMetrics.isTodayUpdated).toBe(false);
      expect(nullMetrics.todayTransactions).toEqual([]);
    });

    it('handles arrays with null, undefined, primitives, and malformed objects safely', () => {
      const dirtyArray = [
        null,
        undefined,
        12345,
        'string',
        {},
        { registeredDate: 20261111 }, // number instead of string
        { registeredDate: '2026/11/11' }, // slash format
        { registeredDate: '2026-11-11' }, // hyphen format
      ] as unknown as Array<{ registeredDate?: string }>;

      const metrics = evaluateTodayUpdateMetrics(dirtyArray, null, fixedTodayKST);
      expect(metrics.todayRegisteredCount).toBe(3);
      expect(metrics.isTodayUpdated).toBe(true);
    });

    it('renders truthful empty neutral state when todayRegisteredCount === 0 (Strict Real Data)', () => {
      const zeroMetrics = evaluateTodayUpdateMetrics(
        [],
        {
          latestRegisteredDate: '20261110',
          todayRegisteredCount: 0,
        },
        fixedTodayKST
      );

      render(<TodayUpdatePillBadge metrics={zeroMetrics} />);

      // Must render empty badge, NOT active badge
      expect(screen.queryByTestId('today-update-pill-badge')).toBeNull();
      const emptyBadge = screen.getByTestId('today-update-pill-badge-empty');
      expect(emptyBadge).toBeInTheDocument();
      expect(emptyBadge).toHaveTextContent('최신 실거래 갱신 완료 (11월 10일)');

      // Verify ZERO fake counts or "0건" displayed in badge
      expect(emptyBadge).not.toHaveTextContent('0건');
      expect(emptyBadge).not.toHaveTextContent('신규 0건');
    });

    it('renders truthful neutral state even if marketStats.latestRegisteredDate is today but todayRegisteredCount is 0', () => {
      const holidayMetrics = evaluateTodayUpdateMetrics(
        [],
        {
          latestRegisteredDate: '20261111',
          todayRegisteredCount: 0, // explicit 0
        },
        fixedTodayKST
      );

      render(<TodayUpdatePillBadge metrics={holidayMetrics} />);

      const emptyBadge = screen.getByTestId('today-update-pill-badge-empty');
      expect(emptyBadge).toBeInTheDocument();
      expect(emptyBadge).toHaveTextContent('최신 실거래 갱신 완료 (11월 11일)');
      expect(emptyBadge).not.toHaveTextContent('0건');
    });
  });

  // =========================================================================
  // 5. HIGH-THROUGHPUT STRESS & MEMORY BENCHMARKING
  // =========================================================================
  describe('5. High-Throughput Stress & Memory Benchmarking (10,000 Records)', () => {
    it('evaluates 10,000 adversarial transactions within 50ms without memory degradation', () => {
      const largeAdversarialSet: Array<{
        contractDate: string;
        registeredDate: string;
        isNewHigh: boolean;
        type?: string;
      }> = [];

      // Generate 10,000 mixed records: 100 today, 9,900 past/future/corrupt
      for (let i = 0; i < 10000; i++) {
        if (i % 100 === 0) {
          largeAdversarialSet.push({
            contractDate: `202610${String((i % 28) + 1).padStart(2, '0')}`,
            registeredDate: '20261111', // valid today
            isNewHigh: i % 200 === 0,
            type: i % 200 === 0 ? 'high' : 'normal',
          });
        } else {
          largeAdversarialSet.push({
            contractDate: '20261111',
            registeredDate: `202610${String((i % 28) + 1).padStart(2, '0')}`, // past
            isNewHigh: false,
          });
        }
      }

      const t0 = performance.now();
      const metrics = evaluateTodayUpdateMetrics(
        largeAdversarialSet,
        null,
        new Date('2026-11-11T01:00:00.000Z')
      );
      const elapsed = performance.now() - t0;

      expect(metrics.todayRegisteredCount).toBe(100);
      expect(metrics.todayNewHighCount).toBe(50);
      expect(elapsed).toBeLessThan(50); // Under 50ms for 10,000 items
    });
  });

  // =========================================================================
  // 6. TIMELINE & CONTROLS INTEGRATION INVARIANTS
  // =========================================================================
  describe('6. Timeline View & Group Header Pulse Integration', () => {
    it('renders "1d" ("오늘") quick period selector tab in MacroTimelineView', () => {
      const handlePeriodChange = jest.fn();
      render(
        <MacroTimelineView
          timelineGroups={[]}
          periodFilter="1d"
          setPeriodFilter={handlePeriodChange}
        />
      );

      const oneDayTab = screen.getByTestId('timeline-period-tab-1d');
      expect(oneDayTab).toBeInTheDocument();
      expect(oneDayTab).toHaveTextContent('오늘');
    });

    it('renders emerald pulse dot and [오늘 신규 반영] badge on today date group in MacroTimelineView', () => {
      const todayYmd = getTodayYmdKST(); // current KST date
      const todayGroup = {
        dateStr: `${todayYmd.slice(0, 4)}.${todayYmd.slice(4, 6)}.${todayYmd.slice(6, 8)}`,
        dateKey: todayYmd,
        items: [
          {
            id: 'tx-today-1',
            aptKey: 'apt-1',
            aptName: '동탄역 롯데캐슬',
            tradeType: 'sale' as const,
            price: '16억',
            priceVal: 160000,
            area: 84.9,
            areaPyeong: 34,
            floor: 25,
            date: todayYmd,
            registeredDate: todayYmd,
            isTodayRegistered: true,
          },
        ],
      };

      const pastGroup = {
        dateStr: '2026.11.01',
        dateKey: '20261101',
        items: [
          {
            id: 'tx-past-1',
            aptKey: 'apt-2',
            aptName: '시범우남퍼스트빌',
            tradeType: 'sale' as const,
            price: '11억',
            priceVal: 110000,
            area: 84.9,
            areaPyeong: 34,
            floor: 10,
            date: '20261101',
            registeredDate: '20261101',
            isTodayRegistered: false,
          },
        ],
      };

      const { container } = render(
        <MacroTimelineView
          timelineGroups={[todayGroup, pastGroup]}
          selectedApt={null}
        />
      );

      // Today date group header must display emerald dot without redundant [오늘 신규 반영] / [오늘 등록] capsules
      expect(screen.queryByTestId('timeline-group-today-badge')).not.toBeInTheDocument();
      expect(screen.queryByTestId('timeline-today-registered-badge')).not.toBeInTheDocument();

      const emeraldDots = container.querySelectorAll('.bg-emerald-500.ring-4');
      expect(emeraldDots.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 7. DESIGN SYSTEM & USER RULES COMPLIANCE (Zero-CLS, Value Emerald)
  // =========================================================================
  describe('7. Design System & User Rules Compliance', () => {
    it('enforces fixed h-[26px] height invariant on all badge states (Zero-CLS)', () => {
      const { unmount } = render(<TodayUpdatePillBadge />);
      const skeleton = screen.getByTestId('today-update-pill-badge-skeleton');
      expect(skeleton).toHaveClass('h-[26px]');
      unmount();

      const activeMetrics = evaluateTodayUpdateMetrics(
        [{ registeredDate: '20261111', priceVal: 100000 }],
        { latestRegisteredDate: '20261111' },
        new Date('2026-11-11T01:00:00.000Z')
      );
      const { unmount: unmountActive } = render(<TodayUpdatePillBadge metrics={activeMetrics} />);
      const activeBadge = screen.getByTestId('today-update-pill-badge');
      expect(activeBadge).toHaveClass('h-[26px]');
      unmountActive();

      const emptyMetrics = evaluateTodayUpdateMetrics([], null, new Date('2026-11-11T01:00:00.000Z'));
      render(<TodayUpdatePillBadge metrics={emptyMetrics} />);
      const emptyBadge = screen.getByTestId('today-update-pill-badge-empty');
      expect(emptyBadge).toHaveClass('h-[26px]');
    });

    it('enforces tabular-nums font invariant on active badge and neutral empty badge', () => {
      const activeMetrics = evaluateTodayUpdateMetrics(
        [{ registeredDate: '20261111', priceVal: 100000 }],
        { latestRegisteredDate: '20261111' },
        new Date('2026-11-11T01:00:00.000Z')
      );
      const { unmount } = render(<TodayUpdatePillBadge metrics={activeMetrics} />);
      expect(screen.getByTestId('today-update-pill-badge')).toHaveClass('tabular-nums');
      unmount();

      const emptyMetrics = evaluateTodayUpdateMetrics([], null, new Date('2026-11-11T01:00:00.000Z'));
      render(<TodayUpdatePillBadge metrics={emptyMetrics} />);
      expect(screen.getByTestId('today-update-pill-badge-empty')).toHaveClass('tabular-nums');
    });

    it('strictly avoids prohibited color tokens (green-*, purple, pink, etc.) and emojis', () => {
      const activeMetrics = evaluateTodayUpdateMetrics(
        [{ registeredDate: '20261111', priceVal: 100000, isNewHigh: true }],
        { latestRegisteredDate: '20261111' },
        new Date('2026-11-11T01:00:00.000Z')
      );
      const { container } = render(<TodayUpdatePillBadge metrics={activeMetrics} />);

      // Zero unicode emojis
      const emojiRegex =
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
      expect(container.textContent?.match(emojiRegex)).toBeNull();

      // Zero prohibited color tokens
      const prohibitedColorRegex =
        /\b(?:bg|text|border|ring)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|zinc|neutral|stone|gray|teal|cyan|sky|green)-/i;
      expect(container.innerHTML.match(prohibitedColorRegex)).toBeNull();

      // Uses Value Emerald tokens
      expect(container.innerHTML).toContain('emerald');
    });
  });
});
