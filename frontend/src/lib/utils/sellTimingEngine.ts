/**
 * AI 매도 타이밍(호구 지수) 및 간이 양도소득세 계산을 위한 비즈니스 로직 엔진
 */

export interface VerdictParams {
  currentPrice: number;       // 현재 시세 (만원)
  maxPrice3Y: number;         // 3개년 최고가 (만원)
  txCount3M: number;          // 최근 3개월 거래량
  totalGenerations: number;   // 총 세대수
  jeonseRatio: number;        // 전세가율 (%)
}

export interface VerdictResult {
  score: number;              // 호구 지수 (0 ~ 100)
  label: '🔴 지금 팔면 호구 (보류 권장)' | '🟡 매도 타이밍 관망 (주의)' | '🟢 양호한 매도 기회 (매도 가능)';
  color: string;              // UI 표시용 Hex 색상
  reason: string;             // 판단 사유 텍스트
  metrics: {
    dropRate: number;         // 최고가 대비 하락율 (%)
    rotationRate: number;     // 3M 거래 회전율 (%)
  };
}

export interface TaxParams {
  transferPrice: number;      // 양도 가액 (만원)
  acquisitionPrice: number;   // 취득 가액 (만원)
  holdingYears: number;       // 보유 기간 (년)
  resideYears: number;        // 거주 기간 (년)
  isOneHouse: boolean;        // 1세대 1주택 여부
}

export interface TaxResult {
  transferProfit: number;     // 전체 양도 차익 (만원)
  taxableProfit: number;      // 과세 대상 양도 차익 (만원, 1주택 비과세 12억 초과분 안분 반영)
  janggiGongje: number;       // 장기보유특별공제액 (만원)
  taxableBase: number;        // 과세 표준 (만원)
  taxRate: number;            // 적용 세율 (%)
  nujinGongje: number;        // 누진 공제액 (만원)
  computedTax: number;        // 양도소득세 산출세액 (만원)
  localTax: number;           // 지방소득세 (10%, 만원)
  totalTax: number;           // 총 세액 합계 (만원)
  isTaxFree: boolean;         // 비과세 대상 여부
  taxFreeReason?: string;     // 비과세 적용 근거 설명
}

/**
 * 1. 호구 지수(Verdict Score) 산출 엔진
 */
export function calculateVerdictScore({
  currentPrice,
  maxPrice3Y,
  txCount3M,
  totalGenerations,
  jeonseRatio,
}: VerdictParams): VerdictResult {
  const fallbackMaxPrice = maxPrice3Y > 0 ? maxPrice3Y : currentPrice * 1.15;
  const fallbackGenerations = totalGenerations > 0 ? totalGenerations : 500;

  // 1-1. 낙폭 점수 (최대 50점)
  // 최고가 대비 낙폭이 클수록 지금 팔면 손해이므로 호구 지수가 상승함
  const dropRate = fallbackMaxPrice > currentPrice
    ? ((fallbackMaxPrice - currentPrice) / fallbackMaxPrice) * 100
    : 0;
  // 낙폭 33.3%일 때 50점 만점 수렴
  const dropScore = Math.max(0, Math.min(50, dropRate * 1.5));

  // 1-2. 환금성/회전율 점수 (최대 25점)
  // 회전율(3개월 거래량 / 총세대수 * 100)이 낮을수록 거래 절벽 상태에서 급매로 팔아야 하므로 호구 지수가 상승함
  const rotationRate = (txCount3M / fallbackGenerations) * 100;
  let liquidityScore = 0;
  if (rotationRate < 0.1) {
    liquidityScore = 25;
  } else if (rotationRate < 0.3) {
    liquidityScore = 18;
  } else if (rotationRate < 0.6) {
    liquidityScore = 10;
  } else if (rotationRate < 1.0) {
    liquidityScore = 5;
  } else {
    liquidityScore = 0;
  }

  // 1-3. 전세가율 점수 (최대 25점)
  // 전세가율이 높을수록 실수요 지지 및 갭투자 대기 수요가 탄탄하므로 버틸 수 있는데도 싸게 팔면 손해 -> 호구 지수 상승
  let jeonseScore = 0;
  if (jeonseRatio >= 80) {
    jeonseScore = 25;
  } else if (jeonseRatio >= 70) {
    jeonseScore = 18;
  } else if (jeonseRatio >= 60) {
    jeonseScore = 10;
  } else if (jeonseRatio >= 50) {
    jeonseScore = 5;
  } else {
    jeonseScore = 0;
  }

  // 합산 스코어 (0 ~ 100)
  const score = Math.round(dropScore + liquidityScore + jeonseScore);

  // 등급 판정
  let label: VerdictResult['label'] = '🟢 양호한 매도 기회 (매도 가능)';
  let color = '#10b981'; // Emerald
  let reason = '';

  if (score >= 70) {
    label = '🔴 지금 팔면 호구 (보류 권장)';
    color = '#f43f5e'; // Rose
    reason = `최근 3개년 최고가 대비 가격 낙폭(${dropRate.toFixed(1)}%)이 크며, 전세가율(${jeonseRatio}%)이 높고 매수세가 정체되어 급매로 처분할 시 자산 손실이 극대화됩니다. 보유 및 관망을 강력히 권장합니다.`;
  } else if (score >= 40) {
    label = '🟡 매도 타이밍 관망 (주의)';
    color = '#eab308'; // Yellow
    reason = `시장 거래 회전율(${rotationRate.toFixed(2)}%)이 조정을 거치는 단계입니다. 전세 지지력이 보통 수준이며, 향후 거시 공급 일정 및 추가 거래 반등을 관망하며 매도 시기를 저울질하는 것이 좋습니다.`;
  } else {
    label = '🟢 양호한 매도 기회 (매도 가능)';
    color = '#10b981'; // Emerald
    reason = `고점 대비 낙폭이 크지 않거나 회전율이 양호하여 시장 환금성이 확보된 상태입니다. 상급지 갈아타기 또는 포트폴리오 리밸런싱을 위해 매도를 고려하기에 적합한 가격 방어선이 구축되어 있습니다.`;
  }

  return {
    score,
    label,
    color,
    reason,
    metrics: {
      dropRate: Math.round(dropRate * 10) / 10,
      rotationRate: Math.round(rotationRate * 100) / 100,
    },
  };
}

