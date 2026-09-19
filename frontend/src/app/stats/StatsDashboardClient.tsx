'use client';

import React, { useState, useEffect, useMemo, useTransition, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BarChart3, TrendingUp, Sparkles, Building2 } from 'lucide-react';
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
import { aggregateStats, formatPriceEok } from '@/lib/analytics/statsEngine';
import { StatsFilterBar } from '@/components/stats/StatsFilterBar';
import { HyperlocalInsightCards } from '@/components/stats/HyperlocalInsightCards';
import { StatsTimeTrendChart } from '@/components/stats/StatsTimeTrendChart';
import { StatsPyeongRankingChart } from '@/components/stats/StatsPyeongRankingChart';
import { StatsVolumeDistributionChart } from '@/components/stats/StatsVolumeDistributionChart';
import {
  FilterBottomAdBanner,
  MidFeedAdBanner,
  BottomAnchorAdBanner,
} from '@/components/stats/StatsAdBanners';

export interface StatsDashboardClientProps {
  initialTxs?: RawTransactionRecord[];
  initialRents?: RawRentRecord[];
  initialMacroTrend?: DongtanMacroTrendPoint[];
  initialSummaryMap?: Record<string, AptTxSummary>;
  initialRegion?: RegionFilter;
  initialPyeong?: PyeongFilter;
  initialTimeframe?: TimeframeFilter;
  initialSort?: SortOption;
  testMode?: boolean;
}

// In-memory global chunk cache to prevent duplicate fetches across filter changes
const clientDataCache: {
  transactions1y?: RawTransactionRecord[];
  transactionsAll?: RawTransactionRecord[];
} = {};

