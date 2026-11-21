'use client';

import React, { Suspense, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { getDongtanStationAnalysisData } from '@/lib/stats/dongtanStationDistanceEngine';
import {
  getDongtan1Vs2ComparisonData,
  resolveStatsComplexCanonicalSlug,
  type Dongtan1Vs2ComparisonPayload,
} from '@/lib/stats/dongtan1Vs2ComparisonEngine';
import {
  getSchoolDistrictPremiumData,
  getLakeParkPremiumData,
  getBuildingAgeDepreciationData,
  type SchoolDistrictPremiumPayload,
  type LakeParkPremiumPayload,
  type BuildingAgeDepreciationPayload,
} from '@/lib/stats/thematicPriceComparisonEngine';
import type {
  StatsFilterOptions,
  Issue1AnalysisPayload,
  ApartmentStatRecord,
  AreaBandFilter,
  UndervaluedScopeFilter,
  UndervaluedRegressionSummary,
} from '@/lib/stats/types';
import { getStatsTopicById } from '@/types/statsTopic';
import { StatsTopicSelector } from '@/components/stats/StatsTopicSelector';
import { StatsUndervaluedTopBridge } from '@/components/stats/StatsUndervaluedTopBridge';
import { StationPremiumSummary } from '@/components/stats/StationPremiumSummary';
import { DistanceBandComparisonChart } from '@/components/stats/DistanceBandComparisonChart';
import { DistanceRegressionScatterPlot } from '@/components/stats/DistanceRegressionScatterPlot';
import { ComplexDrillDownTable } from '@/components/stats/ComplexDrillDownTable';
import { Dongtan1Vs2ComparisonSection } from '@/components/stats/Dongtan1Vs2ComparisonSection';
import {
  ThematicPriceComparisonSection,
  type ThematicTopicId,
} from '@/components/stats/ThematicPriceComparisonSection';
import { AdSlot } from '@/components/ads/AdSlot';
import { trackEvent, trackVirtualPageView } from '@/lib/utils/analytics';

export interface StatsPageClientProps {
  initialTopicId?: string;
  initialFilters?: Partial<StatsFilterOptions>;
  initialPayload?: Issue1AnalysisPayload;
  initialUndervaluedSummary?: UndervaluedRegressionSummary;
  initialComparisonData?: Dongtan1Vs2ComparisonPayload;
  initialSchoolData?: SchoolDistrictPremiumPayload;
  initialLakeData?: LakeParkPremiumPayload;
  initialAgeData?: BuildingAgeDepreciationPayload;
}

const THEMATIC_TOPIC_IDS: ReadonlySet<string> = new Set([
  'school-district-premium',
  'lake-park-view-premium',
  'building-age-depreciation',
]);

function isThematicTopicId(topicId: string): topicId is ThematicTopicId {
  return THEMATIC_TOPIC_IDS.has(topicId);
}

function scrollElementBelowStickyHeader(elementId: string) {
  try {
    const el = document.getElementById(elementId);
    if (!el) return;
    const offset = typeof window !== 'undefined' && window.innerWidth >= 768 ? 96 : 64;
    const rect =
      typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
    if (
      typeof window !== 'undefined' &&
      typeof window.scrollTo === 'function' &&
      rect &&
      rect.height > 0
    ) {
      const targetTop = Math.max(
        0,
        (window.scrollY ?? window.pageYOffset ?? 0) + rect.top - offset
      );
      window.scrollTo({ top: targetTop, behavior: 'smooth' });
      return;
    }
    if (typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch {
    // Ignore scroll error in non-browser / test environments
  }
}

function StatsTopicUrlSync({
  initialTopicId,
  onQueryTopicChange,
}: {
  initialTopicId: string;
  onQueryTopicChange: (topicId: string, shouldScroll?: boolean) => void;
}) {
  const searchParams = useSearchParams();
  const queryTopic =
    searchParams?.get('topic') ??
    (typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('topic')
      : null);
  const prevQueryTopicRef = useRef<string | null>(null);

  useEffect(() => {
    if (queryTopic && getStatsTopicById(queryTopic)) {
      if (prevQueryTopicRef.current !== queryTopic) {
        prevQueryTopicRef.current = queryTopic;
        const shouldScroll =
          queryTopic === 'dongtan-1-vs-2-comparison' || isThematicTopicId(queryTopic);
        onQueryTopicChange(queryTopic, shouldScroll);
      }
    } else if (!queryTopic && prevQueryTopicRef.current !== null) {
      prevQueryTopicRef.current = null;
      onQueryTopicChange(initialTopicId, false);
    }
  }, [queryTopic, initialTopicId, onQueryTopicChange]);

  useEffect(() => {
    const handlePopState = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const popTopic = params.get('topic');
        if (popTopic && getStatsTopicById(popTopic)) {
          prevQueryTopicRef.current = popTopic;
          const shouldScroll =
            popTopic === 'dongtan-1-vs-2-comparison' || isThematicTopicId(popTopic);
          onQueryTopicChange(popTopic, shouldScroll);
        } else {
          prevQueryTopicRef.current = null;
          onQueryTopicChange(initialTopicId, false);
        }
      } catch {
        // Ignore in non-browser environments
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [initialTopicId, onQueryTopicChange]);

  return null;
}

export function StatsPageClient({
  initialTopicId = 'dongtan-station-distance',
  initialFilters,
  initialPayload,
  initialUndervaluedSummary,
  initialComparisonData,
  initialSchoolData,
  initialLakeData,
  initialAgeData,
}: StatsPageClientProps) {
  const router = useRouter();
  const [activeTopicId, setActiveTopicId] = useState<string>(initialTopicId);
  const pendingScrollTopicRef = useRef<string | null>(null);
  const [pendingScrollSeq, setPendingScrollSeq] = useState(0);

  const handleQueryTopicChange = useCallback(
    (topicId: string, shouldScroll = false) => {
      if (shouldScroll) {
        pendingScrollTopicRef.current = topicId;
        setPendingScrollSeq((seq) => seq + 1);
      } else {
        pendingScrollTopicRef.current = null;
      }
      setActiveTopicId(topicId);
    },
    []
  );

  useEffect(() => {
    const targetId = pendingScrollTopicRef.current;
    if (!targetId || activeTopicId !== targetId) return;
    pendingScrollTopicRef.current = null;
    scrollElementBelowStickyHeader(targetId);
  }, [activeTopicId, pendingScrollSeq]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const rawHash = window.location.hash.replace(/^#/, '');
    if (!rawHash) return;
    const rafId = window.requestAnimationFrame(() => {
      scrollElementBelowStickyHeader(rawHash);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  // Filters state
  const [filters, setFilters] = useState<StatsFilterOptions>({
    areaBand: initialFilters?.areaBand ?? 'all',
    buildingAge: initialFilters?.buildingAge ?? 'all',
    dong: initialFilters?.dong ?? 'all',
    sortBy: initialFilters?.sortBy ?? 'distance',
  });

  // Calculate analysis payload deterministically from pre-computed station cache (or reuse SSR initialPayload for default filter state)
  const payload = useMemo(() => {
    const isDefaultFilter =
      filters.areaBand === 'all' &&
      filters.buildingAge === 'all' &&
      filters.dong === 'all' &&
      filters.sortBy === 'distance';
    if (isDefaultFilter && initialPayload) {
      return initialPayload;
    }
    return getDongtanStationAnalysisData(filters);
  }, [filters, initialPayload]);

  const comparisonData = useMemo(() => {
    return initialComparisonData ?? getDongtan1Vs2ComparisonData('all');
  }, [initialComparisonData]);

  const schoolData = useMemo(() => {
    return initialSchoolData ?? getSchoolDistrictPremiumData('all');
  }, [initialSchoolData]);

  const lakeData = useMemo(() => {
    return initialLakeData ?? getLakeParkPremiumData('all');
  }, [initialLakeData]);

  const ageData = useMemo(() => {
    return initialAgeData ?? getBuildingAgeDepreciationData('all');
  }, [initialAgeData]);

  const handleTopicChange = useCallback((topicId: string) => {
    setActiveTopicId(topicId);
    trackEvent('stats_topic_select', {
      event_category: 'stats_navigation',
      topic_id: topicId,
    });
    try {
      const params = new URLSearchParams(window.location.search);
      params.set('topic', topicId);
      router.replace(`/stats?${params.toString()}`, { scroll: false });
    } catch {
      // Fallback if running in non-browser environment
    }
  }, [router]);

  const handleFilterChange = useCallback((updated: Partial<StatsFilterOptions>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  }, []);

  const handleSelectTableComplex = useCallback(
    (record: ApartmentStatRecord) => {
      const slug = resolveStatsComplexCanonicalSlug(record.name, record.dong);
      trackEvent('stats_table_complex_click', {
        event_category: 'stats_navigation',
        apartment_name: record.name,
        dong: record.dong,
        canonical_slug: slug,
      });
      trackVirtualPageView(`/apartment/${encodeURIComponent(slug)}`, {
        page_title: `${record.name} 실거래 상세`,
      });
      router.push(`/apartment/${encodeURIComponent(slug)}`);
    },
    [router]
  );

  const handleFilterRegionInTable = useCallback(
    (region: '동탄1' | '동탄2', nextAreaBand?: AreaBandFilter) => {
      setFilters((prev) => ({
        ...prev,
        dong: region,
        areaBand: nextAreaBand ?? prev.areaBand,
        sortBy: 'latestPriceDesc',
      }));
      scrollElementBelowStickyHeader('stats-complex-drilldown-anchor');
    },
    []
  );

  const handleJumpFromUndervaluedBridge = useCallback(
    (scope: UndervaluedScopeFilter) => {
      setFilters({
        areaBand: 'all',
        buildingAge: 'all',
        dong: scope === 'dongtan1' ? '동탄1' : 'all',
        sortBy: scope === 'station_core' ? 'distance' : 'volumeDesc',
      });
      scrollElementBelowStickyHeader('stats-complex-drilldown-anchor');
    },
    []
  );

  const currentTopic = useMemo(() => {
    if (activeTopicId === 'dongtan-station-distance') {
      return payload.topic;
    }
    return getStatsTopicById(activeTopicId) || payload.topic;
  }, [activeTopicId, payload.topic]);

  const topicOverrides = useMemo(
    () => ({
      'dongtan-station-distance': payload.topic,
    }),
    [payload.topic]
  );

  const isComparisonPrimaryView = activeTopicId === 'dongtan-1-vs-2-comparison';
  const activeThematicTopicId = isThematicTopicId(activeTopicId) ? activeTopicId : null;

  return (
    <div className="w-full flex flex-col gap-6">
      <Suspense fallback={null}>
        <StatsTopicUrlSync
          initialTopicId={initialTopicId}
          onQueryTopicChange={handleQueryTopicChange}
        />
      </Suspense>

      {/* Extensible Topic Research Selector */}
      <StatsTopicSelector
        currentTopicId={activeTopicId}
        onSelectTopic={handleTopicChange}
        topicOverrides={topicOverrides}
      />

      {/* Conditional Rendering: Active Report vs. Upcoming Topic Placeholder */}
      {currentTopic.status === 'active' ? (
        <>
          {/* Above-the-Fold Real-Data Regression Undervalued TOP Complexes Bridge */}
          <StatsUndervaluedTopBridge
            initialSummary={initialUndervaluedSummary}
            onJumpToTable={handleJumpFromUndervaluedBridge}
          />

          {/* AdSlot 1: Top Horizontal-Strip */}
          {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
            <div className="w-full rounded-2xl bg-elevated border border-border overflow-hidden empty:hidden">
              <AdSlot
                refreshSlotId="1000000001_stats_top"
                format="horizontal-strip"
                className="w-full"
              />
            </div>
          )}

          {activeThematicTopicId ? (
            <>
              {/* Issue #2 / #3 / #4 Primary View: Thematic House Price Gap Report */}
              <ThematicPriceComparisonSection
                topicId={activeThematicTopicId}
                initialSchoolData={schoolData}
                initialLakeData={lakeData}
                initialAgeData={ageData}
                onSelectTopic={handleTopicChange}
                onApplyTableFilter={handleFilterChange}
              />

              {/* AdSlot 2: Mid In-Feed Slot */}
              {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
                <div className="w-full rounded-2xl bg-elevated border border-border overflow-hidden empty:hidden">
                  <AdSlot
                    refreshSlotId="1000000002_stats_mid"
                    format="in-feed"
                    className="w-full"
                  />
                </div>
              )}

              {/* Dongtan 1 vs Dongtan 2 House Price Comparison & Guide Recirculation Hub */}
              <Dongtan1Vs2ComparisonSection
                initialData={comparisonData}
                onFilterRegionInTable={handleFilterRegionInTable}
              />
            </>
          ) : isComparisonPrimaryView ? (
            <>
              {/* VS Special Topic Primary View: Dongtan 1 vs Dongtan 2 Comparison Hub */}
              <Dongtan1Vs2ComparisonSection
                initialData={comparisonData}
                onFilterRegionInTable={handleFilterRegionInTable}
              />

              {/* AdSlot 2: Mid In-Feed Slot */}
              {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
                <div className="w-full rounded-2xl bg-elevated border border-border overflow-hidden empty:hidden">
                  <AdSlot
                    refreshSlotId="1000000002_stats_mid"
                    format="in-feed"
                    className="w-full"
                  />
                </div>
              )}

              {/* Station Distance Context Summary & Scatter Plot */}
              <StationPremiumSummary
                regression={payload.regression}
                distanceTiers={payload.distanceTiers}
                totalComplexCount={payload.allRecords.length}
                totalTxCount={payload.allRecords.reduce((acc, r) => acc + r.txCount, 0)}
                latestContractDate={payload.datasetMeta?.latestContractDate}
              />
            </>
          ) : (
            <>
              {/* Issue #1 Primary View: Executive KPI Cards & Station Premium Summary */}
              <StationPremiumSummary
                regression={payload.regression}
                distanceTiers={payload.distanceTiers}
                totalComplexCount={payload.allRecords.length}
                totalTxCount={payload.allRecords.reduce((acc, r) => acc + r.txCount, 0)}
                latestContractDate={payload.datasetMeta?.latestContractDate}
              />

              {/* Section 2: 5-Tier Distance Comparison Bar Chart */}
              <DistanceBandComparisonChart
                distanceTiers={payload.distanceTiers}
              />

              {/* AdSlot 2: Mid In-Feed Slot */}
              {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
                <div className="w-full rounded-2xl bg-elevated border border-border overflow-hidden empty:hidden">
                  <AdSlot
                    refreshSlotId="1000000002_stats_mid"
                    format="in-feed"
                    className="w-full"
                  />
                </div>
              )}

              {/* Section 3: Complex-Level SVG Scatter Plot & OLS Linear Regression Trendline */}
              <DistanceRegressionScatterPlot
                records={payload.filteredRecords}
                regression={payload.regression}
              />

              {/* Section 3.5: Dongtan 1 vs Dongtan 2 House Price Comparison & Guide Recirculation Hub */}
              <Dongtan1Vs2ComparisonSection
                initialData={comparisonData}
                onFilterRegionInTable={handleFilterRegionInTable}
              />
            </>
          )}

          {/* AdSlot 3: Pre-Table Rectangle Slot */}
          {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
            <div className="w-full rounded-2xl bg-elevated border border-border overflow-hidden empty:hidden">
              <AdSlot
                refreshSlotId="1000000003_stats_table"
                format="rectangle"
                className="w-full"
              />
            </div>
          )}

          {/* Section 4: Interactive Filtering Controls & Sortable Complex Drill-Down Table */}
          <div id="stats-complex-drilldown-anchor" className="scroll-mt-24 md:scroll-mt-[96px]">
            <ComplexDrillDownTable
              records={payload.filteredRecords}
              filters={filters}
              onFilterChange={handleFilterChange}
              onSelectComplex={handleSelectTableComplex}
            />
          </div>

          {/* AdSlot 4: Bottom Banner Slot */}
          {process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true' && (
            <div className="w-full rounded-2xl bg-elevated border border-border overflow-hidden empty:hidden">
              <AdSlot
                refreshSlotId="1000000004_stats_bottom"
                format="banner"
                className="w-full"
              />
            </div>
          )}
        </>
      ) : (
        /* Upcoming Topic Placeholder */
        <div className="w-full p-8 rounded-2xl bg-elevated border border-border flex flex-col items-center justify-center text-center min-h-[360px] gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#eff1f5] dark:bg-[#1e2532] flex items-center justify-center text-secondary">
            <Clock className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold text-tertiary">
            {currentTopic.badge} · {currentTopic.publishedAt}
          </span>
          <h3 className="text-lg sm:text-xl font-black text-primary max-w-md">
            {currentTopic.title}
          </h3>
          <p className="text-xs sm:text-sm text-secondary font-medium max-w-lg leading-relaxed">
            {currentTopic.subtitle}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTopicChange('dongtan-station-distance')}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-xs font-bold transition-colors"
            >
              동탄역 거리 분석 리포트 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
