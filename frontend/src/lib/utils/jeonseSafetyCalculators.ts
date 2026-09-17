/**
 * @file jeonseSafetyCalculators.ts
 * @description HUG(주택도시보증공사) 126% 룰 기반 전세보증금 반환보증 가입 여부 및 깡통전세 위험도 진단 엔진.
 */

export interface JeonseSafetyParams {
  estimatedPriceWon: number; // 주택 시세 또는 최근 매매 실거래가 (원)
  officialPriceWon?: number; // 공동주택 공시가격 (원, 미입력 시 시세의 70%로 자동 추정)
  seniorMortgageWon: number; // 선순위 근저당/채권최고액 (원)
  jeonseDepositWon: number; // 임차인의 전세보증금 (원)
}

export type JeonseRiskLevel = 'SAFE' | 'CAUTION' | 'DANGER';

export interface JeonseSafetyResult {
  guaranteeLimitWon: number; // HUG 전세보증 기준 산정가액 (공시가의 126% 또는 시세의 90%)
  debtRatioPercent: number; // 부채비율 (선순위 근저당 + 전세금) / 산정가액 (%)
  totalDebtWon: number; // 총 부채액 (근저당 + 전세금)
  riskLevel: JeonseRiskLevel; // 안전 / 주의 / 위험
  isHugGuaranteed: boolean; // HUG 반환보증 가입 가능 여부
  ineligibleReason?: string;
  diagnosisSummary: string;
  adviceText: string;
  officialPriceEstimatedWon: number;
  safeDepositLimitWon: number; // 보증금 안전 상한 권장액 (원)
}

/**
 * HUG 126% 룰 및 전세보증금 반환 위험도 진단
 */
export function evaluateJeonseSafety(params: JeonseSafetyParams): JeonseSafetyResult {
  const { estimatedPriceWon, seniorMortgageWon, jeonseDepositWon } = params;

  if (estimatedPriceWon <= 0 || jeonseDepositWon <= 0) {
    return {
      guaranteeLimitWon: 0,
      debtRatioPercent: 0,
      totalDebtWon: Math.max(0, seniorMortgageWon + jeonseDepositWon),
      riskLevel: 'SAFE',
      isHugGuaranteed: false,
      ineligibleReason: '올바른 주택 시세 및 전세보증금을 입력해주세요.',
      diagnosisSummary: '데이터 입력 대기 중',
      adviceText: '올바른 주택가격과 전세보증금을 입력하여 안심진단을 시작하세요.',
      officialPriceEstimatedWon: 0,
      safeDepositLimitWon: 0,
    };
  }

  // 공시가격 산정 (미입력 시 현실화율 70% 적용 추정)
  const officialPriceEstimatedWon = params.officialPriceWon && params.officialPriceWon > 0
    ? params.officialPriceWon
    : Math.round(estimatedPriceWon * 0.70);

  // HUG 126% 룰: 공시가격 × 140% × 90% = 공시가격 × 126%
  const hug126Price = Math.round(officialPriceEstimatedWon * 1.40 * 0.90);

  // 주택 시세 인정 한도: HUG 126%와 시세 90% 중 안정적인 값 채택
  const market90Price = Math.round(estimatedPriceWon * 0.90);
  const guaranteeLimitWon = Math.min(hug126Price, market90Price);

  // 총 부채액 = 선순위 근저당 + 전세보증금
  const totalDebtWon = seniorMortgageWon + jeonseDepositWon;
  const debtRatioPercent = guaranteeLimitWon > 0
    ? Number(((totalDebtWon / guaranteeLimitWon) * 100).toFixed(1))
    : 100;

  // 안전 보증금 상한 = 보증한도 - 선순위 근저당
  const safeDepositLimitWon = Math.max(0, guaranteeLimitWon - seniorMortgageWon);

  // HUG 보증 요건:
  // 1. 선순위 근저당이 주택가격(산정가액)의 60% 이하여야 함
  // 2. 선순위 근저당 + 전세보증금이 주택가격(산정가액)의 100% 이하여야 함 (126% 이내)
  const isMortgageSafe = seniorMortgageWon <= guaranteeLimitWon * 0.60;
  const isTotalDebtSafe = totalDebtWon <= guaranteeLimitWon;
  const isHugGuaranteed = isMortgageSafe && isTotalDebtSafe;

  let riskLevel: JeonseRiskLevel = 'SAFE';
  let ineligibleReason: string | undefined = undefined;
  let diagnosisSummary = 'HUG 반환보증 가입이 가능하며 역전세 위험이 낮은 안전한 전세 계약입니다.';
  let adviceText = '전세보증보험 100% 가입 안전권입니다.';

  if (!isMortgageSafe) {
    riskLevel = 'DANGER';
    ineligibleReason = '선순위 근저당이 주택가격의 60%를 초과하여 보증 가입이 불가능합니다.';
    diagnosisSummary = '선순위 대출 과다로 경매 시 보증금 손실 위험이 매우 높습니다.';
    adviceText = '126% 기준 초과 위험! 깡통전세 및 보증가입 거절 위험이 높습니다.';
  } else if (!isTotalDebtSafe) {
    riskLevel = 'DANGER';
    ineligibleReason = '총 부채액(근저당+전세금)이 HUG 126% 산정가액을 초과합니다.';
    diagnosisSummary = '깡통전세 고위험 구간으로 HUG 반환보증 가입이 거절될 수 있습니다.';
    adviceText = '126% 기준 초과 위험! 깡통전세 및 보증가입 거절 위험이 높습니다.';
  } else if (debtRatioPercent > 70) {
    riskLevel = 'CAUTION';
    diagnosisSummary = '부채비율이 70%를 초과하여 만기 시 매매시세 하락에 따른 역전세 리스크를 확인하세요.';
    adviceText = '보증가입은 가능하나 선순위 근저당 감액 검토가 권장됩니다.';
  }

  return {
    guaranteeLimitWon,
    debtRatioPercent,
    totalDebtWon,
    riskLevel,
    isHugGuaranteed,
    ineligibleReason,
    diagnosisSummary,
    adviceText,
    officialPriceEstimatedWon,
    safeDepositLimitWon,
  };
}

export const calculateJeonseSafety = evaluateJeonseSafety;
