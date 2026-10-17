/**
 * @file mortgageEngine.adversarial.test.ts
 * @description Empirical Challenger Adversarial Stress Test Suite for mortgageEngine.ts.
 * Rigorous boundary fuzzing, numerical singularity probes, and stress invariant verification.
 *
 * Epistemic Test Vectors:
 * 1. Extreme Values & Floating-Point Overflows (P = 10B KRW, R = 0.01%, Y = 50, P -> Number.MAX_SAFE_INTEGER).
 * 2. L'Hôpital Singularity Limit Convergence (r -> 0, r <= 1e-7, r = 0.0%).
 * 3. Equal Principal Closed-form Total Interest vs Exact Arithmetic Progression Sum (Residual <= 1.0 KRW across 500 samples).
 * 4. Stress DSR 40% Inversion Reversibility (Actual DSR <= 40.00001% across 500 Monte Carlo configurations).
 * 5. Negative, Malformed, Non-finite, and Boundary Inputs Guard Robustness.
 */

import {
  RepaymentTypeEnum,
  MortgageLoanInputSchema,
  DsrMaxLoanInputSchema,
  RateShockInputSchema,
  JeonseShortfallInputSchema,
  calculateEqualPrincipalAndInterest,
  calculateEqualPrincipal,
  calculateMortgageLoan,
  calculateDsrMaxLoan,
  calculateInterestRateShock,
  calculateJeonseShortfall,
} from '../mortgageEngine';
import { ZodError } from 'zod';

describe('Adversarial Challenge 1: Extreme Values & Floating-Point Overflow Invariance', () => {
  it('ADV-01.1: Extreme Boundary — P = 10B KRW (100억원), R = 0.01%, Y = 50 years', () => {
    const input = {
      principalWon: 10_000_000_000,
      annualRatePercent: 0.01,
      loanPeriodYears: 50,
      repaymentType: RepaymentTypeEnum.enum.EQUAL_PRINCIPAL_AND_INTEREST,
    };

    const resPI = calculateEqualPrincipalAndInterest(input);

    expect(Number.isFinite(resPI.monthlyPaymentWon)).toBe(true);
    expect(Number.isNaN(resPI.monthlyPaymentWon)).toBe(false);
    expect(resPI.monthlyPaymentWon).toBeGreaterThan(0);
    expect(resPI.monthlyPaymentWon).toBe(16_708_437);
    expect(resPI.totalPaymentWon).toBe(resPI.monthlyPaymentWon * 600);
    expect(resPI.totalInterestWon).toBe(resPI.totalPaymentWon - 10_000_000_000);
    expect(resPI.totalInterestWon).toBe(25_062_200);

    const resP = calculateEqualPrincipal(input);
    expect(Number.isFinite(resP.firstMonthPaymentWon)).toBe(true);
    expect(Number.isFinite(resP.lastMonthPaymentWon)).toBe(true);
    expect(Number.isFinite(resP.totalInterestWon)).toBe(true);
    expect(resP.totalInterestWon).toBe(25_041_667);
  });

  it('ADV-01.2: Boundary Stress — Maximum safe integer principal (P = 9,007,199,254,740,991)', () => {
    const maxSafeP = Number.MAX_SAFE_INTEGER;
    const res = calculateEqualPrincipalAndInterest({
      principalWon: maxSafeP,
      annualRatePercent: 3.5,
      loanPeriodYears: 30,
    });

    expect(Number.isFinite(res.monthlyPaymentWon)).toBe(true);
    expect(Number.isNaN(res.monthlyPaymentWon)).toBe(false);
    expect(res.monthlyPaymentWon).toBeGreaterThan(0);
    expect(Number.isFinite(res.totalPaymentWon)).toBe(true);
    expect(Number.isFinite(res.totalInterestWon)).toBe(true);
  });

  it('ADV-01.3: Asymptotic interest rate bound — R = 100.0% (Zod Max)', () => {
    const res = calculateEqualPrincipalAndInterest({
      principalWon: 100_000_000,
      annualRatePercent: 100.0,
      loanPeriodYears: 10,
    });

    expect(Number.isFinite(res.monthlyPaymentWon)).toBe(true);
    expect(Number.isNaN(res.monthlyPaymentWon)).toBe(false);
    expect(res.monthlyPaymentWon).toBeGreaterThan(0);
    expect(res.totalInterestWon).toBeGreaterThan(0);
  });
});

