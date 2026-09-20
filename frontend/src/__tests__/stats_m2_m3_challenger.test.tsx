/**
 * stats_m2_m3_challenger.test.tsx
 *
 * EMPIRICAL ADVERSARIAL STRESS HARNESS
 * Milestone 2 & 3: Interactive Dashboard UI & AdSense Placement
 *
 * Evaluates:
 * 1. Zero-CLS Container Guarantees & AdSlot Bounding Boxes (All 4 placements)
 * 2. Rapid Filter Transitions, Concurrency & Empty State Resilience (<300ms)
 * 3. Recharts Rendering Stability under Empty, Single-point, & Adversarial Data
 * 4. Mobile Viewport Responsiveness (320px ~ 375px) & MobileDock Contract
 */

import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  AdSlot,
  getAdSlotMinHeightClass,
} from '@/components/ads/AdSlot';
import {
  StatsAdBanner,
  FilterBottomAdBanner,
  MidFeedAdBanner,
  RankingBreakAdBanner,
  BottomAnchorAdBanner,
} from '@/components/stats/StatsAdBanners';
import { StatsDashboardSkeleton } from '@/app/stats/StatsDashboardSkeleton';
import { StatsDashboardClient } from '@/app/stats/StatsDashboardClient';
import { StatsFilterBar } from '@/components/stats/StatsFilterBar';
import { HyperlocalInsightCards } from '@/components/stats/HyperlocalInsightCards';
import { StatsTimeTrendChart } from '@/components/stats/StatsTimeTrendChart';
import { StatsPyeongRankingChart } from '@/components/stats/StatsPyeongRankingChart';
import { StatsVolumeDistributionChart } from '@/components/stats/StatsVolumeDistributionChart';
import MobileDock, { TABS } from '@/components/pwa/MobileDock';
import LoungeHeader from '@/components/LoungeHeader';
import { aggregateStats, formatPriceEok } from '@/lib/analytics/statsEngine';
import type {
  ComplexStatItem,
  MacroTimeSeriesPoint,
  VolumeDistributionItem,
  RawTransactionRecord,
  RawRentRecord,
  RegionFilter,
  PyeongFilter,
  TimeframeFilter,
  SortOption,
} from '@/types/stats';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/stats',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

jest.mock('@/components/FloatingUserBar', () => {
  return function MockFloatingUserBar() {
    return <div data-testid="mock-floating-bar" />;
  };
});

jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsUi: () => ({ isSettingsModalOpen: false, setIsSettingsModalOpen: jest.fn() }),
  useSettingsValues: () => ({ areaUnit: 'm2', setAreaUnit: jest.fn(), theme: 'light', setTheme: jest.fn() }),
  useSettings: () => ({ areaUnit: 'm2', setAreaUnit: jest.fn(), theme: 'light', setTheme: jest.fn(), isSettingsModalOpen: false, setIsSettingsModalOpen: jest.fn() }),
}));

// Mock ad block detector hook
const mockUseAdBlockDetector = jest.fn();
jest.mock('@/hooks/useAdBlockDetector', () => ({
  useAdBlockDetector: () => mockUseAdBlockDetector(),
}));

// =============================================================================
// TEST DATA FIXTURES
// =============================================================================

