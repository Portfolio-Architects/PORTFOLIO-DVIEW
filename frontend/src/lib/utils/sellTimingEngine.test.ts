import {
  calculateVerdictScore,
  calculateCapitalGainsTax,
} from './sellTimingEngine';

describe('sellTimingEngine Utility', () => {
  describe('calculateVerdictScore', () => {
    it('should determine "🔴 지금 팔면 호구" when market drop rate, jeonse ratio are high and transaction count is low', () => {
      const result = calculateVerdictScore({
        currentPrice: 70000,
        maxPrice3Y: 100000, // 30% drop rate -> 30 * 1.5 = 45 drop score
        txCount3M: 1, // rotation rate = 1/1000 = 0.1% -> moderate rotation -> 18 points
        totalGenerations: 1000,
        jeonseRatio: 82, // jeonse score = 25 points
      });

      // Total score: 45 + 18 + 25 = 88 >= 70
      expect(result.score).toBe(88);
      expect(result.label).toBe('🔴 지금 팔면 호구 (보류 권장)');
      expect(result.color).toBe('#f43f5e');
      expect(result.metrics.dropRate).toBe(30.0);
      expect(result.metrics.rotationRate).toBe(0.1);
    });

    it('should determine "🟡 매도 타이밍 관망" under moderate market metrics', () => {
      const result = calculateVerdictScore({
        currentPrice: 85000,
        maxPrice3Y: 100000, // 15% drop rate -> 15 * 1.5 = 22.5 drop score
        txCount3M: 5, // rotation rate = 5/1000 = 0.5% -> 10 points
        totalGenerations: 1000,
        jeonseRatio: 65, // jeonse score = 10 points
      });

      // Total score: 23 (rounded dropScore) + 10 + 10 = 43 (approx) -> 40 <= score < 70
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(70);
      expect(result.label).toBe('🟡 매도 타이밍 관망 (주의)');
      expect(result.color).toBe('#eab308');
    });

    it('should determine "🟢 양호한 매도 기회" when drop rate and jeonse ratio are low and transaction count is high', () => {
      const result = calculateVerdictScore({
        currentPrice: 95000,
        maxPrice3Y: 100000, // 5% drop rate -> 5 * 1.5 = 7.5 drop score
        txCount3M: 15, // rotation rate = 1.5% -> 0 points
        totalGenerations: 1000,
        jeonseRatio: 45, // jeonse score = 0 points
      });

      // Total score: 8 + 0 + 0 = 8 < 40
      expect(result.score).toBe(8);
      expect(result.label).toBe('🟢 양호한 매도 기회 (매도 가능)');
      expect(result.color).toBe('#10b981');
    });

    it('should parse string inputs and handle empty/zero generations correctly using fallbacks', () => {
      const result = calculateVerdictScore({
        // @ts-expect-error - testing string input conversion
        currentPrice: '80000',
        // @ts-expect-error - testing string input conversion
        maxPrice3Y: '100000', // 20% drop -> 30 drop score
        // @ts-expect-error - testing string input conversion
        txCount3M: '2',
        // @ts-expect-error - testing string input conversion
        totalGenerations: '0', // fallback to 500 -> rotation = 2/500 = 0.4% -> 10 points
        // @ts-expect-error - testing string input conversion
        jeonseRatio: '55', // jeonse score = 5 points
      });

      // Total score: 30 + 10 + 5 = 45
      expect(result.score).toBe(45);
      expect(result.metrics.rotationRate).toBe(0.4);
    });
  });

  describe('calculateCapitalGainsTax', () => {
    it('should calculate 100% tax free for single-home owners with transfer price <= 12억 and holding >= 2 years', () => {
      const result = calculateCapitalGainsTax({
        transferPrice: 100000, // 10억
        acquisitionPrice: 60000, // 6억
        holdingYears: 3,
        resideYears: 3,
        isOneHouse: true,
      });

      expect(result.transferProfit).toBe(40000);
      expect(result.taxableProfit).toBe(0);
      expect(result.computedTax).toBe(0);
      expect(result.totalTax).toBe(0);
      expect(result.isTaxFree).toBe(true);
      expect(result.taxFreeReason).toContain('12억원 이하로 양도소득세가 전액 비과세');
    });

    it('should calculate proportional tax for single-home owners with high-value homes (> 12억)', () => {
      const result = calculateCapitalGainsTax({
        transferPrice: 150000, // 15억
        acquisitionPrice: 80000, // 8억
        holdingYears: 3,
        resideYears: 3,
        isOneHouse: true,
      });

      // Profit: 70000
      // Proportional taxable profit: 70000 * (150000 - 120000) / 150000 = 14000
      expect(result.transferProfit).toBe(70000);
      expect(result.taxableProfit).toBe(14000);
      expect(result.isTaxFree).toBe(false);
      expect(result.taxFreeReason).toContain('12억원을 초과하여 초과분에 대해 안분 과세');

      // Janggi 보유+거주 특례 공제: 3 * 4% (hold) + 3 * 4% (reside) = 24%
      // 14000 * 24% = 3360
      expect(result.janggiGongje).toBe(3360);
      
      // Tax base: 14000 - 3360 - 250 (basic) = 10390
      expect(result.taxableBase).toBe(10390);

      // Tax base 10390 is under 15000 -> 35% tax rate, 1544 nujinGongje
      // computedTax = 10390 * 35% - 1544 = 3636.5 - 1544 = 2092.5 -> round to 2092 due to JS float precision (3636.4999999999995 - 1544)
      expect(result.taxRate).toBe(35);
      expect(result.nujinGongje).toBe(1544);
      expect(result.computedTax).toBe(2092);
      expect(result.localTax).toBe(209);
      expect(result.totalTax).toBe(2301);
    });

    it('should calculate general tax for multi-home owners with general 장특공 (2% per year)', () => {
      const result = calculateCapitalGainsTax({
        transferPrice: 120000, // 12억
        acquisitionPrice: 70000, // 7억
        holdingYears: 5,
        resideYears: 1, // reside < 2 -> no special high-value home deduction
        isOneHouse: false, // multi-home owner
      });

      expect(result.transferProfit).toBe(50000);
      expect(result.taxableProfit).toBe(50000); // 100% taxable
      expect(result.isTaxFree).toBe(false);

      // General janggi rate: 5 * 2% = 10%
      // 50000 * 10% = 5000
      expect(result.janggiGongje).toBe(5000);
      expect(result.taxableBase).toBe(50000 - 5000 - 250); // 44750
      
      // Tax base 44750 is under 50000 -> 40% tax rate, 2594 nujinGongje
      // computedTax = 44750 * 40% - 2594 = 17900 - 2594 = 15306
      expect(result.taxRate).toBe(40);
      expect(result.computedTax).toBe(15306);
    });

    it('should parse mixed string and boolean inputs and return zero tax if transfer profit is zero or negative', () => {
      const result = calculateCapitalGainsTax({
        // @ts-expect-error - testing string input conversion
        transferPrice: '50000',
        // @ts-expect-error - testing string input conversion
        acquisitionPrice: '60000', // negative profit
        // @ts-expect-error - testing string input conversion
        holdingYears: '5',
        // @ts-expect-error - testing string input conversion
        resideYears: '5',
        // @ts-expect-error - testing string/boolean conversion
        isOneHouse: 'true', // string 'true' is parsed as boolean true via Boolean(val) -> wait! Boolean('true') is true, but Boolean('0') or Boolean('') is false.
      });

      expect(result.transferProfit).toBe(0);
      expect(result.taxableProfit).toBe(0);
      expect(result.taxableBase).toBe(0);
      expect(result.computedTax).toBe(0);
      expect(result.totalTax).toBe(0);
    });
  });
});