export function StatsDashboardClient({
  initialTxs = [],
  initialRents = [],
  initialMacroTrend = [],
  initialSummaryMap = {},
  initialRegion = 'ALL',
  initialPyeong = 'ALL',
  initialTimeframe = 'ALL',
  initialSort = 'PYEONG_DESC',
  testMode = false,
}: StatsDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Query Sync initialization
  const urlRegion = (searchParams?.get('region') as RegionFilter) || initialRegion;
  const urlPyeong = (searchParams?.get('pyeong') as PyeongFilter) || initialPyeong;
  const urlTimeframe = (searchParams?.get('timeframe') as TimeframeFilter) || initialTimeframe;
  const urlSort = (searchParams?.get('sort') as SortOption) || initialSort;

  const [region, setRegion] = useState<RegionFilter>(urlRegion);
  const [dong, setDong] = useState<string>('');
  const [pyeong, setPyeong] = useState<PyeongFilter>(urlPyeong);
  const [timeframe, setTimeframe] = useState<TimeframeFilter>(urlTimeframe);
  const [sort, setSort] = useState<SortOption>(urlSort);

  const [isPending, startTransition] = useTransition();

  // Active dataset state
  const [baseTxs, setBaseTxs] = useState<RawTransactionRecord[]>(initialTxs);
  const [rents, setRents] = useState<RawRentRecord[]>(initialRents);
  const [macroTrend, setMacroTrend] = useState<DongtanMacroTrendPoint[]>(initialMacroTrend);
  const [summaryMap, setSummaryMap] = useState<Record<string, AptTxSummary>>(initialSummaryMap);
  const [isLoadingChunk, setIsLoadingChunk] = useState(false);

  // If initialTxs was not provided (client-side navigation), fetch recent transactions
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
          if (sumRes && typeof sumRes === 'object') setSummaryMap(sumRes as Record<string, AptTxSummary>);
        }
      } catch (err) {
        // Fallback gracefully on static error
      }
    }

    loadInitialStaticAssets();
    return () => {
      isMounted = false;
    };
  }, [baseTxs.length]);

  // On-demand chunk loading for 1Y and ALL timeframes (Zero-Firestore Cost CDN fetching)
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
          if (Array.isArray(data) && data.length > 0) {
            clientDataCache.transactions1y = data;
            setBaseTxs(data);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoadingChunk(false));
    } else if (timeframe === 'ALL') {
      if (clientDataCache.transactionsAll) {
        setBaseTxs(clientDataCache.transactionsAll);
        return;
      }
      // Try to load 1y first or all
      if (!clientDataCache.transactions1y) {
        fetch('/data/transactions-1y.json')
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (Array.isArray(data) && data.length > 0) {
              clientDataCache.transactions1y = data;
              setBaseTxs(data);
            }
          })
          .catch(() => {});
      }
    }
  }, [timeframe, testMode, baseTxs.length]);

  // URL synchronization handler (without full page reloads)
  const syncUrlParams = useCallback(
    (newRegion: string, newPyeong: string, newTf: string, newSort: string) => {
      try {
        const params = new URLSearchParams();
        if (newRegion !== 'ALL') params.set('region', newRegion);
        if (newPyeong !== 'ALL') params.set('pyeong', newPyeong);
        if (newTf !== 'ALL') params.set('timeframe', newTf);
        if (newSort !== 'PYEONG_DESC') params.set('sort', newSort);

        const qs = params.toString();
        const nextUrl = qs ? `/stats?${qs}` : '/stats';
        router.replace(nextUrl, { scroll: false });
      } catch {
        // Safe navigation catch
      }
    },
    [router]
  );

  const handleRegionChange = (newRegion: RegionFilter) => {
    startTransition(() => {
      setRegion(newRegion);
      syncUrlParams(newRegion, pyeong, timeframe, sort);
    });
  };

  const handleDongChange = (newDong: string) => {
    setDong(newDong);
  };

  const handlePyeongChange = (newPyeong: PyeongFilter) => {
    startTransition(() => {
      setPyeong(newPyeong);
      syncUrlParams(region, newPyeong, timeframe, sort);
    });
  };

  const handleTimeframeChange = (newTf: TimeframeFilter) => {
    startTransition(() => {
      setTimeframe(newTf);
      syncUrlParams(region, pyeong, newTf, sort);
    });
  };

  const handleSortChange = (newSort: SortOption) => {
    startTransition(() => {
      setSort(newSort);
      syncUrlParams(region, pyeong, timeframe, newSort);
    });
  };

  const handleResetFilters = () => {
    startTransition(() => {
      setRegion('ALL');
      setDong('');
      setPyeong('ALL');
      setTimeframe('ALL');
      setSort('PYEONG_DESC');
      router.replace('/stats', { scroll: false });
    });
  };

  const handleSelectComplex = (aptKey: string, aptName: string) => {
    router.push(`/explore?apt=${encodeURIComponent(aptName)}`);
  };

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
    <main
      data-testid="stats-dashboard-container"
      className="w-full min-h-[100dvh] bg-body flex flex-col text-primary"
    >
      {/* 1. Header Hero */}
      <section className="w-full border-b border-border/60 bg-surface/50">
        <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-6 sm:py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-black mb-2">
                <BarChart3 size={13} />
                <span>동탄 신도시 부동산 통계 리포트</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                동탄 실거래 통계 리포트
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                182개 단지 전수 통계 및 하이퍼로컬 시세 지표
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-xl bg-body border border-border/60 text-xs font-bold text-slate-600 dark:text-slate-300">
                실거래 표본: <span className="text-teal-600 font-extrabold">{statsData.totalVolume.toLocaleString()}건</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Filter Bar */}
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

      {/* Main Content Dashboard */}
      <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-6 flex flex-col gap-6">
        {/* 3. KPI Cards Grid */}
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
        />

        {/* 6. Section 1: Time-Series Price & Volume Trend Chart */}
        <StatsTimeTrendChart
          data={statsData.timeSeriesTrend}
          isLoading={isPending}
        />

        {/* 7. Strategic Ad Placement 2: Mid-Feed In-Feed Slot */}
        <MidFeedAdBanner testMode={testMode} />

        {/* 8. 2-Column Grid: Pyeong Ranking Table/Bar Chart & Volume Distribution Donut */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* Left Column (7 cols): TOP 20 Pyeong Price Rankings */}
          <div className="lg:col-span-7">
            <StatsPyeongRankingChart
              rankings={statsData.pyeongRankings}
              onSelectComplex={handleSelectComplex}
              isLoading={isPending}
              testMode={testMode}
            />
          </div>

          {/* Right Column (5 cols): Donut Volume Distribution */}
          <div className="lg:col-span-5">
            <StatsVolumeDistributionChart
              distribution={statsData.volumeDistribution}
              isLoading={isPending}
            />
          </div>
        </div>

        {/* 9. Strategic Ad Placement 4: Bottom Anchor High-Conversion Banner */}
        <BottomAnchorAdBanner testMode={testMode} />
      </div>
    </main>
  );
}

export default StatsDashboardClient;
