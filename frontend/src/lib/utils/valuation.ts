import { getBrandMultiplier, PremiumScoresSchema } from './scoring';
import type { PremiumScores } from './scoring';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

/**
 * 밸류에이션 상대 가치 지표
 * 
 * PUR (Price-to-Utility Ratio): 가격 대비 효용비
 *   = 84㎡ 기준 가격(만원) / 종합 프리미엄 점수
 *   → 낮을수록 가성비 우수
 *
 * 추정 임대수익률: 
 *   = (연 추정 임대료 / 매매가) * 100
 *   전세가율 기반 시뮬레이션 (실제 임대 데이터 연동 시 교체 예정)
 */

export const ValuationResultSchema = z.object({
  pur: z.number(),
  purGrade: z.string(),
  purColor: z.string(),
  estimatedYield: z.number(),
  yieldGrade: z.string(),
  yieldColor: z.string(),
  fairValue84: z.number(),
  fairValueGap: z.number(),
  investmentGrade: z.string(),
  investmentColor: z.string(),
});

export type ValuationResult = z.infer<typeof ValuationResultSchema>;

export const WaterfallItemSchema = z.object({
  name: z.string(),
  rawScore: z.number(),
  weight: z.number(),
  contribution: z.number(),
  color: z.string(),
});

export type WaterfallItem = z.infer<typeof WaterfallItemSchema>;

export const ValuationBreakdownSchema = z.object({
  items: z.array(WaterfallItemSchema),
  totalScore: z.number(),
  pur: z.number(),
  estimatedYield: z.number(),
});

export type ValuationBreakdown = z.infer<typeof ValuationBreakdownSchema>;

const Price84Schema = z.union([z.string(), z.number()]).transform(val => Number(val) || 0);
const TotalScoreSchema = z.union([z.string(), z.number()]).transform(val => Number(val) || 0);
const BrandNameSchema = z.string().optional();

const PriceManSchema = z.union([z.string(), z.number()]).transform(val => Number(val) || 0);
const AreaM2Schema = z.union([z.string(), z.number()]).transform(val => Number(val) || 0);

const AREA_CONFIG = [
  { key: 'education', name: '학군', weight: 0.25, color: '#03c75a' },
  { key: 'transport', name: '교통', weight: 0.25, color: '#00d29d' },
  { key: 'livingComfort', name: '주거쾌적', weight: 0.20, color: '#f59e0b' },
  { key: 'complex', name: '단지경쟁력', weight: 0.15, color: '#8b5cf6' },
  { key: 'lifestyle', name: '생활인프라', weight: 0.15, color: '#ef4444' },
] as const;

/**
 * PUR 등급 산정
 * PUR = 84㎡ 가격(만원) / 종합점수
 * 동탄 기준: 평균 PUR ≈ 80~120
 */
function getPurGrade(pur: number): { grade: string; color: string } {
  if (pur <= 60) return { grade: 'S', color: '#03c75a' };
  if (pur <= 80) return { grade: 'A', color: '#36b37e' };
  if (pur <= 100) return { grade: 'B+', color: '#00d29d' };
  if (pur <= 130) return { grade: 'B', color: '#f59e0b' };
  if (pur <= 160) return { grade: 'C', color: '#ff8b3d' };
  return { grade: 'D', color: '#f04452' };
}

function getYieldGrade(y: number): { grade: string; color: string } {
  if (y >= 5.0) return { grade: 'S', color: '#03c75a' };
  if (y >= 4.0) return { grade: 'A', color: '#36b37e' };
  if (y >= 3.0) return { grade: 'B+', color: '#00d29d' };
  if (y >= 2.0) return { grade: 'B', color: '#f59e0b' };
  if (y >= 1.5) return { grade: 'C', color: '#ff8b3d' };
  return { grade: 'D', color: '#f04452' };
}

/** 동탄 시장 평균 PUR (벤치마크) */
const DONGTAN_AVG_PUR = 95;

