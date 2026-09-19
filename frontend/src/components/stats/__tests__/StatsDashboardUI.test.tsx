import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { StatsDashboardSkeleton } from '@/app/stats/StatsDashboardSkeleton';
import { StatsFilterBar } from '@/components/stats/StatsFilterBar';
import { HyperlocalInsightCards } from '@/components/stats/HyperlocalInsightCards';
import { StatsTimeTrendChart } from '@/components/stats/StatsTimeTrendChart';
import { StatsPyeongRankingChart } from '@/components/stats/StatsPyeongRankingChart';
import { StatsVolumeDistributionChart } from '@/components/stats/StatsVolumeDistributionChart';
import {
  StatsAdBanner,
  FilterBottomAdBanner,
  MidFeedAdBanner,
  RankingBreakAdBanner,
  BottomAnchorAdBanner,
} from '@/components/stats/StatsAdBanners';
import { StatsDashboardClient } from '@/app/stats/StatsDashboardClient';
import type { ComplexStatItem, MacroTimeSeriesPoint, VolumeDistributionItem } from '@/types/stats';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const MOCK_COMPLEX_STAT: ComplexStatItem = {
  aptKey: 'apt-1',
  aptName: '동탄역롯데캐슬',
  dong: '여울동',
  region: '동탄2',
  txCount: 15,
  avgPrice: 165000,
  avgPyeongPrice: 4850,
  jeonseRatio: 65.5,
  latestPrice: 170000,
  highestPrice: 170000,
  lowestPrice: 150000,
  urgentSaleDiscountRate: 5.2,
  isNewHigh: true,
};

const MOCK_RANKINGS: ComplexStatItem[] = [
  MOCK_COMPLEX_STAT,
  {
    aptKey: 'apt-2',
    aptName: '동탄역시범우남퍼스트빌',
    dong: '청계동',
    region: '동탄2',
    txCount: 12,
    avgPrice: 115000,
    avgPyeongPrice: 4120,
    jeonseRatio: 72.1,
    latestPrice: 115000,
    highestPrice: 120000,
    lowestPrice: 105000,
    urgentSaleDiscountRate: 4.2,
    isNewHigh: false,
  },
  {
    aptKey: 'apt-3',
    aptName: '시범한빛금호어울림',
    dong: '반송동',
    region: '동탄1',
    txCount: 8,
    avgPrice: 75000,
    avgPyeongPrice: 3250,
    jeonseRatio: 68.0,
    latestPrice: 75000,
    highestPrice: 80000,
    lowestPrice: 70000,
    isNewHigh: false,
  },
  {
    aptKey: 'apt-4',
    aptName: '메타폴리스',
    dong: '반송동',
    region: '동탄1',
    txCount: 6,
    avgPrice: 105000,
    avgPyeongPrice: 3100,
    jeonseRatio: 58.0,
    latestPrice: 105000,
    highestPrice: 110000,
    lowestPrice: 98000,
    isNewHigh: false,
  },
];

const MOCK_TREND: MacroTimeSeriesPoint[] = [
  { date: '2026-07', avgSalePrice: 85000, avgRentDeposit: 45000, volume: 25 },
  { date: '2026-08', avgSalePrice: 89000, avgRentDeposit: 48000, volume: 32 },
  { date: '2026-09', avgSalePrice: 92000, avgRentDeposit: 51000, volume: 40 },
];

const MOCK_DISTRIBUTION: VolumeDistributionItem[] = [
  { name: '소형 (60㎡ 이하)', value: 15, percentage: 15.5 },
  { name: '중소형 (60~85㎡)', value: 55, percentage: 56.7 },
  { name: '중대형 (85~102㎡)', value: 20, percentage: 20.6 },
  { name: '대형 (102㎡ 초과)', value: 7, percentage: 7.2 },
];

