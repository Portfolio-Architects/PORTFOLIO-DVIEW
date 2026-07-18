/**
 * @module valuationEngine
 * @description Advanced quantitative models for dynamic DCF valuation, relative spread, and forward-looking macro adjustments.
 */

import { MacroEnvironment, SupplyPipeline } from '../types/macro.types';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import type { ObjectiveMetrics } from '../types/scoutingReport';

export const MacroEnvironmentSchema = z.object({
  riskFreeRate: z.union([z.string(), z.number()]).transform(val => Number(val) || 3.25),
  fundingCost: z.union([z.string(), z.number()]).transform(val => Number(val) || 3.8),
  baseDate: z.string().optional().default(''),
  jeonseConversionRate: z.union([z.string(), z.number()]).transform(val => Number(val) || 0.055),
  baseInflationRate: z.union([z.string(), z.number()]).transform(val => Number(val) || 2.0),
}).passthrough();

export const SupplyPipelineSchema = z.object({
  region: z.string().optional(),
  baseYear: z.union([z.string(), z.number()]).transform(val => Number(val) || 2026).optional(),
  expectedMoveInVolume: z.union([z.string(), z.number()]).transform(val => Number(val) || 1000),
  historicalAvgVolume: z.union([z.string(), z.number()]).transform(val => Number(val) || 1000),
  populationTrend: z.enum(['증가', '보합', '감소']).catch('보합'),
}).passthrough();

export const ObjectiveMetricsSchema = z.object({
  brand: z.string().optional().default(''),
  householdCount: z.union([z.string(), z.number()]).transform(val => Number(val) || 0).optional().default(0),
  yearBuilt: z.union([z.string(), z.number()]).transform(val => Number(val) || 0).optional().default(0),
  far: z.union([z.string(), z.number()]).transform(val => Number(val) || 0).optional().default(0),
  bcr: z.union([z.string(), z.number()]).transform(val => Number(val) || 0).optional().default(0),
  distanceToElementary: z.union([z.string(), z.number()]).transform(val => Number(val) || 1000).optional().default(1000),
  distanceToMiddle: z.union([z.string(), z.number()]).transform(val => Number(val) || 1000).optional().default(1000),
  distanceToHigh: z.union([z.string(), z.number()]).transform(val => Number(val) || 1000).optional().default(1000),
  distanceToSubway: z.union([z.string(), z.number()]).transform(val => Number(val) || 2000).optional().default(2000),
  academyDensity: z.union([z.string(), z.number()]).transform(val => Number(val) || 0).optional().default(0),
}).passthrough().optional();

export const DCFResultSchema = z.object({
  capRate: z.number(),
  fairPER: z.number(),
  fairJeonseMultiple: z.number(),
  impliedValue: z.number(),
  discountRate: z.number(),
  growthRate: z.number(),
  dynamicPremium: z.number().optional(), // 동적 프리미엄 반환 필드 추가
  dynamicJeonseConversionRate: z.number().optional(), // 동적 전환율 반환 필드 추가
});

export type DCFResult = z.infer<typeof DCFResultSchema>;

export const DongSpreadResultSchema = z.object({
  medianDongPER: z.number(),
  spread: z.number(),
  isUndervalued: z.boolean(),
});

export type DongSpreadResult = z.infer<typeof DongSpreadResultSchema>;

export const ForwardJeonseTrajectoryResultSchema = z.object({
  supplyRatio: z.number(),
  jeonseDiscountFactor: z.number(),
  predictedJeonse: z.number(),
  pressure: z.string(),
});

export type ForwardJeonseTrajectoryResult = z.infer<typeof ForwardJeonseTrajectoryResultSchema>;

const CurrentJeonseSchema = z.union([z.string(), z.number()]).transform(val => Number(val) || 0);
const RiskPremiumSchema = z.union([z.string(), z.number()]).transform(val => Number(val) || 1.5);
const UtilityScoreSchema = z.union([z.string(), z.number()]).transform(val => Number(val) || 50);
const TransitPremiumSchema = z.union([z.string(), z.number()]).transform(val => Number(val) || 0);

