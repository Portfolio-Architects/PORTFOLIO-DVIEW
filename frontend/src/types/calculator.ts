/**
 * @module calculator
 * @description Canonical models for Financial, Tax, Mortgage, and Sell Timing Engines.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Acquisition cost breakdown result */
export interface AcquisitionCostResult {
  acquisitionTax: number;
  localEducationTax: number;
  specialRuralTax: number;
  totalTax: number;
  brokerageFee: number;
  totalCost: number;
}

/** Individual row in amortization schedule */
export interface MortgagePaymentScheduleItem {
  month: number;
  principal: number;
  interest: number;
  totalPayment: number;
  remainingBalance: number;
}

/** Mortgage calculation output */
export interface MortgageLoanResult {
  monthlyPayment: number;
  totalInterest: number;
  totalPayment: number;
  schedule: MortgagePaymentScheduleItem[];
}

/** AI Sell Timing verdict outcome */
export interface VerdictResult {
  score: number;
  verdict: '호구 아님 (안전)' | '주의 요망 (신중)' | '위험 구간 (경고)';
  rotationRate: number;
  marketMomentum: number;
  reason: string;
}

/** Real estate capital gains tax computation result */
export interface TaxResult {
  transferProfit: number;
  longTermDeduction: number;
  taxableBase: number;
  basicDeduction: number;
  taxRate: number;
  computedTax: number;
  progressiveDeduction: number;
  localTax: number;
  totalTax: number;
  isTaxFree: boolean;
}

/** User preference quiz responses */
export interface QuizAnswer {
  budget: string;
  family: string;
  transit: string;
  lifestyle: string;
  scaleBrand: string;
  yearBuilt: string;
  investmentStyle: string;
}
