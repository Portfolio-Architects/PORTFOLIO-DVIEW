import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import MacroDashboardClient from '../MacroDashboardClient';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockSheetApartments: Record<string, DongApartment[]> = {
  반송동: [
    {
      name: '시범한빛금호어울림',
      dong: '반송동',
      txKey: 'ban-1',
    } as DongApartment,
  ],
  청계동: [
    {
      name: '동탄역시범우남퍼스트빌',
      dong: '청계동',
      txKey: 'cheong-1',
    } as DongApartment,
  ],
  여울동: [
    {
      name: '동탄역 롯데캐슬',
      dong: '여울동',
      txKey: 'yeoul-1',
    } as DongApartment,
  ],
};

const mockTxSummaryData: Record<string, AptTxSummary> = {
  '동탄역 롯데캐슬': {
    dong: '여울동',
    latestPrice: '16.5억',
    latestPriceEok: 16.5,
    avgPrice: 165000,
    txCount: 10,
  } as unknown as AptTxSummary,
  '동탄역시범우남퍼스트빌': {
    dong: '청계동',
    latestPrice: '11.5억',
    latestPriceEok: 11.5,
    avgPrice: 115000,
    txCount: 8,
  } as unknown as AptTxSummary,
};

const mockRecentTransactions = [
  {
    aptName: '동탄역 롯데캐슬',
    txKey: 'tx-1',
    date: '09.15',
    contractDate: '20260915',
    priceVal: 16.5,
    priceEok: '16억 5,000만',
    area: 84.9,
    areaPyeong: 25.7,
    floor: 20,
    dealType: '매매',
    isNewHigh: true,
  },
  {
    aptName: '동탄역시범우남퍼스트빌',
    txKey: 'tx-2',
    date: '09.12',
    contractDate: '20260912',
    priceVal: 11.5,
    priceEok: '11억 5,000만',
    area: 84.5,
    areaPyeong: 25.6,
    floor: 12,
    dealType: '매매',
    isNewHigh: false,
  },
];

const mockMacroTrendData: DongtanMacroTrendPoint[] = [
  { name: '26.07', price: 78000, rent: 45000, volume: 150 },
  { name: '26.08', price: 81000, rent: 46000, volume: 180 },
  { name: '26.09', price: 83000, rent: 47000, volume: 210 },
];