/**
 * 1. 동태적 할인율(DCF) 기반 적정 매매가 및 PER 도출 (고도화 모델)
 * @param currentJeonse 현재 3개월 평균 전세가
 * @param macro 거시 경제 지표
 * @param metrics 단지 객관적 지표 (동적 프리미엄 & 성장률 세분화용)
 * @param riskPremium 기본 리스크 프리미엄 (기본 1.5%)
 * @param utilityScore 기본 유틸리티 점수
 * @param transitPremium 교통 호재 프리미엄
 */
export function calculateDynamicDCF(
  currentJeonse: number,
  macro: MacroEnvironment,
  metrics?: ObjectiveMetrics,
  riskPremium: number = 1.5,
  utilityScore: number = 50,
  transitPremium: number = 0,
): DCFResult {
  const jeonseParsed = CurrentJeonseSchema.safeParse(currentJeonse);
  const macroParsed = MacroEnvironmentSchema.safeParse(macro);
  const metricsParsed = ObjectiveMetricsSchema.safeParse(metrics);
  const premiumParsed = RiskPremiumSchema.safeParse(riskPremium);
  const utilityParsed = UtilityScoreSchema.safeParse(utilityScore);
  const transitParsed = TransitPremiumSchema.safeParse(transitPremium);

  if (!jeonseParsed.success || !macroParsed.success) {
    logger.warn('ValuationEngine', 'Failed to validate calculateDynamicDCF inputs', { currentJeonse, macro });
  }

  const validatedJeonse = jeonseParsed.success ? jeonseParsed.data : (Number(currentJeonse) || 0);
  const validatedMacro = macroParsed.success ? macroParsed.data : {
    riskFreeRate: 3.25,
    fundingCost: 3.8,
    jeonseConversionRate: 0.055,
    baseInflationRate: 2.0,
    baseDate: ''
  };
  const validatedMetrics = metricsParsed.success ? metricsParsed.data : undefined;
  const validatedPremium = premiumParsed.success ? premiumParsed.data : (Number(riskPremium) || 1.5);
  const validatedUtility = utilityParsed.success ? utilityParsed.data : (Number(utilityScore) || 50);
  const validatedTransit = transitParsed.success ? transitParsed.data : (Number(transitPremium) || 0);

  const fundingCostVal = validatedMacro.fundingCost;
  const riskFreeRateVal = validatedMacro.riskFreeRate;
  let baseInflationRateVal = validatedMacro.baseInflationRate;
  if (baseInflationRateVal > 0 && baseInflationRateVal <= 0.1) {
    baseInflationRateVal = baseInflationRateVal * 100;
  }

  // A. 동적 리스크 프리미엄 계산
  let scaleAdjustment = 0;
  let ageAdjustment = 0;
  let densityAdjustment = 0;

  if (validatedMetrics) {
    // 1) 세대수 보정 (대단지 프리미엄)
    const household = validatedMetrics.householdCount || 0;
    if (household >= 1500) scaleAdjustment = -0.3;
    else if (household >= 1000) scaleAdjustment = -0.15;
    else if (household < 500 && household > 0) scaleAdjustment = 0.15;

    // 2) 준공년도 보정 (신축 vs 구축 감가)
    const baseYear = validatedMacro.baseDate ? new Date(validatedMacro.baseDate).getFullYear() : 2026;
    const yearBuiltVal = validatedMetrics.yearBuilt || 0;
    if (yearBuiltVal > 0) {
      const age = baseYear - yearBuiltVal;
      if (age <= 5) ageAdjustment = -0.2;
      else if (age > 25) ageAdjustment = 0.4;
      else if (age > 15) ageAdjustment = 0.2;
    }

    // 3) 용적률 및 건폐율 보정 (쾌적성)
    if ((validatedMetrics.far || 0) > 250) densityAdjustment += 0.1;
    if ((validatedMetrics.bcr || 0) > 20) densityAdjustment += 0.1;
  }

  const rawPremium = validatedPremium + scaleAdjustment + ageAdjustment + densityAdjustment;
  // 리스크 프리미엄 한계값 제어 (0.8% ~ 3.0%)
  const finalPremium = Math.max(0.8, Math.min(3.0, rawPremium));

  // B. 할인율 (r) 산출: 국채금리 + 리스크 프리미엄 + 조달 스프레드 + 조달 페널티
  // 주담대 금리와 국채금리 스프레드 가중 (스프레드가 넓을수록 조달비용 상승 반영)
  const fundingSpread = Math.max(0, fundingCostVal - riskFreeRateVal) * 0.3;

  // 조달 페널티 다단계 세분화
  let fundingCostPenalty = 0;
  if (fundingCostVal > 5.5) {
    fundingCostPenalty = 1.1 + (fundingCostVal - 5.5) * 1.0;
  } else if (fundingCostVal > 4.5) {
    fundingCostPenalty = 0.4 + (fundingCostVal - 4.5) * 0.7;
  } else if (fundingCostVal > 3.5) {
    fundingCostPenalty = (fundingCostVal - 3.5) * 0.4;
  }

  const discountRate = (riskFreeRateVal + finalPremium + fundingSpread + fundingCostPenalty) / 100;

  // C. 성장률 (g) 산출: 장기 인플레이션 + 유틸리티 성장 프리미엄 + 인프라 가중치
  let infraGrowthPremium = 0;
  if (validatedMetrics) {
    // 1) 초등학교 인접성
    const distElem = validatedMetrics.distanceToElementary;
    if (typeof distElem === 'number' && distElem > 0) {
      if (distElem <= 300) infraGrowthPremium += 0.1;
      else if (distElem > 1000) infraGrowthPremium -= 0.1;
    }
    // 2) 학원가 밀집도
    const academy = validatedMetrics.academyDensity;
    if (typeof academy === 'number') {
      if (academy >= 50) infraGrowthPremium += 0.15;
      else if (academy >= 20) infraGrowthPremium += 0.05;
    }
    // 3) 지하철역 거리 (역세권 가중치)
    const distSubway = validatedMetrics.distanceToSubway;
    if (typeof distSubway === 'number' && distSubway > 0) {
      if (distSubway <= 500) infraGrowthPremium += 0.2;
      else if (distSubway <= 1000) infraGrowthPremium += 0.1;
    }
  }

  const growthPremium = validatedUtility * 0.0001;
  // 성장률의 범위 제한 0% ~ 6%
  const growthRate = Math.max(0.000, Math.min(0.060, (baseInflationRateVal + validatedTransit) / 100 + growthPremium + (infraGrowthPremium / 100)));

  // D. Cap Rate (자본환원율) 산출: r - g (하한선 1.0% 보장)
  const capRate = Math.max(0.01, discountRate - growthRate);

  // E. 동적 전월세전환율 (Conversion Rate) 계산: 국고채 금리에 연동
  const rawConversionRate = validatedMacro.jeonseConversionRate;
  const jeonseConversionRateVal = Math.max(0.035, Math.min(0.080, rawConversionRate + (riskFreeRateVal - 3.25) * 0.005));

  // F. 연간 예상 환산 임대료
  const annualRent = validatedJeonse * jeonseConversionRateVal;

  // G. 적정 매매가 = 연간 임대료 / Cap Rate
  const impliedValue = annualRent / capRate;

  const fairPER = 1 / capRate;
  const fairJeonseMultiple = validatedJeonse > 0 ? impliedValue / validatedJeonse : 0;

  const result = {
    capRate: capRate * 100, // %
    fairPER,
    fairJeonseMultiple,
    impliedValue,
    discountRate: discountRate * 100, // %
    growthRate: growthRate * 100, // %
    dynamicPremium: finalPremium, // %
    dynamicJeonseConversionRate: jeonseConversionRateVal * 100 // %
  };

  const outputParsed = DCFResultSchema.safeParse(result);
  if (!outputParsed.success) {
    logger.warn('ValuationEngine', 'Failed to validate calculateDynamicDCF output', { result }, outputParsed.error);
    return {
      capRate: capRate * 100,
      fairPER,
      fairJeonseMultiple,
      impliedValue,
      discountRate: discountRate * 100,
      growthRate: growthRate * 100,
      dynamicPremium: finalPremium,
      dynamicJeonseConversionRate: jeonseConversionRateVal * 100
    };
  }

  return outputParsed.data;
}

