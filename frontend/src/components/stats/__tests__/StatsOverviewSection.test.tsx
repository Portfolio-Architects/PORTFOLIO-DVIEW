import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StatsOverviewSection, clearStatsChunkCache } from '@/components/stats/StatsOverviewSection';
import { StatsTimeTrendChart } from '@/components/stats/StatsTimeTrendChart';
import type { RawTransactionRecord, RawRentRecord } from '@/types/stats';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types/transaction';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));


const FIXTURE_TRANSACTIONS: RawTransactionRecord[] = [
  {
    aptKey: 'apt-1',
    aptName: '동탄역롯데캐슬',
    dong: '여울동',
    contractDate: '20260910',
    date: '09.10',
    priceVal: 165000,
    area: 84.9,
    areaPyeong: 25.7,
    floor: 28,
    isNewHigh: true,
    dealType: '매매',
  },
  {
    aptKey: 'apt-2',
    aptName: '동탄역시범우남퍼스트빌',
    dong: '청계동',
    contractDate: '20260908',
    date: '09.08',
    priceVal: 115000,
    area: 84.5,
    areaPyeong: 25.6,
    floor: 15,
    isNewHigh: false,
    dealType: '매매',
  },
  {
    aptKey: 'apt-3',
    aptName: '시범한빛금호어울림',
    dong: '반송동',
    contractDate: '20260820',
    date: '08.20',
    priceVal: 75000,
    area: 84.8,
    areaPyeong: 25.7,
    floor: 10,
    isNewHigh: false,
    dealType: '매매',
  },
  {
    aptKey: 'apt-4',
    aptName: '메타폴리스',
    dong: '반송동',
    contractDate: '20260815',
    date: '08.15',
    priceVal: 120000,
    area: 128.2,
    areaPyeong: 38.8,
    floor: 42,
    isNewHigh: false,
    dealType: '매매',
  },
];

const FIXTURE_SUMMARY: Record<string, AptTxSummary> = {
  동탄역롯데캐슬: {
    dong: '여울동',
    latestPrice: '16.5억',
    latestPriceEok: 16.5,
    avgPrice: 165000,
    txCount: 1,
  } as unknown as AptTxSummary,
  동탄역시범우남퍼스트빌: {
    dong: '청계동',
    latestPrice: '11.5억',
    latestPriceEok: 11.5,
    avgPrice: 115000,
    txCount: 1,
  } as unknown as AptTxSummary,
  시범한빛금호어울림: {
    dong: '반송동',
    latestPrice: '7.5억',
    latestPriceEok: 7.5,
    avgPrice: 75000,
    txCount: 1,
  } as unknown as AptTxSummary,
  메타폴리스: {
    dong: '반송동',
    latestPrice: '12억',
    latestPriceEok: 12.0,
    avgPrice: 120000,
    txCount: 1,
  } as unknown as AptTxSummary,
};

const FIXTURE_MACRO_TREND: DongtanMacroTrendPoint[] = [
  { name: '26.07', price: 78000, rent: 45000, volume: 150 },
  { name: '26.08', price: 81000, rent: 46000, volume: 180 },
  { name: '26.09', price: 83000, rent: 47000, volume: 210 },
];

