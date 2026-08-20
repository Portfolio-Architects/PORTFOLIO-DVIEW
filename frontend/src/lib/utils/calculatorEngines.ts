/**
 * @module calculatorEngines
 * @description Shared quantitative engines for mortgage, property tax, acquisition tax, jeonse safety, and sell timing.
 */

export interface AcquisitionCostResult {
  tax: number;
  brokerFee: number;
  otherFee: number;
  totalFees: number;
}

/**
 * Calculates estimated acquisition tax, brokerage fee, and administrative costs.
 * @param price - Real transaction price in Man-won
 */
export function calculateAcquisitionCost(price: number): AcquisitionCostResult {
  if (!price || price <= 0) {
    return { tax: 0, brokerFee: 0, otherFee: 0, totalFees: 0 };
  }

  let taxRate = 0.01;
  if (price > 90000) {
    taxRate = 0.03;
  } else if (price > 60000) {
    taxRate = 0.01 + ((price - 60000) / 30000) * 0.02;
  }

  const tax = Math.round(price * taxRate);
  const brokerFee = Math.round(price * 0.004);
  const otherFee = Math.round(price * 0.002);

  return {
    tax,
    brokerFee,
    otherFee,
    totalFees: tax + brokerFee + otherFee,
  };
}

export interface MortgageRepaymentSchedule {
  month: number;
  principal: number;
  interest: number;
  payment: number;
  remaining: number;
}

export interface MortgageLoanResult {
  monthlyPayment: number;
  totalInterest: number;
  totalRepayment: number;
  schedule: MortgageRepaymentSchedule[];
}

/**
 * Calculates equal principal & interest (원리금균등) or equal principal (원금균등) mortgage repayment.
 * @param loanAmountManWon - Principal in Man-won
 * @param annualRatePercent - Annual interest rate (e.g. 3.5 for 3.5%)
 * @param termYears - Loan period in years (e.g. 30)
 * @param repaymentType - 'equal_principal_interest' | 'equal_principal'
 */
export function calculateMortgageLoan(
  loanAmountManWon: number,
  annualRatePercent: number,
  termYears: number,
  repaymentType: 'equal_principal_interest' | 'equal_principal' = 'equal_principal_interest'
): MortgageLoanResult {
  if (loanAmountManWon <= 0 || termYears <= 0) {
    return { monthlyPayment: 0, totalInterest: 0, totalRepayment: 0, schedule: [] };
  }

  const totalMonths = termYears * 12;
  const monthlyRate = annualRatePercent / 100 / 12;
  const schedule: MortgageRepaymentSchedule[] = [];
  let remaining = loanAmountManWon;
  let totalInterest = 0;

  if (repaymentType === 'equal_principal_interest') {
    const factor = Math.pow(1 + monthlyRate, totalMonths);
    const monthlyPayment = monthlyRate > 0 ? Math.round((loanAmountManWon * monthlyRate * factor) / (factor - 1)) : Math.round(loanAmountManWon / totalMonths);

    for (let m = 1; m <= totalMonths; m++) {
      const interest = monthlyRate > 0 ? Math.round(remaining * monthlyRate) : 0;
      const principal = m === totalMonths ? remaining : Math.min(monthlyPayment - interest, remaining);
      remaining = Math.max(0, remaining - principal);
      totalInterest += interest;

      if (m <= 60 || m % 12 === 0 || m === totalMonths) {
        schedule.push({
          month: m,
          principal,
          interest,
          payment: principal + interest,
          remaining,
        });
      }
    }

    return {
      monthlyPayment,
      totalInterest,
      totalRepayment: loanAmountManWon + totalInterest,
      schedule,
    };
  } else {
    // Equal principal
    const monthlyPrincipal = Math.round(loanAmountManWon / totalMonths);
    const firstMonthInterest = Math.round(loanAmountManWon * monthlyRate);
    const firstMonthPayment = monthlyPrincipal + firstMonthInterest;

    for (let m = 1; m <= totalMonths; m++) {
      const interest = monthlyRate > 0 ? Math.round(remaining * monthlyRate) : 0;
      const principal = m === totalMonths ? remaining : Math.min(monthlyPrincipal, remaining);
      remaining = Math.max(0, remaining - principal);
      totalInterest += interest;

      if (m <= 60 || m % 12 === 0 || m === totalMonths) {
        schedule.push({
          month: m,
          principal,
          interest,
          payment: principal + interest,
          remaining,
        });
      }
    }

    return {
      monthlyPayment: firstMonthPayment,
      totalInterest,
      totalRepayment: loanAmountManWon + totalInterest,
      schedule,
    };
  }
}

