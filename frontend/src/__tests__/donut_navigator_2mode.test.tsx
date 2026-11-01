import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockTrackEvent = jest.fn();

jest.mock('@/lib/utils/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchAllApartments: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/hooks/useStaticData', () => ({
  usePeriodTransactions: jest.fn(() => ({ data: null, isLoading: false })),
}));

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    PieChart: ({ children }: { children: React.ReactNode }) => <svg data-testid="pie-chart">{children}</svg>,
    Pie: ({
      children,
      onClick,
      data,
    }: {
      children: React.ReactNode;
      onClick?: (entry: unknown) => void;
      data?: unknown[];
    }) => (
      <g data-testid="pie" onClick={() => onClick && data && data[0] && onClick(data[0])}>
        {children}
      </g>
    ),
    Cell: ({ fill }: { fill?: string }) => <path data-testid="pie-cell" fill={fill} />,
    Tooltip: () => <div />,
  };
});

import { AptDonutSection, type AptDonutDataItem } from '@/components/macro/AptDonutSection';
import { AptMetricCards } from '@/components/macro/AptMetricCards';

const REAL_SHAPE_TRANSACTIONS = [
  {
    aptName: '동탄역 롯데캐슬',
    txKey: '동탄역롯데캐슬',
    dong: '오산동',
    contractDate: '20261028',
    priceVal: 15.2,
    priceEok: '15억 2,000만',
    area: 84.9,
    areaPyeong: 34.2,
    floor: 32,
    isNewHigh: true,
    delta: 0.7,
    deltaPercent: 4.8,
  },
  {
    aptName: '동탄린스트라우스더레이크',
    txKey: '동탄린스트라우스더레이크',
    dong: '송동',
    contractDate: '20261027',
    priceVal: 12.6,
    priceEok: '12억 6,000만',
    area: 98.4,
    areaPyeong: 38.0,
    floor: 24,
    isNewHigh: false,
    delta: 0.4,
    deltaPercent: 3.3,
  },
  {
    aptName: '동탄호수공원 아이파크',
    txKey: '동탄호수공원아이파크',
    dong: '장지동',
    contractDate: '20261026',
    priceVal: 7.4,
    priceEok: '7억 4,000만',
    area: 84.5,
    areaPyeong: 33.4,
    floor: 15,
    isNewHigh: false,
    delta: -0.65,
    deltaPercent: -8.1,
  },
  {
    aptName: '동탄2 금강펜테리움 센트럴파크2차',
    txKey: '동탄2금강펜테리움센트럴파크2차',
    dong: '산척동',
    contractDate: '20261025',
    priceVal: 6.8,
    priceEok: '6억 8,000만',
    area: 84.2,
    areaPyeong: 33.1,
    floor: 11,
    isNewHigh: false,
    delta: -0.35,
    deltaPercent: -4.9,
  },
  {
    aptName: '동탄역 시범 우남퍼스트빌',
    txKey: '동탄역시범우남퍼스트빌',
    dong: '청계동',
    contractDate: '20261024',
    priceVal: 10.9,
    priceEok: '10억 9,000만',
    area: 84.8,
    areaPyeong: 33.8,
    floor: 18,
    isNewHigh: false,
    delta: 0.25,
    deltaPercent: 2.3,
  },
  {
    aptName: '동탄역 시범 더샵 센트럴시티',
    txKey: '동탄역시범더샵센트럴시티',
    dong: '청계동',
    contractDate: '20261023',
    priceVal: 11.4,
    priceEok: '11억 4,000만',
    area: 84.5,
    areaPyeong: 33.5,
    floor: 20,
    isNewHigh: false,
    delta: 0,
    deltaPercent: 0,
  },
  {
    aptName: '시범다은마을 월드메르디앙 반도유보라',
    txKey: '시범다은마을월드메르디앙반도유보라',
    dong: '반송동',
    contractDate: '20261022',
    priceVal: 5.5,
    priceEok: '5억 5,000만',
    area: 59.9,
    areaPyeong: 24.8,
    floor: 9,
    isNewHigh: false,
    delta: -0.9,
    deltaPercent: -14.1,
  },
  {
    aptName: '신동탄 포레자이',
    txKey: '신동탄포레자이',
    dong: '반월동',
    contractDate: '20261021',
    priceVal: 5.8,
    priceEok: '5억 8,000만',
    area: 59.8,
    areaPyeong: 25.0,
    floor: 14,
    isNewHigh: false,
    delta: 0.15,
    deltaPercent: 2.7,
  },
  {
    aptName: '힐스테이트 동탄',
    txKey: '힐스테이트동탄',
    dong: '영천동',
    contractDate: '20261020',
    priceVal: 7.9,
    priceEok: '7억 9,000만',
    area: 84.6,
    areaPyeong: 33.5,
    floor: 19,
    isNewHigh: false,
    delta: 0.2,
    deltaPercent: 2.6,
  },
];