describe('Adversarial Challenge 2: L’Hôpital Singularity Limit Convergence (r -> 0)', () => {
  it('ADV-02.1: Exactly zero interest rate (R = 0.0%) satisfies PMT = P / n analytically', () => {
    const testCases = [
      { P: 100_000_000, Y: 10 },
      { P: 500_000_000, Y: 30 },
      { P: 1_200_000_000, Y: 40 },
      { P: 10_000_000_000, Y: 50 },
    ];

    for (const { P, Y } of testCases) {
      const n = Y * 12;
      const expectedPMT = Math.round(P / n);

      const resPI = calculateEqualPrincipalAndInterest({
        principalWon: P,
        annualRatePercent: 0.0,
        loanPeriodYears: Y,
      });

      expect(resPI.monthlyPaymentWon).toBe(expectedPMT);
      expect(resPI.totalInterestWon).toBe(0);
      expect(resPI.totalPaymentWon).toBe(P);

      const resP = calculateEqualPrincipal({
        principalWon: P,
        annualRatePercent: 0.0,
        loanPeriodYears: Y,
      });

      expect(resP.firstMonthPaymentWon).toBe(expectedPMT);
      expect(resP.lastMonthPaymentWon).toBe(expectedPMT);
      expect(resP.totalInterestWon).toBe(0);
      expect(resP.totalPaymentWon).toBe(P);
    }
  });

  it('ADV-02.2: Micro-rate below singularity epsilon (R = 1e-6% => r = 8.33e-10 < 1e-7)', () => {
    const P = 360_000_000;
    const Y = 30; // n = 360 => P/n = 1,000,000 KRW
    const res = calculateEqualPrincipalAndInterest({
      principalWon: P,
      annualRatePercent: 1e-6,
      loanPeriodYears: Y,
    });

    // Guard triggers: PMT = Math.round(P / n) = 1,000,000 KRW
    expect(res.monthlyPaymentWon).toBe(1_000_000);
    expect(res.totalInterestWon).toBe(0);
    expect(res.totalPaymentWon).toBe(P);
  });

  it('ADV-02.3: Near-singularity rate just above epsilon (R = 0.0015% => r = 1.25e-6 > 1e-7)', () => {
    const P = 360_000_000;
    const Y = 30;
    const res = calculateEqualPrincipalAndInterest({
      principalWon: P,
      annualRatePercent: 0.0015,
      loanPeriodYears: Y,
    });

    expect(Number.isFinite(res.monthlyPaymentWon)).toBe(true);
    expect(Number.isNaN(res.monthlyPaymentWon)).toBe(false);
    // Even above epsilon, PMT must be exceptionally close to 1,000,000 KRW
    expect(res.monthlyPaymentWon).toBeGreaterThanOrEqual(1_000_000);
    expect(res.monthlyPaymentWon).toBeLessThanOrEqual(1_001_000);
  });
});

describe('Adversarial Challenge 3: Equal Principal Closed-form Total Interest Error Bounds', () => {
  it('ADV-03.1: Monte Carlo verification (500 iterations) — Closed-form error <= 1.0 KRW vs exact arithmetic sum', () => {
    const sampleCount = 500;
    let maxError = 0;

    for (let i = 0; i < sampleCount; i++) {
      // Deterministic pseudorandom parameters
      const P = 10_000_000 + ((i * 7919) % 990_000_000); // 10M ~ 1B KRW
      const R = 0.5 + ((i * 31) % 150) / 10;             // 0.5% ~ 15.5%
      const Y = 1 + ((i * 13) % 50);                     // 1 ~ 50 years
      const n = Y * 12;
      const r = R / 100 / 12;

      // Exact loop sum of arithmetic progression
      let iterativeSum = 0;
      for (let t = 1; t <= n; t++) {
        const remainingPrincipal = P - ((t - 1) * P) / n;
        iterativeSum += remainingPrincipal * r;
      }

      const result = calculateEqualPrincipal({
        principalWon: P,
        annualRatePercent: R,
        loanPeriodYears: Y,
      });

      const error = Math.abs(result.totalInterestWon - Math.round(iterativeSum));
      if (error > maxError) maxError = error;

      expect(error).toBeLessThanOrEqual(1);
    }

    expect(maxError).toBeLessThanOrEqual(1);
  });
});

