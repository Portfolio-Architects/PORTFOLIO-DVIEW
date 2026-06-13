import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const AdBannerDetailsSchema = z.object({
  adType: z.enum(['interior', 'academy', 'insurance', 'cleaning', 'mobility', 'brokerage']),
  badge: z.string(),
  title: z.string(),
  description: z.string(),
  buttonText: z.string(),
  link: z.string(),
  themeColor: z.string(), // Pastel background classes
  textColor: z.string(),
});

export type AdBannerDetails = z.infer<typeof AdBannerDetailsSchema>;

export const AdMatchingMetricsSchema = z.object({
  yearBuilt: z.union([z.string(), z.number()]).optional(),
  distanceToElementary: z.number().optional(),
  distanceToSubway: z.number().optional(),
  jeonseRate: z.number().optional(),
});

export type AdMatchingMetrics = z.infer<typeof AdMatchingMetricsSchema>;

/**
 * Returns a targeted B2B advertisement banner based on the objective metrics of an apartment.
 *
 * @param metrics - Objective metrics of the apartment complex
 * @returns AdBannerDetails matching the apartment context
 */
export function getAdForApartment(metrics?: AdMatchingMetrics): AdBannerDetails {
  const currentYear = 2026; // Current system reference year

  // Default fallback banner
  const fallbackAd: AdBannerDetails = {
    adType: 'brokerage',
    badge: '동탄 전문 중개',
    title: '동탄 전문 명품 부동산 파트너 🤝',
    description: '허위매물 제로! 매매/전세 중개수수료 추가 혜택 적용 단지.',
    buttonText: '중개 문의하기',
    link: '/#b2b-brokerage',
    themeColor: 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50',
    textColor: 'text-emerald-700 dark:text-emerald-300',
  };

  if (!metrics) {
    return fallbackAd;
  }

  // Parse metrics safely using Zod
  const parsedMetrics = AdMatchingMetricsSchema.safeParse(metrics);
  if (!parsedMetrics.success) {
    logger.warn('AdMatching', 'Failed to validate ad matching metrics, proceeding with raw/fallback', {}, parsedMetrics.error);
  }

  // Proceed with parsed data if valid, otherwise fallback to raw input
  const validatedMetrics = parsedMetrics.success ? parsedMetrics.data : metrics;

  // Parse yearBuilt safely
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

  let matchedAd: AdBannerDetails;

  // 1. High Rent Fraud/Gap Risk (jeonseRate >= 70%) -> Insurance
  if (validatedMetrics.jeonseRate !== undefined && validatedMetrics.jeonseRate >= 0.70) {
    matchedAd = {
      adType: 'insurance',
      badge: '안전 보증 케어',
      title: '혹시 내 전세금도 위험할까? 보증보험 요건 1분 확인',
      description: '최근 전세가율이 70%를 상회하여 보증금 반환에 각별한 주의가 필요합니다. HUG 전세금반환보증보험 가입 가능 여부와 한도 무료 진단을 받아보세요.',
      buttonText: '보증보험 가입 자격 무료 진단',
      link: 'https://jeonse.dview.com/insurance',
      themeColor: 'from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/20 dark:to-teal-950/10 border-emerald-100/80 dark:border-emerald-900/30',
      textColor: 'text-emerald-700 dark:text-emerald-300',
    };
  }
  // 2. Old Complex (>= 15 years) -> Remodeling / Interior
  else if (age !== undefined && age >= 15) {
    matchedAd = {
      adType: 'interior',
      badge: '노후단지 특별혜택',
      title: '동탄 노후 단지 전용 인테리어 & 샷시 패키지 특별전',
      description: '준공 15년이 경과하여 단열 성능 보강 및 실내 인테리어 개선이 추천되는 단지입니다. D-VIEW 제휴 한샘/아파트멘터리 단독 무료 실측 혜택을 이용해보세요.',
      buttonText: '인테리어 무료 실측 신청하기',
      link: 'https://interior.dview.com/consult',
      themeColor: 'from-amber-50/50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-100/80 dark:border-amber-900/30',
      textColor: 'text-amber-700 dark:text-amber-300',
    };
  }
  // 3. Close to Elementary School (<= 300m) -> Close Academies
  else if (validatedMetrics.distanceToElementary !== undefined && validatedMetrics.distanceToElementary > 0 && validatedMetrics.distanceToElementary <= 300) {
    matchedAd = {
      adType: 'academy',
      badge: '학세권 안심 교육',
      title: '단지 초인접 영어/수학 전문 교육 1회 무료 체험권',
      description: '어린 자녀의 도보 통학이 매우 편리한 초품아 안심 단지입니다. D-VIEW 단독 제휴로 근처 명문 입시/영재 학원 첫 달 교재비 100% 지원 및 무료 체험 혜택을 제공합니다.',
      buttonText: '무료 레벨테스트 & 체험 신청',
      link: 'https://academy.dview.com/free-pass',
      themeColor: 'from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/20 dark:to-purple-950/10 border-indigo-100/80 dark:border-indigo-900/30',
      textColor: 'text-indigo-700 dark:text-indigo-300',
    };
  }
  // 4. Newly Built Complex (< 5 years) -> Move-in / Interior services
  else if (age !== undefined && age < 5) {
    matchedAd = {
      adType: 'interior',
      badge: '새 집으로 입주',
      title: '새 집으로 입주하시나요? 🏡',
      description: '동탄 단지 전문 한샘 인테리어 홈스타일링 무료 실측 및 견적 혜택.',
      buttonText: '무료 견적 받기',
      link: '/#b2b-interior',
      themeColor: 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50',
      textColor: 'text-rose-700 dark:text-rose-300',
    };
  }
  // 5. Far from Elementary School (> 500m) -> Kid academies / Shuttle services
  else if (validatedMetrics.distanceToElementary !== undefined && validatedMetrics.distanceToElementary > 500) {
    matchedAd = {
      adType: 'academy',
      badge: '안심 등하교 케어',
      title: '우리 아이 안심 등하교 케어 🎒',
      description: '단지 앞 왕복 학원 셔틀버스 및 1:1 방문 홈스쿨링 케어 서비스.',
      buttonText: '안심 셔틀 알아보기',
      link: '/#b2b-shuttle',
      themeColor: 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/50',
      textColor: 'text-sky-700 dark:text-sky-300',
    };
  }
  // 6. Subway/GTX is far (> 1.5km) -> Mobility/Bike sharing
  else if (validatedMetrics.distanceToSubway !== undefined && validatedMetrics.distanceToSubway > 1500) {
    matchedAd = {
      adType: 'cleaning',
      badge: '대중교통 커넥트',
      title: '지하철역까지 이동 마찰 해소 🚲',
      description: '단지 전용 프리미엄 공유 전기자전거 1개월 무료 탑승 쿠폰.',
      buttonText: '쿠폰 발급받기',
      link: '/#b2b-mobility',
      themeColor: 'bg-violet-50/70 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/50',
      textColor: 'text-violet-700 dark:text-violet-300',
    };
  }
  // 7. General new/other complexes -> Fallback Cleaning
  else {
    matchedAd = {
      adType: 'cleaning',
      badge: '입주 & 홈케어',
      title: '동탄 아파트 홈케어 (입주청소/줄눈/탄성코트) 특가 공동구매',
      description: '쾌적한 주거 공간의 시작을 위한 안심 홈클리닝 서비스! D-VIEW 단독 10% 제휴 특별 할인가 및 사후 A/S 보증 혜택으로 동탄 전문 시공 파트너사를 만나보세요.',
      buttonText: '홈케어 특가 상담 신청',
      link: 'https://homecare.dview.com/coop',
      themeColor: 'from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/10 dark:to-emerald-900/5 border-emerald-100/60 dark:border-emerald-900/20',
      textColor: 'text-emerald-700 dark:text-emerald-300',
    };
  }

  // Validate the final generated ad banner object using Zod
  const adValidation = AdBannerDetailsSchema.safeParse(matchedAd);
  if (!adValidation.success) {
    logger.warn('AdMatching', 'Generated ad does not match AdBannerDetailsSchema, returning fallback', { ad: matchedAd }, adValidation.error);
    return fallbackAd;
  }

  return adValidation.data;
}

