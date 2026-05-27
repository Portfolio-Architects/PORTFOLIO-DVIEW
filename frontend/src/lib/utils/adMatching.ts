/**
 * @module adMatching
 * @description Dynamic B2B advertisement matching engine based on apartment metrics.
 */

import { type ObjectiveMetrics } from '@/lib/types/scoutingReport';

export interface AdBannerDetails {
  title: string;
  description: string;
  buttonText: string;
  link: string;
  themeColor: string; // Pastel background classes
  textColor: string;
}

/**
 * Returns a targeted B2B advertisement banner based on the objective metrics of an apartment.
 *
 * @param metrics - Objective metrics of the apartment complex
 * @returns AdBannerDetails matching the apartment context
 */
export function getAdForApartment(metrics?: ObjectiveMetrics): AdBannerDetails {
  const currentYear = 2026; // Current system reference year

  // Default fallback banner
  const fallbackAd: AdBannerDetails = {
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

  // 1. Newly Built Complex (< 5 years) -> Interior / Move-in services
  if (metrics.yearBuilt && currentYear - metrics.yearBuilt <= 5) {
    return {
      title: '새 집으로 입주하시나요? 🏡',
      description: '동탄 단지 전문 한샘 인테리어 홈스타일링 무료 실측 및 견적 혜택.',
      buttonText: '무료 견적 받기',
      link: '/#b2b-interior',
      themeColor: 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/50',
      textColor: 'text-rose-700 dark:text-rose-300',
    };
  }

  // 2. Older Complex (> 15 years) -> Remodeling / Window replacement / Leak Repair
  if (metrics.yearBuilt && currentYear - metrics.yearBuilt >= 15) {
    return {
      title: '노후 샷시 및 배관 교체 지원 🛠️',
      description: '단지 맞춤형 단열 샷시 교체 및 화장실 부분 리모델링 특별 패키지.',
      buttonText: '할인 혜택 확인',
      link: '/#b2b-remodeling',
      themeColor: 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50',
      textColor: 'text-amber-700 dark:text-amber-300',
    };
  }

  // 3. Elementary School is far (> 500m) -> Kid academies / Shuttle services
  if (metrics.distanceToElementary && metrics.distanceToElementary > 500) {
    return {
      title: '우리 아이 안심 등하교 케어 🎒',
      description: '단지 앞 왕복 학원 셔틀버스 및 1:1 방문 홈스쿨링 케어 서비스.',
      buttonText: '안심 셔틀 알아보기',
      link: '/#b2b-shuttle',
      themeColor: 'bg-sky-50/70 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/50',
      textColor: 'text-sky-700 dark:text-sky-300',
    };
  }

  // 4. Subway/GTX is far (> 1.5km) -> Mobility/Bike sharing
  if (metrics.distanceToSubway && metrics.distanceToSubway > 1500) {
    return {
      title: '지하철역까지 이동 마찰 해소 🚲',
      description: '단지 전용 프리미엄 공유 전기자전거 1개월 무료 탑승 쿠폰.',
      buttonText: '쿠폰 발급받기',
      link: '/#b2b-mobility',
      themeColor: 'bg-violet-50/70 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/50',
      textColor: 'text-violet-700 dark:text-violet-300',
    };
  }

  return fallbackAd;
}
