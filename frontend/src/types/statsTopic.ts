/**
 * @module statsTopic
 * @description Statistical Report Topic definitions and registry for the DVIEW Apartment Statistics Hub (/stats).
 * Supports extensible research issues starting with Issue #1.
 */

export interface StatsTopic {
  id: string;
  issueNumber: number;
  badge: string;
  title: string;
  subtitle: string;
  publishedAt: string;
  sampleCount: string;
  status: 'active' | 'upcoming';
}

export const STATS_TOPICS: StatsTopic[] = [
  {
    id: 'dongtan-station-distance',
    issueNumber: 1,
    badge: 'Issue #1',
    title: '동탄역과의 거리가 아파트 가격에 미치는 영향',
    subtitle: 'GTX-A 동탄역 접근성에 따른 127개 단지 실거래가 및 평당가 OLS 회귀분석 리포트',
    publishedAt: '2026.10',
    sampleCount: '127개 단지 · 8,288건 실거래 전수',
    status: 'active',
  },
  {
    id: 'school-district-premium',
    issueNumber: 2,
    badge: 'Issue #2',
    title: '초품아 및 명문 학군이 형성하는 동탄 아파트 프리미엄',
    subtitle: '초등학교 도보 통학권 및 학원가 밀집도와 실거래 매매가 상관관계 분석',
    publishedAt: '발행 예정',
    sampleCount: '분석 준비 중',
    status: 'upcoming',
  },
  {
    id: 'lake-park-view-premium',
    issueNumber: 3,
    badge: 'Issue #3',
    title: '동탄호수공원 조망권과 수변 입지의 가치 측정',
    subtitle: '호수공원 도보 생활권 단지의 평당가 격차와 거래 회전율 실증 분석',
    publishedAt: '발행 예정',
    sampleCount: '분석 준비 중',
    status: 'upcoming',
  },
  {
    id: 'building-age-depreciation',
    issueNumber: 4,
    badge: 'Issue #4',
    title: '동탄 1·2신도시 연식별 감가상각과 재건축·리모델링 기대치',
    subtitle: '단지 연식 경과에 따른 평당가 감가상각 곡선 및 시세 방어율 비교',
    publishedAt: '발행 예정',
    sampleCount: '분석 준비 중',
    status: 'upcoming',
  },
];

export const DEFAULT_STATS_TOPIC: StatsTopic = STATS_TOPICS[0];

export function getStatsTopicById(id: string): StatsTopic | undefined {
  return STATS_TOPICS.find((topic) => topic.id === id);
}

export function getActiveStatsTopic(): StatsTopic {
  return STATS_TOPICS.find((topic) => topic.status === 'active') ?? STATS_TOPICS[0];
}
