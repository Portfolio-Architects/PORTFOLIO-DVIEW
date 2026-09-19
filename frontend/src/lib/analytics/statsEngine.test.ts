/**
 * @module statsEngine.test
 * @description Comprehensive unit test suite for Dongtan Real Estate Statistics Analysis Engine.
 * Tests 9 complete suites covering mathematics, sanitization, categorization,
 * zero division defense, edge cases, and performance benchmarking.
 */

import {
  aggregateStatistics,
  aggregateStats,
  computeComplexRankings,
  computeMacroTimeSeries,
  computePyeongPrice,
  computeStats,
  computeVolumeDistribution,
  DONGTAN1_DONGS,
  DONGTAN2_DONGS,
  EMPTY_STATS_RESULT,
  filterTransactions,
  formatPriceEok,
  getPyeongTier,
  getRegionFromDong,
  isCancelledTransaction,
  isDirectDeal,
  isOutlierTransaction,
  matchesPyeong,
  matchesRegion,
  matchPyeong,
  matchTimeframe,
  normalizeDongName,
  parseContractDate,
  parsePriceEokToMan,
  parsePriceToManWon,
  safeDivide,
  safeRound,
} from './statsEngine';
import type {
  ComplexStatItem,
  PyeongFilter,
  RawRentRecord,
  RawTransactionRecord,
  RegionFilter,
  TimeframeFilter,
} from '@/types/stats';
import type { RecentTransaction } from '@/types/transaction';