/**
 * 2. 인접 단지 상대평가 (Spread)
 * 동일 행정구역(동) 내 이웃 단지들의 평균 배수 대비 타겟 아파트의 고평가/저평가 수준(Spread) 산출.
 * @param targetPER 타겟 아파트의 매매가/전세가 배수
 * @param dongPERs 동일 동 내 타 아파트들의 배수 배열
 */
export function calculateDongSpread(targetPER: number, dongPERs: number[]): DongSpreadResult {
  const targetParsed = z.union([z.string(), z.number()]).transform(val => Number(val) || 0).safeParse(targetPER);
  const arrayParsed = z.array(z.union([z.string(), z.number()]).transform(val => Number(val) || 0)).safeParse(dongPERs);

  if (!targetParsed.success || !arrayParsed.success) {
    logger.warn('ValuationEngine', 'Failed to validate calculateDongSpread inputs', { targetPER, dongPERs });
  }

  const validatedTarget = targetParsed.success ? targetParsed.data : (Number(targetPER) || 0);
  const validatedArray = arrayParsed.success ? arrayParsed.data : [];

  if (validatedArray.length === 0) {
    return { medianDongPER: validatedTarget, spread: 0, isUndervalued: false };
  }

  // 중간값(Median) 계산 (이상치 통제)
  const sorted = [...validatedArray].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianDongPER = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  // Spread (타겟 PER - 동 평균 PER). 마이너스면 상대적 저평가 (전세가율이 더 높음)
  const spread = validatedTarget - medianDongPER;

  const result = {
    medianDongPER,
    spread,
    isUndervalued: spread < -0.05 // 0.05배 이상 저평가일 때 true
  };

  const outputParsed = DongSpreadResultSchema.safeParse(result);
  if (!outputParsed.success) {
    logger.warn('ValuationEngine', 'Failed to validate calculateDongSpread output', { result }, outputParsed.error);
    return {
      medianDongPER,
      spread,
      isUndervalued: spread < -0.05
    };
  }

  return outputParsed.data;
}

