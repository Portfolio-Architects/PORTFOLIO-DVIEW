/**
 * @file valuationModels.challenger.test.ts
 * @description Empirical Challenger Stress Test Suite for Pure Mathematical Models (valuationModels.ts).
 * 
 * Verifies mathematical invariants:
 * 1. DCF under negative rates or extreme discount rates (capRate clamping, non-negative implied values, Gordon growth singularity avoidance).
 * 2. Zero-division defense in conversion rates, PER calculations, and scenario text generators.
 * 3. Outlier and empty transaction arrays in IQR filtering, moving averages, and 1-year gap delta analysis.
 * 4. Coordinate distance edge cases (zero, negative, extreme) in commute calculations.
 * 5. Fast-Check property-based numerical fuzzing across 1,000 parameter vectors.
 */

import fc from 'fast-check';
import {
  calculateUtilityScoreV2,
  calculateCommuteAnalysis,
  calculateTransactionValuationStats,
  calculateConversionRateSpread,
  simulateDCFScenario,
  evaluatePERStatus,
  formatValuationPrice,
  generateScenarioReportText,
  generateCommuteReportText,
  generateValuationJsonLd,
  type TxRecord,
} from './valuationModels';
import { filterOutliersIQR } from '@/lib/utils/outlierFilter';
import type { FieldReportData } from '@/lib/DashboardFacade';