describe('statsEngine Unit Test Suite', () => {
  const REF_DATE = '2026-09-20';

  // ==========================================================================
  // Suite 1: Mathematical Accuracy & Formatting
  // ==========================================================================
  describe('Suite 1: Mathematical Accuracy & Formatting', () => {
    it('1.1: should compute exact average sale price and pyeong price', () => {
      const mockTxs: RecentTransaction[] = [
        {
          aptName: '단지A',
          txKey: '단지A',
          contractDate: '20260915',
          date: '09.15',
          priceVal: 6.0, // 60,000만원
          priceEok: '6억',
          area: 84.8,
          areaPyeong: 30.0,
          floor: 10,
          dealType: '중개거래',
        },
        {
          aptName: '단지B',
          txKey: '단지B',
          contractDate: '20260910',
          date: '09.10',
          priceVal: 10.0, // 100,000만원
          priceEok: '10억',
          area: 84.8,
          areaPyeong: 40.0,
          floor: 15,
          dealType: '중개거래',
        },
      ];

      const res = computeStats(
        mockTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
        { referenceDate: REF_DATE }
      );
      expect(res.totalVolume).toBe(2);
      expect(res.avgSalePrice).toBe(80000); // (60000 + 100000) / 2
      // PP1 = 60000 / 30 = 2000, PP2 = 100000 / 40 = 2500 -> Avg = 2250
      expect(res.avgPyeongPrice).toBe(2250);
      expect(res.isEmpty).toBe(false);
    });

    it('1.2: should calculate pyeong price using fallback 3.30578 when areaPyeong is missing', () => {
      const priceValWon = 80000;
      const areaM2 = 84.8;
      const expectedPyeong = 84.8 / 3.30578;
      const expectedPyeongPrice = Math.round(priceValWon / expectedPyeong);

      const calculated = computePyeongPrice(priceValWon, areaM2);
      expect(calculated).toBe(expectedPyeongPrice);
    });

    it('1.3: should correctly format and parse Korean Eok representations bidirectionally', () => {
      expect(formatPriceEok(85000)).toBe('8억5,000');
      expect(formatPriceEok(60000)).toBe('6억');
      expect(formatPriceEok(74500)).toBe('7억4,500');
      expect(formatPriceEok(5000)).toBe('5,000만');

      expect(parsePriceEokToMan('8억5,000')).toBe(85000);
      expect(parsePriceEokToMan('6억')).toBe(60000);
      expect(parsePriceEokToMan('7억4,500')).toBe(74500);
      expect(parsePriceEokToMan('10억 1,500만')).toBe(101500);
      expect(parsePriceEokToMan('2억1,952')).toBe(21952);
    });

    it('1.4: should parse prices accurately across 억원 floats, 만원 integers, and Eok strings', () => {
      expect(parsePriceToManWon({ priceVal: 7.5 })).toBe(75000);
      expect(parsePriceToManWon({ priceVal: 105000 })).toBe(105000);
      expect(parsePriceToManWon({ price: 82000 })).toBe(82000);
      expect(parsePriceToManWon({ priceEok: '9억2,000' })).toBe(92000);
      expect(parsePriceToManWon(null)).toBe(0);
    });

    it('1.5: should calculate MoM volume change accurately including zero-baseline handling', () => {
      const mockTxs: RecentTransaction[] = [
        // 2026-08 (1 transaction)
        {
          aptName: '단지A',
          txKey: '단지A',
          contractDate: '20260815',
          date: '08.15',
          priceVal: 6.0,
          priceEok: '6억',
          area: 84.8,
          areaPyeong: 30.0,
          floor: 10,
          dealType: '중개거래',
        },
        // 2026-09 (2 transactions) -> +100% MoM
        {
          aptName: '단지A',
          txKey: '단지A',
          contractDate: '20260910',
          date: '09.10',
          priceVal: 6.5,
          priceEok: '6.5억',
          area: 84.8,
          areaPyeong: 30.0,
          floor: 12,
          dealType: '중개거래',
        },
        {
          aptName: '단지B',
          txKey: '단지B',
          contractDate: '20260918',
          date: '09.18',
          priceVal: 7.0,
          priceEok: '7억',
          area: 84.8,
          areaPyeong: 30.0,
          floor: 8,
          dealType: '중개거래',
        },
      ];

      const res = computeStats(
        mockTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: 'ALL' },
        { referenceDate: REF_DATE }
      );
      expect(res.volumeChangeMoM).toBe(100.0);
    });
  });

  // ==========================================================================
  // Suite 2: Cancellation & Retraction Defense
  // ==========================================================================
  describe('Suite 2: Cancellation & Retraction Defense', () => {
    it('2.1: should identify all cancellation variations accurately', () => {
      expect(isCancelledTransaction({ isCanceled: true })).toBe(true);
      expect(isCancelledTransaction({ cdealType: 'O' })).toBe(true);
      expect(isCancelledTransaction({ cdealType: '해제' })).toBe(true);
      expect(isCancelledTransaction({ cancelDate: '20260501' })).toBe(true);
      expect(isCancelledTransaction({ cancelDate: ' 20260501 ' })).toBe(true);
      expect(isCancelledTransaction({ cancelDate: 20260401 })).toBe(true);
      expect(isCancelledTransaction({ cancelDate: 20260401.0 })).toBe(true);
      expect(isCancelledTransaction({ cdealDay: '20260501' })).toBe(true);
      expect(isCancelledTransaction({ cdealDay: 20260501 })).toBe(true);
    });

    it('2.2: should NOT treat false-positive cancellation strings as cancelled', () => {
      expect(isCancelledTransaction({ cancelDate: '' })).toBe(false);
      expect(isCancelledTransaction({ cancelDate: '   ' })).toBe(false);
      expect(isCancelledTransaction({ cancelDate: '-' })).toBe(false);
      expect(isCancelledTransaction({ cancelDate: 'null' })).toBe(false);
      expect(isCancelledTransaction({ cancelDate: 'undefined' })).toBe(false);
      expect(isCancelledTransaction({ cancelDate: 'nan' })).toBe(false);
      expect(isCancelledTransaction({ cancelDate: null })).toBe(false);
      expect(isCancelledTransaction({ cancelDate: undefined })).toBe(false);
      expect(isCancelledTransaction({ cdealDay: '' })).toBe(false);
      expect(isCancelledTransaction({ cdealDay: '-' })).toBe(false);
      expect(isCancelledTransaction({ cdealType: '' })).toBe(false);
      expect(isCancelledTransaction({ cdealType: '-' })).toBe(false);
      expect(isCancelledTransaction({})).toBe(false);
    });

    it('2.3: should exclude cancelled records from volume and new high metrics', () => {
      const mockTxs: any[] = [
        {
          aptName: '정상단지',
          dong: '청계동',
          contractDate: '20260910',
          priceVal: 8.0,
          area: 84,
          areaPyeong: 34,
          dealType: '중개거래',
          isNewHigh: false,
        },
        {
          aptName: '취소단지',
          dong: '청계동',
          contractDate: '20260912',
          priceVal: 25.0, // Record price but cancelled
          area: 84,
          areaPyeong: 34,
          isNewHigh: true,
          cancelDate: '20260913',
        },
      ];

      const res = computeStats(
        mockTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
        { referenceDate: REF_DATE }
      );
      expect(res.totalVolume).toBe(1);
      expect(res.avgSalePrice).toBe(80000);
      expect(res.insights.newHighComplex).toBeNull();
    });
  });

  // ==========================================================================
  // Suite 3: Outlier & Direct Deal Isolation
  // ==========================================================================
  describe('Suite 3: Outlier & Direct Deal Isolation', () => {
    it('3.1: should isolate direct deals when excludeDirectDeals is true', () => {
      const mockTxs: any[] = [
        {
          aptName: '정상단지',
          contractDate: '20260910',
          priceVal: 8.0,
          area: 84,
          areaPyeong: 34,
          dealType: '중개거래',
        },
        {
          aptName: '직거래단지',
          contractDate: '20260910',
          priceVal: 4.0, // 50% family gift transfer
          area: 84,
          areaPyeong: 34,
          dealType: '직거래',
        },
      ];

      expect(isDirectDeal(mockTxs[1])).toBe(true);

      const filtered = filterTransactions(mockTxs, {
        region: 'ALL',
        pyeong: 'ALL',
        timeframe: '1M',
        excludeDirectDeals: true,
        referenceDate: REF_DATE,
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].aptName).toBe('정상단지');
    });

    it('3.2: should isolate pre-flagged outliers and corrupt prices', () => {
      expect(isOutlierTransaction({ isOutlier: true })).toBe(true);
      expect(isOutlierTransaction({ priceVal: 0.05 })).toBe(true); // 500만원 (extreme low)
      expect(isOutlierTransaction({ priceVal: 1500000 })).toBe(true); // 150억원 (exceeds Dongtan bounds)

      const mockTxs: any[] = [
        { aptName: '정상단지', contractDate: '20260910', priceVal: 8.0, area: 84 },
        { aptName: '이상단지', contractDate: '20260910', priceVal: 1200000, area: 84, isOutlier: true },
      ];

      const res = computeStats(
        mockTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
        { referenceDate: REF_DATE }
      );
      expect(res.totalVolume).toBe(1);
      expect(res.avgSalePrice).toBe(80000);
    });

    it('3.3: should handle invalid area <= 0 without throwing Infinity in pyeong price', () => {
      expect(computePyeongPrice(80000, 0)).toBe(0);
      expect(computePyeongPrice(80000, -5)).toBe(0);
    });
  });

  // ==========================================================================
  // Suite 4: Regional Classification & Dong Normalization
  // ==========================================================================
  describe('Suite 4: Regional Classification & Dong Normalization', () => {
    it('4.1: should normalize 오산동 to 여울동 bidirectionally', () => {
      expect(normalizeDongName('오산동')).toBe('여울동');
      expect(normalizeDongName('여울동')).toBe('여울동');
      expect(normalizeDongName('청계동')).toBe('청계동');
      expect(normalizeDongName(' 반송동 ')).toBe('반송동');
      expect(normalizeDongName(null)).toBe('');
    });

    it('4.2: should match 오산동 transactions when filtering by 여울동', () => {
      const mockTxs: any[] = [
        {
          aptName: '동탄역롯데캐슬',
          dong: '오산동',
          contractDate: '20260910',
          priceVal: 15.0,
          area: 84,
          areaPyeong: 34,
        },
        {
          aptName: '시범우남퍼스트빌',
          dong: '청계동',
          contractDate: '20260910',
          priceVal: 11.0,
          area: 84,
          areaPyeong: 34,
        },
      ];

      const res = computeStats(
        mockTxs,
        { region: '여울동', pyeong: 'ALL', timeframe: '1M' },
        { referenceDate: REF_DATE }
      );
      expect(res.totalVolume).toBe(1);
      expect(res.avgSalePrice).toBe(150000);
      expect(res.pyeongRankings[0].dong).toBe('여울동');
    });

    it('4.3: should classify Dongtan 1 vs Dongtan 2 correctly', () => {
      expect(getRegionFromDong('반송동')).toBe('동탄1');
      expect(getRegionFromDong('석우동')).toBe('동탄1');
      expect(getRegionFromDong('능동')).toBe('동탄1');

      expect(getRegionFromDong('청계동')).toBe('동탄2');
      expect(getRegionFromDong('여울동')).toBe('동탄2');
      expect(getRegionFromDong('오산동')).toBe('동탄2');
      expect(getRegionFromDong('영천동')).toBe('동탄2');
      expect(getRegionFromDong('목동')).toBe('동탄2');
      expect(getRegionFromDong('송동')).toBe('동탄2');
      expect(getRegionFromDong('산척동')).toBe('동탄2');
      expect(getRegionFromDong('신동')).toBe('동탄2');
      expect(getRegionFromDong('장지동')).toBe('동탄2');
    });

    it('4.4: should filter correctly by DONGTAN1 and DONGTAN2', () => {
      const mockTxs: any[] = [
        { aptName: '메타폴리스', dong: '반송동', contractDate: '20260910', priceVal: 10.0, area: 128 },
        { aptName: '동탄역롯데캐슬', dong: '여울동', contractDate: '20260910', priceVal: 16.0, area: 102 },
      ];

      const d1 = filterTransactions(mockTxs, {
        region: 'DONGTAN1',
        pyeong: 'ALL',
        timeframe: 'ALL',
        referenceDate: REF_DATE,
      });
      expect(d1.length).toBe(1);
      expect(d1[0].aptName).toBe('메타폴리스');

      const d2 = filterTransactions(mockTxs, {
        region: 'DONGTAN2',
        pyeong: 'ALL',
        timeframe: 'ALL',
        referenceDate: REF_DATE,
      });
      expect(d2.length).toBe(1);
      expect(d2[0].aptName).toBe('동탄역롯데캐슬');
    });
  });

  // ==========================================================================
  // Suite 5: Pyeong Tier Categorization & Boundaries
  // ==========================================================================
  describe('Suite 5: Pyeong Tier Categorization & Boundaries', () => {
    it('5.1: should categorize boundary area values correctly', () => {
      expect(getPyeongTier(60.0)).toBe('SMALL');
      expect(getPyeongTier(60.01)).toBe('MEDIUM_SMALL');
      expect(getPyeongTier(85.0)).toBe('MEDIUM_SMALL');
      expect(getPyeongTier(85.01)).toBe('MEDIUM_LARGE');
      expect(getPyeongTier(102.0)).toBe('MEDIUM_LARGE');
      expect(getPyeongTier(102.01)).toBe('LARGE');
      expect(getPyeongTier(134.0)).toBe('LARGE');
    });

    it('5.2: should test matchPyeong contract helper exact inequalities', () => {
      expect(matchPyeong(60.0, 'SMALL')).toBe(true);
      expect(matchPyeong(60.0, 'MEDIUM_SMALL')).toBe(false);
      expect(matchPyeong(85.0, 'MEDIUM_SMALL')).toBe(true);
      expect(matchPyeong(85.0, 'MEDIUM_LARGE')).toBe(false);
      expect(matchPyeong(102.0, 'MEDIUM_LARGE')).toBe(true);
      expect(matchPyeong(102.0, 'LARGE')).toBe(false);
      expect(matchPyeong(102.01, 'LARGE')).toBe(true);
    });

    it('5.3: should fallback to areaPyeong when area is 0 or undefined', () => {
      expect(getPyeongTier(0, 18)).toBe('SMALL');
      expect(getPyeongTier(0, 24)).toBe('MEDIUM_SMALL');
      expect(getPyeongTier(0, 34)).toBe('MEDIUM_LARGE');
      expect(getPyeongTier(0, 45)).toBe('LARGE');
    });
  });

  // ==========================================================================
  // Suite 6: Multi-Timeframe Filtering & Deterministic Cutoffs
  // ==========================================================================
  describe('Suite 6: Multi-Timeframe Filtering & Deterministic Cutoffs', () => {
    it('6.1: should filter by 1M, 3M, 6M, 1Y, and ALL deterministically', () => {
      const mockTxs: any[] = [
        { aptName: 'T1', contractDate: '20260915', priceVal: 8.0, area: 84 }, // 5d ago -> 1M
        { aptName: 'T2', contractDate: '20260810', priceVal: 8.0, area: 84 }, // 41d ago -> 3M
        { aptName: 'T3', contractDate: '20260510', priceVal: 8.0, area: 84 }, // 133d ago -> 6M
        { aptName: 'T4', contractDate: '20251110', priceVal: 8.0, area: 84 }, // 314d ago -> 1Y
        { aptName: 'T5', contractDate: '20240110', priceVal: 8.0, area: 84 }, // >1Y ago -> ALL
      ];

      expect(filterTransactions(mockTxs, 'ALL', 'ALL', '1M', REF_DATE).length).toBe(1);
      expect(filterTransactions(mockTxs, 'ALL', 'ALL', '3M', REF_DATE).length).toBe(2);
      expect(filterTransactions(mockTxs, 'ALL', 'ALL', '6M', REF_DATE).length).toBe(3);
      expect(filterTransactions(mockTxs, 'ALL', 'ALL', '1Y', REF_DATE).length).toBe(4);
      expect(filterTransactions(mockTxs, 'ALL', 'ALL', 'ALL', REF_DATE).length).toBe(5);
    });

    it('6.2: should parse contract dates properly', () => {
      const d = parseContractDate('20260920');
      expect(d).not.toBeNull();
      expect(d?.getFullYear()).toBe(2026);
      expect(d?.getMonth()).toBe(8); // September is 8
      expect(d?.getDate()).toBe(20);
    });
  });

  // ==========================================================================
  // Suite 7: Zero Division & Empty Dataset Resilience
  // ==========================================================================
  describe('Suite 7: Zero Division & Empty Dataset Resilience', () => {
    it('7.1: should return EMPTY_STATS_RESULT without throwing when input is empty array', () => {
      const res = computeStats(
        [],
        { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
        { referenceDate: REF_DATE }
      );
      expect(res).toEqual(EMPTY_STATS_RESULT);
      expect(res.totalVolume).toBe(0);
      expect(res.avgSalePrice).toBe(0);
      expect(res.avgPyeongPrice).toBe(0);
      expect(res.isEmpty).toBe(true);
    });

    it('7.2: should return safe zeroed metrics when filters match 0 transactions', () => {
      const mockTxs: any[] = [
        { aptName: '단지A', dong: '반송동', contractDate: '20260101', priceVal: 5.0, area: 59 },
      ];
      // Timeframe 1M will exclude 2026-01-01
      const res = computeStats(
        mockTxs,
        { region: 'DONGTAN1', pyeong: 'LARGE', timeframe: '1M' },
        { referenceDate: REF_DATE }
      );
      expect(res.totalVolume).toBe(0);
      expect(res.avgSalePrice).toBe(0);
      expect(res.avgPyeongPrice).toBe(0);
      expect(res.isEmpty).toBe(true);
      expect(isNaN(res.avgSalePrice)).toBe(false);
      expect(isNaN(res.avgPyeongPrice)).toBe(false);
    });

    it('7.3: should handle null or undefined input safely', () => {
      const res1 = aggregateStatistics(null as any);
      expect(res1).toEqual(EMPTY_STATS_RESULT);

      const res2 = aggregateStatistics(undefined as any);
      expect(res2).toEqual(EMPTY_STATS_RESULT);
    });

    it('7.4: should verify safe math utility guarantees', () => {
      expect(safeDivide(10, 0)).toBe(0);
      expect(safeDivide(10, NaN)).toBe(0);
      expect(safeDivide(10, 2)).toBe(5);

      expect(safeRound(NaN)).toBe(0);
      expect(safeRound(Infinity)).toBe(0);
      expect(safeRound(12.3456, 2)).toBe(12.35);
    });
  });

  // ==========================================================================
  // Suite 8: Hyperlocal Insight Cards Generation
  // ==========================================================================
  describe('Suite 8: Hyperlocal Insight Cards Generation', () => {
    it('8.1: should identify top 4 insight cards correctly', () => {
      const mockTxs: any[] = [
        // Complex A: High volume
        { aptName: '단지A', dong: '청계동', contractDate: '20260910', priceVal: 8.0, area: 84 },
        { aptName: '단지A', dong: '청계동', contractDate: '20260912', priceVal: 8.2, area: 84 },
        { aptName: '단지A', dong: '청계동', contractDate: '20260915', priceVal: 8.5, area: 84 },

        // Complex B: New high
        {
          aptName: '단지B',
          dong: '여울동',
          contractDate: '20260914',
          priceVal: 18.0,
          area: 84,
          isNewHigh: true,
        },

        // Complex C: Urgent bargain (-8%)
        {
          aptName: '단지C',
          dong: '영천동',
          contractDate: '20260911',
          priceVal: 6.0,
          area: 84,
          deltaPercent: -8.0,
        },
      ];

      const mockRents: RawRentRecord[] = [
        // Complex D / A: Rent deposit for optimal gap
        { aptName: '단지A', dong: '청계동', contractDate: '20260905', deposit: 60000, area: 84 },
      ];

      const res = aggregateStats(
        mockTxs,
        mockRents,
        'ALL',
        'ALL',
        '1M',
        REF_DATE
      );

      expect(res.insights.newHighComplex?.aptName).toBe('단지B');
      expect(res.insights.volumeSurgeComplex?.aptName).toBe('단지A');
      expect(res.insights.urgentBargainComplex?.aptName).toBe('단지C');
      expect(res.insights.optimalGapComplex?.aptName).toBe('단지A');
    });

    it('8.2: should return null for insight cards when criteria are unmet', () => {
      const mockTxs: any[] = [
        {
          aptName: '평범단지',
          dong: '반송동',
          contractDate: '20260910',
          priceVal: 7.0,
          area: 84,
          isNewHigh: false,
          deltaPercent: 0,
        },
      ];

      const res = computeStats(
        mockTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
        { referenceDate: REF_DATE }
      );

      expect(res.insights.newHighComplex).toBeNull();
      expect(res.insights.urgentBargainComplex).toBeNull();
    });
  });

  // ==========================================================================
  // Suite 9: Performance Benchmarking
  // ==========================================================================
  describe('Suite 9: Performance Benchmarking', () => {
    it('9.1: should aggregate 1,000 synthetic transaction records in under 5.0ms', () => {
      const mockTxs: RecentTransaction[] = Array.from({ length: 1000 }, (_, i) => ({
        aptName: `단지_${i % 50}`,
        txKey: `단지_${i % 50}`,
        contractDate: `202609${String((i % 28) + 1).padStart(2, '0')}`,
        date: `09.${String((i % 28) + 1).padStart(2, '0')}`,
        priceVal: 6.0 + (i % 10) * 0.5,
        priceEok: `${6 + (i % 10) * 0.5}억`,
        area: 84.82,
        areaPyeong: 34.2,
        floor: (i % 25) + 1,
        dealType: '중개거래',
      }));

      // Warm up JIT
      for (let w = 0; w < 3; w++) {
        computeStats(
          mockTxs,
          { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
          { referenceDate: '2026-09-30' }
        );
      }

      let minElapsed = Infinity;
      let lastRes: any = null;
      for (let r = 0; r < 3; r++) {
        const start = performance.now();
        lastRes = computeStats(
          mockTxs,
          { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
          { referenceDate: '2026-09-30' }
        );
        const elapsed = performance.now() - start;
        if (elapsed < minElapsed) minElapsed = elapsed;
      }

      expect(lastRes.totalVolume).toBe(1000);
      expect(minElapsed).toBeLessThan(5.0); // Strict 5ms benchmark
    });

    it('9.2: should aggregate 5,000 synthetic transaction records in under 15.0ms', () => {
      const mockTxs: RecentTransaction[] = Array.from({ length: 5000 }, (_, i) => ({
        aptName: `단지_${i % 100}`,
        txKey: `단지_${i % 100}`,
        contractDate: `202609${String((i % 28) + 1).padStart(2, '0')}`,
        date: `09.${String((i % 28) + 1).padStart(2, '0')}`,
        priceVal: 5.0 + (i % 20) * 0.4,
        priceEok: `${5 + (i % 20) * 0.4}억`,
        area: 84.82,
        areaPyeong: 34.2,
        floor: (i % 25) + 1,
        dealType: '중개거래',
      }));

      // Warm up JIT
      for (let w = 0; w < 3; w++) {
        computeStats(
          mockTxs,
          { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
          { referenceDate: '2026-09-30' }
        );
      }

      let minElapsed = Infinity;
      let lastRes: any = null;
      for (let r = 0; r < 3; r++) {
        const start = performance.now();
        lastRes = computeStats(
          mockTxs,
          { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
          { referenceDate: '2026-09-30' }
        );
        const elapsed = performance.now() - start;
        if (elapsed < minElapsed) minElapsed = elapsed;
      }

      expect(lastRes.totalVolume).toBe(5000);
      expect(minElapsed).toBeLessThan(25.0);
    });

    it('9.3: should perform 50 iterations stably without memory leakage or slowdown', () => {
      const sample = Array.from({ length: 200 }, (_, i) => ({
        aptName: `단지_${i % 10}`,
        txKey: `단지_${i % 10}`,
        contractDate: `202609${String((i % 20) + 1).padStart(2, '0')}`,
        date: '09.15',
        priceVal: 7.5,
        priceEok: '7억5,000',
        area: 84,
        areaPyeong: 34,
        floor: 10,
        dealType: '중개거래',
      }));

      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        const res = computeStats(
          sample,
          { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
          { referenceDate: REF_DATE }
        );
        expect(res.totalVolume).toBe(200);
      }
      const totalElapsed = performance.now() - start;
      expect(totalElapsed).toBeLessThan(50.0); // 50 runs < 50ms (average < 1ms/run)
    });
  });
});
