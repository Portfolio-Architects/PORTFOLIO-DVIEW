/**
 * @module releaseCohortComparison
 * @description Live 7-day pre/post cohort comparison engine for commit `3f056525`
 * ("GSC 0-Click 상위 라우트 SEO 스니펫 고도화 및 금융 계산기 진입 퍼널·계측 정합성 강화").
 *
 * Enforces D-VIEW Invariants:
 *  1. Strict Real Data Only (.agent/rules/DVIEW_strict-real-data-only.md):
 *     Never fabricates, extrapolates, or simulates unelapsed future dates or unindexed GSC days.
 *  2. Zero-Denominator Guard (.agent/skills/dview-adsense-telemetry/SKILL.md):
 *     Returns `null` rate and `"분모 모수 0건(산출 불가)"` whenever exposure/impressions/sessions == 0.
 *  3. Asia/Seoul (KST) Deterministic Date Math (DEAD_ENDS.md DE-01):
 *     Immune to UTC 00:00~08:59 KST off-by-one date lag.
 */
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
  DEFAULT_DVIEW_GA4_PROPERTY_ID,
  mintGoogleServiceAccountToken,
} from '@/lib/services/ga4CustomDimensions';
import {
  fetchSearchConsoleAnalyticsRows,
  type GscAnalyticsFetchResult,
  type RawGscAnalyticsRow,
} from '@/lib/repositories/searchConsole.repository';
import { recommendDviewSeoAction } from '@/lib/services/searchConsoleCtr';

export const RELEASE_3F056525_COMMIT = '3f056525';
export const RELEASE_3F056525_DEPLOYED_AT_KST = '2026-11-17T21:43:27+09:00';

export const DEFAULT_3F056525_PRE_WINDOW: CohortDateWindow = {
  startDate: '2026-11-11',
  endDate: '2026-11-17',
};

export const DEFAULT_3F056525_POST_WINDOW: CohortDateWindow = {
  startDate: '2026-11-18',
  endDate: '2026-11-24',
};

export const ZERO_DENOMINATOR_LABEL = '분모 모수 0건(산출 불가)';

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const GA4_READONLY_SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

export const CohortDateWindowSchema = z
  .object({
    startDate: z.string().trim(),
    endDate: z.string().trim(),
  })
  .refine((w) => isValidIsoCalendarDate(w.startDate), {
    message: 'startDate must be a valid YYYY-MM-DD calendar date',
  })
  .refine((w) => isValidIsoCalendarDate(w.endDate), {
    message: 'endDate must be a valid YYYY-MM-DD calendar date',
  })
  .refine((w) => w.startDate <= w.endDate, {
    message: 'startDate must be less than or equal to endDate',
  });

export type CohortDateWindow = z.infer<typeof CohortDateWindowSchema>;

export type WindowMaturityStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';

export interface CohortWindowMaturity {
  window: CohortDateWindow;
  asOfKstDate: string;
  status: WindowMaturityStatus;
  totalCalendarDays: number;
  elapsedCalendarDays: number;
  remainingCalendarDays: number;
  effectiveQueryEndDate: string | null;
  ga4ObservedActiveDays: number;
  gscFinalizedDays: number;
  gscLatestAvailableDate: string | null;
  gscLagDaysBehindAsOf: number | null;
  statusSummaryKo: string;
}

export interface GuardedRateComparison {
  preNumerator: number;
  preDenominator: number;
  preRatePct: number | null;
  preFormatted: string;
  postNumerator: number;
  postDenominator: number;
  postRatePct: number | null;
  postFormatted: string;
  deltaNumerator: number;
  deltaRatePp: number | null;
  deltaFormatted: string;
  relativeLiftPct: number | null;
  statusLabel: string;
}

export type OpenCalculatorTriggerFamilyId =
  | 'modal_header_quick_pill'
  | 'modal_header_quick_pill_tax'
  | 'inline_header_quick_pill'
  | 'inline_header_quick_pill_tax'
  | 'apartment_ssr_price_strip'
  | 'apartment_modal_top_bridge'
  | 'apartment_inline_top_bridge'
  | 'chapter05_cta'
  | 'guide_top_takeaways_bridge'
  | 'guide_mid_tier_1_or_default_bridge'
  | 'guide_mid_tier_2_bridge'
  | 'guide_mid_tier_3_bridge'
  | 'explore_quick_pill'
  | 'header_tool_menu'
  | 'recirculation_compare'
  | 'url_query_deep_link'
  | 'technovalley_b2b_simulator'
  | 'dashboard_macro_and_fit_finder'
  | 'legacy_unattributed_not_set'
  | 'other_custom_trigger';

export type ExposureDenominatorKind =
  | 'modal_apartment_views'
  | 'apartment_ssr_page_views'
  | 'all_apartment_exposures'
  | 'guide_article_page_views'
  | 'explore_page_views'
  | 'technovalley_page_views'
  | 'dashboard_page_views'
  | 'site_sessions';

export interface TriggerFamilySpec {
  id: OpenCalculatorTriggerFamilyId;
  labelKo: string;
  denominatorKind: ExposureDenominatorKind;
  denominatorLabelKo: string;
  introducedOrHardenedIn3f056525: boolean;
}

export const TRIGGER_FAMILY_SPECS: ReadonlyArray<TriggerFamilySpec> = [
  {
    id: 'modal_header_quick_pill',
    labelKo: '단지 모달 헤더 1-Click 주담대 알약 (modal_header_quick_pill)',
    denominatorKind: 'modal_apartment_views',
    denominatorLabelKo: '비인라인 단지 모달·드로어 조회수(apartment_view)',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'modal_header_quick_pill_tax',
    labelKo: '단지 모달 헤더 1-Click 취득세 알약 (modal_header_quick_pill_tax)',
    denominatorKind: 'modal_apartment_views',
    denominatorLabelKo: '비인라인 단지 모달·드로어 조회수(apartment_view)',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'inline_header_quick_pill',
    labelKo: '단지 SSR 상세 헤더 1-Click 주담대 알약 (inline_header_quick_pill)',
    denominatorKind: 'apartment_ssr_page_views',
    denominatorLabelKo: '/apartment/* 페이지뷰',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'inline_header_quick_pill_tax',
    labelKo: '단지 SSR 상세 헤더 1-Click 취득세 알약 (inline_header_quick_pill_tax)',
    denominatorKind: 'apartment_ssr_page_views',
    denominatorLabelKo: '/apartment/* 페이지뷰',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'apartment_ssr_price_strip',
    labelKo: '단지 SSR 상단 가격 스트립 브리지 (apartment_ssr_price_strip*)',
    denominatorKind: 'apartment_ssr_page_views',
    denominatorLabelKo: '/apartment/* 페이지뷰',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'apartment_modal_top_bridge',
    labelKo: '단지 모달 상단 DSR·세금 브리지 (apartment_modal_top_bridge*)',
    denominatorKind: 'modal_apartment_views',
    denominatorLabelKo: '비인라인 단지 모달·드로어 조회수(apartment_view)',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'apartment_inline_top_bridge',
    labelKo: '단지 SSR 인라인 상단 DSR·세금 브리지 (apartment_inline_top_bridge*)',
    denominatorKind: 'apartment_ssr_page_views',
    denominatorLabelKo: '/apartment/* 페이지뷰',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'chapter05_cta',
    labelKo: '단지 리포트 Chapter 05 심층·센티넬 계산기 CTA (chapter05_*)',
    denominatorKind: 'all_apartment_exposures',
    denominatorLabelKo: '단지 상세 PV + 비인라인 모달 조회 합계',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'guide_top_takeaways_bridge',
    labelKo: '가이드 상단 핵심 요약 금융 브리지 (guide_top_takeaways_bridge*)',
    denominatorKind: 'guide_article_page_views',
    denominatorLabelKo: '/guide/[slug] 아티클 페이지뷰',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'guide_mid_tier_1_or_default_bridge',
    labelKo: '가이드 본문 중단 기본·Tier 1(6억) 브리지 (guide_mid_conversion/tier_1*)',
    denominatorKind: 'guide_article_page_views',
    denominatorLabelKo: '/guide/[slug] 아티클 페이지뷰',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'guide_mid_tier_2_bridge',
    labelKo: '가이드 본문 중단 Tier 2(9억) 브리지 (guide_mid_tier_2_bridge*)',
    denominatorKind: 'guide_article_page_views',
    denominatorLabelKo: '/guide/[slug] 아티클 페이지뷰',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'guide_mid_tier_3_bridge',
    labelKo: '가이드 본문 중단 Tier 3(12억+) 브리지 (guide_mid_tier_3_bridge*)',
    denominatorKind: 'guide_article_page_views',
    denominatorLabelKo: '/guide/[slug] 아티클 페이지뷰',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'explore_quick_pill',
    labelKo: '탐색(/explore) 카탈로그 상단 금융 퀵필 (explore_quick_pill)',
    denominatorKind: 'explore_page_views',
    denominatorLabelKo: '/explore 페이지뷰',
    introducedOrHardenedIn3f056525: false,
  },
  {
    id: 'header_tool_menu',
    labelKo: '단지 상세·모달·권역 헤더 금융 도구 메뉴 (header_tool_menu)',
    denominatorKind: 'all_apartment_exposures',
    denominatorLabelKo: '단지 상세 PV + 비인라인 모달 조회 합계',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'recirculation_compare',
    labelKo: '유사 단지 1:1 비교 순환 버튼 (recirculation_compare)',
    denominatorKind: 'all_apartment_exposures',
    denominatorLabelKo: '단지 상세 PV + 비인라인 모달 조회 합계',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'url_query_deep_link',
    labelKo: '쿼리 딥링크 진입 (?calc= · /about 히어로 CTA 포함)',
    denominatorKind: 'site_sessions',
    denominatorLabelKo: '전체 세션수(sessions)',
    introducedOrHardenedIn3f056525: true,
  },
  {
    id: 'technovalley_b2b_simulator',
    labelKo: '테크노밸리 B2B 이전 세제 시뮬레이터 (technovalley_*/simulator_*)',
    denominatorKind: 'technovalley_page_views',
    denominatorLabelKo: '/technovalley* 페이지뷰',
    introducedOrHardenedIn3f056525: false,
  },
  {
    id: 'dashboard_macro_and_fit_finder',
    labelKo: '메인 거시 대시보드 · AI 맞춤 단지 진단 (dashboard / zone2_terminal)',
    denominatorKind: 'dashboard_page_views',
    denominatorLabelKo: '/ + /overview 페이지뷰',
    introducedOrHardenedIn3f056525: false,
  },
  {
    id: 'legacy_unattributed_not_set',
    labelKo: '구버전 파라미터 미지정 레거시 이벤트 ((not set))',
    denominatorKind: 'site_sessions',
    denominatorLabelKo: '전체 세션수(sessions)',
    introducedOrHardenedIn3f056525: false,
  },
  {
    id: 'other_custom_trigger',
    labelKo: '기타 동적 트리거 (other_custom_trigger)',
    denominatorKind: 'site_sessions',
    denominatorLabelKo: '전체 세션수(sessions)',
    introducedOrHardenedIn3f056525: false,
  },
] as const;

export interface SeoTargetRouteSpec {
  routeKey: string;
  labelKo: string;
  matchMode: 'exact' | 'prefix';
  prefix?: string;
  excludeExact?: ReadonlyArray<string>;
  upgradeSummaryKo: string;
}

