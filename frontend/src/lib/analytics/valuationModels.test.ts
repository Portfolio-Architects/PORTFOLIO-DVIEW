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
import type { FieldReportData } from '@/lib/DashboardFacade';

describe('valuationModels Unit Test Suite', () => {
  const mockReport: FieldReportData = {
    aptName: '동탄역 롯데캐슬',
    dong: '오산동',
    metrics: {
      brand: '롯데캐슬',
      householdCount: 1500,
      yearBuilt: 2021,
      parkingPerHousehold: 1.5,
      distanceToSubway: 150,
      distanceToElementary: 200,
      distanceToMiddle: 500,
      distanceToHigh: 700,
      distanceToStarbucks: 100,
      distanceToOliveYoung: 150,
      distanceToPark: 250,
      far: 220,
    },
  };

  describe('calculateUtilityScoreV2', () => {
    it('computes utility score breakdown and caps at maxTotal', () => {
      const result = calculateUtilityScoreV2(mockReport);
      expect(result.total).toBeGreaterThan(0);
      expect(result.maxTotal).toBeGreaterThan(0);
      expect(result.breakDown.specs).toBeGreaterThanOrEqual(0);
      expect(result.breakDown.infra).toBeGreaterThanOrEqual(0);
      expect(result.logs.length).toBeGreaterThan(0);
    });

    it('handles empty report gracefully without throwing', () => {
      const emptyReport = { aptName: '미정', dong: '미정' } as FieldReportData;
      const result = calculateUtilityScoreV2(emptyReport);
      expect(result.total).toBe(0);
      expect(result.breakDown.specs).toBe(0);
      expect(result.breakDown.infra).toBe(0);
    });
  });

  describe('calculateCommuteAnalysis', () => {
    it('computes commute times and transit premium for known destination', () => {
      const resultGangnam = calculateCommuteAnalysis(mockReport.metrics, 'gangnam');
      expect(resultGangnam.totalTime).toBeGreaterThan(0);
      expect(resultGangnam.method).toContain('GTX-A');
      expect(typeof resultGangnam.premium).toBe('number');

      const resultPangyo = calculateCommuteAnalysis(mockReport.metrics, 'pangyo');
      expect(resultPangyo.totalTime).toBeGreaterThan(0);
    });
  });

  describe('calculateTransactionValuationStats', () => {
    const mockTxs: TxRecord[] = [
      { contractYm: '202604', dealType: '매매', price: 150000 },
      { contractYm: '202604', dealType: '매매', price: 155000 },
      { contractYm: '202603', dealType: '전세', deposit: 75000, price: 75000 },
      { contractYm: '202603', dealType: '전세', deposit: 70000, price: 70000 },
    ];

    it('calculates average price and PER ratios accurately', () => {
      const stats = calculateTransactionValuationStats(mockTxs);
      expect(stats.avg3MSale).toBeGreaterThan(0);
      expect(stats.avg3MRent).toBeGreaterThan(0);
      expect(stats.realEstatePER).toBeGreaterThan(0);
      expect(stats.jeonseRatio).toBeGreaterThan(0);
    });

    it('returns zeroes when transactions list is empty', () => {
      const stats = calculateTransactionValuationStats([]);
      expect(stats.avg1MSale).toBe(0);
      expect(stats.avg3MSale).toBe(0);
      expect(stats.avg3MRent).toBe(0);
      expect(stats.realEstatePER).toBe(0);
      expect(stats.jeonseRatio).toBe(0);
    });
  });

  describe('calculateConversionRateSpread', () => {
    it('calculates spread between current market conversion rate and dynamic benchmark', () => {
      const result = calculateConversionRateSpread(mockReport.metrics, '동탄역 롯데캐슬');
      expect(result.dynamicConversionRate).toBeGreaterThan(0);
      expect(Array.isArray(result.spreadReasons)).toBe(true);
    });
  });

  describe('simulateDCFScenario', () => {
    it('generates simulated value according to discount and growth adjustments', () => {
      const sim = simulateDCFScenario({
        simBaseRate: 3.5,
        simGrowthRate: 2.0,
        macroConfig: {
          riskFreeRate: 3.25,
          fundingCost: 3.8,
        },
        avg3MRent: 70000,
        avg3MSale: 140000,
        dynamicConversionRate: 0.05,
        commutePremium: 0.2,
      });
      expect(sim.impliedValue).toBeGreaterThan(0);
      expect(sim.capRate).toBeGreaterThan(0);
      expect(sim.simJeonsePrice).toBeGreaterThan(0);
    });
  });

  describe('evaluatePERStatus', () => {
    it('evaluates PER status into categories accurately', () => {
      expect(evaluatePERStatus(1.3).category).toBe('safe');
      expect(evaluatePERStatus(1.5).category).toBe('stable');
      expect(evaluatePERStatus(1.7).category).toBe('average');
      expect(evaluatePERStatus(2.0).category).toBe('growth');
      expect(evaluatePERStatus(2.5).category).toBe('speculative');
      expect(evaluatePERStatus(0).category).toBe('insufficient');
    });
  });

  describe('formatValuationPrice', () => {
    it('formats price in Korean eok / man unit', () => {
      expect(formatValuationPrice(152500)).toBe('15억 2,500만');
      expect(formatValuationPrice(10000)).toBe('1억');
      expect(formatValuationPrice(5000)).toBe('5,000만');
      expect(formatValuationPrice(0)).toBe('정보 없음');
    });
  });

  describe('report serialization and JsonLd generation', () => {
    it('generates text reports and JsonLd schema without React runtime dependencies', () => {
      const scenarioText = generateScenarioReportText({
        aptName: '동탄역 롯데캐슬',
        simBaseRate: 3.25,
        simGrowthRate: 2.0,
        baseFairValue: 150000,
        simFairValue: 155000,
        simJeonsePrice: 75000,
        simJeonseRatio: 48.4,
        simGap: 80000,
        currentGap: 75000,
      });
      expect(scenarioText).toContain('동탄역 롯데캐슬');

      const commuteText = generateCommuteReportText({
        aptName: '동탄역 롯데캐슬',
        destLabel: '강남역',
        analysis: {
          linkTime: 5,
          transitTime: 35,
          totalTime: 48,
          savedTime: 12,
          premium: 0.18,
          method: 'GTX-A',
        },
      });
      expect(commuteText).toContain('동탄역 롯데캐슬');

      const jsonLdStr = generateValuationJsonLd({
        report: mockReport,
        impliedValue: 160000,
        realEstatePER: 2.1,
        utilityTotal: 120,
        utilityMaxTotal: 150,
        spread: 0.15,
      });
      expect(typeof jsonLdStr).toBe('string');
      const parsed = JSON.parse(jsonLdStr!);
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@type']).toBe('Place');
    });
  });
});