export interface JeonseRiskResult {
  ratio: number;
  riskTier: 'safe' | 'caution' | 'danger' | 'critical';
  riskScore: number;
  gapManWon: number;
  recommendation: string;
}

/**
 * Calculates Jeonse safety metrics, gap ratio, and risk tier.
 * @param salePrice - Sale price in Man-won
 * @param jeonseDeposit - Jeonse deposit in Man-won
 * @param seniorDebt - Senior mortgage or collateral debt in Man-won (default 0)
 */
export function calculateJeonseSafetyRisk(
  salePrice: number,
  jeonseDeposit: number,
  seniorDebt: number = 0
): JeonseRiskResult {
  if (salePrice <= 0 || jeonseDeposit <= 0) {
    return {
      ratio: 0,
      riskTier: 'safe',
      riskScore: 0,
      gapManWon: 0,
      recommendation: '시세 정보가 부족하여 안전성 산정이 보류되었습니다.',
    };
  }

  const effectiveTotal = jeonseDeposit + seniorDebt;
  const ratio = (effectiveTotal / salePrice) * 100;
  const gapManWon = Math.max(0, salePrice - jeonseDeposit);

  let riskTier: 'safe' | 'caution' | 'danger' | 'critical' = 'safe';
  let riskScore = 15;
  let recommendation = '매매가 대비 전세가율이 60% 미만으로 깡통전세 위험이 매우 낮습니다.';

  if (ratio >= 85) {
    riskTier = 'critical';
    riskScore = 95;
    recommendation = '전세가율이 85%를 초과하는 초고위험 단지입니다. HUG 전세보증보험 가입 요건을 반드시 확인하세요.';
  } else if (ratio >= 75) {
    riskTier = 'danger';
    riskScore = 75;
    recommendation = '전세가율이 75% 이상으로 시세 하락 시 보증금 미반환 위험이 높습니다.';
  } else if (ratio >= 65) {
    riskTier = 'caution';
    riskScore = 45;
    recommendation = '적정 전세가율 수준이나, 선순위 근저당권 여부를 반드시 확인해야 합니다.';
  }

  return {
    ratio,
    riskTier,
    riskScore,
    gapManWon,
    recommendation,
  };
}

export interface PropertyTaxResult {
  officialPrice: number;
  propertyTax: number;
  urbanAreaTax: number;
  localEducationTax: number;
  holdingTaxTotal: number;
}

/**
 * Calculates annual estimated holding tax (재산세 + 도시지역분 + 지방교육세).
 * @param marketPriceManWon - Estimated market price in Man-won
 * @param officialPriceRatio - Ratio of official assessed price to market price (default 0.70)
 */
export function calculatePropertyHoldingTax(
  marketPriceManWon: number,
  officialPriceRatio: number = 0.70
): PropertyTaxResult {
  const officialPrice = Math.round(marketPriceManWon * officialPriceRatio);
  const fairMarketValue = Math.round(officialPrice * 0.45); // 1주택자 공정시장가액비율 45%

  let baseTax = 0;
  if (fairMarketValue <= 6000) {
    baseTax = fairMarketValue * 0.0005;
  } else if (fairMarketValue <= 15000) {
    baseTax = 3 + (fairMarketValue - 6000) * 0.0007;
  } else if (fairMarketValue <= 30000) {
    baseTax = 9.3 + (fairMarketValue - 15000) * 0.0012;
  } else {
    baseTax = 27.3 + (fairMarketValue - 30000) * 0.0020;
  }

  const propertyTax = Math.round(baseTax);
  const urbanAreaTax = Math.round(fairMarketValue * 0.0014);
  const localEducationTax = Math.round(propertyTax * 0.2);
  const holdingTaxTotal = propertyTax + urbanAreaTax + localEducationTax;

  return {
    officialPrice,
    propertyTax,
    urbanAreaTax,
    localEducationTax,
    holdingTaxTotal,
  };
}