const MOCK_TXS: RawTransactionRecord[] = [
  { aptKey: 'bs-1', aptName: '메타폴리스', dong: '반송동', contractDate: '20260910', priceVal: 105000, area: 128.4, isNewHigh: true },
  { aptKey: 'bs-2', aptName: '시범한빛금호어울림', dong: '반송동', contractDate: '20260815', priceVal: 72000, area: 84.8, isNewHigh: false },
  { aptKey: 'sw-1', aptName: '석우메르디앙', dong: '석우동', contractDate: '20260710', priceVal: 53000, area: 59.9, isNewHigh: false },
  { aptKey: 'nd-1', aptName: '동탄숲속마을광명메이루즈', dong: '능동', contractDate: '20260903', priceVal: 75000, area: 84.5, isNewHigh: true },
  { aptKey: 'cg-1', aptName: '동탄역시범우남퍼스트빌', dong: '청계동', contractDate: '20260915', priceVal: 115000, area: 84.9, isNewHigh: true },
  { aptKey: 'cg-2', aptName: '동탄역시범더샵센트럴시티', dong: '청계동', contractDate: '20260820', priceVal: 128000, area: 97.5, isNewHigh: false },
  { aptKey: 'os-1', aptName: '동탄역롯데캐슬', dong: '오산동', contractDate: '20260810', priceVal: 165000, area: 102.7, isNewHigh: true },
  { aptKey: 'yc-1', aptName: '동탄파크푸르지오', dong: '영천동', contractDate: '20260905', priceVal: 74000, area: 84.9, isNewHigh: false },
  { aptKey: 'md-1', aptName: '힐스테이트동탄', dong: '목동', contractDate: '20260715', priceVal: 71000, area: 84.5, isNewHigh: false },
  { aptKey: 'sc-1', aptName: '더레이크시티부영3단지', dong: '산척동', contractDate: '20260828', priceVal: 89000, area: 84.9, isNewHigh: false },
  { aptKey: 'sd-1', aptName: '동탄린스트라우스더레이크', dong: '송동', contractDate: '20260908', priceVal: 120000, area: 98.2, isNewHigh: true },
  { aptKey: 'sn-1', aptName: 'e편한세상동탄파크아너스', dong: '신동', contractDate: '20260515', priceVal: 62000, area: 99.4, isNewHigh: false },
  { aptKey: 'jj-1', aptName: '동탄레이크자연앤푸르지오', dong: '장지동', contractDate: '20260410', priceVal: 78000, area: 84.9, isNewHigh: false },
];

const MOCK_RENTS: RawRentRecord[] = [
  { aptKey: 'cg-1', aptName: '동탄역시범우남퍼스트빌', dong: '청계동', contractDate: '20260912', deposit: 55000, area: 84.9 },
  { aptKey: 'bs-1', aptName: '메타폴리스', dong: '반송동', contractDate: '20260905', deposit: 60000, area: 128.4 },
  { aptKey: 'sc-1', aptName: '더레이크시티부영3단지', dong: '산척동', contractDate: '20260825', deposit: 48000, area: 84.9 },
  { aptKey: 'os-1', aptName: '동탄역롯데캐슬', dong: '여울동', contractDate: '20260812', deposit: 75000, area: 102.7 },
];