/**
 * 2. 간이 양도소득세(Capital Gains Tax) 계산 엔진
 */
export function calculateCapitalGainsTax({
  transferPrice,
  acquisitionPrice,
  holdingYears,
  resideYears,
  isOneHouse,
}: TaxParams): TaxResult {
  const transferProfit = Math.max(0, transferPrice - acquisitionPrice);

  let isTaxFree = false;
  let taxFreeReason = '';
  let taxableProfit = transferProfit;

  // 2-1. 1세대 1주택 비과세 판정 (보유 2년 필수)
  if (isOneHouse && holdingYears >= 2) {
    if (transferPrice <= 120000) {
      // 12억 이하 전액 비과세
      isTaxFree = true;
      taxFreeReason = '1세대 1주택 2년 이상 보유 및 매도가액 12억원 이하로 양도소득세가 전액 비과세됩니다.';
      taxableProfit = 0;
    } else {
      // 12억 초과 고가주택 안분 계산
      isTaxFree = false; // 일부 과세 발생
      taxFreeReason = '1세대 1주택 비과세 요건은 충족하나, 매도가액 12억원을 초과하여 초과분에 대해 안분 과세됩니다.';
      taxableProfit = Math.round(transferProfit * ((transferPrice - 120000) / transferPrice));
    }
  } else if (isOneHouse && holdingYears < 2) {
    taxFreeReason = '1주택자이나 보유 기간이 2년 미만으로 일반 비과세 혜택에서 제외되어 과세 대상입니다.';
  } else {
    taxFreeReason = '다주택자 또는 비과세 요건 미충족으로 전체 양도 차익에 대해 양도소득세가 과세됩니다.';
  }

  // 2-2. 장기보유특별공제 계산
  let janggiRate = 0;
  if (holdingYears >= 3) {
    if (isOneHouse && holdingYears >= 2 && resideYears >= 2) {
      // 1주택 보유+거주 동시 충족 고가주택 특례공제 (연 보유 4% + 거주 4%, 각각 최대 40% 합계 80%)
      const holdRate = Math.min(40, Math.floor(holdingYears) * 4);
      const resideRate = Math.min(40, Math.floor(resideYears) * 4);
      janggiRate = holdRate + resideRate;
    } else {
      // 일반 공제 (연 2%, 최대 15년 30%)
      janggiRate = Math.min(30, Math.floor(holdingYears) * 2);
    }
  } else {
    janggiRate = 0;
  }

  const janggiGongje = Math.round(taxableProfit * (janggiRate / 100));
  
  // 2-3. 과세표준 (과세대상차익 - 장특공 - 기본공제 250만원)
  // 양도소득 기본공제는 연 1회 250만원 한도 적용
  const basicGongje = taxableProfit > 0 ? 250 : 0;
  const taxableBase = Math.max(0, taxableProfit - janggiGongje - basicGongje);

  // 2-4. 양도소득세 세율 및 누진공제 (2026년 기준)
  let taxRate = 6;
  let nujinGongje = 0;

  if (taxableBase <= 1400) {
    taxRate = 6;
    nujinGongje = 0;
  } else if (taxableBase <= 5000) {
    taxRate = 15;
    nujinGongje = 126;
  } else if (taxableBase <= 8800) {
    taxRate = 24;
    nujinGongje = 576;
  } else if (taxableBase <= 15000) {
    taxRate = 35;
    nujinGongje = 1544;
  } else if (taxableBase <= 30000) {
    taxRate = 38;
    nujinGongje = 1994;
  } else if (taxableBase <= 50000) {
    taxRate = 40;
    nujinGongje = 2594;
  } else if (taxableBase <= 100000) {
    taxRate = 42;
    nujinGongje = 3594;
  } else {
    taxRate = 45;
    nujinGongje = 6594;
  }

  // 2-5. 세액 계산
  let computedTax = 0;
  if (taxableBase > 0) {
    computedTax = Math.round((taxableBase * (taxRate / 100)) - nujinGongje);
  }
  
  // 0 이하 세액 방지 및 클램핑
  computedTax = Math.max(0, computedTax);

  const localTax = Math.round(computedTax * 0.1);
  const totalTax = computedTax + localTax;

  return {
    transferProfit,
    taxableProfit,
    janggiGongje,
    taxableBase,
    taxRate,
    nujinGongje,
    computedTax,
    localTax,
    totalTax,
    isTaxFree,
    taxFreeReason,
  };
}
