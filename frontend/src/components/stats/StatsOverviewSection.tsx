'use client';

import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import { BarChart3 } from 'lucide-react';
import type {
  RegionFilter,
  PyeongFilter,
  TimeframeFilter,
  SortOption,
  StatsAggregateResult,
  RawTransactionRecord,
  RawRentRecord,
} from '@/types/stats';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types/transaction';
import { aggregateStats } from '@/lib/analytics/statsEngine';
import { normalizeAptName } from '@/lib/utils/apartmentMapping';
import { parsePeriodTransactions } from '@/lib/services/staticDataService';
import { StatsFilterBar } from '@/components/stats/StatsFilterBar';
import { HyperlocalInsightCards } from '@/components/stats/HyperlocalInsightCards';
import dynamic from 'next/dynamic';
import { useInView } from '@/hooks/useInView';
import {
  TimeTrendChartSkeleton,
  PyeongRankingChartSkeleton,
  VolumeDistributionChartSkeleton,
} from '@/components/stats/ChartSkeletons';

const StatsTimeTrendChart = dynamic(
  () => import('@/components/stats/StatsTimeTrendChart'),
  {
    ssr: false,
    loading: () => <TimeTrendChartSkeleton />,
  }
);

const StatsPyeongRankingChart = dynamic(
  () => import('@/components/stats/StatsPyeongRankingChart'),
  {
    ssr: false,
    loading: () => <PyeongRankingChartSkeleton />,
  }
);

const StatsVolumeDistributionChart = dynamic(
  () => import('@/components/stats/StatsVolumeDistributionChart'),
  {
    ssr: false,
    loading: () => <VolumeDistributionChartSkeleton />,
  }
);

import {
  FilterBottomAdBanner,
  MidFeedAdBanner,
} from '@/components/stats/StatsAdBanners';

export interface StatsOverviewSectionProps {
  initialData?: {
    transactions?: RawTransactionRecord[];
    macroTrend?: DongtanMacroTrendPoint[];
    summaryMap?: Record<string, AptTxSummary>;
  };
  recentTransactions?: RawTransactionRecord[];
  macroTrendData?: DongtanMacroTrendPoint[];
  txSummaryData?: Record<string, AptTxSummary> | { summary?: Record<string, AptTxSummary> };
  onSelectApt?: (aptName: string, dong?: string) => void;
  onOpenJeonseSafety?: (aptName?: string) => void;
  onOpenCompare?: (aptName?: string) => void;
  initialRegion?: RegionFilter;
  initialPyeong?: PyeongFilter;
  initialTimeframe?: TimeframeFilter;
  initialSort?: SortOption;
  testMode?: boolean;
  className?: string;
}

// In-memory global chunk cache to prevent duplicate fetches across filter changes
const clientDataCache: {
  transactions1y?: RawTransactionRecord[];
  transactionsAll?: RawTransactionRecord[];
} = {};