describe('Adversarial Challenge 4: Stress DSR 40% Inversion Reversibility & Duality Invariant', () => {
  it('ADV-04.1: Standard Borrower Income (I >= 60M KRW) — Actual DSR <= 40.00001% strictly holds for Equal PI across 500 configurations', () => {
    let worstCaseDsrPI = 0;

    for (let i = 0; i < 500; i++) {
      const annualIncomeWon = 60_000_000 + ((i * 4999) % 240_000_000); // 60M ~ 300M KRW
      const baseRatePercent = 2.5 + ((i * 17) % 55) / 10;              // 2.5% ~ 8.0%
      const loanPeriodYears = 5 + ((i * 7) % 45);                      // 5 ~ 49 years
      const stressSpreadPercent = 1.2;
      const dsrLimitRatio = 0.40;

      const dsrResult = calculateDsrMaxLoan({
        annualIncomeWon,
        baseRatePercent,
        loanPeriodYears,
        repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
        stressSpreadPercent,
        dsrLimitRatio,
      });

      const maxLoanWon = dsrResult.maxLoanWon;
      if (maxLoanWon === 0) continue;

      const stressRate = baseRatePercent + stressSpreadPercent;
      const testCalc = calculateMortgageLoan({
        principalWon: maxLoanWon,
        annualRatePercent: stressRate,
        loanPeriodYears,
        repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
      });

      const annualDebtService = testCalc.monthlyPaymentWon * 12;
      const actualDsrPercent = (annualDebtService / annualIncomeWon) * 100;
      if (actualDsrPercent > worstCaseDsrPI) worstCaseDsrPI = actualDsrPercent;

      expect(actualDsrPercent).toBeLessThanOrEqual(40.00001);
    }

    expect(worstCaseDsrPI).toBeLessThanOrEqual(40.00001);
  });

  it('ADV-04.2: Standard Borrower Income (I >= 60M KRW) — Actual DSR <= 40.00001% strictly holds for Equal Principal across 500 configurations', () => {
    let worstCaseDsrP = 0;

    for (let i = 0; i < 500; i++) {
      const annualIncomeWon = 60_000_000 + ((i * 4999) % 240_000_000); // 60M ~ 300M KRW
      const baseRatePercent = 2.5 + ((i * 17) % 55) / 10;              // 2.5% ~ 8.0%
      const loanPeriodYears = 5 + ((i * 7) % 45);                      // 5 ~ 49 years
      const stressSpreadPercent = 1.2;
      const dsrLimitRatio = 0.40;

      const dsrResult = calculateDsrMaxLoan({
        annualIncomeWon,
        baseRatePercent,
        loanPeriodYears,
        repaymentType: 'EQUAL_PRINCIPAL',
        stressSpreadPercent,
        dsrLimitRatio,
      });

      const maxLoanWon = dsrResult.maxLoanWon;
      if (maxLoanWon === 0) continue;

      const stressRate = baseRatePercent + stressSpreadPercent;
      const testCalc = calculateMortgageLoan({
        principalWon: maxLoanWon,
        annualRatePercent: stressRate,
        loanPeriodYears,
        repaymentType: 'EQUAL_PRINCIPAL',
      });

      const annualDebtService = testCalc.firstMonthPaymentWon * 12;
      const actualDsrPercent = (annualDebtService / annualIncomeWon) * 100;
      if (actualDsrPercent > worstCaseDsrP) worstCaseDsrP = actualDsrPercent;

      expect(actualDsrPercent).toBeLessThanOrEqual(40.00001);
    }

    expect(worstCaseDsrP).toBeLessThanOrEqual(40.00001);
  });

  it('ADV-04.3: Low Income Boundary (20M <= I < 60M KRW) — Discrete 1-Won Rounding Residual bounded by <= 6.0 KRW (DSR <= 40.00003%)', () => {
    let worstCaseResidualWon = 0;
    let worstCaseDsr = 0;

    for (let i = 0; i < 500; i++) {
      const annualIncomeWon = 20_000_000 + ((i * 7919) % 39_000_000); // 20M ~ 59M KRW
      const baseRatePercent = 2.5 + ((i * 17) % 55) / 10;
      const loanPeriodYears = 5 + ((i * 7) % 45);
      const stressSpreadPercent = 1.2;
      const dsrLimitRatio = 0.40;

      const dsrResult = calculateDsrMaxLoan({
        annualIncomeWon,
        baseRatePercent,
        loanPeriodYears,
        repaymentType: 'EQUAL_PRINCIPAL',
        stressSpreadPercent,
        dsrLimitRatio,
      });

      const maxLoanWon = dsrResult.maxLoanWon;
      if (maxLoanWon === 0) continue;

      const stressRate = baseRatePercent + stressSpreadPercent;
      const testCalc = calculateMortgageLoan({
        principalWon: maxLoanWon,
        annualRatePercent: stressRate,
        loanPeriodYears,
        repaymentType: 'EQUAL_PRINCIPAL',
      });

      const annualDebtService = testCalc.firstMonthPaymentWon * 12;
      const actualDsrPercent = (annualDebtService / annualIncomeWon) * 100;
      const residualWon = annualDebtService - annualIncomeWon * 0.40;

      if (residualWon > worstCaseResidualWon) worstCaseResidualWon = residualWon;
      if (actualDsrPercent > worstCaseDsr) worstCaseDsr = actualDsrPercent;

      // Residual is strictly bounded by integer Won discretization: <= 6.0 KRW
      expect(residualWon).toBeLessThanOrEqual(6.0);
      expect(actualDsrPercent).toBeLessThanOrEqual(40.00003);
    }

    expect(worstCaseResidualWon).toBeLessThanOrEqual(6.0);
    expect(worstCaseDsr).toBeLessThanOrEqual(40.00003);
  });

  it('ADV-04.4: Zero Income produces exactly zero max loan without division-by-zero anomaly', () => {
    const result = calculateDsrMaxLoan({
      annualIncomeWon: 0,
      baseRatePercent: 4.5,
      loanPeriodYears: 30,
    });

    expect(result.maxLoanWon).toBe(0);
    expect(result.maxMonthlyPaymentWon).toBe(0);
    expect(result.maxAnnualDebtServiceWon).toBe(0);
  });
});

