'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Waves,
  History,
  Scale,
  Building2,
  TrendingUp,
  ArrowRight,
  BookOpen,
  Trophy,
  Layers,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import {
  getSchoolDistrictPremiumData,
  getLakeParkPremiumData,
  getBuildingAgeDepreciationData,
  type SchoolDistrictPremiumPayload,
  type LakeParkPremiumPayload,
  type BuildingAgeDepreciationPayload,
  type ThematicGroupPriceSummary,
  type ThematicTierBreakdownItem,
  type ThematicRivalMatchup,
} from '@/lib/stats/thematicPriceComparisonEngine';
import type { AreaBandFilter } from '@/lib/stats/types';
import type { ComparisonGuideBridgeItem } from '@/lib/stats/dongtan1Vs2ComparisonEngine';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';
import { trackEvent, trackVirtualPageView } from '@/lib/utils/analytics';

export type ThematicTopicId =
  | 'school-district-premium'
  | 'lake-park-view-premium'
  | 'building-age-depreciation';

export interface ThematicPriceComparisonSectionProps {
  topicId: ThematicTopicId;
  initialAreaBand?: AreaBandFilter;
  initialSchoolData?: SchoolDistrictPremiumPayload;
  initialLakeData?: LakeParkPremiumPayload;
  initialAgeData?: BuildingAgeDepreciationPayload;
  onSelectTopic?: (topicId: string) => void;
  onSelectComplex?: (canonicalSlug: string, complexName: string, dong: string) => void;
  onApplyTableFilter?: (filterUpdate: {
    areaBand?: AreaBandFilter;
    buildingAge?: 'all' | 'under5' | '5to10' | 'over10';
    dong?: string;
    sortBy?: 'distance' | 'pyeongPriceDesc' | 'priceDesc' | 'latestPriceDesc' | 'volumeDesc' | 'latestYear';
  }) => void;
}

const AREA_BAND_OPTIONS: ReadonlyArray<{ value: AreaBandFilter; label: string }> = [
  { value: 'all', label: '전 평형 통합' },
  { value: 'small', label: '20평대 소형 (60㎡ 미만)' },
  { value: 'medium', label: '30평대 중형 (60~85㎡)' },
  { value: 'large', label: '40평대+ 대형 (85㎡ 초과)' },
];

