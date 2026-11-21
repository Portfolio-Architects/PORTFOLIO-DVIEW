import { GUIDE_DEFAULT_TX_SUMMARY_MAP } from '@/lib/data/guides';
import { getDisplayAptName, resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import { formatPriceEok } from '@/lib/utils/analyticsUtils';
import type { AptTxSummary } from '@/types/transaction';

export type BalanceMatchupPlacement =
  | 'home'
  | 'guide_hub'
  | 'stats_1vs2'
  | 'stats_lake'
  | 'stats_school'
  | 'stats_age';

export interface BalanceMatchupSideSpec {
  aptSlug: string;
  shortLabel: string;
  zoneBadge: string;
  keyStrength: string;
}

export interface BalanceMatchupDefinition {
  id: string;
  budgetBand: string;
  question: string;
  left: BalanceMatchupSideSpec;
  right: BalanceMatchupSideSpec;
  whySplit: string;
  relatedGuideSlug: string;
  relatedGuideLabel: string;
  placements: BalanceMatchupPlacement[];
}

export interface ResolvedBalanceMatchupSide extends BalanceMatchupSideSpec {
  canonicalSlug: string;
  displayName: string;
  dong: string;
  latestPriceManwon: number;
  latestPriceStr: string;
  latestRentManwon: number;
  latestRentStr: string;
  jeonseRatio: number | null;
  latestDate: string;
}

export interface ResolvedBalanceMatchup {
  id: string;
  budgetBand: string;
  question: string;
  left: ResolvedBalanceMatchupSide;
  right: ResolvedBalanceMatchupSide;
  priceGapText: string | null;
  whySplit: string;
  relatedGuideSlug: string;
  relatedGuideLabel: string;
}

export const BALANCE_MATCHUP_CATALOG: BalanceMatchupDefinition[] = [
  {
    id: 'solbit-vs-lake-edutown',
    budgetBand: '11~12억대 학군 · 생활권',
    question: '비슷한 예산이라면 1동탄 완성 학군 vs 2동탄 호수 에듀타운, 어디를 선택하시겠어요?',
    left: {
      aptSlug: '솔빛마을서해그랑블',
      shortLabel: '솔빛마을 서해그랑블',
      zoneBadge: '1동탄 반송동',
      keyStrength: '솔빛초·중 평지 학군 · 학원가 밀집',
    },
    right: {
      aptSlug: '동탄더샵레이크에듀타운',
      shortLabel: '더샵 레이크에듀타운',
      zoneBadge: '2동탄 산척동',
      keyStrength: '초·중·고 원스톱 · 호수공원 생활권',
    },
    whySplit:
      '검증된 중심 상권·솔빛 학원가·높은 전세가율 지지력을 보면 1동탄 반송동이, 2019년 신축 쾌적성과 단지 앞 초·중·고 통학 동선을 보면 호수 에듀타운이 강점을 가집니다.',
    relatedGuideSlug: 'dongtan-1-vs-2-comparison',
    relatedGuideLabel: '1동탄 vs 2동탄 실거래·학군 비교 보기',
    placements: ['home', 'guide_hub', 'stats_1vs2', 'stats_school'],
  },
  {
    id: 'station-lin-vs-sibeom-woonam',
    budgetBand: '15~16억대 동탄역 핵심',
    question: 'GTX-A 초역세권 주상복합 vs 청계동 시범단지 4대장, 나라면 어디에 살까?',
    left: {
      aptSlug: '동탄역린스트라우스',
      shortLabel: '동탄역 린스트라우스',
      zoneBadge: '2동탄 여울동',
      keyStrength: '동탄역 도보권 · 복합상업 직결',
    },
    right: {
      aptSlug: '동탄역시범우남퍼스트빌아파트',
      shortLabel: '시범 우남퍼스트빌',
      zoneBadge: '2동탄 청계동',
      keyStrength: '청계중앙공원 · 카림 학원가 도보',
    },
    whySplit:
      '수서 20분 GTX-A·SRT 초역세권 출퇴근 효율과 상업 편의는 여울동 광비콤이, 판상형 주거 쾌적성과 공원·학군 균형은 청계동 시범단지가 앞섭니다.',
    relatedGuideSlug: 'dongtan-station-gbcx-vs-sibeom-comparison',
    relatedGuideLabel: '광비콤 vs 시범단지 비교 리포트 보기',
    placements: ['home', 'guide_hub', 'stats_1vs2'],
  },
  {
    id: 'station-bando8-vs-lake-lin',
    budgetBand: '15억대 역세권 vs 호수 조망',
    question: '강남 출퇴근 동탄역세권 vs 주말이 달라지는 호수공원 뷰, 어느 쪽이 끌리시나요?',
    left: {
      aptSlug: '동탄역반도유보라아이비파크8.0',
      shortLabel: '동탄역 반도 8.0',
      zoneBadge: '2동탄 여울동',
      keyStrength: 'GTX-A 동탄역 도보 · 업무지구 인접',
    },
    right: {
      aptSlug: '동탄린스트라우스더레이크',
      shortLabel: '린스트라우스 더레이크',
      zoneBadge: '2동탄 송동',
      keyStrength: '동탄호수공원 · 레이크꼬모 직결',
    },
    whySplit:
      '평일 광역철도 출퇴근 시간 절약을 최우선으로 두면 동탄역권이, 호수 조망과 대형 수변 상권이 주는 거주 만족도를 중시하면 송동 호수공원 대장이 유리합니다.',
    relatedGuideSlug: 'dongtan-lake-vs-station-comparison',
    relatedGuideLabel: '동탄역 vs 호수공원 실거래 비교 보기',
    placements: ['home', 'guide_hub', 'stats_lake'],
  },
  {
    id: 'hanbit-vs-albatross',
    budgetBand: '11~12억대 갈아타기',
    question: '완성된 1동탄 센트럴파크 앞 vs 동탄2 리베라CC 조망 대단지, 어디가 더 실속일까?',
    left: {
      aptSlug: '시범한빛마을한화꿈에그린',
      shortLabel: '시범한빛 한화꿈에그린',
      zoneBadge: '1동탄 반송동',
      keyStrength: '센트럴파크 인접 · 동인선 예정권',
    },
    right: {
      aptSlug: '롯데캐슬알바트로스',
      shortLabel: '롯데캐슬 알바트로스',
      zoneBadge: '2동탄 청계동',
      keyStrength: '1,400세대+ 대단지 · 동탄2 생활권',
    },
    whySplit:
      '센트럴파크 평지 산책로와 완성된 상권·동인선 개통 기대감은 한빛마을이, 동탄2신도시 내 1,400세대급 대단지 규모와 연식 우위는 롯데캐슬 알바트로스가 강점입니다.',
    relatedGuideSlug: 'dongtan-reconstruction-remodeling-1st-new-town-outlook',
    relatedGuideLabel: '1동탄 구축 vs 2동탄 신축 분석 보기',
    placements: ['guide_hub', 'stats_age'],
  },
  {
    id: 'neungdong-vs-mokdong-8eok',
    budgetBand: '7~8억대 첫 내 집 마련',
    question: '8억 이하 현실 진입: 1동탄 능동 직주근접 vs 2동탄 목동 신축 생활권, 어디가 나을까?',
    left: {
      aptSlug: '동탄숲속마을광명메이루즈',
      shortLabel: '숲속마을 광명메이루즈',
      zoneBadge: '1동탄 능동',
      keyStrength: '서동탄·삼성전자 인접 · 생활권 완성',
    },
    right: {
      aptSlug: '동탄2신도시호반베르디움22단지',
      shortLabel: '호반베르디움 22단지',
      zoneBadge: '2동탄 목동',
      keyStrength: '동탄2 중동탄 · 비교적 젊은 연식',
    },
    whySplit:
      '화성·기흥 반도체 캠퍼스 출퇴근 거리와 완성된 마트·상권은 능동이, 동탄2신도시 기반시설과 2010년대 후반 신축 커뮤니티 환경은 목동이 매력적입니다.',
    relatedGuideSlug: 'dongtan-budget-tier-ranking',
    relatedGuideLabel: '6억·9억·12억 예산별 현실 지도 보기',
    placements: ['home', 'guide_hub', 'stats_age'],
  },
  {
    id: 'seokwoo-vs-jangji-7eok',
    budgetBand: '7억대 직주근접 vs 호수권',
    question: '삼성전자 도보·초근접 석우동 vs 호수공원 신축 장지동, 7억대라면 어디?',
    left: {
      aptSlug: '푸르지오',
      shortLabel: '석우동 예당 푸르지오',
      zoneBadge: '1동탄 석우동',
      keyStrength: '삼성전자 화성캠퍼스 직주근접',
    },
    right: {
      aptSlug: '동탄호수자이파밀리에',
      shortLabel: '동탄호수 자이파밀리에',
      zoneBadge: '2동탄 장지동',
      keyStrength: '호수공원권 · 2018년 준공 신축급',
    },
    whySplit:
      '매일 출퇴근 10분 컷과 탄탄한 전세 수요는 석우동이 압도적이며, 신축 지하주차장·조경과 호수공원 접근성, 브랜드 선호도는 장지동 자이가 우세합니다.',
    relatedGuideSlug: 'dongtan-job-proximity-commuter-comparison',
    relatedGuideLabel: '직주근접 권역별 출퇴근 비교 보기',
    placements: ['guide_hub', 'stats_lake', 'stats_school'],
  },
];

function resolveSide(
  side: BalanceMatchupSideSpec,
  txMap: Record<string, Partial<AptTxSummary> | undefined>
): ResolvedBalanceMatchupSide {
  const canonicalSlug =
    resolveCanonicalAptSlug(side.aptSlug, { txMap: txMap as Record<string, unknown> }) || side.aptSlug;
  const summary = txMap[canonicalSlug] || txMap[side.aptSlug];
  const latestPriceManwon =
    typeof summary?.latestPrice === 'number' && Number.isFinite(summary.latestPrice) && summary.latestPrice > 0
      ? Math.round(summary.latestPrice)
      : 0;
  const latestRentManwon =
    typeof summary?.latestRentDeposit === 'number' &&
    Number.isFinite(summary.latestRentDeposit) &&
    summary.latestRentDeposit > 0
      ? Math.round(summary.latestRentDeposit)
      : 0;
  const jeonseRatio =
    latestPriceManwon > 0 && latestRentManwon > 0
      ? Math.round((latestRentManwon / latestPriceManwon) * 1000) / 10
      : null;

  return {
    ...side,
    canonicalSlug,
    displayName: getDisplayAptName(canonicalSlug) || side.shortLabel,
    dong: summary?.dong || side.zoneBadge,
    latestPriceManwon,
    latestPriceStr: latestPriceManwon > 0 ? formatPriceEok(latestPriceManwon) : '실거래 확인 중',
    latestRentManwon,
    latestRentStr: latestRentManwon > 0 ? formatPriceEok(latestRentManwon) : '전세 확인 중',
    jeonseRatio,
    latestDate: summary?.latestDate || '',
  };
}

function formatPriceGap(leftPrice: number, rightPrice: number): string | null {
  if (leftPrice <= 0 || rightPrice <= 0) return null;
  const diff = Math.abs(leftPrice - rightPrice);
  if (diff < 500) return '최근 실거래 거의 동일';
  const higher = leftPrice >= rightPrice ? '왼쪽' : '오른쪽';
  return `${higher}이 최근 실거래 약 ${formatPriceEok(diff)} 높음`;
}

export function resolveBalanceMatchups(
  placement?: BalanceMatchupPlacement,
  txMap: Record<string, Partial<AptTxSummary> | undefined> = GUIDE_DEFAULT_TX_SUMMARY_MAP
): ResolvedBalanceMatchup[] {
  const filtered = placement
    ? BALANCE_MATCHUP_CATALOG.filter((m) => m.placements.includes(placement))
    : BALANCE_MATCHUP_CATALOG;

  return filtered.map((item) => {
    const left = resolveSide(item.left, txMap);
    const right = resolveSide(item.right, txMap);
    return {
      id: item.id,
      budgetBand: item.budgetBand,
      question: item.question,
      left,
      right,
      priceGapText: formatPriceGap(left.latestPriceManwon, right.latestPriceManwon),
      whySplit: item.whySplit,
      relatedGuideSlug: item.relatedGuideSlug,
      relatedGuideLabel: item.relatedGuideLabel,
    };
  });
}

export function isValidMatchupId(rawId: string): boolean {
  return /^[a-z0-9][a-z0-9-_]{1,79}$/i.test(rawId.trim());
}
