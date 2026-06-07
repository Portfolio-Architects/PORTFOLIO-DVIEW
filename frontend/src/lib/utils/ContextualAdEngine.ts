export interface ContextualAd {
  adType: 'interior' | 'academy' | 'insurance' | 'cleaning';
  badge: string;
  title: string;
  desc: string;
  actionText: string;
  link: string;
}

export function getContextualAd(
  yearBuilt: string | number | undefined,
  distanceToElementary: number | undefined,
  jeonseRate: number | undefined
): ContextualAd {
  // 1. 전세사기 및 역전세 위험군 타겟팅 (전세가율 70% 이상)
  if (jeonseRate !== undefined && jeonseRate >= 0.70) {
    return {
      adType: 'insurance',
      badge: '안전 보증 케어',
      title: '혹시 내 전세금도 위험할까? 보증보험 요건 1분 확인',
      desc: '최근 전세가율이 70%를 상회하여 보증금 반환에 각별한 주의가 필요합니다. HUG 전세금반환보증보험 가입 가능 여부와 한도 무료 진단을 받아보세요.',
      actionText: '보증보험 가입 자격 무료 진단',
      link: 'https://jeonse.dview.com/insurance'
    };
  }

  // 2. 노후 리모델링 수요 타겟팅 (준공 15년 이상 단지)
  if (yearBuilt !== undefined && yearBuilt !== null) {
    try {
      const match = String(yearBuilt).replace(/[^0-9]/g, '').slice(0, 4);
      if (match.length === 4) {
        const year = parseInt(match, 10);
        const age = 2026 - year; // Current year is 2026
        if (age >= 15) {
          return {
            adType: 'interior',
            badge: '노후단지 특별혜택',
            title: '동탄 노후 단지 전용 인테리어 & 샷시 패키지 특별전',
            desc: '준공 15년이 경과하여 단열 성능 보강 및 실내 인테리어 개선이 추천되는 단지입니다. D-VIEW 제휴 한샘/아파트멘터리 단독 무료 실측 혜택을 이용해보세요.',
            actionText: '인테리어 무료 실측 신청하기',
            link: 'https://interior.dview.com/consult'
          };
        }
      }
    } catch (e) {
      console.warn('[ContextualAdEngine] Failed to parse yearBuilt:', yearBuilt, e);
    }
  }

  // 3. 안심 학세권 타겟팅 (초등학교 300m 이내)
  if (distanceToElementary !== undefined && distanceToElementary > 0 && distanceToElementary <= 300) {
    return {
      adType: 'academy',
      badge: '학세권 안심 교육',
      title: '단지 초인접 영어/수학 전문 교육 1회 무료 체험권',
      desc: '어린 자녀의 도보 통학이 매우 편리한 초품아 안심 단지입니다. D-VIEW 단독 제휴로 근처 명문 입시/영재 학원 첫 달 교재비 100% 지원 및 무료 체험 혜택을 제공합니다.',
      actionText: '무료 레벨테스트 & 체험 신청',
      link: 'https://academy.dview.com/free-pass'
    };
  }

  // 4. 일반 신축/기타 단지 타겟팅 (폴백)
  return {
    adType: 'cleaning',
    badge: '입주 & 홈케어',
    title: '동탄 아파트 홈케어 (입주청소/줄눈/탄성코트) 특가 공동구매',
    desc: '쾌적한 주거 공간의 시작을 위한 안심 홈클리닝 서비스! D-VIEW 단독 10% 제휴 특별 할인가 및 사후 A/S 보증 혜택으로 동탄 전문 시공 파트너사를 만나보세요.',
    actionText: '홈케어 특가 상담 신청',
    link: 'https://homecare.dview.com/coop'
  };
}
