'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Scale,
  BookOpen,
  Building2,
  Table2,
} from 'lucide-react';
import { computeUndervaluedComplexes } from '@/lib/stats/dongtanStationDistanceEngine';
import type {
  ApartmentStatRecord,
  UndervaluedScopeFilter,
  UndervaluedComplexItem,
  UndervaluedRegressionSummary,
} from '@/lib/stats/types';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';
import { getVisualSignalPillClass } from '@/lib/design-system/copyDiet';
import { trackEvent, trackVirtualPageView } from '@/lib/utils/analytics';

export interface StatsUndervaluedTopBridgeProps {
  records?: ApartmentStatRecord[];
  initialSummary?: UndervaluedRegressionSummary;
  onJumpToTable?: (scope: UndervaluedScopeFilter) => void;
  className?: string;
}

const SCOPE_TABS: ReadonlyArray<{ value: UndervaluedScopeFilter; label: string }> = [
  { value: 'all', label: '전체 TOP 4' },
  { value: 'station_core', label: '역세권 (≤1.8km)' },
  { value: 'dongtan1', label: '동탄1 학군·실속' },
];

function formatStationDistanceCompact(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '거리 미상';
  if (meters < 1000) return `동탄역 ${Math.round(meters)}m`;
  return `동탄역 ${(meters / 1000).toFixed(1)}km`;
}