export const TARGET_3F056525_SEO_ROUTES: ReadonlyArray<SeoTargetRouteSpec> = [
  {
    routeKey: '/',
    labelKo: '메인 홈 (/)',
    matchMode: 'exact',
    upgradeSummaryKo: '동탄 아파트 시세·집값 추이 그래프 전면 배치 + 국토부 Dataset JSON-LD',
  },
  {
    routeKey: '/overview',
    labelKo: '거시 브리핑 (/overview)',
    matchMode: 'exact',
    upgradeSummaryKo: '동탄 아파트 시세·184개 단지 순위 타이틀·디스크립션 정렬',
  },
  {
    routeKey: '/explore',
    labelKo: '단지 탐색 (/explore)',
    matchMode: 'exact',
    upgradeSummaryKo: '동탄 아파트 순위 디스크립션 전면 배치 + ?calc=compare 딥링크 연동',
  },
  {
    routeKey: '/about',
    labelKo: '서비스 소개 (/about)',
    matchMode: 'exact',
    upgradeSummaryKo: '디뷰·동뷰·동탄뷰 한글 브랜드명 전면화 + 비클로킹 FAQPage + /?calc=mortgage CTA',
  },
  {
    routeKey: '/guide/dongtan-1-vs-2-comparison',
    labelKo: '1동탄 vs 2동탄 비교 가이드',
    matchMode: 'exact',
    upgradeSummaryKo: '1동탄 2동탄 차이·비교 + 전세가율 65~74%·GTX-A 수서 20분 + FAQPage 4문항+',
  },
  {
    routeKey: '/guide/dongtan-school-zone-top-apartments',
    labelKo: '동탄 학군·학원가 TOP 4 가이드',
    matchMode: 'exact',
    upgradeSummaryKo: '동탄 학군지·학원가 TOP 4 초품아 타이틀 및 동탄학군 키워드 강화',
  },
  {
    routeKey: '/guide/dongtan-budget-tier-ranking',
    labelKo: '예산 티어별 동탄 아파트 순위 가이드',
    matchMode: 'exact',
    upgradeSummaryKo: '동탄 아파트 순위 전면화 + 상단 점프 CTA 및 6·9·12억 3단 금융 브리지',
  },
  {
    routeKey: '/guide/* (other)',
    labelKo: '기타 입지·금융·교통 가이드 20편 합계 (/guide/[slug])',
    matchMode: 'prefix',
    prefix: '/guide/',
    excludeExact: [
      '/guide/dongtan-1-vs-2-comparison',
      '/guide/dongtan-school-zone-top-apartments',
      '/guide/dongtan-budget-tier-ranking',
    ],
    upgradeSummaryKo: '상단 계산기 점프 CTA 및 세무·스트레스 DSR·정책대출 다단 금융 브리지 확장',
  },
  {
    routeKey: '/technovalley',
    labelKo: '동탄테크노밸리 허브 (/technovalley)',
    matchMode: 'exact',
    upgradeSummaryKo: '입주기업·지식산업센터 키워드 보강 + 2단 BreadcrumbList JSON-LD',
  },
  {
    routeKey: '/technovalley/*',
    labelKo: '지식산업센터 개별 상세 (/technovalley/[jisan] · ?jisan= 포함)',
    matchMode: 'prefix',
    prefix: '/technovalley/',
    upgradeSummaryKo: '붙여쓰기 별칭(동탄금강펜테리움ix타워 등)·취득세 감면 스펙 + 3단 BreadcrumbList',
  },
  {
    routeKey: '/apartment/*',
    labelKo: '184개 단지 SSR 상세 집계 (/apartment/[aptName])',
    matchMode: 'prefix',
    prefix: '/apartment/',
    upgradeSummaryKo: '단지별 실거래 스니펫 + 헤더 1-Click 주담대·취득세 알약 & 상단 가격 스트립',
  },
  {
    routeKey: '/zone/*',
    labelKo: '권역별 심층 리포트 (/zone/[id])',
    matchMode: 'prefix',
    prefix: '/zone/',
    upgradeSummaryKo: 'ZoneDetailClient 단지 모달 계산기 5종 컨텍스트 핸드오프 및 1:1 비교 연동',
  },
] as const;

export const TARGET_3F056525_ZERO_CLICK_QUERIES: ReadonlyArray<{
  query: string;
  targetRoute: string;
}> = [
  { query: '1동탄 2동탄', targetRoute: '/guide/dongtan-1-vs-2-comparison' },
  { query: '동탄1 동탄2 비교', targetRoute: '/guide/dongtan-1-vs-2-comparison' },
  { query: '동탄 1 2 차이', targetRoute: '/guide/dongtan-1-vs-2-comparison' },
  { query: '1동탄', targetRoute: '/guide/dongtan-1-vs-2-comparison' },
  { query: '동탄 학군', targetRoute: '/guide/dongtan-school-zone-top-apartments' },
  { query: '동탄 학군지', targetRoute: '/guide/dongtan-school-zone-top-apartments' },
  { query: '동탄 학원가', targetRoute: '/guide/dongtan-school-zone-top-apartments' },
  { query: '동탄 아파트 시세', targetRoute: '/' },
  { query: '동탄 아파트 순위', targetRoute: '/explore' },
  { query: '동뷰', targetRoute: '/about' },
  { query: '디뷰', targetRoute: '/about' },
  { query: '동탄뷰', targetRoute: '/about' },
  { query: '에이팩시티', targetRoute: '/technovalley/에이팩시티' },
  { query: '금강펜테리움 ix타워', targetRoute: '/technovalley/동탄금강펜테리움-IX타워' },
  { query: '동탄금강펜테리움ix타워', targetRoute: '/technovalley/동탄금강펜테리움-IX타워' },
] as const;

export interface Ga4OpenCalculatorRow {
  trigger: string;
  surface: string;
  calculatorType: string;
  pagePath: string;
  eventCount: number;
  totalUsers: number;
}

export interface Ga4DimensionUserBucket {
  key: string;
  eventCount: number;
  totalUsers: number;
}

export interface Ga4PageTrafficRow {
  pagePath: string;
  screenPageViews: number;
  sessions: number;
  activeUsers: number;
}

export interface Ga4OrganicLandingRow {
  sourceMedium: string;
  pagePath: string;
  sessions: number;
  activeUsers: number;
  screenPageViews: number;
}

export interface Ga4ApartmentViewSurfaceRow {
  surface: string;
  viewType: string;
  eventCount: number;
  totalUsers: number;
}

export interface Ga4CohortWindowSnapshot {
  ok: boolean;
  errorMessage?: string;
  customDimensionFallbackUsed?: boolean;
  activeUsers: number;
  sessions: number;
  screenPageViews: number;
  totalEvents: number;
  observedActiveDates: string[]; // YYYY-MM-DD sorted
  eventCountsByName: Record<string, { eventCount: number; totalUsers: number }>;
  pageTrafficRows: Ga4PageTrafficRow[];
  apartmentViewRows: Ga4ApartmentViewSurfaceRow[];
  openCalculatorRows: Ga4OpenCalculatorRow[];
  openCalculatorByRawTriggerUsers: Ga4DimensionUserBucket[];
  openCalculatorBySurfaceUsers: Ga4DimensionUserBucket[];
  openCalculatorByTypeUsers: Ga4DimensionUserBucket[];
  financeQuickInteractCount: number;
  financeQuickInteractUsers: number;
  organicLandingRows: Ga4OrganicLandingRow[];
}

export interface ExposureDenominators {
  siteSessions: number;
  sitePageViews: number;
  siteActiveUsers: number;
  dashboardPageViews: number;
  explorePageViews: number;
  apartmentSsrPageViews: number;
  guideArticlePageViews: number;
  technovalleyPageViews: number;
  zoneDetailPageViews: number;
  aboutPageViews: number;
  totalApartmentViewEvents: number;
  ssrInlineApartmentViewEvents: number;
  chartPreviewApartmentViewEvents: number;
  modalApartmentViewEvents: number;
  allApartmentExposures: number;
}

export interface TriggerFamilyComparisonRow {
  familyId: OpenCalculatorTriggerFamilyId;
  labelKo: string;
  introducedOrHardenedIn3f056525: boolean;
  denominatorKind: ExposureDenominatorKind;
  denominatorLabelKo: string;
  surfaceExposureCvr: GuardedRateComparison;
  siteSessionCvr: GuardedRateComparison;
  preShareOfOpenCalcPct: number | null;
  postShareOfOpenCalcPct: number | null;
}

export interface RawDimensionComparisonRow {
  key: string;
  preEventCount: number;
  preUsers: number;
  postEventCount: number;
  postUsers: number;
  deltaEvents: number;
  siteSessionCvr: GuardedRateComparison;
}

export interface Ga4OpenCalculatorComparisonReport {
  preDenominators: ExposureDenominators;
  postDenominators: ExposureDenominators;
  overallSessionCvr: GuardedRateComparison;
  overallPageViewCvr: GuardedRateComparison;
  overallUserCvr: GuardedRateComparison;
  unattributedNotSetShare: GuardedRateComparison;
  microInteractToOpenRatio: GuardedRateComparison;
  preFinanceQuickInteractEvents: number;
  postFinanceQuickInteractEvents: number;
  byTriggerFamily: TriggerFamilyComparisonRow[];
  byRawTrigger: RawDimensionComparisonRow[];
  bySurface: RawDimensionComparisonRow[];
  byCalculatorType: RawDimensionComparisonRow[];
}

export interface GscWindowSnapshot {
  ok: boolean;
  siteProperty?: string;
  serviceAccountEmail?: string;
  errorCode?: string;
  errorMessage?: string;
  activationUrl?: string;
  totalClicks: number;
  totalImpressions: number;
  averagePosition: number | null;
  finalizedDates: string[]; // YYYY-MM-DD sorted
  pageRows: RawGscAnalyticsRow[];
  queryRows: RawGscAnalyticsRow[];
}

export interface GscRouteCtrComparisonRow {
  routeKey: string;
  labelKo: string;
  upgradeSummaryKo: string;
  preClicks: number;
  preImpressions: number;
  preCtrPct: number | null;
  prePosition: number | null;
  postClicks: number;
  postImpressions: number;
  postCtrPct: number | null;
  postPosition: number | null;
  ctrComparison: GuardedRateComparison;
  positionDelta: number | null; // negative means improved (higher rank, e.g. 6.0 -> 4.0 = -2.0)
  preGa4OrganicSessions: number;
  postGa4OrganicSessions: number;
  deltaGa4OrganicSessions: number;
}

export type ZeroClickResolutionState =
  | 'CONVERTED_FROM_ZERO_CLICK'
  | 'STILL_ZERO_CLICK'
  | 'ALREADY_CLICKED_BOTH'
  | 'REGRESSED_TO_ZERO_CLICK'
  | 'NO_POST_IMPRESSIONS_YET'
  | 'NEW_POST_CLICKED_QUERY'
  | 'NEW_POST_ZERO_CLICK_QUERY'
  | 'NO_IMPRESSIONS_EITHER';

export interface GscQueryCtrComparisonRow {
  query: string;
  targetRoute: string;
  isCanonicalTarget: boolean;
  preClicks: number;
  preImpressions: number;
  preCtrPct: number | null;
  prePosition: number | null;
  postClicks: number;
  postImpressions: number;
  postCtrPct: number | null;
  postPosition: number | null;
  ctrComparison: GuardedRateComparison;
  positionDelta: number | null;
  resolutionState: ZeroClickResolutionState;
}

export interface GscCtrLiftComparisonReport {
  overallPropertyCtr: GuardedRateComparison;
  preAveragePosition: number | null;
  postAveragePosition: number | null;
  overallPositionDelta: number | null;
  preZeroClickQueryCount: number;
  postZeroClickQueryCount: number;
  zeroClickImpressionShare: GuardedRateComparison;
  convertedZeroClickQueryCount: number;
  stillZeroClickQueryCount: number;
  pendingPostImpressionZeroClickCount: number;
  byTargetRoute: GscRouteCtrComparisonRow[];
  byTargetAndTopZeroClickQueries: GscQueryCtrComparisonRow[];
  ga4OrganicTotalSessionsPre: number;
  ga4OrganicTotalSessionsPost: number;
  ga4OrganicDeltaSessions: number;
  ga4OrganicSessionShare: GuardedRateComparison;
}

export interface ReleaseCohortComparisonReport {
  commitHash: string;
  deployedAtKst: string;
  generatedAtIso: string;
  asOfKstDate: string;
  propertyId: string;
  gscSiteProperty: string | null;
  preMaturity: CohortWindowMaturity;
  postMaturity: CohortWindowMaturity;
  ga4Status: {
    preOk: boolean;
    postOk: boolean;
    preError?: string;
    postError?: string;
    customDimensionFallbackUsed: boolean;
  };
  gscStatus: {
    preOk: boolean;
    postOk: boolean;
    preError?: string;
    postError?: string;
    activationUrl?: string;
  };
  calculatorFunnel: Ga4OpenCalculatorComparisonReport;
  gscCtrLift: GscCtrLiftComparisonReport;
}

// ============================================================================
// Pure Date, Rate & Normalization Primitives
// ============================================================================

export function isValidIsoCalendarDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [yStr, mStr, dStr] = iso.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export function formatKstIsoDate(now: Date = new Date()): string {
  return new Date(now.getTime() + KST_OFFSET_MS).toISOString().slice(0, 10);
}

export function isoDateToUtcMidnightMs(iso: string): number {
  const [yStr, mStr, dStr] = iso.split('-');
  return Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr));
}

export function shiftIsoCalendarDate(iso: string, deltaDays: number): string {
  const ms = isoDateToUtcMidnightMs(iso) + deltaDays * DAY_MS;
  return new Date(ms).toISOString().slice(0, 10);
}

