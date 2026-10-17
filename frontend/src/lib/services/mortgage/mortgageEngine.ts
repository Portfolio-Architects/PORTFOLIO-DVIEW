/**
 * @module mortgageEngine
 * @description Pure Functional Mathematical Finance Engine for Mortgage Amortization, Stress DSR Limits, Interest Rate Shock, and Jeonse Shortfall.
 * Computes exact closed-form solutions for equal principal and interest (원리금균등), equal principal (원금균등),
 * Stress DSR regulatory maximum loan bounds (스트레스 DSR 40% 한도 역산), rate shock sensitivity vectors,
 * and reverse Jeonse shortfall capital deficits.
 *
 * Epistemic Invariants:
 * 1. Sanitization & Runtime Invariant: Strict schema parsing via Zod v4 with non-negative and finite bounds.
 * 2. Equal Principal & Interest (원리금균등):
 *    PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 *    Singularity Defense (L'Hôpital Limit): lim_{r -> 0} PMT = P / n (enforced when r <= 1e-7).
 * 3. Equal Principal (원금균등):
 *    PMT_t = P/n + (P - (t-1)*P/n)*r
 *    Closed-form Total Interest: sum_{t=1}^n Interest_t = P * r * (n + 1) / 2
 *    Total Payment: P + P * r * (n + 1) / 2
 * 4. Stress DSR 40% Regulatory Inverse:
 *    R_stress = R_base + stressSpread (default 1.2%p)
 *    AnnualDebtService_max = annualIncome * dsrLimitRatio (default 40%)
 *    MonthlyDebtService_max = AnnualDebtService_max / 12
 *    Closed-form P_max inversion:
 *      - Equal PI: P_max = MonthlyDebtService_max * [(1+r_stress)^n - 1] / [r_stress * (1+r_stress)^n]
 *      - Equal P:  P_max = MonthlyDebtService_max / (1/n + r_stress)
 * 5. Interest Rate Shock Sensitivity:
 *    Delta PMT_k = PMT(P, R_base + Delta R_k, n) - PMT(P, R_base, n) for Delta R in [1.0, 1.5, 2.0, 3.0]%p
 * 6. Reverse Jeonse Shortfall:
 *    shortfall = max(0, deposit * declineRate - reserves)
 * 7. Numerical Stability & Clamping:
 *    Finite checks, division-by-zero guards, integer won rounding via Math.round, non-negative clamping via Math.max(0, x).
 * 8. Complexity & Purity:
 *    Time Complexity: O(1) closed-form calculation.
 *    Space Complexity: O(1).
 *    Side Effects: None (Pure Functional).
 */

import { z } from 'zod';

// ============================================================================
// 1. Zod v4 Validation Schemas & Type Definitions
// ============================================================================

export const RepaymentTypeEnum = z.enum([
  'EQUAL_PRINCIPAL_AND_INTEREST',
  'EQUAL_PRINCIPAL',
]);
export type RepaymentType = z.infer<typeof RepaymentTypeEnum>;

export const MortgageLoanInputSchema = z.object({
  principalWon: z.number().finite().nonnegative(),
  annualRatePercent: z.number().finite().min(0).max(100),
  loanPeriodYears: z.number().int().min(1).max(50),
  repaymentType: RepaymentTypeEnum.default('EQUAL_PRINCIPAL_AND_INTEREST'),
});
export type MortgageLoanInput = z.infer<typeof MortgageLoanInputSchema>;

export const DsrMaxLoanInputSchema = z.object({
  annualIncomeWon: z.number().finite().nonnegative(),
  baseRatePercent: z.number().finite().min(0).max(100),
  loanPeriodYears: z.number().int().min(1).max(50),
  repaymentType: RepaymentTypeEnum.default('EQUAL_PRINCIPAL_AND_INTEREST'),
  stressSpreadPercent: z.number().finite().min(0).default(1.2),
  dsrLimitRatio: z.number().finite().min(0).max(1).default(0.40),
});
export type DsrMaxLoanInput = z.infer<typeof DsrMaxLoanInputSchema>;