/** 종합 투자 등급: PUR·수익률·적정가 괴리율 가중 합산 */
function getInvestmentGrade(purGradeScore: number, yieldScore: number, gapPct: number): { grade: string; color: string } {
  // purGradeScore: S=5,A=4,B+=3,B=2,C=1,D=0 / yieldScore: 동일
  // gapPct: 양수=저평가, 음수=고평가 → 보너스/페널티
  const gapBonus = Math.max(-2, Math.min(2, gapPct / 10)); // ±20% → ±2점
  const composite = (purGradeScore * 0.4) + (yieldScore * 0.3) + (gapBonus + 2.5) * 0.3;
  if (composite >= 4.0) return { grade: 'S', color: '#03c75a' };
  if (composite >= 3.2) return { grade: 'A', color: '#36b37e' };
  if (composite >= 2.4) return { grade: 'B+', color: '#00d29d' };
  if (composite >= 1.6) return { grade: 'B', color: '#f59e0b' };
  if (composite >= 0.8) return { grade: 'C', color: '#ff8b3d' };
  return { grade: 'D', color: '#f04452' };
}

function gradeToScore(grade: string): number {
  const map: Record<string, number> = { 'S': 5, 'A': 4, 'B+': 3, 'B': 2, 'C': 1, 'D': 0 };
  return map[grade] ?? 0;
}

/**
 * PUR 계산
 * @param price84Man 84㎡ 기준 매매가 (만원 단위)
 * @param totalScore 종합 프리미엄 점수 (0~100)
 * @param brandName 브랜드/시공사명 (μ 조회용)
 */
export function calculatePUR(price84Man: number, totalScore: number, brandName?: string): ValuationResult {
  const priceParsed = Price84Schema.safeParse(price84Man);
  const scoreParsed = TotalScoreSchema.safeParse(totalScore);
  const brandParsed = BrandNameSchema.safeParse(brandName);

  if (!priceParsed.success || !scoreParsed.success) {
    logger.warn('ValuationUtility', 'Failed to validate calculatePUR inputs', { price84Man, totalScore });
  }

  const validatedPrice = priceParsed.success ? priceParsed.data : (Number(price84Man) || 0);
  const validatedScore = scoreParsed.success ? scoreParsed.data : (Number(totalScore) || 0);
  const validatedBrand = brandParsed.success ? brandParsed.data : brandName;

  const mu = getBrandMultiplier(validatedBrand);
  const safeTotalScore = Math.max(validatedScore, 1);
  const pur = Math.round((validatedPrice / (safeTotalScore * mu)) * 10) / 10;
  const purInfo = getPurGrade(pur);

  // 추정 임대수익률: 동탄 평균 전세가율 약 55~70%
  // 연 환산: (매매가 - 전세가) → 월세 전환 (전환율 4.5%) → 연수익률
  const jeonseRate = 0.62; // 동탄 평균 전세가율
  const conversionRate = 0.045; // 전월세 전환율
  const monthlyRent = (validatedPrice * (1 - jeonseRate)) * conversionRate / 12;
  const annualRent = monthlyRent * 12;
  const estimatedYield = Math.round((annualRent / Math.max(validatedPrice, 1)) * 1000) / 10;
  const yieldInfo = getYieldGrade(estimatedYield);

  // μ 보정 적정가: totalScore × μ × 시장 평균 PUR
  const fairValue84 = Math.round(safeTotalScore * mu * DONGTAN_AVG_PUR);
  const fairValueGap = Math.round(((fairValue84 - validatedPrice) / Math.max(validatedPrice, 1)) * 1000) / 10;

  // 종합 투자 등급
  const investmentInfo = getInvestmentGrade(
    gradeToScore(purInfo.grade),
    gradeToScore(yieldInfo.grade),
    fairValueGap,
  );

  const result: ValuationResult = {
    pur,
    purGrade: purInfo.grade,
    purColor: purInfo.color,
    estimatedYield,
    yieldGrade: yieldInfo.grade,
    yieldColor: yieldInfo.color,
    fairValue84,
    fairValueGap,
    investmentGrade: investmentInfo.grade,
    investmentColor: investmentInfo.color,
  };

  const outputParsed = ValuationResultSchema.safeParse(result);
  if (!outputParsed.success) {
    logger.warn('ValuationUtility', 'Failed to validate ValuationResult output', { result }, outputParsed.error);
    const zeroResult: ValuationResult = {
      pur: 0,
      purGrade: 'D',
      purColor: '#f04452',
      estimatedYield: 0,
      yieldGrade: 'D',
      yieldColor: '#f04452',
      fairValue84: 0,
      fairValueGap: 0,
      investmentGrade: 'D',
      investmentColor: '#f04452',
    };
    return zeroResult;
  }

  return outputParsed.data;
}