export function StatsOverviewSection({
  initialData,
  recentTransactions,
  macroTrendData,
  txSummaryData,
  onSelectApt,
  onOpenJeonseSafety,
  onOpenCompare,
  initialRegion = 'ALL',
  initialPyeong = 'ALL',
  initialTimeframe = '3M',
  initialSort = 'PYEONG_DESC',
  testMode = false,
  className = '',
}: StatsOverviewSectionProps) {
  // Resolve initial data from either initialData prop or individual props
  const resolvedInitialTxs = initialData?.transactions || recentTransactions || [];
  const resolvedInitialTrend = initialData?.macroTrend || macroTrendData || [];
  const rawSummary = initialData?.summaryMap || txSummaryData || {};
  const resolvedInitialSummary = (rawSummary as { summary?: Record<string, AptTxSummary> })?.summary || (rawSummary as Record<string, AptTxSummary>);

  const [region, setRegion] = useState<RegionFilter>(initialRegion);
  const [dong, setDong] = useState<string>('');
  const [pyeong, setPyeong] = useState<PyeongFilter>(initialPyeong);
  const [timeframe, setTimeframe] = useState<TimeframeFilter>(initialTimeframe);
  const [sort, setSort] = useState<SortOption>(initialSort);

  const [isPending, startTransition] = useTransition();

  // Active dataset state
  const [baseTxs, setBaseTxs] = useState<RawTransactionRecord[]>(resolvedInitialTxs);
  const [rents, _setRents] = useState<RawRentRecord[]>([]);
  const [macroTrend, setMacroTrend] = useState<DongtanMacroTrendPoint[]>(resolvedInitialTrend);
  const [summaryMap, setSummaryMap] = useState<Record<string, AptTxSummary>>(resolvedInitialSummary);
  const [isLoadingChunk, setIsLoadingChunk] = useState(false);

  // Viewport-based lazy mounting hooks with 250px lookahead buffer
  const [timeTrendRef, timeTrendInView] = useInView<HTMLDivElement>({
    rootMargin: '250px 0px',
    testMode,
  });
  const [rankingRef, rankingInView] = useInView<HTMLDivElement>({
    rootMargin: '250px 0px',
    testMode,
  });
  const [volumeRef, volumeInView] = useInView<HTMLDivElement>({
    rootMargin: '250px 0px',
    testMode,
  });

  // Sync state if props update
  useEffect(() => {
    if (resolvedInitialTxs.length > 0 && baseTxs.length === 0) {
      setBaseTxs(resolvedInitialTxs);
    }
  }, [resolvedInitialTxs, baseTxs.length]);

  useEffect(() => {
    if (resolvedInitialTrend.length > 0 && macroTrend.length === 0) {
      setMacroTrend(resolvedInitialTrend);
    }
  }, [resolvedInitialTrend, macroTrend.length]);

  useEffect(() => {
    if (Object.keys(resolvedInitialSummary).length > 0 && Object.keys(summaryMap).length === 0) {
      setSummaryMap(resolvedInitialSummary);
    }
  }, [resolvedInitialSummary, summaryMap]);

  // If baseTxs is empty, fetch static assets as fallback
  useEffect(() => {
    if (baseTxs.length > 0) return;

    let isMounted = true;
    async function loadInitialStaticAssets() {
      try {
        const [txsRes, macroRes, sumRes] = await Promise.all([
          fetch('/data/recent-transactions.json').then((r) => (r.ok ? r.json() : [])),
          fetch('/data/macro-trend.json').then((r) => (r.ok ? r.json() : [])),
          fetch('/data/tx-summary.json').then((r) => (r.ok ? r.json() : {})),
        ]);

        if (isMounted) {
          if (Array.isArray(txsRes) && txsRes.length > 0) setBaseTxs(txsRes);
          if (Array.isArray(macroRes) && macroRes.length > 0) setMacroTrend(macroRes);
          if (sumRes && typeof sumRes === 'object') {
            const parsedSummary = (sumRes as { summary?: Record<string, AptTxSummary> })?.summary || (sumRes as Record<string, AptTxSummary>);
            setSummaryMap(parsedSummary);
          }
        }
      } catch {
        // Fallback gracefully on static error
      }
    }

    loadInitialStaticAssets();
    return () => {
      isMounted = false;
    };
  }, [baseTxs.length]);

  // On-demand chunk loading for 1Y and ALL timeframes
  useEffect(() => {
    if (testMode || baseTxs.length >= 10000) return;

    if (timeframe === '1Y') {
      if (clientDataCache.transactions1y) {
        setBaseTxs(clientDataCache.transactions1y);
        return;
      }
      setIsLoadingChunk(true);
      fetch('/data/transactions-1y.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const parsed = parsePeriodTransactions(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            clientDataCache.transactions1y = parsed as unknown as RawTransactionRecord[];
            setBaseTxs(parsed as unknown as RawTransactionRecord[]);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingChunk(false));
    } else if (timeframe === 'ALL') {
      if (clientDataCache.transactionsAll) {
        setBaseTxs(clientDataCache.transactionsAll);
        return;
      }
      setIsLoadingChunk(true);
      fetch('/data/transactions-all.json')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const parsed = parsePeriodTransactions(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            clientDataCache.transactionsAll = parsed as unknown as RawTransactionRecord[];
            setBaseTxs(parsed as unknown as RawTransactionRecord[]);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingChunk(false));
    }
  }, [timeframe, testMode, baseTxs.length]);

  const handleRegionChange = useCallback((newRegion: RegionFilter) => {
    startTransition(() => {
      setRegion(newRegion);
    });
  }, []);

  const handleDongChange = useCallback((newDong: string) => {
    setDong(newDong);
  }, []);

  const handlePyeongChange = useCallback((newPyeong: PyeongFilter) => {
    startTransition(() => {
      setPyeong(newPyeong);
    });
  }, []);

  const handleTimeframeChange = useCallback((newTf: TimeframeFilter) => {
    startTransition(() => {
      setTimeframe(newTf);
    });
  }, []);

  const handleSortChange = useCallback((newSort: SortOption) => {
    startTransition(() => {
      setSort(newSort);
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    startTransition(() => {
      setRegion('ALL');
      setDong('');
      setPyeong('ALL');
      setTimeframe('ALL');
      setSort('PYEONG_DESC');
    });
  }, []);

  const handleSelectComplex = useCallback((_aptKey: string, aptName: string) => {
    const summary = summaryMap?.[aptName] || summaryMap?.[normalizeAptName(aptName)];
    const dongVal = summary?.dong;
    onSelectApt?.(aptName, dongVal);
  }, [summaryMap, onSelectApt]);

  const handleOpenJeonseSafety = useCallback((aptName?: string) => {
    if (onOpenJeonseSafety) {
      onOpenJeonseSafety(aptName);
    } else if (aptName) {
      handleSelectComplex('', aptName);
    }
  }, [onOpenJeonseSafety, handleSelectComplex]);

  const handleOpenCompare = useCallback((aptName?: string) => {
    if (onOpenCompare) {
      onOpenCompare(aptName);
    } else if (aptName) {
      handleSelectComplex('', aptName);
    }
  }, [onOpenCompare, handleSelectComplex]);

  // High-performance In-Memory Master Analytics Aggregation (<10ms)
  const statsData: StatsAggregateResult = useMemo(() => {
    return aggregateStats(
      {
        transactions: baseTxs,
        rents,
        macroTrend,
        summaryMap,
      },
      {
        region,
        dong,
        pyeong,
        timeframe,
        sort,
      },
      {
        sortBy: sort,
        rankLimit: 20,
      }
    );
  }, [baseTxs, rents, macroTrend, summaryMap, region, dong, pyeong, timeframe, sort]);

  return (
    <section
      data-testid="stats-overview-section"
      id="stats-overview-section"
      className={`w-full flex flex-col gap-6 mb-6 box-border ${className}`}
    >
      <div data-testid="stats-dashboard-container" className="w-full flex flex-col gap-6">
        {/* 1. Header / Section Title */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-black mb-2">
              <BarChart3 size={13} />
              <span>동탄 신도시 거시 부동산 통계</span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              동탄 실거래 통계 지표 & 하이퍼로컬 인사이트
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              182개 단지 전수 실거래 기반 5차원 심층 통계 및 실시간 시장 분석
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-body border border-border/60 text-xs font-bold text-slate-600 dark:text-slate-300">
              실거래 표본: <span className="text-teal-600 font-extrabold">{statsData.totalVolume.toLocaleString()}건</span>
            </div>
          </div>
        </div>

        {/* 2. Interactive 5D Filter Bar */}
        <StatsFilterBar
          region={region}
          dong={dong}
          pyeong={pyeong}
          timeframe={timeframe}
          sort={sort}
          onRegionChange={handleRegionChange}
          onDongChange={handleDongChange}
          onPyeongChange={handlePyeongChange}
          onTimeframeChange={handleTimeframeChange}
          onSortChange={handleSortChange}
          onReset={handleResetFilters}
          isPending={isPending || isLoadingChunk}
        />

        {/* 3. 4 Core KPI Cards Grid */}
        <div data-testid="stats-kpi-grid" className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* KPI 1: 총 거래량 */}
          <div
            data-testid="kpi-total-volume"
            className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">총 거래량</span>
              {statsData.volumeChangeMoM !== 0 && (
                <span
                  className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-md ${
                    statsData.volumeChangeMoM > 0
                      ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40'
                      : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'
                  }`}
                >
                  전월대비 {statsData.volumeChangeMoM > 0 ? `+${statsData.volumeChangeMoM}%` : `${statsData.volumeChangeMoM}%`}
                </span>
              )}
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              {statsData.totalVolume}건
            </p>
          </div>

          {/* KPI 2: 평균 매매가 */}
          <div
            data-testid="kpi-avg-sale-price"
            className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-slate-400">평균 매매가</span>
            <p className="text-xl sm:text-2xl font-black text-teal-600 dark:text-teal-400 mt-2">
              {statsData.avgSalePrice > 0 ? `${statsData.avgSalePrice.toLocaleString()}만원` : '-'}
            </p>
          </div>

          {/* KPI 3: 평당가 */}
          <div
            data-testid="kpi-avg-pyeong-price"
            className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-slate-400">평당가</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              {statsData.avgPyeongPrice > 0
                ? `${statsData.avgPyeongPrice.toLocaleString()}만원/평`
                : '-'}
            </p>
          </div>

          {/* KPI 4: 평균 전세가율 */}
          <div
            data-testid="kpi-avg-jeonse-ratio"
            className="p-4 sm:p-5 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between"
          >
            <span className="text-xs font-bold text-slate-400">평균 전세가율</span>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              {statsData.avgJeonseRatio > 0 ? `${statsData.avgJeonseRatio}%` : '-'}
            </p>
          </div>
        </div>

        {/* 4. Strategic Ad Placement 1: Filter Bottom Leaderboard */}
        <FilterBottomAdBanner testMode={testMode} />

        {/* 5. Hyperlocal Insight Summary Cards (4 high-dwell-time engagement anchors) */}
        <HyperlocalInsightCards
          insights={statsData.insights}
          onSelectComplex={handleSelectComplex}
          onOpenJeonseSafety={onOpenJeonseSafety ? handleOpenJeonseSafety : undefined}
          onOpenCompare={onOpenCompare ? handleOpenCompare : undefined}
        />

        {/* 6. Section 1: Time-Series Price & Volume Trend Chart */}
        <div ref={timeTrendRef} className="w-full min-h-[240px] md:min-h-[280px]">
          {timeTrendInView ? (
            <StatsTimeTrendChart
              data={statsData.timeSeriesTrend}
              isLoading={isPending}
            />
          ) : (
            <TimeTrendChartSkeleton />
          )}
        </div>

        {/* 7. Strategic Ad Placement 2: Mid-Feed In-Feed Slot */}
        <MidFeedAdBanner testMode={testMode} />

        {/* 8. 2-Column Grid: Pyeong Ranking Table/Bar Chart & Volume Distribution Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* Left Column (7 cols): TOP 20 Pyeong Price Rankings */}
          <div ref={rankingRef} className="lg:col-span-7 min-h-[240px] md:min-h-[280px]">
            {rankingInView ? (
              <StatsPyeongRankingChart
                rankings={statsData.pyeongRankings}
                onSelectComplex={handleSelectComplex}
                isLoading={isPending}
                testMode={testMode}
              />
            ) : (
              <PyeongRankingChartSkeleton />
            )}
          </div>

          {/* Right Column (5 cols): Donut Volume Distribution */}
          <div ref={volumeRef} className="lg:col-span-5 min-h-[200px]">
            {volumeInView ? (
              <StatsVolumeDistributionChart
                distribution={statsData.volumeDistribution}
                isLoading={isPending}
              />
            ) : (
              <VolumeDistributionChartSkeleton />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default StatsOverviewSection;