describe('Adversarial Challenge 5: Negative, Malformed, Out-of-bounds Inputs Guard Robustness', () => {
  it('ADV-05.1: Negative and out-of-bounds values strictly rejected with ZodError', () => {
    const invalidInputs = [
      { principalWon: -1, annualRatePercent: 4.0, loanPeriodYears: 30 },
      { principalWon: 100_000_000, annualRatePercent: -0.1, loanPeriodYears: 30 },
      { principalWon: 100_000_000, annualRatePercent: 100.1, loanPeriodYears: 30 },
      { principalWon: 100_000_000, annualRatePercent: 4.0, loanPeriodYears: 0 },
      { principalWon: 100_000_000, annualRatePercent: 4.0, loanPeriodYears: 51 },
      { principalWon: NaN, annualRatePercent: 4.0, loanPeriodYears: 30 },
      { principalWon: 100_000_000, annualRatePercent: NaN, loanPeriodYears: 30 },
      { principalWon: Infinity, annualRatePercent: 4.0, loanPeriodYears: 30 },
      { principalWon: 100_000_000, annualRatePercent: Infinity, loanPeriodYears: 30 },
      { principalWon: 100_000_000, annualRatePercent: 4.0, loanPeriodYears: Infinity },
    ];

    for (const input of invalidInputs) {
      expect(() => calculateEqualPrincipalAndInterest(input as any)).toThrow(ZodError);
      expect(() => calculateEqualPrincipal(input as any)).toThrow(ZodError);
      expect(() => calculateMortgageLoan(input as any)).toThrow(ZodError);
    }
  });

  it('ADV-05.2: DSR invalid inputs strictly rejected', () => {
    const invalidDsr = [
      { annualIncomeWon: -100, baseRatePercent: 4.0, loanPeriodYears: 30 },
      { annualIncomeWon: 100_000_000, baseRatePercent: -1, loanPeriodYears: 30 },
      { annualIncomeWon: 100_000_000, baseRatePercent: 4.0, loanPeriodYears: 0 },
      { annualIncomeWon: 100_000_000, baseRatePercent: 4.0, loanPeriodYears: 30, stressSpreadPercent: -0.5 },
      { annualIncomeWon: 100_000_000, baseRatePercent: 4.0, loanPeriodYears: 30, dsrLimitRatio: 1.5 },
      { annualIncomeWon: 100_000_000, baseRatePercent: 4.0, loanPeriodYears: 30, dsrLimitRatio: -0.1 },
    ];

    for (const input of invalidDsr) {
      expect(() => calculateDsrMaxLoan(input as any)).toThrow(ZodError);
    }
  });

  it('ADV-05.3: Reverse Jeonse Shortfall invalid inputs rejected', () => {
    const invalidJeonse = [
      { depositWon: -100, declineRate: 0.1 },
      { depositWon: 500_000_000, declineRate: -0.05 },
      { depositWon: 500_000_000, declineRate: 1.05 },
      { depositWon: 500_000_000, declineRate: 0.1, reservesWon: -100 },
    ];

    for (const input of invalidJeonse) {
      expect(() => calculateJeonseShortfall(input as any)).toThrow(ZodError);
    }
  });
});
