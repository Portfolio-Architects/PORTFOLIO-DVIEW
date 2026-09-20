import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StatsOverviewSection } from '@/components/stats/StatsOverviewSection';
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

      // 2-Column Analytical Grid: Ranking Chart & Volume Distribution
      expect(screen.getByTestId('stats-pyeong-ranking-chart')).toBeInTheDocument();
      expect(screen.getByTestId('stats-volume-distribution-chart')).toBeInTheDocument();
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
        expect(onOpenJeonseSafety).toHaveBeenCalled();
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
  });
});