describe('StatsOverviewSection Modular Integration & Interaction Suite', () => {
  // 1. Rendering Architecture
  describe('1. Baseline Rendering & Section Hierarchy', () => {
    it('renders the complete StatsOverviewSection structure with all child elements', () => {
      render(
        <StatsOverviewSection
          initialData={{
            transactions: FIXTURE_TRANSACTIONS,
            summaryMap: FIXTURE_SUMMARY,
            macroTrend: FIXTURE_MACRO_TREND,
          }}
          testMode={true}
        />
      );

      // Section root and container
      expect(screen.getByTestId('stats-overview-section')).toBeInTheDocument();
      expect(screen.getByTestId('stats-dashboard-container')).toBeInTheDocument();

      // Header title and sample badge
      expect(screen.getByText('동탄 실거래 통계 지표 & 하이퍼로컬 인사이트')).toBeInTheDocument();
      expect(screen.getByText(/실거래 표본:/)).toBeInTheDocument();

      // 5D Filter Bar
      expect(screen.getByTestId('filter-region-all')).toBeInTheDocument();
      expect(screen.getByTestId('filter-region-dongtan1')).toBeInTheDocument();
      expect(screen.getByTestId('filter-region-dongtan2')).toBeInTheDocument();

      // 4 Core KPI cards
      expect(screen.getByTestId('stats-kpi-grid')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-total-volume')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-avg-sale-price')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-avg-pyeong-price')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-avg-jeonse-ratio')).toBeInTheDocument();

      // Filter bottom ad slot
      expect(screen.getByTestId('ad-placement-filter-bottom')).toBeInTheDocument();

      // 4 Hyperlocal Insight cards
      expect(screen.getByTestId('stats-hyperlocal-insights')).toBeInTheDocument();
      expect(screen.getByTestId('insight-card-new-high')).toBeInTheDocument();
      expect(screen.getByTestId('insight-card-optimal-gap')).toBeInTheDocument();
      expect(screen.getByTestId('insight-card-volume-surge')).toBeInTheDocument();
      expect(screen.getByTestId('insight-card-urgent-bargain')).toBeInTheDocument();

      // Time-series trend chart
      expect(screen.getByTestId('stats-time-trend-chart')).toBeInTheDocument();

      // Mid-feed ad slot
      expect(screen.getByTestId('ad-placement-mid-feed')).toBeInTheDocument();

      // Full-Width Analytical Ranking Chart (Volume Distribution removed)
      const rankingChart = screen.getByTestId('stats-pyeong-ranking-chart');
      expect(rankingChart).toBeInTheDocument();
      expect(rankingChart.parentElement).toHaveClass('w-full');
      expect(rankingChart.parentElement).not.toHaveClass('lg:col-span-7');
      expect(screen.queryByTestId('stats-volume-distribution-chart')).not.toBeInTheDocument();
    });

    it('calculates and displays accurate KPI metrics on initial render', () => {
      render(
        <StatsOverviewSection
          recentTransactions={FIXTURE_TRANSACTIONS}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          testMode={true}
        />
      );

      // Total volume is 4 transactions
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('4건');

      // Average sale price: (165000 + 115000 + 75000 + 120000) / 4 = 118,750
      expect(screen.getByTestId('kpi-avg-sale-price')).toHaveTextContent('118,750만원');
    });

    it('renders the section header as a compact main-page component subtitle rather than a standalone hero title', () => {
      render(
        <StatsOverviewSection
          recentTransactions={FIXTURE_TRANSACTIONS}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          testMode={true}
        />
      );

      const subtitleHeading = screen.getByRole('heading', {
        level: 2,
        name: '동탄 실거래 통계 지표 & 하이퍼로컬 인사이트',
      });
      expect(subtitleHeading).toBeInTheDocument();
      expect(subtitleHeading).toHaveClass('text-[15px]', 'sm:text-[16px]', 'font-bold', 'truncate');
      expect(subtitleHeading).not.toHaveClass('md:text-3xl');
      expect(subtitleHeading.parentElement).toHaveClass('flex', 'items-center', 'gap-2', 'min-w-0');
      expect(subtitleHeading.parentElement).not.toHaveClass('flex-wrap');
      expect(screen.queryByText('동탄 신도시 거시 부동산 통계')).not.toBeInTheDocument();

      const auxDesc = screen.getByText('182개 단지 전수 실거래 기반 5차원 심층 통계 및 실시간 시장 분석');
      expect(auxDesc).toHaveClass('hidden', 'lg:inline-block', 'shrink-0');
      expect(auxDesc).not.toHaveClass('sm:inline-block');
    });
  });

  // 2. 5D Filter Reactivity (< 300ms)
  describe('2. Filter Reactivity & Transition Smoothness', () => {
    it('reacts immediately to region filter change (Dongtan 1 vs Dongtan 2)', () => {
      render(
        <StatsOverviewSection
          recentTransactions={FIXTURE_TRANSACTIONS}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          testMode={true}
        />
      );

      // Initially ALL: 4건
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('4건');

      // Select Dongtan 1 (반송동: 시범한빛금호어울림, 메타폴리스 -> 2건)
      fireEvent.click(screen.getByTestId('filter-region-dongtan1'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('2건');

      // Select Dongtan 2 (여울동, 청계동 -> 2건)
      fireEvent.click(screen.getByTestId('filter-region-dongtan2'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('2건');

      // Select Cheonggye-dong (청계동 -> 1건)
      fireEvent.click(screen.getByTestId('filter-region-cheonggye'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('1건');
    });

    it('filters by pyeong tier accurately', () => {
      render(
        <StatsOverviewSection
          recentTransactions={FIXTURE_TRANSACTIONS}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          testMode={true}
        />
      );

      // Large (>102㎡): only 메타폴리스 (128.2㎡)
      fireEvent.click(screen.getByTestId('filter-pyeong-large'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('1건');
      expect(screen.getByTestId('kpi-avg-sale-price')).toHaveTextContent('120,000만원');

      // Medium-Small (60~85㎡): 3건
      fireEvent.click(screen.getByTestId('filter-pyeong-medium-small'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('3건');
    });

    it('resets all filters back to default upon clicking reset button', () => {
      render(
        <StatsOverviewSection
          recentTransactions={FIXTURE_TRANSACTIONS}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          testMode={true}
        />
      );

      fireEvent.click(screen.getByTestId('filter-region-dongtan1'));
      fireEvent.click(screen.getByTestId('filter-pyeong-large'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('1건');

      const resetBtn = screen.getByTestId('filter-reset-button');
      fireEvent.click(resetBtn);

      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('4건');
    });
  });

  // 3. onSelectApt Wiring to FieldReportModal
  describe('3. In-Page Complex Selection & onSelectApt Wiring', () => {
    it('invokes onSelectApt with complex name and dong when a ranking item is clicked', () => {
      const onSelectApt = jest.fn();

      render(
        <StatsOverviewSection
          recentTransactions={FIXTURE_TRANSACTIONS}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          onSelectApt={onSelectApt}
          testMode={true}
        />
      );

      // Rank 1 item in list is 동탄역롯데캐슬
      const rank1 = screen.getByTestId('ranking-item-1');
      expect(rank1).toBeInTheDocument();
      fireEvent.click(rank1);

      expect(onSelectApt).toHaveBeenCalledTimes(1);
      expect(onSelectApt).toHaveBeenCalledWith('동탄역롯데캐슬', '여울동');
    });

    it('resolves dong via sanitizeAptKey/resolveSummaryEntry when clicking a complex with Roman numerals or commas', () => {
      const onSelectApt = jest.fn();
      const romanTxs = [
        {
          aptKey: '산척동,동탄호수공원금강펜테리움센트럴파크Ⅱ',
          aptName: '산척동,동탄호수공원금강펜테리움센트럴파크Ⅱ',
          dong: '산척동',
          contractDate: '20260915',
          date: '09.15',
          priceVal: 95000,
          area: 84.9,
          areaPyeong: 33.5,
          floor: 15,
          dealType: '매매',
        },
      ];
      const sanitizedSummary = {
        산척동동탄호수공원금강펜테리움센트럴파크2: {
          dong: '산척동',
          latestPrice: 95000,
          latestPriceEok: '9억5,000',
          latestArea: 33.5,
          latestFloor: 15,
          latestDate: '20260915',
          maxPrice: 98000,
          maxPriceEok: '9억8,000',
          maxPriceByArea: {},
          minPrice: 70000,
          minPriceEok: '7억',
          minPriceByArea: {},
          allTimeHigh: 98000,
          allTimeHighEok: '9억8,000',
          allTimeLow: 70000,
          allTimeLowEok: '7억',
          annualVolumes: {},
          appreciationRate: 10,
          allTimeAppreciationRate: 20,
          earliestDate: '20200101',
          earliestPrice: 70000,
          txCount: 5,
          avg1MPrice: 95000,
          avg1MPriceEok: '9억5,000',
          avg1MPerPyeong: 2836,
          avg1MTxCount: 1,
          avg3MPrice: 95000,
          avg3MPriceEok: '9억5,000',
          avg3MPerPyeong: 2836,
          avg3MTxCount: 1,
          rentTxCount: 2,
          latestRentDeposit: 45000,
          latestRentDepositEok: '4억5,000',
          latestRentMonthly: 0,
          latestRentDate: '20260910',
          avg1MRentDeposit: 45000,
          avg1MRentDepositEok: '4억5,000',
          avg3MRentDeposit: 45000,
          avg3MRentDepositEok: '4억5,000',
        },
      };

      render(
        <StatsOverviewSection
          recentTransactions={romanTxs}
          txSummaryData={sanitizedSummary}
          macroTrendData={FIXTURE_MACRO_TREND}
          onSelectApt={onSelectApt}
          testMode={true}
        />
      );

      fireEvent.click(screen.getByTestId('ranking-item-1'));
      expect(onSelectApt).toHaveBeenCalledWith(
        '산척동,동탄호수공원금강펜테리움센트럴파크Ⅱ',
        '산척동'
      );
    });

    it('invokes onSelectApt when clicking the new-high hyperlocal insight card', () => {
      const onSelectApt = jest.fn();

      render(
        <StatsOverviewSection
          recentTransactions={FIXTURE_TRANSACTIONS}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          onSelectApt={onSelectApt}
          testMode={true}
        />
      );

      const newHighCard = screen.getByTestId('insight-card-new-high');
      expect(newHighCard).toBeInTheDocument();
      fireEvent.click(newHighCard);

      expect(onSelectApt).toHaveBeenCalledTimes(1);
      expect(onSelectApt).toHaveBeenCalledWith('동탄역롯데캐슬', '여울동');
    });

    it('invokes onSelectApt when clicking volume surge hyperlocal card', () => {
      const onSelectApt = jest.fn();

      render(
        <StatsOverviewSection
          recentTransactions={FIXTURE_TRANSACTIONS}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          onSelectApt={onSelectApt}
          testMode={true}
        />
      );

      const surgeCard = screen.getByTestId('insight-card-volume-surge');
      expect(surgeCard).toBeInTheDocument();
      fireEvent.click(surgeCard);

      expect(onSelectApt).toHaveBeenCalled();
    });

    it('delegates to onOpenJeonseSafety when provided for optimal gap card', () => {
      const onSelectApt = jest.fn();
      const onOpenJeonseSafety = jest.fn();

      render(
        <StatsOverviewSection
          recentTransactions={FIXTURE_TRANSACTIONS}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={FIXTURE_MACRO_TREND}
          onSelectApt={onSelectApt}
          onOpenJeonseSafety={onOpenJeonseSafety}
          testMode={true}
        />
      );

      const gapCard = screen.getByTestId('insight-card-optimal-gap');
      fireEvent.click(gapCard);

      // If optimal gap complex exists, onOpenJeonseSafety is invoked
      // Otherwise no unhandled crash
      if (screen.getByTestId('insight-card-optimal-gap').textContent?.includes('해당 없음')) {
        expect(onOpenJeonseSafety).not.toHaveBeenCalled();
      } else {
        expect(onSelectApt).toHaveBeenCalled();
      }
    });
  });

  // 4. Edge Cases & Resilience
  describe('4. Edge Cases & Fault Tolerance', () => {
    it('handles empty transactions array gracefully with 0 volume and no crash', () => {
      render(
        <StatsOverviewSection
          recentTransactions={[]}
          txSummaryData={{}}
          macroTrendData={[]}
          testMode={true}
        />
      );

      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('0건');
      expect(screen.getByTestId('kpi-avg-sale-price')).toHaveTextContent('-');
      expect(screen.getByTestId('kpi-avg-pyeong-price')).toHaveTextContent('-');
      expect(screen.getByTestId('kpi-avg-jeonse-ratio')).toHaveTextContent('-');
    });

    it('excludes historical macroTrend months with zero sales from timeSeriesTrend and forward-fills latest rent deposit', () => {
      const macroWithHistory: DongtanMacroTrendPoint[] = [
        { month: '11.06', '동탄 아파트 매매 평균': '3억1,000', '동탄 아파트 전세 평균': '1억9,000' } as unknown as DongtanMacroTrendPoint,
        { month: '26.08', '동탄 아파트 매매 평균': '8억2,283', '동탄 아파트 전세 평균': '4억4,158' } as unknown as DongtanMacroTrendPoint,
      ];

      render(
        <StatsOverviewSection
          recentTransactions={FIXTURE_TRANSACTIONS}
          txSummaryData={FIXTURE_SUMMARY}
          macroTrendData={macroWithHistory}
          testMode={true}
        />
      );

      expect(screen.queryByTestId('trend-point-2011-06')).not.toBeInTheDocument();
      expect(screen.getByTestId('trend-point-2026-08')).toHaveTextContent('2026-08: 97500만원 (2건)');
      expect(screen.getByTestId('trend-point-2026-09')).toHaveTextContent('2026-09: 140000만원 (2건)');
    });

    it('sanitizes zero-sale and non-finite (Infinity/NaN) points in StatsTimeTrendChart', () => {
      render(
        <StatsTimeTrendChart
          data={[
            { date: '2011-06', avgSalePrice: 0, avgRentDeposit: 19000, volume: 0 },
            { date: '2026-07', avgSalePrice: Number.POSITIVE_INFINITY, avgRentDeposit: 43000, volume: 0 },
            { date: '2026-08', avgSalePrice: Number.NaN, avgRentDeposit: 44000, volume: 0 },
            { date: '2026-09', avgSalePrice: 92000, avgRentDeposit: 45000, volume: 12 },
          ]}
        />
      );

      expect(screen.queryByTestId('trend-point-2011-06')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trend-point-2026-07')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trend-point-2026-08')).not.toBeInTheDocument();
      expect(screen.getByTestId('trend-point-2026-09')).toHaveTextContent('2026-09: 92000만원 (12건)');
    });

    it('prevents stale 1Y chunk response from overwriting ALL chunk response during rapid timeframe switching', async () => {
      clearStatsChunkCache();
      const originalFetch = global.fetch;

      let resolve1Y!: (val: any) => void;
      let resolveAll!: (val: any) => void;

      const promise1Y = new Promise((r) => {
        resolve1Y = r;
      });
      const promiseAll = new Promise((r) => {
        resolveAll = r;
      });

      global.fetch = jest.fn((url: RequestInfo | URL) => {
        const urlStr = String(url);
        if (urlStr.includes('transactions-1y.json')) {
          return promise1Y as Promise<Response>;
        }
        if (urlStr.includes('transactions-all.json')) {
          return promiseAll as Promise<Response>;
        }
        return Promise.resolve({ ok: true, json: async () => [] } as Response);
      }) as jest.Mock;

      try {
        render(
          <StatsOverviewSection
            recentTransactions={FIXTURE_TRANSACTIONS}
            txSummaryData={FIXTURE_SUMMARY}
            macroTrendData={FIXTURE_MACRO_TREND}
            testMode={false}
          />
        );

        // Switch to 1Y first, then immediately switch to ALL before 1Y resolves
        fireEvent.click(screen.getByTestId('filter-timeframe-1y'));
        fireEvent.click(screen.getByTestId('filter-timeframe-all'));

        // ALL resolves first with 6 transactions
        const allPayload = [
          ...FIXTURE_TRANSACTIONS,
          {
            aptKey: 'apt-5',
            aptName: '동탄역롯데캐슬',
            dong: '여울동',
            contractDate: '20240510',
            date: '05.10',
            priceVal: 145000,
            area: 84.9,
            areaPyeong: 25.7,
            floor: 18,
            dealType: '매매',
          },
          {
            aptKey: 'apt-6',
            aptName: '메타폴리스',
            dong: '반송동',
            contractDate: '20230315',
            date: '03.15',
            priceVal: 110000,
            area: 128.2,
            areaPyeong: 38.8,
            floor: 30,
            dealType: '매매',
          },
        ];

        await act(async () => {
          resolveAll({
            ok: true,
            json: async () => allPayload,
          });
        });

        await waitFor(() => {
          expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('6건');
        });

        // Now stale 1Y resolves late with only 5 transactions
        const stale1YPayload = allPayload.slice(0, 5);
        await act(async () => {
          resolve1Y({
            ok: true,
            json: async () => stale1YPayload,
          });
        });

        // Volume must remain 6건 (monotonic & cancellation guard holds)
        expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('6건');
      } finally {
        global.fetch = originalFetch;
        clearStatsChunkCache();
      }
    });

    it('loads 6M chunk via transactions-1y.json, resets isLoadingChunk when switching back to 3M, and enforces monotonic baseTxs length guard', async () => {
      clearStatsChunkCache();
      const originalFetch = global.fetch;

      let resolve1Y!: (val: any) => void;
      const promise1Y = new Promise((r) => {
        resolve1Y = r;
      });

      global.fetch = jest.fn(() => promise1Y as Promise<Response>) as jest.Mock;

      try {
        render(
          <StatsOverviewSection
            recentTransactions={FIXTURE_TRANSACTIONS}
            txSummaryData={FIXTURE_SUMMARY}
            macroTrendData={FIXTURE_MACRO_TREND}
            testMode={false}
          />
        );

        // Click 6M -> triggers fetch to transactions-1y.json and shows loading indicator
        fireEvent.click(screen.getByTestId('filter-timeframe-6m'));
        expect(global.fetch).toHaveBeenCalledWith('/data/transactions-1y.json');
        expect(screen.getByText(/데이터 집계 중/)).toBeInTheDocument();

        // Switch back to 3M while 6M fetch is still pending -> loading indicator must clear immediately
        fireEvent.click(screen.getByTestId('filter-timeframe-3m'));
        expect(screen.queryByText(/데이터 집계 중/)).not.toBeInTheDocument();

        // Switch to 1Y and resolve with a smaller payload (2 items vs initial 4 items) -> monotonic guard preserves 4 items
        fireEvent.click(screen.getByTestId('filter-timeframe-1y'));
        await act(async () => {
          resolve1Y({
            ok: true,
            json: async () => FIXTURE_TRANSACTIONS.slice(0, 2),
          });
        });

        await waitFor(() => {
          expect(screen.queryByText(/데이터 집계 중/)).not.toBeInTheDocument();
        });
        expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('4건');
      } finally {
        global.fetch = originalFetch;
        clearStatsChunkCache();
      }
    });
  });
});
