import {
  calculateAcquisitionCost,
  calculateMortgageLoan,
  calculateJeonseSafetyRisk,
  calculatePropertyHoldingTax,
} from './calculatorEngines';

describe('calculatorEngines', () => {
  describe('calculateAcquisitionCost', () => {
    it('returns zero for 0 or negative price', () => {
      expect(calculateAcquisitionCost(0)).toEqual({
        tax: 0,
        brokerFee: 0,
        otherFee: 0,
        totalFees: 0,
      });
    });

    it('calculates acquisition tax correctly for <= 600M KRW (60,000 man-won)', () => {
      const res = calculateAcquisitionCost(50000);
      expect(res.tax).toBe(500); // 1%
      expect(res.brokerFee).toBe(200); // 0.4%
      expect(res.otherFee).toBe(100); // 0.2%
      expect(res.totalFees).toBe(800);
    });

    it('calculates acquisition tax correctly for > 900M KRW (90,000 man-won)', () => {
      const res = calculateAcquisitionCost(100000);
      expect(res.tax).toBe(3000); // 3%
      expect(res.brokerFee).toBe(400);
      expect(res.otherFee).toBe(200);
      expect(res.totalFees).toBe(3600);
    });
  });

  describe('calculateMortgageLoan', () => {
    it('handles zero or invalid loan amount', () => {
      expect(calculateMortgageLoan(0, 4.0, 30)).toEqual({
        monthlyPayment: 0,
        totalInterest: 0,
        totalRepayment: 0,
        schedule: [],
      });
    });

    it('calculates equal principal and interest repayment schedule correctly', () => {
      const res = calculateMortgageLoan(50000, 4.0, 30, 'equal_principal_interest');
      expect(res.monthlyPayment).toBeGreaterThan(200);
      expect(res.totalInterest).toBeGreaterThan(0);
      expect(res.totalRepayment).toBe(50000 + res.totalInterest);
      expect(res.schedule.length).toBeGreaterThan(0);
    });

    it('calculates equal principal repayment schedule correctly', () => {
      const res = calculateMortgageLoan(50000, 4.0, 30, 'equal_principal');
      expect(res.monthlyPayment).toBeGreaterThan(200);
      expect(res.totalInterest).toBeGreaterThan(0);
      expect(res.schedule[0].principal).toBe(Math.round(50000 / 360));
    });
  });

  describe('calculateJeonseSafetyRisk', () => {
    it('returns safe tier for low ratio (< 60%)', () => {
      const res = calculateJeonseSafetyRisk(100000, 50000);
      expect(res.ratio).toBe(50);
      expect(res.riskTier).toBe('safe');
      expect(res.gapManWon).toBe(50000);
    });

    it('returns caution tier for moderate ratio (65% ~ 75%)', () => {
      const res = calculateJeonseSafetyRisk(100000, 70000);
      expect(res.ratio).toBe(70);
      expect(res.riskTier).toBe('caution');
    });

    it('returns critical tier for high ratio (>= 85%)', () => {
      const res = calculateJeonseSafetyRisk(100000, 90000);
      expect(res.ratio).toBe(90);
      expect(res.riskTier).toBe('critical');
    });
  });

  describe('calculatePropertyHoldingTax', () => {
    it('calculates holding tax for typical apartment correctly', () => {
      const res = calculatePropertyHoldingTax(80000); // 8억 market price
      expect(res.officialPrice).toBe(56000); // 70%
      expect(res.propertyTax).toBeGreaterThan(0);
      expect(res.holdingTaxTotal).toBe(res.propertyTax + res.urbanAreaTax + res.localEducationTax);
    });
  });
});
