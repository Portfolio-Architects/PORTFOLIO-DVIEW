import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const HwaseongInsightDetailsSchema = z.object({
  insightType: z.enum(['jeonse', 'aging', 'elementary', 'transport', 'default']),
  badge: z.string(),
  title: z.string(),
  description: z.string(),
  buttonText: z.string(),
  link: z.string(),
  themeColor: z.string(), // Pastel/Emerald theme CSS classes
  textColor: z.string(),
});

export type HwaseongInsightDetails = z.infer<typeof HwaseongInsightDetailsSchema>;

export const HwaseongInsightMetricsSchema = z.object({
  yearBuilt: z.union([z.string(), z.number()]).optional(),
  distanceToElementary: z.number().optional(),
  distanceToSubway: z.number().optional(),
  jeonseRate: z.number().optional(),
});

export type HwaseongInsightMetrics = z.infer<typeof HwaseongInsightMetricsSchema>;

/**
 * Returns a tailored civic/welfare insight banner for Hwaseong citizens based on apartment metrics.
 * 
 * @param metrics - Objective metrics of the apartment complex
 * @returns HwaseongInsightDetails matching the complex context
 */
export function getInsightForApartment(metrics?: HwaseongInsightMetrics): HwaseongInsightDetails {
  const currentYear = 2026;

  // Default civic benefit info
  const defaultInsight: HwaseongInsightDetails = {
    insightType: 'default',
    badge: '화성 시민 AI 혜택',
    title: '화성시 공공데이터 포털 연계 실거래 분석 📊',
    description: '어려운 부동산 법률이나 복잡한 전월세/매매 실거래가 추이를 AI와 대화하며 누구나 쉽게 파악하고 똑똑하게 진단받으세요.',
    buttonText: '화성시 공공데이터 조회',
    link: 'https://data.hscity.go.kr/',
    themeColor: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50 border-dashed',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  };

  if (!metrics) {
    return defaultInsight;
  }

  // Validate metrics safely with Zod
  const parsedMetrics = HwaseongInsightMetricsSchema.safeParse(metrics);
  if (!parsedMetrics.success) {
    logger.warn('HwaseongInsight', 'Failed to validate insight metrics, proceeding with raw/default', {}, parsedMetrics.error);
  }

  const validatedMetrics = parsedMetrics.success ? parsedMetrics.data : metrics;

  // Parse age safely
  let age: number | undefined;
  if (validatedMetrics.yearBuilt !== undefined && validatedMetrics.yearBuilt !== null) {
    try {
      const match = String(validatedMetrics.yearBuilt).replace(/[^0-9]/g, '').slice(0, 4);
      if (match.length === 4) {
        const year = parseInt(match, 10);
        age = currentYear - year;
      }
    } catch {}
  }

  // 1. High Rent/Gap Risk (jeonseRate >= 70%) -> Jeonse Protection Guide
  if (validatedMetrics.jeonseRate !== undefined && validatedMetrics.jeonseRate >= 0.70) {
    return {
      insightType: 'jeonse',
      badge: '화성 안전전세 안심케어 🛡️',
      title: '전세가율 70% 초과 단지! 깡통전세 예방 법률 안내',
      description: '본 단지는 전세가율이 높아 보증금 반환 확보가 최우선입니다. 화성시가 제공하는 안전 전세 안심 상담과 HUG 전세금 반환보증 제도의 지원 혜택을 즉시 확인해 보세요.',
      buttonText: 'HUG 전세보증보험 가이드',
      link: 'https://www.khug.or.kr/',
      themeColor: 'from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-100/80 dark:border-emerald-900/30 border-dashed',
      textColor: 'text-emerald-700 dark:text-emerald-300',
    };
  }

  // 2. Old Building (age >= 15 years) -> Aging Condominium Subsidies
  if (age !== undefined && age >= 15) {
    return {
      insightType: 'aging',
      badge: '공동주택 지원 혜택 🏡',
      title: '준공 15년 이상 단지 전용 공동주택 수선 및 단열 지원',
      description: '화성시 조례에 의거, 준공 15년이 경과한 공동주택의 공용시설 개보수 및 노후 샷시 단열 개선 시 보조금 지원 대상이 될 수 있습니다. 화성시 공동주택 관리지원 사업 공고를 조회하세요.',
      buttonText: '노후 공동주택 지원사업 안내',
      link: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1018',
      themeColor: 'from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-100/80 dark:border-amber-900/30 border-dashed',
      textColor: 'text-amber-700 dark:text-amber-300',
    };
  }

  // 3. Close to Elementary School (distanceToElementary <= 300m) -> Neulbom Care & Education
  if (validatedMetrics.distanceToElementary !== undefined && validatedMetrics.distanceToElementary <= 300) {
    return {
      insightType: 'elementary',
      badge: '화성 안심 늘봄 돌봄 🎒',
      title: '초품아 단지! 화성형 초등돌봄 늘봄학교 연계 안내',
      description: '초등학교가 인접한 아파트입니다. 화성시 내 초등학교에서 제공하는 국가 책임 안심돌봄 서비스인 늘봄학교 이용 대상 및 신청 일정과 창의 코딩 AI 융합 교육 혜택을 알아보세요.',
      buttonText: '화성 늘봄학교 가이드',
      link: 'https://www.goe.go.kr/',
      themeColor: 'from-pink-50/50 to-purple-50/30 dark:from-pink-950/20 dark:to-purple-950/10 border-pink-100/80 dark:border-pink-900/30 border-dashed',
      textColor: 'text-pink-700 dark:text-pink-300',
    };
  }

  // 4. Close to Subway/GTX/Tram (distanceToSubway <= 500m) -> Transport & Ddok-bus
  if (validatedMetrics.distanceToSubway !== undefined && validatedMetrics.distanceToSubway <= 500) {
    return {
      insightType: 'transport',
      badge: '화성 대중교통 맵 🚌',
      title: '역세권 광역 교통 대책 및 똑버스(수요응답형) 이용 가이드',
      description: '철도역사 인근 주거 단지입니다. 동탄역을 중심으로 하는 GTX-A 노선 개통 스케줄 및 동탄 트램 조기 착공 계획을 확인하고, 신속하게 호출하여 타는 화성 똑버스의 승차 요건을 진단해 드립니다.',
      buttonText: '화성 똑버스 호출 앱 안내',
      link: 'https://www.hscity.go.kr/www/user/bbs/BD_selectBbsList.do?q_bbsCode=1020',
      themeColor: 'from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/10 border-blue-100/80 dark:border-blue-900/30 border-dashed',
      textColor: 'text-blue-700 dark:text-blue-300',
    };
  }

  return defaultInsight;
}