const MOCK_SUMMARY = {
  동탄역롯데캐슬: { dong: '오산동', latestPrice: 152000, txCount: 45 },
  동탄린스트라우스더레이크: { dong: '송동', latestPrice: 126000, txCount: 28 },
  동탄호수공원아이파크: { dong: '장지동', latestPrice: 74000, txCount: 19 },
  동탄2금강펜테리움센트럴파크2차: { dong: '산척동', latestPrice: 68000, txCount: 22 },
  동탄역시범우남퍼스트빌: { dong: '청계동', latestPrice: 109000, txCount: 31 },
  동탄역시범더샵센트럴시티: { dong: '청계동', latestPrice: 114000, txCount: 36 },
  시범다은마을월드메르디앙반도유보라: { dong: '반송동', latestPrice: 55000, txCount: 40 },
  신동탄포레자이: { dong: '반월동', latestPrice: 58000, txCount: 25 },
  힐스테이트동탄: { dong: '영천동', latestPrice: 79000, txCount: 34 },
} as any;

const MOCK_TREND = [{ name: '26.10', price: 84000, rent: 51000, volume: 195 }] as any;

function ConnectedHeroLeftHarness({
  onSelectApt = jest.fn(),
}: {
  onSelectApt?: jest.Mock;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<AptDonutDataItem | null>(null);

  return (
    <div>
      <AptDonutSection
        variant="navigator"
        initialMode="zone"
        initialPeriod="90d"
        mounted={true}
        recentTransactions={REAL_SHAPE_TRANSACTIONS}
        txSummaryData={MOCK_SUMMARY}
        activeCategory={activeCategory}
        onActiveCategoryChange={setActiveCategory}
        onActiveSectorChange={setActiveSector}
        onSelectApt={onSelectApt}
      />
      <AptMetricCards
        recentTransactions={REAL_SHAPE_TRANSACTIONS}
        txSummaryData={MOCK_SUMMARY}
        macroTrendData={MOCK_TREND}
        activeSector={activeSector}
        onResetSector={() => setActiveCategory(null)}
        onSelectApt={onSelectApt}
      />
    </div>
  );
}

describe('Single-View Zone Count & Avg Price Circular Donut Navigator + Connected 4-Card Drilldown', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
  });

  it('renders single fixed "권역별 거래·평균가" view without mode tabs or budget filter pills, showing count (share%) and avg price per zone', () => {
    render(<ConnectedHeroLeftHarness />);

    // Fixed single-view header
    expect(screen.getByText('권역별 거래·평균가')).toBeInTheDocument();
    expect(screen.getByText('총 9건')).toBeInTheDocument();

    // Mode tabs and budget filter sub-bar are completely removed
    expect(screen.queryByTestId('donut-mode-zone')).not.toBeInTheDocument();
    expect(screen.queryByTestId('donut-mode-energy')).not.toBeInTheDocument();
    expect(screen.queryByTestId('donut-navigator-subbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('donut-budget-all')).not.toBeInTheDocument();
    expect(screen.queryByText('내 예산별 인기 권역')).not.toBeInTheDocument();
    expect(screen.queryByText('상승 vs 급매 탐지기')).not.toBeInTheDocument();

    // Center HUD displays total count and overall average price
    expect(screen.getByText('9건')).toBeInTheDocument();
    expect(screen.getByText(/전체 평균 9\.3억/)).toBeInTheDocument();

    // All 6 Dongtan core zones appear in the interactive legend (북동탄 and 신주거 separated)
    expect(screen.getAllByText('동탄호수권').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('시범단지·청계권').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('동탄1신도시').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('동탄역권').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('북동탄').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('신주거').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('북·중동탄·신주거')).not.toBeInTheDocument();

    // Verify exact count (share%) · 평균 X.X억 format on zone rows
    const lakeRow = screen.getByTestId('donut-legend-lake');
    expect(lakeRow).toHaveTextContent('3건');
    expect(lakeRow).toHaveTextContent('(33.4%)');
    expect(lakeRow).toHaveTextContent('평균 8.9억');

    const sibeomRow = screen.getByTestId('donut-legend-sibeom');
    expect(sibeomRow).toHaveTextContent('2건');
    expect(sibeomRow).toHaveTextContent('(22.2%)');
    expect(sibeomRow).toHaveTextContent('평균 11.2억');

    const gbcxRow = screen.getByTestId('donut-legend-gbcx');
    expect(gbcxRow).toHaveTextContent('1건');
    expect(gbcxRow).toHaveTextContent('(11.1%)');
    expect(gbcxRow).toHaveTextContent('평균 15.2억');

    // Zero-transaction zone omits synthetic average price
    const newtownRow = screen.getByTestId('donut-legend-newtown');
    expect(newtownRow).toHaveTextContent('0건');
    expect(newtownRow).toHaveTextContent('(0.0%)');
    expect(newtownRow).not.toHaveTextContent('평균');
  });

  it('drills down into connected 4-Card AptMetricCards when a zone row is clicked and resets cleanly', () => {
    render(<ConnectedHeroLeftHarness />);

    const sibeomRow = screen.getByTestId('donut-legend-sibeom');
    fireEvent.click(sibeomRow);

    expect(sibeomRow).toHaveAttribute('aria-pressed', 'true');
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'donut_slice_select',
      expect.objectContaining({
        mode: 'zone',
        category: 'sibeom',
        slice_name: '시범단지·청계권',
        budget: 'all',
      })
    );

    // Connected 4-Card Drilldown immediately populates with real transactions from 시범단지·청계권
    expect(screen.getByTestId('donut-reset-selection')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getAllByText(/시범 더샵 센트럴시티|더샵 센트럴시티/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/시범 우남퍼스트빌|우남퍼스트빌/).length).toBeGreaterThanOrEqual(1);

    // Clicking "선택 초기화" clears the drilldown back to summary KPIs
    fireEvent.click(screen.getByTestId('donut-reset-selection'));
    expect(screen.queryByTestId('donut-reset-selection')).not.toBeInTheDocument();
  });

  it('maintains strict Ad Money Design System invariants (zero Unicode emojis, zero legacy monospace fonts)', () => {
    const { container } = render(<ConnectedHeroLeftHarness />);
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    expect(emojiRegex.test(container.textContent || '')).toBe(false);
    expect(container.innerHTML).not.toMatch(/font-mono|Consolas|Gulim/i);
  });

  it('strictly separates 북동탄 (영천동·금곡동) and 신주거 (신동·목동) transactions with accurate counts and average prices', () => {
    const splitTxs = [
      {
        aptName: '동탄역 푸르지오',
        txKey: '동탄역푸르지오',
        dong: '영천동',
        contractDate: '20261029',
        priceVal: 10.5,
        priceEok: '10억 5,000만',
        area: 84.9,
        areaPyeong: 34.0,
        floor: 15,
      },
      {
        aptName: '힐스테이트 동탄',
        txKey: '힐스테이트동탄',
        dong: '목동',
        contractDate: '20261028',
        priceVal: 8.6,
        priceEok: '8억 6,000만',
        area: 84.6,
        areaPyeong: 33.5,
        floor: 18,
      },
      {
        aptName: '동탄파크릭스 A52BL',
        txKey: '동탄파크릭스A52BL',
        dong: '신동',
        contractDate: '20261027',
        priceVal: 7.8,
        priceEok: '7억 8,000만',
        area: 84.9,
        areaPyeong: 34.0,
        floor: 12,
      },
    ];

    render(
      <AptDonutSection
        variant="navigator"
        initialMode="zone"
        initialPeriod="90d"
        mounted={true}
        recentTransactions={splitTxs}
      />
    );

    const northLegend = screen.getByTestId('donut-legend-north');
    const newtownLegend = screen.getByTestId('donut-legend-newtown');

    expect(northLegend).toHaveTextContent('북동탄');
    expect(northLegend).toHaveTextContent('1건');
    expect(northLegend).toHaveTextContent('(33.3%)');
    expect(northLegend).toHaveTextContent('평균 10.5억');

    expect(newtownLegend).toHaveTextContent('신주거');
    expect(newtownLegend).toHaveTextContent('2건');
    expect(newtownLegend).toHaveTextContent('(66.7%)');
    expect(newtownLegend).toHaveTextContent('평균 8.2억');
  });

  it('enforces chart-dominant width ratio with 10% scaled-down donut box and lg:h-[360px] Zero-CLS height', () => {
    const { container } = render(<ConnectedHeroLeftHarness />);

    const root = container.querySelector('#apt-market-energy-donut');
    expect(root?.className).toContain('sm:min-h-[315px]');
    expect(root?.className).toContain('lg:h-[360px]');

    const chartPane = screen.getByTestId('donut-chart-pane');
    const chartBox = screen.getByTestId('donut-chart-box');
    const legendPane = screen.getByTestId('donut-legend-pane');

    expect(chartPane.className).toContain('sm:flex-1');
    expect(chartBox.className).toContain('xl:w-[220px]');
    expect(chartBox.className).toContain('2xl:w-[262px]');
    expect(legendPane.className).toContain('shrink-0');
    expect(legendPane.className).toContain('xl:w-[280px]');
    expect(legendPane.className).toContain('2xl:w-[324px]');
    expect(legendPane.className).not.toContain('sm:flex-1');
  });
});
