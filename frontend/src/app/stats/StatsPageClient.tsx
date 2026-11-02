'use client';

import React, { Suspense, useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { getDongtanStationAnalysisData } from '@/lib/stats/dongtanStationDistanceEngine';
import type { StatsFilterOptions, Issue1AnalysisPayload } from '@/lib/stats/types';
import { getStatsTopicById } from '@/types/statsTopic';
import { StatsTopicSelector } from '@/components/stats/StatsTopicSelector';
import { StationPremiumSummary } from '@/components/stats/StationPremiumSummary';
import { DistanceBandComparisonChart } from '@/components/stats/DistanceBandComparisonChart';
import { DistanceRegressionScatterPlot } from '@/components/stats/DistanceRegressionScatterPlot';
import { ComplexDrillDownTable } from '@/components/stats/ComplexDrillDownTable';
import { AdSlot } from '@/components/ads/AdSlot';

export interface StatsPageClientProps {
  initialTopicId?: string;
  initialFilters?: Partial<StatsFilterOptions>;
  initialPayload?: Issue1AnalysisPayload;
}

function StatsTopicUrlSync({
  onQueryTopicChange,
}: {
  onQueryTopicChange: (topicId: string) => void;
}) {
  const searchParams = useSearchParams();
  const queryTopic = searchParams?.get('topic');

  useEffect(() => {
    if (queryTopic) {
      onQueryTopicChange(queryTopic);
    }
  }, [queryTopic, onQueryTopicChange]);

  return null;
}

export function StatsPageClient({
  initialTopicId = 'dongtan-station-distance',
  initialFilters,
  initialPayload,
}: StatsPageClientProps) {
  const router = useRouter();
  const [activeTopicId, setActiveTopicId] = useState<string>(initialTopicId);

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

  const handleTopicChange = useCallback((topicId: string) => {
    setActiveTopicId(topicId);
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

  return (
    <div className="w-full flex flex-col gap-6">
      <Suspense fallback={null}>
        <StatsTopicUrlSync onQueryTopicChange={setActiveTopicId} />
      </Suspense>

      {/* Extensible Topic Research Selector */}
      <StatsTopicSelector
        currentTopicId={activeTopicId}
        onSelectTopic={handleTopicChange}
        topicOverrides={topicOverrides}
      />

      {/* Conditional Rendering: Issue #1 Report vs. Upcoming Topic Placeholder */}
      {currentTopic.status === 'active' ? (
        <>
          {/* AdSlot 1: Top Horizontal-Strip */}
          <div className="w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027] overflow-hidden">
            <AdSlot
              refreshSlotId="1000000001_stats_top"
              format="horizontal-strip"
              className="w-full"
            />
          </div>

          {/* Section 1: Executive KPI Cards & Station Premium Summary */}
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
          <div className="w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027] overflow-hidden">
            <AdSlot
              refreshSlotId="1000000002_stats_mid"
              format="in-feed"
              className="w-full"
            />
          </div>

          {/* Section 3: Complex-Level SVG Scatter Plot & OLS Linear Regression Trendline */}
          <DistanceRegressionScatterPlot
            records={payload.filteredRecords}
            regression={payload.regression}
          />

          {/* AdSlot 3: Pre-Table Rectangle Slot */}
          <div className="w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027] overflow-hidden">
            <AdSlot
              refreshSlotId="1000000003_stats_table"
              format="rectangle"
              className="w-full"
            />
          </div>

          {/* Section 4: Interactive Filtering Controls & Sortable Complex Drill-Down Table */}
          <ComplexDrillDownTable
            records={payload.filteredRecords}
            filters={filters}
            onFilterChange={handleFilterChange}
          />

          {/* AdSlot 4: Bottom Banner Slot */}
          <div className="w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027] overflow-hidden">
            <AdSlot
              refreshSlotId="1000000004_stats_bottom"
              format="banner"
              className="w-full"
            />
          </div>
        </>
      ) : (
        /* Upcoming Topic Placeholder */
        <div className="w-full p-8 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027] flex flex-col items-center justify-center text-center min-h-[360px] gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
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
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
            >
              Issue #1 동탄역 거리 분석 리포트 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
