import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
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
  usePeriodTransactions: jest.fn(() => ({ transactions: [], isLoading: false })),
}));

jest.mock('@/components/common/ComponentPreloader', () => ({
  preloadApartmentModal: jest.fn(),
}));

jest.mock('recharts', () => {
  const OriginalModule = jest.requireActual('recharts');
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div>{children}</div>
    ),
    PieChart: ({ children }: { children: React.ReactNode }) => (
      <svg data-testid="pie-chart">{children}</svg>
    ),
    Pie: ({
      children,
      onClick,
      data,
    }: {
      children: React.ReactNode;
      onClick?: (entry: unknown) => void;
      data?: unknown[];
    }) => (
      <g
        data-testid="pie"
        onClick={() => onClick && data && data[0] && onClick(data[0])}
      >
        {children}
      </g>
    ),
    Cell: ({ fill }: { fill?: string }) => (
      <path data-testid="pie-cell" fill={fill} />
    ),
    Tooltip: () => <div />,
  };
});

import { AptDonutSection } from '@/components/macro/AptDonutSection';
import {
  computeZoneDetailStats,
  sortItemsChronologically,
  extractChronoDateInfo,
} from '@/components/macro/ZoneDonutFullscreenModal';

const REAL_TRANSACTIONS = [
  {
    aptName: '동탄호수공원 아이파크',
    txKey: '동탄호수공원아이파크',
    dong: '장지동',
    contractDate: '20261022',
    priceVal: 7.4,
    priceEok: '7억 4,000만',
    area: 84.5,
    areaPyeong: 33.4,
    floor: 15,
    isNewHigh: false,
    delta: -0.5,
    deltaPercent: -6.3,
  },
  {
    aptName: '동탄린스트라우스더레이크',
    txKey: '동탄린스트라우스더레이크',
    dong: '송동',
    contractDate: '20261028',
    priceVal: 12.6,
    priceEok: '12억 6,000만',
    area: 98.4,
    areaPyeong: 38.0,
    floor: 24,
    isNewHigh: true,
    delta: 0.6,
    deltaPercent: 5.0,
  },
  {
    aptName: '동탄2 금강펜테리움 센트럴파크2차',
    txKey: '동탄2금강펜테리움센트럴파크2차',
    dong: '산척동',
    contractDate: '20261025',
    priceVal: 7.0,
    priceEok: '7억',
    area: 84.2,
    areaPyeong: 33.1,
    floor: 11,
    isNewHigh: false,
    delta: 0.1,
    deltaPercent: 1.4,
  },
  {
    aptName: '동탄역 롯데캐슬',
    txKey: '동탄역롯데캐슬',
    dong: '오산동',
    contractDate: '20261029',
    priceVal: 15.6,
    priceEok: '15억 6,000만',
    area: 84.9,
    areaPyeong: 34.2,
    floor: 32,
    isNewHigh: true,
    delta: 0.8,
    deltaPercent: 5.4,
  },
  {
    aptName: '동탄역 시범 우남퍼스트빌',
    txKey: '동탄역시범우남퍼스트빌',
    dong: '청계동',
    contractDate: '20261019',
    priceVal: 10.8,
    priceEok: '10억 8,000만',
    area: 84.8,
    areaPyeong: 33.8,
    floor: 18,
    isNewHigh: false,
    delta: 0.2,
    deltaPercent: 1.9,
  },
  {
    aptName: '동탄역 시범 더샵 센트럴시티',
    txKey: '동탄역시범더샵센트럴시티',
    dong: '청계동',
    contractDate: '20261027',
    priceVal: 11.4,
    priceEok: '11억 4,000만',
    area: 84.5,
    areaPyeong: 33.5,
    floor: 20,
    isNewHigh: false,
    delta: 0,
    deltaPercent: 0,
  },
];

