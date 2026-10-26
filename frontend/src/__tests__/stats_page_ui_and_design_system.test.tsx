/**
 * @file stats_page_ui_and_design_system.test.tsx
 * @description Comprehensive UI & Design System Component Test Suite for
 * DVIEW Apartment Statistics Hub (/stats) and Issue #1:
 * "The Impact of Distance to Dongtan Station on Apartment Prices"
 *
 * Verifies:
 * 1. StatsTopicSelector extensibility & topic switching
 * 2. StationPremiumSummary 4 KPI cards & executive takeaways
 * 3. DistanceBandComparisonChart 5 tiers, metric toggles, and Zero-CLS height
 * 4. DistanceRegressionScatterPlot SVG structure, OLS line & tooltips
 * 5. ComplexDrillDownTable filters, sorting, and h-[52px] fixed row heights
 * 6. StatsSkeleton Zero-CLS layout geometry
 * 7. StatsPageClient integration & 4 AdMoney v5.0 AdSlots
 * 8. Design System invariants (Zero Unicode emojis, Zero prohibited color tokens, tabular-nums)
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import fs from 'fs';
import path from 'path';

// Components under test
import { StatsTopicSelector } from '@/components/stats/StatsTopicSelector';
import { StationPremiumSummary } from '@/components/stats/StationPremiumSummary';
import { DistanceBandComparisonChart } from '@/components/stats/DistanceBandComparisonChart';
import { DistanceRegressionScatterPlot } from '@/components/stats/DistanceRegressionScatterPlot';
import { ComplexDrillDownTable } from '@/components/stats/ComplexDrillDownTable';
import { StatsSkeleton } from '@/components/stats/StatsSkeleton';
import { StatsPageClient } from '@/app/stats/StatsPageClient';
import StatsPage from '@/app/stats/page';

// Engine & Types
import { getDongtanStationAnalysisData } from '@/lib/stats/dongtanStationDistanceEngine';
import { STATS_TOPICS } from '@/types/statsTopic';

// Mocks
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
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}));

jest.mock('@/contexts/SettingsContext', () => ({
  useSettingsUi: () => ({
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
  }),
  useSettingsValues: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
  }),
  useSettings: () => ({
    areaUnit: 'm2',
    setAreaUnit: jest.fn(),
    theme: 'light',
    setTheme: jest.fn(),
    isSettingsModalOpen: false,
    setIsSettingsModalOpen: jest.fn(),
  }),
}));

// Mock AdSlot to inspect slotId & format without triggering real AdSense network calls
jest.mock('@/components/ads/AdSlot', () => ({
  AdSlot: ({ slotId, format, className }: any) => (
    <div
      data-testid="ad-slot"
      data-slot-id={slotId}
      data-format={format}
      className={`adslot-mock ${className || ''}`}
    >
      AdSlot: {slotId} ({format})
    </div>
  ),
}));

describe('Ad Money v5.0 UI Components & Topic Research Hub (/stats)', () => {
  const analysisData = getDongtanStationAnalysisData();

  // =========================================================================
  // 1. StatsTopicSelector
  // =========================================================================
  describe('1. StatsTopicSelector Component', () => {
    test('renders all topics from STATS_TOPICS registry', () => {
      render(<StatsTopicSelector currentTopicId="dongtan-station-distance" />);
      STATS_TOPICS.forEach((topic) => {
        expect(screen.getByText(topic.title)).toBeInTheDocument();
        expect(screen.getByText(topic.badge)).toBeInTheDocument();
      });
    });

    test('highlights current active topic and dispatches onSelectTopic on click', () => {
      const handleSelect = jest.fn();
      render(
        <StatsTopicSelector
          currentTopicId="dongtan-station-distance"
          onSelectTopic={handleSelect}
        />
      );

      const issue2Button = screen.getByText('초품아 및 명문 학군이 형성하는 동탄 아파트 프리미엄').closest('button');
      expect(issue2Button).not.toBeNull();
      fireEvent.click(issue2Button!);

      expect(handleSelect).toHaveBeenCalledWith('school-district-premium');
    });

    test('shows active reading indicator only on current topic', () => {
      render(<StatsTopicSelector currentTopicId="dongtan-station-distance" />);
      expect(screen.getByText('열람 중')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 2. StationPremiumSummary
  // =========================================================================
  describe('2. StationPremiumSummary Component', () => {
    test('renders 4 executive KPI soft cards with correct values and units', () => {
      const { container } = render(
        <StationPremiumSummary
          regression={analysisData.regression}
          distanceTiers={analysisData.distanceTiers}
          totalComplexCount={analysisData.allRecords.length}
          totalTxCount={analysisData.allRecords.reduce((acc, r) => acc + r.txCount, 0)}
        />
      );

      // KPI 1: Station Premium (+67.4% ~ +67.7%)
      expect(screen.getAllByText(/\+67\.[47]%/).length).toBeGreaterThanOrEqual(1);

      // KPI 2: -383만원/평
      expect(screen.getByText('-383만원/평')).toBeInTheDocument();

      // KPI 3: r = -0.66 · R² = 0.44
      expect(screen.getByText('r = -0.66 · R² = 0.44')).toBeInTheDocument();

      // KPI 4: 127개 단지 전수
      expect(screen.getByText('127개 단지 전수')).toBeInTheDocument();

      // Check soft-surface styling classes
      const cards = container.querySelectorAll('.rounded-2xl');
      expect(cards.length).toBeGreaterThanOrEqual(4);
    });

    test('renders executive takeaways callout with 3 bullet points', () => {
      render(
        <StationPremiumSummary
          regression={analysisData.regression}
          distanceTiers={analysisData.distanceTiers}
        />
      );

      expect(screen.getByText(/압도적인 초역세권 프리미엄/)).toBeInTheDocument();
      expect(screen.getByText(/1km당 383만원 감가 감응도/)).toBeInTheDocument();
      expect(screen.getByText(/높은 설명력과 음\(-\)의 상관관계/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. DistanceBandComparisonChart
  // =========================================================================
  describe('3. DistanceBandComparisonChart Component', () => {
    test('renders all 5 distance tiers (<500m, 500m-1km, 1km-2km, 2km-3km, 3km+)', () => {
      render(<DistanceBandComparisonChart distanceTiers={analysisData.distanceTiers} />);

      expect(screen.getByText('<500m')).toBeInTheDocument();
      expect(screen.getByText('500m-1km')).toBeInTheDocument();
      expect(screen.getByText('1km-2km')).toBeInTheDocument();
      expect(screen.getByText('2km-3km')).toBeInTheDocument();
      expect(screen.getByText('3km+')).toBeInTheDocument();
    });

    test('preserves Zero-CLS pre-reserved min-height container', () => {
      const { container } = render(
        <DistanceBandComparisonChart distanceTiers={analysisData.distanceTiers} />
      );

      const section = container.querySelector('section');
      expect(section?.className).toContain('min-h-[380px]');
    });

    test('toggles between pyeong, price, and volume metrics', () => {
      const onMetricChange = jest.fn();
      render(
        <DistanceBandComparisonChart
          distanceTiers={analysisData.distanceTiers}
          onMetricChange={onMetricChange}
        />
      );

      const priceToggle = screen.getByText('평균 매매가');
      fireEvent.click(priceToggle);
      expect(onMetricChange).toHaveBeenCalledWith('price');

      const volumeToggle = screen.getByText('거래량·단지수');
      fireEvent.click(volumeToggle);
      expect(onMetricChange).toHaveBeenCalledWith('volume');
    });
  });

  // =========================================================================
  // 4. DistanceRegressionScatterPlot
  // =========================================================================
  describe('4. DistanceRegressionScatterPlot Component', () => {
    test('renders responsive pure SVG scatter plot with viewBox="0 0 800 480"', () => {
      const { container } = render(
        <DistanceRegressionScatterPlot
          records={analysisData.filteredRecords}
          regression={analysisData.regression}
        />
      );

      const svg = container.querySelector('svg[viewBox="0 0 800 480"]');
      expect(svg).not.toBeNull();
      expect(svg?.getAttribute('viewBox')).toBe('0 0 800 480');
    });

    test('renders scatter circle for each apartment complex', () => {
      const { container } = render(
        <DistanceRegressionScatterPlot
          records={analysisData.filteredRecords}
          regression={analysisData.regression}
        />
      );

      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBe(analysisData.filteredRecords.length);
    });

    test('renders linear regression OLS line and formula badge', () => {
      const { container } = render(
        <DistanceRegressionScatterPlot
          records={analysisData.filteredRecords}
          regression={analysisData.regression}
        />
      );

      const lines = container.querySelectorAll('line[stroke="#3182f6"]');
      expect(lines.length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/y = -383x \+ 3,41[38]/)).toBeInTheDocument();
    });

    test('shows interactive tooltip on circle hover', () => {
      const { container } = render(
        <DistanceRegressionScatterPlot
          records={analysisData.filteredRecords}
          regression={analysisData.regression}
        />
      );

      const firstCircle = container.querySelector('circle');
      expect(firstCircle).not.toBeNull();

      fireEvent.mouseEnter(firstCircle!);
      expect(screen.getByText(analysisData.filteredRecords[0].name)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 5. ComplexDrillDownTable
  // =========================================================================
  describe('5. ComplexDrillDownTable Component', () => {
    test('renders multi-dimensional filter controls and quick sort buttons', () => {
      render(
        <ComplexDrillDownTable
          records={analysisData.filteredRecords}
          filters={analysisData.filters}
          onFilterChange={jest.fn()}
        />
      );

      expect(screen.getByText('소형 (~59㎡)')).toBeInTheDocument();
      expect(screen.getByText('국민평형 (84㎡)')).toBeInTheDocument();
      expect(screen.getByText('신축 (≤5년)')).toBeInTheDocument();
      expect(screen.getByText('동탄역 거리순')).toBeInTheDocument();
      expect(screen.getByText('평당가 높은순')).toBeInTheDocument();
    });

    test('dispatches filter updates when toggling area band or sort', () => {
      const onFilterChange = jest.fn();
      render(
        <ComplexDrillDownTable
          records={analysisData.filteredRecords}
          filters={analysisData.filters}
          onFilterChange={onFilterChange}
        />
      );

      fireEvent.click(screen.getByText('국민평형 (84㎡)'));
      expect(onFilterChange).toHaveBeenCalledWith({ areaBand: 'medium' });

      fireEvent.click(screen.getByText('평당가 높은순'));
      expect(onFilterChange).toHaveBeenCalledWith({ sortBy: 'pyeongPriceDesc' });
    });

    test('renders table rows with fixed height h-[52px] for Zero-CLS stability', () => {
      const { container } = render(
        <ComplexDrillDownTable
          records={analysisData.filteredRecords}
          filters={analysisData.filters}
          onFilterChange={jest.fn()}
        />
      );

      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBeGreaterThan(0);
      rows.forEach((row) => {
        expect(row.className).toContain('h-[52px]');
      });
    });

    test('filters list dynamically by search query', () => {
      render(
        <ComplexDrillDownTable
          records={analysisData.filteredRecords}
          filters={analysisData.filters}
          onFilterChange={jest.fn()}
        />
      );

      const searchInput = screen.getByPlaceholderText('단지명 또는 동 검색...');
      fireEvent.change(searchInput, { target: { value: '롯데캐슬' } });

      const matches = screen.getAllByText(/롯데캐슬/);
      expect(matches.length).toBeGreaterThan(0);
    });

    test('displays graceful empty state message when no records match', () => {
      render(
        <ComplexDrillDownTable
          records={[]}
          filters={analysisData.filters}
          onFilterChange={jest.fn()}
        />
      );

      expect(screen.getByText('선택한 필터 조건에 부합하는 단지가 없습니다.')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 6. StatsSkeleton
  // =========================================================================
  describe('6. StatsSkeleton Component', () => {
    test('renders matching Zero-CLS skeleton blocks', () => {
      const { container } = render(<StatsSkeleton />);
      expect(container.querySelector('[aria-label="통계 페이지 로딩 스켈레톤"]')).not.toBeNull();
      expect(container.querySelector('.min-h-\\[380px\\]')).not.toBeNull();
      expect(container.querySelector('.h-\\[400px\\]')).not.toBeNull();
    });
  });

  // =========================================================================
  // 7. StatsPageClient & AdSlot Placements
  // =========================================================================
  describe('7. StatsPageClient Component', () => {
    test('mounts and renders all 4 AdMoney v5.0 AdSlots', () => {
      render(<StatsPageClient />);

      const adSlots = screen.getAllByTestId('ad-slot');
      expect(adSlots).toHaveLength(4);

      const slotFormats = adSlots.map((slot) => slot.getAttribute('data-format'));
      expect(slotFormats).toEqual(['horizontal-strip', 'in-feed', 'rectangle', 'banner']);

      const slotIds = adSlots.map((slot) => slot.getAttribute('data-slot-id'));
      expect(slotIds).toEqual([
        '1000000001_stats_top',
        '1000000002_stats_mid',
        '1000000003_stats_table',
        '1000000004_stats_bottom',
      ]);
    });

    test('switches between active report and upcoming placeholder when selecting topic', () => {
      render(<StatsPageClient />);

      // Initially Issue #1 is active
      expect(screen.getByText('초역세권 프리미엄 격차')).toBeInTheDocument();

      // Click Issue #2 (upcoming topic)
      const topic2Btn = screen.getByText('초품아 및 명문 학군이 형성하는 동탄 아파트 프리미엄').closest('button');
      fireEvent.click(topic2Btn!);

      // Shows upcoming topic placeholder
      expect(screen.getByText('Issue #1 동탄역 거리 분석 리포트 보기')).toBeInTheDocument();

      // Click button to return to Issue #1
      fireEvent.click(screen.getByText('Issue #1 동탄역 거리 분석 리포트 보기'));
      expect(screen.getByText('초역세권 프리미엄 격차')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 8. StatsPage Server Component
  // =========================================================================
  describe('8. StatsPage Server Component', () => {
    test('renders semantic main content, h1 heading, LoungeHeader, and MobileDock', () => {
      const { container } = render(<StatsPage />);

      expect(container.querySelector('main#main-content')).not.toBeNull();
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('아파트 통계');
      expect(container.querySelector('header')).not.toBeNull();
      expect(container.querySelector('a[href="/stats"]')).not.toBeNull();
    });
  });

  // =========================================================================
  // 9. Design System & Zero-Emoji Guardrails
  // =========================================================================
  describe('9. Design System & Zero-Emoji Guardrails', () => {
    const targetFiles = [
      path.resolve(__dirname, '../app/stats/page.tsx'),
      path.resolve(__dirname, '../app/stats/StatsPageClient.tsx'),
      path.resolve(__dirname, '../components/stats/StatsTopicSelector.tsx'),
      path.resolve(__dirname, '../components/stats/StationPremiumSummary.tsx'),
      path.resolve(__dirname, '../components/stats/DistanceBandComparisonChart.tsx'),
      path.resolve(__dirname, '../components/stats/DistanceRegressionScatterPlot.tsx'),
      path.resolve(__dirname, '../components/stats/ComplexDrillDownTable.tsx'),
      path.resolve(__dirname, '../components/stats/StatsSkeleton.tsx'),
    ];

    test('All Worker M3 files contain EXACTLY 0 Unicode emojis', () => {
      const emojiRegex =
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

      targetFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          const match = line.match(emojiRegex);
          expect(match ? `Emoji violation in ${path.basename(file)} line ${idx + 1}: ${match[0]}` : null).toBeNull();
        });
      });
    });

    test('All Worker M3 files contain EXACTLY 0 prohibited Tailwind color tokens', () => {
      const prohibitedColorRegex =
        /\b(?:bg|text|border|ring|fill|stroke)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|zinc|neutral|stone|gray|teal|cyan|sky|green)(?:-[a-z0-9/\[\]]+)?\b/i;

      targetFiles.forEach((file) => {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          const match = line.match(prohibitedColorRegex);
          expect(match ? `Prohibited color violation in ${path.basename(file)} line ${idx + 1}: ${match[0]}` : null).toBeNull();
        });
      });
    });
  });
});
