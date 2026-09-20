import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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

// Mock Recharts ResponsiveContainer to avoid size warnings in jsdom
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div style={{ width: '800px', height: '400px' }}>{children}</div>
    ),
  };
});

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
  it('renders all sections in authoritative order: Hero -> StatsOverviewSection -> AdSlot 1 -> Timeline -> Finance -> Rankings -> AdSlot 2', () => {
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

    // 1. Signature Hero components (Donut section & Price trend chart)
    const donutContainer = container.querySelector('#apt-market-energy-donut');
    expect(donutContainer).toBeInTheDocument();
    const trendChartTitles = screen.getAllByText(/시세 추이/);
    expect(trendChartTitles.length).toBeGreaterThanOrEqual(1);

    // 2. StatsOverviewSection immediately below
    const statsSection = screen.getByTestId('stats-overview-section');
    expect(statsSection).toBeInTheDocument();
    expect(screen.getByText('동탄 실거래 통계 지표 & 하이퍼로컬 인사이트')).toBeInTheDocument();
    expect(screen.getByTestId('stats-kpi-grid')).toBeInTheDocument();

    // 3. AdSlots rendered with zero-CLS containers
    const adContainers = screen.getAllByTestId('ad-slot-container');
    expect(adContainers.length).toBeGreaterThanOrEqual(2);

    // 4. Timeline View
    const timelineHeading = screen.getByText('일자별 최근 실거래');
    expect(timelineHeading).toBeInTheDocument();

    // 5. Finance Section
    const financeSection = screen.getByTestId('high-cpc-finance-section');
    expect(financeSection).toBeInTheDocument();

    // 6. Realtime Ranking Board
    const rankingBoard = screen.getByTestId('realtime-ranking-board');
    expect(rankingBoard).toBeInTheDocument();

    // DOM Document Position Verification (Authoritative Vertical Flow)
    // Donut Hero is preceding StatsOverviewSection
    expect(
      donutContainer!.compareDocumentPosition(statsSection) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // StatsOverviewSection is preceding Timeline Heading
    expect(
      statsSection.compareDocumentPosition(timelineHeading) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // Timeline Heading is preceding Finance Section
    expect(
      timelineHeading.compareDocumentPosition(financeSection) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    // Finance Section is preceding Ranking Board
    expect(
      financeSection.compareDocumentPosition(rankingBoard) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('wires onSelectApt from StatsOverviewSection ranking item click up to MacroDashboardClient callback', () => {
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

    // Find StatsOverviewSection and its specific ranking list item
    const statsSection = screen.getByTestId('stats-overview-section');
    const rank1Item = within(statsSection).getByTestId('ranking-item-1');
    expect(rank1Item).toBeInTheDocument();
    fireEvent.click(rank1Item);

    // Verify onSelectApt was called
    expect(onSelectApt).toHaveBeenCalledTimes(1);
    expect(onSelectApt).toHaveBeenCalledWith(
      expect.stringContaining('동탄역 롯데캐슬'),
      expect.anything()
    );
  });
});