function GroupSummaryCard({
  group,
  accentTone = 'blue',
  testId,
  extraMetricLabel,
  extraMetricValue,
  onComplexClick,
}: {
  group: ThematicGroupPriceSummary;
  accentTone?: 'blue' | 'emerald';
  testId: string;
  extraMetricLabel: string;
  extraMetricValue: string;
  onComplexClick: (slug: string, name: string, dong: string, section: string) => void;
}) {
  const isEmerald = accentTone === 'emerald';
  const badgeClass = isEmerald
    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
    : 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
  const borderClass = isEmerald ? 'border-emerald-500/25' : 'border-blue-500/25';
  const priceTextClass = isEmerald
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-blue-600 dark:text-blue-400';

  return (
    <div
      data-testid={testId}
      className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#202027] border ${borderClass} flex flex-col justify-between gap-4`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${badgeClass}`}
          >
            <Building2 className="w-3 h-3" />
            {group.criteriaLabel}
          </span>
          <span className="text-[11px] font-semibold text-tertiary tabular-nums">
            {group.complexCount}개 단지 · 1년 {group.txVolume1Y.toLocaleString('ko-KR')}건
          </span>
        </div>
        <h3 className="text-sm sm:text-base font-extrabold text-primary mb-1">
          {group.groupTitle}
        </h3>
        <p className="text-xs text-secondary font-medium mb-3">{group.groupSubtitle}</p>

        <div className="p-3.5 rounded-xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-slate-800/80 mb-3">
          <div className="text-[11px] font-bold text-tertiary mb-1">1년 가중평균 집값</div>
          <div className="flex items-baseline justify-between gap-2">
            <span
              data-testid={`${testId}-avg-price`}
              className={`text-2xl sm:text-3xl font-black ${priceTextClass} tabular-nums tracking-tight`}
            >
              {group.weightedAvgPriceEokText}
            </span>
            <span className="text-xs font-bold text-secondary tabular-nums">
              {group.complexCount > 0
                ? `평당 ${group.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만원`
                : '해당 평형 단지 없음'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#17171c]">
            <span className="block text-[11px] text-tertiary font-medium">최근 거래 평균가</span>
            <span className="text-sm font-extrabold text-primary tabular-nums">
              {group.avgLatestPriceEokText}
            </span>
            <span className="block text-[10px] text-tertiary tabular-nums mt-0.5">
              {group.complexCount > 0
                ? `중위가 ${group.medianLatestPriceEokText}`
                : '해당 평형 표본 없음'}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#17171c]">
            <span className="block text-[11px] text-tertiary font-medium">{extraMetricLabel}</span>
            <span className="text-sm font-extrabold text-primary tabular-nums">
              {group.complexCount > 0 ? extraMetricValue : '-'}
            </span>
            <span className="block text-[10px] text-tertiary tabular-nums mt-0.5">
              {group.complexCount > 0
                ? `전고점 방어율 ${group.avgPriceRetentionPercent}%`
                : '전고점 방어율 -'}
            </span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-tertiary font-semibold">대표 최고가 단지</span>
          {group.maxPriceComplexSlug ? (
            <Link
              href={`/apartment/${encodeURIComponent(group.maxPriceComplexSlug)}`}
              onClick={() =>
                onComplexClick(
                  group.maxPriceComplexSlug,
                  group.maxPriceComplexName,
                  group.maxPriceComplexDong,
                  testId
                )
              }
              className={`font-bold ${priceTextClass} hover:underline truncate max-w-[210px] tabular-nums`}
            >
              {group.maxPriceComplexName} ({group.maxLatestPriceEokText})
            </Link>
          ) : (
            <span className="text-tertiary">-</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-tertiary font-semibold">실속 진입 단지</span>
          {group.minPriceComplexSlug ? (
            <Link
              href={`/apartment/${encodeURIComponent(group.minPriceComplexSlug)}`}
              onClick={() =>
                onComplexClick(
                  group.minPriceComplexSlug,
                  group.minPriceComplexName,
                  group.minPriceComplexDong,
                  testId
                )
              }
              className="font-semibold text-secondary hover:text-primary hover:underline truncate max-w-[210px] tabular-nums"
            >
              {group.minPriceComplexName} ({group.minLatestPriceEokText})
            </Link>
          ) : (
            <span className="text-tertiary">-</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TierBreakdownBlock({
  title,
  subtitle,
  tiers,
  extraColumnHeader,
  renderExtraValue,
  onComplexClick,
}: {
  title: string;
  subtitle: string;
  tiers: ThematicTierBreakdownItem[];
  extraColumnHeader: string;
  renderExtraValue: (tier: ThematicTierBreakdownItem) => string;
  onComplexClick: (slug: string, name: string, dong: string, section: string) => void;
}) {
  const maxPriceWon = Math.max(...tiers.map((t) => t.weightedAvgPriceWon), 1);

  return (
    <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-base sm:text-lg font-black text-primary tracking-tight">{title}</h3>
          <p className="text-xs text-secondary font-medium mt-0.5">{subtitle}</p>
        </div>
        <span className="text-[11px] font-bold text-tertiary tabular-nums">
          단지 클릭 시 실거래 상세 페이지 이동
        </span>
      </div>

      <div className="space-y-3">
        {tiers.map((tier, idx) => {
          const widthPct =
            tier.weightedAvgPriceWon > 0
              ? Math.max(12, Math.round((tier.weightedAvgPriceWon / maxPriceWon) * 100))
              : 0;
          const isHighlight = idx === 0;

          return (
            <div
              key={tier.tierId}
              data-testid={`thematic-tier-row-${tier.tierId}`}
              className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#202027] border border-[#f2f4f6] dark:border-slate-800/80 space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-extrabold ${
                      isHighlight
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-primary'
                    }`}
                  >
                    {tier.shortLabel}
                  </span>
                  <span className="text-xs font-bold text-secondary">{tier.rangeLabel}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums">
                  <span className="font-semibold text-tertiary">
                    {tier.complexCount}개 단지 ({tier.sharePercent}%) · 1년{' '}
                    {tier.txVolume1Y.toLocaleString('ko-KR')}건
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {extraColumnHeader}: {tier.complexCount > 0 ? renderExtraValue(tier) : '-'}
                  </span>
                </div>
              </div>

              {/* Price Bar */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isHighlight ? 'bg-blue-600' : 'bg-emerald-600/80 dark:bg-emerald-500/80'
                    }`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <div className="shrink-0 text-right tabular-nums min-w-[145px]">
                  <span className="text-sm sm:text-base font-black text-primary">
                    {tier.weightedAvgPriceEokText}
                  </span>
                  {tier.complexCount > 0 && (
                    <span className="ml-1.5 text-[11px] font-bold text-secondary">
                      (평당 {tier.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만)
                    </span>
                  )}
                </div>
              </div>

              <p className="text-[11.5px] text-tertiary font-medium">{tier.description}</p>

              {/* Sample Complex Links */}
              {tier.samples.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10.5px] font-bold text-tertiary mr-1">대표 단지:</span>
                  {tier.samples.map((sample) => (
                    <Link
                      key={`${tier.tierId}-${sample.name}`}
                      href={`/apartment/${encodeURIComponent(sample.canonicalSlug)}`}
                      onClick={() =>
                        onComplexClick(
                          sample.canonicalSlug,
                          sample.name,
                          sample.dong,
                          `tier_${tier.tierId}`
                        )
                      }
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 dark:bg-[#17171c] dark:hover:bg-slate-800 text-[11px] font-semibold text-secondary hover:text-blue-600 dark:hover:text-blue-400 transition-colors tabular-nums"
                    >
                      <span>{sample.name}</span>
                      <span className="font-extrabold text-primary">
                        {sample.latestPriceEokText}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RivalMatchupsBlock({
  title,
  subtitle,
  matchups,
  onComplexClick,
  onGuideClick,
}: {
  title: string;
  subtitle: string;
  matchups: ThematicRivalMatchup[];
  onComplexClick: (slug: string, name: string, dong: string, section: string) => void;
  onGuideClick: (slug: string, title: string, placement: string) => void;
}) {
  if (matchups.length === 0) return null;

  return (
    <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-600 dark:text-blue-400 mb-1">
            <Trophy className="w-3.5 h-3.5" />
            <span>대표 대장 단지 1:1 실거래 맞대결</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-primary tracking-tight">{title}</h3>
          <p className="text-xs text-secondary font-medium mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {matchups.map((m) => (
          <div
            key={m.matchupId}
            data-testid={`thematic-matchup-${m.matchupId}`}
            className="p-4 rounded-2xl bg-white dark:bg-[#202027] border border-[#f2f4f6] dark:border-slate-800 flex flex-col justify-between gap-3.5"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10.5px] font-extrabold">
                  {m.themeBadge}
                </span>
                <span className="text-[11px] font-extrabold text-primary tabular-nums">
                  격차 {m.latestPriceGapEokText}
                </span>
              </div>
              <h4 className="text-xs sm:text-[13px] font-black text-primary leading-snug">
                {m.matchupTitle}
              </h4>
              <p className="text-[11.5px] text-secondary font-medium leading-relaxed">
                {m.matchupDescription}
              </p>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Left Complex */}
                <Link
                  href={`/apartment/${encodeURIComponent(m.leftComplex.canonicalSlug)}`}
                  onClick={() =>
                    onComplexClick(
                      m.leftComplex.canonicalSlug,
                      m.leftComplex.name,
                      m.leftComplex.dong,
                      `matchup_${m.matchupId}_left`
                    )
                  }
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#17171c] dark:hover:bg-slate-800/80 transition-colors flex flex-col justify-between gap-1"
                >
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate">
                    {m.leftLabel}
                  </span>
                  <span className="text-xs font-extrabold text-primary truncate">
                    {m.leftComplex.name}
                  </span>
                  <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800 tabular-nums">
                    <span className="block text-xs font-black text-blue-600 dark:text-blue-400">
                      {m.leftComplex.latestPriceEokText}
                    </span>
                    <span className="block text-[10px] text-tertiary">
                      평당 {m.leftComplex.pyeongPriceManwon.toLocaleString('ko-KR')}만 · 방어{' '}
                      {m.leftComplex.priceRetentionPercent}%
                    </span>
                  </div>
                </Link>

                {/* Right Complex */}
                <Link
                  href={`/apartment/${encodeURIComponent(m.rightComplex.canonicalSlug)}`}
                  onClick={() =>
                    onComplexClick(
                      m.rightComplex.canonicalSlug,
                      m.rightComplex.name,
                      m.rightComplex.dong,
                      `matchup_${m.matchupId}_right`
                    )
                  }
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-[#17171c] dark:hover:bg-slate-800/80 transition-colors flex flex-col justify-between gap-1"
                >
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 truncate">
                    {m.rightLabel}
                  </span>
                  <span className="text-xs font-extrabold text-primary truncate">
                    {m.rightComplex.name}
                  </span>
                  <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800 tabular-nums">
                    <span className="block text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {m.rightComplex.latestPriceEokText}
                    </span>
                    <span className="block text-[10px] text-tertiary">
                      평당 {m.rightComplex.pyeongPriceManwon.toLocaleString('ko-KR')}만 · 방어{' '}
                      {m.rightComplex.priceRetentionPercent}%
                    </span>
                  </div>
                </Link>
              </div>
            </div>

            <Link
              href={`/guide/${m.relatedGuideSlug}`}
              onClick={() =>
                onGuideClick(m.relatedGuideSlug, m.relatedGuideTitle, `matchup_${m.matchupId}`)
              }
              className="pt-2.5 border-t border-slate-100 dark:border-slate-800 inline-flex items-center justify-between text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <span className="truncate">{m.relatedGuideTitle}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

function GuideRecirculationBlock({
  guides,
  topicId,
  onGuideClick,
}: {
  guides: ComparisonGuideBridgeItem[];
  topicId: ThematicTopicId;
  onGuideClick: (slug: string, title: string, placement: string) => void;
}) {
  if (guides.length === 0) return null;

  return (
    <div
      data-testid={`thematic-guide-bridge-${topicId}`}
      className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mb-1">
            <BookOpen className="w-3.5 h-3.5" />
            <span>통계 × 부동산 가이드 양방향 심층 리포트</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-primary tracking-tight">
            수치로 확인한 집값 격차, 단지별 입지 분석글로 이어서 읽기
          </h3>
        </div>
        <Link
          href="/guide"
          className="text-xs font-extrabold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
        >
          <span>20개 비교 가이드 전체보기</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {guides.map((g) => (
          <Link
            key={g.slug}
            href={`/guide/${g.slug}`}
            onClick={() => onGuideClick(g.slug, g.title, `bottom_bridge_${topicId}`)}
            className="p-4 rounded-xl bg-white dark:bg-[#202027] border border-[#f2f4f6] dark:border-slate-800 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-3 group"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10.5px] font-extrabold">
                  {g.badge}
                </span>
                <span className="text-[10.5px] font-bold text-tertiary">{g.category}</span>
              </div>
              <h4 className="text-xs sm:text-[13.5px] font-extrabold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                {g.title}
              </h4>
              <p className="text-[11.5px] text-secondary font-medium line-clamp-2 leading-relaxed">
                {g.summary}
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
              <span className="truncate">{g.highlightStatLabel}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ThematicPriceComparisonSection({
  topicId,
  initialAreaBand = 'all',
  initialSchoolData,
  initialLakeData,
  initialAgeData,
  onSelectTopic,
  onSelectComplex,
  onApplyTableFilter,
}: ThematicPriceComparisonSectionProps) {
  const [areaBand, setAreaBand] = useState<AreaBandFilter>(initialAreaBand);

  const schoolData = useMemo(() => {
    if (initialSchoolData && initialSchoolData.areaBand === areaBand) {
      return initialSchoolData;
    }
    return getSchoolDistrictPremiumData(areaBand);
  }, [areaBand, initialSchoolData]);

  const lakeData = useMemo(() => {
    if (initialLakeData && initialLakeData.areaBand === areaBand) {
      return initialLakeData;
    }
    return getLakeParkPremiumData(areaBand);
  }, [areaBand, initialLakeData]);

  const ageData = useMemo(() => {
    if (initialAgeData && initialAgeData.areaBand === areaBand) {
      return initialAgeData;
    }
    return getBuildingAgeDepreciationData(areaBand);
  }, [areaBand, initialAgeData]);

  const handleAreaBandChange = useCallback(
    (nextBand: AreaBandFilter) => {
      setAreaBand(nextBand);
      onApplyTableFilter?.({ areaBand: nextBand });
      trackEvent('stats_thematic_area_filter_change', {
        event_category: 'stats_thematic_comparison',
        topic_id: topicId,
        area_band: nextBand,
      });
    },
    [topicId, onApplyTableFilter]
  );

  const handleComplexClick = useCallback(
    (slug: string, name: string, dong: string, sourceSection: string) => {
      trackEvent('stats_thematic_complex_click', {
        event_category: 'stats_thematic_comparison',
        topic_id: topicId,
        apartment_name: name,
        dong,
        canonical_slug: slug,
        source_section: sourceSection,
      });
      trackVirtualPageView(`/apartment/${encodeURIComponent(slug)}`, {
        page_title: `${name} 실거래 상세 (${topicId})`,
        source_section: sourceSection,
      });
      onSelectComplex?.(slug, name, dong);
    },
    [topicId, onSelectComplex]
  );

  const handleGuideBridgeClick = useCallback(
    (slug: string, title: string, placement: string) => {
      trackEvent('stats_to_guide_bridge_click', {
        event_category: 'bidirectional_recirculation',
        from_surface: `stats_${topicId}`,
        to_guide_slug: slug,
        guide_title: title,
        placement,
      });
      trackVirtualPageView(`/guide/${slug}`, { page_title: title, placement });
    },
    [topicId]
  );

  // ==========================================================================
  // RENDER: ISSUE #2 (`school-district-premium`)
  // ==========================================================================
  if (topicId === 'school-district-premium') {
    const {
      chopumaGroup,
      generalSchoolGroup,
      academyPrimeGroup,
      nonAcademyGroup,
      delta,
      elementaryDistanceTiers,
      academyDensityTiers,
      schoolZoneRankings,
      rivalMatchups,
      comparisonGuides,
    } = schoolData;
    const primaryGuide = comparisonGuides[0];

    return (
      <section
        id="school-district-premium"
        data-testid="school-district-premium-section"
        aria-label="초품아 및 명문 학군 아파트 집값 프리미엄 비교 분석"
        className="w-full flex flex-col gap-5"
      >
        <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800/80">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Issue #2 · 초품아·학군 집값 비교
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 tabular-nums">
                  초품아({chopumaGroup.complexCount}단지) vs 일반({generalSchoolGroup.complexCount}단지) · 학원가 전수 분석
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-primary tracking-tight">
                {delta.headlineQuestion}
              </h2>
              <p className="text-xs sm:text-sm text-secondary font-medium leading-relaxed max-w-3xl">
                {delta.headlineAnswer}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {primaryGuide && (
                <Link
                  href={`/guide/${primaryGuide.slug}`}
                  data-testid="school-stats-to-guide-cta"
                  onClick={() =>
                    handleGuideBridgeClick(
                      primaryGuide.slug,
                      primaryGuide.title,
                      'school_hero_cta'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>학군·초품아 심층 분석글 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              {onSelectTopic && (
                <button
                  type="button"
                  onClick={() => onSelectTopic('dongtan-station-distance')}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#202027] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-secondary text-xs font-bold transition-colors"
                >
                  Issue #1 동탄역 거리 분석 리포트 보기
                </button>
              )}
            </div>
          </div>

          {/* Area Band Filter */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
              <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>평형대 기준 초품아·학군 집값 비교</span>
            </div>
            <div
              role="group"
              aria-label="초품아 학군 평형대 필터"
              className={getToggleTrackClass('flex flex-wrap gap-1')}
            >
              {AREA_BAND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`school-area-filter-${opt.value}`}
                  aria-pressed={areaBand === opt.value}
                  onClick={() => handleAreaBandChange(opt.value)}
                  className={getToggleBtnClass(areaBand === opt.value, {
                    size: 'sm',
                    tone: 'blue',
                  })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-Side Scoreboard: 진성 초품아 vs 일반 통학권 */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
            <div className="lg:col-span-5">
              <GroupSummaryCard
                group={chopumaGroup}
                accentTone="blue"
                testId="school-card-chopuma"
                extraMetricLabel="평균 초등학교 거리 · 학원수"
                extraMetricValue={`${chopumaGroup.avgDistanceToElementaryMeters}m · 학원 ${chopumaGroup.avgAcademyDensity}개`}
                onComplexClick={handleComplexClick}
              />
            </div>

            {/* Center Delta Callout */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#202027] border border-slate-200/80 dark:border-slate-800 text-center gap-2">
              <span className="text-[10px] font-extrabold text-tertiary uppercase">VS 격차</span>
              <div
                data-testid="school-chopuma-price-diff"
                className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 tabular-nums"
              >
                {delta.chopumaPriceDiffEokText}
              </div>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-extrabold tabular-nums">
                {delta.chopumaPricePremiumPercent >= 0 ? '+' : ''}
                {delta.chopumaPricePremiumPercent}%
              </span>
              <span className="text-[10px] font-bold text-secondary tabular-nums">
                평당 {delta.chopumaPyeongDiffManwon >= 0 ? '+' : ''}
                {delta.chopumaPyeongDiffManwon.toLocaleString('ko-KR')}만
              </span>
            </div>

            <div className="lg:col-span-5">
              <GroupSummaryCard
                group={generalSchoolGroup}
                accentTone="emerald"
                testId="school-card-general"
                extraMetricLabel="평균 초등학교 거리 · 학원수"
                extraMetricValue={`${generalSchoolGroup.avgDistanceToElementaryMeters}m · 학원 ${generalSchoolGroup.avgAcademyDensity}개`}
                onComplexClick={handleComplexClick}
              />
            </div>
          </div>

          {/* Secondary Scoreboard Strip: 학원가 밀집권(40개+) vs 비학원권(<40개) */}
          <div className="mt-4 p-4 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/70 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
                핵심 학원가 밀집도(반경 내 학원 40개 기준) 집값 격차
              </span>
              <p className="text-xs text-secondary font-medium tabular-nums">
                학원 밀집권({academyPrimeGroup.complexCount}단지, 평균{' '}
                <strong className="text-primary">{academyPrimeGroup.weightedAvgPriceEokText}</strong>
                ·평당 {academyPrimeGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만) vs 비학원권(
                {nonAcademyGroup.complexCount}단지, 평균{' '}
                <strong className="text-primary">{nonAcademyGroup.weightedAvgPriceEokText}</strong>
                ·평당 {nonAcademyGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만)
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 tabular-nums">
              <span
                data-testid="school-academy-price-diff"
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-black"
              >
                학원가 프리미엄 {delta.academyPriceDiffEokText} (
                {delta.academyPricePremiumPercent >= 0 ? '+' : ''}
                {delta.academyPricePremiumPercent}%)
              </span>
            </div>
          </div>
        </div>

        {/* Elementary School Distance 4 Tiers */}
        <TierBreakdownBlock
          title="초등학교 직선거리 4구간별 실거래 집값·평당가 비교"
          subtitle="200m 이내 진성 초품아부터 450m 초과 구간까지 통학 거리별 가격 분포"
          tiers={elementaryDistanceTiers}
          extraColumnHeader="평균 학원수"
          renderExtraValue={(t) => `${t.avgAcademyDensity}개`}
          onComplexClick={handleComplexClick}
        />

        {/* Academy Density 3 Tiers */}
        <TierBreakdownBlock
          title="반경 내 학원가 밀집도 3구간별 집값 비교"
          subtitle="솔빛·나루·청계 시범 메이저 학원가(100개+) vs 중견 학원권(40~99개) vs 주거전용권(<40개)"
          tiers={academyDensityTiers}
          extraColumnHeader="전고점 방어율"
          renderExtraValue={(t) => `${t.avgPriceRetentionPercent}%`}
          onComplexClick={handleComplexClick}
        />

        {/* Top Elementary School Zones Ranking */}
        {schoolZoneRankings.length > 0 && (
          <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]">
            <div className="mb-4">
              <h3 className="text-base sm:text-lg font-black text-primary tracking-tight">
                동탄 주요 배정 초등학교 학군별 평균 집값 랭킹 TOP {schoolZoneRankings.length}
              </h3>
              <p className="text-xs text-secondary font-medium mt-0.5">
                동일 초등학교 학군 배정 단지들의 1년 가중평균 매매가 및 대표 대장 단지 비교
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {schoolZoneRankings.map((z, idx) => (
                <div
                  key={z.schoolName}
                  data-testid={`school-zone-rank-${idx + 1}`}
                  className="p-3.5 rounded-xl bg-white dark:bg-[#202027] border border-[#f2f4f6] dark:border-slate-800 flex flex-col justify-between gap-2 tabular-nums"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10.5px] font-extrabold">
                        TOP {idx + 1} · {z.primaryDong}
                      </span>
                      <span className="text-[10.5px] font-semibold text-tertiary">
                        {z.complexCount}단지 · {z.txVolume1Y}건
                      </span>
                    </div>
                    <h4 className="text-sm font-black text-primary">{z.schoolName} 학군</h4>
                    <div className="mt-1.5 flex items-baseline justify-between">
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {z.weightedAvgPriceEokText}
                      </span>
                      <span className="text-[11px] font-bold text-secondary">
                        평당 {z.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                    <span className="text-tertiary">대표 대장</span>
                    <Link
                      href={`/apartment/${encodeURIComponent(z.flagshipComplexSlug)}`}
                      onClick={() =>
                        handleComplexClick(
                          z.flagshipComplexSlug,
                          z.flagshipComplexName,
                          z.primaryDong,
                          `school_zone_${z.schoolName}`
                        )
                      }
                      className="font-bold text-blue-600 dark:text-blue-400 hover:underline truncate max-w-[140px]"
                    >
                      {z.flagshipComplexName}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <RivalMatchupsBlock
          title="초품아 · 명문 학군 대표 단지 1:1 집값 맞대결"
          subtitle="청계 시범·산척 레이크에듀·반송 솔빛·한빛 학군 대장주 실거래 비교"
          matchups={rivalMatchups}
          onComplexClick={handleComplexClick}
          onGuideClick={handleGuideBridgeClick}
        />

        <GuideRecirculationBlock
          guides={comparisonGuides}
          topicId="school-district-premium"
          onGuideClick={handleGuideBridgeClick}
        />
      </section>
    );
  }

  // ==========================================================================
  // RENDER: ISSUE #3 (`lake-park-view-premium`)
  // ==========================================================================
  if (topicId === 'lake-park-view-premium') {
    const {
      waterfrontGroup,
      southHinterlandGroup,
      cityNonLakeGroup,
      delta,
      lakeDistanceTiers,
      rivalMatchups,
      comparisonGuides,
    } = lakeData;
    const primaryGuide = comparisonGuides[0];

    return (
      <section
        id="lake-park-view-premium"
        data-testid="lake-park-view-premium-section"
        aria-label="동탄호수공원 조망권 및 수변 입지 집값 비교 분석"
        className="w-full flex flex-col gap-5"
      >
        <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800/80">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white">
                  <Waves className="w-3.5 h-3.5" />
                  Issue #3 · 동탄호수공원 수변 집값 비교
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 tabular-nums">
                  수변 핵심권({waterfrontGroup.complexCount}단지) vs 남동탄 배후권({southHinterlandGroup.complexCount}단지)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-primary tracking-tight">
                {delta.headlineQuestion}
              </h2>
              <p className="text-xs sm:text-sm text-secondary font-medium leading-relaxed max-w-3xl">
                {delta.headlineAnswer}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {primaryGuide && (
                <Link
                  href={`/guide/${primaryGuide.slug}`}
                  data-testid="lake-stats-to-guide-cta"
                  onClick={() =>
                    handleGuideBridgeClick(
                      primaryGuide.slug,
                      primaryGuide.title,
                      'lake_hero_cta'
                    )
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>호수공원 vs 동탄역 비교글 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              {onSelectTopic && (
                <button
                  type="button"
                  onClick={() => onSelectTopic('dongtan-station-distance')}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#202027] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-secondary text-xs font-bold transition-colors"
                >
                  Issue #1 동탄역 거리 분석 리포트 보기
                </button>
              )}
            </div>
          </div>

          {/* Area Band Filter */}
          <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
              <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>평형대 기준 호수공원 수변 집값 비교</span>
            </div>
            <div
              role="group"
              aria-label="호수공원 수변 평형대 필터"
              className={getToggleTrackClass('flex flex-wrap gap-1')}
            >
              {AREA_BAND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`lake-area-filter-${opt.value}`}
                  aria-pressed={areaBand === opt.value}
                  onClick={() => handleAreaBandChange(opt.value)}
                  className={getToggleBtnClass(areaBand === opt.value, {
                    size: 'sm',
                    tone: 'blue',
                  })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Side-by-Side Scoreboard: 호수 수변 도보권(≤1km) vs 남동탄 비수변 배후권(1~2.2km) */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
            <div className="lg:col-span-5">
              <GroupSummaryCard
                group={waterfrontGroup}
                accentTone="blue"
                testId="lake-card-waterfront"
                extraMetricLabel="연간 거래 회전율 · 호수 거리"
                extraMetricValue={`연 ${waterfrontGroup.avgAnnualTurnoverPercent}% · 평균 ${waterfrontGroup.avgDistanceToLakeMeters}m`}
                onComplexClick={handleComplexClick}
              />
            </div>

            {/* Center Delta Callout */}
            <div className="lg:col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#202027] border border-slate-200/80 dark:border-slate-800 text-center gap-2">
              <span className="text-[10px] font-extrabold text-tertiary uppercase">수변 격차</span>
              <div
                data-testid="lake-waterfront-price-diff"
                className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 tabular-nums"
              >
                {delta.waterfrontVsHinterlandPriceDiffEokText}
              </div>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-extrabold tabular-nums">
                {delta.waterfrontVsHinterlandPremiumPercent >= 0 ? '+' : ''}
                {delta.waterfrontVsHinterlandPremiumPercent}%
              </span>
              <span className="text-[10px] font-bold text-secondary tabular-nums">
                평당 {delta.waterfrontVsHinterlandPyeongDiffManwon >= 0 ? '+' : ''}
                {delta.waterfrontVsHinterlandPyeongDiffManwon.toLocaleString('ko-KR')}만
              </span>
            </div>

            <div className="lg:col-span-5">
              <GroupSummaryCard
                group={southHinterlandGroup}
                accentTone="emerald"
                testId="lake-card-hinterland"
                extraMetricLabel="연간 거래 회전율 · 호수 거리"
                extraMetricValue={`연 ${southHinterlandGroup.avgAnnualTurnoverPercent}% · 평균 ${southHinterlandGroup.avgDistanceToLakeMeters}m`}
                onComplexClick={handleComplexClick}
              />
            </div>
          </div>

          {/* Citywide Non-Lake Benchmark Bar */}
          <div className="mt-4 p-4 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/70 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400">
                동탄 전역 비수변 단지({cityNonLakeGroup.complexCount}단지) 대비 호수공원 수변권 비교
              </span>
              <p className="text-xs text-secondary font-medium tabular-nums">
                {waterfrontGroup.complexCount > 0 ? (
                  <>
                    호수 수변권 평균{' '}
                    <strong className="text-primary">{waterfrontGroup.weightedAvgPriceEokText}</strong>{' '}
                    (회전율 {waterfrontGroup.avgAnnualTurnoverPercent}%) vs 동탄 비수변 전체 평균{' '}
                    <strong className="text-primary">{cityNonLakeGroup.weightedAvgPriceEokText}</strong>{' '}
                    (회전율 {cityNonLakeGroup.avgAnnualTurnoverPercent}%)
                  </>
                ) : (
                  <>
                    동탄 비수변 전체 평균{' '}
                    <strong className="text-primary">{cityNonLakeGroup.weightedAvgPriceEokText}</strong>{' '}
                    (회전율 {cityNonLakeGroup.avgAnnualTurnoverPercent}%) · 해당 평형 수변권 표본 없음
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 tabular-nums">
              <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-black">
                {waterfrontGroup.complexCount > 0 && cityNonLakeGroup.complexCount > 0
                  ? `전역 대비 ${delta.waterfrontVsCityPriceDiffEokText} (회전율 ${
                      delta.turnoverDiffPercentPoint >= 0 ? '+' : ''
                    }${delta.turnoverDiffPercentPoint}%p)`
                  : '전역 대비 -'}
              </span>
            </div>
          </div>
        </div>

        {/* Lake Distance 4 Tiers */}
        <TierBreakdownBlock
          title="동탄호수공원 거리 4구간별 집값·평당가·회전율 비교"
          subtitle="700m 이내 수변 1열 조망권부터 도보 산책권·남동탄 배후권·비수변권까지의 가격 계단"
          tiers={lakeDistanceTiers}
          extraColumnHeader="연간 회전율"
          renderExtraValue={(t) => `${t.avgAnnualTurnoverPercent}%`}
          onComplexClick={handleComplexClick}
        />

        <RivalMatchupsBlock
          title="동탄호수공원 수변 랜드마크 1:1 실거래 맞대결"
          subtitle="린스트라우스 더레이크 · 더샵 레이크에듀타운 · 더레이크팰리스 · 자연앤푸르지오 가격 대조"
          matchups={rivalMatchups}
          onComplexClick={handleComplexClick}
          onGuideClick={handleGuideBridgeClick}
        />

        <GuideRecirculationBlock
          guides={comparisonGuides}
          topicId="lake-park-view-premium"
          onGuideClick={handleGuideBridgeClick}
        />
      </section>
    );
  }

  // ==========================================================================
  // RENDER: ISSUE #4 (`building-age-depreciation`)
  // ==========================================================================
  const {
    newBuildGroup,
    semiNewGroup,
    midAgeGroup,
    oldBuildGroup,
    delta,
    ageLifecycleTiers,
    rivalMatchups,
    comparisonGuides,
  } = ageData;
  const primaryGuide = comparisonGuides[0];

  return (
    <section
      id="building-age-depreciation"
      data-testid="building-age-depreciation-section"
      aria-label="동탄 아파트 연식별 감가상각 및 전고점 대비 시세 방어율 비교 분석"
      className="w-full flex flex-col gap-5"
    >
      <div className="w-full p-5 sm:p-6 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-5 border-b border-slate-200/70 dark:border-slate-800/80">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white">
                <History className="w-3.5 h-3.5" />
                Issue #4 · 연식별 집값·시세방어율 비교
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 tabular-nums">
                누적 {delta.totalCumulativeSalesCount.toLocaleString('ko-KR')}건 실거래 · 전고점 대비 방어율 실증
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-primary tracking-tight">
              {delta.headlineQuestion}
            </h2>
            <p className="text-xs sm:text-sm text-secondary font-medium leading-relaxed max-w-3xl">
              {delta.headlineAnswer}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {primaryGuide && (
              <Link
                href={`/guide/${primaryGuide.slug}`}
                data-testid="age-stats-to-guide-cta"
                onClick={() =>
                  handleGuideBridgeClick(primaryGuide.slug, primaryGuide.title, 'age_hero_cta')
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>연식·리모델링 전망 분석글 보기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            {onSelectTopic && (
              <button
                type="button"
                onClick={() => onSelectTopic('dongtan-station-distance')}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-[#202027] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-secondary text-xs font-bold transition-colors"
              >
                Issue #1 동탄역 거리 분석 리포트 보기
              </button>
            )}
          </div>
        </div>

        {/* Area Band Filter */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-secondary">
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>평형대 기준 연식별 집값 · 시세 방어율 비교</span>
          </div>
          <div
            role="group"
            aria-label="연식별 집값 평형대 필터"
            className={getToggleTrackClass('flex flex-wrap gap-1')}
          >
            {AREA_BAND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-testid={`age-area-filter-${opt.value}`}
                aria-pressed={areaBand === opt.value}
                onClick={() => handleAreaBandChange(opt.value)}
                className={getToggleBtnClass(areaBand === opt.value, {
                  size: 'sm',
                  tone: 'blue',
                })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Side-by-Side Scoreboard: 신축(≤5년) vs 구축(16년+) */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-11 gap-4 items-stretch">
          <div className="lg:col-span-5">
            <GroupSummaryCard
              group={newBuildGroup}
              accentTone="blue"
              testId="age-card-new"
              extraMetricLabel="평균 준공연도 · 누적 거래"
              extraMetricValue={`${newBuildGroup.avgBuiltYear}년 (${newBuildGroup.avgBuildingAge}년차) · ${newBuildGroup.allTimeTxVolume.toLocaleString('ko-KR')}건`}
              onComplexClick={handleComplexClick}
            />
          </div>

          <div className="lg:col-span-1 flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-[#202027] border border-slate-200/80 dark:border-slate-800 text-center gap-2">
            <span className="text-[10px] font-extrabold text-tertiary uppercase">신축vs구축</span>
            <div
              data-testid="age-new-vs-old-price-diff"
              className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 tabular-nums"
            >
              {delta.newVsOldPriceDiffEokText}
            </div>
            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[11px] font-extrabold tabular-nums">
              {delta.newVsOldPricePremiumPercent >= 0 ? '+' : ''}
              {delta.newVsOldPricePremiumPercent}%
            </span>
            <span className="text-[10px] font-bold text-secondary tabular-nums">
              평당 {delta.newVsOldPyeongDiffManwon >= 0 ? '+' : ''}
              {delta.newVsOldPyeongDiffManwon.toLocaleString('ko-KR')}만
            </span>
          </div>

          <div className="lg:col-span-5">
            <GroupSummaryCard
              group={oldBuildGroup}
              accentTone="emerald"
              testId="age-card-old"
              extraMetricLabel="평균 준공연도 · 누적 거래"
              extraMetricValue={`${oldBuildGroup.avgBuiltYear}년 (${oldBuildGroup.avgBuildingAge}년차) · ${oldBuildGroup.allTimeTxVolume.toLocaleString('ko-KR')}건`}
              onComplexClick={handleComplexClick}
            />
          </div>
        </div>

        {/* Mid-Age (11~15y) & Semi-New (6~10y) Insight Strip */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 tabular-nums">
            <div>
              <span className="text-[11px] font-extrabold text-blue-600 dark:text-blue-400 block">
                준신축 주력군 (6~10년차 · {semiNewGroup.complexCount}개 단지)
              </span>
              <span className="text-xs text-secondary font-medium">
                {semiNewGroup.complexCount > 0 ? (
                  <>
                    1년 평균 <strong className="text-primary">{semiNewGroup.weightedAvgPriceEokText}</strong>{' '}
                    (평당 {semiNewGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만) · 방어율{' '}
                    {semiNewGroup.avgPriceRetentionPercent}%
                  </>
                ) : (
                  '해당 평형대 표본 단지 없음'
                )}
              </span>
            </div>
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-[#202027] border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 tabular-nums">
            <div>
              <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block">
                11~15년차 시범벨트 역전 현상 ({midAgeGroup.complexCount}개 단지)
              </span>
              <span className="text-xs text-secondary font-medium">
                {midAgeGroup.complexCount > 0 ? (
                  <>
                    1년 평균 <strong className="text-primary">{midAgeGroup.weightedAvgPriceEokText}</strong>{' '}
                    (평당 {midAgeGroup.weightedAvgPyeongManwon.toLocaleString('ko-KR')}만) · 방어율{' '}
                    {midAgeGroup.avgPriceRetentionPercent}%
                  </>
                ) : (
                  '해당 평형대 표본 단지 없음'
                )}
              </span>
            </div>
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Building Age 4 Tiers */}
      <TierBreakdownBlock
        title="연식 4구간별(신축·준신축·중기·구축) 집값 및 전고점 시세 방어율 비교"
        subtitle="약 6.6만 건 누적 실거래의 역대 최고가(전고점) 대비 현재 실거래가 방어율 실증 비교"
        tiers={ageLifecycleTiers}
        extraColumnHeader="전고점 방어율"
        renderExtraValue={(t) => `${t.avgPriceRetentionPercent}%`}
        onComplexClick={handleComplexClick}
      />

      <RivalMatchupsBlock
        title="연식별 대표 대장 단지 1:1 집값·방어율 맞대결"
        subtitle="5년차 신축 · 7년차 준신축 · 11년차 시범단지 · 19년차 구축 대표 단지 실거래 대조"
        matchups={rivalMatchups}
        onComplexClick={handleComplexClick}
        onGuideClick={handleGuideBridgeClick}
      />

      <GuideRecirculationBlock
        guides={comparisonGuides}
        topicId="building-age-depreciation"
        onGuideClick={handleGuideBridgeClick}
      />
    </section>
  );
}