describe('valuationModels Empirical Challenger Stress Suite', () => {
  // =========================================================================
  // 1. DCF Under Extreme and Negative Rates
  // =========================================================================
  describe('1. DCF Extreme Boundaries & Mathematical Invariants', () => {
    it('enforces capRate >= 1.0% and non-negative impliedValue under negative interest rates', () => {
      const negativeRateResult = simulateDCFScenario({
        simBaseRate: -5.0, // Negative rate
        simGrowthRate: 2.0,
        macroConfig: {
          riskFreeRate: -2.0, // Negative risk-free
          fundingCost: -1.0,  // Negative funding
        },
        avg3MRent: 70000,
        avg3MSale: 140000,
        dynamicConversionRate: 0.05,
        commutePremium: 0.1,
      });

      // simRiskFree clamped to >= 0.5, simFunding clamped to >= 1.0
      expect(negativeRateResult.discountRate).toBeGreaterThan(0);
      expect(negativeRateResult.capRate).toBeGreaterThanOrEqual(1.0); // 0.01 * 100
      expect(negativeRateResult.impliedValue).toBeGreaterThan(0);
      expect(Number.isFinite(negativeRateResult.impliedValue)).toBe(true);
      expect(Number.isNaN(negativeRateResult.impliedValue)).toBe(false);
      expect(negativeRateResult.simJeonsePrice).toBeGreaterThanOrEqual(0);
      expect(negativeRateResult.simGap).toBeGreaterThanOrEqual(0);
    });

    it('prevents singularity when growth rate strictly exceeds discount rate (g > r)', () => {
      // In unconstrained Gordon Growth Model D / (r - g), g > r produces negative valuation.
      // Valuation model invariant: capRate is clamped to at least 0.01 (1.0%).
      const highGrowthResult = simulateDCFScenario({
        simBaseRate: 1.0,
        simGrowthRate: 50.0, // Absurdly high 50% growth rate
        macroConfig: {
          riskFreeRate: 1.5,
          fundingCost: 2.0,
        },
        avg3MRent: 60000,
        avg3MSale: 120000,
        dynamicConversionRate: 0.045,
        commutePremium: 10.0,
      });

      expect(highGrowthResult.growthRate).toBe(60.0);
      expect(highGrowthResult.capRate).toBe(1.0); // Clamped at 1.0% (0.01)
      expect(highGrowthResult.impliedValue).toBeGreaterThan(0);
      expect(Number.isFinite(highGrowthResult.impliedValue)).toBe(true);
    });

    it('preserves non-negative jeonse deposit and finite valuation under hyperinflationary rates', () => {
      const extremeRateResult = simulateDCFScenario({
        simBaseRate: 100.0, // 100% rate
        simGrowthRate: 1.0,
        macroConfig: {
          riskFreeRate: 95.0,
          fundingCost: 105.0,
        },
        avg3MRent: 80000,
        avg3MSale: 160000,
        dynamicConversionRate: 0.065,
        commutePremium: 0.0,
      });

      expect(extremeRateResult.discountRate).toBeGreaterThan(100);
      expect(extremeRateResult.capRate).toBeGreaterThan(0);
      expect(extremeRateResult.impliedValue).toBeGreaterThan(0);
      expect(extremeRateResult.simJeonsePrice).toBe(0); // 1 - (100 - 3.25) * 0.06 < 0 -> clamped to 0
      expect(extremeRateResult.simGap).toBe(160000);
      expect(extremeRateResult.simJeonseRatio).toBe(0);
    });

    it('passes fast-check property-based fuzzing across 1,000 random vectors', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -50.0, max: 100.0, noNaN: true }), // simBaseRate
          fc.double({ min: -30.0, max: 50.0, noNaN: true }),  // simGrowthRate
          fc.double({ min: -10.0, max: 50.0, noNaN: true }),  // riskFreeRate
          fc.double({ min: -10.0, max: 50.0, noNaN: true }),  // fundingCost
          fc.integer({ min: 0, max: 10_000_000 }),             // avg3MRent
          fc.integer({ min: 0, max: 50_000_000 }),             // avg3MSale
          fc.double({ min: 0.01, max: 0.20, noNaN: true }),   // dynamicConversionRate
          fc.double({ min: 0.0, max: 5.0, noNaN: true }),     // commutePremium
          (simBaseRate, simGrowthRate, riskFreeRate, fundingCost, avg3MRent, avg3MSale, dynamicConversionRate, commutePremium) => {
            const res = simulateDCFScenario({
              simBaseRate,
              simGrowthRate,
              macroConfig: { riskFreeRate, fundingCost },
              avg3MRent,
              avg3MSale,
              dynamicConversionRate,
              commutePremium,
            });

            expect(Number.isFinite(res.discountRate)).toBe(true);
            expect(Number.isFinite(res.growthRate)).toBe(true);
            expect(res.capRate).toBeGreaterThanOrEqual(1.0);
            expect(Number.isFinite(res.capRate)).toBe(true);
            expect(Number.isFinite(res.impliedValue)).toBe(true);
            expect(res.impliedValue).toBeGreaterThanOrEqual(0);
            expect(Number.isNaN(res.impliedValue)).toBe(false);
            expect(res.simJeonsePrice).toBeGreaterThanOrEqual(0);
            expect(res.simGap).toBeGreaterThanOrEqual(0);
            expect(res.simJeonseRatio).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 1000 }
      );
    });
  });

  // =========================================================================
  // 2. Division by Zero Defense in Conversion Rates & PER Calculations
  // =========================================================================
  describe('2. Division by Zero Defense', () => {
    it('safely handles zero avg3MRent and avg3MSale in calculateTransactionValuationStats', () => {
      // Case A: Empty transactions
      const emptyStats = calculateTransactionValuationStats([]);
      expect(emptyStats.realEstatePER).toBe(0);
      expect(emptyStats.jeonseRatio).toBe(0);
      expect(emptyStats.currentGap).toBe(0);

      // Case B: Sales only (avg3MRent is 0)
      const salesOnlyStats = calculateTransactionValuationStats([
        { dealType: '매매', price: 100000, contractYm: '202604', contractDay: '10' },
      ], new Date('2026-04-15'));
      expect(salesOnlyStats.avg3MSale).toBe(100000);
      expect(salesOnlyStats.avg3MRent).toBe(0);
      expect(salesOnlyStats.realEstatePER).toBe(0); // Protected: does NOT return Infinity
      expect(salesOnlyStats.jeonseRatio).toBe(0);   // Protected: does NOT return 0 / 100000

      // Case C: Rents only (avg3MSale is 0)
      const rentOnlyStats = calculateTransactionValuationStats([
        { dealType: '전세', deposit: 50000, price: 50000, contractYm: '202604', contractDay: '10' },
      ], new Date('2026-04-15'));
      expect(rentOnlyStats.avg3MSale).toBe(0);
      expect(rentOnlyStats.avg3MRent).toBe(50000);
      expect(rentOnlyStats.realEstatePER).toBe(0); // Protected: does NOT divide by 0
      expect(rentOnlyStats.jeonseRatio).toBe(0);   // Protected: does NOT divide by avg3MSale = 0

      // Case D: Zero-price transactions
      const zeroPriceStats = calculateTransactionValuationStats([
        { dealType: '매매', price: 0, contractYm: '202604', contractDay: '10' },
        { dealType: '전세', deposit: 0, price: 0, contractYm: '202604', contractDay: '10' },
      ], new Date('2026-04-15'));
      expect(zeroPriceStats.realEstatePER).toBe(0);
      expect(zeroPriceStats.jeonseRatio).toBe(0);
    });

    it('strictly clamps conversion rate within [0.035, 0.065] even under zero or negative baseRate', () => {
      const zeroBase = calculateConversionRateSpread(undefined, '동탄역 롯데캐슬', 0);
      expect(zeroBase.dynamicConversionRate).toBe(0.035);

      const negativeBase = calculateConversionRateSpread(undefined, '동탄역 롯데캐슬', -0.5);
      expect(negativeBase.dynamicConversionRate).toBe(0.035);

      const excessiveBase = calculateConversionRateSpread(undefined, '동탄역 롯데캐슬', 0.5);
      expect(excessiveBase.dynamicConversionRate).toBe(0.065);
    });

    it('evaluates PER status into categories with zero and negative boundaries', () => {
      expect(evaluatePERStatus(0).category).toBe('insufficient');
      expect(evaluatePERStatus(-10).category).toBe('insufficient');
      expect(evaluatePERStatus(1.39).category).toBe('safe');
      expect(evaluatePERStatus(1.40).category).toBe('stable');
      expect(evaluatePERStatus(1.59).category).toBe('stable');
      expect(evaluatePERStatus(1.60).category).toBe('average');
      expect(evaluatePERStatus(1.79).category).toBe('average');
      expect(evaluatePERStatus(1.80).category).toBe('growth');
      expect(evaluatePERStatus(2.20).category).toBe('growth');
      expect(evaluatePERStatus(2.21).category).toBe('speculative');
      expect(evaluatePERStatus(100.0).category).toBe('speculative');
    });

    it('formats price robustly with zero and sub-eok values', () => {
      expect(formatValuationPrice(0)).toBe('정보 없음');
      expect(formatValuationPrice(50)).toBe('100만');
      expect(formatValuationPrice(9999)).toBe('1억');
      expect(formatValuationPrice(10000)).toBe('1억');
      expect(formatValuationPrice(10500)).toBe('1억 500만');
    });

    it('generates scenario text without zero division when baseFairValue is zero', () => {
      const report = generateScenarioReportText({
        aptName: '무거래 단지',
        simBaseRate: 3.25,
        simGrowthRate: 2.0,
        baseFairValue: 0, // Zero baseline
        simFairValue: 120000,
        simJeonsePrice: 60000,
        simJeonseRatio: 50.0,
        simGap: 60000,
        currentGap: 0,
      });

      expect(report).toContain('변동 없음');
      expect(report).not.toContain('NaN');
      expect(report).not.toContain('Infinity');
    });
  });

  // =========================================================================
  // 3. Outlier and Empty Transaction Arrays in IQR & Moving Averages
  // =========================================================================
  describe('3. Outlier and Empty Arrays in IQR Filtering & Moving Averages', () => {
    it('handles arrays with length < 4 without error in filterOutliersIQR', () => {
      expect(filterOutliersIQR([], (x: number) => x)).toEqual([]);
      expect(filterOutliersIQR([100], (x: number) => x)).toEqual([100]);
      expect(filterOutliersIQR([100, 200], (x: number) => x)).toEqual([100, 200]);
      expect(filterOutliersIQR([100, 200, 300], (x: number) => x)).toEqual([100, 200, 300]);
    });

    it('filters out both extreme downward spikes and upper typos while preserving inliers', () => {
      const prices = [
        10,       // Downward typo/outlier
        100000, 102000, 101000, 103000, 99000, 100500, 101500, 102500,
        10000000, // Upward extreme typo
      ];

      const filtered = filterOutliersIQR(prices, p => p, 1.5, 3.5);
      expect(filtered).not.toContain(10);
      expect(filtered).not.toContain(10000000);
      expect(filtered.length).toBe(8);
    });

    it('handles non-array and null input in calculateTransactionValuationStats', () => {
      // @ts-expect-error Testing runtime resilience
      const resNull = calculateTransactionValuationStats(null);
      expect(resNull.salesCount).toBe(0);
      expect(resNull.avg3MSale).toBe(0);

      // @ts-expect-error Testing runtime resilience
      const resUndefined = calculateTransactionValuationStats(undefined);
      expect(resUndefined.rentsCount).toBe(0);
      expect(resUndefined.avg3MRent).toBe(0);
    });

    it('falls back to latest valid transaction when recent 1M and 3M windows have no trades', () => {
      const oldTxs: TxRecord[] = [
        { dealType: '매매', price: 95000, contractYm: '202401', contractDay: '15' },
        { dealType: '전세', deposit: 45000, price: 45000, contractYm: '202401', contractDay: '10' },
      ];

      // Base date is in 2026, transactions are 2 years old
      const stats = calculateTransactionValuationStats(oldTxs, new Date('2026-04-01'));
      expect(stats.avg1MSale).toBe(95000); // Falls back to latest valid sale
      expect(stats.avg3MSale).toBe(95000);
      expect(stats.avg3MRent).toBe(45000); // Falls back to latest valid rent
      expect(stats.realEstatePER).toBeCloseTo(95000 / 45000, 4);
    });

    it('converts monthly rent to jeonse equivalent using 5.5% conversion constant', () => {
      const rentTxs: TxRecord[] = [
        { dealType: '월세', deposit: 10000, monthlyRent: 150, contractYm: '202604', contractDay: '01' },
      ];
      const stats = calculateTransactionValuationStats(rentTxs, new Date('2026-04-10'));
      // 10000 + Math.round((150 * 12) / 0.055) = 10000 + 32727 = 42727
      expect(stats.avg3MRent).toBe(42727);
    });

    it('calculates 1-year ago gap comparison when transactions in past window exist', () => {
      const baseDate = new Date('2026-04-10');
      const txs: TxRecord[] = [
        // Current window (2026-04)
        { dealType: '매매', price: 150000, contractYm: '202604', contractDay: '01' },
        { dealType: '전세', deposit: 75000, price: 75000, contractYm: '202604', contractDay: '01' },
        // 1-year ago window (2025-04)
        { dealType: '매매', price: 130000, contractYm: '202504', contractDay: '01' },
        { dealType: '전세', deposit: 60000, price: 60000, contractYm: '202504', contractDay: '01' },
      ];

      const stats = calculateTransactionValuationStats(txs, baseDate);
      expect(stats.currentGap).toBe(75000);
      expect(stats.gap1YearAgo).toBe(70000);
      expect(stats.gapDelta).toBe(5000);
    });
  });

  // =========================================================================
  // 4. Negative and Zero Coordinate Distances in Commute Calculations
  // =========================================================================
  describe('4. Coordinate Distances in Commute Calculations', () => {
    it('handles zero subway and tram distance without division by zero', () => {
      const zeroDistMetrics = {
        distanceToSubway: 0,
        distanceToTram: 0,
      };

      const gangnam = calculateCommuteAnalysis(zeroDistMetrics, 'gangnam');
      expect(gangnam.linkTime).toBe(0);
      expect(gangnam.transitTime).toBe(42);
      expect(gangnam.totalTime).toBe(50); // 0 + 42 + 8
      expect(gangnam.savedTime).toBe(10); // 60 - 50
      expect(gangnam.premium).toBeCloseTo(0.15, 4); // 10 * 0.015

      const pangyo = calculateCommuteAnalysis(zeroDistMetrics, 'pangyo');
      expect(pangyo.transitTime).toBe(20);
      expect(pangyo.totalTime).toBe(28);

      const samseong = calculateCommuteAnalysis(zeroDistMetrics, 'samseong');
      expect(samseong.transitTime).toBe(22);
      expect(samseong.totalTime).toBe(30);
    });

    it('falls back to default distances (2000m subway, 1000m tram) when metrics is undefined', () => {
      const defRes = calculateCommuteAnalysis(undefined, 'gangnam');
      // walkToSubway = 2000 / 80 = 25
      // tramToSubway = 1000 / 250 + 5 = 9
      // linkTime = min(25, 9) = 9
      expect(defRes.linkTime).toBe(9);
      expect(defRes.totalTime).toBe(9 + 42 + 8);
    });

    it('remains numerically stable when distances are negative or extreme', () => {
      const negativeDistMetrics = {
        distanceToSubway: -400,
        distanceToTram: -250,
      };

      const res = calculateCommuteAnalysis(negativeDistMetrics, 'gangnam');
      expect(Number.isFinite(res.linkTime)).toBe(true);
      expect(Number.isFinite(res.totalTime)).toBe(true);
      expect(res.savedTime).toBeGreaterThanOrEqual(0);
      expect(res.premium).toBeGreaterThanOrEqual(0);
    });

    it('caps savedTime at 0 when total commute time exceeds 60 minutes', () => {
      const farMetrics = {
        distanceToSubway: 10000, // 10km
        distanceToTram: 10000,
      };

      const res = calculateCommuteAnalysis(farMetrics, 'gangnam');
      // linkTime is large, totalTime > 60
      expect(res.totalTime).toBeGreaterThan(60);
      expect(res.savedTime).toBe(0);
      expect(res.premium).toBe(0);
    });

    it('generates commute report text without missing fields', () => {
      const analysis = calculateCommuteAnalysis({ distanceToSubway: 300 }, 'gangnam');
      const text = generateCommuteReportText({
        aptName: '동탄역 시범우남퍼스트빌',
        destLabel: '강남역',
        analysis,
      });

      expect(text).toContain('동탄역 시범우남퍼스트빌');
      expect(text).toContain('강남역');
      expect(text).toContain('교통 프리미엄');
    });
  });

  // =========================================================================
  // 5. Utility Score V2 & JSON-LD Serialization
  // =========================================================================
  describe('5. Utility Score V2 & JSON-LD Invariants', () => {
    it('applies overrideScore correctly and recalculates adjustedTotal bounded by [0, maxTotal]', () => {
      const mockReport: FieldReportData = {
        id: 'rep-1',
        author: 'admin',
        likes: 0,
        commentCount: 0,
        apartmentName: '동탄역 린스트라우스',
        dong: '오산동',
        metrics: {
          brand: '우미린',
          householdCount: 617,
          yearBuilt: 2018,
          parkingPerHousehold: 1.3,
          far: 200,
          bcr: 15,
          distanceToSubway: 200,
          distanceToElementary: 300,
          distanceToMiddle: 500,
          distanceToHigh: 600,
        },
      };

      const baseScore = calculateUtilityScoreV2(mockReport, 0);
      expect(baseScore.total).toBeGreaterThan(0);
      expect(baseScore.logs.some(l => l.category === '어드민 수동 보정')).toBe(false);

      const positiveOverride = calculateUtilityScoreV2(mockReport, 10);
      expect(positiveOverride.total).toBe(baseScore.total + 10);
      expect(positiveOverride.logs.some(l => l.category === '어드민 수동 보정')).toBe(true);

      const extremeNegativeOverride = calculateUtilityScoreV2(mockReport, -200);
      expect(extremeNegativeOverride.total).toBe(0); // Clamped at 0
    });

    it('generates valid JSON-LD structure or returns null on empty report', () => {
      // @ts-expect-error Testing null report
      expect(generateValuationJsonLd({ report: null, impliedValue: 0, realEstatePER: 0, utilityTotal: 0, utilityMaxTotal: 150, spread: 0 })).toBeNull();

      const validReport: FieldReportData = {
        id: 'rep-2',
        author: 'admin',
        likes: 0,
        commentCount: 0,
        apartmentName: '동탄역 포스코더샵',
        dong: '오산동',
      };

      const jsonStr = generateValuationJsonLd({
        report: validReport,
        impliedValue: 150000,
        realEstatePER: 1.8,
        utilityTotal: 110,
        utilityMaxTotal: 150,
        spread: 0.12,
      });

      expect(jsonStr).not.toBeNull();
      const parsed = JSON.parse(jsonStr!);
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('Place');
      expect(parsed.name).toBe('동탄역 포스코더샵');
      expect(Array.isArray(parsed.additionalProperty)).toBe(true);
    });
  });
});