export const RateShockInputSchema = z.object({
  principalWon: z.number().finite().nonnegative(),
  baseRatePercent: z.number().finite().min(0).max(100),
  loanPeriodYears: z.number().int().min(1).max(50),
  repaymentType: RepaymentTypeEnum.default('EQUAL_PRINCIPAL_AND_INTEREST'),
  shockSpreads: z.array(z.number().finite().positive()).default([1.0, 1.5, 2.0, 3.0]),
});
export type RateShockInput = z.infer<typeof RateShockInputSchema>;

export const JeonseShortfallInputSchema = z.object({
  depositWon: z.number().finite().nonnegative(),
  declineRate: z.number().finite().min(0).max(1),
  reservesWon: z.number().finite().nonnegative().default(0),
});
export type JeonseShortfallInput = z.infer<typeof JeonseShortfallInputSchema>;

// ============================================================================
// 2. Output Interfaces
// ============================================================================

export interface AmortizationResult {
  monthlyPaymentWon: number;
  totalPaymentWon: number;
  totalInterestWon: number;
  loanPeriodMonths: number;
  monthlyRate: number;
}

export interface EqualPrincipalAmortizationResult {
  firstMonthPaymentWon: number;
  lastMonthPaymentWon: number;
  averageMonthlyPaymentWon: number;
  monthlyPrincipalWon: number;
  totalPaymentWon: number;
  totalInterestWon: number;
  loanPeriodMonths: number;
  monthlyRate: number;
}

export interface MortgageCalculationResult {
  repaymentType: RepaymentType;
  principalWon: number;
  annualRatePercent: number;
  loanPeriodYears: number;
  loanPeriodMonths: number;
  monthlyPaymentWon: number;
  firstMonthPaymentWon: number;
  lastMonthPaymentWon: number;
  averageMonthlyPaymentWon: number;
  totalPaymentWon: number;
  totalInterestWon: number;
  monthlyPrincipalWon: number;
}

export interface DsrMaxLoanResult {
  maxLoanWon: number;
  annualIncomeWon: number;
  dsrLimitRatio: number;
  maxAnnualDebtServiceWon: number;
  maxMonthlyPaymentWon: number;
  baseRatePercent: number;
  stressSpreadPercent: number;
  stressRatePercent: number;
  loanPeriodYears: number;
  repaymentType: RepaymentType;
}

export interface RateShockScenario {
  spreadPercent: number;
  shockedRatePercent: number;
  monthlyPaymentWon: number;
  deltaMonthlyPaymentWon: number;
  deltaAnnualPaymentWon: number;
  increaseRatePercent: number;
}

export interface RateShockResult {
  baseMonthlyPaymentWon: number;
  baseAnnualPaymentWon: number;
  baseRatePercent: number;
  scenarios: RateShockScenario[];
}

export interface JeonseShortfallResult {
  depositWon: number;
  declineRate: number;
  declineAmountWon: number;
  reservesWon: number;
  shortfallWon: number;
  hasShortfall: boolean;
}

// ============================================================================
// 3. Constants & Mathematical Guard Utilities
// ============================================================================

const RATE_EPSILON = 1e-7;

/**
 * Sanitizes numeric output, clamping negative or non-finite numbers to 0.
 */
function sanitizeNonNegative(val: number): number {
  if (!Number.isFinite(val) || Number.isNaN(val) || val <= 0) {
    return 0;
  }
  return val;
}

// ============================================================================
// 4. Closed-form Financial Engine Implementations
// ============================================================================

/**
 * Calculates equal principal and interest amortization (원리금균등 분할상환).
 * Closed-form equation: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
 * Singularity defense: r <= 1e-7 => PMT = P / n.
 *
 * Complexity: O(1) time, O(1) space.
 * Side-effects: none.
 */
