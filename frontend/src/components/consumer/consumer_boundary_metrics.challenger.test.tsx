import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { getEffectiveMetrics as getEffectiveMetricsCompare } from './hooks/useAptComparison';
import {
  calculateTransactionValuationStats,
  calculateConversionRateSpread,
  calculateUtilityScoreV2,
  calculateCommuteAnalysis,
  simulateDCFScenario,
  evaluatePERStatus,
  formatValuationPrice,
  type TxRecord,
} from '@/lib/analytics/valuationModels';
import {
  calculateDynamicDCF,
  calculateDongSpread,
  calculateForwardJeonseTrajectory,
} from '@/lib/utils/valuationEngine';
import AdvancedValuationMetrics from './AdvancedValuationMetrics';
import type { FieldReportData } from '@/lib/DashboardFacade';
import type { DongApartment } from '@/lib/repositories/apartment.repository';

// Mock Recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: '100%', height: '100%' }}>{children}</div>,
    RadarChart: ({ children }: any) => <svg data-testid="radar-chart">{children}</svg>,
    PolarGrid: () => <g />,
    PolarAngleAxis: () => <g />,
    PolarRadiusAxis: () => <g />,
    Radar: () => <path />,
    Legend: () => <div />,
    LineChart: ({ children }: any) => <svg data-testid="line-chart">{children}</svg>,
    Line: () => <g />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    CartesianGrid: () => <g />,
    Tooltip: () => <div />,
  };
});

// Mock SWR to prevent network calls
jest.mock('swr', () => {
  return jest.fn(() => ({
    data: { success: true, data: { riskFreeRate: 3.25, fundingCost: 3.8 } },
    error: null,
    isLoading: false,
  }));
});

// Mock Firebase Config and Firestore
jest.mock('@/lib/firebaseConfig', () => ({
  db: { _isMockDb: true },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({
    exists: () => false,
    data: () => ({}),
  }),
}));

