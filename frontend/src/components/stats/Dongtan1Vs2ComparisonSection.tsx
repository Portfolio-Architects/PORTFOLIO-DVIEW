'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Scale,
  Building2,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Trophy,
  MapPin,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  getDongtan1Vs2ComparisonData,
  type Dongtan1Vs2ComparisonPayload,
} from '@/lib/stats/dongtan1Vs2ComparisonEngine';
import type { AreaBandFilter } from '@/lib/stats/types';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';
import { trackEvent, trackVirtualPageView } from '@/lib/utils/analytics';

export interface Dongtan1Vs2ComparisonSectionProps {
  initialData?: Dongtan1Vs2ComparisonPayload;
  initialAreaBand?: AreaBandFilter;
  onSelectComplex?: (canonicalSlug: string, complexName: string, dong: string) => void;
  onFilterRegionInTable?: (region: '동탄1' | '동탄2', areaBand?: AreaBandFilter) => void;
}

const AREA_BAND_OPTIONS: ReadonlyArray<{ value: AreaBandFilter; label: string }> = [
  { value: 'all', label: '전 평형 통합' },
  { value: 'small', label: '20평대 소형 (60㎡ 미만)' },
  { value: 'medium', label: '30평대 중형 (60~85㎡)' },
  { value: 'large', label: '40평대+ 대형 (85㎡ 초과)' },
];

