import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchAllApartments: jest.fn().mockResolvedValue([]),
}));

// Mock Recharts
jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
    PieChart: ({ children }: any) => <svg data-testid="pie-chart">{children}</svg>,
    Pie: ({ children, onClick, data }: any) => (
      <g data-testid="pie" onClick={() => onClick && data && data[0] && onClick(data[0])}>
        {children}
      </g>
    ),
    Cell: ({ fill }: any) => <path data-testid="pie-cell" fill={fill} />,
    LineChart: ({ children }: any) => <svg>{children}</svg>,
    Line: () => <g />,
    XAxis: () => <g />,
    YAxis: () => <g />,
    CartesianGrid: () => <g />,
    Tooltip: () => <div />,
  };
});

import { AptDonutSection } from '@/components/macro/components/AptDonutSection';
import { AptMetricCards } from '@/components/macro/components/AptMetricCards';

describe('Milestone M2 Apartment Lab Market Energy & Metric Cards Integration Suite', () => {
  const mockTransactions = [
    {
      aptName: '동탄역 롯데캐슬',
      txKey: '동탄역롯데캐슬',
      contractDate: '20260818',
      priceVal: 16.5,
      priceEok: '16억 5,000만',
      area: 84.9,
      areaPyeong: 34.2,
      floor: 25,
      isNewHigh: true,
      delta: 0.8,
      deltaPercent: 5.1,
    },
    {
      aptName: '동탄역 시범 우남퍼스트빌',
      txKey: '동탄역시범우남퍼스트빌',
      contractDate: '20260817',
      priceVal: 11.2,
      priceEok: '11억 2,000만',
      area: 84.8,
      areaPyeong: 33.8,
      floor: 18,
      isNewHigh: false,
      delta: 0.4,
      deltaPercent: 3.7,
    },
    {
      aptName: '동탄역 시범 더샵 센트럴시티',
      txKey: '동탄역시범더샵센트럴시티',
      contractDate: '20260816',
      priceVal: 12.0,
      priceEok: '12억',
      area: 84.5,
      areaPyeong: 33.5,
      floor: 12,
      isNewHigh: false,
      delta: 0,
      deltaPercent: 0,
    },
    {
      aptName: '동탄역 시범 한화꿈에그린',
      txKey: '동탄역시범한화꿈에그린',
      contractDate: '20260815',
      priceVal: 11.5,
      priceEok: '11억 5,000만',
      area: 84.7,
      areaPyeong: 33.6,
      floor: 10,
      isNewHigh: false,
      delta: -0.3,
      deltaPercent: -2.5,
    },
  ];

  const mockSummary = {
    동탄역롯데캐슬: { dong: '오산동' },
    동탄역시범우남퍼스트빌: { dong: '청계동' },
    동탄역시범더샵센트럴시티: { dong: '청계동' },
    동탄역시범한화꿈에그린: { dong: '청계동' },
  };

  it('renders both AptDonutSection and AptMetricCards harmoniously', () => {
    const mockOnSelectApt = jest.fn();
    const mockOnOpenSellTiming = jest.fn();

    render(
      <div className="flex flex-col gap-4">
        <AptDonutSection
          mounted={true}
          recentTransactions={mockTransactions}
          txSummaryData={mockSummary as any}
          onSelectApt={mockOnSelectApt}
          initialMode="energy"
        />
        <AptMetricCards
          recentTransactions={mockTransactions}
          txSummaryData={mockSummary as any}
          onOpenSellTimingCalculator={mockOnOpenSellTiming}
        />
      </div>
    );

    // Donut Section Verification
    expect(screen.getByText('실거래 시장 체감 온도')).toBeInTheDocument();
    expect(screen.getByText('신고가')).toBeInTheDocument();
    expect(screen.getByText('상승거래')).toBeInTheDocument();
    expect(screen.getByText('보합')).toBeInTheDocument();
    expect(screen.getByText('하락거래')).toBeInTheDocument();

    // Metric Cards Verification
    expect(screen.getByText('신고가 달성')).toBeInTheDocument();
    expect(screen.getByText('평당 평균 실거래가')).toBeInTheDocument();
    expect(screen.getByText('평균 전세가율')).toBeInTheDocument();
    expect(screen.getByText('우리집 적정 가치 & 매도 타이밍')).toBeInTheDocument();

    // CTA interaction
    const ctaBtn = screen.getByLabelText(/우리집 적정 가치 및 매도 타이밍 진단 계산기 열기/i);
    fireEvent.click(ctaBtn);
    expect(mockOnOpenSellTiming).toHaveBeenCalledTimes(1);
  });

  it('handles large volume (1,000+ transactions) smoothly and accurately', () => {
    const largeDataset = Array.from({ length: 1200 }, (_, i) => ({
      aptName: `단지_${i % 20}`,
      txKey: `단지_${i % 20}`,
      contractDate: '20260818',
      priceVal: 10 + (i % 10),
      areaPyeong: 34,
      isNewHigh: i % 10 === 0, // 120 new highs
      delta: (i % 3 === 0 ? 0.5 : (i % 3 === 1 ? -0.5 : 0)),
    }));

    render(
      <div className="flex flex-col gap-4">
        <AptDonutSection
          mounted={true}
          recentTransactions={largeDataset}
          initialMode="energy"
        />
        <AptMetricCards
          recentTransactions={largeDataset}
        />
      </div>
    );

    // 120 new highs present in both Donut breakdown and Metric card
    expect(screen.getAllByText('120건').length).toBeGreaterThanOrEqual(2);
  });

  it('connects donut category selection to 4 representative transaction cards in AptMetricCards', () => {
    const mockOnSelectApt = jest.fn();

    const IntegratedContainer = () => {
      const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
      const [activeSector, setActiveSector] = React.useState<any>(null);

      return (
        <div className="flex flex-col gap-4">
          <AptDonutSection
            mounted={true}
            recentTransactions={mockTransactions}
            txSummaryData={mockSummary as any}
            initialMode="pyeong"
            activeCategory={activeCategory}
            onActiveCategoryChange={setActiveCategory}
            onActiveSectorChange={setActiveSector}
          />
          <AptMetricCards
            recentTransactions={mockTransactions}
            txSummaryData={mockSummary as any}
            activeSector={activeSector}
            onResetSector={() => {
              setActiveCategory(null);
              setActiveSector(null);
            }}
            onSelectApt={mockOnSelectApt}
          />
        </div>
      );
    };

    render(<IntegratedContainer />);

    // Initially displays default 4 macro KPIs
    expect(screen.getByText('평당 평균 실거래가')).toBeInTheDocument();
    expect(screen.getByText('우리집 적정 가치 & 매도 타이밍')).toBeInTheDocument();

    // Click '국민평형 (30평대)' donut card
    const mediumCard = screen.getByLabelText(/국민평형 \(30평대\) 4건.*하단 대표 실거래 4건 확인/i);
    fireEvent.click(mediumCard);

    // AptMetricCards dynamically transforms into representative transaction cards without extra header
    expect(screen.queryByText(/대표 실거래/)).not.toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('동탄역 롯데캐슬')).toBeInTheDocument();
    expect(screen.getByText('16억 5,000만')).toBeInTheDocument();

    // Clicking the representative transaction card opens the apartment modal
    const repCard = screen.getByLabelText(/동탄역 롯데캐슬 16억 5,000만 실거래 상세 리포트 열기/i);
    fireEvent.click(repCard);
    expect(mockOnSelectApt).toHaveBeenCalledWith('동탄역 롯데캐슬', '오산동');

    // Clicking '선택 초기화' resets back to macro KPIs
    const resetBtn = screen.getByText('선택 초기화');
    fireEvent.click(resetBtn);
    expect(screen.getByText('평당 평균 실거래가')).toBeInTheDocument();
    expect(screen.getByText('우리집 적정 가치 & 매도 타이밍')).toBeInTheDocument();
  });
});