/**
 * 밸류에이션 폭포수 분해
 */
export function getValuationBreakdown(
  scores: PremiumScores,
  price84Man: number,
  customWeights?: Record<string, number>,
  brandName?: string,
): ValuationBreakdown {
  const scoresParsed = PremiumScoresSchema.safeParse(scores);
  const priceParsed = Price84Schema.safeParse(price84Man);
  const weightsParsed = z.record(z.string(), z.number()).optional().safeParse(customWeights);
  const brandParsed = BrandNameSchema.safeParse(brandName);

  if (!scoresParsed.success || !priceParsed.success) {
    logger.warn('ValuationUtility', 'Failed to validate getValuationBreakdown inputs', { scores, price84Man });
  }

  const validatedScores = scoresParsed.success ? scoresParsed.data : scores;
  const validatedPrice = priceParsed.success ? priceParsed.data : (Number(price84Man) || 0);
  const validatedWeights = weightsParsed.success ? weightsParsed.data : customWeights;
  const validatedBrand = brandParsed.success ? brandParsed.data : brandName;

  const items: WaterfallItem[] = AREA_CONFIG.map(area => {
    const rawScore = (validatedScores as unknown as Record<string, number>)[area.key] ?? 0;
    const weight = validatedWeights?.[area.key] ?? area.weight;
    return {
      name: area.name,
      rawScore,
      weight,
      contribution: Math.round(rawScore * weight * 10) / 10,
      color: area.color,
    };
  });

  const totalScore = Math.round(items.reduce((sum, item) => sum + item.contribution, 0));
  const mu = getBrandMultiplier(validatedBrand);
  const safeTotalScore = Math.max(totalScore, 1);
  const pur = Math.round((validatedPrice / (safeTotalScore * mu)) * 10) / 10;

  const jeonseRate = 0.62;
  const conversionRate = 0.045;
  const monthlyRent = (validatedPrice * (1 - jeonseRate)) * conversionRate / 12;
  const annualRent = monthlyRent * 12;
  const estimatedYield = Math.round((annualRent / Math.max(validatedPrice, 1)) * 1000) / 10;

  const result: ValuationBreakdown = { items, totalScore, pur, estimatedYield };
  const outputParsed = ValuationBreakdownSchema.safeParse(result);
  if (!outputParsed.success) {
    logger.warn('ValuationUtility', 'Failed to validate ValuationBreakdown output', { result }, outputParsed.error);
    const zeroBreakdown: ValuationBreakdown = {
      items: [],
      totalScore: 0,
      pur: 0,
      estimatedYield: 0,
    };
    return zeroBreakdown;
  }

  return outputParsed.data;
}

/**
 * 84㎡ 기준 가격 추정
 * 거래 면적이 84㎡가 아닌 경우 면적 비율로 정규화
 */
export function normalize84Price(priceMan: number, areaM2: number): number {
  const priceParsed = PriceManSchema.safeParse(priceMan);
  const areaParsed = AreaM2Schema.safeParse(areaM2);

  const validatedPrice = priceParsed.success ? priceParsed.data : (Number(priceMan) || 0);
  const validatedArea = areaParsed.success ? areaParsed.data : (Number(areaM2) || 0);

  if (validatedArea <= 0) return validatedPrice;
  const pricePerM2 = validatedPrice / validatedArea;
  return Math.round(pricePerM2 * 84);
}

export { AREA_CONFIG };
