/**
 * @file policyLoanCalculators.ts
 * @description 2025/2026 대한민국 주택도시기금 및 한국주택금융공사(HF) 정책모기지 시뮬레이션 계산 엔진.
 * (신생아 특례대출, 내집마련 디딤돌대출, 보금자리론 지원 자격 및 월 상환액 산출)
 */

export type PolicyLoanType = 'NEWBORN' | 'DIDIMDOL' | 'BOGEUMJARI';

export interface PolicyLoanParams {
  loanType: PolicyLoanType;
  homePriceWon: number; // 주택 매매가격 (원)
  annualIncomeWon: number; // 부부합산 연소득 (원)
  loanPeriodYears?: number; // 대출 기간 (년, 기본값 30년)
  isDualIncome?: boolean; // 맞벌이 여부
  childCount?: number; // 자녀 수
  isNewlywed?: boolean; // 신혼가구 여부 (혼인 7년 이내)
}

export interface PolicyLoanResult {
  loanType?: PolicyLoanType;
  loanName?: string;
  isEligible: boolean;
  ineligibleReason?: string;
  maxLimitWon: number; // 최대 지원 가능 대출 한도 (원)
  estimatedRatePercent: number; // 최저 예상 금리 (%)
  monthlyPaymentWon: number; // 예상 월 원리금 (원리금균등상환 기준, 원)
  badgeText: string;
  summary?: string;
  highlightBenefit?: string;
}

/**
 * 원리금 균등분할상환 월 납입액 계산 공식
 * M = P * [r * (1 + r)^n] / [(1 + r)^n - 1]
 */
export function calculateMonthlyAmortization(
  principalWon: number,
  annualRatePercent: number,
  years: number
): number {
  if (principalWon <= 0 || years <= 0) return 0;
  if (annualRatePercent <= 0) return Math.round(principalWon / (years * 12));

  const monthlyRate = annualRatePercent / 100 / 12;
  const numPayments = years * 12;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  const monthlyPayment = (principalWon * (monthlyRate * factor)) / (factor - 1);

  return Math.round(monthlyPayment);
}

/**
 * 정책 모기지 자격 진단 및 대출 견적 산출
 */
