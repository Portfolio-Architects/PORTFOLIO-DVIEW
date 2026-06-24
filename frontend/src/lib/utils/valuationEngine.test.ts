import {
  calculateDynamicDCF,
  calculateDongSpread,
  calculateForwardJeonseTrajectory,
} from './valuationEngine';

describe('valuationEngine Utility', () => {
  describe('calculateDynamicDCF', () => {
    it('should compute DCF metrics correctly under typical interest rates and premium conditions', () => {
      const result = calculateDynamicDCF(
        50000, // Jeonse = 5억
        {
          riskFreeRate: 3.5, // 3.5%
          fundingCost: 4.2, // 4.2% -> fundingSpread = (4.2 - 4.0) * 0.5 = 0.1%
          jeonseConversionRate: 0.055, // 5.5%
          baseInflationRate: 2.0, // 2%
          baseDate: '2026-06-24',
        },
        1.5, // riskPremium = 1.5%
        50, // utilityScore = 50 -> growthPremium = 50 * 0.0001 = 0.005% -> 0.005%
        0.5 // transitPremium = 0.5%
      );

      // discountRate = (3.5 + 1.5 + 0.1) / 100 = 5.1%
      expect(result.discountRate).toBeCloseTo(5.1);

      // growthRate = (2.0 + 0.5) / 100 + (50 * 0.0001) = 0.025 + 0.005 = 0.030 (3.0%)
      expect(result.growthRate).toBeCloseTo(3.0);

      // capRate = discountRate - growthRate = 5.1% - 3.0% = 2.1%
      expect(result.capRate).toBeCloseTo(2.1);

      // annualRent = 50000 * 0.055 = 2750
      // impliedValue = 2750 / 0.021 = 130952.38
      expect(result.impliedValue).toBeCloseTo(130952.38, 1);
      expect(result.fairPER).toBeCloseTo(1 / 0.021, 2);
      expect(result.fairJeonseMultiple).toBeCloseTo(130952.38 / 50000, 3);
    });

    it('should fall back to defaults when input validation fails', () => {
      const result = calculateDynamicDCF(
        'invalid-jeonse' as any,
        {
          riskFreeRate: 'invalid-rate',
          fundingCost: 'invalid-cost',
        } as any
      );

      // Default riskFreeRate = 3.25, fundingCost = 3.8 (fundingSpread = 0)
      // discountRate = 3.25 + 1.5 = 4.75%
      expect(result.discountRate).toBeCloseTo(4.75);
      expect(result.impliedValue).toBe(0); // jeonse = 0
    });
  });

  describe('calculateDongSpread', () => {
    it('should correctly determine spread and undervalued status relative to the median Dong PER', () => {
      // Median of [18, 19, 21, 22, 25] is 21
      const result = calculateDongSpread(20, [18, 19, 21, 22, 25]);
      expect(result.medianDongPER).toBe(21);
      expect(result.spread).toBe(-1);
      expect(result.isUndervalued).toBe(true); // spread < -0.05
    });

    it('should handle even-sized array medians correctly', () => {
      // Median of [20, 21, 22, 23] is (21 + 22) / 2 = 21.5
      const result = calculateDongSpread(22, [20, 21, 22, 23]);
      expect(result.medianDongPER).toBe(21.5);
      expect(result.spread).toBe(0.5);
      expect(result.isUndervalued).toBe(false);
    });

    it('should return 0 spread and not undervalued if neighboring dong array is empty', () => {
      const result = calculateDongSpread(20, []);
      expect(result.medianDongPER).toBe(20);
      expect(result.spread).toBe(0);
      expect(result.isUndervalued).toBe(false);
    });
  });

  describe('calculateForwardJeonseTrajectory', () => {
    it('should predict downward trajectory and high pressure on oversupply', () => {
      const result = calculateForwardJeonseTrajectory(40000, {
        region: '동탄2신도시',
        baseYear: 2026,
        expectedMoveInVolume: 3000,
        historicalAvgVolume: 2000, // supplyRatio = 1.5
        populationTrend: '보합',
      });

      // excessRatio = 1.5 - 1.2 = 0.3
      // discount = Math.min(0.20, (0.3 / 0.1) * 0.015) = 0.045
      // jeonseDiscountFactor = 1.0 - 0.045 = 0.955
      expect(result.supplyRatio).toBe(1.5);
      expect(result.jeonseDiscountFactor).toBeCloseTo(0.955);
      expect(result.predictedJeonse).toBe(40000 * 0.955);
      expect(result.pressure).toBe('하방 (공급과잉)');
    });

    it('should predict upward trajectory and low pressure on undersupply and population increase', () => {
      const result = calculateForwardJeonseTrajectory(40000, {
        region: '동탄2신도시',
        baseYear: 2026,
        expectedMoveInVolume: 1000,
        historicalAvgVolume: 2000, // supplyRatio = 0.5
        populationTrend: '증가', // additional +0.02
      });

      // shortageRatio = 0.8 - 0.5 = 0.3
      // premium = Math.min(0.15, (0.3 / 0.1) * 0.015) = 0.045
      // jeonseDiscountFactor = 1.0 + 0.045 = 1.045
      // population correction + 0.02 = 1.065
      expect(result.supplyRatio).toBe(0.5);
      expect(result.jeonseDiscountFactor).toBeCloseTo(1.065);
      expect(result.predictedJeonse).toBe(40000 * 1.065);
      expect(result.pressure).toBe('상방 (공급부족)');
    });
  });
});
