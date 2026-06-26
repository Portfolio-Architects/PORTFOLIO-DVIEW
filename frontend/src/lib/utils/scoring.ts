import { ObjectiveMetrics } from '../types/scoutingReport';
import { parseCoordString, findNearest } from './haversine';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

const MAJOR_PARKS = [
  { name: '동탄호수공원', lat: 37.1683, lng: 127.1068 },
  { name: '여울공원', lat: 37.2001, lng: 127.0863 },
  { name: '센트럴파크', lat: 37.2045, lng: 127.0631 },
  { name: '청계중앙공원', lat: 37.1956, lng: 127.1122 },
  { name: '선납숲공원', lat: 37.2104, lng: 127.1198 },
];

export const ScoreDetailSchema = z.object({
  score: z.number(),
  max: z.number(),
  label: z.string(),
  data: z.string().optional(),
});

export type ScoreDetail = z.infer<typeof ScoreDetailSchema>;

export const ScoreBreakdownSchema = z.object({
  gtx: ScoreDetailSchema,
  indeokwon: ScoreDetailSchema,
  tram: ScoreDetailSchema,
  school: ScoreDetailSchema,
  academy: ScoreDetailSchema,
  store: ScoreDetailSchema,
  parkDist: ScoreDetailSchema,
  brand: ScoreDetailSchema,
  scale: ScoreDetailSchema,
  parking: ScoreDetailSchema,
  year: ScoreDetailSchema,
});

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

export const PremiumScoresSchema = z.object({
  education: z.number(),
  transport: z.number(),
  livingComfort: z.number(),
  complex: z.number(),
  lifestyle: z.number(),
  totalScore: z.number(),
  // Legacy aliases
  eduTimePremium: z.number(),
  stressFreeParking: z.number(),
  commuteFrictional: z.number(),
  megaScaleLiquidity: z.number(),
  totalPremiumScore: z.number(),
  details: ScoreBreakdownSchema.optional(),
});

export type PremiumScores = z.infer<typeof PremiumScoresSchema>;

export const SubScoreResultSchema = z.object({
  score: z.number(),
  grade: z.string(),
  description: z.string(),
});

export type SubScoreResult = z.infer<typeof SubScoreResultSchema>;

const nullableNumSchema = z.union([z.string(), z.number(), z.null(), z.undefined()])
  .transform(val => {
    if (val === null || val === undefined) return 0;
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  });

export const ScoringMetricsSchema = z.object({
  brand: z.string().nullable().optional().transform(val => val || ''),
  householdCount: nullableNumSchema,
  far: nullableNumSchema,
  bcr: nullableNumSchema,
  parkingCount: nullableNumSchema,
  parkingPerHousehold: nullableNumSchema,
  yearBuilt: z.union([z.string(), z.number(), z.null(), z.undefined()]).transform(val => {
    if (val === null || val === undefined) return new Date().getFullYear();
    return val;
  }),
  minFloor: nullableNumSchema,
  maxFloor: nullableNumSchema,
  coordinates: z.string().nullable().optional().transform(val => val || ''),
  distanceToElementary: nullableNumSchema,
  distanceToMiddle: nullableNumSchema,
  distanceToHigh: nullableNumSchema,
  distanceToSubway: nullableNumSchema,
  academyDensity: nullableNumSchema,
  academyCategories: z.record(z.string(), z.number()).nullable().optional().transform(val => val || {}),
  restaurantDensity: nullableNumSchema,
  restaurantCategories: z.record(z.string(), z.number()).nullable().optional().transform(val => val || {}),
  distanceToIndeokwon: nullableNumSchema,
  distanceToTram: nullableNumSchema,
  distanceToStarbucks: nullableNumSchema,
  distanceToSupermarket: nullableNumSchema,
  distanceToPark: nullableNumSchema,
  distanceToOliveYoung: nullableNumSchema,
  distanceToDaiso: nullableNumSchema,
  distanceToMcDonalds: nullableNumSchema,
  name: z.string().nullable().optional().transform(val => val || ''),
}).passthrough();

export type ScoringMetrics = z.infer<typeof ScoringMetricsSchema>;