export function Dongtan1Vs2ComparisonSection({
  initialData,
  initialAreaBand = 'all',
  onSelectComplex,
  onFilterRegionInTable,
}: Dongtan1Vs2ComparisonSectionProps) {
  const [areaBand, setAreaBand] = useState<AreaBandFilter>(initialAreaBand);

  const data = useMemo(() => {
    if (initialData && initialData.areaBand === areaBand) {
      return initialData;
    }
    return getDongtan1Vs2ComparisonData(areaBand);
  }, [areaBand, initialData]);

  const { dongtan1, dongtan2, delta, priceBrackets, dongRankings, rivalMatchups, comparisonGuides } =
    data;
  const hasBothRegions = dongtan1.complexCount > 0 && dongtan2.complexCount > 0;

  const handleAreaBandChange = useCallback((nextBand: AreaBandFilter) => {
    setAreaBand(nextBand);
    trackEvent('stats_vs_area_filter_change', {
      event_category: 'stats_comparison',
      area_band: nextBand,
    });
  }, []);

  const handleComplexClick = useCallback(
    (slug: string, name: string, dong: string, sourceSection: string) => {
      trackEvent('stats_vs_complex_click', {
        event_category: 'stats_comparison',
        apartment_name: name,
        dong,
        canonical_slug: slug,
        source_section: sourceSection,
      });
      trackVirtualPageView(`/apartment/${encodeURIComponent(slug)}`, {
        page_title: `${name} 실거래 상세 (동탄1 vs 동탄2 비교)`,
        source_section: sourceSection,
      });
      if (onSelectComplex) {
        onSelectComplex(slug, name, dong);
      }
    },
    [onSelectComplex]
  );

  const handleGuideBridgeClick = useCallback((slug: string, title: string, placement: string) => {
    trackEvent('stats_to_guide_bridge_click', {
      event_category: 'bidirectional_recirculation',
      from_surface: 'stats_dongtan_1_vs_2',
      to_guide_slug: slug,
      guide_title: title,
      placement,
    });
    trackVirtualPageView(`/guide/${slug}`, { page_title: title, placement });
  }, []);

  const primaryGuide =
    comparisonGuides.find((g) => g.isPrimaryComparison) || comparisonGuides[0];
  const secondaryGuides = comparisonGuides.filter((g) => g.slug !== primaryGuide?.slug);

  return (
    <section
      id="dongtan-1-vs-2-comparison"
      data-testid="dongtan-1-vs-2-comparison-section"
      aria-label="동탄1신도시 vs 동탄2신도시 집값 비교 분석"
      className="w-full flex flex-col gap-5"
    >
      {/* 1. Top Comparison Hero & Area Band Controls */}
      <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800/80">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white">
                <Scale className="w-3.5 h-3.5" />
                동탄 1 vs 동탄 2 집값 비교
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 tabular-nums">
                국토부 100% 실거래 · 동탄1({dongtan1.complexCount}단지) vs 동탄2({dongtan2.complexCount}단지)
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-primary tracking-tight">
              {delta.headlineQuestion}
            </h2>
            <p className="text-xs sm:text-sm text-secondary font-medium leading-relaxed max-w-3xl">
              {delta.headlineAnswer}
            </p>
          </div>

          {/* Primary Bidirectional Link to Comparison Guide */}
          {primaryGuide && (
            <Link
              href={`/guide/${primaryGuide.slug}`} prefetch={false}
              data-testid="stats-to-guide-hero-cta"
              onClick={() =>
                handleGuideBridgeClick(primaryGuide.slug, primaryGuide.title, 'hero_top_cta')
              }
              className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold transition-colors shadow-sm"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              <span>동탄1 vs 동탄2 비교 분석글 전문 보기</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          )}
        </div>

        {/* Area Band Filter Bar */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>평형대 기준 집값 비교</span>
          </div>
          <div
            role="group"
            aria-label="동탄1 vs 동탄2 평형대 필터"
            className={getToggleTrackClass('flex flex-wrap gap-1')}
          >
            {AREA_BAND_OPTIONS.map((opt) => {
              const isActive = areaBand === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`vs-area-filter-${opt.value}`}
                  aria-pressed={isActive}
                  onClick={() => handleAreaBandChange(opt.value)}
                  className={getToggleBtnClass(isActive, { size: 'sm', tone: 'blue' })}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side-by-Side Dongtan 1 vs Dongtan 2 House Price Scoreboard */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
          {/* Dongtan 1 Card */}
          <div
            data-testid="vs-region-card-dongtan1"
            className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#202027] border border-emerald-500/25 flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  <Building2 className="w-3 h-3" />
                  {dongtan1.regionTitle}
                </span>
                <span className="text-[11px] font-semibold text-tertiary tabular-nums">
                  {dongtan1.complexCount}개 단지 · 1년 {dongtan1.txVolume1Y.toLocaleString('ko-KR')}건 거래
                </span>
              </div>
              <p className="text-xs text-secondary font-medium mb-3">
                {dongtan1.dongsLabel} · {dongtan1.regionSubtitle}
              </p>

              <div className="p-3.5 rounded-xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-slate-800/80 mb-3">
                <div className="text-[11px] font-bold text-tertiary mb-1">
                  동탄1 1년 가중평균 집값
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    data-testid="dongtan1-weighted-avg-price"
                    className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight"
                  >
                    {dongtan1.weightedAvgPriceEokText}
                  </span>
                  <span className="text-xs font-bold text-secondary tabular-nums">
                    {dongtan1.complexCount > 0
                      ? `평당 ${dongtan1.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원`
                      : '해당 평형 단지 없음'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#17171c]">
                  <span className="block text-[11px] text-tertiary font-medium">
                    최근 거래 평균가
                  </span>
                  <span className="text-sm font-extrabold text-primary tabular-nums">
                    {dongtan1.avgLatestPriceEokText}
                  </span>
                  <span className="block text-[10px] text-tertiary tabular-nums mt-0.5">
                    중위가 {dongtan1.medianLatestPriceEokText}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#17171c]">
                  <span className="block text-[11px] text-tertiary font-medium">
                    평균 준공 · 세대수
                  </span>
                  <span className="text-sm font-extrabold text-primary tabular-nums">
                    {dongtan1.complexCount > 0
                      ? `${dongtan1.avgBuiltYear}년 (${dongtan1.avgBuildingAge}년차)`
                      : '-'}
                  </span>
                  <span className="block text-[10px] text-tertiary tabular-nums mt-0.5">
                    {dongtan1.complexCount > 0
                      ? `총 ${dongtan1.totalHouseholds.toLocaleString('ko-KR')}세대`
                      : '표본 없음'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-tertiary font-semibold">최고가 대장 단지</span>
                {dongtan1.maxPriceComplexSlug ? (
                  <Link
                    href={`/apartment/${encodeURIComponent(dongtan1.maxPriceComplexSlug)}`} prefetch={false}
                    onClick={() =>
                      handleComplexClick(
                        dongtan1.maxPriceComplexSlug,
                        dongtan1.maxPriceComplexName,
                        dongtan1.maxPriceComplexDong,
                        'scoreboard_dongtan1_max'
                      )
                    }
                    className="font-bold text-primary hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 tabular-nums"
                  >
                    <span>{dongtan1.maxPriceComplexName}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ({dongtan1.maxLatestPriceEokText})
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="font-bold text-secondary">-</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-tertiary font-semibold">최소 예산 진입 단지</span>
                {dongtan1.minPriceComplexSlug ? (
                  <Link
                    href={`/apartment/${encodeURIComponent(dongtan1.minPriceComplexSlug)}`} prefetch={false}
                    onClick={() =>
                      handleComplexClick(
                        dongtan1.minPriceComplexSlug,
                        dongtan1.minPriceComplexName,
                        dongtan1.minPriceComplexDong,
                        'scoreboard_dongtan1_min'
                      )
                    }
                    className="font-bold text-secondary hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 tabular-nums"
                  >
                    <span>{dongtan1.minPriceComplexName}</span>
                    <span>({dongtan1.minLatestPriceEokText})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="font-bold text-secondary">-</span>
                )}
              </div>
              {onFilterRegionInTable && (
                <button
                  type="button"
                  onClick={() => onFilterRegionInTable('동탄1', areaBand)}
                  className="mt-2 w-full py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold transition-colors"
                >
                  하단 상세 표에서 동탄1 단지 전체 보기
                </button>
              )}
            </div>
          </div>

          {/* Center VS Delta Column */}
          <div className="lg:col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-100/80 dark:bg-[#202027] border border-slate-200/70 dark:border-slate-800 text-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
              VS
            </span>
            <div className="space-y-1">
              <span className="block text-[10px] font-bold text-tertiary">평균 집값 차이</span>
              <span
                data-testid="vs-weighted-price-diff"
                className="block text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums"
              >
                {delta.weightedPriceDiffEokText}
              </span>
              <span className="block text-[10px] font-bold text-secondary tabular-nums">
                {hasBothRegions
                  ? `(${delta.weightedPricePremiumPercent >= 0 ? '+' : ''}${delta.weightedPricePremiumPercent}%)`
                  : '단일 권역 표본'}
              </span>
            </div>
            <div className="w-full border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1">
              <span className="block text-[10px] font-bold text-tertiary">평당가 격차</span>
              <span className="block text-xs font-extrabold text-primary tabular-nums">
                {hasBothRegions
                  ? `${delta.pyeongPriceDiffManwon >= 0 ? '+' : ''}${delta.pyeongPriceDiffManwon.toLocaleString('ko-KR')}만`
                  : '-'}
              </span>
            </div>
          </div>

          {/* Dongtan 2 Card */}
          <div
            data-testid="vs-region-card-dongtan2"
            className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#202027] border border-blue-500/25 flex flex-col justify-between gap-4"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                  <TrendingUp className="w-3 h-3" />
                  {dongtan2.regionTitle}
                </span>
                <span className="text-[11px] font-semibold text-tertiary tabular-nums">
                  {dongtan2.complexCount}개 단지 · 1년 {dongtan2.txVolume1Y.toLocaleString('ko-KR')}건 거래
                </span>
              </div>
              <p className="text-xs text-secondary font-medium mb-3">
                {dongtan2.dongsLabel} · {dongtan2.regionSubtitle}
              </p>

              <div className="p-3.5 rounded-xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-slate-800/80 mb-3">
                <div className="text-[11px] font-bold text-tertiary mb-1">
                  동탄2 1년 가중평균 집값
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    data-testid="dongtan2-weighted-avg-price"
                    className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums tracking-tight"
                  >
                    {dongtan2.weightedAvgPriceEokText}
                  </span>
                  <span className="text-xs font-bold text-secondary tabular-nums">
                    {dongtan2.complexCount > 0
                      ? `평당 ${dongtan2.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원`
                      : '해당 평형 단지 없음'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#17171c]">
                  <span className="block text-[11px] text-tertiary font-medium">
                    최근 거래 평균가
                  </span>
                  <span className="text-sm font-extrabold text-primary tabular-nums">
                    {dongtan2.avgLatestPriceEokText}
                  </span>
                  <span className="block text-[10px] text-tertiary tabular-nums mt-0.5">
                    중위가 {dongtan2.medianLatestPriceEokText}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#17171c]">
                  <span className="block text-[11px] text-tertiary font-medium">
                    평균 준공 · 세대수
                  </span>
                  <span className="text-sm font-extrabold text-primary tabular-nums">
                    {dongtan2.complexCount > 0
                      ? `${dongtan2.avgBuiltYear}년 (${dongtan2.avgBuildingAge}년차)`
                      : '-'}
                  </span>
                  <span className="block text-[10px] text-tertiary tabular-nums mt-0.5">
                    {dongtan2.complexCount > 0
                      ? `총 ${dongtan2.totalHouseholds.toLocaleString('ko-KR')}세대`
                      : '표본 없음'}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-tertiary font-semibold">최고가 대장 단지</span>
                {dongtan2.maxPriceComplexSlug ? (
                  <Link
                    href={`/apartment/${encodeURIComponent(dongtan2.maxPriceComplexSlug)}`} prefetch={false}
                    onClick={() =>
                      handleComplexClick(
                        dongtan2.maxPriceComplexSlug,
                        dongtan2.maxPriceComplexName,
                        dongtan2.maxPriceComplexDong,
                        'scoreboard_dongtan2_max'
                      )
                    }
                    className="font-bold text-primary hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 tabular-nums"
                  >
                    <span>{dongtan2.maxPriceComplexName}</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      ({dongtan2.maxLatestPriceEokText})
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="font-bold text-secondary">-</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-tertiary font-semibold">최소 예산 진입 단지</span>
                {dongtan2.minPriceComplexSlug ? (
                  <Link
                    href={`/apartment/${encodeURIComponent(dongtan2.minPriceComplexSlug)}`} prefetch={false}
                    onClick={() =>
                      handleComplexClick(
                        dongtan2.minPriceComplexSlug,
                        dongtan2.minPriceComplexName,
                        dongtan2.minPriceComplexDong,
                        'scoreboard_dongtan2_min'
                      )
                    }
                    className="font-bold text-secondary hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 tabular-nums"
                  >
                    <span>{dongtan2.minPriceComplexName}</span>
                    <span>({dongtan2.minLatestPriceEokText})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                ) : (
                  <span className="font-bold text-secondary">-</span>
                )}
              </div>
              {onFilterRegionInTable && (
                <button
                  type="button"
                  onClick={() => onFilterRegionInTable('동탄2', areaBand)}
                  className="mt-2 w-full py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[11px] font-bold transition-colors"
                >
                  하단 상세 표에서 동탄2 단지 전체 보기
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Budget Bracket Distribution Comparison (내 예산별 매수 가능 단지 비중) */}
      <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-primary">
              내 예산으로 어디 갈 수 있을까? 가격대별(6억~15억+) 단지 분포 비교
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              최근 실거래가 기준 동탄1신도시와 동탄2신도시의 가격 구간별 단지 수와 대표 아파트입니다.
            </p>
          </div>
          <Link
            href="/guide/dongtan-budget-tier-ranking" prefetch={false}
            onClick={() =>
              handleGuideBridgeClick(
                'dongtan-budget-tier-ranking',
                '예산별(6억·9억·12억+) 동탄 아파트 매수 전략',
                'budget_distribution_header'
              )
            }
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
          >
            <span>예산별 매수 전략 비교글 보기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {priceBrackets.map((b) => (
            <div
              key={b.bracketId}
              data-testid={`vs-price-bracket-${b.bracketId}`}
              className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/70 dark:border-slate-800/80"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                <span className="text-xs sm:text-sm font-extrabold text-primary">
                  {b.rangeLabel}
                </span>
                <div className="flex items-center gap-3 text-xs font-bold tabular-nums">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    동탄1: {b.dongtan1Count}개 단지 ({b.dongtan1SharePercent.toFixed(1)}%)
                  </span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    동탄2: {b.dongtan2Count}개 단지 ({b.dongtan2SharePercent.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Dual Progress Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 w-10 shrink-0">
                    동탄1
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(b.dongtan1Count > 0 ? 6 : 0, b.dongtan1SharePercent))}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-blue-700 dark:text-blue-300 w-10 shrink-0">
                    동탄2
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(b.dongtan2Count > 0 ? 6 : 0, b.dongtan2SharePercent))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Sample Clickable Apartments */}
              {(b.dongtan1Samples.length > 0 || b.dongtan2Samples.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {b.dongtan1Samples.map((s) => (
                    <Link
                      key={`d1-${s.name}`}
                      href={`/apartment/${encodeURIComponent(s.canonicalSlug)}`} prefetch={false}
                      onClick={() =>
                        handleComplexClick(s.canonicalSlug, s.name, s.dong, `bracket_${b.bracketId}`)
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-colors tabular-nums"
                    >
                      <span>[동탄1] {s.name}</span>
                      <span className="font-bold">{s.latestPriceEokText}</span>
                    </Link>
                  ))}
                  {b.dongtan2Samples.map((s) => (
                    <Link
                      key={`d2-${s.name}`}
                      href={`/apartment/${encodeURIComponent(s.canonicalSlug)}`} prefetch={false}
                      onClick={() =>
                        handleComplexClick(s.canonicalSlug, s.name, s.dong, `bracket_${b.bracketId}`)
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 transition-colors tabular-nums"
                    >
                      <span>[동탄2] {s.name}</span>
                      <span className="font-bold">{s.latestPriceEokText}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 3. 1:1 Flagship Rival Complex Price Matchups */}
      <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>대표 단지 1:1 실거래 맞대결</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-primary">
              동탄1 vs 동탄2 상징 단지 집값 1:1 매치업
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              각 신도시를 대표하는 랜드마크·시범·학군·공원 대장주의 실제 거래 가격과 연결된 비교 리포트를 확인하세요.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rivalMatchups.map((m) => (
            <div
              key={m.matchupId}
              data-testid={`rival-matchup-${m.matchupId}`}
              className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#202027] border border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between gap-3.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-secondary">
                    {m.themeBadge}
                  </span>
                  <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                    최근가 격차 {m.latestPriceGapEokText}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-primary leading-snug mb-1">
                  {m.matchupTitle}
                </h4>
                <p className="text-xs text-secondary leading-relaxed mb-3">
                  {m.matchupDescription}
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Dongtan 1 Side */}
                  <Link
                    href={`/apartment/${encodeURIComponent(m.dongtan1Complex.canonicalSlug)}`} prefetch={false}
                    onClick={() =>
                      handleComplexClick(
                        m.dongtan1Complex.canonicalSlug,
                        m.dongtan1Complex.name,
                        m.dongtan1Complex.dong,
                        `rival_${m.matchupId}_d1`
                      )
                    }
                    className="group p-3 rounded-xl bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-slate-800/80 border border-emerald-500/20 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-700 dark:text-emerald-300 mb-1 tabular-nums">
                      <span>동탄1 · {m.dongtan1Complex.dong}</span>
                      <span>
                        {m.dongtan1Complex.builtYear}년 · {Math.round(m.dongtan1Complex.exclusiveAreaAvgM2)}㎡
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate mb-1.5">
                      {m.dongtan1Complex.name}
                    </div>
                    <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {m.dongtan1Complex.latestPriceEokText}
                    </div>
                    <div className="text-[11px] text-tertiary font-medium tabular-nums mt-0.5">
                      1년 평균 {m.dongtan1Complex.avgPriceEokText} · 평당{' '}
                      {m.dongtan1Complex.pyeongPriceManwon.toLocaleString('ko-KR')}만
                    </div>
                  </Link>

                  {/* Dongtan 2 Side */}
                  <Link
                    href={`/apartment/${encodeURIComponent(m.dongtan2Complex.canonicalSlug)}`} prefetch={false}
                    onClick={() =>
                      handleComplexClick(
                        m.dongtan2Complex.canonicalSlug,
                        m.dongtan2Complex.name,
                        m.dongtan2Complex.dong,
                        `rival_${m.matchupId}_d2`
                      )
                    }
                    className="group p-3 rounded-xl bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-slate-800/80 border border-blue-500/20 transition-colors"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-blue-700 dark:text-blue-300 mb-1 tabular-nums">
                      <span>동탄2 · {m.dongtan2Complex.dong}</span>
                      <span>
                        {m.dongtan2Complex.builtYear}년 · {Math.round(m.dongtan2Complex.exclusiveAreaAvgM2)}㎡
                      </span>
                    </div>
                    <div className="text-xs font-extrabold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate mb-1.5">
                      {m.dongtan2Complex.name}
                    </div>
                    <div className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums">
                      {m.dongtan2Complex.latestPriceEokText}
                    </div>
                    <div className="text-[11px] text-tertiary font-medium tabular-nums mt-0.5">
                      1년 평균 {m.dongtan2Complex.avgPriceEokText} · 평당{' '}
                      {m.dongtan2Complex.pyeongPriceManwon.toLocaleString('ko-KR')}만
                    </div>
                  </Link>
                </div>
              </div>

              <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <Link
                  href={`/guide/${m.relatedGuideSlug}`} prefetch={false}
                  onClick={() =>
                    handleGuideBridgeClick(
                      m.relatedGuideSlug,
                      m.relatedGuideTitle,
                      `rival_card_${m.matchupId}`
                    )
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{m.relatedGuideTitle}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Legal Dong House Price Ranking Table (동탄1 3개동 vs 동탄2 8개동 서열) */}
      <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]">
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary mb-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>법정동별 집값 서열</span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-primary">
            동탄1(3개 법정동) vs 동탄2(8개 법정동) 평균 집값 랭킹
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            11개 법정동 전체의 1년 거래량 가중평균 집값과 최고가 대장 단지를 비교합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {dongRankings.map((d, idx) => {
            const isD1 = d.regionId === '동탄1';
            return (
              <div
                key={d.dong}
                data-testid={`dong-rank-card-${d.dong}`}
                className="p-3.5 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/70 dark:border-slate-800/80 flex flex-col justify-between gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-black text-secondary flex items-center justify-center tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-black text-primary">{d.dong}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isD1
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-blue-500/10 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {d.regionId}
                    </span>
                  </div>
                  <span className="text-base font-black text-primary tabular-nums">
                    {d.weightedAvgPriceEokText}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-secondary tabular-nums">
                  <span>평당 {d.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만</span>
                  <span>
                    {d.complexCount}개 단지 · {d.txVolume1Y.toLocaleString('ko-KR')}건
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-tertiary font-medium">최고가 단지</span>
                  <Link
                    href={`/apartment/${encodeURIComponent(d.flagshipComplexSlug)}`} prefetch={false}
                    onClick={() =>
                      handleComplexClick(
                        d.flagshipComplexSlug,
                        d.flagshipComplexName,
                        d.dong,
                        `dong_rank_${d.dong}`
                      )
                    }
                    className="font-bold text-secondary hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-[180px] tabular-nums"
                  >
                    {d.flagshipComplexName} ({d.maxLatestPriceEokText})
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Bidirectional Traffic Engine: Comparison Guides Recirculation Deck */}
      <div
        data-testid="stats-to-guide-recirculation-deck"
        className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">
              <BookOpen className="w-3.5 h-3.5" />
              <span>통계 × 비교 가이드 양방향 연동</span>
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-primary">
              집값 통계와 함께 읽으면 좋은 동탄 핵심 비교 분석글
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              숫자 뒤에 숨은 학군·출퇴근·생활 인프라 차이를 비교 분석 아티클에서 자세히 확인해 보세요.
            </p>
          </div>
          <Link
            href="/guide" prefetch={false}
            className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:text-blue-600 dark:hover:text-blue-400 shrink-0"
          >
            <span>가이드 전체 보기</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Featured Primary Comparison Guide */}
        {primaryGuide && (
          <Link
            href={`/guide/${primaryGuide.slug}`} prefetch={false}
            data-testid={`comparison-guide-card-${primaryGuide.slug}`}
            onClick={() =>
              handleGuideBridgeClick(
                primaryGuide.slug,
                primaryGuide.title,
                'recirculation_featured_card'
              )
            }
            className="group block p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#202027] border-2 border-blue-500/30 hover:border-blue-600 transition-all mb-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-blue-600 text-white">
                  {primaryGuide.badge}
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {primaryGuide.highlightStatLabel}
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                <span>비교 리포트 읽기</span>
                <ArrowRight className="w-4 h-4" />
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1.5">
              {primaryGuide.title}
            </h4>
            <p className="text-xs text-secondary leading-relaxed">{primaryGuide.summary}</p>
          </Link>
        )}

        {/* Secondary Comparison Guides Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {secondaryGuides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guide/${guide.slug}`} prefetch={false}
              data-testid={`comparison-guide-card-${guide.slug}`}
              onClick={() =>
                handleGuideBridgeClick(guide.slug, guide.title, 'recirculation_secondary_grid')
              }
              className="group p-4 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/70 dark:border-slate-800/80 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-2.5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-secondary">
                    {guide.badge}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-tertiary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
                <h4 className="text-xs sm:text-sm font-extrabold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-1.5">
                  {guide.title}
                </h4>
                <p className="text-[11px] text-secondary leading-relaxed line-clamp-2">
                  {guide.summary}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] font-bold text-blue-600 dark:text-blue-400 tabular-nums truncate">
                {guide.highlightStatLabel}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