describe('Consumer Components Boundary Metrics & Mathematical Resilience Harness', () => {
  // =========================================================================
  // SECTION 1: getEffectiveMetrics Boundary & Corrupted Inputs
  // =========================================================================
  describe('1. getEffectiveMetrics Robustness & Invariant Verification', () => {
    it('1.1 handles null, undefined, and empty apartment object without throwing', () => {
      const nullRes = getEffectiveMetricsCompare(null, undefined);
      const undefRes = getEffectiveMetricsCompare(undefined, undefined);
      const emptyRes = getEffectiveMetricsCompare({} as any, undefined);

      [nullRes, undefRes, emptyRes].forEach((res) => {
        expect(res).toBeDefined();
        expect(res.householdCount).toBe(800);
        expect(res.parkingPerHousehold).toBe(1.25);
        expect(res.yearBuilt).toBe(2018);
        expect(res.distanceToSubway).toBe(2000);
        expect(Number.isNaN(res.yearBuilt)).toBe(false);
      });
    });

    it('1.2 sanitizes corrupted yearBuilt values (6-digit, malformed, negative, string)', () => {
      const cases = [
        { raw: '202305', expectedYear: 2023 },
        { raw: '2015', expectedYear: 2015 },
        { raw: '1998', expectedYear: 1998 },
        { raw: '', expectedYear: 2018 },
        { raw: 'abcd', expectedYear: 2018 },
      ];

      cases.forEach(({ raw, expectedYear }) => {
        const apt: DongApartment = { name: '테스트단지', dong: '청계동', yearBuilt: raw };
        const res = getEffectiveMetricsCompare(apt, undefined);
        expect(Number.isNaN(res.yearBuilt)).toBe(false);
        expect(Number.isFinite(res.yearBuilt)).toBe(true);
        if (raw === '202305' || raw === '2015' || raw === '1998') {
          expect(res.yearBuilt).toBe(expectedYear);
        }
      });
    });

    it('1.3 covers all dong heuristic branches deterministically', () => {
      const dongs = [
        { dong: '화성시 오산동 123', expectedSubway: 500 },
        { dong: '송동 456', expectedSubway: 2500 },
        { dong: '산척동 789', expectedSubway: 2500 },
        { dong: '청계동 101', expectedSubway: 1200 },
        { dong: '영천동 202', expectedSubway: 1800 },
        { dong: '목동 303', expectedSubway: 2800 },
        { dong: '알수없는동', expectedSubway: 2000 },
      ];

      dongs.forEach(({ dong, expectedSubway }) => {
        const apt: DongApartment = { name: '단지', dong };
        const res = getEffectiveMetricsCompare(apt, undefined);
        expect(res.distanceToSubway).toBe(expectedSubway);
        expect(Number.isNaN(res.distanceToSubway)).toBe(false);
      });
    });

    it('1.4 prefers FieldReportData metrics over fallback heuristics when present', () => {
      const apt: DongApartment = { name: '단지', dong: '오산동', householdCount: 500 };
      const report: FieldReportData = {
        apartmentName: '단지',
        metrics: {
          brand: '래미안',
          householdCount: 1500,
          parkingPerHousehold: 1.85,
          yearBuilt: 2022,
          distanceToSubway: 250,
          distanceToElementary: 100,
          distanceToMiddle: 300,
          distanceToHigh: 400,
          distanceToPark: 150,
          distanceToStarbucks: 200,
          distanceToOliveYoung: 250,
          distanceToIndeokwon: 1000,
          distanceToTram: 300,
        },
      };

      const res = getEffectiveMetricsCompare(apt, report);
      expect(res.brand).toBe('래미안');
      expect(res.householdCount).toBe(1500);
      expect(res.parkingPerHousehold).toBe(1.85);
      expect(res.distanceToSubway).toBe(250);
      expect(res.yearBuilt).toBe(2022);
    });
  });

  // =========================================================================
  // SECTION 2: Mathematical Valuation Engines Boundary & Stress
  // =========================================================================
  describe('2. Valuation Engines Mathematical Boundary Tests', () => {
    it('2.1 calculateTransactionValuationStats safely handles empty, sparse, and corrupted transactions', () => {
      // Empty array
      const emptyStats = calculateTransactionValuationStats([]);
      expect(emptyStats.salesCount).toBe(0);
      expect(emptyStats.rentsCount).toBe(0);
      expect(emptyStats.avg1MSale).toBe(0);
      expect(emptyStats.avg3MSale).toBe(0);
      expect(emptyStats.avg3MRent).toBe(0);
      expect(emptyStats.realEstatePER).toBe(0);
      expect(emptyStats.jeonseRatio).toBe(0);
      expect(emptyStats.currentGap).toBe(0);
      expect(emptyStats.gap1YearAgo).toBeNull();
      expect(emptyStats.gapDelta).toBeNull();

      // Corrupted / malformed transactions
      const corrupted: TxRecord[] = [
        { price: 0, dealType: '매매', contractYm: '202609', contractDay: '15' },
        { price: 100000, dealType: '전세', deposit: 60000, contractYm: '202609', contractDay: '10' },
        { price: 120000, dealType: '월세', deposit: 10000, monthlyRent: 150, contractYm: '202609', contractDay: '05' },
        { price: 95000, dealType: '매매', contractYm: '202608', contractDay: '20' },
      ];

      const stats = calculateTransactionValuationStats(corrupted);
      expect(Number.isNaN(stats.realEstatePER)).toBe(false);
      expect(Number.isNaN(stats.jeonseRatio)).toBe(false);
      expect(stats.realEstatePER).toBeGreaterThan(0);
      expect(stats.jeonseRatio).toBeGreaterThan(0);
    });

    it('2.2 calculateDynamicDCF respects cap rate lower bound (>= 1.0%) under extreme discount rates', () => {
      const defaultMacro = {
        riskFreeRate: 3.25,
        fundingCost: 3.8,
        jeonseConversionRate: 0.055,
        baseInflationRate: 2.0,
      };

      // Standard case
      const res = calculateDynamicDCF(60000, defaultMacro);
      expect(res.capRate).toBeGreaterThanOrEqual(1.0);
      expect(res.impliedValue).toBeGreaterThan(0);
      expect(Number.isFinite(res.impliedValue)).toBe(true);

      // Extreme hyper-rate scenario (e.g. funding cost 15%, riskFree 12%)
      const hyperMacro = {
        riskFreeRate: 12.0,
        fundingCost: 15.0,
        jeonseConversionRate: 0.08,
        baseInflationRate: 8.0,
      };
      const hyperRes = calculateDynamicDCF(60000, hyperMacro);
      expect(hyperRes.capRate).toBeGreaterThanOrEqual(1.0);
      expect(Number.isNaN(hyperRes.impliedValue)).toBe(false);

      // Zero jeonse scenario
      const zeroRes = calculateDynamicDCF(0, defaultMacro);
      expect(zeroRes.impliedValue).toBe(0);
      expect(zeroRes.fairJeonseMultiple).toBe(0);
      expect(Number.isNaN(zeroRes.capRate)).toBe(false);
    });

    it('2.3 calculateDongSpread evaluates spreads and undervaluation flags accurately', () => {
      // Empty array
      const emptySpread = calculateDongSpread(1.5, []);
      expect(emptySpread.medianDongPER).toBe(1.5);
      expect(emptySpread.spread).toBe(0);
      expect(emptySpread.isUndervalued).toBe(false);

      // Undervalued case: target PER 1.3 vs median 1.6 (spread = -0.3 < -0.05)
      const underSpread = calculateDongSpread(1.3, [1.5, 1.6, 1.8]);
      expect(underSpread.spread).toBeCloseTo(-0.3, 5);
      expect(underSpread.isUndervalued).toBe(true);

      // Overvalued case: target PER 1.8 vs median 1.5 (spread = 0.3 > -0.05)
      const overSpread = calculateDongSpread(1.8, [1.4, 1.5, 1.6]);
      expect(overSpread.spread).toBeCloseTo(0.3, 5);
      expect(overSpread.isUndervalued).toBe(false);
    });

    it('2.4 calculateForwardJeonseTrajectory accounts for oversupply and undersupply thresholds', () => {
      // Normal balanced pipeline (1000 / 1000)
      const normal = calculateForwardJeonseTrajectory(60000, {
        expectedMoveInVolume: 1000,
        historicalAvgVolume: 1000,
        populationTrend: '보합',
      });
      expect(normal.supplyRatio).toBe(1.0);
      expect(normal.jeonseDiscountFactor).toBe(1.0);
      expect(normal.predictedJeonse).toBe(60000);

      // Severe oversupply (2000 / 1000 = 2.0x > 1.2)
      const oversupply = calculateForwardJeonseTrajectory(60000, {
        expectedMoveInVolume: 2000,
        historicalAvgVolume: 1000,
        populationTrend: '감소',
      });
      expect(oversupply.supplyRatio).toBe(2.0);
      expect(oversupply.jeonseDiscountFactor).toBeLessThan(1.0);
      expect(oversupply.predictedJeonse).toBeLessThan(60000);

      // Severe undersupply (300 / 1000 = 0.3x < 0.8)
      const undersupply = calculateForwardJeonseTrajectory(60000, {
        expectedMoveInVolume: 300,
        historicalAvgVolume: 1000,
        populationTrend: '증가',
      });
      expect(undersupply.supplyRatio).toBe(0.3);
      expect(undersupply.jeonseDiscountFactor).toBeGreaterThan(1.0);
      expect(undersupply.predictedJeonse).toBeGreaterThan(60000);
    });

    it('2.5 simulateDCFScenario produces valid numbers across all stress inputs', () => {
      const res = simulateDCFScenario({
        simBaseRate: 4.25,
        simGrowthRate: 2.5,
        macroConfig: { riskFreeRate: 3.25, fundingCost: 3.8 },
        avg3MRent: 65000,
        avg3MSale: 110000,
        dynamicConversionRate: 0.05,
        commutePremium: 0.15,
      });

      expect(Number.isNaN(res.discountRate)).toBe(false);
      expect(Number.isNaN(res.growthRate)).toBe(false);
      expect(Number.isNaN(res.capRate)).toBe(false);
      expect(Number.isNaN(res.impliedValue)).toBe(false);
      expect(Number.isNaN(res.simJeonsePrice)).toBe(false);
      expect(Number.isNaN(res.simGap)).toBe(false);
      expect(Number.isNaN(res.simJeonseRatio)).toBe(false);
      expect(res.capRate).toBeGreaterThanOrEqual(1.0);
    });

    it('2.6 evaluatePERStatus categorizes all PER intervals correctly and handles zero/negative values', () => {
      expect(evaluatePERStatus(0).category).toBe('insufficient');
      expect(evaluatePERStatus(-1.5).category).toBe('insufficient');
      expect(evaluatePERStatus(1.2).category).toBe('safe');
      expect(evaluatePERStatus(1.5).category).toBe('stable');
      expect(evaluatePERStatus(1.7).category).toBe('average');
      expect(evaluatePERStatus(2.0).category).toBe('growth');
      expect(evaluatePERStatus(2.5).category).toBe('speculative');
    });

    it('2.7 formatValuationPrice formats Korean currency string cleanly', () => {
      expect(formatValuationPrice(0)).toBe('정보 없음');
      expect(formatValuationPrice(500)).toBe('500만');
      expect(formatValuationPrice(10000)).toBe('1억');
      expect(formatValuationPrice(12500)).toBe('1억 2,500만');
      expect(formatValuationPrice(100000)).toBe('10억');
    });

    it('2.8 calculateUtilityScoreV2 computes spec and infra breakdowns without NaN', () => {
      const report: FieldReportData = {
        apartmentName: '화성동탄센트럴',
        metrics: {
          brand: '힐스테이트',
          householdCount: 1200,
          parkingPerHousehold: 1.5,
          yearBuilt: 2021,
          distanceToSubway: 400,
          distanceToElementary: 200,
          distanceToMiddle: 350,
          distanceToHigh: 500,
          distanceToPark: 200,
          distanceToStarbucks: 300,
          distanceToOliveYoung: 400,
          distanceToIndeokwon: 1500,
          distanceToTram: 300,
        },
      };

      const result = calculateUtilityScoreV2(report, 5);
      expect(result.total).toBeGreaterThan(0);
      expect(result.maxTotal).toBeGreaterThan(0);
      expect(result.breakDown.specs).toBeGreaterThan(0);
      expect(result.breakDown.infra).toBeGreaterThan(0);
      expect(result.logs.length).toBeGreaterThan(0);
      result.logs.forEach(log => {
        expect(Number.isNaN(log.score)).toBe(false);
        expect(Number.isNaN(log.max)).toBe(false);
      });
    });
  });

  // =========================================================================
  // SECTION 3: AdvancedValuationMetrics Component UI Integration
  // =========================================================================
  describe('3. AdvancedValuationMetrics Component Rendering & UI Resilience', () => {
    it('3.1 renders complete valuation dashboard without crash when full data is provided', () => {
      const mockReport: FieldReportData = {
        apartmentName: '동탄역더샵센트럴시티 [청계동]',
        metrics: {
          brand: '더샵',
          householdCount: 1400,
          parkingPerHousehold: 1.6,
          yearBuilt: 2015,
          distanceToSubway: 300,
          distanceToElementary: 200,
          distanceToMiddle: 400,
          distanceToHigh: 600,
          distanceToPark: 300,
          distanceToStarbucks: 200,
          distanceToOliveYoung: 250,
          distanceToIndeokwon: 1200,
          distanceToTram: 400,
        },
      };

      const mockTxs: TxRecord[] = [
        { price: 125000, dealType: '매매', contractYm: '202609', contractDay: '10' },
        { price: 120000, dealType: '매매', contractYm: '202608', contractDay: '15' },
        { price: 65000, dealType: '전세', deposit: 65000, contractYm: '202609', contractDay: '05' },
        { price: 63000, dealType: '전세', deposit: 63000, contractYm: '202608', contractDay: '20' },
      ];

      render(<AdvancedValuationMetrics report={mockReport} transactions={mockTxs} />);

      expect(screen.getByText('밸류에이션 분석')).toBeInTheDocument();
      expect(screen.getByText('D-VIEW 종합 가치평가 대시보드')).toBeInTheDocument();
      expect(screen.getByText('1. 실거래 배수 분석 (PER)')).toBeInTheDocument();
      expect(screen.getByText('3개월 평균 매매가')).toBeInTheDocument();
      expect(screen.getByText('3개월 평균 전세가')).toBeInTheDocument();
    });

    it('3.2 renders empty state card cleanly when transactions are empty', () => {
      const bareReport: FieldReportData = {
        apartmentName: '거래없는단지',
      };

      render(<AdvancedValuationMetrics report={bareReport} transactions={[]} />);

      expect(screen.getByText('밸류에이션 분석')).toBeInTheDocument();
      expect(screen.getByText('가치평가 데이터 부족')).toBeInTheDocument();
      expect(
        screen.getByText('최근 실거래 데이터 및 단지 평가 정보가 모두 부족하여 종합 밸류에이션 분석을 제공하기 어렵습니다.')
      ).toBeInTheDocument();
    });

    it('3.3 toggles destination tabs in commute analysis without throwing', () => {
      const mockReport: FieldReportData = {
        apartmentName: '동탄역더샵센트럴시티 [청계동]',
        metrics: {
          brand: '더샵',
          householdCount: 1400,
          parkingPerHousehold: 1.6,
          yearBuilt: 2015,
          distanceToSubway: 300,
          distanceToTram: 400,
        },
      };

      const mockTxs: TxRecord[] = [
        { price: 125000, dealType: '매매', contractYm: '202609', contractDay: '10' },
        { price: 65000, dealType: '전세', deposit: 65000, contractYm: '202609', contractDay: '05' },
      ];

      render(<AdvancedValuationMetrics report={mockReport} transactions={mockTxs} />);

      // Switch to 판교역
      const pangyoBtn = screen.getByRole('button', { name: '판교역' });
      fireEvent.click(pangyoBtn);
      expect(screen.getByText('동탄역 연계 + GTX-A + 경강선')).toBeInTheDocument();

      // Switch to 삼성역
      const samseongBtn = screen.getByRole('button', { name: '삼성역' });
      fireEvent.click(samseongBtn);
      expect(screen.getByText('동탄역 연계 + GTX-A')).toBeInTheDocument();
    });
  });
});
