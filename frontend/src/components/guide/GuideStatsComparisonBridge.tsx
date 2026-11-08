'use client';

import React, { useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Scale,
  ArrowRight,
  TrendingUp,
  Building2,
  GraduationCap,
  Waves,
  Calendar,
} from 'lucide-react';
import { getDongtan1Vs2ComparisonData } from '@/lib/stats/dongtan1Vs2ComparisonEngine';
import {
  getSchoolDistrictPremiumData,
  getLakeParkPremiumData,
  getBuildingAgeDepreciationData,
} from '@/lib/stats/thematicPriceComparisonEngine';
import { trackEvent, trackVirtualPageView } from '@/lib/utils/analytics';

export interface GuideStatsComparisonBridgeProps {
  guideSlug: string;
  guideTitle: string;
  placement?: string;
  compact?: boolean;
}

export function GuideStatsComparisonBridge({
  guideSlug,
  guideTitle,
  placement = 'guide_article',
  compact = false,
}: GuideStatsComparisonBridgeProps) {
  const comparison = useMemo(() => getDongtan1Vs2ComparisonData('all'), []);
  const schoolData = useMemo(() => getSchoolDistrictPremiumData('all'), []);
  const lakeData = useMemo(() => getLakeParkPremiumData('all'), []);
  const ageData = useMemo(() => getBuildingAgeDepreciationData('all'), []);
  const { dongtan1, dongtan2, delta } = comparison;

  const isDongtan1Vs2Article = guideSlug === 'dongtan-1-vs-2-comparison';

  const handleStatsClick = useCallback(
    (targetTopic: string, ctaLabel: string) => {
      const targetUrl =
        targetTopic === 'dongtan-station-distance'
          ? '/stats?topic=dongtan-station-distance'
          : `/stats?topic=${targetTopic}#${targetTopic}`;

      trackEvent('guide_to_stats_bridge_click', {
        event_category: 'bidirectional_recirculation',
        from_guide_slug: guideSlug,
        from_guide_title: guideTitle,
        to_stats_topic: targetTopic,
        placement,
        cta_label: ctaLabel,
      });
      trackVirtualPageView(targetUrl, {
        page_title: `아파트 통계 (${ctaLabel})`,
        from_guide_slug: guideSlug,
      });
    },
    [guideSlug, guideTitle, placement]
  );

  return (
    <section
      id="guide-to-stats-comparison-bridge"
      data-testid="guide-to-stats-comparison-bridge"
      aria-label="동탄1 vs 동탄2 실시간 집값 통계 비교 대시보드 연동"
      className="w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-blue-500/25 dark:border-blue-500/30 p-4 sm:p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-blue-600 text-white">
              <Scale className="w-3.5 h-3.5" />
              <span>비교글 × 아파트 통계 양방향 연동</span>
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 tabular-nums">
              국토부 127개 단지 실거래 전수 집계
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-primary tracking-tight">
            {isDongtan1Vs2Article
              ? '동탄1 vs 동탄2, 실제 집값은 얼마일까? 실시간 통계 대시보드'
              : '동탄1신도시 vs 동탄2신도시 집값·평당가 실시간 비교 통계'}
          </h3>
          <p className="text-xs text-secondary font-medium leading-relaxed">
            글로 읽은 입지 차이가 실제 매매가와 평당가에 어떻게 반영되어 있는지 아파트 통계 탭에서 평형별·예산대별로 직접 비교해 보세요.
          </p>
        </div>

        <Link
          href="/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison"
          data-testid="guide-to-stats-primary-cta"
          onClick={() =>
            handleStatsClick('dongtan-1-vs-2-comparison', '동탄1 vs 동탄2 집값 통계 비교 보러가기')
          }
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-[13px] font-extrabold transition-colors shadow-xs"
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span>동탄1 vs 동탄2 집값 통계 비교 보러가기</span>
          <ArrowRight className="w-4 h-4 shrink-0" />
        </Link>
      </div>

      {/* Live House Price Snapshot Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Dongtan 1 Snapshot */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#202027] border border-emerald-500/20 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <span className="inline-flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              동탄1신도시 ({dongtan1.complexCount}단지)
            </span>
            <span>반송·석우·능동</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 my-0.5">
            <span className="text-xs font-bold text-tertiary">1년 평균 집값</span>
            <span
              data-testid="bridge-dongtan1-avg-price"
              className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums"
            >
              {dongtan1.weightedAvgPriceEokText}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-secondary tabular-nums pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>평당 {dongtan1.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원</span>
            <span>
              최고 {dongtan1.maxPriceComplexName} ({dongtan1.maxLatestPriceEokText})
            </span>
          </div>
        </div>

        {/* Dongtan 2 Snapshot */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#202027] border border-blue-500/20 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-300">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              동탄2신도시 ({dongtan2.complexCount}단지)
            </span>
            <span>청계·여울·송동 등 8개동</span>
          </div>
          <div className="flex items-baseline justify-between gap-2 my-0.5">
            <span className="text-xs font-bold text-tertiary">1년 평균 집값</span>
            <span
              data-testid="bridge-dongtan2-avg-price"
              className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 tabular-nums"
            >
              {dongtan2.weightedAvgPriceEokText}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-secondary tabular-nums pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>평당 {dongtan2.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원</span>
            <span>
              최고 {dongtan2.maxPriceComplexName} ({dongtan2.maxLatestPriceEokText})
            </span>
          </div>
        </div>

        {/* Price Gap & Quick Action */}
        <div className="p-3.5 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-secondary">
            <span>동탄2 vs 동탄1 평균 집값 격차</span>
            <span className="text-blue-600 dark:text-blue-400 tabular-nums">
              {delta.weightedPricePremiumPercent >= 0 ? '+' : ''}
              {delta.weightedPricePremiumPercent}%
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-2 my-0.5">
            <span className="text-xs font-bold text-tertiary">매매가·평당가 차이</span>
            <span
              data-testid="bridge-price-gap"
              className="text-lg sm:text-xl font-black text-primary tabular-nums"
            >
              {delta.weightedPriceDiffEokText}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-secondary tabular-nums pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <span>
              평당 {delta.pyeongPriceDiffManwon >= 0 ? '+' : ''}
              {delta.pyeongPriceDiffManwon.toLocaleString('ko-KR')}만원 격차
            </span>
            <Link
              href="/stats?topic=dongtan-station-distance"
              onClick={() =>
                handleStatsClick('dongtan-station-distance', '동탄역 거리별 회귀분석 보기')
              }
              className="font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
            >
              <span>역세권 통계</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Thematic House Price Comparison Quick Switch Bar (Issue #2, #3, #4) */}
      <div
        data-testid="guide-to-stats-thematic-links"
        className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1"
      >
        <Link
          href="/stats?topic=school-district-premium#school-district-premium"
          onClick={() =>
            handleStatsClick('school-district-premium', '초품아·학원가 집값 격차 리포트')
          }
          className="group p-3 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 transition-colors flex items-center justify-between gap-2"
        >
          <div className="space-y-0.5 min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
              <GraduationCap className="w-3.5 h-3.5 shrink-0" />
              Issue #2 · 초품아·학원가 집값 비교
            </span>
            <p className="text-xs font-bold text-primary truncate tabular-nums">
              학원 밀집권 {schoolData.academyPrimeGroup.weightedAvgPriceEokText} ({schoolData.delta.academyPriceDiffEokText})
            </p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-tertiary group-hover:text-blue-600 shrink-0" />
        </Link>

        <Link
          href="/stats?topic=lake-park-view-premium#lake-park-view-premium"
          onClick={() =>
            handleStatsClick('lake-park-view-premium', '동탄호수공원 조망권 집값 격차 리포트')
          }
          className="group p-3 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/40 transition-colors flex items-center justify-between gap-2"
        >
          <div className="space-y-0.5 min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
              <Waves className="w-3.5 h-3.5 shrink-0" />
              Issue #3 · 호수공원 수변 집값 비교
            </span>
            <p className="text-xs font-bold text-primary truncate tabular-nums">
              수변권 {lakeData.waterfrontGroup.weightedAvgPriceEokText} ({lakeData.delta.waterfrontVsHinterlandPriceDiffEokText})
            </p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-tertiary group-hover:text-emerald-600 shrink-0" />
        </Link>

        <Link
          href="/stats?topic=building-age-depreciation#building-age-depreciation"
          onClick={() =>
            handleStatsClick('building-age-depreciation', '연식별 감가상각·방어율 비교 리포트')
          }
          className="group p-3 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/40 transition-colors flex items-center justify-between gap-2"
        >
          <div className="space-y-0.5 min-w-0">
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              Issue #4 · 신축 vs 구축 연식별 비교
            </span>
            <p className="text-xs font-bold text-primary truncate tabular-nums">
              신축 {ageData.newBuildGroup.weightedAvgPriceEokText} vs 구축 {ageData.oldBuildGroup.weightedAvgPriceEokText}
            </p>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-tertiary group-hover:text-blue-600 shrink-0" />
        </Link>
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-tertiary font-medium">
            아파트 통계 탭에서 초품아·호수공원·연식별·동탄1 vs 동탄2 평형별 집값과 단지를 즉시 비교할 수 있습니다.
          </span>
          <Link
            href="/stats?topic=dongtan-1-vs-2-comparison#dongtan-1-vs-2-comparison"
            onClick={() =>
              handleStatsClick('dongtan-1-vs-2-comparison', '평형별·예산대별 집값 비교표 열기')
            }
            className="font-extrabold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <span>평형별·예산대별 집값 비교표 열기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </section>
  );
}