export function getSafeMetrics(metrics: unknown): ScoringMetrics {
  const fallback = (val: unknown, def = 0): number => {
    if (val === null || val === undefined) return def;
    const num = Number(val);
    return isNaN(num) ? def : num;
  };
  
  const m = (metrics && typeof metrics === 'object' ? metrics : {}) as Record<string, unknown>;
  return {
    brand: typeof m.brand === 'string' ? m.brand : '',
    householdCount: fallback(m.householdCount),
    far: fallback(m.far),
    bcr: fallback(m.bcr),
    parkingCount: fallback(m.parkingCount),
    parkingPerHousehold: fallback(m.parkingPerHousehold),
    yearBuilt: (() => {
      try {
        const val = m.yearBuilt;
        if (val === null || val === undefined) return new Date().getFullYear();
        if (typeof val === 'number') return isNaN(val) ? new Date().getFullYear() : val;
        if (typeof val === 'string') {
          const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
          return isNaN(num) ? new Date().getFullYear() : num;
        }
        return new Date().getFullYear();
      } catch (e: unknown) {
        return new Date().getFullYear();
      }
    })(),
    minFloor: fallback(m.minFloor),
    maxFloor: fallback(m.maxFloor),
    coordinates: typeof m.coordinates === 'string' ? m.coordinates : '',
    distanceToElementary: fallback(m.distanceToElementary),
    distanceToMiddle: fallback(m.distanceToMiddle),
    distanceToHigh: fallback(m.distanceToHigh),
    distanceToSubway: fallback(m.distanceToSubway),
    academyDensity: fallback(m.academyDensity),
    academyCategories: (m.academyCategories && typeof m.academyCategories === 'object' ? m.academyCategories : {}) as Record<string, number>,
    restaurantDensity: fallback(m.restaurantDensity),
    restaurantCategories: (m.restaurantCategories && typeof m.restaurantCategories === 'object' ? m.restaurantCategories : {}) as Record<string, number>,
    distanceToIndeokwon: fallback(m.distanceToIndeokwon),
    distanceToTram: fallback(m.distanceToTram),
    distanceToStarbucks: fallback(m.distanceToStarbucks),
    distanceToSupermarket: fallback(m.distanceToSupermarket),
    distanceToPark: fallback(m.distanceToPark),
    distanceToOliveYoung: fallback(m.distanceToOliveYoung),
    distanceToDaiso: fallback(m.distanceToDaiso),
    distanceToMcDonalds: fallback(m.distanceToMcDonalds),
    name: typeof m.name === 'string' ? m.name : '',
  };
}

interface BrandTier {
  tier: number;
  mu: number;       // 위험 조정 승수 (midpoint)
  brands: string[]; // 매칭 키워드 (아파트명에 포함 여부로 판정)
}

const BRAND_TIERS: BrandTier[] = [
  // Tier 1: High-End Core — μ = 1.12~1.15
  { tier: 1, mu: 1.135, brands: ['디에이치', '아크로', '르엘', '써밋'] },
  // Tier 2: Top-Tier Major — μ = 1.08~1.10
  { tier: 2, mu: 1.09, brands: ['래미안', '힐스테이트'] },
  // Tier 3: Upper Major — μ = 1.05~1.07
  { tier: 3, mu: 1.06, brands: ['자이', '푸르지오', 'e편한세상', '더샵'] },
  // Tier 4: Risk-Managed Major — μ = 1.02~1.04
  { tier: 4, mu: 1.03, brands: ['롯데캐슬', '아이파크', 'SK뷰', '포레나'] },
  // Tier 5: New Town Leading — μ = 1.01~1.03
  { tier: 5, mu: 1.02, brands: ['호반써밋', '우미린', '제일풍경채', '중흥S-클래스', '중흥'] },
  // Tier 6: Traditional Regional — μ = 0.99~1.01
  { tier: 6, mu: 1.00, brands: ['하늘채', '어울림', '유보라', '센트레빌', '엘리프'] },
  // Tier 7: Risk Exposed Mid-size — μ = 0.95~0.98
  { tier: 7, mu: 0.965, brands: ['데시앙', '스타힐스', '스위첸', '빌리브'] },
  // Tier 8: Public & Micro — μ = 0.90~0.95
  { tier: 8, mu: 0.925, brands: ['안단테'] },
];

const MU_DEFAULT = 0.925; // Tier 8 (비브랜드 기본값)

export function getBrandMultiplier(brand: string | undefined): number {
  if (!brand) return MU_DEFAULT;
  for (const tier of BRAND_TIERS) {
    for (const keyword of tier.brands) {
      if (brand.includes(keyword)) return tier.mu;
    }
  }
  return MU_DEFAULT;
}

