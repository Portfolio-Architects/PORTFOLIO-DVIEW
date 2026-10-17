/**
 * @file mortgageEngine.test.ts
 * @description Comprehensive unit tests for mortgage financial calculation engine.
 * Epistemic verification of closed-form solutions, Stress DSR 40% regulatory inversion,
 * rate shock sensitivity vectors, reverse Jeonse shortfall deficits, and singularity/boundary defense.
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

describe('MortgageEngine — Mathematical Analytical Accuracy', () => {
  describe('Equal Principal and Interest (원리금균등 분할상환)', () => {
    it('should compute exact monthly payment within <= 1 KRW of analytical closed-form for 500M KRW, 4.0%, 30Y', () => {
      const input = {
        principalWon: 500_000_000,
        annualRatePercent: 4.0,
        loanPeriodYears: 30,
        repaymentType: RepaymentTypeEnum.enum.EQUAL_PRINCIPAL_AND_INTEREST,
      };

      // Analytical formulation:
      // r = 0.04 / 12, n = 360
      // factor = (1 + r)^360 = 3.32011684...
      // PMT_exact = 500M * [r * factor] / [factor - 1] = 2,387,075.69... KRW
      const result = calculateEqualPrincipalAndInterest(input);

      expect(Math.abs(result.monthlyPaymentWon - 2_387_076)).toBeLessThanOrEqual(1);
      expect(result.loanPeriodMonths).toBe(360);
      expect(result.totalPaymentWon).toBe(result.monthlyPaymentWon * 360);
      expect(result.totalInterestWon).toBe(result.totalPaymentWon - 500_000_000);
      expect(result.totalInterestWon).toBe(359_347_360);
    });

    it('should compute exact monthly payment within <= 1 KRW for 300M KRW, 3.5%, 20Y', () => {
      const input = {
        principalWon: 300_000_000,
        annualRatePercent: 3.5,
        loanPeriodYears: 20,
        repaymentType: RepaymentTypeEnum.enum.EQUAL_PRINCIPAL_AND_INTEREST,
      };

      // r = 0.035 / 12, n = 240
      // PMT_exact = 300M * (r*(1+r)^240) / ((1+r)^240 - 1) = 1,739,889.70... KRW
      const result = calculateEqualPrincipalAndInterest(input);

      expect(Math.abs(result.monthlyPaymentWon - 1_739_879)).toBeLessThanOrEqual(1);
      expect(result.loanPeriodMonths).toBe(240);
      expect(result.totalPaymentWon).toBe(result.monthlyPaymentWon * 240);
      expect(result.totalInterestWon).toBe(result.totalPaymentWon - 300_000_000);
    });
  });

  describe('Equal Principal (원금균등 분할상환)', () => {
    it('should compute exact first month, last month, and closed-form total interest for 500M KRW, 4.0%, 30Y', () => {
      const input = {
        principalWon: 500_000_000,
        annualRatePercent: 4.0,
        loanPeriodYears: 30,
        repaymentType: RepaymentTypeEnum.enum.EQUAL_PRINCIPAL,
      };

      // Analytical formulation:
      // n = 360, monthlyPrincipal = 500M / 360 = 1,388,888.88... KRW
      // PMT_1 = monthlyPrincipal + 500M * (0.04 / 12) = 1,388,888.88... + 1,666,666.66... = 3,055,555.55... KRW -> 3,055,556 KRW
      // PMT_360 = monthlyPrincipal + (500M / 360) * (0.04 / 12) = 1,388,888.88... + 4,629.62... = 1,393,518.51... KRW -> 1,393,519 KRW
      // Total Interest = P * r * (n + 1) / 2 = 500M * (0.04 / 12) * 361 / 2 = 300,833,333.33... KRW -> 300,833,333 KRW
      const result = calculateEqualPrincipal(input);

      expect(Math.abs(result.firstMonthPaymentWon - 3_055_556)).toBeLessThanOrEqual(1);
      expect(Math.abs(result.lastMonthPaymentWon - 1_393_519)).toBeLessThanOrEqual(1);
      expect(Math.abs(result.totalInterestWon - 300_833_333)).toBeLessThanOrEqual(1);
      expect(result.totalPaymentWon).toBe(500_000_000 + result.totalInterestWon);
      expect(result.monthlyPrincipalWon).toBe(Math.round(500_000_000 / 360));
      expect(result.averageMonthlyPaymentWon).toBe(Math.round(result.totalPaymentWon / 360));
    });

    it('should verify that closed-form total interest strictly equals the exact arithmetic progression sum', () => {
      const P = 120_000_000;
      const R = 6.0;
      const Y = 10;
      const n = Y * 12; // 120
      const r = R / 100 / 12;

      // Iterative summation of monthly interest
      let iterativeInterestSum = 0;
      for (let t = 1; t <= n; t++) {
        const remainingPrincipal = P - ((t - 1) * P) / n;
        iterativeInterestSum += remainingPrincipal * r;
      }

      const result = calculateEqualPrincipal({
        principalWon: P,
        annualRatePercent: R,
        loanPeriodYears: Y,
        repaymentType: RepaymentTypeEnum.enum.EQUAL_PRINCIPAL,
      });

      expect(Math.abs(result.totalInterestWon - Math.round(iterativeInterestSum))).toBeLessThanOrEqual(1);
    });
  });

  describe('Unified Mortgage Calculation Interface', () => {
    it('should route to equal principal and interest calculation correctly', () => {
      const res = calculateMortgageLoan({
        principalWon: 500_000_000,
        annualRatePercent: 4.0,
        loanPeriodYears: 30,
        repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
      });

      expect(res.repaymentType).toBe('EQUAL_PRINCIPAL_AND_INTEREST');
      expect(res.monthlyPaymentWon).toBe(2_387_076);
      expect(res.firstMonthPaymentWon).toBe(2_387_076);
      expect(res.lastMonthPaymentWon).toBe(2_387_076);
      expect(res.totalPaymentWon).toBe(859_347_360);
    });

    it('should route to equal principal calculation correctly', () => {
      const res = calculateMortgageLoan({
        principalWon: 500_000_000,
        annualRatePercent: 4.0,
        loanPeriodYears: 30,
        repaymentType: 'EQUAL_PRINCIPAL',
      });

      expect(res.repaymentType).toBe('EQUAL_PRINCIPAL');
      expect(res.firstMonthPaymentWon).toBe(3_055_556);
      expect(res.lastMonthPaymentWon).toBe(1_393_519);
      expect(res.monthlyPaymentWon).toBe(3_055_556);
      expect(res.totalInterestWon).toBe(300_833_333);
    });
  });
});

describe('MortgageEngine — Stress DSR 40% Inversion Verification', () => {
  it('should invert regulatory DSR 40% with +1.2%p stress rate for Equal Principal & Interest', () => {
    // Annual income: 100,000,000 KRW
    // DSR Limit: 40% => Annual max debt service = 40,000,000 KRW
    // Monthly max debt service = 40,000,000 / 12 = 3,333,333.33... KRW
    // Base rate: 4.0%, Stress spread: +1.2%p => Stress rate: 5.2%
    // Loan period: 30 years (360 months)
    const result = calculateDsrMaxLoan({
      annualIncomeWon: 100_000_000,
      baseRatePercent: 4.0,
      loanPeriodYears: 30,
      repaymentType: 'EQUAL_PRINCIPAL_AND_INTEREST',
      stressSpreadPercent: 1.2,
      dsrLimitRatio: 0.40,
    });

    expect(result.stressRatePercent).toBe(5.2);
    expect(result.maxAnnualDebtServiceWon).toBe(40_000_000);
    expect(result.maxMonthlyPaymentWon).toBe(3_333_333);
    expect(result.maxLoanWon).toBe(607_041_938);

    // Verify duality: Plugging maxLoanWon back into PMT at stress rate 5.2% yields <= target monthly debt service
    const verifyAmort = calculateEqualPrincipalAndInterest({
      principalWon: result.maxLoanWon,
      annualRatePercent: 5.2,
      loanPeriodYears: 30,
    });

    expect(Math.abs(verifyAmort.monthlyPaymentWon - result.maxMonthlyPaymentWon)).toBeLessThanOrEqual(1);
    expect(verifyAmort.monthlyPaymentWon * 12).toBeLessThanOrEqual(40_000_000);
  });

  it('should invert regulatory DSR 40% with +1.2%p stress rate for Equal Principal', () => {
    // Equal principal DSR inversion based on first month maximum payment:
    // PMT_1 = P * (1/n + r_stress) <= 3,333,333.33...
    // P_max = 3,333,333.33... / (1/360 + 0.052 / 12) = 468,750,000 KRW
    const result = calculateDsrMaxLoan({
      annualIncomeWon: 100_000_000,
      baseRatePercent: 4.0,
      loanPeriodYears: 30,
      repaymentType: 'EQUAL_PRINCIPAL',
      stressSpreadPercent: 1.2,
      dsrLimitRatio: 0.40,
    });

    expect(result.maxLoanWon).toBe(468_750_000);

    // Verify duality: First month payment at stress rate 5.2%
    const verifyEqualP = calculateEqualPrincipal({
      principalWon: result.maxLoanWon,
      annualRatePercent: 5.2,
      loanPeriodYears: 30,
    });

    expect(Math.abs(verifyEqualP.firstMonthPaymentWon - result.maxMonthlyPaymentWon)).toBeLessThanOrEqual(1);
  });

  it('should return 0 max loan when annual income is 0', () => {
    const result = calculateDsrMaxLoan({
      annualIncomeWon: 0,
      baseRatePercent: 4.0,
      loanPeriodYears: 30,
    });

    expect(result.maxLoanWon).toBe(0);
    expect(result.maxAnnualDebtServiceWon).toBe(0);
    expect(result.maxMonthlyPaymentWon).toBe(0);
  });

  it('should support non-capital stress spread (0.75%p) and custom DSR limit (50%)', () => {
    const result = calculateDsrMaxLoan({
      annualIncomeWon: 80_000_000,
      baseRatePercent: 3.8,
      loanPeriodYears: 30,
      stressSpreadPercent: 0.75,
      dsrLimitRatio: 0.50,
    });

    expect(result.stressRatePercent).toBe(4.55);
    expect(result.maxAnnualDebtServiceWon).toBe(40_000_000);
    expect(result.maxLoanWon).toBeGreaterThan(600_000_000);
  });
});

describe('MortgageEngine — Interest Rate Shock Sensitivity', () => {
  it('should generate 4 standard rate shock scenarios (+1.0%p, +1.5%p, +2.0%p, +3.0%p)', () => {
    const input = {
      principalWon: 500_000_000,
      baseRatePercent: 4.0,
      loanPeriodYears: 30,
      repaymentType: RepaymentTypeEnum.enum.EQUAL_PRINCIPAL_AND_INTEREST,
    };

    const result = calculateInterestRateShock(input);

    expect(result.baseRatePercent).toBe(4.0);
    expect(result.baseMonthlyPaymentWon).toBe(2_387_076);
    expect(result.baseAnnualPaymentWon).toBe(2_387_076 * 12);
    expect(result.scenarios).toHaveLength(4);

    const [s1, s2, s3, s4] = result.scenarios;

    // +1.0%p => 5.0%
    expect(s1.spreadPercent).toBe(1.0);
    expect(s1.shockedRatePercent).toBe(5.0);
    expect(s1.monthlyPaymentWon).toBe(2_684_108);
    expect(s1.deltaMonthlyPaymentWon).toBe(2_684_108 - 2_387_076); // +297,032
    expect(s1.deltaAnnualPaymentWon).toBe(s1.deltaMonthlyPaymentWon * 12);
    expect(s1.increaseRatePercent).toBeCloseTo(12.44, 1);

    // +1.5%p => 5.5%
    expect(s2.spreadPercent).toBe(1.5);
    expect(s2.shockedRatePercent).toBe(5.5);
    expect(s2.monthlyPaymentWon).toBe(2_838_945);
    expect(s2.deltaMonthlyPaymentWon).toBe(2_838_945 - 2_387_076); // +451,869

    // +2.0%p => 6.0%
    expect(s3.spreadPercent).toBe(2.0);
    expect(s3.shockedRatePercent).toBe(6.0);
    expect(s3.monthlyPaymentWon).toBe(2_997_753);
    expect(s3.deltaMonthlyPaymentWon).toBe(2_997_753 - 2_387_076); // +610,677

    // +3.0%p => 7.0%
    expect(s4.spreadPercent).toBe(3.0);
    expect(s4.shockedRatePercent).toBe(7.0);
    expect(s4.monthlyPaymentWon).toBe(3_326_512);
    expect(s4.deltaMonthlyPaymentWon).toBe(3_326_512 - 2_387_076); // +939,436

    // Invariant: Monthly payment and delta must be strictly monotonically increasing
    expect(s1.monthlyPaymentWon).toBeLessThan(s2.monthlyPaymentWon);
    expect(s2.monthlyPaymentWon).toBeLessThan(s3.monthlyPaymentWon);
    expect(s3.monthlyPaymentWon).toBeLessThan(s4.monthlyPaymentWon);
  });
});

describe('MortgageEngine — Reverse Jeonse Shortfall Deficit', () => {
  it('should compute positive shortfall when reserve liquidity is insufficient', () => {
    // Deposit: 500,000,000 KRW, 10% decline = 50,000,000 KRW decline, Reserves: 20,000,000 KRW
    // Shortfall = max(0, 50,000,000 - 20,000,000) = 30,000,000 KRW
    const result = calculateJeonseShortfall({
      depositWon: 500_000_000,
      declineRate: 0.10,
      reservesWon: 20_000_000,
    });

    expect(result.depositWon).toBe(500_000_000);
    expect(result.declineRate).toBe(0.10);
    expect(result.declineAmountWon).toBe(50_000_000);
    expect(result.reservesWon).toBe(20_000_000);
    expect(result.shortfallWon).toBe(30_000_000);
    expect(result.hasShortfall).toBe(true);
  });

  it('should clamp shortfall to 0 when reserve liquidity exceeds decline amount', () => {
    // Deposit: 500,000,000 KRW, 10% decline = 50,000,000 KRW, Reserves: 60,000,000 KRW
    // Shortfall = max(0, 50,000,000 - 60,000,000) = 0 KRW
    const result = calculateJeonseShortfall({
      depositWon: 500_000_000,
      declineRate: 0.10,
      reservesWon: 60_000_000,
    });

    expect(result.shortfallWon).toBe(0);
    expect(result.hasShortfall).toBe(false);
  });

  it('should default reserves to 0 if omitted and calculate shortfall equal to full decline amount', () => {
    const result = calculateJeonseShortfall({
      depositWon: 400_000_000,
      declineRate: 0.15,
    } as unknown as { depositWon: number; declineRate: number; reservesWon: number });

    expect(result.declineAmountWon).toBe(60_000_000);
    expect(result.reservesWon).toBe(0);
    expect(result.shortfallWon).toBe(60_000_000);
    expect(result.hasShortfall).toBe(true);
  });
});

describe('MortgageEngine — Extreme Values and Boundary Defense (EXT-01 ~ EXT-05)', () => {
  it('EXT-01: Large Principal (10B KRW), Minimal Rate (0.01%), Long Duration (50Y)', () => {
    const result = calculateEqualPrincipalAndInterest({
      principalWon: 10_000_000_000,
      annualRatePercent: 0.01,
      loanPeriodYears: 50,
    });

    expect(Number.isFinite(result.monthlyPaymentWon)).toBe(true);
    expect(Number.isNaN(result.monthlyPaymentWon)).toBe(false);
    expect(result.monthlyPaymentWon).toBe(16_708_437);
    expect(result.totalInterestWon).toBeGreaterThan(0);
    expect(Number.isFinite(result.totalPaymentWon)).toBe(true);
  });

  it('EXT-02: Zero Interest Rate (0.0%) Singularity — L’Hôpital Convergence', () => {
    const resultPI = calculateEqualPrincipalAndInterest({
      principalWon: 500_000_000,
      annualRatePercent: 0.0,
      loanPeriodYears: 30,
    });

    // PMT = P / n = 500M / 360 = 1,388,888.88... KRW -> 1,388,889 KRW
    expect(resultPI.monthlyPaymentWon).toBe(1_388_889);
    expect(resultPI.totalInterestWon).toBe(0);
    expect(resultPI.totalPaymentWon).toBe(500_000_000);

    const resultP = calculateEqualPrincipal({
      principalWon: 500_000_000,
      annualRatePercent: 0.0,
      loanPeriodYears: 30,
    });

    expect(resultP.firstMonthPaymentWon).toBe(1_388_889);
    expect(resultP.lastMonthPaymentWon).toBe(1_388_889);
    expect(resultP.totalInterestWon).toBe(0);
    expect(resultP.totalPaymentWon).toBe(500_000_000);
  });

  it('EXT-03: Zero Loan Principal (0 KRW)', () => {
    const resultPI = calculateEqualPrincipalAndInterest({
      principalWon: 0,
      annualRatePercent: 4.5,
      loanPeriodYears: 30,
    });

    expect(resultPI.monthlyPaymentWon).toBe(0);
    expect(resultPI.totalPaymentWon).toBe(0);
    expect(resultPI.totalInterestWon).toBe(0);

    const resultP = calculateEqualPrincipal({
      principalWon: 0,
      annualRatePercent: 4.5,
      loanPeriodYears: 30,
    });

    expect(resultP.firstMonthPaymentWon).toBe(0);
    expect(resultP.lastMonthPaymentWon).toBe(0);
    expect(resultP.totalPaymentWon).toBe(0);
    expect(resultP.totalInterestWon).toBe(0);
  });

  it('EXT-04: Abnormal and Negative Inputs Rejected by Zod Schema', () => {
    // Negative principal
    expect(() =>
      calculateMortgageLoan({
        principalWon: -10_000,
        annualRatePercent: 4.0,
        loanPeriodYears: 30,
      })
    ).toThrow(ZodError);

    // Negative rate
    expect(() =>
      calculateMortgageLoan({
        principalWon: 500_000_000,
        annualRatePercent: -1.0,
        loanPeriodYears: 30,
      })
    ).toThrow(ZodError);

    // Rate exceeding 100%
    expect(() =>
      calculateMortgageLoan({
        principalWon: 500_000_000,
        annualRatePercent: 105.0,
        loanPeriodYears: 30,
      })
    ).toThrow(ZodError);

    // Loan period 0 or > 50
    expect(() =>
      calculateMortgageLoan({
        principalWon: 500_000_000,
        annualRatePercent: 4.0,
        loanPeriodYears: 0,
      })
    ).toThrow(ZodError);

    expect(() =>
      calculateMortgageLoan({
        principalWon: 500_000_000,
        annualRatePercent: 4.0,
        loanPeriodYears: 55,
      })
    ).toThrow(ZodError);

    // Non-finite (NaN, Infinity)
    expect(() =>
      calculateMortgageLoan({
        principalWon: NaN,
        annualRatePercent: 4.0,
        loanPeriodYears: 30,
      })
    ).toThrow(ZodError);

    expect(() =>
      calculateMortgageLoan({
        principalWon: Infinity,
        annualRatePercent: 4.0,
        loanPeriodYears: 30,
      })
    ).toThrow(ZodError);

    // DSR input invalid
    expect(() =>
      calculateDsrMaxLoan({
        annualIncomeWon: -1,
        baseRatePercent: 4.0,
        loanPeriodYears: 30,
      })
    ).toThrow(ZodError);

    // Jeonse shortfall invalid decline rate (> 1.0 or < 0)
    expect(() =>
      calculateJeonseShortfall({
        depositWon: 500_000_000,
        declineRate: 1.5,
      })
    ).toThrow(ZodError);
  });

  it('EXT-05: Zod Schema safeParse returns error vector for invalid input without crash', () => {
    const parseResult = MortgageLoanInputSchema.safeParse({
      principalWon: -500,
      annualRatePercent: 'invalid',
      loanPeriodYears: 60,
    });

    expect(parseResult.success).toBe(false);
    if (!parseResult.success) {
      expect(parseResult.error.issues.length).toBeGreaterThan(0);
    }
  });
});
