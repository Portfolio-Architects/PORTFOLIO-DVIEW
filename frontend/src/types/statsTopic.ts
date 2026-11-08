/**
 * @module statsTopic
 * @description Statistical Report Topic definitions and registry for the DVIEW Apartment Statistics Hub (/stats).
 * Supports extensible research issues starting with Issue #1.
 */

import marketStatsStatic from '../../public/data/market-stats.json';

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

function resolveReferenceMonthLabel(): string {
  const raw =
    (marketStatsStatic as { latestRegisteredDate?: string | null; latestContractDate?: string | null })
      ?.latestRegisteredDate ||
    (marketStatsStatic as { latestContractDate?: string | null })?.latestContractDate ||
    '';
  if (/^\d{6,8}$/.test(raw)) {
    return `${raw.slice(0, 4)}.${raw.slice(4, 6)} 기준`;
  }
  return '최신 기준';
}

export const STATS_TOPICS: StatsTopic[] = [
  {
    id: 'dongtan-station-distance',
    issueNumber: 1,
    badge: 'Issue #1',
    title: '동탄역과의 거리가 아파트 가격에 미치는 영향',
    subtitle: 'GTX-A 동탄역 접근성에 따른 127개 단지 실거래가 및 평당가 OLS 회귀분석 리포트',
    publishedAt: resolveReferenceMonthLabel(),
    sampleCount: '127개 단지 · 최근 1년 실거래 전수',
    status: 'active',
  },
  {
    id: 'school-district-premium',
    issueNumber: 2,
    badge: 'Issue #2',
    title: '초품아 및 명문 학군이 형성하는 동탄 아파트 프리미엄',
    subtitle: '초등학교 도보 통학권 및 학원가 밀집도와 실거래 매매가 상관관계 분석',
    publishedAt: '실거래 상시 반영',
    sampleCount: '초품아(24단지) vs 일반(103단지)',
    status: 'active',
  },
  {
    id: 'lake-park-view-premium',
    issueNumber: 3,
    badge: 'Issue #3',
    title: '동탄호수공원 조망권과 수변 입지의 가치 측정',
    subtitle: '호수공원 도보 생활권 단지의 평당가 격차와 거래 회전율 실증 분석',
    publishedAt: '실거래 상시 반영',
    sampleCount: '수변권(12단지) vs 배후권(15단지)',
    status: 'active',
  },
  {
    id: 'building-age-depreciation',
    issueNumber: 4,
    badge: 'Issue #4',
    title: '동탄 1·2신도시 연식별 감가상각과 재건축·리모델링 기대치',
    subtitle: '단지 연식 경과에 따른 평당가 감가상각 곡선 및 시세 방어율 비교',
    publishedAt: '실거래 상시 반영',
    sampleCount: '127개 단지 · 누적 6.5만건 실거래',
    status: 'active',
  },
  {
    id: 'dongtan-1-vs-2-comparison',
    issueNumber: 5,
    badge: 'VS 특별판',
    title: '동탄1신도시 vs 동탄2신도시 집값·실거래 비교 분석',
    subtitle: '동탄1(반송·석우·능동) vs 동탄2(청계·여울·송동 등) 평균 집값·평당가·예산대별 분포 및 대장주 1:1 비교',
    publishedAt: '실거래 상시 반영',
    sampleCount: '동탄1(38단지) vs 동탄2(89단지)',
    status: 'active',
  },
];

export const DEFAULT_STATS_TOPIC: StatsTopic = STATS_TOPICS[0];

export function getStatsTopicById(id: string): StatsTopic | undefined {
  return STATS_TOPICS.find((topic) => topic.id === id);
}

export function getActiveStatsTopic(): StatsTopic {
  return STATS_TOPICS.find((topic) => topic.status === 'active') ?? STATS_TOPICS[0];
}