function interpolateScore(val: number, points: { v: number, pct: number }[]): number {
  if (!points || points.length === 0) return 0;
  if (typeof val !== 'number' || isNaN(val)) return points[0].pct;

  if (points[0].v < points[points.length - 1].v) {
    // Ascending order (e.g. parking, household)
    if (val <= points[0].v) return points[0].pct;
    if (val >= points[points.length - 1].v) return points[points.length - 1].pct;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (val >= p1.v && val <= p2.v) {
        const denominator = p2.v - p1.v;
        if (denominator === 0) return p1.pct;
        const ratio = (val - p1.v) / denominator;
        return p1.pct + ratio * (p2.pct - p1.pct);
      }
    }
  } else {
    // Descending order (e.g. distance, year)
    if (val >= points[0].v) return points[0].pct;
    if (val <= points[points.length - 1].v) return points[points.length - 1].pct;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      if (val <= p1.v && val >= p2.v) {
        const denominator = p1.v - p2.v;
        if (denominator === 0) return p1.pct;
        const ratio = (p1.v - val) / denominator;
        return p1.pct + ratio * (p2.pct - p1.pct);
      }
    }
  }
  return 0;
}

const DISTANCE_CURVE = [
  { v: 2000, pct: 0 },
  { v: 1200, pct: 0.2 },
  { v: 800, pct: 0.5 },
  { v: 500, pct: 0.8 },
  { v: 300, pct: 1.0 }
];