export function countInclusiveCalendarDays(startDate: string, endDate: string): number {
  if (!isValidIsoCalendarDate(startDate) || !isValidIsoCalendarDate(endDate) || startDate > endDate) {
    return 0;
  }
  return Math.round((isoDateToUtcMidnightMs(endDate) - isoDateToUtcMidnightMs(startDate)) / DAY_MS) + 1;
}

export function normalizeGa4CompactDate(rawDate: string): string | null {
  const trimmed = (rawDate || '').trim();
  if (/^\d{8}$/.test(trimmed)) {
    const iso = `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
    return isValidIsoCalendarDate(iso) ? iso : null;
  }
  if (isValidIsoCalendarDate(trimmed)) {
    return trimmed;
  }
  return null;
}

export function computeGuardedRatePct(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }
  const safeNum = Number.isFinite(numerator) && numerator > 0 ? numerator : 0;
  return parseFloat(((safeNum / denominator) * 100).toFixed(2));
}

export function formatGuardedRatePct(
  ratePct: number | null,
  numerator: number,
  denominator: number
): string {
  if (ratePct === null || denominator <= 0) {
    return `${ZERO_DENOMINATOR_LABEL} [원시 ${Math.max(0, Math.round(numerator))}/0건]`;
  }
  return `${ratePct.toFixed(2)}% (${Math.max(0, Math.round(numerator))}/${Math.round(denominator)})`;
}

export function computeGuardedComparison(
  preNumerator: number,
  preDenominator: number,
  postNumerator: number,
  postDenominator: number
): GuardedRateComparison {
  const safePreNum = Math.max(0, Math.round(Number(preNumerator) || 0));
  const safePreDen = Math.max(0, Math.round(Number(preDenominator) || 0));
  const safePostNum = Math.max(0, Math.round(Number(postNumerator) || 0));
  const safePostDen = Math.max(0, Math.round(Number(postDenominator) || 0));

  const preRatePct = computeGuardedRatePct(safePreNum, safePreDen);
  const postRatePct = computeGuardedRatePct(safePostNum, safePostDen);
  const preFormatted = formatGuardedRatePct(preRatePct, safePreNum, safePreDen);
  const postFormatted = formatGuardedRatePct(postRatePct, safePostNum, safePostDen);
  const deltaNumerator = safePostNum - safePreNum;

  if (preRatePct === null || postRatePct === null) {
    return {
      preNumerator: safePreNum,
      preDenominator: safePreDen,
      preRatePct,
      preFormatted,
      postNumerator: safePostNum,
      postDenominator: safePostDen,
      postRatePct,
      postFormatted,
      deltaNumerator,
      deltaRatePp: null,
      deltaFormatted: ZERO_DENOMINATOR_LABEL,
      relativeLiftPct: null,
      statusLabel: ZERO_DENOMINATOR_LABEL,
    };
  }

  const deltaRatePp = parseFloat((postRatePct - preRatePct).toFixed(2));
  const sign = deltaRatePp > 0 ? '+' : '';

  if (preRatePct === 0) {
    if (postRatePct > 0) {
      return {
        preNumerator: safePreNum,
        preDenominator: safePreDen,
        preRatePct,
        preFormatted,
        postNumerator: safePostNum,
        postDenominator: safePostDen,
        postRatePct,
        postFormatted,
        deltaNumerator,
        deltaRatePp,
        deltaFormatted: `+${deltaRatePp.toFixed(2)}%p (기준선 0% 신규 순증)`,
        relativeLiftPct: null,
        statusLabel: '기준선 0%(신규 순증)',
      };
    }
    return {
      preNumerator: safePreNum,
      preDenominator: safePreDen,
      preRatePct,
      preFormatted,
      postNumerator: safePostNum,
      postDenominator: safePostDen,
      postRatePct,
      postFormatted,
      deltaNumerator,
      deltaRatePp: 0,
      deltaFormatted: '0.00%p',
      relativeLiftPct: 0,
      statusLabel: '변동 없음(0.00%p)',
    };
  }

  const relativeLiftPct = parseFloat((((postRatePct - preRatePct) / preRatePct) * 100).toFixed(2));
  const relSign = relativeLiftPct > 0 ? '+' : '';
  return {
    preNumerator: safePreNum,
    preDenominator: safePreDen,
    preRatePct,
    preFormatted,
    postNumerator: safePostNum,
    postDenominator: safePostDen,
    postRatePct,
    postFormatted,
    deltaNumerator,
    deltaRatePp,
    deltaFormatted: `${sign}${deltaRatePp.toFixed(2)}%p (${relSign}${relativeLiftPct.toFixed(2)}%)`,
    relativeLiftPct,
    statusLabel:
      deltaRatePp > 0 ? '상승' : deltaRatePp < 0 ? '하락' : '변동 없음(0.00%p)',
  };
}

export function evaluateCohortWindowMaturity(options: {
  window: CohortDateWindow;
  asOfKstDate: string;
  ga4ObservedDates?: ReadonlyArray<string>;
  gscFinalizedDatesInWindow?: ReadonlyArray<string>;
  gscLatestAvailableDate?: string | null;
}): CohortWindowMaturity {
  const { window, asOfKstDate } = options;
  const totalCalendarDays = countInclusiveCalendarDays(window.startDate, window.endDate);

  let status: WindowMaturityStatus;
  let elapsedCalendarDays = 0;
  let effectiveQueryEndDate: string | null = null;

  if (asOfKstDate < window.startDate) {
    status = 'NOT_STARTED';
    elapsedCalendarDays = 0;
    effectiveQueryEndDate = null;
  } else if (asOfKstDate < window.endDate) {
    status = 'IN_PROGRESS';
    elapsedCalendarDays = countInclusiveCalendarDays(window.startDate, asOfKstDate);
    effectiveQueryEndDate = asOfKstDate;
  } else {
    status = 'COMPLETE';
    elapsedCalendarDays = totalCalendarDays;
    effectiveQueryEndDate = window.endDate;
  }

  const remainingCalendarDays = Math.max(0, totalCalendarDays - elapsedCalendarDays);

  const ga4DateSet = new Set(
    (options.ga4ObservedDates ?? []).filter(
      (d) => isValidIsoCalendarDate(d) && d >= window.startDate && d <= window.endDate
    )
  );
  const gscDateSet = new Set(
    (options.gscFinalizedDatesInWindow ?? []).filter(
      (d) => isValidIsoCalendarDate(d) && d >= window.startDate && d <= window.endDate
    )
  );

  const latestGsc =
    options.gscLatestAvailableDate && isValidIsoCalendarDate(options.gscLatestAvailableDate)
      ? options.gscLatestAvailableDate
      : null;
  const gscLagDaysBehindAsOf =
    latestGsc && latestGsc <= asOfKstDate
      ? Math.round((isoDateToUtcMidnightMs(asOfKstDate) - isoDateToUtcMidnightMs(latestGsc)) / DAY_MS)
      : null;

  const gscNote = latestGsc
    ? `GSC 최신 확정일 ${latestGsc} (확정 ${gscDateSet.size}/${totalCalendarDays}일)`
    : `GSC 확정 ${gscDateSet.size}/${totalCalendarDays}일`;

  let statusSummaryKo: string;
  if (status === 'NOT_STARTED') {
    statusSummaryKo = `미도래 구간 (기준일 ${asOfKstDate}, 경과 0/${totalCalendarDays}일 · 미래 수치 추정 금지)`;
  } else if (status === 'IN_PROGRESS') {
    statusSummaryKo = `진행 중 (${window.startDate}~${effectiveQueryEndDate} 실측, 경과 ${elapsedCalendarDays}/${totalCalendarDays}일 · 잔여 ${remainingCalendarDays}일 미도래 · GA4 활성 ${ga4DateSet.size}일 · ${gscNote})`;
  } else {
    statusSummaryKo = `기간 종료 (${window.startDate}~${window.endDate}, 경과 ${totalCalendarDays}/${totalCalendarDays}일 · GA4 활성 ${ga4DateSet.size}일 · ${gscNote})`;
  }

  return {
    window,
    asOfKstDate,
    status,
    totalCalendarDays,
    elapsedCalendarDays,
    remainingCalendarDays,
    effectiveQueryEndDate,
    ga4ObservedActiveDays: ga4DateSet.size,
    gscFinalizedDays: gscDateSet.size,
    gscLatestAvailableDate: latestGsc,
    gscLagDaysBehindAsOf,
    statusSummaryKo,
  };
}

export function normalizeDviewRoutePath(rawUrlOrPath: string): string {
  const trimmed = (rawUrlOrPath || '').trim();
  if (!trimmed || trimmed === '(not set)') return '/';

  let rawCandidate = trimmed;
  const hIdx = rawCandidate.indexOf('#');
  if (hIdx >= 0) rawCandidate = rawCandidate.slice(0, hIdx);

  let pathPart = rawCandidate;
  let queryPart = '';

  if (/^https?:\/\//i.test(rawCandidate)) {
    try {
      const parsed = new URL(rawCandidate);
      pathPart = parsed.pathname || '/';
      queryPart = parsed.search ? parsed.search.slice(1) : '';
    } catch {
      const strippedOrigin = rawCandidate.replace(/^https?:\/\/[^/]+/i, '') || '/';
      const qIdx = strippedOrigin.indexOf('?');
      if (qIdx >= 0) {
        pathPart = strippedOrigin.slice(0, qIdx) || '/';
        queryPart = strippedOrigin.slice(qIdx + 1);
      } else {
        pathPart = strippedOrigin;
      }
    }
  } else {
    const qIdx = rawCandidate.indexOf('?');
    if (qIdx >= 0) {
      pathPart = rawCandidate.slice(0, qIdx) || '/';
      queryPart = rawCandidate.slice(qIdx + 1);
    }
  }

  const safeMultiDecode = (input: string): string => {
    let cur = input;
    for (let i = 0; i < 3; i++) {
      try {
        const decoded = decodeURIComponent(cur);
        if (decoded === cur) break;
        cur = decoded;
      } catch {
        break;
      }
    }
    return cur;
  };

  pathPart = safeMultiDecode(pathPart).replace(/\/{2,}/g, '/').trim();
  if (!pathPart.startsWith('/')) {
    pathPart = `/${pathPart}`;
  }
  if (pathPart.length > 1 && pathPart.endsWith('/')) {
    pathPart = pathPart.slice(0, -1);
  }

  // Legacy `/technovalley?jisan=<centerName>` URLs represent individual knowledge industry
  // center detail pages (canonicalized to `/technovalley/[slug]`), NOT the `/technovalley` hub.
  if (pathPart === '/technovalley' && queryPart.length > 0) {
    let rawJisan = '';
    try {
      const sp = new URLSearchParams(queryPart);
      rawJisan = (sp.get('jisan') || '').trim();
    } catch {
      const match = queryPart.match(/(?:^|&)jisan=([^&]*)/);
      if (match && match[1]) {
        rawJisan = safeMultiDecode(match[1].replace(/\+/g, ' ')).trim();
      }
    }
    const cleanedJisan = safeMultiDecode(rawJisan)
      .replace(/\/+/g, '-')
      .trim();
    if (cleanedJisan.length > 0) {
      return `/technovalley/${cleanedJisan}`;
    }
  }

  return pathPart;
}

export function normalizeGscSearchQueryKey(query: string): string {
  return (query || '').trim().toLowerCase().replace(/\s+/g, '');
}

// ============================================================================
// GA4 `open_calculator` Trigger / Surface / Type Funnel Comparison
// ============================================================================

export function classifyOpenCalculatorTriggerFamily(
  rawTrigger: string,
  rawSurface: string
): OpenCalculatorTriggerFamilyId {
  const t = (rawTrigger || '(not set)').trim();
  const s = (rawSurface || '(not set)').trim();

  if (t === 'modal_header_quick_pill') return 'modal_header_quick_pill';
  if (t === 'modal_header_quick_pill_tax') return 'modal_header_quick_pill_tax';
  if (t === 'inline_header_quick_pill') return 'inline_header_quick_pill';
  if (t === 'inline_header_quick_pill_tax') return 'inline_header_quick_pill_tax';

  if (t.startsWith('apartment_ssr_price_strip')) return 'apartment_ssr_price_strip';
  if (t.startsWith('apartment_modal_top_bridge')) return 'apartment_modal_top_bridge';
  if (t.startsWith('apartment_inline_top_bridge')) return 'apartment_inline_top_bridge';

  if (
    t === 'chapter05_cta' ||
    t === 'chapter05_sentinel_cta' ||
    t.startsWith('chapter05_')
  ) {
    return 'chapter05_cta';
  }

  if (t.startsWith('guide_top_takeaways_bridge')) return 'guide_top_takeaways_bridge';
  if (t.startsWith('guide_mid_tier_2_bridge')) return 'guide_mid_tier_2_bridge';
  if (
    t.startsWith('guide_mid_tier_3_bridge') ||
    /^guide_mid_tier_(?:[3-9]|\d{2,})_bridge/.test(t)
  ) {
    return 'guide_mid_tier_3_bridge';
  }
  if (
    t.startsWith('guide_mid_conversion_bridge') ||
    t.startsWith('guide_mid_tier_1_bridge')
  ) {
    return 'guide_mid_tier_1_or_default_bridge';
  }

  if (t === 'explore_quick_pill') return 'explore_quick_pill';
  if (t === 'header_tool_menu') return 'header_tool_menu';
  if (t === 'recirculation_compare') return 'recirculation_compare';
  if (t === 'url_query_deep_link') return 'url_query_deep_link';

  if (
    t === 'technovalley_top_bridge' ||
    t === 'kpi_tax_card_cta' ||
    t === 'simulator_b2b_cpa_cta' ||
    s.startsWith('technovalley_') ||
    s === 'relocation_tax_simulator_cta'
  ) {
    return 'technovalley_b2b_simulator';
  }

  if (s === 'dashboard' || s === 'zone2_terminal') {
    return 'dashboard_macro_and_fit_finder';
  }

  if (t === '(not set)') {
    return 'legacy_unattributed_not_set';
  }

  return 'other_custom_trigger';
}

export function computeExposureDenominators(
  snapshot: Ga4CohortWindowSnapshot
): ExposureDenominators {
  let dashboardPageViews = 0;
  let explorePageViews = 0;
  let apartmentSsrPageViews = 0;
  let guideArticlePageViews = 0;
  let technovalleyPageViews = 0;
  let zoneDetailPageViews = 0;
  let aboutPageViews = 0;

  for (const row of snapshot.pageTrafficRows) {
    const pv = Math.max(0, Math.round(Number(row.screenPageViews) || 0));
    if (pv === 0) continue;
    const normPath = normalizeDviewRoutePath(row.pagePath);

    if (normPath === '/' || normPath === '/overview') {
      dashboardPageViews += pv;
    } else if (normPath === '/explore') {
      explorePageViews += pv;
    } else if (normPath.startsWith('/apartment/')) {
      apartmentSsrPageViews += pv;
    } else if (normPath.startsWith('/guide/')) {
      guideArticlePageViews += pv;
    } else if (normPath === '/technovalley' || normPath.startsWith('/technovalley/')) {
      technovalleyPageViews += pv;
    } else if (normPath.startsWith('/zone/')) {
      zoneDetailPageViews += pv;
    } else if (normPath === '/about') {
      aboutPageViews += pv;
    }
  }

  const totalApartmentViewFromEventList =
    snapshot.eventCountsByName['apartment_view']?.eventCount ?? 0;
  let summedAptViewRows = 0;
  let ssrInlineApartmentViewEvents = 0;
  let chartPreviewApartmentViewEvents = 0;

  for (const r of snapshot.apartmentViewRows) {
    const cnt = Math.max(0, Math.round(Number(r.eventCount) || 0));
    summedAptViewRows += cnt;
    if (
      r.surface === 'apartment_ssr_page' ||
      r.surface === 'apartment_inline_page' ||
      r.viewType === 'inline_report' ||
      r.viewType === 'detail_page'
    ) {
      ssrInlineApartmentViewEvents += cnt;
    } else if (
      r.viewType === 'chart_preview' ||
      r.surface === 'dashboard_chart' ||
      r.surface === 'dashboard_timeline_preview'
    ) {
      chartPreviewApartmentViewEvents += cnt;
    }
  }

  const totalApartmentViewEvents = Math.max(totalApartmentViewFromEventList, summedAptViewRows);
  const modalApartmentViewEvents = Math.max(
    0,
    totalApartmentViewEvents - ssrInlineApartmentViewEvents - chartPreviewApartmentViewEvents
  );

  return {
    siteSessions: Math.max(0, Math.round(Number(snapshot.sessions) || 0)),
    sitePageViews: Math.max(0, Math.round(Number(snapshot.screenPageViews) || 0)),
    siteActiveUsers: Math.max(0, Math.round(Number(snapshot.activeUsers) || 0)),
    dashboardPageViews,
    explorePageViews,
    apartmentSsrPageViews,
    guideArticlePageViews,
    technovalleyPageViews,
    zoneDetailPageViews,
    aboutPageViews,
    totalApartmentViewEvents,
    ssrInlineApartmentViewEvents,
    chartPreviewApartmentViewEvents,
    modalApartmentViewEvents,
    allApartmentExposures: apartmentSsrPageViews + modalApartmentViewEvents,
  };
}

function selectDenominatorValue(
  denoms: ExposureDenominators,
  kind: ExposureDenominatorKind
): number {
  switch (kind) {
    case 'modal_apartment_views':
      return denoms.modalApartmentViewEvents;
    case 'apartment_ssr_page_views':
      return denoms.apartmentSsrPageViews;
    case 'all_apartment_exposures':
      return denoms.allApartmentExposures;
    case 'guide_article_page_views':
      return denoms.guideArticlePageViews;
    case 'explore_page_views':
      return denoms.explorePageViews;
    case 'technovalley_page_views':
      return denoms.technovalleyPageViews;
    case 'dashboard_page_views':
      return denoms.dashboardPageViews;
    case 'site_sessions':
    default:
      return denoms.siteSessions;
  }
}

function buildDimensionComparisonRows(
  preBuckets: ReadonlyArray<Ga4DimensionUserBucket>,
  postBuckets: ReadonlyArray<Ga4DimensionUserBucket>,
  preSessions: number,
  postSessions: number,
  canonicalKeys: ReadonlyArray<string> = []
): RawDimensionComparisonRow[] {
  const preMap = new Map<string, Ga4DimensionUserBucket>();
  const postMap = new Map<string, Ga4DimensionUserBucket>();
  const allKeys = new Set<string>(canonicalKeys);

  for (const b of preBuckets) {
    const k = (b.key || '(not set)').trim() || '(not set)';
    allKeys.add(k);
    const prev = preMap.get(k);
    preMap.set(k, {
      key: k,
      eventCount: (prev?.eventCount ?? 0) + b.eventCount,
      totalUsers: Math.max(prev?.totalUsers ?? 0, b.totalUsers),
    });
  }

  for (const b of postBuckets) {
    const k = (b.key || '(not set)').trim() || '(not set)';
    allKeys.add(k);
    const prev = postMap.get(k);
    postMap.set(k, {
      key: k,
      eventCount: (prev?.eventCount ?? 0) + b.eventCount,
      totalUsers: Math.max(prev?.totalUsers ?? 0, b.totalUsers),
    });
  }

  const rows: RawDimensionComparisonRow[] = [];
  for (const key of allKeys) {
    const preItem = preMap.get(key);
    const postItem = postMap.get(key);
    const preEventCount = preItem?.eventCount ?? 0;
    const preUsers = preItem?.totalUsers ?? 0;
    const postEventCount = postItem?.eventCount ?? 0;
    const postUsers = postItem?.totalUsers ?? 0;

    rows.push({
      key,
      preEventCount,
      preUsers,
      postEventCount,
      postUsers,
      deltaEvents: postEventCount - preEventCount,
      siteSessionCvr: computeGuardedComparison(
        preEventCount,
        preSessions,
        postEventCount,
        postSessions
      ),
    });
  }

  rows.sort(
    (a, b) =>
      b.postEventCount - a.postEventCount ||
      b.preEventCount - a.preEventCount ||
      a.key.localeCompare(b.key)
  );
  return rows;
}

export function compareGa4OpenCalculatorFunnel(
  preSnapshot: Ga4CohortWindowSnapshot,
  postSnapshot: Ga4CohortWindowSnapshot
): Ga4OpenCalculatorComparisonReport {
  const preDenominators = computeExposureDenominators(preSnapshot);
  const postDenominators = computeExposureDenominators(postSnapshot);

  const sumMultiRows = (rows: ReadonlyArray<Ga4OpenCalculatorRow>) =>
    rows.reduce((acc, r) => acc + Math.max(0, Math.round(Number(r.eventCount) || 0)), 0);

  const preOpenEventSummary = preSnapshot.eventCountsByName['open_calculator'];
  const postOpenEventSummary = postSnapshot.eventCountsByName['open_calculator'];

  const preMultiSum = sumMultiRows(preSnapshot.openCalculatorRows);
  const postMultiSum = sumMultiRows(postSnapshot.openCalculatorRows);

  const sumBuckets = (rows: ReadonlyArray<Ga4DimensionUserBucket>) =>
    rows.reduce((acc, r) => acc + Math.max(0, Math.round(Number(r.eventCount) || 0)), 0);

  const preRawTriggerSum = sumBuckets(preSnapshot.openCalculatorByRawTriggerUsers);
  const postRawTriggerSum = sumBuckets(postSnapshot.openCalculatorByRawTriggerUsers);

  const preTotalOpenEvents = Math.max(
    preOpenEventSummary?.eventCount ?? 0,
    preMultiSum,
    preRawTriggerSum
  );
  const postTotalOpenEvents = Math.max(
    postOpenEventSummary?.eventCount ?? 0,
    postMultiSum,
    postRawTriggerSum
  );

  const preTotalOpenUsers =
    preOpenEventSummary?.totalUsers ??
    preSnapshot.openCalculatorByRawTriggerUsers.reduce((m, r) => Math.max(m, r.totalUsers), 0);
  const postTotalOpenUsers =
    postOpenEventSummary?.totalUsers ??
    postSnapshot.openCalculatorByRawTriggerUsers.reduce((m, r) => Math.max(m, r.totalUsers), 0);

  const accumulateWindowTriggerFamilies = (
    snapshot: Ga4CohortWindowSnapshot,
    totalOpenEvents: number
  ): Map<OpenCalculatorTriggerFamilyId, number> => {
    const counts = new Map<OpenCalculatorTriggerFamilyId, number>();
    let multiOtherCnt = 0;

    for (const row of snapshot.openCalculatorRows) {
      const cnt = Math.max(0, Math.round(Number(row.eventCount) || 0));
      if (cnt === 0) continue;
      if ((row.trigger || '').trim() === '(other)') {
        multiOtherCnt += cnt;
        continue;
      }
      const fam = classifyOpenCalculatorTriggerFamily(row.trigger, row.surface);
      counts.set(fam, (counts.get(fam) ?? 0) + cnt);
    }

    // Reconcile against 1-dimension `customEvent:trigger` buckets in case 4-dimension
    // `openMultiRes` grouped rare pagePath combinations into `(other)` or truncated at limit.
    if (snapshot.openCalculatorByRawTriggerUsers.length > 0) {
      const singleDimByFam = new Map<OpenCalculatorTriggerFamilyId, number>();
      let singleDimRawNotSet = 0;
      for (const b of snapshot.openCalculatorByRawTriggerUsers) {
        const cnt = Math.max(0, Math.round(Number(b.eventCount) || 0));
        if (cnt === 0) continue;
        const k = (b.key || '(not set)').trim() || '(not set)';
        if (k === '(not set)') {
          singleDimRawNotSet += cnt;
          continue;
        }
        if (k === '(other)') {
          continue;
        }
        const fam = classifyOpenCalculatorTriggerFamily(k, '');
        singleDimByFam.set(fam, (singleDimByFam.get(fam) ?? 0) + cnt);
      }

      for (const [fam, singleCnt] of singleDimByFam.entries()) {
        const currentCnt = counts.get(fam) ?? 0;
        if (singleCnt > currentCnt) {
          const recovered = singleCnt - currentCnt;
          counts.set(fam, singleCnt);
          multiOtherCnt = Math.max(0, multiOtherCnt - recovered);
        }
      }

      if (multiOtherCnt > 0) {
        counts.set('other_custom_trigger', (counts.get('other_custom_trigger') ?? 0) + multiOtherCnt);
      }

      const accountedSoFar = [...counts.values()].reduce((a, v) => a + v, 0);
      if (totalOpenEvents > accountedSoFar) {
        const diff = totalOpenEvents - accountedSoFar;
        const alreadyAccountedNotSetOrDash =
          (counts.get('legacy_unattributed_not_set') ?? 0) +
          (counts.get('dashboard_macro_and_fit_finder') ?? 0);
        const remainingTrueNotSet = Math.max(0, singleDimRawNotSet - alreadyAccountedNotSetOrDash);
        const toNotSet = snapshot.customDimensionFallbackUsed
          ? diff
          : Math.min(diff, remainingTrueNotSet);
        const toOther = diff - toNotSet;
        if (toNotSet > 0) {
          counts.set(
            'legacy_unattributed_not_set',
            (counts.get('legacy_unattributed_not_set') ?? 0) + toNotSet
          );
        }
        if (toOther > 0) {
          counts.set('other_custom_trigger', (counts.get('other_custom_trigger') ?? 0) + toOther);
        }
      }
      return counts;
    }

    if (multiOtherCnt > 0) {
      counts.set('other_custom_trigger', (counts.get('other_custom_trigger') ?? 0) + multiOtherCnt);
    }

    const accountedSoFar = [...counts.values()].reduce((a, v) => a + v, 0);
    if (totalOpenEvents > accountedSoFar) {
      const diff = totalOpenEvents - accountedSoFar;
      counts.set(
        'legacy_unattributed_not_set',
        (counts.get('legacy_unattributed_not_set') ?? 0) + diff
      );
    }

    return counts;
  };

  const preFamilyCounts = accumulateWindowTriggerFamilies(preSnapshot, preTotalOpenEvents);
  const postFamilyCounts = accumulateWindowTriggerFamilies(postSnapshot, postTotalOpenEvents);

  const byTriggerFamily: TriggerFamilyComparisonRow[] = TRIGGER_FAMILY_SPECS.filter(
    (spec) =>
      spec.id !== 'other_custom_trigger' ||
      (preFamilyCounts.get('other_custom_trigger') ?? 0) > 0 ||
      (postFamilyCounts.get('other_custom_trigger') ?? 0) > 0
  ).map((spec) => {
    const preCnt = preFamilyCounts.get(spec.id) ?? 0;
    const postCnt = postFamilyCounts.get(spec.id) ?? 0;
    const preDen = selectDenominatorValue(preDenominators, spec.denominatorKind);
    const postDen = selectDenominatorValue(postDenominators, spec.denominatorKind);

    return {
      familyId: spec.id,
      labelKo: spec.labelKo,
      introducedOrHardenedIn3f056525: spec.introducedOrHardenedIn3f056525,
      denominatorKind: spec.denominatorKind,
      denominatorLabelKo: spec.denominatorLabelKo,
      surfaceExposureCvr: computeGuardedComparison(preCnt, preDen, postCnt, postDen),
      siteSessionCvr: computeGuardedComparison(
        preCnt,
        preDenominators.siteSessions,
        postCnt,
        postDenominators.siteSessions
      ),
      preShareOfOpenCalcPct: computeGuardedRatePct(preCnt, preTotalOpenEvents),
      postShareOfOpenCalcPct: computeGuardedRatePct(postCnt, postTotalOpenEvents),
    };
  });

  const deriveFallbackBuckets = (
    rows: ReadonlyArray<Ga4OpenCalculatorRow>,
    selector: (r: Ga4OpenCalculatorRow) => string
  ): Ga4DimensionUserBucket[] => {
    const map = new Map<string, Ga4DimensionUserBucket>();
    for (const r of rows) {
      const k = (selector(r) || '(not set)').trim() || '(not set)';
      const prev = map.get(k);
      map.set(k, {
        key: k,
        eventCount: (prev?.eventCount ?? 0) + r.eventCount,
        totalUsers: Math.max(prev?.totalUsers ?? 0, r.totalUsers),
      });
    }
    return [...map.values()];
  };

  const preTriggerBuckets =
    preSnapshot.openCalculatorByRawTriggerUsers.length > 0
      ? preSnapshot.openCalculatorByRawTriggerUsers
      : deriveFallbackBuckets(preSnapshot.openCalculatorRows, (r) => r.trigger);
  const postTriggerBuckets =
    postSnapshot.openCalculatorByRawTriggerUsers.length > 0
      ? postSnapshot.openCalculatorByRawTriggerUsers
      : deriveFallbackBuckets(postSnapshot.openCalculatorRows, (r) => r.trigger);

  const preSurfaceBuckets =
    preSnapshot.openCalculatorBySurfaceUsers.length > 0
      ? preSnapshot.openCalculatorBySurfaceUsers
      : deriveFallbackBuckets(preSnapshot.openCalculatorRows, (r) => r.surface);
  const postSurfaceBuckets =
    postSnapshot.openCalculatorBySurfaceUsers.length > 0
      ? postSnapshot.openCalculatorBySurfaceUsers
      : deriveFallbackBuckets(postSnapshot.openCalculatorRows, (r) => r.surface);

  const preTypeBuckets =
    preSnapshot.openCalculatorByTypeUsers.length > 0
      ? preSnapshot.openCalculatorByTypeUsers
      : deriveFallbackBuckets(preSnapshot.openCalculatorRows, (r) => r.calculatorType);
  const postTypeBuckets =
    postSnapshot.openCalculatorByTypeUsers.length > 0
      ? postSnapshot.openCalculatorByTypeUsers
      : deriveFallbackBuckets(postSnapshot.openCalculatorRows, (r) => r.calculatorType);

  const byRawTrigger = buildDimensionComparisonRows(
    preTriggerBuckets,
    postTriggerBuckets,
    preDenominators.siteSessions,
    postDenominators.siteSessions
  );

  const bySurface = buildDimensionComparisonRows(
    preSurfaceBuckets,
    postSurfaceBuckets,
    preDenominators.siteSessions,
    postDenominators.siteSessions,
    [
      'apartment_modal',
      'apartment_modal_top',
      'apartment_inline_page',
      'apartment_inline_top',
      'apartment_ssr_top',
      'guide_top_summary',
      'guide_mid_conversion',
      'explore_catalog',
      'explore_modal',
      'explore_deep_link',
      'zone_detail_modal',
      'dashboard',
      'dashboard_deep_link',
      'zone2_terminal',
      'technovalley_hub_top',
      'technovalley_detail_ssr',
      'technovalley_query_ssr',
      'technovalley_client_query',
      'technovalley_kpi_card',
      'relocation_tax_simulator_cta',
    ]
  );

  const byCalculatorType = buildDimensionComparisonRows(
    preTypeBuckets,
    postTypeBuckets,
    preDenominators.siteSessions,
    postDenominators.siteSessions,
    [
      'mortgage',
      'property_tax',
      'jeonse_safety',
      'sell_timing',
      'compare',
      'corporate_tax_simulator',
      'apt_fit_finder',
    ]
  );

  const preNotSetCnt = preFamilyCounts.get('legacy_unattributed_not_set') ?? 0;
  const postNotSetCnt = postFamilyCounts.get('legacy_unattributed_not_set') ?? 0;

  return {
    preDenominators,
    postDenominators,
    overallSessionCvr: computeGuardedComparison(
      preTotalOpenEvents,
      preDenominators.siteSessions,
      postTotalOpenEvents,
      postDenominators.siteSessions
    ),
    overallPageViewCvr: computeGuardedComparison(
      preTotalOpenEvents,
      preDenominators.sitePageViews,
      postTotalOpenEvents,
      postDenominators.sitePageViews
    ),
    overallUserCvr: computeGuardedComparison(
      preTotalOpenUsers,
      preDenominators.siteActiveUsers,
      postTotalOpenUsers,
      postDenominators.siteActiveUsers
    ),
    unattributedNotSetShare: computeGuardedComparison(
      preNotSetCnt,
      preTotalOpenEvents,
      postNotSetCnt,
      postTotalOpenEvents
    ),
    microInteractToOpenRatio: computeGuardedComparison(
      preTotalOpenEvents,
      preSnapshot.financeQuickInteractCount,
      postTotalOpenEvents,
      postSnapshot.financeQuickInteractCount
    ),
    preFinanceQuickInteractEvents: preSnapshot.financeQuickInteractCount,
    postFinanceQuickInteractEvents: postSnapshot.financeQuickInteractCount,
    byTriggerFamily,
    byRawTrigger,
    bySurface,
    byCalculatorType,
  };
}

// ============================================================================
// Google Search Console 0-Click & Route CTR Lift Comparison
// ============================================================================

interface AggregatedGscEntry {
  displayKey: string;
  clicks: number;
  impressions: number;
  weightedPositionSum: number;
  fallbackPositionSum: number;
  rowCount: number;
}

function finalizePosition(entry: AggregatedGscEntry | undefined): number | null {
  if (!entry || entry.rowCount === 0) return null;
  if (entry.impressions > 0) {
    return parseFloat((entry.weightedPositionSum / entry.impressions).toFixed(1));
  }
  return parseFloat((entry.fallbackPositionSum / entry.rowCount).toFixed(1));
}

function matchesSeoTargetRouteSpec(normPath: string, spec: SeoTargetRouteSpec): boolean {
  if (spec.matchMode === 'exact') {
    return normPath === spec.routeKey;
  }
  if (!spec.prefix || !normPath.startsWith(spec.prefix)) {
    return false;
  }
  if (spec.excludeExact && spec.excludeExact.includes(normPath)) {
    return false;
  }
  return true;
}

function aggregateGscRouteBucket(
  pageRows: ReadonlyArray<RawGscAnalyticsRow>,
  spec: SeoTargetRouteSpec
): AggregatedGscEntry {
  const agg: AggregatedGscEntry = {
    displayKey: spec.routeKey,
    clicks: 0,
    impressions: 0,
    weightedPositionSum: 0,
    fallbackPositionSum: 0,
    rowCount: 0,
  };

  for (const row of pageRows) {
    const rawUrl = row.keys[0] ?? '';
    if (!rawUrl) continue;
    const normPath = normalizeDviewRoutePath(rawUrl);
    if (!matchesSeoTargetRouteSpec(normPath, spec)) continue;

    const clicks = Math.max(0, Math.round(Number(row.clicks) || 0));
    const impressions = Math.max(0, Math.round(Number(row.impressions) || 0));
    const position = Math.max(0, Number(row.position) || 0);

    agg.clicks += clicks;
    agg.impressions += impressions;
    agg.weightedPositionSum += position * impressions;
    agg.fallbackPositionSum += position;
    agg.rowCount += 1;
  }

  return agg;
}

function aggregateGa4OrganicBySpec(
  organicRows: ReadonlyArray<Ga4OrganicLandingRow>,
  spec: SeoTargetRouteSpec
): number {
  let sessions = 0;
  for (const row of organicRows) {
    const normPath = normalizeDviewRoutePath(row.pagePath);
    if (matchesSeoTargetRouteSpec(normPath, spec)) {
      sessions += Math.max(0, Math.round(Number(row.sessions) || 0));
    }
  }
  return sessions;
}

function aggregateGscQueriesByNormalizedKey(
  queryRows: ReadonlyArray<RawGscAnalyticsRow>
): Map<string, AggregatedGscEntry> {
  const map = new Map<string, AggregatedGscEntry>();
  for (const row of queryRows) {
    const rawQuery = (row.keys[0] ?? '').trim();
    if (!rawQuery) continue;
    const normKey = normalizeGscSearchQueryKey(rawQuery);
    if (!normKey) continue;

    const clicks = Math.max(0, Math.round(Number(row.clicks) || 0));
    const impressions = Math.max(0, Math.round(Number(row.impressions) || 0));
    const position = Math.max(0, Number(row.position) || 0);

    const existing = map.get(normKey);
    if (existing) {
      if (impressions > existing.impressions) {
        existing.displayKey = rawQuery;
      }
      existing.clicks += clicks;
      existing.impressions += impressions;
      existing.weightedPositionSum += position * impressions;
      existing.fallbackPositionSum += position;
      existing.rowCount += 1;
    } else {
      map.set(normKey, {
        displayKey: rawQuery,
        clicks,
        impressions,
        weightedPositionSum: position * impressions,
        fallbackPositionSum: position,
        rowCount: 1,
      });
    }
  }
  return map;
}

function determineZeroClickResolutionState(
  preClicks: number,
  preImpressions: number,
  postClicks: number,
  postImpressions: number
): ZeroClickResolutionState {
  if (preImpressions === 0 && postImpressions === 0) {
    return 'NO_IMPRESSIONS_EITHER';
  }
  if (preImpressions > 0 && preClicks === 0) {
    if (postImpressions === 0) return 'NO_POST_IMPRESSIONS_YET';
    return postClicks > 0 ? 'CONVERTED_FROM_ZERO_CLICK' : 'STILL_ZERO_CLICK';
  }
  if (preImpressions > 0 && preClicks > 0) {
    if (postImpressions === 0) return 'NO_POST_IMPRESSIONS_YET';
    return postClicks > 0 ? 'ALREADY_CLICKED_BOTH' : 'REGRESSED_TO_ZERO_CLICK';
  }
  // preImpressions === 0 && postImpressions > 0
  return postClicks > 0 ? 'NEW_POST_CLICKED_QUERY' : 'NEW_POST_ZERO_CLICK_QUERY';
}

export function compareGscCtrLift(
  preGsc: GscWindowSnapshot,
  postGsc: GscWindowSnapshot,
  preGa4Organic: ReadonlyArray<Ga4OrganicLandingRow> = [],
  postGa4Organic: ReadonlyArray<Ga4OrganicLandingRow> = [],
  knownApartmentKeys: ReadonlyArray<string> = [],
  preSiteSessions = 0,
  postSiteSessions = 0
): GscCtrLiftComparisonReport {
  const overallPropertyCtr = computeGuardedComparison(
    preGsc.totalClicks,
    preGsc.totalImpressions,
    postGsc.totalClicks,
    postGsc.totalImpressions
  );

  const preAveragePosition =
    preGsc.totalImpressions > 0 && preGsc.averagePosition !== null
      ? parseFloat(preGsc.averagePosition.toFixed(1))
      : null;
  const postAveragePosition =
    postGsc.totalImpressions > 0 && postGsc.averagePosition !== null
      ? parseFloat(postGsc.averagePosition.toFixed(1))
      : null;
  const overallPositionDelta =
    preAveragePosition !== null && postAveragePosition !== null
      ? parseFloat((postAveragePosition - preAveragePosition).toFixed(1))
      : null;

  const byTargetRoute: GscRouteCtrComparisonRow[] = TARGET_3F056525_SEO_ROUTES.map((spec) => {
    const preAgg = aggregateGscRouteBucket(preGsc.pageRows, spec);
    const postAgg = aggregateGscRouteBucket(postGsc.pageRows, spec);
    const preCtrPct = computeGuardedRatePct(preAgg.clicks, preAgg.impressions);
    const postCtrPct = computeGuardedRatePct(postAgg.clicks, postAgg.impressions);
    const prePos = preAgg.impressions > 0 ? finalizePosition(preAgg) : null;
    const postPos = postAgg.impressions > 0 ? finalizePosition(postAgg) : null;
    const preOrg = aggregateGa4OrganicBySpec(preGa4Organic, spec);
    const postOrg = aggregateGa4OrganicBySpec(postGa4Organic, spec);

    return {
      routeKey: spec.routeKey,
      labelKo: spec.labelKo,
      upgradeSummaryKo: spec.upgradeSummaryKo,
      preClicks: preAgg.clicks,
      preImpressions: preAgg.impressions,
      preCtrPct,
      prePosition: prePos,
      postClicks: postAgg.clicks,
      postImpressions: postAgg.impressions,
      postCtrPct,
      postPosition: postPos,
      ctrComparison: computeGuardedComparison(
        preAgg.clicks,
        preAgg.impressions,
        postAgg.clicks,
        postAgg.impressions
      ),
      positionDelta:
        prePos !== null && postPos !== null
          ? parseFloat((postPos - prePos).toFixed(1))
          : null,
      preGa4OrganicSessions: preOrg,
      postGa4OrganicSessions: postOrg,
      deltaGa4OrganicSessions: postOrg - preOrg,
    };
  });

  const preQueryMap = aggregateGscQueriesByNormalizedKey(preGsc.queryRows);
  const postQueryMap = aggregateGscQueriesByNormalizedKey(postGsc.queryRows);

  let preZeroClickQueryCount = 0;
  let preZeroClickImpressions = 0;
  let preTotalQueryImpressions = 0;
  let convertedZeroClickQueryCount = 0;
  let stillZeroClickQueryCount = 0;
  let pendingPostImpressionZeroClickCount = 0;

  for (const [normKey, preQ] of preQueryMap.entries()) {
    preTotalQueryImpressions += preQ.impressions;
    if (preQ.impressions > 0 && preQ.clicks === 0) {
      preZeroClickQueryCount += 1;
      preZeroClickImpressions += preQ.impressions;

      const postQ = postQueryMap.get(normKey);
      if (!postQ || postQ.impressions === 0) {
        pendingPostImpressionZeroClickCount += 1;
      } else if (postQ.clicks > 0) {
        convertedZeroClickQueryCount += 1;
      } else {
        stillZeroClickQueryCount += 1;
      }
    }
  }

  let postZeroClickQueryCount = 0;
  let postZeroClickImpressions = 0;
  let postTotalQueryImpressions = 0;

  for (const postQ of postQueryMap.values()) {
    postTotalQueryImpressions += postQ.impressions;
    if (postQ.impressions > 0 && postQ.clicks === 0) {
      postZeroClickQueryCount += 1;
      postZeroClickImpressions += postQ.impressions;
    }
  }

  const canonicalLookup = new Map<string, { query: string; targetRoute: string }>();
  for (const item of TARGET_3F056525_ZERO_CLICK_QUERIES) {
    canonicalLookup.set(normalizeGscSearchQueryKey(item.query), item);
  }

  const selectedQueryKeys = new Set<string>(canonicalLookup.keys());
  const topDynamicPreZeroClicks = [...preQueryMap.entries()]
    .filter(([, q]) => q.impressions > 0 && q.clicks === 0)
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .slice(0, 15);
  for (const [normKey] of topDynamicPreZeroClicks) {
    selectedQueryKeys.add(normKey);
  }

  const topDynamicPostClicked = [...postQueryMap.entries()]
    .filter(([, q]) => q.clicks > 0)
    .sort((a, b) => b[1].clicks - a[1].clicks || b[1].impressions - a[1].impressions)
    .slice(0, 10);
  for (const [normKey] of topDynamicPostClicked) {
    selectedQueryKeys.add(normKey);
  }

  const byTargetAndTopZeroClickQueries: GscQueryCtrComparisonRow[] = [];
  for (const normKey of selectedQueryKeys) {
    const canonical = canonicalLookup.get(normKey);
    const preQ = preQueryMap.get(normKey);
    const postQ = postQueryMap.get(normKey);

    const preClicks = preQ?.clicks ?? 0;
    const preImpressions = preQ?.impressions ?? 0;
    const postClicks = postQ?.clicks ?? 0;
    const postImpressions = postQ?.impressions ?? 0;
    const prePos = preImpressions > 0 ? finalizePosition(preQ) : null;
    const postPos = postImpressions > 0 ? finalizePosition(postQ) : null;

    const displayQuery = canonical?.query ?? postQ?.displayKey ?? preQ?.displayKey ?? normKey;
    const preCtrPct = computeGuardedRatePct(preClicks, preImpressions);
    const postCtrPct = computeGuardedRatePct(postClicks, postImpressions);
    const resolvedDynamicRoute = canonical
      ? canonical.targetRoute
      : recommendDviewSeoAction(
          {
            query: displayQuery,
            clicks: postImpressions > 0 ? postClicks : preClicks,
            impressions: postImpressions > 0 ? postImpressions : preImpressions,
            ctr: (postImpressions > 0 ? postCtrPct : preCtrPct) ?? 0,
            position: (postImpressions > 0 ? postPos : prePos) ?? 0,
          },
          [...knownApartmentKeys]
        ).targetRoute;

    byTargetAndTopZeroClickQueries.push({
      query: displayQuery,
      targetRoute: resolvedDynamicRoute,
      isCanonicalTarget: Boolean(canonical),
      preClicks,
      preImpressions,
      preCtrPct,
      prePosition: prePos,
      postClicks,
      postImpressions,
      postCtrPct,
      postPosition: postPos,
      ctrComparison: computeGuardedComparison(
        preClicks,
        preImpressions,
        postClicks,
        postImpressions
      ),
      positionDelta:
        prePos !== null && postPos !== null
          ? parseFloat((postPos - prePos).toFixed(1))
          : null,
      resolutionState: determineZeroClickResolutionState(
        preClicks,
        preImpressions,
        postClicks,
        postImpressions
      ),
    });
  }

  byTargetAndTopZeroClickQueries.sort(
    (a, b) =>
      Number(b.isCanonicalTarget) - Number(a.isCanonicalTarget) ||
      b.postClicks - a.postClicks ||
      b.preImpressions - a.preImpressions ||
      a.query.localeCompare(b.query)
  );

  const sumOrganicSessions = (rows: ReadonlyArray<Ga4OrganicLandingRow>) =>
    rows.reduce((acc, r) => acc + Math.max(0, Math.round(Number(r.sessions) || 0)), 0);

  const ga4OrganicTotalSessionsPre = sumOrganicSessions(preGa4Organic);
  const ga4OrganicTotalSessionsPost = sumOrganicSessions(postGa4Organic);

  return {
    overallPropertyCtr,
    preAveragePosition,
    postAveragePosition,
    overallPositionDelta,
    preZeroClickQueryCount,
    postZeroClickQueryCount,
    zeroClickImpressionShare: computeGuardedComparison(
      preZeroClickImpressions,
      preTotalQueryImpressions,
      postZeroClickImpressions,
      postTotalQueryImpressions
    ),
    convertedZeroClickQueryCount,
    stillZeroClickQueryCount,
    pendingPostImpressionZeroClickCount,
    byTargetRoute,
    byTargetAndTopZeroClickQueries,
    ga4OrganicTotalSessionsPre,
    ga4OrganicTotalSessionsPost,
    ga4OrganicDeltaSessions: ga4OrganicTotalSessionsPost - ga4OrganicTotalSessionsPre,
    ga4OrganicSessionShare: computeGuardedComparison(
      ga4OrganicTotalSessionsPre,
      preSiteSessions,
      ga4OrganicTotalSessionsPost,
      postSiteSessions
    ),
  };
}

// ============================================================================
// Live API Orchestration (GA4 Data API v1beta + GSC Search Analytics v3)
// ============================================================================

export function createEmptyGa4WindowSnapshot(ok = true, errorMessage?: string): Ga4CohortWindowSnapshot {
  return {
    ok,
    errorMessage,
    activeUsers: 0,
    sessions: 0,
    screenPageViews: 0,
    totalEvents: 0,
    observedActiveDates: [],
    eventCountsByName: {},
    pageTrafficRows: [],
    apartmentViewRows: [],
    openCalculatorRows: [],
    openCalculatorByRawTriggerUsers: [],
    openCalculatorBySurfaceUsers: [],
    openCalculatorByTypeUsers: [],
    financeQuickInteractCount: 0,
    financeQuickInteractUsers: 0,
    organicLandingRows: [],
  };
}

export function createEmptyGscWindowSnapshot(
  ok = true,
  siteProperty?: string,
  errorCode?: string,
  errorMessage?: string
): GscWindowSnapshot {
  return {
    ok,
    siteProperty,
    errorCode,
    errorMessage,
    totalClicks: 0,
    totalImpressions: 0,
    averagePosition: null,
    finalizedDates: [],
    pageRows: [],
    queryRows: [],
  };
}

interface ResolvedGa4ServiceAccount {
  propertyId: string;
  clientEmail: string;
  privateKey: string;
}

function resolveGa4ServiceAccountCandidates(overrides?: {
  propertyId?: string;
  clientEmail?: string;
  privateKey?: string;
}): ResolvedGa4ServiceAccount[] {
  const propertyId = (
    overrides?.propertyId ||
    process.env.GA_PROPERTY_ID ||
    DEFAULT_DVIEW_GA4_PROPERTY_ID
  ).trim();

  const normalizeKey = (raw?: string) =>
    (raw || '').replace(/^"|"$/g, '').replace(/\\n/g, '\n').trim();

  if (overrides?.clientEmail && overrides?.privateKey) {
    return [
      {
        propertyId,
        clientEmail: overrides.clientEmail.trim(),
        privateKey: normalizeKey(overrides.privateKey),
      },
    ];
  }

  const candidates: ResolvedGa4ServiceAccount[] = [];
  const seenEmails = new Set<string>();
  const pushCandidate = (email?: string, key?: string) => {
    const cleanEmail = (email || '').trim();
    const cleanKey = normalizeKey(key);
    if (!cleanEmail || !cleanKey || seenEmails.has(cleanEmail)) return;
    seenEmails.add(cleanEmail);
    candidates.push({ propertyId, clientEmail: cleanEmail, privateKey: cleanKey });
  };

  pushCandidate(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    process.env.GOOGLE_PRIVATE_KEY
  );

  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY) as {
        client_email?: string;
        private_key?: string;
      };
      pushCandidate(parsed.client_email, parsed.private_key);
    } catch {
      try {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString(
          'utf-8'
        );
        const parsed = JSON.parse(decoded) as {
          client_email?: string;
          private_key?: string;
        };
        pushCandidate(parsed.client_email, parsed.private_key);
      } catch {
        // ignore malformed JSON/base64 env
      }
    }
  }

  try {
    const saPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(saPath)) {
      const parsed = JSON.parse(fs.readFileSync(saPath, 'utf-8')) as {
        client_email?: string;
        private_key?: string;
      };
      pushCandidate(parsed.client_email, parsed.private_key);
    }
  } catch {
    // ignore file fallback failure
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) as {
        client_email?: string;
        private_key?: string;
      };
      pushCandidate(parsed.client_email, parsed.private_key);
    } catch {
      // ignore
    }
  }

  pushCandidate(
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  );

  return candidates;
}

interface Ga4RunReportRpcRow {
  dimensionValues?: Array<{ value?: string | null }>;
  metricValues?: Array<{ value?: string | null }>;
}

interface Ga4RunReportRpcResponse {
  rows?: Ga4RunReportRpcRow[];
}

async function runGa4RestReport(options: {
  propertyId: string;
  accessToken: string;
  startDate: string;
  endDate: string;
  dimensions?: ReadonlyArray<string>;
  metrics: ReadonlyArray<string>;
  exactEventName?: string;
  limit?: number;
  fetchFn?: typeof fetch;
}): Promise<{ ok: boolean; status: number; rows: Ga4RunReportRpcRow[]; errorText?: string }> {
  const effectiveFetch: typeof fetch = options.fetchFn ?? ((...args) => fetch(...args));
  const body: Record<string, unknown> = {
    dateRanges: [{ startDate: options.startDate, endDate: options.endDate }],
    metrics: options.metrics.map((name) => ({ name })),
    limit: String(options.limit ?? 1000),
  };
  if (options.dimensions && options.dimensions.length > 0) {
    body.dimensions = options.dimensions.map((name) => ({ name }));
  }
  if (options.exactEventName) {
    body.dimensionFilter = {
      filter: {
        fieldName: 'eventName',
        stringFilter: {
          matchType: 'EXACT',
          value: options.exactEventName,
        },
      },
    };
  }

  const res = await effectiveFetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${options.propertyId}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    return { ok: false, status: res.status, rows: [], errorText };
  }

  const json = (await res.json()) as Ga4RunReportRpcResponse;
  return {
    ok: true,
    status: res.status,
    rows: Array.isArray(json.rows) ? json.rows : [],
  };
}

function readDim(row: Ga4RunReportRpcRow, idx: number, fallback = '(not set)'): string {
  const raw = row.dimensionValues?.[idx]?.value;
  if (raw === undefined || raw === null) return fallback;
  const trimmed = String(raw).trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function readIntMetric(row: Ga4RunReportRpcRow, idx: number): number {
  const raw = Number(row.metricValues?.[idx]?.value ?? 0);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
}

function isOrganicOrAiSearchSourceMedium(sourceMedium: string): boolean {
  const lower = (sourceMedium || '').toLowerCase();
  return (
    lower.includes('organic') ||
    lower.includes('search.naver') ||
    lower.includes('search.daum') ||
    lower.includes('chatgpt') ||
    lower.includes('perplexity')
  );
}

async function fetchLiveGa4WindowSnapshot(options: {
  propertyId: string;
  accessToken: string;
  startDate: string;
  endDate: string;
  fetchFn?: typeof fetch;
}): Promise<Ga4CohortWindowSnapshot> {
  const { propertyId, accessToken, startDate, endDate, fetchFn } = options;

  const formatRpcFailure = (label: string, res: { status: number; errorText?: string }) =>
    `GA4 runReport [${label}] failed (HTTP ${res.status}): ${(res.errorText || '').slice(0, 240)}`;

  // Execute in 2 sequential batches of <= 5 requests so property-level concurrentRequests
  // stays strictly within GA4 Data API v1beta's 10-concurrent-RPC quota.
  const [overviewRes, dailyRes, pagesRes, eventsRes, organicRes] = await Promise.all([
    runGa4RestReport({
      propertyId,
      accessToken,
      startDate,
      endDate,
      metrics: ['activeUsers', 'sessions', 'screenPageViews', 'eventCount'],
      limit: 10,
      fetchFn,
    }),
    runGa4RestReport({
      propertyId,
      accessToken,
      startDate,
      endDate,
      dimensions: ['date'],
      metrics: ['activeUsers', 'sessions', 'screenPageViews'],
      limit: 60,
      fetchFn,
    }),
    runGa4RestReport({
      propertyId,
      accessToken,
      startDate,
      endDate,
      dimensions: ['pagePath'],
      metrics: ['screenPageViews', 'sessions', 'activeUsers'],
      limit: 1000,
      fetchFn,
    }),
    runGa4RestReport({
      propertyId,
      accessToken,
      startDate,
      endDate,
      dimensions: ['eventName'],
      metrics: ['eventCount', 'totalUsers'],
      limit: 250,
      fetchFn,
    }),
    runGa4RestReport({
      propertyId,
      accessToken,
      startDate,
      endDate,
      dimensions: ['sessionSourceMedium', 'pagePath'],
      metrics: ['sessions', 'activeUsers', 'screenPageViews'],
      limit: 500,
      fetchFn,
    }),
  ]);

  // Strict Real Data Only: never swallow HTTP 429 / 401 / 403 / 5xx on any standard sub-report,
  // which would otherwise fabricate 0 conversions or 0 organic sessions against a non-zero session count.
  const coreSubReports: ReadonlyArray<[string, { ok: boolean; status: number; errorText?: string }]> = [
    ['overview', overviewRes],
    ['daily', dailyRes],
    ['pages', pagesRes],
    ['events', eventsRes],
    ['organic', organicRes],
  ];
  for (const [label, res] of coreSubReports) {
    if (!res.ok) {
      return createEmptyGa4WindowSnapshot(false, formatRpcFailure(label, res));
    }
  }

  const [aptViewRes, openMultiRes, openByTriggerRes, openBySurfaceRes, openByTypeRes] =
    await Promise.all([
      runGa4RestReport({
        propertyId,
        accessToken,
        startDate,
        endDate,
        dimensions: ['customEvent:surface', 'customEvent:view_type'],
        metrics: ['eventCount', 'totalUsers'],
        exactEventName: 'apartment_view',
        limit: 250,
        fetchFn,
      }),
      runGa4RestReport({
        propertyId,
        accessToken,
        startDate,
        endDate,
        dimensions: [
          'customEvent:trigger',
          'customEvent:surface',
          'customEvent:calculator_type',
          'pagePath',
        ],
        metrics: ['eventCount', 'totalUsers'],
        exactEventName: 'open_calculator',
        limit: 1000,
        fetchFn,
      }),
      runGa4RestReport({
        propertyId,
        accessToken,
        startDate,
        endDate,
        dimensions: ['customEvent:trigger'],
        metrics: ['eventCount', 'totalUsers'],
        exactEventName: 'open_calculator',
        limit: 500,
        fetchFn,
      }),
      runGa4RestReport({
        propertyId,
        accessToken,
        startDate,
        endDate,
        dimensions: ['customEvent:surface'],
        metrics: ['eventCount', 'totalUsers'],
        exactEventName: 'open_calculator',
        limit: 500,
        fetchFn,
      }),
      runGa4RestReport({
        propertyId,
        accessToken,
        startDate,
        endDate,
        dimensions: ['customEvent:calculator_type'],
        metrics: ['eventCount', 'totalUsers'],
        exactEventName: 'open_calculator',
        limit: 500,
        fetchFn,
      }),
    ]);

  // HTTP 400 on customEvent:* queries means unregistered custom dimension -> graceful fallback.
  // Any non-400 failure (HTTP 429 RESOURCE_EXHAUSTED, 401, 403, 5xx) MUST abort the snapshot.
  const customSubReports: ReadonlyArray<[string, { ok: boolean; status: number; errorText?: string }]> = [
    ['apartment_view', aptViewRes],
    ['open_calculator_multi', openMultiRes],
    ['open_calculator_trigger', openByTriggerRes],
    ['open_calculator_surface', openBySurfaceRes],
    ['open_calculator_type', openByTypeRes],
  ];
  for (const [label, res] of customSubReports) {
    if (!res.ok && res.status !== 400) {
      return createEmptyGa4WindowSnapshot(false, formatRpcFailure(label, res));
    }
  }

  const ovRow = overviewRes.rows[0];
  const activeUsers = ovRow ? readIntMetric(ovRow, 0) : 0;
  const sessions = ovRow ? readIntMetric(ovRow, 1) : 0;
  const screenPageViews = ovRow ? readIntMetric(ovRow, 2) : 0;
  const totalEvents = ovRow ? readIntMetric(ovRow, 3) : 0;

  const observedActiveDates: string[] = [];
  for (const r of dailyRes.rows) {
    const iso = normalizeGa4CompactDate(readDim(r, 0, ''));
    const dayUsers = readIntMetric(r, 0);
    const daySess = readIntMetric(r, 1);
    const dayPv = readIntMetric(r, 2);
    if (iso && (dayUsers > 0 || daySess > 0 || dayPv > 0)) {
      observedActiveDates.push(iso);
    }
  }
  observedActiveDates.sort();

  const pageTrafficRows: Ga4PageTrafficRow[] = pagesRes.rows.map((r) => ({
    pagePath: readDim(r, 0, '/'),
    screenPageViews: readIntMetric(r, 0),
    sessions: readIntMetric(r, 1),
    activeUsers: readIntMetric(r, 2),
  }));

  const eventCountsByName: Record<string, { eventCount: number; totalUsers: number }> = {};
  for (const r of eventsRes.rows) {
    const evName = readDim(r, 0, '');
    if (!evName) continue;
    eventCountsByName[evName] = {
      eventCount: readIntMetric(r, 0),
      totalUsers: readIntMetric(r, 1),
    };
  }

  let customDimensionFallbackUsed = customSubReports.some(([, res]) => !res.ok && res.status === 400);

  const apartmentViewRows: Ga4ApartmentViewSurfaceRow[] = aptViewRes.ok
    ? aptViewRes.rows.map((r) => ({
        surface: readDim(r, 0),
        viewType: readDim(r, 1),
        eventCount: readIntMetric(r, 0),
        totalUsers: readIntMetric(r, 1),
      }))
    : [];

  let openCalculatorRows: Ga4OpenCalculatorRow[] = [];

  if (openMultiRes.ok) {
    openCalculatorRows = openMultiRes.rows.map((r) => ({
      trigger: readDim(r, 0),
      surface: readDim(r, 1),
      calculatorType: readDim(r, 2),
      pagePath: readDim(r, 3, '/'),
      eventCount: readIntMetric(r, 0),
      totalUsers: readIntMetric(r, 1),
    }));
  } else if (openMultiRes.status === 400) {
    customDimensionFallbackUsed = true;
    const pageOnlyFallback = await runGa4RestReport({
      propertyId,
      accessToken,
      startDate,
      endDate,
      dimensions: ['pagePath'],
      metrics: ['eventCount', 'totalUsers'],
      exactEventName: 'open_calculator',
      limit: 500,
      fetchFn,
    });
    if (!pageOnlyFallback.ok) {
      return createEmptyGa4WindowSnapshot(
        false,
        formatRpcFailure('open_calculator_page_fallback', pageOnlyFallback)
      );
    }
    openCalculatorRows = pageOnlyFallback.rows.map((r) => ({
      trigger: '(not set)',
      surface: '(not set)',
      calculatorType: '(not set)',
      pagePath: readDim(r, 0, '/'),
      eventCount: readIntMetric(r, 0),
      totalUsers: readIntMetric(r, 1),
    }));
  }

  const mapDimBuckets = (res: { ok: boolean; rows: Ga4RunReportRpcRow[] }): Ga4DimensionUserBucket[] =>
    res.ok
      ? res.rows.map((r) => ({
          key: readDim(r, 0),
          eventCount: readIntMetric(r, 0),
          totalUsers: readIntMetric(r, 1),
        }))
      : [];

  const organicLandingRows: Ga4OrganicLandingRow[] = organicRes.rows
    .filter((r) => isOrganicOrAiSearchSourceMedium(readDim(r, 0, '')))
    .map((r) => ({
      sourceMedium: readDim(r, 0, ''),
      pagePath: readDim(r, 1, '/'),
      sessions: readIntMetric(r, 0),
      activeUsers: readIntMetric(r, 1),
      screenPageViews: readIntMetric(r, 2),
    }));

  return {
    ok: true,
    customDimensionFallbackUsed,
    activeUsers,
    sessions,
    screenPageViews,
    totalEvents,
    observedActiveDates,
    eventCountsByName,
    pageTrafficRows,
    apartmentViewRows,
    openCalculatorRows,
    openCalculatorByRawTriggerUsers: mapDimBuckets(openByTriggerRes),
    openCalculatorBySurfaceUsers: mapDimBuckets(openBySurfaceRes),
    openCalculatorByTypeUsers: mapDimBuckets(openByTypeRes),
    financeQuickInteractCount: eventCountsByName['finance_quick_interact']?.eventCount ?? 0,
    financeQuickInteractUsers: eventCountsByName['finance_quick_interact']?.totalUsers ?? 0,
    organicLandingRows,
  };
}

async function fetchLiveGscWindowSnapshot(options: {
  startDate: string;
  endDate: string;
  siteProperty?: string;
  fetchFn?: typeof fetch;
}): Promise<GscWindowSnapshot> {
  const { startDate, endDate, siteProperty, fetchFn } = options;

  const summaryRes: GscAnalyticsFetchResult = await fetchSearchConsoleAnalyticsRows({
    startDate,
    endDate,
    dimensions: [],
    siteProperty,
    fetchFn,
  });

  if (!summaryRes.ok) {
    return {
      ok: false,
      siteProperty: summaryRes.siteProperty ?? siteProperty,
      serviceAccountEmail: summaryRes.serviceAccountEmail,
      errorCode: summaryRes.errorCode,
      errorMessage: summaryRes.message,
      activationUrl: summaryRes.activationUrl,
      totalClicks: 0,
      totalImpressions: 0,
      averagePosition: null,
      finalizedDates: [],
      pageRows: [],
      queryRows: [],
    };
  }

  const resolvedSiteProperty = summaryRes.siteProperty ?? siteProperty;

  const [dateRes, pageRes, queryRes] = await Promise.all([
    fetchSearchConsoleAnalyticsRows({
      startDate,
      endDate,
      dimensions: ['date'],
      rowLimit: 100,
      siteProperty: resolvedSiteProperty,
      fetchFn,
    }),
    fetchSearchConsoleAnalyticsRows({
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: 5000,
      siteProperty: resolvedSiteProperty,
      fetchFn,
    }),
    fetchSearchConsoleAnalyticsRows({
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: 5000,
      siteProperty: resolvedSiteProperty,
      fetchFn,
    }),
  ]);

  // Never swallow partial GSC sub-query failures (HTTP 429 / 5xx) as fake 0-click route data.
  const failedSub = [dateRes, pageRes, queryRes].find((r) => !r.ok);
  if (failedSub) {
    return {
      ok: false,
      siteProperty: resolvedSiteProperty,
      serviceAccountEmail: failedSub.serviceAccountEmail ?? summaryRes.serviceAccountEmail,
      errorCode: failedSub.errorCode,
      errorMessage: failedSub.message,
      activationUrl: failedSub.activationUrl ?? summaryRes.activationUrl,
      totalClicks: 0,
      totalImpressions: 0,
      averagePosition: null,
      finalizedDates: [],
      pageRows: [],
      queryRows: [],
    };
  }

  const summaryRow = summaryRes.rows[0];
  const totalClicks = summaryRow?.clicks ?? 0;
  const totalImpressions = summaryRow?.impressions ?? 0;
  const averagePosition =
    summaryRow && totalImpressions > 0 ? summaryRow.position : null;

  const finalizedDates = dateRes.rows
    .map((r) => r.keys[0] ?? '')
    .filter((d) => isValidIsoCalendarDate(d))
    .sort();

  return {
    ok: true,
    siteProperty: resolvedSiteProperty,
    serviceAccountEmail: summaryRes.serviceAccountEmail,
    totalClicks,
    totalImpressions,
    averagePosition,
    finalizedDates,
    pageRows: pageRes.rows,
    queryRows: queryRes.rows,
  };
}

export interface AnalyzeReleaseCohortOptions {
  preWindow?: CohortDateWindow;
  postWindow?: CohortDateWindow;
  asOfKstDate?: string;
  propertyId?: string;
  clientEmail?: string;
  privateKey?: string;
  siteProperty?: string;
  fetchFn?: typeof fetch;
  getAccessTokenFn?: (
    clientEmail: string,
    privateKey: string,
    scope: string,
    fetchFn?: typeof fetch
  ) => Promise<string>;
}

export async function analyzeLiveReleaseCohortComparison(
  options: AnalyzeReleaseCohortOptions = {}
): Promise<ReleaseCohortComparisonReport> {
  const preWindow = CohortDateWindowSchema.parse(
    options.preWindow ?? DEFAULT_3F056525_PRE_WINDOW
  );
  const postWindow = CohortDateWindowSchema.parse(
    options.postWindow ?? DEFAULT_3F056525_POST_WINDOW
  );

  const asOfKstDate = options.asOfKstDate
    ? options.asOfKstDate.trim()
    : formatKstIsoDate();
  if (!isValidIsoCalendarDate(asOfKstDate)) {
    throw new Error(`Invalid asOfKstDate: ${asOfKstDate}. Expected valid YYYY-MM-DD.`);
  }

  const initialPreMaturity = evaluateCohortWindowMaturity({
    window: preWindow,
    asOfKstDate,
  });
  const initialPostMaturity = evaluateCohortWindowMaturity({
    window: postWindow,
    asOfKstDate,
  });

  // 1. Live GA4 Collection (multi-credential fallback + sequential pre -> post to respect 10-RPC concurrency limit)
  const ga4CredCandidates = resolveGa4ServiceAccountCandidates({
    propertyId: options.propertyId,
    clientEmail: options.clientEmail,
    privateKey: options.privateKey,
  });

  const resolvedPropertyId =
    ga4CredCandidates[0]?.propertyId ||
    options.propertyId ||
    process.env.GA_PROPERTY_ID ||
    DEFAULT_DVIEW_GA4_PROPERTY_ID;

  let preGa4Snapshot: Ga4CohortWindowSnapshot = createEmptyGa4WindowSnapshot(
    false,
    'GA4 서비스 계정 인증정보가 설정되지 않았습니다 (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).'
  );
  let postGa4Snapshot: Ga4CohortWindowSnapshot = createEmptyGa4WindowSnapshot(
    false,
    'GA4 서비스 계정 인증정보가 설정되지 않았습니다 (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).'
  );

  if (ga4CredCandidates.length > 0) {
    const tokenFn = options.getAccessTokenFn ?? mintGoogleServiceAccountToken;
    for (let idx = 0; idx < ga4CredCandidates.length; idx++) {
      const ga4Creds = ga4CredCandidates[idx];
      try {
        const ga4Token = await tokenFn(
          ga4Creds.clientEmail,
          ga4Creds.privateKey,
          GA4_READONLY_SCOPE,
          options.fetchFn
        );

        const preRes = initialPreMaturity.effectiveQueryEndDate
          ? await fetchLiveGa4WindowSnapshot({
              propertyId: ga4Creds.propertyId,
              accessToken: ga4Token,
              startDate: preWindow.startDate,
              endDate: initialPreMaturity.effectiveQueryEndDate,
              fetchFn: options.fetchFn,
            })
          : createEmptyGa4WindowSnapshot(true);

        const isAuthOrPermFailure =
          !preRes.ok && /HTTP (?:401|403)/.test(preRes.errorMessage || '');
        if (isAuthOrPermFailure && idx < ga4CredCandidates.length - 1) {
          preGa4Snapshot = preRes;
          postGa4Snapshot = createEmptyGa4WindowSnapshot(false, preRes.errorMessage);
          continue;
        }

        const postRes = initialPostMaturity.effectiveQueryEndDate
          ? await fetchLiveGa4WindowSnapshot({
              propertyId: ga4Creds.propertyId,
              accessToken: ga4Token,
              startDate: postWindow.startDate,
              endDate: initialPostMaturity.effectiveQueryEndDate,
              fetchFn: options.fetchFn,
            })
          : createEmptyGa4WindowSnapshot(true);

        preGa4Snapshot = preRes;
        postGa4Snapshot = postRes;
        break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        preGa4Snapshot = createEmptyGa4WindowSnapshot(false, msg);
        postGa4Snapshot = createEmptyGa4WindowSnapshot(false, msg);
      }
    }
  }

  // 2. Live GSC Collection (preWindow first so verified active siteProperty is locked for postWindow)
  const preGscSnapshot = initialPreMaturity.effectiveQueryEndDate
    ? await fetchLiveGscWindowSnapshot({
        startDate: preWindow.startDate,
        endDate: initialPreMaturity.effectiveQueryEndDate,
        siteProperty: options.siteProperty,
        fetchFn: options.fetchFn,
      })
    : createEmptyGscWindowSnapshot(true, options.siteProperty);

  const lockedSiteProperty = preGscSnapshot.siteProperty ?? options.siteProperty;

  const [postGscSnapshot, lookbackDatesRes] = await Promise.all([
    initialPostMaturity.effectiveQueryEndDate
      ? fetchLiveGscWindowSnapshot({
          startDate: postWindow.startDate,
          endDate: initialPostMaturity.effectiveQueryEndDate,
          siteProperty: lockedSiteProperty,
          fetchFn: options.fetchFn,
        })
      : Promise.resolve(createEmptyGscWindowSnapshot(true, lockedSiteProperty)),
    fetchSearchConsoleAnalyticsRows({
      startDate: shiftIsoCalendarDate(asOfKstDate, -14),
      endDate: asOfKstDate,
      dimensions: ['date'],
      rowLimit: 30,
      siteProperty: lockedSiteProperty,
      fetchFn: options.fetchFn,
    }),
  ]);

  const allObservedGscDates = [
    ...preGscSnapshot.finalizedDates,
    ...postGscSnapshot.finalizedDates,
    ...(lookbackDatesRes.ok
      ? lookbackDatesRes.rows
          .map((r) => r.keys[0] ?? '')
          .filter((d) => isValidIsoCalendarDate(d))
      : []),
  ].sort();

  const gscLatestAvailableDate =
    allObservedGscDates.length > 0
      ? allObservedGscDates[allObservedGscDates.length - 1]
      : null;

  const preMaturity = evaluateCohortWindowMaturity({
    window: preWindow,
    asOfKstDate,
    ga4ObservedDates: preGa4Snapshot.observedActiveDates,
    gscFinalizedDatesInWindow: preGscSnapshot.finalizedDates,
    gscLatestAvailableDate,
  });

  const postMaturity = evaluateCohortWindowMaturity({
    window: postWindow,
    asOfKstDate,
    ga4ObservedDates: postGa4Snapshot.observedActiveDates,
    gscFinalizedDatesInWindow: postGscSnapshot.finalizedDates,
    gscLatestAvailableDate,
  });

  const loadDefaultApartmentKeys = (): string[] => {
    try {
      const summaryPath = path.resolve(process.cwd(), 'public/data/tx-summary.json');
      if (!fs.existsSync(summaryPath)) return [];
      const raw = JSON.parse(fs.readFileSync(summaryPath, 'utf-8')) as Record<string, unknown>;
      const summaryObj =
        raw && typeof raw.summary === 'object' && raw.summary !== null
          ? (raw.summary as Record<string, unknown>)
          : raw;
      return Object.keys(summaryObj || {});
    } catch {
      return [];
    }
  };

  const calculatorFunnel = compareGa4OpenCalculatorFunnel(preGa4Snapshot, postGa4Snapshot);
  const gscCtrLift = compareGscCtrLift(
    preGscSnapshot,
    postGscSnapshot,
    preGa4Snapshot.organicLandingRows,
    postGa4Snapshot.organicLandingRows,
    loadDefaultApartmentKeys(),
    calculatorFunnel.preDenominators.siteSessions,
    calculatorFunnel.postDenominators.siteSessions
  );

  return {
    commitHash: RELEASE_3F056525_COMMIT,
    deployedAtKst: RELEASE_3F056525_DEPLOYED_AT_KST,
    generatedAtIso: new Date().toISOString(),
    asOfKstDate,
    propertyId: resolvedPropertyId,
    gscSiteProperty: postGscSnapshot.siteProperty ?? preGscSnapshot.siteProperty ?? null,
    preMaturity,
    postMaturity,
    ga4Status: {
      preOk: preGa4Snapshot.ok,
      postOk: postGa4Snapshot.ok,
      preError: preGa4Snapshot.errorMessage,
      postError: postGa4Snapshot.errorMessage,
      customDimensionFallbackUsed: Boolean(
        preGa4Snapshot.customDimensionFallbackUsed || postGa4Snapshot.customDimensionFallbackUsed
      ),
    },
    gscStatus: {
      preOk: preGscSnapshot.ok,
      postOk: postGscSnapshot.ok,
      preError: preGscSnapshot.errorMessage,
      postError: postGscSnapshot.errorMessage,
      activationUrl: preGscSnapshot.activationUrl ?? postGscSnapshot.activationUrl,
    },
    calculatorFunnel,
    gscCtrLift,
  };
}