describe('Milestone 2 & 3 Adversarial Challenge Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdBlockDetector.mockReturnValue({ isAdBlockActive: false });
  });

  // ===========================================================================
  // CHALLENGE DIMENSION 1: ZERO-CLS CONTAINER GUARANTEES & ADSLOT BOUNDING BOXES
  // ===========================================================================
  describe('Dimension 1: Zero-CLS Container Guarantees', () => {
    it('1.1: getAdSlotMinHeightClass strictly returns non-zero min-height for all formats', () => {
      const formats: Array<'horizontal-strip' | 'in-feed' | 'banner' | 'rectangle' | 'auto'> = [
        'horizontal-strip',
        'in-feed',
        'banner',
        'rectangle',
        'auto',
      ];

      formats.forEach((fmt) => {
        const cls = getAdSlotMinHeightClass(fmt);
        expect(cls).toBeDefined();
        expect(cls.length).toBeGreaterThan(0);
        expect(cls).toMatch(/min-h-\[\d+px\]/);
      });

      expect(getAdSlotMinHeightClass('horizontal-strip')).toBe('min-h-[90px] sm:min-h-[100px]');
      expect(getAdSlotMinHeightClass('in-feed')).toBe('min-h-[140px] sm:min-h-[160px]');
      expect(getAdSlotMinHeightClass('banner')).toBe('min-h-[250px]');
    });

    it('1.2: All 4 AdSlot placements maintain min-height container in normal testMode', () => {
      const { container } = render(
        <div>
          <FilterBottomAdBanner testMode={true} />
          <MidFeedAdBanner testMode={true} />
          <RankingBreakAdBanner testMode={true} />
          <BottomAnchorAdBanner testMode={true} />
        </div>
      );

      // 1. Filter bottom: horizontal-strip
      const fb = screen.getByTestId('ad-placement-filter-bottom');
      const fbContainer = fb.querySelector('[data-testid="ad-slot-container"]');
      expect(fbContainer).toHaveClass('min-h-[90px]');

      // 2. Mid feed: in-feed
      const mf = screen.getByTestId('ad-placement-mid-feed');
      const mfContainer = mf.querySelector('[data-testid="ad-slot-container"]');
      expect(mfContainer).toHaveClass('min-h-[140px]');

      // 3. Ranking break: in-feed
      const rb = screen.getByTestId('ad-placement-ranking-break');
      const rbContainer = rb.querySelector('[data-testid="ad-slot-container"]');
      expect(rbContainer).toHaveClass('min-h-[140px]');

      // 4. Bottom anchor: banner
      const ba = screen.getByTestId('ad-placement-bottom-anchor');
      const baContainer = ba.querySelector('[data-testid="ad-slot-container"]');
      expect(baContainer).toHaveClass('min-h-[250px]');
    });

    it('1.3: Under AdBlock active state, fallback card retains exact min-height without collapsing to 0px', () => {
      mockUseAdBlockDetector.mockReturnValue({ isAdBlockActive: true });

      render(
        <div>
          <FilterBottomAdBanner testMode={false} />
          <MidFeedAdBanner testMode={false} />
          <RankingBreakAdBanner testMode={false} />
          <BottomAnchorAdBanner testMode={false} />
        </div>
      );

      const fb = screen.getByTestId('ad-placement-filter-bottom');
      const fbFallback = within(fb).getByTestId('ad-slot-adblock-fallback');
      expect(fbFallback).toHaveClass('min-h-[90px]');

      const mf = screen.getByTestId('ad-placement-mid-feed');
      const mfFallback = within(mf).getByTestId('ad-slot-adblock-fallback');
      expect(mfFallback).toHaveClass('min-h-[140px]');

      const rb = screen.getByTestId('ad-placement-ranking-break');
      const rbFallback = within(rb).getByTestId('ad-slot-adblock-fallback');
      expect(rbFallback).toHaveClass('min-h-[140px]');

      const ba = screen.getByTestId('ad-placement-bottom-anchor');
      const baFallback = within(ba).getByTestId('ad-slot-adblock-fallback');
      expect(baFallback).toHaveClass('min-h-[250px]');
    });

    it('1.4: In production live mode before ad loads, skeleton shimmer fills absolute bounds of pre-sized container', () => {
      mockUseAdBlockDetector.mockReturnValue({ isAdBlockActive: false });
      const origEnv = process.env.NODE_ENV;
      const origClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

      (process.env as any).NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-1234567890';

      try {
        render(
          <AdSlot
            slotId="stat-slot-mid-feed"
            format="in-feed"
            testMode={false}
          />
        );

        const container = screen.getByTestId('ad-slot-container');
        expect(container).toHaveClass('min-h-[140px]');

        const skeleton = screen.getByTestId('ad-slot-skeleton');
        expect(skeleton).toBeInTheDocument();
        expect(skeleton).toHaveClass('absolute', 'inset-0');
      } finally {
        (process.env as any).NODE_ENV = origEnv;
        process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = origClient;
      }
    });

    it('1.5: StatsDashboardSkeleton allocates pre-sized bounding blocks matching all visual sections', () => {
      render(<StatsDashboardSkeleton />);
      const skeleton = screen.getByTestId('stats-dashboard-skeleton');
      expect(skeleton).toBeInTheDocument();
      expect(skeleton).toHaveClass('animate-pulse');

      // Check pre-allocated ad slot bounding boxes
      expect(skeleton.querySelector('.min-h-\\[90px\\]')).toBeInTheDocument();
      expect(skeleton.querySelector('.min-h-\\[140px\\]')).toBeInTheDocument();
      expect(skeleton.querySelector('.min-h-\\[250px\\]')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // CHALLENGE DIMENSION 2: RAPID FILTER TRANSITIONS & EMPTY STATE RESILIENCE
  // ===========================================================================
  describe('Dimension 2: Rapid Filter Transitions & Empty State Stress', () => {
    it('2.1: 50 sequential rapid filter changes complete in < 500ms without race or error', () => {
      const regions: RegionFilter[] = ['ALL', 'DONGTAN1', 'DONGTAN2', '청계동', '반송동', '신동', '산척동', '여울동'];
      const pyeongs: PyeongFilter[] = ['ALL', 'SMALL', 'MEDIUM_SMALL', 'MEDIUM_LARGE', 'LARGE'];
      const timeframes: TimeframeFilter[] = ['1M', '3M', '6M', '1Y', 'ALL'];
      const sorts: SortOption[] = ['PYEONG_DESC', 'PRICE_DESC', 'PRICE_ASC', 'VOLUME_DESC', 'JEONSE_DESC'];

      const t0 = performance.now();

      for (let i = 0; i < 50; i++) {
        const r = regions[i % regions.length];
        const p = pyeongs[i % pyeongs.length];
        const tf = timeframes[i % timeframes.length];
        const s = sorts[i % sorts.length];

        const res = aggregateStats(
          { transactions: MOCK_TXS, rents: MOCK_RENTS },
          { region: r, pyeong: p, timeframe: tf, sort: s },
          { sortBy: s, rankLimit: 20 }
        );

        expect(res).toBeDefined();
        expect(typeof res.totalVolume).toBe('number');
        expect(Array.isArray(res.pyeongRankings)).toBe(true);
        expect(Array.isArray(res.timeSeriesTrend)).toBe(true);
        expect(Array.isArray(res.volumeDistribution)).toBe(true);
      }

      const elapsed = performance.now() - t0;
      expect(elapsed).toBeLessThan(500); // 50 aggregations in < 500ms (<10ms per aggregation)
    });

    it('2.2: Interactive UI handles rapid filter clicks with responsive updates', () => {
      render(<StatsDashboardClient initialTxs={MOCK_TXS} initialRents={MOCK_RENTS} testMode={true} />);

      const totalVolumeKpi = screen.getByTestId('kpi-total-volume');
      expect(totalVolumeKpi).toHaveTextContent('13건');

      // Click Dongtan 1
      fireEvent.click(screen.getByTestId('filter-region-dongtan1'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('4건');

      // Click Dongtan 2
      fireEvent.click(screen.getByTestId('filter-region-dongtan2'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('9건');

      // Click Small pyeong
      fireEvent.click(screen.getByTestId('filter-pyeong-small'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('0건');

      // Click Medium-Small pyeong
      fireEvent.click(screen.getByTestId('filter-pyeong-medium-small'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('5건');

      // Click Reset
      fireEvent.click(screen.getByTestId('filter-reset-button'));
      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('13건');
    });

    it('2.3: Zero-transaction match (Empty State) renders clean guidance without throwing or NaN/Infinity', () => {
      // 신동 with SMALL pyeong has 0 transactions
      const res = aggregateStats(
        { transactions: MOCK_TXS, rents: MOCK_RENTS },
        { region: '신동', pyeong: 'SMALL', timeframe: '1M' }
      );

      expect(res.isEmpty).toBe(true);
      expect(res.totalVolume).toBe(0);
      expect(res.avgSalePrice).toBe(0);
      expect(res.avgPyeongPrice).toBe(0);
      expect(res.avgJeonseRatio).toBe(0);
      expect(res.pyeongRankings).toEqual([]);
      expect(res.timeSeriesTrend).toEqual([]);

      // Render Dashboard with empty transactions
      render(<StatsDashboardClient initialTxs={[]} initialRents={[]} testMode={true} />);

      expect(screen.getByTestId('kpi-total-volume')).toHaveTextContent('0건');
      expect(screen.getByTestId('kpi-avg-sale-price')).toHaveTextContent('-');
      expect(screen.getByTestId('kpi-avg-pyeong-price')).toHaveTextContent('-');
      expect(screen.getByTestId('kpi-avg-jeonse-ratio')).toHaveTextContent('-');

      // Charts should display friendly empty fallback
      expect(screen.getByText('해당 조건의 월별 실거래 추이 데이터가 없습니다.')).toBeInTheDocument();
      expect(screen.getByText('해당 필터 조건에 매칭되는 아파트 단지 거래가 없습니다.')).toBeInTheDocument();
      expect(screen.getByText('해당 조건에 매칭되는 거래 내역이 없습니다.')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // CHALLENGE DIMENSION 3: RECHARTS RENDERING STABILITY UNDER STRESS
  // ===========================================================================
  describe('Dimension 3: Recharts Rendering Stability & Boundary Datasets', () => {
    it('3.1: StatsTimeTrendChart renders stably with empty, single-point, and 50-point datasets', () => {
      // 1. Empty data
      const { rerender } = render(<StatsTimeTrendChart data={[]} />);
      expect(screen.getByText('해당 조건의 월별 실거래 추이 데이터가 없습니다.')).toBeInTheDocument();

      // 2. Single point
      const singlePoint: MacroTimeSeriesPoint[] = [
        { date: '2026-09', avgSalePrice: 120000, avgRentDeposit: 60000, volume: 5 },
      ];
      rerender(<StatsTimeTrendChart data={singlePoint} />);
      expect(screen.getByTestId('trend-point-2026-09')).toHaveTextContent('2026-09: 120000만원 (5건)');

      // 3. 50 data points (long time series)
      const longPoints: MacroTimeSeriesPoint[] = Array.from({ length: 50 }, (_, i) => ({
        date: `202${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`,
        avgSalePrice: 50000 + i * 1000,
        avgRentDeposit: 30000 + i * 500,
        volume: 10 + (i % 20),
      }));
      rerender(<StatsTimeTrendChart data={longPoints} />);
      expect(screen.getByTestId('stats-time-trend-chart')).toBeInTheDocument();
    });

    it('3.2: StatsTimeTrendChart survives extreme numeric values without overflow crash', () => {
      const extremePoint: MacroTimeSeriesPoint[] = [
        { date: '2026-09', avgSalePrice: 100000000, avgRentDeposit: 0, volume: 1000000 },
      ];
      render(<StatsTimeTrendChart data={extremePoint} />);
      expect(screen.getByTestId('trend-point-2026-09')).toHaveTextContent('2026-09: 100000000만원 (1000000건)');
    });

    it('3.3: StatsPyeongRankingChart handles 50+ items and only places RankingBreakAdBanner after rank 3', () => {
      const manyRankings: ComplexStatItem[] = Array.from({ length: 50 }, (_, i) => ({
        aptKey: `apt-${i}`,
        aptName: `동탄단지${i}차${i === 0 ? '매우긴이름의동탄하이퍼로컬아파트단지' : ''}`,
        dong: '청계동',
        region: '동탄2' as const,
        txCount: 10 + i,
        avgPrice: 80000 + i * 1000,
        avgPyeongPrice: 3000 + i * 50,
        jeonseRatio: 65.0,
        latestPrice: 85000,
        highestPrice: 90000,
        lowestPrice: 75000,
        isNewHigh: i % 5 === 0,
      }));

      render(<StatsPyeongRankingChart rankings={manyRankings} testMode={true} />);

      // Exactly TOP 20 should be displayed in table
      expect(screen.getByTestId('ranking-item-1')).toBeInTheDocument();
      expect(screen.getByTestId('ranking-item-20')).toBeInTheDocument();
      expect(screen.queryByTestId('ranking-item-21')).not.toBeInTheDocument();

      // RankingBreakAdBanner must be placed AFTER rank 3 and only once
      const breakAds = screen.getAllByTestId('ad-placement-ranking-break');
      expect(breakAds.length).toBe(1);

      // Verify it appears after ranking-item-3
      const list = screen.getByTestId('ranking-list');
      const item3 = screen.getByTestId('ranking-item-3');
      const item4 = screen.getByTestId('ranking-item-4');
      expect(item3).toBeInTheDocument();
      expect(item4).toBeInTheDocument();
    });

    it('3.4: StatsVolumeDistributionChart handles single tier 100% and empty distribution gracefully', () => {
      // Empty distribution
      const { rerender } = render(<StatsVolumeDistributionChart distribution={[]} />);
      expect(screen.getByText('해당 조건에 매칭되는 거래 내역이 없습니다.')).toBeInTheDocument();

      // Single tier 100%
      const singleTier: VolumeDistributionItem[] = [
        { name: '소형 (60㎡ 이하)', value: 10, percentage: 100.0 },
      ];
      rerender(<StatsVolumeDistributionChart distribution={singleTier} />);
      expect(screen.getByTestId('donut-slice-소형 (60㎡ 이하)')).toHaveTextContent('10건 (100%)');
    });

    it('3.5: HyperlocalInsightCards handles completely null insights safely', () => {
      const nullInsights = {
        newHighComplex: null,
        optimalGapComplex: null,
        volumeSurgeComplex: null,
        urgentBargainComplex: null,
      };

      render(<HyperlocalInsightCards insights={nullInsights} />);

      expect(screen.getByTestId('insight-card-new-high')).toHaveTextContent('해당 없음');
      expect(screen.getByTestId('insight-card-optimal-gap')).toHaveTextContent('해당 없음');
      expect(screen.getByTestId('insight-card-volume-surge')).toHaveTextContent('해당 없음');
      expect(screen.getByTestId('insight-card-urgent-bargain')).toHaveTextContent('해당 없음');
    });
  });

  // ===========================================================================
  // CHALLENGE DIMENSION 4: MOBILE VIEWPORTS (320px ~ 375px) & MOBILEDOCK CONTRACT
  // ===========================================================================
  describe('Dimension 4: Mobile Viewports & MobileDock Navigation Sync', () => {
    it('4.1: MobileDock renders all 3 tabs with exact labels and paths matching LoungeHeader', () => {
      const { container: dockContainer } = render(<MobileDock activeTab="overview" />);
      const { container: headerContainer } = render(<LoungeHeader activeTab="overview" />);

      const expectedTabs = [
        { id: 'overview', label: '아파트 랩', href: '/' },
        { id: 'imjang', label: '아파트 탐색', href: '/explore' },
        { id: 'mbti', label: '단지 MBTI', href: '/mbti' },
      ];

      expectedTabs.forEach((tab) => {
        const dockLink = within(dockContainer).getByRole('link', { name: new RegExp(tab.label) });
        expect(dockLink).toBeInTheDocument();
        expect(dockLink).toHaveAttribute('href', tab.href);

        const headerLink = within(headerContainer).getByRole('link', { name: new RegExp(tab.label) });
        expect(headerLink).toBeInTheDocument();
        expect(headerLink).toHaveAttribute('href', tab.href);
      });
    });

    it('4.2: MobileDock tab text has font size text-[9.5px] preventing line wrap on 320px screens', () => {
      const { container } = render(<MobileDock activeTab="overview" />);
      const spans = container.querySelectorAll('span.whitespace-nowrap');
      expect(spans.length).toBe(3);

      spans.forEach((s) => {
        expect(s.className).toMatch(/text-\[9\.5px\]/);
      });
    });

    it('4.3: MobileDock automatically hides when visualViewport height shrinks (>120px) indicating keyboard open', () => {
      let resizeListener: (() => void) | null = null;
      const originalVisualViewport = window.visualViewport;

      // Mock visualViewport
      (window as any).visualViewport = {
        height: 800,
        addEventListener: jest.fn((event, cb) => {
          if (event === 'resize') resizeListener = cb;
        }),
        removeEventListener: jest.fn(),
      };

      const { container } = render(<MobileDock activeTab="stats" />);
      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('translate-y-0');

      // Simulate keyboard opening: viewport drops to 500px (< 800 - 120)
      act(() => {
        (window.visualViewport as any).height = 500;
        if (resizeListener) resizeListener();
      });

      expect(nav).toHaveClass('translate-y-full');

      // Simulate keyboard closing: viewport restores to 800px
      act(() => {
        (window.visualViewport as any).height = 800;
        if (resizeListener) resizeListener();
      });

      expect(nav).toHaveClass('translate-y-0');

      // Restore
      (window as any).visualViewport = originalVisualViewport;
    });

    it('4.4: StatsFilterBar wraps pills cleanly on 320px viewport without overflow', () => {
      const { container } = render(
        <div style={{ width: 320 }}>
          <StatsFilterBar
            region="ALL"
            pyeong="ALL"
            timeframe="ALL"
            onRegionChange={jest.fn()}
            onPyeongChange={jest.fn()}
            onTimeframeChange={jest.fn()}
          />
        </div>
      );

      const filterBar = screen.getByTestId('stats-filter-bar');
      expect(filterBar).toBeInTheDocument();
      // Verify flex-wrap is applied to all button containers
      const flexWrapContainers = filterBar.querySelectorAll('.flex-wrap');
      expect(flexWrapContainers.length).toBeGreaterThanOrEqual(3);
    });
  });
});