export function calculatePremiumScores(metrics: ObjectiveMetrics | undefined): PremiumScores {
  const zeroDetail = { score: 0, max: 0, label: '데이터 없음' };
  const zeroBreakdown: ScoreBreakdown = {
    gtx: zeroDetail, indeokwon: zeroDetail, tram: zeroDetail, school: zeroDetail, academy: zeroDetail, store: zeroDetail,
    parkDist: zeroDetail, brand: zeroDetail, scale: zeroDetail, parking: zeroDetail, year: zeroDetail
  };
  const zero: PremiumScores = {
    education: 0, transport: 0, livingComfort: 0, complex: 0, lifestyle: 0, totalScore: 0,
    eduTimePremium: 0, stressFreeParking: 0, commuteFrictional: 0, megaScaleLiquidity: 0, totalPremiumScore: 0,
    details: zeroBreakdown
  };
  if (!metrics) return zero;

  const parsed = ScoringMetricsSchema.safeParse(metrics);
  if (!parsed.success) {
    logger.warn('ScoringEngine', 'Failed to validate metrics in calculatePremiumScores', { metrics }, parsed.error);
  }
  const validatedMetrics = parsed.success ? parsed.data : getSafeMetrics(metrics);

  const getDistLabel = (dist: number | undefined, name: string) => {
    if (!dist || dist >= 9999) return `${name} 거리 1.2km 초과 (환승 필요)`;
    if (dist <= 300) return `${name} 초역세권 (${dist}m)`;
    if (dist <= 500) return `${name} 역세권 (${dist}m)`;
    if (dist <= 800) return `${name} 도보권 (${dist}m)`;
    if (dist <= 1200) return `${name} 인접권 (${dist}m)`;
    return `${name} 거리 1.2km 초과 (환승 필요)`;
  };

  // 1. 🚇 교통 (Max 125)
  const gtxPct = interpolateScore(validatedMetrics.distanceToSubway || 9999, DISTANCE_CURVE);
  const indkPct = interpolateScore(validatedMetrics.distanceToIndeokwon || 9999, DISTANCE_CURVE);
  const tramPct = interpolateScore(validatedMetrics.distanceToTram || 9999, DISTANCE_CURVE);
  
  const gtxScore = Math.round(gtxPct * 75);
  const indkScore = Math.round(indkPct * 26);
  const tramScore = Math.round(tramPct * 24);
  const transport = gtxScore + indkScore + tramScore;

  // 2. 🎓 학군 (Max 25)
  const minSchool = Math.min(validatedMetrics.distanceToElementary || 9999, validatedMetrics.distanceToMiddle || 9999, validatedMetrics.distanceToHigh || 9999);
  const schoolPct = interpolateScore(minSchool, [
    { v: 2000, pct: 0 }, { v: 1500, pct: 0.1 }, { v: 800, pct: 0.4 }, { v: 500, pct: 0.7 }, { v: 200, pct: 1.0 }
  ]);
  const schScore = Math.round(schoolPct * 15);
  let schLabel = '800m 초과 (통학 불편)';
  if (minSchool <= 200) schLabel = '200m 이내 (초품아급 안심통학)';
  else if (minSchool <= 500) schLabel = '500m 이내 (도보 통학권)';
  else if (minSchool <= 800) schLabel = '800m 이내 (도보 가능)';

  const academyPct = interpolateScore(validatedMetrics.academyDensity || 0, [
    { v: 0, pct: 0 }, { v: 15, pct: 0.4 }, { v: 40, pct: 0.7 }, { v: 80, pct: 1.0 }
  ]);
  const education = schScore + Math.round(academyPct * 10);

  // 3. 🅿️ 주거 쾌적 (Max 20)
  const parkingPct = interpolateScore(validatedMetrics.parkingPerHousehold || 0, [
    { v: 0.8, pct: 0 }, { v: 1.0, pct: 0.2 }, { v: 1.2, pct: 0.5 }, { v: 1.4, pct: 0.8 }, { v: 1.6, pct: 1.0 }
  ]);
  const parkScore = Math.round(parkingPct * 12);
  let parkLabel = '주차 데이터 없음';
  const p = validatedMetrics.parkingPerHousehold || 0;
  if (p >= 1.6) parkLabel = `${p.toFixed(2)}대 (매우 여유)`;
  else if (p >= 1.4) parkLabel = `${p.toFixed(2)}대 (여유)`;
  else if (p >= 1.2) parkLabel = `${p.toFixed(2)}대 (보통)`;
  else if (p >= 1.0) parkLabel = `${p.toFixed(2)}대 (다소 혼잡)`;
  else if (p > 0) parkLabel = `${p.toFixed(2)}대 (혼잡 스트레스)`;

  const parkDistPct = interpolateScore(validatedMetrics.distanceToPark || 9999, [
    { v: 2000, pct: 0 }, { v: 1000, pct: 0.3 }, { v: 600, pct: 0.6 }, { v: 300, pct: 1.0 }
  ]);
  const parkDistScore = Math.round(parkDistPct * 8);
  let parkDistLabel = '600m 초과 제한적 뷰';
  if ((validatedMetrics.distanceToPark || 9999) <= 300) parkDistLabel = '300m 이내 공세권/호품아';
  else if ((validatedMetrics.distanceToPark || 9999) <= 600) parkDistLabel = '600m 이내 쾌적한 도보 접근';

  let nearestParkStr = '주요 공원';
  if (validatedMetrics.coordinates) {
    const origin = parseCoordString(validatedMetrics.coordinates);
    if (origin) {
      const nearestPark = findNearest(origin, MAJOR_PARKS);
      if (nearestPark) nearestParkStr = nearestPark.name;
    }
  }

  const livingComfort = parkScore + parkDistScore;

  // 4. 🏢 단지 경쟁력 (Max 15)
  const scalePct = interpolateScore(validatedMetrics.householdCount || 0, [
    { v: 0, pct: 0.1 }, { v: 500, pct: 0.3 }, { v: 1000, pct: 0.6 }, { v: 1500, pct: 0.8 }, { v: 3000, pct: 1.0 }
  ]);
  const scaleScore = Math.round(scalePct * 6);
  const hh = validatedMetrics.householdCount || 0;
  let scaleLabel = '세대수 데이터 없음';
  if (hh >= 1500) scaleLabel = `${hh.toLocaleString()}세대 매머드급`;
  else if (hh >= 1000) scaleLabel = `${hh.toLocaleString()}세대 대단지`;
  else if (hh >= 500) scaleLabel = `${hh.toLocaleString()}세대 중형단지`;
  else if (hh > 0) scaleLabel = `${hh.toLocaleString()}세대 소형단지`;

  const aptName = validatedMetrics.name || '';
  const brandVal = `${validatedMetrics.brand || ''} ${aptName}`;
  const mu = getBrandMultiplier(brandVal);
  let brandScore = 1; let brandLabel = '기본 브랜드 / 기타 시공사';
  if (mu >= 1.09) { brandScore = 4; brandLabel = '1군 하이엔드/메이저'; }
  else if (mu >= 1.05) { brandScore = 3; brandLabel = '상위 메이저 브랜드'; }
  else if (mu >= 1.02) { brandScore = 2; brandLabel = '인지도 보유 브랜드'; }

  const currentYear = new Date().getFullYear();
  const rawYear = validatedMetrics.yearBuilt || currentYear;
  let yearNum = currentYear;
  if (typeof rawYear === 'string') {
    yearNum = parseInt(rawYear.replace(/[^0-9]/g, ''), 10) || currentYear;
  } else if (typeof rawYear === 'number' && !isNaN(rawYear)) {
    yearNum = rawYear;
  }
  let parsedYear = yearNum;
  if (parsedYear > 9999) {
    parsedYear = Math.floor(parsedYear / 100);
  }
  let age = currentYear - parsedYear;
  if (isNaN(age) || age < 0) {
    age = 0;
  }
  // 연식 감가상각 U-Curve: 0년(1.0) -> 15년(0.3) -> 25년(0.1) -> 35년(0.4)
  let agePct = 0;
  if (age <= 3) agePct = 1.0;
  else if (age <= 15) agePct = 1.0 - ((age - 3) / 12) * 0.7; // 3년 1.0 -> 15년 0.3
  else if (age <= 25) agePct = 0.3 - ((age - 15) / 10) * 0.2; // 15년 0.3 -> 25년 0.1
  else agePct = Math.min(0.4, 0.1 + ((age - 25) / 10) * 0.3); // 25년 0.1 -> 35년 0.4
  
  const yearScore = Math.round(agePct * 5);
  let yearLabel = `${age}년차 구축`;
  if (age <= 0) yearLabel = '분양/입주예정';
  else if (age <= 15) yearLabel = `${age}년차 (선형 감가)`;
  else if (age >= 30) yearLabel = `${age}년차 (재건축 프리미엄)`;

  const complex = scaleScore + brandScore + yearScore;

  // 5. 🍽️ 생활 인프라 (Max 15)
  const stores = (validatedMetrics.academyDensity || 0) + (validatedMetrics.restaurantDensity || 0);
  const hasAnchor = ((validatedMetrics.distanceToStarbucks ?? Infinity) <= 500) || ((validatedMetrics.distanceToSupermarket ?? Infinity) <= 500);
  let storeScore = 0; let storeLabel = '상권/학원가 정보 없음';
  if (stores >= 80) { storeScore = 15; storeLabel = '80점포 이상 (광역 상권)'; }
  else if (stores >= 40) { storeScore = hasAnchor ? 12 : 10; storeLabel = `40점포 이상 (대형 상권${hasAnchor ? ' + 앵커테넌트' : ''})`; }
  else if (stores >= 15) { storeScore = hasAnchor ? 8 : 6; storeLabel = `15점포 이상 (근린 상권${hasAnchor ? ' + 앵커테넌트' : ''})`; }
  else if (stores > 0) { storeScore = 3; storeLabel = '기본 상권 존재'; }

  const lifestyle = storeScore;

  const totalScore = education + transport + livingComfort + complex + lifestyle;

  const result: PremiumScores = {
    education, transport, livingComfort, complex, lifestyle, totalScore,
    eduTimePremium: education, stressFreeParking: livingComfort, commuteFrictional: transport,
    megaScaleLiquidity: complex, totalPremiumScore: totalScore,
    details: {
      gtx: { score: gtxScore, max: 75, label: getDistLabel(validatedMetrics.distanceToSubway, 'GTX/SRT'), data: validatedMetrics.distanceToSubway ? `실거리 ${validatedMetrics.distanceToSubway}m` : undefined },
      indeokwon: { score: indkScore, max: 26, label: getDistLabel(validatedMetrics.distanceToIndeokwon, '동인선'), data: validatedMetrics.distanceToIndeokwon ? `실거리 ${validatedMetrics.distanceToIndeokwon}m` : undefined },
      tram: { score: tramScore, max: 24, label: getDistLabel(validatedMetrics.distanceToTram, '동탄트램'), data: validatedMetrics.distanceToTram ? `실거리 ${validatedMetrics.distanceToTram}m` : undefined },
      school: { score: schScore, max: 15, label: schLabel, data: `초등 ${validatedMetrics.distanceToElementary || '-'}m, 중등 ${validatedMetrics.distanceToMiddle || '-'}m` },
      academy: { score: Math.round(academyPct * 10), max: 10, label: (validatedMetrics.academyDensity || 0) > 40 ? '우수 학원가 인접' : ((validatedMetrics.academyDensity || 0) > 15 ? '학원가 도보권' : '학원가 부족'), data: validatedMetrics.academyDensity ? `반경 내 학원 ${validatedMetrics.academyDensity}곳` : undefined },
      store: { score: storeScore, max: 15, label: storeLabel, data: `상가 ${stores}곳 (스타벅스 ${validatedMetrics.distanceToStarbucks ? validatedMetrics.distanceToStarbucks+'m' : '없음'})` },
      parkDist: { score: parkDistScore, max: 8, label: parkDistLabel, data: validatedMetrics.distanceToPark ? `${nearestParkStr}까지 ${validatedMetrics.distanceToPark}m` : undefined },
      brand: { score: brandScore, max: 4, label: brandLabel, data: brandVal ? `적용 브랜드: ${brandVal}` : undefined },
      scale: { score: scaleScore, max: 6, label: scaleLabel, data: validatedMetrics.householdCount ? `총 ${validatedMetrics.householdCount.toLocaleString()}세대` : undefined },
      parking: { score: parkScore, max: 12, label: parkLabel, data: validatedMetrics.parkingPerHousehold ? `세대당 ${validatedMetrics.parkingPerHousehold.toFixed(2)}대` : undefined },
      year: { score: yearScore, max: 5, label: yearLabel, data: validatedMetrics.yearBuilt ? `${yearNum > 9999 ? `${Math.floor(yearNum/100)}년 ${yearNum%100}월` : `${yearNum}년`} 준공 (${age}년차)` : undefined }
    }
  };

  const outputParsed = PremiumScoresSchema.safeParse(result);
  if (!outputParsed.success) {
    logger.warn('ScoringEngine', 'Failed to validate generated PremiumScores output', { result }, outputParsed.error);
    return zero;
  }

  return outputParsed.data;
}

