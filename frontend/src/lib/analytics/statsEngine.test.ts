/**
 * @module statsEngine.test
 * @description Comprehensive unit test suite for Dongtan Real Estate Statistics Analysis Engine.
 * Tests 9 complete suites covering mathematics, sanitization, categorization,
 * zero division defense, edge cases, and performance benchmarking.
 */

import fs from 'fs';
import path from 'path';
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
      expect(res.insights.optimalGapComplex?.aptName).toBe('단지B');
      expect(res.insights.optimalGapComplex?.highestPyeongPrice).toBeGreaterThan(7000);
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

    it('8.3: should track peak per-pyeong transaction specs independently from peak total price transaction', () => {
      const mockTxs: any[] = [
        // Complex Z: Tx 1 has higher total price (17.0억, 112㎡ -> ~5,018만/평)
        {
          aptName: '복합평형단지',
          dong: '오산동',
          contractDate: '20260910',
          priceVal: 17.0,
          area: 112,
          floor: 10,
          isNewHigh: true,
        },
        // Complex Z: Tx 2 has lower total price (12.5억) but higher per-pyeong price (59㎡ -> ~7,004만/평)
        {
          aptName: '복합평형단지',
          dong: '오산동',
          contractDate: '20260918',
          priceVal: 12.5,
          area: 59,
          floor: 25,
          isNewHigh: false,
        },
      ];

      const res = computeStats(
        mockTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
        { referenceDate: REF_DATE }
      );

      // 1st card (최고 거래가) should reflect the 17.0억 (112㎡, 10층) transaction
      expect(res.insights.newHighComplex?.aptName).toBe('복합평형단지');
      expect(res.insights.newHighComplex?.highestPrice).toBe(170000);
      expect(res.insights.newHighComplex?.highestArea).toBe(112);
      expect(res.insights.newHighComplex?.highestFloor).toBe(10);
      expect(res.insights.newHighComplex?.highestContractDate).toBe('20260910');

      // 2nd card (최고 평당가) should reflect the 12.5억 (59㎡, 25층) transaction
      expect(res.insights.optimalGapComplex?.aptName).toBe('복합평형단지');
      expect(res.insights.optimalGapComplex?.highestPyeongPrice).toBe(Math.round(125000 / (59 / 3.305785)));
      expect(res.insights.optimalGapComplex?.highestPrice).toBe(125000);
      expect(res.insights.optimalGapComplex?.highestArea).toBe(59);
      expect(res.insights.optimalGapComplex?.highestFloor).toBe(25);
      expect(res.insights.optimalGapComplex?.highestContractDate).toBe('20260918');
    });

    it('8.4: should not contaminate optimalGapComplex floor or areaPyeong from a different transaction or summaryMap', () => {
      const mockTxs: any[] = [
        // Tx 1 (highest total price): 112㎡ (34평), 10층, 17.0억
        {
          aptName: '복합평형단지',
          dong: '오산동',
          contractDate: '20260910',
          priceVal: 17.0,
          area: 112,
          areaPyeong: 34,
          floor: 10,
          isNewHigh: true,
        },
        // Tx 2 (highest per-pyeong price): 59㎡ (areaPyeong and floor omitted), 12.5억
        {
          aptName: '복합평형단지',
          dong: '오산동',
          contractDate: '20260918',
          priceVal: 12.5,
          area: 59,
          isNewHigh: false,
        },
      ];

      const summaryMap: any = {
        복합평형단지: {
          dong: '여울동',
          latestArea: 34,
          latestFloor: 10,
          latestDate: '20260910',
          latestPrice: 170000,
        },
      };

      const res = computeStats(
        mockTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
        { referenceDate: REF_DATE, summaryMap }
      );

      expect(res.insights.optimalGapComplex?.highestArea).toBe(59);
      expect(res.insights.optimalGapComplex?.highestAreaPyeong).toBeUndefined();
      expect(res.insights.optimalGapComplex?.highestFloor).toBeUndefined();
      expect(res.insights.optimalGapComplex?.highestContractDate).toBe('20260918');
    });

    it('8.5: should tie-break identical per-pyeong and total prices within the same complex by most recent contractDate', () => {
      const mockTxs: any[] = [
        {
          aptName: '동일가격단지',
          dong: '청계동',
          contractDate: '20260902',
          priceVal: 15.0,
          area: 84,
          floor: 5,
          isNewHigh: true,
        },
        {
          aptName: '동일가격단지',
          dong: '청계동',
          contractDate: '20260919',
          priceVal: 15.0,
          area: 84,
          floor: 22,
          isNewHigh: true,
        },
      ];

      const res = computeStats(
        mockTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: '1M' },
        { referenceDate: REF_DATE }
      );

      expect(res.insights.newHighComplex?.highestContractDate).toBe('20260919');
      expect(res.insights.newHighComplex?.highestFloor).toBe(22);
      expect(res.insights.optimalGapComplex?.highestContractDate).toBe('20260919');
      expect(res.insights.optimalGapComplex?.highestFloor).toBe(22);
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

  // ==========================================================================
  // Suite 10: Time-Series Trend & SummaryMap Dong Resolution (Regression Defense)
  // ==========================================================================
  describe('Suite 10: Time-Series Trend & SummaryMap Dong Resolution', () => {
    it('10.1: should NOT leak historical macroTrend months without sale transactions into timeSeriesTrend, and should forward-fill LKG rent for newer months', () => {
      const mockTxs: RawTransactionRecord[] = [
        {
          aptName: '동탄역롯데캐슬',
          txKey: '화성시 오산동 동탄역롯데캐슬',
          contractDate: '20260725',
          date: '07.25',
          priceVal: 15.0, // 150,000만원
          area: 84.9,
          areaPyeong: 34,
          floor: 20,
          dealType: '중개거래',
        },
        {
          aptName: '동탄역롯데캐슬',
          txKey: '화성시 오산동 동탄역롯데캐슬',
          contractDate: '20260815',
          date: '08.15',
          priceVal: 15.5, // 155,000만원
          area: 84.9,
          areaPyeong: 34,
          floor: 22,
          dealType: '중개거래',
        },
        {
          aptName: '동탄역롯데캐슬',
          txKey: '화성시 오산동 동탄역롯데캐슬',
          contractDate: '20260912',
          date: '09.12',
          priceVal: 16.0, // 160,000만원
          area: 84.9,
          areaPyeong: 34,
          floor: 25,
          dealType: '중개거래',
        },
        {
          aptName: '동탄역롯데캐슬',
          txKey: '화성시 오산동 동탄역롯데캐슬',
          contractDate: '20261010',
          date: '10.10',
          priceVal: 16.5, // 165,000만원
          area: 84.9,
          areaPyeong: 34,
          floor: 28,
          dealType: '중개거래',
        },
      ];

      const mockMacroTrend: any[] = [
        { month: '11.06', '동탄 아파트 매매 평균': '3억2,000', '동탄 아파트 전세 평균': '1억9,297' },
        { month: '18.12', '동탄 아파트 매매 평균': '5억1,000', '동탄 아파트 전세 평균': '3억1,000' },
        { month: '26.07', '동탄 아파트 매매 평균': '8억1,000', '동탄 아파트 전세 평균': '4억3,500' },
        { month: '26.08', '동탄 아파트 매매 평균': '8억2,283', '동탄 아파트 전세 평균': '4억4,158' },
      ];

      const res = aggregateStatistics(
        mockTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: '3M', sort: 'PYEONG_DESC' },
        { referenceDate: '2026-10-16', macroTrend: mockMacroTrend }
      );

      const months = res.timeSeriesTrend.map((pt) => pt.date);
      expect(months).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
      expect(months).not.toContain('2011-06');
      expect(months).not.toContain('2018-12');

      // Every point in timeSeriesTrend must have positive avgSalePrice and volume
      for (const pt of res.timeSeriesTrend) {
        expect(pt.avgSalePrice).toBeGreaterThan(0);
        expect(pt.volume).toBeGreaterThan(0);
      }

      // Check exact rent matching for 2026-07 and 2026-08, and LKG forward-fill for 2026-09 and 2026-10
      const pt07 = res.timeSeriesTrend.find((p) => p.date === '2026-07')!;
      const pt08 = res.timeSeriesTrend.find((p) => p.date === '2026-08')!;
      const pt09 = res.timeSeriesTrend.find((p) => p.date === '2026-09')!;
      const pt10 = res.timeSeriesTrend.find((p) => p.date === '2026-10')!;

      expect(pt07.avgRentDeposit).toBe(43500);
      expect(pt08.avgRentDeposit).toBe(44158);
      expect(pt09.avgRentDeposit).toBe(44158); // Forward-filled from 26.08 instead of dropping to 0
      expect(pt10.avgRentDeposit).toBe(44158); // Forward-filled from 26.08 instead of dropping to 0
    });

    it('10.2: should resolve dong via summaryMap when raw transaction record omits dong property', () => {
      const mockTxsWithoutDong: RawTransactionRecord[] = [
        {
          aptName: '동탄역롯데캐슬',
          txKey: '화성시 오산동 동탄역롯데캐슬',
          contractDate: '20261010',
          date: '10.10',
          priceVal: 16.0,
          area: 84.9,
          areaPyeong: 34,
          floor: 25,
          dealType: '중개거래',
        },
        {
          aptName: '시범다은마을월드메르디앙반도유보라',
          txKey: '화성시 반송동 시범다은마을월드메르디앙반도유보라',
          contractDate: '20261011',
          date: '10.11',
          priceVal: 8.5,
          area: 84.8,
          areaPyeong: 33,
          floor: 12,
          dealType: '중개거래',
        },
      ];

      const mockSummaryMap: Record<string, any> = {
        '화성시 오산동 동탄역롯데캐슬': { dong: '여울동', latestPriceEok: 16.0 },
        '화성시 반송동 시범다은마을월드메르디앙반도유보라': { dong: '반송동', latestPriceEok: 8.5 },
      };

      const resDongtan1 = aggregateStatistics(
        mockTxsWithoutDong,
        { region: 'DONGTAN1', pyeong: 'ALL', timeframe: '3M', sort: 'PYEONG_DESC' },
        { referenceDate: '2026-10-16', summaryMap: mockSummaryMap }
      );
      expect(resDongtan1.totalVolume).toBe(1);
      expect(resDongtan1.avgSalePrice).toBe(85000);

      const resDongtan2 = aggregateStatistics(
        mockTxsWithoutDong,
        { region: 'DONGTAN2', pyeong: 'ALL', timeframe: '3M', sort: 'PYEONG_DESC' },
        { referenceDate: '2026-10-16', summaryMap: mockSummaryMap }
      );
      expect(resDongtan2.totalVolume).toBe(1);
      expect(resDongtan2.avgSalePrice).toBe(160000);
    });

    it('10.3: should accurately aggregate production public/data/*.json files without zero-sale history leak or zero-rent drop', () => {
      const dataDir = path.resolve(__dirname, '../../../public/data');
      const recentTxs = JSON.parse(fs.readFileSync(path.join(dataDir, 'recent-transactions.json'), 'utf8'));
      const macroTrend = JSON.parse(fs.readFileSync(path.join(dataDir, 'macro-trend.json'), 'utf8'));
      const txSummaryRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'tx-summary.json'), 'utf8'));
      const summaryMap = txSummaryRaw.summary || txSummaryRaw;

      const resAll = aggregateStatistics(
        { transactions: recentTxs, macroTrend, summaryMap },
        { region: 'ALL', pyeong: 'ALL', timeframe: '3M', sort: 'PYEONG_DESC' }
      );

      expect(resAll.timeSeriesTrend.map((p) => p.date)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
      for (const pt of resAll.timeSeriesTrend) {
        expect(pt.avgSalePrice).toBeGreaterThan(0);
        expect(pt.avgRentDeposit).toBeGreaterThan(0);
        expect(pt.volume).toBeGreaterThan(0);
      }

      const resD1 = aggregateStatistics(
        { transactions: recentTxs, macroTrend, summaryMap },
        { region: 'DONGTAN1', pyeong: 'ALL', timeframe: '3M', sort: 'PYEONG_DESC' }
      );
      const resD2 = aggregateStatistics(
        { transactions: recentTxs, macroTrend, summaryMap },
        { region: 'DONGTAN2', pyeong: 'ALL', timeframe: '3M', sort: 'PYEONG_DESC' }
      );

      expect(resD1.totalVolume).toBeGreaterThan(0);
      expect(resD2.totalVolume).toBeGreaterThan(0);
      expect(resD1.totalVolume + resD2.totalVolume).toBe(resAll.totalVolume);
    });

    it('10.4: should normalize hyphenated and malformed contractDate strings when deriving maxDate without referenceDate', () => {
      const mixedFormatTxs: RawTransactionRecord[] = [
        {
          aptName: '구축단지',
          dong: '반송동',
          contractDate: '2020-01-10',
          priceVal: 5.0,
          area: 84,
        },
        {
          aptName: '신축단지',
          dong: '여울동',
          contractDate: '2026-09-15',
          priceVal: 12.0,
          area: 84,
        },
        {
          aptName: '오류단지',
          dong: '여울동',
          contractDate: 'corrupted_date',
          priceVal: 9.0,
          area: 84,
        },
      ];

      // Without explicit referenceDate, maxDate must resolve to 20260915 (2026-09-15)
      const filtered1M = filterTransactions(mixedFormatTxs, {
        region: 'ALL',
        pyeong: 'ALL',
        timeframe: '1M',
      });
      expect(filtered1M.length).toBe(1);
      expect(filtered1M[0].aptName).toBe('신축단지');

      const agg1M = aggregateStatistics(mixedFormatTxs, {
        region: 'ALL',
        pyeong: 'ALL',
        timeframe: '1M',
        sort: 'PYEONG_DESC',
      });
      expect(agg1M.totalVolume).toBe(1);
      expect(agg1M.timeSeriesTrend.map((pt) => pt.date)).toEqual(['2026-09']);
    });

    it('10.5: should forward-fill LKG rent when filtered transactions start on a gap month prior to latestMacroYm', () => {
      const gapMonthTxs: RawTransactionRecord[] = [
        {
          aptName: '동탄역롯데캐슬',
          dong: '여울동',
          contractDate: '20260815',
          priceVal: 15.0,
          area: 84,
        },
        {
          aptName: '동탄역롯데캐슬',
          dong: '여울동',
          contractDate: '20260915',
          priceVal: 16.0,
          area: 84,
        },
      ];

      // Macro trend has 26.07 and 26.09, with a gap at 26.08
      const sparseMacro: any[] = [
        { month: '26.07', '동탄 아파트 매매 평균': '8억1,000', '동탄 아파트 전세 평균': '4억3,500' },
        { month: '26.09', '동탄 아파트 매매 평균': '8억3,000', '동탄 아파트 전세 평균': '4억4,500' },
      ];

      const agg = aggregateStatistics(
        gapMonthTxs,
        { region: 'ALL', pyeong: 'ALL', timeframe: '3M', sort: 'PYEONG_DESC' },
        { referenceDate: '2026-09-20', macroTrend: sparseMacro }
      );

      expect(agg.timeSeriesTrend.map((p) => p.date)).toEqual(['2026-08', '2026-09']);
      expect(agg.timeSeriesTrend[0].avgRentDeposit).toBe(43500);
      expect(agg.timeSeriesTrend[1].avgRentDeposit).toBe(44500);

      const standaloneTrend = computeMacroTimeSeries(gapMonthTxs, [], sparseMacro);
      expect(standaloneTrend.map((p) => p.date)).toEqual(['2026-08', '2026-09']);
      expect(standaloneTrend[0].avgRentDeposit).toBe(43500);
      expect(standaloneTrend[1].avgRentDeposit).toBe(44500);
    });

    it('10.6: should resolve dong via summaryMap and respect filters.dong across standalone helper functions', () => {
      const txsNoDong: RawTransactionRecord[] = [
        {
          aptKey: 'key-yeoul',
          aptName: '동탄역롯데캐슬',
          contractDate: '20260910',
          priceVal: 16.0,
          area: 84.9,
        },
        {
          aptKey: 'key-bansong',
          aptName: '메타폴리스',
          contractDate: '20260912',
          priceVal: 12.0,
          area: 128.0,
        },
      ];

      const summaryMap: Record<string, any> = {
        'key-yeoul': { dong: '여울동', latestPriceEok: 16.0 },
        'key-bansong': { dong: '반송동', latestPriceEok: 12.0 },
      };

      const filteredDong = filterTransactions(
        txsNoDong,
        { region: 'DONGTAN2', dong: '여울동', pyeong: 'ALL', timeframe: 'ALL', referenceDate: REF_DATE },
        undefined,
        undefined,
        summaryMap
      );
      expect(filteredDong.length).toBe(1);
      expect(filteredDong[0].aptName).toBe('동탄역롯데캐슬');

      const rankings = computeComplexRankings(txsNoDong, [], 'PYEONG_DESC', 20, summaryMap);
      expect(rankings.find((r) => r.aptName === '동탄역롯데캐슬')?.dong).toBe('여울동');
      expect(rankings.find((r) => r.aptName === '메타폴리스')?.dong).toBe('반송동');

      const distDong = computeVolumeDistribution(txsNoDong, 'DONG', summaryMap);
      expect(distDong.find((d) => d.name === '여울동')?.value).toBe(1);
      expect(distDong.find((d) => d.name === '반송동')?.value).toBe(1);

      const distRegion = computeVolumeDistribution(txsNoDong, 'REGION', summaryMap);
      expect(distRegion.find((d) => d.name === '동탄2')?.value).toBe(1);
      expect(distRegion.find((d) => d.name === '동탄1')?.value).toBe(1);
    });

    it('10.7: should prevent LRU cache collision when options (referenceDate, excludeDirectDeals, rankLimit) differ on identical txs array', () => {
      const sharedTxs: RawTransactionRecord[] = [
        {
          aptName: '단지A',
          dong: '여울동',
          contractDate: '20260915',
          priceVal: 10.0,
          area: 84,
          dealType: '직거래',
        },
        {
          aptName: '단지B',
          dong: '여울동',
          contractDate: '20260915',
          priceVal: 12.0,
          area: 84,
          dealType: '중개거래',
        },
      ];

      const filters = { region: 'ALL' as const, pyeong: 'ALL' as const, timeframe: '1M' as const, sort: 'PYEONG_DESC' as const };

      const withDirect = aggregateStatistics(sharedTxs, filters, {
        referenceDate: '2026-09-20',
        excludeDirectDeals: false,
        rankLimit: 20,
      });
      const withoutDirect = aggregateStatistics(sharedTxs, filters, {
        referenceDate: '2026-09-20',
        excludeDirectDeals: true,
        rankLimit: 20,
      });
      const futureRef = aggregateStatistics(sharedTxs, filters, {
        referenceDate: '2026-12-25',
        excludeDirectDeals: false,
        rankLimit: 20,
      });
      const rankLimit1 = aggregateStatistics(sharedTxs, filters, {
        referenceDate: '2026-09-20',
        excludeDirectDeals: false,
        rankLimit: 1,
      });

      expect(withDirect.totalVolume).toBe(2);
      expect(withoutDirect.totalVolume).toBe(1);
      expect(futureRef.totalVolume).toBe(0);
      expect(rankLimit1.pyeongRankings.length).toBe(1);
    });

    it('10.8: should include 동탄역롯데캐슬 at 6,276만원/평 (supply pyeong basis) in 3M TOP 20 rankings (#1) and resolve normalized summaryMap keys', () => {
      const dataDir = path.resolve(__dirname, '../../../public/data');
      const recentTxs = JSON.parse(fs.readFileSync(path.join(dataDir, 'recent-transactions.json'), 'utf8'));
      const txs1y = JSON.parse(fs.readFileSync(path.join(dataDir, 'transactions-1y.json'), 'utf8'));
      const txSummaryRaw = JSON.parse(fs.readFileSync(path.join(dataDir, 'tx-summary.json'), 'utf8'));
      const summaryMap = txSummaryRaw.summary || txSummaryRaw;

      expect(summaryMap['동탄역롯데캐슬']).toBeDefined();
      expect(summaryMap['동탄역롯데캐슬'].avg1MPerPyeong).toBe(6276);

      const res3M = aggregateStatistics(
        { transactions: recentTxs, summaryMap },
        { region: 'ALL', pyeong: 'ALL', timeframe: '3M', sort: 'PYEONG_DESC' },
        { rankLimit: 25 }
      );
      const lotte3M = res3M.pyeongRankings.find((r) => r.aptName === '동탄역롯데캐슬');
      expect(lotte3M).toBeDefined();
      expect(lotte3M?.avgPyeongPrice).toBe(6276);
      expect(lotte3M?.dong).toBe('여울동');
      expect(res3M.pyeongRankings[0].aptName).toBe('동탄역롯데캐슬');

      // Verify all 8 target complexes in e1 appear in 3M TOP 20 rankings
      const requiredTopComplexes = [
        '더샵센트럴시티',
        '동탄역시범한화꿈에그린프레스티지',
        '동탄역반도유보라아이비파크6.0',
        '동탄역예미지시그너스',
        '동탄역시범대원칸타빌아파트',
        '동탄역시범금강펜테리움센트럴파크3',
        '동탄역삼정그린코아',
        '동탄역시범리슈빌아파트',
      ];
      const top20Names3M = res3M.pyeongRankings.map((r) => r.aptName);
      for (const targetApt of requiredTopComplexes) {
        expect(top20Names3M).toContain(targetApt);
      }

      const res6M = aggregateStatistics(
        { transactions: txs1y, summaryMap },
        { region: 'ALL', pyeong: 'ALL', timeframe: '6M', sort: 'PYEONG_DESC' }
      );
      const lotte6M = res6M.pyeongRankings.find((r) => r.aptName === '동탄역롯데캐슬');
      expect(lotte6M).toBeDefined();
      expect(res6M.pyeongRankings[0].aptName).toBe('동탄역롯데캐슬');
      const top20Names6M = res6M.pyeongRankings.map((r) => r.aptName);
      for (const targetApt of requiredTopComplexes) {
        expect(top20Names6M).toContain(targetApt);
      }

      // Verify getSupplyPyeong HARDCODED_MAPPING resolution
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getSupplyPyeong } = require('../../../pipeline/core/normalizer');
      expect(getSupplyPyeong('동탄역시범더샵센트럴시티', 106.537)).toBe(41.1);

      // Verify findTxKey for 금강펜테리움6차센트럴파크 and new complexes
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { findTxKey } = require('@/lib/utils/apartmentMapping');
      expect(findTxKey('동탄신도시 금강펜테리움 6차', summaryMap)).toBe('금강펜테리움6차센트럴파크');
      expect(findTxKey('엔에이치에프엘크루', summaryMap)).toBe('엔에이치에프엘크루');
      expect(findTxKey('엔에이치에프경남아너스빌', summaryMap)).toBe('엔에이치에프경남아너스빌');
      expect(findTxKey('동탄역자이', summaryMap)).toBe('동탄역자이');

      // Verify 동탄역롯데캐슬 2026 bull-market transactions are not falsely flagged as outliers
      const lotteChunk = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../../../public/tx-data/동탄역롯데캐슬.json'), 'utf8')
      );
      const tx20 = lotteChunk.find((t: any) => t.contractYm === '202606' && t.price === 200000);
      const tx22 = lotteChunk.find((t: any) => t.contractYm === '202606' && t.price === 222500);
      expect(tx20?.isOutlier).toBe(false);
      expect(tx22?.isOutlier).toBe(false);

      // Verify normalized / HARDCODED_MAPPING summaryMap resolution
      const aliasTxs: RawTransactionRecord[] = [
        {
          aptKey: '그린힐반도유보라아이비파크101단지',
          aptName: '그린힐 반도유보라 아이비파크 10(1단지)',
          contractDate: '20261015',
          priceVal: 5.43,
          area: 59.77,
          areaPyeong: 24.5,
        },
      ];
      const aliasSummary: Record<string, any> = {
        '그린힐 반도유보라 아이비파크 10.0': {
          dong: '산척동',
          allTimeHigh: 60000,
          avg3MRentDeposit: 35000,
          avg3MPrice: 54300,
        },
      };
      const aliasRankings = computeComplexRankings(aliasTxs, { summaryMap: aliasSummary });
      expect(aliasRankings[0].dong).toBe('산척동');
      expect(aliasRankings[0].jeonseRatio).toBeGreaterThan(0);
    });
  });
});

