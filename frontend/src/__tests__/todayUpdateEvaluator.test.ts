/**
 * @file todayUpdateEvaluator.test.ts
 * @description Unit test suite for todayUpdateEvaluator.
 * Tests KST timezone calculation, registeredDate vs contractDate distinctions,
 * new high counts, zero-data resilience, and strict real data compliance.
 */

import {
  getTodayYmdKST,
  formatDateLabelKST,
  isRegisteredToday,
  evaluateTodayUpdateMetrics,
} from '@/lib/todayUpdateEvaluator';

describe('todayUpdateEvaluator Unit Tests', () => {
  describe('1. KST Timezone Handling (getTodayYmdKST)', () => {
    it('accurately resolves KST date across UTC midnight boundaries', () => {
      // 2026-11-10 23:30 UTC = 2026-11-11 08:30 KST
      const utcDateMorningKST = new Date('2026-11-10T23:30:00.000Z');
      expect(getTodayYmdKST(utcDateMorningKST)).toBe('20261111');

      // 2026-11-11 14:59 UTC = 2026-11-11 23:59 KST
      const utcDateNightKST = new Date('2026-11-11T14:59:00.000Z');
      expect(getTodayYmdKST(utcDateNightKST)).toBe('20261111');

      // 2026-11-11 15:01 UTC = 2026-11-12 00:01 KST
      const utcDateNextDayKST = new Date('2026-11-11T15:01:00.000Z');
      expect(getTodayYmdKST(utcDateNextDayKST)).toBe('20261112');
    });

    it('returns 8-digit numeric string for current date by default', () => {
      const today = getTodayYmdKST();
      expect(today).toMatch(/^\d{8}$/);
    });
  });

  describe('2. formatDateLabelKST', () => {
    it('formats valid 8-digit date strings to Korean month/day labels', () => {
      expect(formatDateLabelKST('20261111')).toBe('11월 11일');
      expect(formatDateLabelKST('20260305')).toBe('3월 5일');
      expect(formatDateLabelKST('2026-11-11')).toBe('11월 11일');
    });

    it('returns empty string for null, undefined, or malformed values', () => {
      expect(formatDateLabelKST(null)).toBe('');
      expect(formatDateLabelKST(undefined)).toBe('');
      expect(formatDateLabelKST('')).toBe('');
      expect(formatDateLabelKST('123')).toBe('');
      expect(formatDateLabelKST('invalid-date')).toBe('');
    });
  });

  describe('3. isRegisteredToday', () => {
    it('returns true when registeredDate matches target KST date', () => {
      expect(isRegisteredToday('20261111', '20261111')).toBe(true);
      expect(isRegisteredToday('2026-11-11', '20261111')).toBe(true);
    });

    it('returns false when registeredDate differs from target date', () => {
      expect(isRegisteredToday('20261110', '20261111')).toBe(false);
      expect(isRegisteredToday('20261112', '20261111')).toBe(false);
    });

    it('returns false for null, undefined, or empty values', () => {
      expect(isRegisteredToday(null, '20261111')).toBe(false);
      expect(isRegisteredToday(undefined, '20261111')).toBe(false);
      expect(isRegisteredToday('', '20261111')).toBe(false);
    });
  });

  describe('4. evaluateTodayUpdateMetrics', () => {
    const fixedReferenceDate = new Date('2026-11-11T01:00:00.000Z'); // 10:00 KST on 2026-11-11

    it('strictly evaluates registeredDate (MOLIT RTMS disclosure date), NOT contractDate', () => {
      const mockTxs = [
        // Case A: contracted 3 weeks ago, but registered TODAY at MOLIT
        {
          contractDate: '20261020',
          registeredDate: '20261111',
          isNewHigh: false,
        },
        // Case B: contracted TODAY, but registered on past date (or not registered today)
        {
          contractDate: '20261111',
          registeredDate: '20261110',
          isNewHigh: true,
        },
        // Case C: contracted and registered TODAY, new high
        {
          contractDate: '20261111',
          registeredDate: '20261111',
          isNewHigh: true,
          type: 'high',
        },
      ];

      const metrics = evaluateTodayUpdateMetrics(
        mockTxs,
        { latestRegisteredDate: '20261111' },
        fixedReferenceDate
      );

      expect(metrics.todayYmd).toBe('20261111');
      expect(metrics.isTodayUpdated).toBe(true);
      expect(metrics.todayRegisteredCount).toBe(2); // Only Case A and Case C
      expect(metrics.todayNewHighCount).toBe(1); // Only Case C
      expect(metrics.todayTransactions).toHaveLength(2);
    });

    it('transparently reports 0 counts on weekends/holidays with no new MOLIT disclosures', () => {
      const mockPastTxs = [
        {
          contractDate: '20261108',
          registeredDate: '20261109',
        },
        {
          contractDate: '20261107',
          registeredDate: '20261108',
        },
      ];

      const metrics = evaluateTodayUpdateMetrics(
        mockPastTxs,
        {
          latestRegisteredDate: '20261109',
          latestContractDate: '20261108',
          todayRegisteredCount: 0,
        },
        fixedReferenceDate // 2026-11-11
      );

      expect(metrics.todayYmd).toBe('20261111');
      expect(metrics.latestRegisteredDate).toBe('20261109');
      expect(metrics.isTodayUpdated).toBe(false);
      expect(metrics.todayRegisteredCount).toBe(0);
      expect(metrics.todayNewHighCount).toBe(0);
      expect(metrics.latestRegisteredDateLabel).toBe('11월 9일');
      expect(metrics.todayTransactions).toHaveLength(0);
    });

    it('falls back to marketStats when recentTransactions is empty or not provided', () => {
      const metrics = evaluateTodayUpdateMetrics(
        [],
        {
          latestRegisteredDate: '20261111',
          todayRegisteredCount: 4,
          todayNewHighCount: 1,
          lastSyncTime: '06:55 KST',
        },
        fixedReferenceDate
      );

      expect(metrics.isTodayUpdated).toBe(true);
      expect(metrics.todayRegisteredCount).toBe(4);
      expect(metrics.todayNewHighCount).toBe(1);
      expect(metrics.lastSyncTimeLabel).toBe('06:55 KST');
    });

    it('safely handles empty, null, or undefined parameters without throwing exceptions', () => {
      const metrics = evaluateTodayUpdateMetrics(
        undefined,
        null,
        fixedReferenceDate
      );

      expect(metrics.todayYmd).toBe('20261111');
      expect(metrics.isTodayUpdated).toBe(false);
      expect(metrics.todayRegisteredCount).toBe(0);
      expect(metrics.todayNewHighCount).toBe(0);
      expect(metrics.todayTransactions).toEqual([]);
    });
  });
});
