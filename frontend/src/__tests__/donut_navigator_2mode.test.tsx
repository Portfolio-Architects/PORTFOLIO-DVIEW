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

import {
  MacroTimelineView,
  type TimelineGroup,
} from '@/components/macro/components/MacroTimelineView';
import type { TradeTypeFilterType } from '@/components/macro/hooks/useMacroFilters';
import type { TimelinePeriod } from '@/types/transaction';

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
        initialMode="energy"
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

function BidirectionalHeroSyncHarness() {
  const [periodFilter, setPeriodFilter] = useState<TimelinePeriod>('90d');
  const [tradeTypeFilter, setTradeTypeFilter] = useState<TradeTypeFilterType>('all');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<AptDonutDataItem | null>(null);
  const [selectedDateJump, setSelectedDateJump] = useState<string | null>(null);

  const handleDonutCategoryChange = (cat: string | null) => {
    if (!cat) {
      setActiveCategory(null);
      setTradeTypeFilter('all');
      return;
    }
    const map: Record<string, TradeTypeFilterType> = {
      high: 'high',
      '신고가 돌파': 'high',
      rising: 'rising',
      '직전가 대비 상승': 'rising',
      flat: 'flat',
      '보합권 체결': 'flat',
      falling: 'falling',
      '직전가 대비 하락·급매': 'falling',
    };
    const nextType = map[cat] || 'all';
    setActiveCategory(nextType === 'all' ? null : nextType);
    setTradeTypeFilter(nextType);
  };

  const handleTradeTypeChange = (nextType: TradeTypeFilterType) => {
    setTradeTypeFilter(nextType);
    setActiveCategory(nextType === 'all' ? null : nextType);
  };

  const rawWithRegDate = [
    {
      ...REAL_SHAPE_TRANSACTIONS[0], // 동탄역 롯데캐슬 (high, +0.7)
      registeredDate: '20261031',
      registeredDateLabel: '2026.10.31 (토)',
    },
    {
      ...REAL_SHAPE_TRANSACTIONS[2], // 동탄호수공원 아이파크 (falling, -0.65)
      registeredDate: '20261031',
      registeredDateLabel: '2026.10.31 (토)',
    },
    {
      ...REAL_SHAPE_TRANSACTIONS[5], // 동탄역 시범 더샵 센트럴시티 (flat, 0)
      registeredDate: '20261030',
      registeredDateLabel: '2026.10.30 (금)',
    },
    {
      ...REAL_SHAPE_TRANSACTIONS[1], // 동탄린스트라우스더레이크 (rising, +0.4)
      registeredDate: '20261015', // >7d ago from 20261031
      registeredDateLabel: '2026.10.15 (목)',
    },
  ];

  const periodScopedRaw =
    periodFilter === '7d'
      ? rawWithRegDate.filter((tx) => tx.registeredDate >= '20261024')
      : rawWithRegDate;

  const donutTransactions = selectedDateJump
    ? periodScopedRaw.filter((tx) => tx.registeredDateLabel === selectedDateJump)
    : periodScopedRaw;

  const timelineGroups: TimelineGroup[] = [
    {
      dateStr: '2026.10.31 (토)',
      dateKey: '2026-10-31',
      timestamp: 1793404800000,
      items: [
        {
          ...rawWithRegDate[0],
          type: 'high',
        },
        {
          ...rawWithRegDate[1],
          type: 'normal',
        },
      ],
    },
    {
      dateStr: '2026.10.30 (금)',
      dateKey: '2026-10-30',
      timestamp: 1793318400000,
      items: [
        {
          ...rawWithRegDate[2],
          type: 'normal',
        },
      ],
    },
  ]
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        const isHigh = item.type === 'high' || Boolean(item.isNewHigh);
        if (tradeTypeFilter === 'high') return isHigh;
        if (tradeTypeFilter === 'rising') return !isHigh && (item.delta || 0) > 0.0001;
        if (tradeTypeFilter === 'flat') return !isHigh && Math.abs(item.delta || 0) <= 0.0001;
        if (tradeTypeFilter === 'falling') return !isHigh && (item.delta || 0) < -0.0001;
        return true;
      }),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div>
      <AptDonutSection
        variant="navigator"
        initialMode="energy"
        period={periodFilter === '7d' || periodFilter === '30d' || periodFilter === '90d' || periodFilter === '1y' ? periodFilter : '90d'}
        onPeriodChange={setPeriodFilter}
        mounted={true}
        recentTransactions={donutTransactions}
        selectedDateLabel={selectedDateJump}
        onClearSelectedDate={() => setSelectedDateJump(null)}
        txSummaryData={MOCK_SUMMARY}
        activeCategory={activeCategory}
        onActiveCategoryChange={handleDonutCategoryChange}
        onActiveSectorChange={setActiveSector}
      />
      <AptMetricCards
        recentTransactions={donutTransactions}
        txSummaryData={MOCK_SUMMARY}
        macroTrendData={MOCK_TREND}
        activeSector={activeSector}
        onResetSector={() => handleDonutCategoryChange(null)}
      />
      <MacroTimelineView
        compactHeroMode={true}
        displayedTimelineData={timelineGroups}
        fullTimelineData={timelineGroups}
        periodFilter={periodFilter}
        setPeriodFilter={setPeriodFilter}
        tradeTypeFilter={tradeTypeFilter}
        setTradeTypeFilter={handleTradeTypeChange}
        pyeongFilter="all"
        setPyeongFilter={jest.fn()}
        selectedDateJump={selectedDateJump}
        onSelectedDateJumpChange={setSelectedDateJump}
        onResetFilters={() => {
          setSelectedDateJump(null);
          handleTradeTypeChange('all');
          setPeriodFilter('90d');
        }}
      />
    </div>
  );
}

