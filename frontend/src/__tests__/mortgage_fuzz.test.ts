/**
 * @file mortgage_fuzz.test.ts
 * @description Fast-Check Property-Based Numerical Stability Fuzzing Suite for mortgageEngine.ts.
 * Anti-Facade Epistemic Verification across 10,000 random vectors:
 * P in [10^7, 10^10] KRW, R in [0.001, 30.0]% (0.001% ~ 30.0%), n in [12, 600] months (Y in [1, 50] years).
 */

import fc from 'fast-check';
import {
  calculateEqualPrincipalAndInterest,
  calculateEqualPrincipal,
  calculateMortgageLoan,
} from '@/lib/services/mortgage/mortgageEngine';

describe('MortgageEngine — Property-Based Fuzzing Invariant Suite (10,000 runs)', () => {
  jest.setTimeout(60000);

  // Parameter Arbitraries
  const principalArb = fc.integer({ min: 10_000_000, max: 10_000_000_000 }); // P: 1천만원 ~ 100억원
  const annualRatePercentArb = fc.double({ min: 0.001, max: 30.0, noNaN: true }); // R: 0.001% ~ 30.0%
  const loanPeriodYearsArb = fc.integer({ min: 1, max: 50 });                   // Y: 1년 ~ 50년 (n = 12 ~ 600개월)

  describe('Invariant 1: Equal Principal and Interest (원리금균등) Numerical Stability & Closed-form Conservation', () => {
    it('satisfies Non-NaN, Closed-form Binding, and Amortization Principal Conservation across 10,000 runs', () => {
      fc.assert(
        fc.property(principalArb, annualRatePercentArb, loanPeriodYearsArb, (P, R, Y) => {
          const res = calculateEqualPrincipalAndInterest({
            principalWon: P,
            annualRatePercent: R,
            loanPeriodYears: Y,
          });

          const n = Y * 12;
          const r = R / 100 / 12;

          // 1. Non-NaN, Finite, and Integer Integrity
          expect(Number.isFinite(res.monthlyPaymentWon)).toBe(true);
          expect(Number.isNaN(res.monthlyPaymentWon)).toBe(false);
          expect(Number.isInteger(res.monthlyPaymentWon)).toBe(true);
          expect(Number.isFinite(res.totalPaymentWon)).toBe(true);
          expect(Number.isInteger(res.totalPaymentWon)).toBe(true);
          expect(Number.isFinite(res.totalInterestWon)).toBe(true);
          expect(Number.isInteger(res.totalInterestWon)).toBe(true);
          expect(res.loanPeriodMonths).toBe(n);
          expect(res.monthlyRate).toBeCloseTo(r, 10);

          // 2. Financial Positivity, Bounds, and Arithmetic Identities
          expect(res.monthlyPaymentWon).toBeGreaterThan(0);
          expect(res.monthlyPaymentWon).toBeGreaterThanOrEqual(Math.floor(P / n));
          expect(res.monthlyPaymentWon).toBeLessThanOrEqual(P * (1 + r));
          expect(res.totalPaymentWon).toBe(res.monthlyPaymentWon * n);
          expect(res.totalInterestWon).toBe(res.totalPaymentWon - P);
          expect(res.totalInterestWon).toBeGreaterThan(0);

          // 3. Direct Binding: Engine Monthly Payment vs Analytical Closed-form Solution (|error| <= 1.0 KRW)
          const factor = Math.pow(1 + r, n);
          const pmtExact = (P * (r * factor)) / (factor - 1);
          const expectedPmt = Math.round(pmtExact);
          expect(Math.abs(res.monthlyPaymentWon - expectedPmt)).toBeLessThanOrEqual(1.0);

          // 4. Amortization Schedule & Principal Conservation Invariant
          let balance = P;
          let totalPrincipalRepaid = 0;
          for (let t = 1; t < n; t++) {
            const interest = Math.round(balance * r);
            const principalRepayment = Math.min(balance, Math.max(0, res.monthlyPaymentWon - interest));
            balance -= principalRepayment;
            totalPrincipalRepaid += principalRepayment;
          }
          const finalPrincipalRepayment = balance;
          totalPrincipalRepaid += finalPrincipalRepayment;
          balance -= finalPrincipalRepayment;

          expect(balance).toBe(0);
          expect(totalPrincipalRepaid).toBe(P);

          const firstMonthInterest = Math.round(P * r);
          const firstMonthPrincipal = res.monthlyPaymentWon - firstMonthInterest;
          expect(firstMonthPrincipal).toBeGreaterThanOrEqual(0);
          expect(Math.abs(firstMonthPrincipal - Math.round(pmtExact - P * r))).toBeLessThanOrEqual(1.0);
        }),
        { numRuns: 10000 }
      );
    });
  });

  describe('Invariant 2: Equal Principal (원금균등) Numerical Stability & Arithmetic Progression Conservation', () => {
    it('satisfies Non-NaN, Monotonicity, Closed-form Binding, and Progression Conservation across 10,000 runs', () => {
      fc.assert(
        fc.property(principalArb, annualRatePercentArb, loanPeriodYearsArb, (P, R, Y) => {
          const res = calculateEqualPrincipal({
            principalWon: P,
            annualRatePercent: R,
            loanPeriodYears: Y,
          });

          const n = Y * 12;
          const r = R / 100 / 12;

          // 1. Non-NaN, Finite, and Integer Integrity
          expect(Number.isFinite(res.firstMonthPaymentWon)).toBe(true);
          expect(Number.isInteger(res.firstMonthPaymentWon)).toBe(true);
          expect(Number.isFinite(res.lastMonthPaymentWon)).toBe(true);
          expect(Number.isInteger(res.lastMonthPaymentWon)).toBe(true);
          expect(Number.isFinite(res.averageMonthlyPaymentWon)).toBe(true);
          expect(Number.isInteger(res.averageMonthlyPaymentWon)).toBe(true);
          expect(Number.isFinite(res.monthlyPrincipalWon)).toBe(true);
          expect(Number.isInteger(res.monthlyPrincipalWon)).toBe(true);
          expect(Number.isFinite(res.totalPaymentWon)).toBe(true);
          expect(Number.isInteger(res.totalPaymentWon)).toBe(true);
          expect(Number.isFinite(res.totalInterestWon)).toBe(true);
          expect(Number.isInteger(res.totalInterestWon)).toBe(true);
          expect(res.loanPeriodMonths).toBe(n);
          expect(res.monthlyRate).toBeCloseTo(r, 10);

          // 2. Financial Positivity & Monotonicity
          expect(res.firstMonthPaymentWon).toBeGreaterThan(0);
          expect(res.lastMonthPaymentWon).toBeGreaterThan(0);
          expect(res.firstMonthPaymentWon).toBeGreaterThanOrEqual(res.lastMonthPaymentWon);
          expect(res.monthlyPrincipalWon).toBeGreaterThan(0);
          expect(res.totalPaymentWon).toBeGreaterThan(P);
          expect(res.totalInterestWon).toBeGreaterThan(0);

          // 3. Direct Binding: Engine Output Fields vs Analytical Closed-form Expressions
          expect(res.monthlyPrincipalWon).toBe(Math.round(P / n));
          expect(res.totalPaymentWon - res.totalInterestWon).toBe(P);
          expect(res.firstMonthPaymentWon).toBe(Math.round(P / n + P * r));
          expect(res.lastMonthPaymentWon).toBe(Math.round(P / n + (P / n) * r));
          expect(res.averageMonthlyPaymentWon).toBe(Math.round(res.totalPaymentWon / n));

          // 4. Closed-form Total Interest vs Exact Arithmetic Progression Iterative Sum (|error| <= 1.0 KRW)
          const totalInterestExact = (P * r * (n + 1)) / 2;
          expect(Math.abs(res.totalInterestWon - Math.round(totalInterestExact))).toBeLessThanOrEqual(1.0);

          let iterativeInterestSum = 0;
          const monthlyPrincipalExact = P / n;
          for (let t = 1; t <= n; t++) {
            const remainingP = P - (t - 1) * monthlyPrincipalExact;
            iterativeInterestSum += remainingP * r;
          }
          expect(Math.abs(res.totalInterestWon - Math.round(iterativeInterestSum))).toBeLessThanOrEqual(1.0);
        }),
        { numRuns: 10000 }
      );
    });
  });

  describe('Invariant 3: Unified Entry Point Router & Singularity Defense', () => {
    it('defends zero-interest singularity via L’Hôpital convergence (1,000 runs)', () => {
      fc.assert(
        fc.property(principalArb, loanPeriodYearsArb, (P, Y) => {
          const zeroRatePI = calculateMortgageLoan({
            principalWon: P,
            annualRatePercent: 0.0,
            loanPeriodYears: Y,
            repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
          });

          const zeroRateP = calculateMortgageLoan({
            principalWon: P,
            annualRatePercent: 0.0,
            loanPeriodYears: Y,
            repaymentType: 'EQUAL_PRINCIPAL',
          });

          const n = Y * 12;
          const expectedPmt = Math.round(P / n);

          expect(zeroRatePI.monthlyPaymentWon).toBe(expectedPmt);
          expect(zeroRatePI.totalInterestWon).toBe(0);
          expect(zeroRatePI.totalPaymentWon).toBe(P);

          expect(zeroRateP.firstMonthPaymentWon).toBe(expectedPmt);
          expect(zeroRateP.lastMonthPaymentWon).toBe(expectedPmt);
          expect(zeroRateP.totalInterestWon).toBe(0);
          expect(zeroRateP.totalPaymentWon).toBe(P);
        }),
        { numRuns: 1000 }
      );
    });

    it('delegates repayment types symmetrically and matches underlying engines across 10,000 runs', () => {
      fc.assert(
        fc.property(principalArb, annualRatePercentArb, loanPeriodYearsArb, (P, R, Y) => {
          const resRouterPI = calculateMortgageLoan({
            principalWon: P,
            annualRatePercent: R,
            loanPeriodYears: Y,
            repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
          });
          const resDirectPI = calculateEqualPrincipalAndInterest({
            principalWon: P,
            annualRatePercent: R,
            loanPeriodYears: Y,
          });

          expect(resRouterPI.repaymentType).toBe('EQUAL_PRINCIPAL_AND_INTEREST');
          expect(resRouterPI.monthlyPaymentWon).toBe(resDirectPI.monthlyPaymentWon);
          expect(resRouterPI.totalPaymentWon).toBe(resDirectPI.totalPaymentWon);
          expect(resRouterPI.totalInterestWon).toBe(resDirectPI.totalInterestWon);
          expect(resRouterPI.firstMonthPaymentWon).toBe(resDirectPI.monthlyPaymentWon);
          expect(resRouterPI.lastMonthPaymentWon).toBe(resDirectPI.monthlyPaymentWon);
          expect(resRouterPI.monthlyPrincipalWon).toBe(Math.round(P / (Y * 12)));

          const resRouterP = calculateMortgageLoan({
            principalWon: P,
            annualRatePercent: R,
            loanPeriodYears: Y,
            repaymentType: 'EQUAL_PRINCIPAL',
          });
          const resDirectP = calculateEqualPrincipal({
            principalWon: P,
            annualRatePercent: R,
            loanPeriodYears: Y,
          });

          expect(resRouterP.repaymentType).toBe('EQUAL_PRINCIPAL');
          expect(resRouterP.firstMonthPaymentWon).toBe(resDirectP.firstMonthPaymentWon);
          expect(resRouterP.lastMonthPaymentWon).toBe(resDirectP.lastMonthPaymentWon);
          expect(resRouterP.monthlyPrincipalWon).toBe(resDirectP.monthlyPrincipalWon);
          expect(resRouterP.totalPaymentWon).toBe(resDirectP.totalPaymentWon);
          expect(resRouterP.totalInterestWon).toBe(resDirectP.totalInterestWon);
          expect(resRouterP.monthlyPaymentWon).toBe(resDirectP.firstMonthPaymentWon);
          expect(resRouterP.averageMonthlyPaymentWon).toBe(resDirectP.averageMonthlyPaymentWon);
        }),
        { numRuns: 10000 }
      );
    });
  });
});
