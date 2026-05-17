/**
 * @module valuationEngine
 * @description Advanced quantitative models for dynamic DCF valuation, relative spread, and forward-looking macro adjustments.
 */

import { MacroEnvironment, SupplyPipeline } from '../types/macro.types';

/**
 * 1. 동태적 할인율(DCF) 기반 적정 매매가 및 PER 도출
 * 무위험 국채 금리와 조달 비용을 반영하여 이론적인 적정 자본환원율(Cap Rate) 및 전세가 배수를 산출합니다.
 * @param currentJeonse 현재 3개월 평균 전세가
 * @param macro 거시 경제 지표
 * @param riskPremium 자산 고유 리스크 프리미엄 (기본 1.5%)
 */
export function calculateDynamicDCF(currentJeonse: number, macro: MacroEnvironment, riskPremium: number = 1.5, utilityScore: number = 50) {
  // 1. Discount Rate (r) 산출: 국채금리 + 리스크 프리미엄 + 조달비용 스프레드
  // 전세대출금리가 4.0%를 초과할 경우 유동성 프리미엄 가산
  const fundingSpread = Math.max(0, macro.fundingCost - 4.0) * 0.5;
  const discountRate = (macro.riskFreeRate + riskPremium + fundingSpread) / 100; // e.g. (3.25 + 1.5 + 0.05) / 100 = 0.048

  // 2. Expected Growth Rate (g) 산출: 장기 인플레이션 + 유틸리티 점수 기반 성장 프리미엄
  // 0점 = 0.0%p, 200점 = +2.0%p 프리미엄 부여
  // (예: 180점 = +1.8%p = 3.8%, 200점 = +2.0%p = 4.0%)
  // 제한: 최소 0.0%, 최대 4.0%
  const growthPremium = utilityScore * 0.0001;
  const growthRate = Math.max(0.000, Math.min(0.040, macro.baseInflationRate + growthPremium));

  // 3. Cap Rate (자본환원율) 산출: r - g
  // 최고 등급 단지의 성장 프리미엄을 온전히 반영하기 위해 최소 1.0% 하한선 설정 (기존 2.0%에서 완화)
  const capRate = Math.max(0.01, discountRate - growthRate);

  // 4. Implied Annual Rent (연간 예상 환산 임대료)
  const annualRent = currentJeonse * macro.jeonseConversionRate;

  // 5. Implied Value (적정 매매가) = 연간 임대료 / Cap Rate
  const impliedValue = annualRent / capRate;

  // 6. 도출된 지표들
  // - Fair PER (수익 대비 배수) = 1 / Cap Rate
  // - Fair Jeonse Multiple (전세가 대비 배수) = impliedValue / currentJeonse
  const fairPER = 1 / capRate;
  const fairJeonseMultiple = impliedValue / currentJeonse;

  return {
    capRate: capRate * 100, // %
    fairPER,
    fairJeonseMultiple,
    impliedValue,
    discountRate: discountRate * 100, // %
    growthRate: growthRate * 100 // %
  };
}

/**
 * 2. 인접 단지 상대평가 (Spread)
 * 동일 행정구역(동) 내 이웃 단지들의 평균 배수 대비 타겟 아파트의 고평가/저평가 수준(Spread) 산출.
 * @param targetPER 타겟 아파트의 매매가/전세가 배수
 * @param dongPERs 동일 동 내 타 아파트들의 배수 배열
 */
export function calculateDongSpread(targetPER: number, dongPERs: number[]) {
  if (dongPERs.length === 0) return { medianDongPER: targetPER, spread: 0, isUndervalued: false };

  // 중간값(Median) 계산 (이상치 통제)
  const sorted = [...dongPERs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianDongPER = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Spread (타겟 PER - 동 평균 PER). 마이너스면 상대적 저평가 (전세가율이 더 높음)
  const spread = targetPER - medianDongPER;

  return {
    medianDongPER,
    spread,
    isUndervalued: spread < -0.05 // 0.05배 이상 저평가일 때 true
  };
}

/**
 * 3. 미래 궤적 추적 선행 모델 (Forward Trajectory)
 * 입주 예정 물량 및 인구 유입을 계량화하여 향후 전세가 하방/상방 압력을 산출.
 * @param currentJeonse 현재 3개월 평균 전세가
 * @param pipeline 지역 내 공급 파이프라인 데이터
 */
export function calculateForwardJeonseTrajectory(currentJeonse: number, pipeline: SupplyPipeline) {
  // 공급 비율 (예정물량 / 과거 평균)
  const supplyRatio = pipeline.expectedMoveInVolume / pipeline.historicalAvgVolume;
  
  // 모의 로직: 공급 비율이 1.2(120%)를 초과하면 초과분 10%당 전세가 1.5% 하방 압력 발생
  let jeonseDiscountFactor = 1.0;
  
  if (supplyRatio > 1.2) {
    const excessRatio = supplyRatio - 1.2;
    // 최대 20% 하방 압력 제한
    const discount = Math.min(0.20, (excessRatio / 0.1) * 0.015);
    jeonseDiscountFactor = 1.0 - discount;
  } else if (supplyRatio < 0.8) {
    // 공급 부족시 상방 압력
    const shortageRatio = 0.8 - supplyRatio;
    const premium = Math.min(0.15, (shortageRatio / 0.1) * 0.015);
    jeonseDiscountFactor = 1.0 + premium;
  }

  // 인구 유입 트렌드에 따른 추가 보정
  if (pipeline.populationTrend === '증가') jeonseDiscountFactor += 0.02;
  else if (pipeline.populationTrend === '감소') jeonseDiscountFactor -= 0.02;

  const predictedJeonse = currentJeonse * jeonseDiscountFactor;
  const pressure = jeonseDiscountFactor > 1.02 ? '상방 (공급부족)' : jeonseDiscountFactor < 0.98 ? '하방 (공급과잉)' : '보합';

  return {
    supplyRatio,
    jeonseDiscountFactor,
    predictedJeonse,
    pressure
  };
}
