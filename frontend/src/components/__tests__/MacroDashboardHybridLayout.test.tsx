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

    // 5. High-CPC Finance Section + AdSlot 2 below Zone 3, followed by Guides & Lower 7:5 Retention Hub
    const financeSection = screen.getByTestId('high-cpc-finance-section');
    expect(financeSection).toBeInTheDocument();
    const financeAdSlot2 = screen.getByTestId('finance-ad-slot-2');
    expect(financeAdSlot2).toBeInTheDocument();
    const guidesGrid = screen.getByTestId('curated-guides-grid');
    expect(guidesGrid).toBeInTheDocument();
    const retentionGrid = screen.getByTestId('zone4-retention-community-grid');
    expect(retentionGrid).toBeInTheDocument();

    expect(
      timelineHeading.compareDocumentPosition(financeSection) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      financeSection.compareDocumentPosition(financeAdSlot2) & Node.DOCUMENT_POSITION_FOLLOWING
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
    const financeGrid = screen.getByTestId('finance-quick-widgets-grid');
    const guidesGrid = screen.getByTestId('curated-guides-grid');
    const retentionGrid = screen.getByTestId('zone4-retention-community-grid');

    expect(heroGrid.className).toContain('grid-cols-1');
    expect(heroGrid.className).not.toContain('lg:grid-cols-12');
    expect(heroGrid.className).not.toContain('2xl:grid-cols-12');
    expect(financeGrid.className).toContain('grid-cols-1');
    expect(financeGrid.className).not.toContain('lg:grid-cols-2');
    expect(guidesGrid.className).toContain('grid-cols-1');
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
});