export function calculatePolicyLoan(params: PolicyLoanParams): PolicyLoanResult {
  const {
    loanType,
    homePriceWon,
    annualIncomeWon,
    loanPeriodYears = 30,
    isDualIncome = true,
    childCount = 1,
    isNewlywed = false,
  } = params;

  if (homePriceWon <= 0 || annualIncomeWon < 0) {
    return {
      loanType,
      loanName: getLoanName(loanType),
      isEligible: false,
      ineligibleReason: '올바른 주택가격 및 소득을 입력해주세요.',
      maxLimitWon: 0,
      estimatedRatePercent: 0,
      monthlyPaymentWon: 0,
      badgeText: '입력 확인',
      summary: '유효한 주택 매매가격과 소득 정보를 입력하세요.',
      highlightBenefit: '데이터 확인 필요',
    };
  }

  switch (loanType) {
    case 'NEWBORN': {
      // 2025/2026 신생아 특례 디딤돌: 주택가 9억 이하, 연소득 1.3억 이하 (맞벌이 2억), 최대 5억, 금리 1.6%~3.3%
      const MAX_PRICE = 900_000_000;
      const MAX_INCOME = isDualIncome ? 200_000_000 : 130_000_000;
      const MAX_LIMIT = 500_000_000;

      if (homePriceWon > MAX_PRICE) {
        return {
          loanType,
          loanName: '신생아 특례 디딤돌 대출',
          isEligible: false,
          ineligibleReason: '대상 주택가격 9억 원 초과 (신생아 특례 상한: 9억)',
          maxLimitWon: 0,
          estimatedRatePercent: 1.6,
          monthlyPaymentWon: 0,
          badgeText: '기준 초과',
          summary: '신생아 특례 대출은 9억 원 이하 주택만 지원 가능합니다.',
          highlightBenefit: '최대 5억 한도 / 최저 1.6% 초저금리',
        };
      }

      if (annualIncomeWon > MAX_INCOME) {
        return {
          loanType,
          loanName: '신생아 특례 디딤돌 대출',
          isEligible: false,
          ineligibleReason: `부부합산 연소득 ${MAX_INCOME / 100_000_000}억 원 초과 (신생아 특례 상한)`,
          maxLimitWon: 0,
          estimatedRatePercent: 1.6,
          monthlyPaymentWon: 0,
          badgeText: '소득 초과',
          summary: `신생아 특례 대출 소득 상한선(${MAX_INCOME / 100_000_000}억 원)을 초과하였습니다.`,
          highlightBenefit: '최대 5억 한도 / 최저 1.6% 초저금리',
        };
      }

      // LTV 70% (생애최초 80%) 와 5억 한도 중 작은 값
      const effectiveLimit = Math.min(Math.round(homePriceWon * 0.7), MAX_LIMIT);
      const estimatedRate = annualIncomeWon <= 85_000_000 ? 1.6 : 2.5;
      const monthlyPayment = calculateMonthlyAmortization(effectiveLimit, estimatedRate, loanPeriodYears);

      return {
        loanType,
        loanName: '신생아 특례 디딤돌 대출',
        isEligible: true,
        maxLimitWon: effectiveLimit,
        estimatedRatePercent: estimatedRate,
        monthlyPaymentWon: monthlyPayment,
        badgeText: '최대 5억 한도',
        summary: `신생아 특례 최저 ${estimatedRate}%~ 금리로 최대 ${(effectiveLimit / 100_000_000).toFixed(1)}억 원 지원 가능`,
        highlightBenefit: `최저 ${estimatedRate}% 금리 · 월 약 ${(monthlyPayment / 10000).toFixed(0)}만 원`,
      };
    }

    case 'DIDIMDOL': {
      // 내집마련 디딤돌: 주택가 5억 이하 (신혼/2자녀 6억), 연소득 6천만 (신혼/2자녀이상 8.5천만), 한도 2.5억~4억, 금리 2.65%~3.95%
      const isEligibleForHigherTiers = isNewlywed || (childCount !== undefined && childCount >= 2);
      const MAX_PRICE = isEligibleForHigherTiers ? 600_000_000 : 600_000_000; // 허용 상한 6억 기준
      const MAX_INCOME = 85_000_000;
      const MAX_LIMIT = isNewlywed ? 400_000_000 : (childCount && childCount >= 2 ? 310_000_000 : 400_000_000);

      if (homePriceWon > MAX_PRICE) {
        return {
          loanType,
          loanName: '내집마련 디딤돌 대출',
          isEligible: false,
          ineligibleReason: '대상 주택가격 6억 원 초과 (디딤돌 신혼·다자녀 상한: 6억)',
          maxLimitWon: 0,
          estimatedRatePercent: 2.65,
          monthlyPaymentWon: 0,
          badgeText: '기준 초과',
          summary: '내집마련 디딤돌 대출은 5억(신혼·다자녀 6억) 이하 주택만 지원됩니다.',
          highlightBenefit: '서민 실수요자 전용 / 최저 2.65% 우대금리',
        };
      }

      if (annualIncomeWon > MAX_INCOME) {
        return {
          loanType,
          loanName: '내집마련 디딤돌 대출',
          isEligible: false,
          ineligibleReason: '부부합산 연소득 8,500만 원 초과 (신혼가구 상한: 8,500만)',
          maxLimitWon: 0,
          estimatedRatePercent: 2.65,
          monthlyPaymentWon: 0,
          badgeText: '소득 초과',
          summary: '내집마련 디딤돌 소득 기준(신혼 8,500만 원)을 초과하였습니다.',
          highlightBenefit: '서민 실수요자 전용 / 최저 2.65% 우대금리',
        };
      }

      const effectiveLimit = Math.min(Math.round(homePriceWon * 0.7), MAX_LIMIT);
      const estimatedRate = annualIncomeWon <= 50_000_000 ? 2.65 : 3.15;
      const monthlyPayment = calculateMonthlyAmortization(effectiveLimit, estimatedRate, loanPeriodYears);

      return {
        loanType,
        loanName: '내집마련 디딤돌 대출',
        isEligible: true,
        maxLimitWon: effectiveLimit,
        estimatedRatePercent: estimatedRate,
        monthlyPaymentWon: monthlyPayment,
        badgeText: '최대 4억 한도',
        summary: `디딤돌 정부지원 최저 ${estimatedRate}%~ 금리로 최대 ${(effectiveLimit / 100_000_000).toFixed(1)}억 원 지원`,
        highlightBenefit: `최저 ${estimatedRate}% 금리 · 월 약 ${(monthlyPayment / 10000).toFixed(0)}만 원`,
      };
    }

    case 'BOGEUMJARI': {
      // 한국주택금융공사 보금자리론: 주택가 6억 이하, 연소득 7천만 (신혼 8.5천만, 다자녀 1억), 한도 3.6억~4.2억, 고정금리 약 3.9%~4.2%
      const MAX_PRICE = 600_000_000;
      const MAX_INCOME = 100_000_000;
      const MAX_LIMIT = 420_000_000;

      if (homePriceWon > MAX_PRICE) {
        return {
          loanType,
          loanName: 'HF 보금자리론',
          isEligible: false,
          ineligibleReason: '대상 주택가격 6억 원 초과 (보금자리론 담보 상한: 6억)',
          maxLimitWon: 0,
          estimatedRatePercent: 3.95,
          monthlyPaymentWon: 0,
          badgeText: '기준 초과',
          summary: '보금자리론은 담보주택 가격 6억 원 이하만 신청 가능합니다.',
          highlightBenefit: '장기 고정금리 / DSR 미적용 우대',
        };
      }

      if (annualIncomeWon > MAX_INCOME) {
        return {
          loanType,
          loanName: 'HF 보금자리론',
          isEligible: false,
          ineligibleReason: '부부합산 연소득 1억 원 초과 (다자녀가구 상한: 1억)',
          maxLimitWon: 0,
          estimatedRatePercent: 3.95,
          monthlyPaymentWon: 0,
          badgeText: '소득 초과',
          summary: '보금자리론 소득 요건(최대 1억 원)을 초과하였습니다.',
          highlightBenefit: '장기 고정금리 / DSR 미적용 우대',
        };
      }

      const effectiveLimit = Math.min(Math.round(homePriceWon * 0.7), MAX_LIMIT);
      const estimatedRate = 3.95;
      const monthlyPayment = calculateMonthlyAmortization(effectiveLimit, estimatedRate, loanPeriodYears);

      return {
        loanType,
        loanName: 'HF 보금자리론',
        isEligible: true,
        maxLimitWon: effectiveLimit,
        estimatedRatePercent: estimatedRate,
        monthlyPaymentWon: monthlyPayment,
        badgeText: '안심 고정금리',
        summary: `보금자리론 고정금리 ${estimatedRate}%로 최대 ${(effectiveLimit / 100_000_000).toFixed(1)}억 원 고정금리 대출`,
        highlightBenefit: `연 ${estimatedRate}% 고정 · 월 약 ${(monthlyPayment / 10000).toFixed(0)}만 원`,
      };
    }
  }
}

function getLoanName(type: PolicyLoanType): string {
  switch (type) {
    case 'NEWBORN':
      return '신생아 특례 디딤돌 대출';
    case 'DIDIMDOL':
      return '내집마련 디딤돌 대출';
    case 'BOGEUMJARI':
      return 'HF 보금자리론';
  }
}