export const calculateEducationScore = (metrics: unknown): SubScoreResult => {
  const fallbackResult: SubScoreResult = { score: 0, grade: 'C', description: '정보 부족' };
  if (!metrics) return fallbackResult;
  
  const parsed = ScoringMetricsSchema.safeParse(metrics);
  if (!parsed.success) {
    logger.warn('ScoringEngine', 'Failed to validate metrics in calculateEducationScore', { metrics }, parsed.error);
  }
  const validatedMetrics = parsed.success ? parsed.data : getSafeMetrics(metrics);
  
  let score = 0;
  
  // 1. Elementary Distance (max 45 points) - 선형 보간 감쇄 적용
  const elemDist = validatedMetrics.distanceToElementary || 9999;
  let elemScore = 0;
  if (elemDist <= 150) elemScore = 45;
  else if (elemDist <= 300) elemScore = 45 - ((elemDist - 150) / 150) * 5;
  else if (elemDist <= 500) elemScore = 40 - ((elemDist - 300) / 200) * 10;
  else if (elemDist <= 800) elemScore = 30 - ((elemDist - 500) / 300) * 15;
  else if (elemDist <= 1500) elemScore = 15 - ((elemDist - 800) / 700) * 10;
  else elemScore = 5;
  score += Math.round(elemScore);
  
  // 2. Middle & High School Accessibility (max 20 points) - 선형 보간 감쇄 적용
  const midDist = validatedMetrics.distanceToMiddle || 9999;
  const highDist = validatedMetrics.distanceToHigh || 9999;
  
  let midScore = 0;
  if (midDist <= 300) midScore = 10;
  else if (midDist <= 800) midScore = 10 - ((midDist - 300) / 500) * 3;
  else if (midDist <= 1500) midScore = 7 - ((midDist - 800) / 700) * 4;
  else midScore = 3;
  
  let highScore = 0;
  if (highDist <= 400) highScore = 10;
  else if (highDist <= 1000) highScore = 10 - ((highDist - 400) / 600) * 3;
  else if (highDist <= 2000) highScore = 7 - ((highDist - 1000) / 1000) * 4;
  else highScore = 3;
  
  score += Math.round(midScore) + Math.round(highScore);
  
  // 3. Academy Density & Diversity (max 35 points) - 다양성 인센티브 가산
  const density = validatedMetrics.academyDensity || 0;
  let baseDensityScore = 0;
  if (density >= 100) baseDensityScore = 30;
  else if (density >= 50) baseDensityScore = 24;
  else if (density >= 20) baseDensityScore = 17;
  else if (density >= 5) baseDensityScore = 8;
  else baseDensityScore = 2;
  
  const categories = validatedMetrics.academyCategories || {};
  const categoryCount = Object.keys(categories).length;
  let diversityBonus = 0;
  if (categoryCount >= 6) diversityBonus = 5;
  else if (categoryCount >= 4) diversityBonus = 3;
  else if (categoryCount >= 2) diversityBonus = 1;
  
  score += baseDensityScore + diversityBonus;
  
  // Grade
  let grade = 'C';
  let desc = '보통 수준의 교육 여건';
  if (score >= 90) {
    grade = 'S';
    desc = '최상급 초품아 + 대형 학원가 인접 (최고의 자녀 양육 환경)';
  } else if (score >= 80) {
    grade = 'A';
    desc = '안심 도보 통학 및 우수한 학원가 인프라 완비';
  } else if (score >= 70) {
    grade = 'B';
    desc = '양호한 통학 거리와 균형 잡힌 근린 교육 환경';
  }
  
  const result: SubScoreResult = { score, grade, description: desc };
  const outputParsed = SubScoreResultSchema.safeParse(result);
  if (!outputParsed.success) {
    logger.warn('ScoringEngine', 'Failed to validate generated Education SubScore output', { result }, outputParsed.error);
    return fallbackResult;
  }

  return outputParsed.data;
};