describe('MacroDashboardClient Authoritative Layout & Hybrid Integration', () => {
  it('renders unified Timeline + Hyperlocal Insights + Ranking Tab Switcher in authoritative vertical order', () => {
    const onSelectApt = jest.fn();

    const { container } = render(
      <SettingsProvider>
        <AuthProvider>
          <MacroDashboardClient
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            macroTrendData={mockMacroTrendData}
            publicRentalSet={new Set()}
            fieldReportsMap={new Map()}
            favoriteCounts={{}}
            recentTransactions={mockRecentTransactions}
            onSelectApt={onSelectApt}
          />
        </AuthProvider>
      </SettingsProvider>
    );

    // 1. Signature Donut Hero + Wide-View Center Hairline + Prime AdSlot 1 Directly Below Hero (No Duplicate Bridge Bar)
    expect(screen.queryByTestId('hero-finance-quick-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('donut-finance-bridge')).not.toBeInTheDocument();
    const donutSection = container.querySelector('#apt-market-energy-donut');
    expect(donutSection).toBeInTheDocument();
    const heroLeftCol = screen.getByTestId('hero-left-donut-col');
    const heroRightCol = screen.getByTestId('hero-right-chart-col');
    expect(heroLeftCol.className).toContain('lg:border-r');
    expect(heroLeftCol.className).toContain('lg:border-border');
    expect(heroLeftCol.className).toContain('lg:pr-6');
    expect(heroRightCol.className).toContain('lg:pl-6');
    expect(screen.queryByTestId('personal-watchlist-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('zone2-live-pulse-grid')).not.toBeInTheDocument();

    const trendChartTitles = screen.getAllByText(/시세 추이/);
    expect(trendChartTitles.length).toBeGreaterThanOrEqual(1);

    // 2. Unified Timeline in Hero (compactHeroMode) + Hyperlocal Insights in Zone 3
    expect(screen.queryByTestId('stats-overview-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline-summary-kpi-bar')).not.toBeInTheDocument();
    expect(screen.getAllByTestId('stats-hyperlocal-insights').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('timeline-view-tab-switcher')).not.toBeInTheDocument();

    // 3. AdSlots rendered with zero-CLS containers (Prime AdSlot 1 + Timeline In-Feed AdSlot 3 + Finance AdSlot 2)
    const adContainers = screen.getAllByTestId('ad-slot-container');
    expect(adContainers.length).toBeGreaterThanOrEqual(3);
    expect(screen.getByTestId('timeline-infeed-ad-slot')).toBeInTheDocument();

    // 4. Prime Hero-to-Timeline AdSlot 1 directly after Donut & Timeline Hero
    const heroAdSlot1 = screen.getByTestId('hero-ad-slot-1');
    expect(heroAdSlot1).toBeInTheDocument();
    expect(
      donutSection!.compareDocumentPosition(heroAdSlot1) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const timelineHeading = screen.getByText('일자별 최근 실거래');
    expect(timelineHeading).toBeInTheDocument();
    expect(
      timelineHeading.compareDocumentPosition(heroAdSlot1) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // 5. Option C: HighCpcFinanceSection removed from Main Dashboard while preserving AdSlot 2, Guides & Lower 7:5 Retention Hub
    expect(screen.queryByTestId('high-cpc-finance-section')).not.toBeInTheDocument();
    const financeAdSlot2 = screen.getByTestId('finance-ad-slot-2');
    expect(financeAdSlot2).toBeInTheDocument();
    const guidesGrid = screen.getByTestId('curated-guides-grid');
    expect(guidesGrid).toBeInTheDocument();
    expect(guidesGrid.className).toContain('md:grid-cols-2');
    expect(guidesGrid.children).toHaveLength(4);
    expect(screen.getByTestId('guide-card-dongtan-1-vs-2-comparison')).toBeInTheDocument();
    expect(screen.getByTestId('guide-card-dongtan-budget-tier-ranking')).toBeInTheDocument();
    expect(screen.getByTestId('guide-card-dongtan-lake-vs-station-comparison')).toBeInTheDocument();
    expect(screen.getByTestId('guide-card-dongtan-school-zone-top-apartments')).toBeInTheDocument();
    const retentionGrid = screen.getByTestId('zone4-retention-community-grid');
    expect(retentionGrid).toBeInTheDocument();

    expect(
      timelineHeading.compareDocumentPosition(financeAdSlot2) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      financeAdSlot2.compareDocumentPosition(guidesGrid) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      guidesGrid.compareDocumentPosition(retentionGrid) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('enforces 2-A Hybrid Navigation: 1st click previews chart inline, explicit detail CTA navigates to canonical apartment page', () => {
    const onNavigateApartmentPage = jest.fn();

    render(
      <SettingsProvider>
        <AuthProvider>
          <MacroDashboardClient
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            macroTrendData={mockMacroTrendData}
            publicRentalSet={new Set()}
            fieldReportsMap={new Map()}
            favoriteCounts={{}}
            recentTransactions={mockRecentTransactions}
            onNavigateApartmentPage={onNavigateApartmentPage}
          />
        </AuthProvider>
      </SettingsProvider>
    );

    // 1st click on a timeline card body updates chart preview without navigating away
    const previewBtn = screen.getByRole('button', {
      name: /실거래 분석 아파트 선택: 동탄역시범우남퍼스트빌/,
    });
    fireEvent.click(previewBtn);
    expect(onNavigateApartmentPage).not.toHaveBeenCalled();

    // Explicit click on Chart Header detail CTA triggers canonical page navigation
    const chartDetailCta = screen.getByTestId('chart-header-detail-cta');
    fireEvent.click(chartDetailCta);
    expect(onNavigateApartmentPage).toHaveBeenCalledTimes(1);
    expect(onNavigateApartmentPage).toHaveBeenCalledWith(
      '동탄역시범우남퍼스트빌',
      expect.any(String)
    );
  });

  it('wires complex item click from HyperlocalInsightCards up to MacroDashboardClient onSelectApt', () => {
    const onSelectApt = jest.fn();

    render(
      <SettingsProvider>
        <AuthProvider>
          <MacroDashboardClient
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            macroTrendData={mockMacroTrendData}
            publicRentalSet={new Set()}
            fieldReportsMap={new Map()}
            favoriteCounts={{}}
            recentTransactions={mockRecentTransactions}
            onSelectApt={onSelectApt}
          />
        </AuthProvider>
      </SettingsProvider>
    );

    const newHighCard = screen.getByTestId('insight-card-new-high');
    expect(newHighCard).toBeInTheDocument();
    fireEvent.click(newHighCard);

    // Verify onSelectApt was called
    expect(onSelectApt).toHaveBeenCalledTimes(1);
    expect(onSelectApt).toHaveBeenCalledWith(
      expect.stringContaining('동탄역 롯데캐슬'),
      expect.anything()
    );
  });

  it('verifies apt-market-energy-donut is preserved and accessible for /stats', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AptDonutSection = require('@/components/macro/AptDonutSection').default;
    const { container } = render(
      <AptDonutSection
        recentTransactions={mockRecentTransactions}
        txSummaryData={mockTxSummaryData}
        sheetApartments={mockSheetApartments}
      />
    );
    expect(container.querySelector('#apt-market-energy-donut')).toBeInTheDocument();
  });

  it('adapts internal grids and padding cleanly when Master-Detail split workspace is active (isSplitMode=true)', () => {
    render(
      <SettingsProvider>
        <AuthProvider>
          <MacroDashboardClient
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            macroTrendData={mockMacroTrendData}
            publicRentalSet={new Set()}
            fieldReportsMap={new Map()}
            favoriteCounts={{}}
            recentTransactions={mockRecentTransactions}
            isSplitMode={true}
          />
        </AuthProvider>
      </SettingsProvider>
    );

    const heroGrid = screen.getByTestId('hero-donut-trend-grid');
    expect(screen.queryByTestId('high-cpc-finance-section')).not.toBeInTheDocument();
    const guidesGrid = screen.getByTestId('curated-guides-grid');
    const retentionGrid = screen.getByTestId('zone4-retention-community-grid');

    expect(heroGrid.className).toContain('grid-cols-1');
    expect(heroGrid.className).not.toContain('lg:grid-cols-12');
    expect(heroGrid.className).not.toContain('2xl:grid-cols-12');
    expect(guidesGrid.className).toContain('grid-cols-1');
    expect(guidesGrid.className).not.toContain('md:grid-cols-2');
    expect(guidesGrid.className).not.toContain('md:grid-cols-3');
    expect(guidesGrid.className).not.toContain('xl:grid-cols-3');
    expect(retentionGrid.className).toContain('grid-cols-1');
    expect(retentionGrid.className).not.toContain('lg:grid-cols-12');
    expect(retentionGrid.className).not.toContain('2xl:grid-cols-12');
  });

  it('adapts TossApartmentExploreClient container padding and secondary category sidebar when Master-Detail split workspace is active (isSplitMode=true)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TossApartmentExploreClient = require('@/components/TossApartmentExploreClient').default;
    const { rerender } = render(
      <SettingsProvider>
        <AuthProvider>
          <TossApartmentExploreClient
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            nameMapping={{}}
            fieldReportsMap={new Map()}
            publicRentalSet={new Set()}
            typeMap={{}}
            handleSelectApt={jest.fn()}
            isSplitMode={false}
          />
        </AuthProvider>
      </SettingsProvider>
    );

    const mainContainer = screen.getByTestId('explore-main-container');
    const categorySidebar = screen.getByTestId('explore-category-sidebar');
    expect(mainContainer.className).toContain('lg:px-16');
    expect(categorySidebar.className).toContain('hidden md:flex');

    rerender(
      <SettingsProvider>
        <AuthProvider>
          <TossApartmentExploreClient
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            nameMapping={{}}
            fieldReportsMap={new Map()}
            publicRentalSet={new Set()}
            typeMap={{}}
            handleSelectApt={jest.fn()}
            isSplitMode={true}
          />
        </AuthProvider>
      </SettingsProvider>
    );

    expect(mainContainer.className).toContain('md:px-5');
    expect(categorySidebar.className).toContain('hidden 2xl:flex');
  });

  it('unifies mobile (375px) insight card, timeline card, and ranking clicks onto single detail modal callback without rendering MacroMobileDrawer', () => {
    const onSelectApt = jest.fn();
    const originalInnerWidth = window.innerWidth;

    try {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <SettingsProvider>
          <AuthProvider>
            <MacroDashboardClient
              sheetApartments={mockSheetApartments}
              txSummaryData={mockTxSummaryData}
              macroTrendData={mockMacroTrendData}
              publicRentalSet={new Set()}
              fieldReportsMap={new Map()}
              favoriteCounts={{}}
              recentTransactions={mockRecentTransactions}
              onSelectApt={onSelectApt}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      // 1. Insight card click triggers unified detail modal callback once with zero mobile drawer
      const newHighCard = screen.getByTestId('insight-card-new-high');
      fireEvent.click(newHighCard);

      expect(onSelectApt).toHaveBeenCalledTimes(1);
      expect(onSelectApt).toHaveBeenCalledWith('동탄역 롯데캐슬', '여울동');
      expect(screen.queryByTestId('mobile-drawer-action-footer')).not.toBeInTheDocument();
      expect(screen.queryByTestId('mobile-drawer-detail-cta')).not.toBeInTheDocument();

      // 2. Timeline card click on mobile directly opens unified detail modal callback (no drawer)
      onSelectApt.mockClear();
      const timelineCardBtn = screen.getByRole('button', {
        name: /실거래 분석 아파트 선택: 동탄역시범우남퍼스트빌/,
      });
      fireEvent.click(timelineCardBtn);

      expect(onSelectApt).toHaveBeenCalledTimes(1);
      expect(onSelectApt).toHaveBeenCalledWith('동탄역시범우남퍼스트빌', '청계동');
      expect(screen.queryByTestId('mobile-drawer-action-footer')).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('routes AptMetricCards activeSector drilldown directly to detail modal on desktop & mobile and propagates resolved dong when summary lacks dong', () => {
    const onSelectApt = jest.fn();
    const originalInnerWidth = window.innerWidth;

    const txWithMissingSummaryDong = [
      {
        aptName: '시범한빛금호어울림',
        txKey: 'tx-ban-1',
        date: '09.18',
        contractDate: '20260918',
        priceVal: 19.2,
        priceEok: '19억 2,000만',
        area: 84.9,
        areaPyeong: 25.7,
        floor: 15,
        dealType: '매매',
        type: 'high',
        isNewHigh: true,
      },
      ...mockRecentTransactions,
    ];

    try {
      // Desktop viewport (1280px)
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1280,
      });

      render(
        <SettingsProvider>
          <AuthProvider>
            <MacroDashboardClient
              sheetApartments={mockSheetApartments}
              txSummaryData={mockTxSummaryData}
              macroTrendData={mockMacroTrendData}
              publicRentalSet={new Set()}
              fieldReportsMap={new Map()}
              favoriteCounts={{}}
              recentTransactions={txWithMissingSummaryDong}
              onSelectApt={onSelectApt}
            />
          </AuthProvider>
        </SettingsProvider>
      );

      // 1. Insight card for apartment absent from txSummaryData still resolves dong from sheetApartments
      fireEvent.click(screen.getByTestId('insight-card-new-high'));
      expect(onSelectApt).toHaveBeenCalledWith('시범한빛금호어울림', '반송동');

      // 2. Selecting donut sector switches AptMetricCards to 4 representative tx cards -> click opens modal on desktop
      onSelectApt.mockClear();
      fireEvent.click(screen.getByTestId('donut-legend-high'));
      const repCardDesktop = screen.getByLabelText(/시범한빛금호어울림.*실거래 상세 리포트 열기/);
      fireEvent.click(repCardDesktop);
      expect(onSelectApt).toHaveBeenCalledTimes(1);
      expect(onSelectApt).toHaveBeenCalledWith('시범한빛금호어울림', '반송동');

      // 3. Same AptMetricCards drilldown click on mobile (375px) opens unified detail modal cleanly without drawer
      onSelectApt.mockClear();
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      fireEvent.click(repCardDesktop);
      expect(onSelectApt).toHaveBeenCalledTimes(1);
      expect(onSelectApt).toHaveBeenCalledWith('시범한빛금호어울림', '반송동');
      expect(screen.queryByTestId('mobile-drawer-action-footer')).not.toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    }
  });

  it('renders Zone 4B lower bento as a symmetric 2x2 unified soft-surface grid and opens AptFitFinder modal from standalone AptFitFinderCard', () => {
    render(
      <SettingsProvider>
        <AuthProvider>
          <MacroDashboardClient
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            macroTrendData={mockMacroTrendData}
            publicRentalSet={new Set()}
            fieldReportsMap={new Map()}
            favoriteCounts={{}}
            recentTransactions={mockRecentTransactions}
          />
        </AuthProvider>
      </SettingsProvider>
    );

    const retentionGrid = screen.getByTestId('zone4-retention-community-grid');
    expect(retentionGrid).toBeInTheDocument();

    const noticeHeading = screen.getByText('동탄 철도 교통 게시판');
    const retentionCard = screen.getByTestId('retention-action-card');
    const loungeCard = screen.getByTestId('lounge-entry-card');
    const aptFitFinderCard = screen.getByTestId('apt-fit-finder-card');

    expect(retentionGrid).toContainElement(noticeHeading);
    expect(retentionGrid).toContainElement(retentionCard);
    expect(retentionGrid).toContainElement(loungeCard);
    expect(retentionGrid).toContainElement(aptFitFinderCard);

    // Unified bg-elevated rounded-2xl soft surface across all 4 cards
    expect(retentionGrid.children).toHaveLength(4);
    expect(retentionCard.className).toContain('bg-elevated');
    expect(retentionCard.className).toContain('rounded-2xl');
    expect(loungeCard.className).toContain('bg-elevated');
    expect(loungeCard.className).toContain('rounded-2xl');
    expect(aptFitFinderCard.className).toContain('bg-elevated');
    expect(aptFitFinderCard.className).toContain('rounded-2xl');

    // Separate AptFitFinder button is absent from RetentionActionCard and mounted on AptFitFinderCard
    expect(retentionCard).not.toHaveTextContent('내게 맞는 단지 찾기');

    // Clicking standalone AptFitFinder CTA opens AptFitFinder modal
    const ctaButton = screen.getByTestId('apt-fit-finder-cta');
    fireEvent.click(ctaButton);
    expect(screen.getByText('나만의 동탄 찰떡 아파트 찾기')).toBeInTheDocument();
  });

  it('stacks Zone 4B bento into single-column grid when isSplitMode=true', () => {
    render(
      <SettingsProvider>
        <AuthProvider>
          <MacroDashboardClient
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            macroTrendData={mockMacroTrendData}
            publicRentalSet={new Set()}
            fieldReportsMap={new Map()}
            favoriteCounts={{}}
            recentTransactions={mockRecentTransactions}
            isSplitMode={true}
          />
        </AuthProvider>
      </SettingsProvider>
    );

    const retentionGrid = screen.getByTestId('zone4-retention-community-grid');
    expect(retentionGrid.className).toContain('grid-cols-1');
    expect(retentionGrid.className).not.toContain('lg:grid-cols-12');
    expect(retentionGrid.children).toHaveLength(4);
  });

  it('defaults Zone 3 real-transaction chart to Dongtan-wide with single timeframe toggle (no duplicate granularity bar)', () => {
    render(
      <SettingsProvider>
        <AuthProvider>
          <MacroDashboardClient
            sheetApartments={mockSheetApartments}
            txSummaryData={mockTxSummaryData}
            macroTrendData={[
              { name: '26.09', '동탄 아파트 전체': 8.03, '동탄 아파트 전세 평균': 4.61, saleCount: 241, rentCount: 404 },
              { name: '26.10', '동탄 아파트 전체': 8.59, '동탄 아파트 전세 평균': 4.93, saleCount: 347, rentCount: 559 },
              { name: '26.11', '동탄 아파트 전체': 9.02, '동탄 아파트 전세 평균': 4.83, saleCount: 230, rentCount: 248 },
            ]}
            publicRentalSet={new Set()}
            fieldReportsMap={new Map()}
            favoriteCounts={{}}
            recentTransactions={mockRecentTransactions}
          />
        </AuthProvider>
      </SettingsProvider>
    );

    // Defaults to Dongtan-wide real transaction trend (not 동탄역 롯데캐슬)
    expect(screen.getByText('동탄 전체 아파트 실거래 시세 추이')).toBeInTheDocument();
    expect(screen.queryByText('동탄역 롯데캐슬 시세 추이')).not.toBeInTheDocument();

    // No separate daily/weekly/monthly toggle bar (auto-resolved via single timeframe selector)
    expect(screen.queryByTestId('chart-granularity-toggle')).not.toBeInTheDocument();

    // Displays total transaction counts for visible period (241 + 347 + 230 = 818)
    expect(screen.getByTestId('chart-period-tx-summary')).toHaveTextContent('818건');

    // Single timeframe selector transitions cleanly (3M/6M/1Y -> weekly, 3Y/5Y/ALL -> monthly)
    fireEvent.click(screen.getByRole('button', { name: '1Y' }));
    expect(screen.getByRole('button', { name: '1Y' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '3M' }));
    expect(screen.getByRole('button', { name: '3M' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: '3Y' }));
    expect(screen.getByRole('button', { name: '3Y' })).toHaveAttribute('aria-pressed', 'true');
  });
});