export function calculateEqualPrincipalAndInterest(
  input: MortgageLoanInput
): AmortizationResult {
  const parsed = MortgageLoanInputSchema.parse(input);
  const { principalWon: P, annualRatePercent: R, loanPeriodYears: Y } = parsed;
  const n = Y * 12;

  if (P <= 0 || n <= 0) {
    return {
      monthlyPaymentWon: 0,
      totalPaymentWon: 0,
      totalInterestWon: 0,
      loanPeriodMonths: n,
      monthlyRate: 0,
    };
  }

  const r = R / 100 / 12;

  // L'Hôpital convergence guard when rate approaches zero
  if (r <= RATE_EPSILON) {
    const pmt = Math.round(P / n);
    return {
      monthlyPaymentWon: pmt,
      totalPaymentWon: P,
      totalInterestWon: 0,
      loanPeriodMonths: n,
      monthlyRate: r,
    };
  }

  const factor = Math.pow(1 + r, n);
  let pmtRaw: number;

  if (!Number.isFinite(factor) || factor === Infinity) {
    // Large n asymptotic limit: (1+r)^n / ((1+r)^n - 1) -> 1
    pmtRaw = P * r;
  } else {
    pmtRaw = (P * (r * factor)) / (factor - 1);
  }

  const monthlyPaymentWon = Math.round(sanitizeNonNegative(pmtRaw));
  const totalPaymentWon = monthlyPaymentWon * n;
  const totalInterestWon = Math.max(0, totalPaymentWon - P);

  return {
    monthlyPaymentWon,
    totalPaymentWon,
    totalInterestWon,
    loanPeriodMonths: n,
    monthlyRate: r,
  };
}

/**
 * Calculates equal principal amortization (원금균등 분할상환).
 * Closed-form equation: PMT_t = P/n + (P - (t-1)*P/n)*r
 * Closed-form total interest: TotalInterest = P * r * (n + 1) / 2
 *
 * Complexity: O(1) time, O(1) space.
 * Side-effects: none.
 */
export function calculateEqualPrincipal(
  input: MortgageLoanInput
): EqualPrincipalAmortizationResult {
  const parsed = MortgageLoanInputSchema.parse(input);
  const { principalWon: P, annualRatePercent: R, loanPeriodYears: Y } = parsed;
  const n = Y * 12;

  if (P <= 0 || n <= 0) {
    return {
      firstMonthPaymentWon: 0,
      lastMonthPaymentWon: 0,
      averageMonthlyPaymentWon: 0,
      monthlyPrincipalWon: 0,
      totalPaymentWon: 0,
      totalInterestWon: 0,
      loanPeriodMonths: n,
      monthlyRate: 0,
    };
  }

  const r = R / 100 / 12;
  const monthlyPrincipalExact = P / n;
  const monthlyPrincipalWon = Math.round(monthlyPrincipalExact);

  if (r <= RATE_EPSILON) {
    return {
      firstMonthPaymentWon: monthlyPrincipalWon,
      lastMonthPaymentWon: monthlyPrincipalWon,
      averageMonthlyPaymentWon: monthlyPrincipalWon,
      monthlyPrincipalWon,
      totalPaymentWon: P,
      totalInterestWon: 0,
      loanPeriodMonths: n,
      monthlyRate: r,
    };
  }

  // Exact closed-form sum of arithmetic progression for total interest
  const totalInterestExact = (P * r * (n + 1)) / 2;
  const totalInterestWon = Math.round(sanitizeNonNegative(totalInterestExact));
  const totalPaymentWon = P + totalInterestWon;

  // First month: t = 1, interest = P * r
  const firstMonthPaymentWon = Math.round(sanitizeNonNegative(monthlyPrincipalExact + P * r));

  // Last month: t = n, interest = (P/n) * r
  const lastMonthPaymentWon = Math.round(sanitizeNonNegative(monthlyPrincipalExact + monthlyPrincipalExact * r));

  // Average monthly payment: totalPayment / n
  const averageMonthlyPaymentWon = Math.round(totalPaymentWon / n);

  return {
    firstMonthPaymentWon,
    lastMonthPaymentWon,
    averageMonthlyPaymentWon,
    monthlyPrincipalWon,
    totalPaymentWon,
    totalInterestWon,
    loanPeriodMonths: n,
    monthlyRate: r,
  };
}

/**
 * Unified entry point for mortgage loan calculation supporting both repayment modes.
 *
 * Complexity: O(1) time, O(1) space.
 * Side-effects: none.
 */