export const calculateInfraScore = (metrics: unknown): SubScoreResult => {
  const fallbackResult: SubScoreResult = { score: 0, grade: 'C', description: '정보 부족' };
  if (!metrics) return fallbackResult;
  
  const parsed = ScoringMetricsSchema.safeParse(metrics);
  if (!parsed.success) {
    logger.warn('ScoringEngine', 'Failed to validate metrics in calculateInfraScore', { metrics }, parsed.error);
  }
  const validatedMetrics = parsed.success ? parsed.data : getSafeMetrics(metrics);
  
  let score = 0;
  
  // 1. Subway/Rail Accessibility (max 40 points)
  const distances = [
    validatedMetrics.distanceToSubway || 9999,
    validatedMetrics.distanceToIndeokwon || 9999,
    validatedMetrics.distanceToTram || 9999
  ];
  const minRailDist = Math.min(...distances);
  let railScore = 0;
  if (minRailDist <= 400) railScore = 40;
  else if (minRailDist <= 800) railScore = 40 - ((minRailDist - 400) / 400) * 10;
  else if (minRailDist <= 1200) railScore = 30 - ((minRailDist - 800) / 400) * 15;
  else railScore = 10;
  score += Math.round(railScore);
  
  // 2. Convenience (Anchor Tenants) (max 30 points)
  const anchors = [
    validatedMetrics.distanceToStarbucks || 9999,
    validatedMetrics.distanceToOliveYoung || 9999,
    validatedMetrics.distanceToDaiso || 9999,
    validatedMetrics.distanceToMcDonalds || 9999
  ];
  let anchorScore = 0;
  anchors.forEach(dist => {
    if (dist <= 300) anchorScore += 7.5;
    else if (dist <= 600) anchorScore += 6;
    else if (dist <= 1000) anchorScore += 4.5;
    else anchorScore += 2;
  });
  score += Math.round(anchorScore);
  
  // 3. Commercial Density (max 30 points)
  const density = validatedMetrics.restaurantDensity || 0;
  let densityScore = 0;
  if (density >= 150) densityScore = 30;
  else if (density >= 80) densityScore = 25;
  else if (density >= 30) densityScore = 18;
  else if (density >= 10) densityScore = 10;
  else densityScore = 3;
  score += densityScore;
  
  // Grade
  let grade = 'C';
  let desc = '보통 수준의 생활 인프라';
  if (score >= 90) {
    grade = 'S';
    desc = '초역세권 및 대형 상권 밀집 (최고 수준의 생활 편의성)';
  } else if (score >= 80) {
    grade = 'A';
    desc = '역세권 입지와 스타벅스 등 핵심 상권 완비';
  } else if (score >= 70) {
    grade = 'B';
    desc = '안정적인 대중교통망과 풍부한 근린 상권 보유';
  }
  
  const result: SubScoreResult = { score, grade, description: desc };
  const outputParsed = SubScoreResultSchema.safeParse(result);
  if (!outputParsed.success) {
    logger.warn('ScoringEngine', 'Failed to validate generated Infra SubScore output', { result }, outputParsed.error);
    return fallbackResult;
  }

  return outputParsed.data;
};