/**
 * 3. 미래 궤적 추적 선행 모델 (Forward Trajectory)
 * 입주 예정 물량 및 인구 유입을 계량화하여 향후 전세가 하방/상방 압력을 산출.
 * @param currentJeonse 현재 3개월 평균 전세가
 * @param pipeline 지역 내 공급 파이프라인 데이터
 */
export function calculateForwardJeonseTrajectory(currentJeonse: number, pipeline: SupplyPipeline): ForwardJeonseTrajectoryResult {
  const jeonseParsed = CurrentJeonseSchema.safeParse(currentJeonse);
  const pipelineParsed = SupplyPipelineSchema.safeParse(pipeline);

  if (!jeonseParsed.success || !pipelineParsed.success) {
    logger.warn('ValuationEngine', 'Failed to validate calculateForwardJeonseTrajectory inputs', { currentJeonse, pipeline });
  }

  const validatedJeonse = jeonseParsed.success ? jeonseParsed.data : (Number(currentJeonse) || 0);
  const validatedPipeline = pipelineParsed.success ? pipelineParsed.data : {
    expectedMoveInVolume: 1000,
    historicalAvgVolume: 1000,
    populationTrend: '보합' as const
  };

  const expectedMoveInVolumeVal = validatedPipeline.expectedMoveInVolume;
  const historicalAvgVolumeVal = validatedPipeline.historicalAvgVolume;
  const populationTrendVal = validatedPipeline.populationTrend;

  // 공급 비율 (예정물량 / 과거 평균)
  const supplyRatio = historicalAvgVolumeVal > 0 ? expectedMoveInVolumeVal / historicalAvgVolumeVal : 1;
  
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
  if (populationTrendVal === '증가') jeonseDiscountFactor += 0.02;
  else if (populationTrendVal === '감소') jeonseDiscountFactor -= 0.02;

  const predictedJeonse = validatedJeonse * jeonseDiscountFactor;
  const pressure = jeonseDiscountFactor > 1.02 ? '상방 (공급부족)' : jeonseDiscountFactor < 0.98 ? '하방 (공급과잉)' : '보합';

  const result = {
    supplyRatio,
    jeonseDiscountFactor,
    predictedJeonse,
    pressure
  };

  const outputParsed = ForwardJeonseTrajectoryResultSchema.safeParse(result);
  if (!outputParsed.success) {
    logger.warn('ValuationEngine', 'Failed to validate calculateForwardJeonseTrajectory output', { result }, outputParsed.error);
    return {
      supplyRatio,
      jeonseDiscountFactor,
      predictedJeonse,
      pressure
    };
  }

  return outputParsed.data;
}