describe('M2 Statistics Dashboard UI Component Suite', () => {
  // 1. StatsDashboardSkeleton
  describe('StatsDashboardSkeleton', () => {
    it('renders skeleton container and pre-sized bounding boxes', () => {
      render(<StatsDashboardSkeleton />);
      const skeleton = screen.getByTestId('stats-dashboard-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');
    });
  });

  // 2. StatsFilterBar
  describe('StatsFilterBar', () => {
    it('renders region pills and fires change handler when clicked', () => {
      const onRegionChange = jest.fn();
      render(
        <StatsFilterBar
          region="ALL"
          pyeong="ALL"
          timeframe="ALL"
          onRegionChange={onRegionChange}
          onPyeongChange={jest.fn()}
          onTimeframeChange={jest.fn()}
        />
      );

      const d1Btn = screen.getByTestId('filter-region-dongtan1');
      fireEvent.click(d1Btn);
      expect(onRegionChange).toHaveBeenCalledWith('DONGTAN1');

      const d2Btn = screen.getByTestId('filter-region-dongtan2');
      fireEvent.click(d2Btn);
      expect(onRegionChange).toHaveBeenCalledWith('DONGTAN2');
    });

    it('renders pyeong and timeframe options and calls handlers', () => {
      const onPyeongChange = jest.fn();
      const onTimeframeChange = jest.fn();
      render(
        <StatsFilterBar
          region="ALL"
          pyeong="ALL"
          timeframe="ALL"
          onRegionChange={jest.fn()}
          onPyeongChange={onPyeongChange}
          onTimeframeChange={onTimeframeChange}
        />
      );

      fireEvent.click(screen.getByTestId('filter-pyeong-small'));
      expect(onPyeongChange).toHaveBeenCalledWith('SMALL');

      fireEvent.click(screen.getByTestId('filter-timeframe-1m'));
      expect(onTimeframeChange).toHaveBeenCalledWith('1M');
    });

    it('opens legal dong dropdown and selects a specific dong', () => {
      const onRegionChange = jest.fn();
      const onDongChange = jest.fn();
      render(
        <StatsFilterBar
          region="ALL"
          pyeong="ALL"
          timeframe="ALL"
          onRegionChange={onRegionChange}
          onDongChange={onDongChange}
          onPyeongChange={jest.fn()}
          onTimeframeChange={jest.fn()}
        />
      );

      // Click dropdown trigger
      const dropdownTrigger = screen.getByRole('button', { name: /법정동 선택/i });
      fireEvent.click(dropdownTrigger);

      // Select '반송동'
      const bansongBtn = screen.getByRole('button', { name: /반송동/i });
      fireEvent.click(bansongBtn);

      expect(onDongChange).toHaveBeenCalledWith('반송동');
      expect(onRegionChange).toHaveBeenCalledWith('반송동');
    });

    it('handles filter reset button click', () => {
      const onReset = jest.fn();
      render(
        <StatsFilterBar
          region="DONGTAN1"
          pyeong="SMALL"
          timeframe="1M"
          onRegionChange={jest.fn()}
          onPyeongChange={jest.fn()}
          onTimeframeChange={jest.fn()}
          onReset={onReset}
        />
      );

      const resetBtn = screen.getByTestId('filter-reset-button');
      fireEvent.click(resetBtn);
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  // 3. HyperlocalInsightCards
  describe('HyperlocalInsightCards', () => {
    it('renders all 4 cards with formatted values', () => {
      const insights = {
        newHighComplex: MOCK_COMPLEX_STAT,
        optimalGapComplex: MOCK_RANKINGS[1],
        volumeSurgeComplex: MOCK_COMPLEX_STAT,
        urgentBargainComplex: MOCK_COMPLEX_STAT,
      };

      render(<HyperlocalInsightCards insights={insights} />);

      expect(screen.getByTestId('insight-card-new-high')).toHaveTextContent('동탄역롯데캐슬');
      expect(screen.getByTestId('insight-card-optimal-gap')).toHaveTextContent('동탄역시범우남퍼스트빌');
      expect(screen.getByTestId('insight-card-volume-surge')).toHaveTextContent('15건');
      expect(screen.getByTestId('insight-card-urgent-bargain')).toHaveTextContent('-5.2%');
    });

    it('handles missing insights safely without crashing', () => {
      const emptyInsights = {
        newHighComplex: null,
        optimalGapComplex: null,
        volumeSurgeComplex: null,
        urgentBargainComplex: null,
      };

      render(<HyperlocalInsightCards insights={emptyInsights} />);

      expect(screen.getByTestId('insight-card-new-high')).toHaveTextContent('해당 없음');
      expect(screen.getByTestId('insight-card-optimal-gap')).toHaveTextContent('해당 없음');
      expect(screen.getByTestId('insight-card-volume-surge')).toHaveTextContent('해당 없음');
      expect(screen.getByTestId('insight-card-urgent-bargain')).toHaveTextContent('해당 없음');
    });

    it('triggers click handlers on cards', () => {
      const onSelectComplex = jest.fn();
      const onOpenJeonseSafety = jest.fn();
      const onOpenCompare = jest.fn();

      const insights = {
        newHighComplex: MOCK_COMPLEX_STAT,
        optimalGapComplex: MOCK_RANKINGS[1],
        volumeSurgeComplex: MOCK_COMPLEX_STAT,
        urgentBargainComplex: MOCK_COMPLEX_STAT,
      };

      render(
        <HyperlocalInsightCards
          insights={insights}
          onSelectComplex={onSelectComplex}
          onOpenJeonseSafety={onOpenJeonseSafety}
          onOpenCompare={onOpenCompare}
        />
      );

      fireEvent.click(screen.getByTestId('insight-card-new-high'));
      expect(onSelectComplex).toHaveBeenCalledWith('apt-1', '동탄역롯데캐슬');

      fireEvent.click(screen.getByTestId('insight-card-optimal-gap'));
      expect(onOpenJeonseSafety).toHaveBeenCalledWith('동탄역시범우남퍼스트빌');

      fireEvent.click(screen.getByTestId('insight-card-urgent-bargain'));
      expect(onOpenCompare).toHaveBeenCalledWith('동탄역롯데캐슬');
    });
  });

  // 4. StatsTimeTrendChart
  describe('StatsTimeTrendChart', () => {
    it('renders time trend chart and data points', () => {
      render(<StatsTimeTrendChart data={MOCK_TREND} />);

      expect(screen.getByTestId('stats-time-trend-chart')).toBeInTheDocument();
      expect(screen.getByTestId('trend-point-2026-09')).toHaveTextContent('2026-09: 92000만원 (40건)');
    });

    it('renders clean fallback when data is empty', () => {
      render(<StatsTimeTrendChart data={[]} />);

      expect(screen.getByTestId('stats-time-trend-chart')).toBeInTheDocument();
      expect(screen.getByText('해당 조건의 월별 실거래 추이 데이터가 없습니다.')).toBeInTheDocument();
    });
  });

  // 5. StatsPyeongRankingChart
  describe('StatsPyeongRankingChart', () => {
    it('renders ranking items with rank badges and pyeong prices', () => {
      render(<StatsPyeongRankingChart rankings={MOCK_RANKINGS} testMode={true} />);

      expect(screen.getByTestId('stats-pyeong-ranking-chart')).toBeInTheDocument();
      expect(screen.getByTestId('ranking-item-1')).toHaveTextContent('1위 동탄역롯데캐슬');
      expect(screen.getByTestId('ranking-item-1')).toHaveTextContent('4,850만원/평');
      expect(screen.getByTestId('ranking-item-2')).toHaveTextContent('2위 동탄역시범우남퍼스트빌');
    });

    it('renders ranking break ad slot after rank 3', () => {
      render(<StatsPyeongRankingChart rankings={MOCK_RANKINGS} testMode={true} />);

      expect(screen.getByTestId('ad-placement-ranking-break')).toBeInTheDocument();
    });

    it('toggles view mode between integrated, chart only, and table only', () => {
      render(<StatsPyeongRankingChart rankings={MOCK_RANKINGS} testMode={true} />);

      const tableOnlyBtn = screen.getByRole('button', { name: '목록만' });
      fireEvent.click(tableOnlyBtn);

      expect(screen.getByTestId('ranking-list')).toBeInTheDocument();

      const chartOnlyBtn = screen.getByRole('button', { name: '차트만' });
      fireEvent.click(chartOnlyBtn);

      expect(screen.queryByTestId('ranking-list')).not.toBeInTheDocument();
    });
  });

  // 6. StatsVolumeDistributionChart
  describe('StatsVolumeDistributionChart', () => {
    it('renders donut distribution chart and slices', () => {
      render(<StatsVolumeDistributionChart distribution={MOCK_DISTRIBUTION} />);

      expect(screen.getByTestId('stats-volume-distribution-chart')).toBeInTheDocument();
      expect(screen.getByTestId('donut-slice-소형 (60㎡ 이하)')).toHaveTextContent('15건 (15.5%)');
      expect(screen.getByTestId('donut-slice-중소형 (60~85㎡)')).toHaveTextContent('55건 (56.7%)');
    });

    it('handles slice click interactions', () => {
      const onSliceClick = jest.fn();
      render(
        <StatsVolumeDistributionChart
          distribution={MOCK_DISTRIBUTION}
          onSliceClick={onSliceClick}
        />
      );

      const sliceItem = screen.getByTestId('donut-slice-소형 (60㎡ 이하)');
      fireEvent.click(sliceItem);
      expect(onSliceClick).toHaveBeenCalledWith('소형 (60㎡ 이하)');
    });
  });

  // 7. StatsAdBanners
  describe('StatsAdBanners', () => {
    it('renders all 4 banner components with Zero-CLS min-height classes', () => {
      const { container } = render(
        <div>
          <FilterBottomAdBanner testMode={true} />
          <MidFeedAdBanner testMode={true} />
          <RankingBreakAdBanner testMode={true} />
          <BottomAnchorAdBanner testMode={true} />
        </div>
      );

      const filterBottom = screen.getByTestId('ad-placement-filter-bottom');
      expect(filterBottom.querySelector('[data-testid="ad-slot-container"]')).toHaveClass('min-h-[90px]');

      const midFeed = screen.getByTestId('ad-placement-mid-feed');
      expect(midFeed.querySelector('[data-testid="ad-slot-container"]')).toHaveClass('min-h-[140px]');

      const rankingBreak = screen.getByTestId('ad-placement-ranking-break');
      expect(rankingBreak.querySelector('[data-testid="ad-slot-container"]')).toHaveClass('min-h-[140px]');

      const bottomAnchor = screen.getByTestId('ad-placement-bottom-anchor');
      expect(bottomAnchor.querySelector('[data-testid="ad-slot-container"]')).toHaveClass('min-h-[250px]');
    });

    it('renders StatsAdBanner dispatcher component for each placement type', () => {
      render(
        <div>
          <StatsAdBanner placement="filter-bottom" testMode={true} />
          <StatsAdBanner placement="mid-feed" testMode={true} />
          <StatsAdBanner placement="ranking-break" testMode={true} />
          <StatsAdBanner placement="bottom-anchor" testMode={true} />
        </div>
      );

      expect(screen.getByTestId('ad-placement-filter-bottom')).toBeInTheDocument();
      expect(screen.getByTestId('ad-placement-mid-feed')).toBeInTheDocument();
      expect(screen.getByTestId('ad-placement-ranking-break')).toBeInTheDocument();
      expect(screen.getByTestId('ad-placement-bottom-anchor')).toBeInTheDocument();
    });
  });

  // 8. StatsDashboardClient Integration
  describe('StatsDashboardClient Integration', () => {
    const rawTxs = [
      { aptKey: 'bs-1', aptName: '메타폴리스', dong: '반송동', contractDate: '20260910', priceVal: 105000, area: 128.4, isNewHigh: true },
      { aptKey: 'cg-1', aptName: '동탄역시범우남퍼스트빌', dong: '청계동', contractDate: '20260915', priceVal: 115000, area: 84.9, isNewHigh: true },
    ];

    it('renders full dashboard client with initial transactions and reacts to filter clicks', () => {
      render(<StatsDashboardClient initialTxs={rawTxs} testMode={true} />);

      expect(screen.getByTestId('stats-dashboard-container')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('2건');

      // Click Dongtan 1 filter
      fireEvent.click(screen.getByTestId('filter-region-dongtan1'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('1건');

      // Click All filter
      fireEvent.click(screen.getByTestId('filter-region-all'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('2건');
    });
  });
});