describe('Fullscreen Zone Donut Explorer & Chronological Real-Transaction Analytics', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    document.body.style.overflow = '';
  });

  it('expands to fullscreen when clicking the donut chart and displays per-zone statistics and chronological transaction lists', () => {
    const onOpenAptDetail = jest.fn();

    render(
      <AptDonutSection
        variant="navigator"
        initialMode="zone"
        initialPeriod="90d"
        mounted={true}
        recentTransactions={REAL_TRANSACTIONS}
        onOpenAptDetail={onOpenAptDetail}
      />
    );

    // Initially fullscreen modal is not mounted
    expect(screen.queryByTestId('zone-donut-fullscreen-modal')).not.toBeInTheDocument();

    // Click on the dedicated 크게 보기 button
    fireEvent.click(screen.getByTestId('donut-fullscreen-open-btn'));

    const modal = screen.getByTestId('zone-donut-fullscreen-modal');
    expect(modal).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(
      within(modal).getByText('권역별 실거래 · 시세 상세 분석')
    ).toBeInTheDocument();

    // Overall statistics grid shows accurate real calculations (6 transactions)
    const statsGrid = within(modal).getByTestId('fullscreen-stats-grid');
    expect(statsGrid).toHaveTextContent('6건');
    expect(statsGrid).toHaveTextContent('신고가 2건');

    // Zone section for 동탄호수권 renders per-zone stats AND strictly chronological rows (10.28 -> 10.25 -> 10.22)
    const lakeSection = within(modal).getByTestId('fullscreen-zone-section-lake');
    expect(lakeSection).toHaveTextContent('동탄호수권');
    expect(lakeSection).toHaveTextContent('거래 3건 (50.0%)');
    expect(lakeSection).toHaveTextContent('평균 9억');
    expect(lakeSection).toHaveTextContent('중위 7억 4,000만');
    expect(lakeSection).toHaveTextContent('신고가 1건');

    const lakeButtons = within(lakeSection)
      .getAllByRole('button')
      .filter((btn) =>
        btn.getAttribute('data-testid')?.startsWith('fullscreen-tx-row-')
      );
    expect(lakeButtons).toHaveLength(3);
    expect(lakeButtons[0]).toHaveTextContent('2026.10.28');
    expect(lakeButtons[0]).toHaveTextContent('린스트라우스더레이크');
    expect(lakeButtons[1]).toHaveTextContent('2026.10.25');
    expect(lakeButtons[1]).toHaveTextContent('금강펜테리움');
    expect(lakeButtons[2]).toHaveTextContent('2026.10.22');
    expect(lakeButtons[2]).toHaveTextContent('아이파크');

    // Switch chronological sort to 과거순 (oldest first: 10.22 -> 10.25 -> 10.28)
    fireEvent.click(within(modal).getByTestId('fullscreen-sort-oldest'));
    const reversedLakeButtons = within(
      within(modal).getByTestId('fullscreen-zone-section-lake')
    )
      .getAllByRole('button')
      .filter((btn) =>
        btn.getAttribute('data-testid')?.startsWith('fullscreen-tx-row-')
      );
    expect(reversedLakeButtons[0]).toHaveTextContent('2026.10.22');
    expect(reversedLakeButtons[1]).toHaveTextContent('2026.10.25');
    expect(reversedLakeButtons[2]).toHaveTextContent('2026.10.28');

    // Clicking a transaction row dispatches onOpenAptDetail with (aptName, dong)
    fireEvent.click(reversedLakeButtons[2]);
    expect(onOpenAptDetail).toHaveBeenCalledWith(
      '동탄린스트라우스더레이크',
      '송동'
    );
  });

  it('filters statistics and chronological feed to a single zone and switches to unified timeline mode cleanly', () => {
    render(
      <AptDonutSection
        variant="navigator"
        initialMode="zone"
        initialPeriod="90d"
        mounted={true}
        recentTransactions={REAL_TRANSACTIONS}
      />
    );

    // Open via dedicated expand button
    fireEvent.click(screen.getByTestId('donut-fullscreen-open-btn'));
    const modal = screen.getByTestId('zone-donut-fullscreen-modal');

    // Switch to 통합 시간순 across all zones
    fireEvent.click(within(modal).getByTestId('fullscreen-group-unified'));
    const unifiedStream = within(modal).getByTestId('fullscreen-unified-stream');
    const unifiedRows = within(unifiedStream)
      .getAllByRole('button')
      .filter((b) =>
        b.getAttribute('data-testid')?.startsWith('fullscreen-tx-row-')
      );
    expect(unifiedRows).toHaveLength(6);
    // Latest deal overall is 2026.10.29 동탄역 롯데캐슬
    expect(unifiedRows[0]).toHaveTextContent('2026.10.29');
    expect(unifiedRows[0]).toHaveTextContent('동탄역권');

    // Drill down to 시범단지·청계권 via zone tab
    fireEvent.click(within(modal).getByTestId('fullscreen-zone-tab-sibeom'));
    const statsGrid = within(modal).getByTestId('fullscreen-stats-grid');
    expect(statsGrid).toHaveTextContent('2건');
    expect(statsGrid).toHaveTextContent('11억 1,000만'); // (10.8 + 11.4) / 2 = 11.1억

    // Search filter narrows results and Escape closes modal cleanly
    const searchInput = within(modal).getByTestId('fullscreen-search-input');
    fireEvent.change(searchInput, { target: { value: '우남' } });
    const filteredRows = within(
      within(modal).getByTestId('fullscreen-unified-stream')
    )
      .getAllByRole('button')
      .filter((b) =>
        b.getAttribute('data-testid')?.startsWith('fullscreen-tx-row-')
      );
    expect(filteredRows).toHaveLength(1);
    expect(filteredRows[0]).toHaveTextContent('우남퍼스트빌');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('zone-donut-fullscreen-modal')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });

  it('enforces Ad Money v5.0 invariants (zero emojis, zero legacy monospace fonts, honest empty data handling)', () => {
    render(
      <AptDonutSection
        variant="navigator"
        initialMode="zone"
        initialPeriod="90d"
        mounted={true}
        recentTransactions={[]}
      />
    );

    fireEvent.click(screen.getByTestId('donut-fullscreen-open-btn'));
    const modal = screen.getByTestId('zone-donut-fullscreen-modal');

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(modal.textContent || '')).toBe(false);
    expect(modal.innerHTML).not.toMatch(/font-mono|Consolas|Gulim/i);
    expect(
      within(modal).getByText('선택한 기간에 등록된 실거래 내역이 없습니다.')
    ).toBeInTheDocument();
  });

  it('opens fullscreen only when clicking donut-fullscreen-open-btn (not donut-chart-pane) and displays the 4 energy temperature slices in default navigator mode', () => {
    render(
      <AptDonutSection
        variant="navigator"
        initialPeriod="90d"
        mounted={true}
        recentTransactions={REAL_TRANSACTIONS}
      />
    );

    const openBtn = screen.getByTestId('donut-fullscreen-open-btn');
    expect(openBtn).toHaveTextContent('크게 보기');

    // Clicking donut-chart-pane must NOT open fullscreen
    fireEvent.click(screen.getByTestId('donut-chart-pane'));
    expect(screen.queryByTestId('zone-donut-fullscreen-modal')).not.toBeInTheDocument();

    // Clicking 크게 보기 opens fullscreen with the 4 energy slices
    fireEvent.click(openBtn);
    const modal = screen.getByTestId('zone-donut-fullscreen-modal');
    expect(modal).toBeInTheDocument();
    expect(within(modal).getByTestId('fullscreen-zone-section-high')).toHaveTextContent('신고가 돌파');
    expect(within(modal).getByTestId('fullscreen-zone-section-rising')).toHaveTextContent('직전가 대비 상승');
    expect(within(modal).getByTestId('fullscreen-zone-section-flat')).toHaveTextContent('보합권 체결');
    expect(within(modal).getByTestId('fullscreen-zone-section-falling')).toHaveTextContent('직전가 대비 하락·급매');
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('computes pure median, mean, per-pyeong, and date normalization deterministically', () => {
    expect(extractChronoDateInfo('20261028')).toEqual({
      sortKey: '20261028',
      fullDate: '2026.10.28',
      shortDate: '10.28',
      yearStr: '2026',
    });

    const stats = computeZoneDetailStats(
      [
        {
          aptName: 'A',
          dong: '송동',
          priceVal: 6.0,
          priceEok: '6억',
          areaPyeong: 30,
          delta: 0,
        },
        {
          aptName: 'B',
          dong: '송동',
          priceVal: 8.0,
          priceEok: '8억',
          areaPyeong: 30,
          delta: 0.5,
        },
        {
          aptName: 'C',
          dong: '송동',
          priceVal: 16.0,
          priceEok: '16억',
          areaPyeong: 30,
          delta: 1.0,
          isNewHigh: true,
        },
      ],
      10
    );

    expect(stats.count).toBe(3);
    expect(stats.sharePct).toBe(30.0);
    expect(stats.avgPriceLabel).toBe('10억');
    expect(stats.medianPriceLabel).toBe('8억');
    expect(stats.newHighCount).toBe(1);
    expect(stats.risingCount).toBe(2);

    const sorted = sortItemsChronologically(
      [
        {
          aptName: 'Old',
          dong: '송동',
          priceVal: 10,
          priceEok: '10억',
          areaPyeong: 34,
          delta: 0,
          contractDate: '20260901',
        },
        {
          aptName: 'New',
          dong: '송동',
          priceVal: 9,
          priceEok: '9억',
          areaPyeong: 34,
          delta: 0,
          contractDate: '20261030',
        },
      ],
      'latest'
    );
    expect(sorted[0].aptName).toBe('New');
    expect(sorted[1].aptName).toBe('Old');
  });
});