export function calculateMortgageLoan(
  input: MortgageLoanInput
): MortgageCalculationResult {
  const parsed = MortgageLoanInputSchema.parse(input);
  const n = parsed.loanPeriodYears * 12;

  if (parsed.repaymentType === 'EQUAL_PRINCIPAL') {
    const eq = calculateEqualPrincipal(parsed);
    return {
      repaymentType: 'EQUAL_PRINCIPAL',
      principalWon: parsed.principalWon,
      annualRatePercent: parsed.annualRatePercent,
      loanPeriodYears: parsed.loanPeriodYears,
      loanPeriodMonths: n,
      monthlyPaymentWon: eq.firstMonthPaymentWon,
      firstMonthPaymentWon: eq.firstMonthPaymentWon,
      lastMonthPaymentWon: eq.lastMonthPaymentWon,
      averageMonthlyPaymentWon: eq.averageMonthlyPaymentWon,
      totalPaymentWon: eq.totalPaymentWon,
      totalInterestWon: eq.totalInterestWon,
      monthlyPrincipalWon: eq.monthlyPrincipalWon,
    };
  }

  const amort = calculateEqualPrincipalAndInterest(parsed);
  const monthlyPrincipalWon = n > 0 ? Math.round(parsed.principalWon / n) : 0;

  return {
    repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
    principalWon: parsed.principalWon,
    annualRatePercent: parsed.annualRatePercent,
    loanPeriodYears: parsed.loanPeriodYears,
    loanPeriodMonths: n,
    monthlyPaymentWon: amort.monthlyPaymentWon,
    firstMonthPaymentWon: amort.monthlyPaymentWon,
    lastMonthPaymentWon: amort.monthlyPaymentWon,
    averageMonthlyPaymentWon: amort.monthlyPaymentWon,
    totalPaymentWon: amort.totalPaymentWon,
    totalInterestWon: amort.totalInterestWon,
    monthlyPrincipalWon,
  };
}

/**
 * Inverts the regulatory DSR 40% constraint under Stress DSR rate to compute maximum allowable loan principal P_max.
 * Stress rate = baseRatePercent + stressSpreadPercent (default +1.2%p).
 * DSR Limit = annualIncomeWon * dsrLimitRatio (default 0.40).
 *
 * Inversion derivations:
 * - Equal Principal & Interest:
 *   PMT_max = (Income * DSR) / 12
 *   P_max = PMT_max * [(1+r_stress)^n - 1] / [r_stress * (1+r_stress)^n]
 * - Equal Principal:
 *   PMT_max = P * (1/n + r_stress)
 *   P_max = PMT_max / (1/n + r_stress)
 *
 * Complexity: O(1) time, O(1) space.
 * Side-effects: none.
 */
export function calculateDsrMaxLoan(
  input: DsrMaxLoanInput
): DsrMaxLoanResult {
  const parsed = DsrMaxLoanInputSchema.parse(input);
  const {
    annualIncomeWon: I,
    baseRatePercent: R_base,
    loanPeriodYears: Y,
    repaymentType,
    stressSpreadPercent,
    dsrLimitRatio,
  } = parsed;

  const n = Y * 12;
  const stressRatePercent = R_base + stressSpreadPercent;

  if (I <= 0 || n <= 0) {
    return {
      maxLoanWon: 0,
      annualIncomeWon: I,
      dsrLimitRatio,
      maxAnnualDebtServiceWon: 0,
      maxMonthlyPaymentWon: 0,
      baseRatePercent: R_base,
      stressSpreadPercent,
      stressRatePercent,
      loanPeriodYears: Y,
      repaymentType,
    };
  }

  const maxAnnualDebtServiceWon = Math.round(I * dsrLimitRatio);
  const maxMonthlyPaymentWon = Math.round(maxAnnualDebtServiceWon / 12);
  const targetMonthlyPaymentExact = (I * dsrLimitRatio) / 12;

  const r_stress = stressRatePercent / 100 / 12;
  let maxLoanExact: number;

  if (repaymentType === 'EQUAL_PRINCIPAL') {
    const denom = 1 / n + r_stress;
    if (denom <= 0) {
      maxLoanExact = 0;
    } else {
      maxLoanExact = targetMonthlyPaymentExact / denom;
    }
  } else {
    // Equal principal and interest
    if (r_stress <= RATE_EPSILON) {
      maxLoanExact = targetMonthlyPaymentExact * n;
    } else {
      const factor = Math.pow(1 + r_stress, n);
      if (!Number.isFinite(factor) || factor === Infinity) {
        maxLoanExact = targetMonthlyPaymentExact / r_stress;
      } else {
        maxLoanExact = (targetMonthlyPaymentExact * (factor - 1)) / (r_stress * factor);
      }
    }
  }

  const maxLoanWon = Math.round(sanitizeNonNegative(maxLoanExact));

  return {
    maxLoanWon,
    annualIncomeWon: I,
    dsrLimitRatio,
    maxAnnualDebtServiceWon,
    maxMonthlyPaymentWon,
    baseRatePercent: R_base,
    stressSpreadPercent,
    stressRatePercent,
    loanPeriodYears: Y,
    repaymentType,
  };
}

