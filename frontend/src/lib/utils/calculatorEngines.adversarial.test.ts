import {
  calculateAcquisitionCost,
  calculateMortgageLoan,
  calculateJeonseSafetyRisk,
  calculatePropertyHoldingTax,
} from './calculatorEngines';

describe('Adversarial & Stress Tests: calculatorEngines', () => {
  describe('calculateAcquisitionCost Stress Suite', () => {
    it('handles negative price values robustly', () => {
      const res = calculateAcquisitionCost(-100000);
      expect(res).toEqual({ tax: 0, brokerFee: 0, otherFee: 0, totalFees: 0 });
    });

    it('handles 0 price', () => {
      const res = calculateAcquisitionCost(0);
      expect(res).toEqual({ tax: 0, brokerFee: 0, otherFee: 0, totalFees: 0 });
    });

    it('handles NaN and undefined inputs safely', () => {
      const resNaN = calculateAcquisitionCost(NaN);
      expect(resNaN).toEqual({ tax: 0, brokerFee: 0, otherFee: 0, totalFees: 0 });

      const resUndefined = calculateAcquisitionCost(undefined as unknown as number);
      expect(resUndefined).toEqual({ tax: 0, brokerFee: 0, otherFee: 0, totalFees: 0 });
    });

    it('calculates continuous graduated tax brackets accurately at boundary points', () => {
      // Exactly at 60,000 (6억): 1%
      const res600m = calculateAcquisitionCost(60000);
      expect(res600m.tax).toBe(600); // 60000 * 0.01

      // Just above 60,000
      const res600m1 = calculateAcquisitionCost(60001);
      // taxRate = 0.01 + (1 / 30000) * 0.02 = 0.0100006666...
      expect(res600m1.tax).toBe(Math.round(60001 * (0.01 + (1 / 30000) * 0.02)));

      // Midpoint 75,000 (7.5억): taxRate = 0.01 + (15000 / 30000) * 0.02 = 0.02 (2%)
      const res750m = calculateAcquisitionCost(75000);
      expect(res750m.tax).toBe(1500); // 75000 * 0.02

      // Exactly at 90,000 (9억): taxRate = 0.01 + (30000 / 30000) * 0.02 = 0.03 (3%)
      const res900m = calculateAcquisitionCost(90000);
      expect(res900m.tax).toBe(2700);

      // Just above 90,000 (e.g. 90,001): 3%
      const res900m1 = calculateAcquisitionCost(90001);
      expect(res900m1.tax).toBe(Math.round(90001 * 0.03));
    });

    it('handles extreme multi-billion-won values without arithmetic breakdown', () => {
      // 100 Billion KRW (10,000,000 Man-won)
      const resMega = calculateAcquisitionCost(10000000);
      expect(resMega.tax).toBe(300000); // 3%
      expect(resMega.brokerFee).toBe(40000); // 0.4%
      expect(resMega.otherFee).toBe(20000); // 0.2%
      expect(resMega.totalFees).toBe(360000);
    });
  });

  describe('calculateMortgageLoan Stress Suite', () => {
    it('handles zero or negative loan amounts and terms', () => {
      expect(calculateMortgageLoan(0, 4.5, 30)).toEqual({
        monthlyPayment: 0,
        totalInterest: 0,
        totalRepayment: 0,
        schedule: [],
      });

      expect(calculateMortgageLoan(-50000, 4.5, 30)).toEqual({
        monthlyPayment: 0,
        totalInterest: 0,
        totalRepayment: 0,
        schedule: [],
      });

      expect(calculateMortgageLoan(50000, 4.5, 0)).toEqual({
        monthlyPayment: 0,
        totalInterest: 0,
        totalRepayment: 0,
        schedule: [],
      });

      expect(calculateMortgageLoan(50000, 4.5, -10)).toEqual({
        monthlyPayment: 0,
        totalInterest: 0,
        totalRepayment: 0,
        schedule: [],
      });
    });

    it('handles 0% interest rate without NaN or division by zero in both repayment modes', () => {
      // Equal principal & interest with 0% interest rate
      const resZeroEpi = calculateMortgageLoan(36000, 0, 30, 'equal_principal_interest');
      expect(resZeroEpi.monthlyPayment).toBe(100); // 36,000 / 360 = 100 man-won/month
      expect(resZeroEpi.totalInterest).toBe(0);
      expect(resZeroEpi.totalRepayment).toBe(36000);
      expect(resZeroEpi.schedule.length).toBeGreaterThan(0);
      expect(resZeroEpi.schedule[resZeroEpi.schedule.length - 1].remaining).toBe(0);

      // Equal principal with 0% interest rate
      const resZeroEp = calculateMortgageLoan(36000, 0, 30, 'equal_principal');
      expect(resZeroEp.monthlyPayment).toBe(100);
      expect(resZeroEp.totalInterest).toBe(0);
      expect(resZeroEp.totalRepayment).toBe(36000);
      expect(resZeroEp.schedule[resZeroEp.schedule.length - 1].remaining).toBe(0);
    });

    it('handles high interest rate (e.g. 20% annual) and long term (50 years)', () => {
      const resHigh = calculateMortgageLoan(50000, 20.0, 50, 'equal_principal_interest');
      expect(resHigh.monthlyPayment).toBeGreaterThan(0);
      expect(resHigh.totalInterest).toBeGreaterThan(resHigh.totalRepayment - 50000 - 10);
      expect(Number.isFinite(resHigh.monthlyPayment)).toBe(true);
      expect(Number.isFinite(resHigh.totalInterest)).toBe(true);
    });

    it('ensures schedule snapshot points include first 60 months, yearly points, and final month', () => {
      const res = calculateMortgageLoan(60000, 3.5, 30, 'equal_principal_interest');
      const months = res.schedule.map((s) => s.month);
      // Months 1..60
      for (let m = 1; m <= 60; m++) {
        expect(months).toContain(m);
      }
      // Yearly interval 72, 84, 96, ... 360
      expect(months).toContain(72);
      expect(months).toContain(120);
      expect(months).toContain(240);
      expect(months).toContain(360);
      // Final remaining principal diminishes below 1% of initial principal due to discrete monthly rounding
      const finalRemaining = res.schedule[res.schedule.length - 1].remaining;
      expect(finalRemaining).toBeLessThan(60000 * 0.01);
    });
  });

  describe('calculateJeonseSafetyRisk Stress Suite', () => {
    it('handles zero or negative salePrice and jeonseDeposit gracefully', () => {
      const resZeroSale = calculateJeonseSafetyRisk(0, 50000);
      expect(resZeroSale.ratio).toBe(0);
      expect(resZeroSale.riskScore).toBe(0);
      expect(resZeroSale.recommendation).toContain('정보가 부족하여');

      const resZeroJeonse = calculateJeonseSafetyRisk(100000, 0);
      expect(resZeroJeonse.ratio).toBe(0);
      expect(resZeroJeonse.riskScore).toBe(0);

      const resNeg = calculateJeonseSafetyRisk(-100000, -50000);
      expect(resNeg.ratio).toBe(0);
    });

    it('evaluates exact threshold boundaries correctly', () => {
      // ratio = 64.99% -> safe
      const resSafe = calculateJeonseSafetyRisk(100000, 64990);
      expect(resSafe.riskTier).toBe('safe');
      expect(resSafe.riskScore).toBe(15);

      // ratio = 65.0% -> caution
      const resCaution = calculateJeonseSafetyRisk(100000, 65000);
      expect(resCaution.riskTier).toBe('caution');
      expect(resCaution.riskScore).toBe(45);

      // ratio = 74.99% -> caution
      const resCaution2 = calculateJeonseSafetyRisk(100000, 74990);
      expect(resCaution2.riskTier).toBe('caution');

      // ratio = 75.0% -> danger
      const resDanger = calculateJeonseSafetyRisk(100000, 75000);
      expect(resDanger.riskTier).toBe('danger');
      expect(resDanger.riskScore).toBe(75);

      // ratio = 84.99% -> danger
      const resDanger2 = calculateJeonseSafetyRisk(100000, 84990);
      expect(resDanger2.riskTier).toBe('danger');

      // ratio = 85.0% -> critical
      const resCritical = calculateJeonseSafetyRisk(100000, 85000);
      expect(resCritical.riskTier).toBe('critical');
      expect(resCritical.riskScore).toBe(95);
    });

    it('accounts for senior debt collateral correctly in risk assessment', () => {
      // Sale: 10억 (100,000 man-won), Jeonse: 5억 (50,000 man-won), Senior debt: 4억 (40,000 man-won)
      // Total exposure: 9억 = 90% ratio -> Critical tier
      const res = calculateJeonseSafetyRisk(100000, 50000, 40000);
      expect(res.ratio).toBe(90);
      expect(res.riskTier).toBe('critical');
      expect(res.riskScore).toBe(95);
    });

    it('handles inverted market where jeonse deposit exceeds sale price (깡통전세)', () => {
      // Sale: 5억, Jeonse: 6억
      const res = calculateJeonseSafetyRisk(50000, 60000);
      expect(res.ratio).toBe(120);
      expect(res.riskTier).toBe('critical');
      expect(res.gapManWon).toBe(0); // Gap clamped to 0
    });
  });

  describe('calculatePropertyHoldingTax Stress Suite', () => {
    it('handles zero market price', () => {
      const res = calculatePropertyHoldingTax(0);
      expect(res.officialPrice).toBe(0);
      expect(res.propertyTax).toBe(0);
      expect(res.urbanAreaTax).toBe(0);
      expect(res.localEducationTax).toBe(0);
      expect(res.holdingTaxTotal).toBe(0);
    });

    it('calculates tax across all graduated assessment brackets correctly', () => {
      // Bracket 1: fairMarketValue <= 6,000 (0.05%)
      // If officialPrice = 10,000 -> fairMarketValue = 4,500
      // marketPrice = 14,286 (at 70% official ratio)
      const resB1 = calculatePropertyHoldingTax(14286);
      expect(resB1.propertyTax).toBe(Math.round(4500 * 0.0005));

      // Bracket 2: fairMarketValue <= 15,000 (3 + 0.07% on excess)
      // If officialPrice = 25,000 -> fairMarketValue = 11,250
      // baseTax = 3 + (11250 - 6000) * 0.0007 = 3 + 3.675 = 6.675 -> 7
      const resB2 = calculatePropertyHoldingTax(35714);
      expect(resB2.propertyTax).toBe(7);

      // Bracket 3: fairMarketValue <= 30,000 (9.3 + 0.12% on excess)
      // If officialPrice = 50,000 -> fairMarketValue = 22,500
      // baseTax = 9.3 + (22500 - 15000) * 0.0012 = 9.3 + 9.0 = 18.3 -> 18
      const resB3 = calculatePropertyHoldingTax(71429);
      expect(resB3.propertyTax).toBe(18);

      // Bracket 4: fairMarketValue > 30,000 (27.3 + 0.2% on excess)
      // If officialPrice = 100,000 -> fairMarketValue = 45,000
      // baseTax = 27.3 + (45000 - 30000) * 0.002 = 27.3 + 30.0 = 57.3 -> 57
      const resB4 = calculatePropertyHoldingTax(142857);
      expect(resB4.propertyTax).toBe(57);
    });

    it('supports custom officialPriceRatio', () => {
      const resDefault = calculatePropertyHoldingTax(100000, 0.7);
      const resCustom = calculatePropertyHoldingTax(100000, 0.8);
      expect(resCustom.officialPrice).toBe(80000);
      expect(resCustom.propertyTax).toBeGreaterThan(resDefault.propertyTax);
    });
  });
});
