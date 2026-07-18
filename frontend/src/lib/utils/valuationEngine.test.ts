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
          fundingCost: 4.2, // 4.2% -> fundingSpread = (4.2 - 3.5) * 0.3 = 0.21%
          jeonseConversionRate: 0.055, // 5.5%
          baseInflationRate: 2.0, // 2%
          baseDate: '2026-06-24',
        },
        undefined, // metrics
        1.5, // riskPremium = 1.5%
        50, // utilityScore = 50 -> growthPremium = 50 * 0.0001 = 0.005% (0.5%)
        0.5 // transitPremium = 0.5%
      );

      // finalPremium = 1.5%
      // fundingSpread = (4.2 - 3.5) * 0.3 = 0.21%
      // fundingCostPenalty = (4.2 - 3.5) * 0.4 = 0.28%
      // discountRate = (3.5 + 1.5 + 0.21 + 0.28) / 100 = 5.49%
      expect(result.discountRate).toBeCloseTo(5.49);

      // growthRate = (2.0 + 0.5) / 100 + (50 * 0.0001) = 0.025 + 0.005 = 0.030 (3.0%)
      expect(result.growthRate).toBeCloseTo(3.0);

      // capRate = discountRate - growthRate = 5.49% - 3.0% = 2.49%
      expect(result.capRate).toBeCloseTo(2.49);

      // rawConversionRate = 0.055 -> dynamic conversion rate = 0.055 + (3.5 - 3.25)*0.005 = 0.05625 (5.625%)
      // annualRent = 50000 * 0.05625 = 2812.5
      // impliedValue = 2812.5 / 0.0249 = 112951.8
      expect(result.impliedValue).toBeCloseTo(112951.8, 1);
      expect(result.fairPER).toBeCloseTo(1 / 0.0249, 2);
    });

    it('should fall back to defaults when input validation fails', () => {
      const result = calculateDynamicDCF(
        'invalid-jeonse' as any,
        {
          riskFreeRate: 'invalid-rate',
          fundingCost: 'invalid-cost',
        } as any
      );

      // Default riskFreeRate = 3.25, fundingCost = 3.8
      // rawPremium = 1.5
      // fundingSpread = (3.8 - 3.25) * 0.3 = 0.165
      // fundingCostPenalty = (3.8 - 3.5) * 0.4 = 0.12
      // discountRate = 3.25 + 1.5 + 0.165 + 0.12 = 5.035%
      expect(result.discountRate).toBeCloseTo(5.035);
      expect(result.impliedValue).toBe(0); // jeonse = 0
    });

    it('should adjust risk premium dynamically based on small household count', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 3.25, fundingCost: 3.8, jeonseConversionRate: 0.055, baseInflationRate: 2.0 },
        { householdCount: 300, yearBuilt: 2026 } // Small household penalty: +0.15%
      );
      expect(result.dynamicPremium).toBeCloseTo(1.65);
    });

    it('should adjust risk premium dynamically based on large household count (premium applied)', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 3.25, fundingCost: 3.8, jeonseConversionRate: 0.055, baseInflationRate: 2.0 },
        { householdCount: 2000, yearBuilt: 2026 } // Large household discount: -0.3%
      );
      expect(result.dynamicPremium).toBeCloseTo(1.2);
    });

    it('should penalize risk premium based on old built year', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 3.25, fundingCost: 3.8, jeonseConversionRate: 0.055, baseInflationRate: 2.0, baseDate: '2026-01-01' },
        { householdCount: 800, yearBuilt: 1998 } // Age = 28 -> built penalty: +0.4%
      );
      expect(result.dynamicPremium).toBeCloseTo(1.9);
    });

    it('should reward risk premium based on new built year', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 3.25, fundingCost: 3.8, jeonseConversionRate: 0.055, baseInflationRate: 2.0, baseDate: '2026-01-01' },
        { householdCount: 800, yearBuilt: 2024 } // Age = 2 -> built reward: -0.2%
      );
      expect(result.dynamicPremium).toBeCloseTo(1.3);
    });

    it('should apply penalty for high density far and bcr', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 3.25, fundingCost: 3.8, jeonseConversionRate: 0.055, baseInflationRate: 2.0 },
        { householdCount: 800, yearBuilt: 2016, far: 280, bcr: 25 } // far > 250 (+0.1) & bcr > 20 (+0.1) -> +0.2%
      );
      expect(result.dynamicPremium).toBeCloseTo(1.7);
    });

    it('should increase growth rate (g) for close proximity to elementary school', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 3.25, fundingCost: 3.8, jeonseConversionRate: 0.055, baseInflationRate: 2.0 },
        { distanceToElementary: 200 } // school premium: +0.1% growth rate
      );
      // inflation 2% + 50*0.0001 (0.5%) + 0.1% = 2.6%
      expect(result.growthRate).toBeCloseTo(2.6);
    });

    it('should increase growth rate (g) for high academy density', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 3.25, fundingCost: 3.8, jeonseConversionRate: 0.055, baseInflationRate: 2.0 },
        { academyDensity: 60 } // academy premium: +0.15% growth rate
      );
      expect(result.growthRate).toBeCloseTo(2.65);
    });

    it('should increase growth rate (g) for subway proximity', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 3.25, fundingCost: 3.8, jeonseConversionRate: 0.055, baseInflationRate: 2.0 },
        { distanceToSubway: 300 } // subway premium: +0.2% growth rate
      );
      expect(result.growthRate).toBeCloseTo(2.7);
    });

    it('should dynamically adjust jeonse conversion rate under high riskFreeRate environment', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 5.25, fundingCost: 3.8, jeonseConversionRate: 0.055, baseInflationRate: 2.0 } // 5.25% (+2% from base) -> conversion rate + 1%
      );
      expect(result.dynamicJeonseConversionRate).toBeCloseTo(6.5);
    });

    it('should dynamically adjust jeonse conversion rate under low riskFreeRate environment', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 1.25, fundingCost: 3.8, jeonseConversionRate: 0.055, baseInflationRate: 2.0 } // 1.25% (-2% from base) -> conversion rate - 1%
      );
      expect(result.dynamicJeonseConversionRate).toBeCloseTo(4.5);
    });

    it('should handle edge case with extreme high rates and verify cap rate floor is maintained (1.0%)', () => {
      const result = calculateDynamicDCF(
        50000,
        { riskFreeRate: 10.0, fundingCost: 12.0, jeonseConversionRate: 0.055, baseInflationRate: 2.0 }
      );
      // High discount rate compared to growth rate will result in high capRate. 
      // But if we reverse the rates to make r - g < 1.0%, it should enforce the 1.0% floor.
      const reverseResult = calculateDynamicDCF(
        50000,
        { riskFreeRate: 1.0, fundingCost: 2.0, jeonseConversionRate: 0.055, baseInflationRate: 6.0 }
      );
      expect(reverseResult.capRate).toBeCloseTo(1.0); // Enforced minimum Cap Rate (1.0%)
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