export function StatsUndervaluedTopBridge({
  records,
  initialSummary,
  onJumpToTable,
  className = '',
}: StatsUndervaluedTopBridgeProps) {
  const [scope, setScope] = useState<UndervaluedScopeFilter>(
    initialSummary?.scope ?? 'all'
  );

  const summary = useMemo(() => {
    if (
      initialSummary &&
      initialSummary.scope === scope &&
      records === undefined
    ) {
      return initialSummary;
    }
    return computeUndervaluedComplexes(records, { scope, limit: 4 });
  }, [records, scope, initialSummary]);

  const { items, rSquared, sampleComplexCount } = summary;
  const rSquaredPctText =
    Number.isFinite(rSquared) && rSquared > 0
      ? `R² ${(rSquared * 100).toFixed(1)}%`
      : '실거래 회귀 기준';

  const handleScopeChange = useCallback((nextScope: UndervaluedScopeFilter) => {
    setScope(nextScope);
    trackEvent('stats_undervalued_scope_change', {
      event_category: 'stats_recirculation',
      scope: nextScope,
      surface: 'stats_top_undervalued_bridge',
      trigger: `scope_${nextScope}`,
    });
  }, []);

  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, item: UndervaluedComplexItem) => {
      const isModified =
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        (typeof e.button === 'number' && e.button !== 0);
      const targetHref = `/apartment/${encodeURIComponent(item.canonicalSlug)}`;

      trackEvent('stats_undervalued_card_click', {
        event_category: 'stats_recirculation',
        scope,
        rank: item.rank,
        apartment_name: item.name,
        canonical_slug: item.canonicalSlug,
        dong: item.dong,
        discount_percent: item.discountPercent,
        target_path: targetHref,
        surface: 'stats_top_undervalued_bridge',
        view_type: 'detail_page',
        trigger: `undervalued_rank_${item.rank}`,
      });

      if (!isModified) {
        trackVirtualPageView(targetHref, {
          page_title: `${item.name} 실거래 상세 (회귀 저평가 TOP ${item.rank})`,
          from_surface: 'stats_top_undervalued_bridge',
          scope,
        });
      }
    },
    [scope]
  );

  const handleCompareClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, apt1Slug: string, apt2Slug: string) => {
      const isModified =
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        (typeof e.button === 'number' && e.button !== 0);
      const compareUrl = `/explore?calc=compare&apt1=${encodeURIComponent(apt1Slug)}&apt2=${encodeURIComponent(apt2Slug)}`;

      trackEvent('stats_undervalued_compare_click', {
        event_category: 'stats_recirculation',
        scope,
        apt1: apt1Slug,
        apt2: apt2Slug,
        apartment_name: apt1Slug,
        calculator_type: 'compare',
        surface: 'stats_top_undervalued_bridge',
        trigger: 'undervalued_compare_cta',
      });

      if (!isModified) {
        trackVirtualPageView(compareUrl, {
          page_title: '저평가 대표 단지 1:1 실거래 비교',
          from_surface: 'stats_top_undervalued_bridge',
        });
      }
    },
    [scope]
  );

  const handleGuideClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, slug: string, label: string) => {
      const isModified =
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        (typeof e.button === 'number' && e.button !== 0);
      const guideHref = `/guide/${slug}`;

      trackEvent('stats_to_guide_bridge_click', {
        event_category: 'bidirectional_recirculation',
        from_surface: 'stats_top_undervalued_bridge',
        surface: 'stats_top_undervalued_bridge',
        trigger: 'undervalued_guide_cta',
        to_guide_slug: slug,
        guide_title: label,
        placement: 'stats_top_bridge',
      });

      if (!isModified) {
        trackVirtualPageView(guideHref, {
          page_title: label,
          placement: 'stats_top_bridge',
        });
      }
    },
    []
  );

  const handleTableJump = useCallback(() => {
    trackEvent('stats_undervalued_table_jump', {
      event_category: 'stats_recirculation',
      scope,
      surface: 'stats_top_undervalued_bridge',
      trigger: 'undervalued_table_jump',
    });
    if (onJumpToTable) {
      onJumpToTable(scope);
      return;
    }
    try {
      const el = document.getElementById('stats-complex-drilldown-anchor');
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch {
      // Ignore scroll error in headless test environments
    }
  }, [onJumpToTable, scope]);

  const compareHref =
    items.length >= 2
      ? `/explore?calc=compare&apt1=${encodeURIComponent(items[0].canonicalSlug)}&apt2=${encodeURIComponent(items[1].canonicalSlug)}`
      : null;

  return (
    <section
      id="stats-top-undervalued-bridge"
      data-testid="stats-top-undervalued-bridge"
      aria-label="실거래 회귀 기대가 대비 저평가 TOP 단지 요약"
      className={`w-full rounded-2xl bg-elevated p-4 sm:p-5 border border-border flex flex-col gap-3.5 ${className}`}
    >
      {/* Header & Concentric Scope Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 min-w-0">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h2 className="text-sm sm:text-base font-black text-primary tracking-tight truncate">
              회귀 기대가 대비 저평가 TOP 단지
            </h2>
            <span className={getVisualSignalPillClass({ tone: 'neutral', size: 'xs' })}>
              {sampleComplexCount > 0 ? `${sampleComplexCount}단지 · ${rSquaredPctText}` : rSquaredPctText}
            </span>
          </div>
          <p className="text-[11.5px] sm:text-xs font-semibold text-secondary line-clamp-1">
            동탄역 거리·연식 회귀 기대가 대비 실거래 할인율 상위 단지
          </p>
        </div>

        <div
          role="group"
          aria-label="저평가 단지 권역 필터"
          className={getToggleTrackClass(
            'grid grid-cols-3 sm:inline-flex gap-0.5 w-full sm:w-auto max-w-full self-start lg:self-auto'
          )}
        >
          {SCOPE_TABS.map((tab) => {
            const isActive = scope === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                data-testid={`stats-undervalued-scope-${tab.value}`}
                aria-pressed={isActive}
                onClick={() => handleScopeChange(tab.value)}
                className={getToggleBtnClass(isActive, {
                  size: 'sm',
                  tone: 'neutral',
                  extraClass: 'min-w-0 max-w-full overflow-hidden',
                })}
              >
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4-Column Real-Data Undervalued Apartment Cards */}
      {items.length > 0 ? (
        <div
          data-testid="stats-undervalued-card-grid"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"
        >
          {items.map((item) => (
            <Link
              key={`${scope}-${item.canonicalSlug}`}
              href={`/apartment/${encodeURIComponent(item.canonicalSlug)}`}
              prefetch={false}
              onClick={(e) => handleCardClick(e, item)}
              data-testid="stats-undervalued-apt-card"
              data-apt-slug={item.canonicalSlug}
              data-apt-dong={item.dong}
              aria-label={`${item.name} 회귀 기대가 대비 ${item.discountPercent.toFixed(1)}% 저평가 · 최근 실거래 ${item.latestPriceEokText} 상세 리포트`}
              className="group rounded-2xl bg-surface hover:bg-[#eff1f5]/70 dark:hover:bg-[#1e2532]/80 border border-border hover:border-brand-blue/35 p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 transition-colors no-underline min-h-[148px] min-w-0"
            >
              <div className="space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-secondary tabular-nums truncate min-w-0">
                    <Building2 className="w-3 h-3 text-secondary shrink-0" />
                    <span className="truncate">
                      TOP {item.rank} · {item.dong} ({item.builtYear}년)
                    </span>
                  </span>
                  <span className="w-6 h-6 rounded-lg bg-[#eff1f5] dark:bg-[#1e2532] text-secondary group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-slate-100 dark:group-hover:text-slate-900 inline-flex items-center justify-center transition-colors shrink-0">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <h3 className="text-[13.5px] sm:text-sm font-black text-primary group-hover:text-primary truncate transition-colors">
                  {item.name}
                </h3>

                {/* Single Hero Metric: Regression Discount % + Actual vs Expected */}
                <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-border">
                  <span
                    data-testid="stats-undervalued-discount-pct"
                    className="text-lg sm:text-xl font-black text-brand-blue tabular-nums tracking-tight shrink-0"
                  >
                    {item.discountPercent.toFixed(1)}%
                  </span>
                  <span className="text-[11px] font-bold text-tertiary tabular-nums truncate">
                    실측 {item.actualPyeongManwon.toLocaleString('ko-KR')}만 / 기대{' '}
                    {item.expectedPyeongManwon.toLocaleString('ko-KR')}만
                  </span>
                </div>
              </div>

              {/* Max 2 Supporting Visual Signals (SINGLE_CARD_SIGNAL_CAP = 2) */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                <span className={getVisualSignalPillClass({ tone: 'neutral', size: 'xs' })}>
                  최근 {item.latestPriceEokText}
                </span>
                <span className={getVisualSignalPillClass({ tone: 'neutral', size: 'xs' })}>
                  {formatStationDistanceCompact(item.distanceToStationMeters)} · {item.txCount}건
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div
          data-testid="stats-undervalued-empty"
          className="rounded-xl bg-surface border border-border px-4 py-3 text-xs font-semibold text-secondary"
        >
          선택 조건에서 회귀 기대가 하회 단지가 없습니다.
        </div>
      )}

      {/* Recirculation Action Bar: 1:1 Compare + Ranking/Comparison Guides + Full Table Jump */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
        <div className="flex flex-wrap items-center gap-2">
          {compareHref && items.length >= 2 && (
            <Link
              href={compareHref}
              prefetch={false}
              data-testid="stats-undervalued-compare-cta"
              onClick={(e) =>
                handleCompareClick(e, items[0].canonicalSlug, items[1].canonicalSlug)
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-extrabold transition-colors"
            >
              <Scale className="w-3.5 h-3.5 shrink-0" />
              <span>TOP 1·2 단지 1:1 실거래 비교</span>
              <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
            </Link>
          )}

          <Link
            href="/guide/dongtan-budget-tier-ranking"
            prefetch={false}
            data-testid="stats-undervalued-budget-guide-cta"
            onClick={(e) =>
              handleGuideClick(
                e,
                'dongtan-budget-tier-ranking',
                '동탄 예산별(6억·9억·12억대) 실거래가 랭킹'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border border-border text-primary text-xs font-extrabold transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-secondary shrink-0" />
            <span>예산별(6·9·12억) 실거래 랭킹</span>
          </Link>

          <Link
            href="/guide/dongtan-1-vs-2-comparison"
            prefetch={false}
            data-testid="stats-undervalued-vs-guide-cta"
            onClick={(e) =>
              handleGuideClick(
                e,
                'dongtan-1-vs-2-comparison',
                '1동탄 vs 2동탄 실거래·학군 비교 리포트'
              )
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border border-border text-primary text-xs font-extrabold transition-colors"
          >
            <span>1동탄 vs 2동탄 비교 리포트</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-tertiary shrink-0" />
          </Link>
        </div>

        <button
          type="button"
          data-testid="stats-undervalued-table-jump-btn"
          onClick={handleTableJump}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#eff1f5] hover:bg-slate-200/80 dark:bg-[#1e2532] dark:hover:bg-[#252c3d] text-primary text-xs font-extrabold transition-colors cursor-pointer"
        >
          <Table2 className="w-3.5 h-3.5 shrink-0" />
          <span>127개 단지 전수 비교표 이동</span>
        </button>
      </div>
    </section>
  );
}