/**
 * Calculates interest rate shock sensitivity matrix across defined spread intervals.
 * Standard stress shocks: [+1.0%p, +1.5%p, +2.0%p, +3.0%p].
 * Computes monthly Delta PMT and annualized additional debt service burden.
 *
 * Complexity: O(K) where K = number of shock spreads (O(1) amortized).
 * Side-effects: none.
 */
export function calculateInterestRateShock(
  input: RateShockInput
): RateShockResult {
  const parsed = RateShockInputSchema.parse(input);
  const {
    principalWon,
    baseRatePercent,
    loanPeriodYears,
    repaymentType,
    shockSpreads,
  } = parsed;

  const baseCalc = calculateMortgageLoan({
    principalWon,
    annualRatePercent: baseRatePercent,
    loanPeriodYears,
    repaymentType,
  });

  const baseMonthlyPaymentWon = baseCalc.monthlyPaymentWon;
  const baseAnnualPaymentWon = baseMonthlyPaymentWon * 12;

  const scenarios: RateShockScenario[] = shockSpreads.map((spreadPercent) => {
    const shockedRatePercent = Math.min(100, baseRatePercent + spreadPercent);
    const shockedCalc = calculateMortgageLoan({
      principalWon,
      annualRatePercent: shockedRatePercent,
      loanPeriodYears,
      repaymentType,
    });

    const monthlyPaymentWon = shockedCalc.monthlyPaymentWon;
    const deltaMonthlyPaymentWon = monthlyPaymentWon - baseMonthlyPaymentWon;
    const deltaAnnualPaymentWon = deltaMonthlyPaymentWon * 12;

    const increaseRatePercent =
      baseMonthlyPaymentWon > 0
        ? Math.round(((deltaMonthlyPaymentWon / baseMonthlyPaymentWon) * 100) * 100) / 100
        : 0;

    return {
      spreadPercent,
      shockedRatePercent,
      monthlyPaymentWon,
      deltaMonthlyPaymentWon,
      deltaAnnualPaymentWon,
      increaseRatePercent,
    };
  });

  return {
    baseMonthlyPaymentWon,
    baseAnnualPaymentWon,
    baseRatePercent,
    scenarios,
  };
}

/**
 * Calculates reverse Jeonse shortfall capital deficit (역전세 결손액).
 * Closed-form equation: shortfall = max(0, deposit * declineRate - reserves)
 *
 * Complexity: O(1) time, O(1) space.
 * Side-effects: none.
 */
export function calculateJeonseShortfall(
  input: JeonseShortfallInput
): JeonseShortfallResult {
  const parsed = JeonseShortfallInputSchema.parse(input);
  const { depositWon, declineRate, reservesWon } = parsed;

  const declineAmountWon = Math.round(depositWon * declineRate);
  const shortfallExact = Math.max(0, declineAmountWon - reservesWon);
  const shortfallWon = Math.round(sanitizeNonNegative(shortfallExact));

  return {
    depositWon,
    declineRate,
    declineAmountWon,
    reservesWon,
    shortfallWon,
    hasShortfall: shortfallWon > 0,
  };
}