describe('Single-View "실거래 체결 온도" Circular Donut Navigator + 3-Way Bidirectional Timeline Sync', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
  });

  it('renders single "실거래 체결 온도" view with 4 temperature slices (high, rising, flat, falling), count (share%) · 평균 X.X억 legend, and bullish energy HUD', () => {
    render(<ConnectedHeroLeftHarness />);

    // Header shows "실거래 체결 온도" and total count
    expect(screen.getByText('실거래 체결 온도')).toBeInTheDocument();
    expect(screen.getByText('총 9건')).toBeInTheDocument();

    // Center HUD displays bullish energy share and high/falling counts
    // high=1, rising=4 -> bullish=5, falling=3 -> 5 / (5 + 3) = 62.5%
    expect(screen.getByText('상승 에너지 우위')).toBeInTheDocument();
    expect(screen.getAllByText('62.5%').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('신고가 1 · 급매 3건')).toBeInTheDocument();

    // 4 ordered slices in the interactive legend: high -> rising -> flat -> falling
    const highRow = screen.getByTestId('donut-legend-high');
    expect(highRow).toHaveTextContent('신고가 돌파');
    expect(highRow).toHaveTextContent('1건');
    expect(highRow).toHaveTextContent('(11.1%)');
    expect(highRow).toHaveTextContent('평균 15.2억');

    const risingRow = screen.getByTestId('donut-legend-rising');
    expect(risingRow).toHaveTextContent('직전가 대비 상승');
    expect(risingRow).toHaveTextContent('4건');
    expect(risingRow).toHaveTextContent('(44.5%)');
    expect(risingRow).toHaveTextContent('평균 9.3억');

    const flatRow = screen.getByTestId('donut-legend-flat');
    expect(flatRow).toHaveTextContent('보합권 체결');
    expect(flatRow).toHaveTextContent('1건');
    expect(flatRow).toHaveTextContent('(11.1%)');
    expect(flatRow).toHaveTextContent('평균 11.4억');

    const fallingRow = screen.getByTestId('donut-legend-falling');
    expect(fallingRow).toHaveTextContent('직전가 대비 하락·급매');
    expect(fallingRow).toHaveTextContent('3건');
    expect(fallingRow).toHaveTextContent('(33.3%)');
    expect(fallingRow).toHaveTextContent('평균 6.6억');
  });

  it('drills down into connected 4-Card AptMetricCards when a temperature slice or pie is clicked and resets cleanly without opening fullscreen on pie click', () => {
    render(<ConnectedHeroLeftHarness />);

    // Clicking the Pie slice directly toggles selection (does NOT open fullscreen modal)
    fireEvent.click(screen.getByTestId('pie'));
    expect(screen.queryByTestId('zone-donut-fullscreen-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('donut-legend-high')).toHaveAttribute('aria-pressed', 'true');

    // Click falling row to inspect steepest discount transactions
    const fallingRow = screen.getByTestId('donut-legend-falling');
    fireEvent.click(fallingRow);

    expect(fallingRow).toHaveAttribute('aria-pressed', 'true');
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'donut_slice_select',
      expect.objectContaining({
        mode: 'energy',
        category: 'falling',
        slice_name: '직전가 대비 하락·급매',
      })
    );

    // Connected 4-Card Drilldown immediately populates with falling transactions
    expect(screen.getByTestId('donut-reset-selection')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();

    // Clicking "선택 초기화" clears the drilldown back to summary KPIs
    fireEvent.click(screen.getByTestId('donut-reset-selection'));
    expect(screen.queryByTestId('donut-reset-selection')).not.toBeInTheDocument();
  });

  it('synchronizes Link 1 (registeredDate & periodFilter), Link 2 (donut slice <-> tradeTypeFilter including flat), and Link 3 (timeline date chip in compactHeroMode -> donut & 4 metric cards)', () => {
    render(<BidirectionalHeroSyncHarness />);

    // Initially 90d: all 4 transactions included in donut and AptMetricCards (rising=2, falling=1 -> risingRatio = 66.7%)
    expect(screen.getByText('총 4건')).toBeInTheDocument();
    expect(screen.getAllByText('66.7%').length).toBeGreaterThanOrEqual(1);

    // Link 1: Click 7일 on right timeline -> left donut and 4 metric cards update to 7d (excludes 20261015 rising tx, leaving 3 transactions; rising=1, falling=1 -> risingRatio = 50.0%)
    const periodButtons7d = screen.getAllByText('7일');
    fireEvent.click(periodButtons7d[periodButtons7d.length - 1]);
    expect(screen.getByText('총 3건')).toBeInTheDocument();
    expect(screen.getAllByText('50.0%').length).toBeGreaterThanOrEqual(1);

    // Switch back to 90일 from left donut -> both sides sync to 90d (4 transactions, risingRatio = 66.7%)
    const periodButtons90d = screen.getAllByText('90일');
    fireEvent.click(periodButtons90d[0]);
    expect(screen.getByText('총 4건')).toBeInTheDocument();
    expect(screen.getAllByText('66.7%').length).toBeGreaterThanOrEqual(1);

    // Link 2: Click "보합권 체결" on left donut -> right timeline tradeTypeFilter dropdown becomes "flat" and filters timeline to 동탄역 시범 더샵 센트럴시티
    fireEvent.click(screen.getByTestId('donut-legend-flat'));
    const tradeTypeSelect = screen.getByTestId('timeline-tradetype-select') as HTMLSelectElement;
    expect(tradeTypeSelect.value).toBe('flat');
    expect(screen.getByTestId('timeline-card-동탄역 시범 더샵 센트럴시티')).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-card-동탄역 롯데캐슬')).not.toBeInTheDocument();

    // Change tradeTypeFilter dropdown on right timeline to "high" -> left donut active slice updates to "신고가 돌파"
    fireEvent.change(tradeTypeSelect, { target: { value: 'high' } });
    expect(screen.getByTestId('donut-legend-high')).toHaveAttribute('aria-pressed', 'true');
    const highTimelineCard = screen.getByTestId('timeline-card-동탄역 롯데캐슬');
    expect(highTimelineCard).toBeInTheDocument();

    // Clicking a transaction card inside MacroTimelineView must NOT wipe out the active donut slice or tradeTypeFilter
    fireEvent.click(highTimelineCard);
    expect(screen.getByTestId('donut-legend-high')).toHaveAttribute('aria-pressed', 'true');
    expect(tradeTypeSelect.value).toBe('high');

    // Reset slice selection -> tradeTypeSelect returns to "all"
    fireEvent.click(screen.getByTestId('donut-reset-selection'));
    expect(tradeTypeSelect.value).toBe('all');

    // Link 3: Select registered date "2026.10.31 (토)" on right timeline dropdown (even in compactHeroMode) -> left donut and 4 metric cards recalculate to only the 2 transactions registered on 2026.10.31
    expect(screen.queryByTestId('timeline-date-jump-bar')).not.toBeInTheDocument();
    const dateSelect = screen.getByTestId('timeline-date-select') as HTMLSelectElement;
    fireEvent.change(dateSelect, { target: { value: '2026.10.31 (토)' } });
    expect(screen.getByText('총 2건')).toBeInTheDocument();
    expect(screen.getByTestId('donut-selected-date-badge')).toHaveTextContent('2026.10.31 (토) 등재');

    // Clearing the selected date badge restores all 4 transactions
    fireEvent.click(screen.getByTestId('donut-selected-date-badge'));
    expect(screen.getByText('총 4건')).toBeInTheDocument();
  });

  it('maintains strict Ad Money Design System invariants (zero Unicode emojis, zero legacy monospace fonts)', () => {
    const { container } = render(<ConnectedHeroLeftHarness />);
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    expect(emojiRegex.test(container.textContent || '')).toBe(false);
    expect(container.innerHTML).not.toMatch(/font-mono|Consolas|Gulim/i);
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
