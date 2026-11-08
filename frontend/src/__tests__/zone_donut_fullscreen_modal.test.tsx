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
  MacroTimelineView,
  type TimelineGroup,
} from '@/components/macro/components/MacroTimelineView';
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

const SAMPLE_TIMELINE_GROUPS: TimelineGroup[] = [
  {
    dateStr: '2026.10.29 (목)',
    dateKey: '2026-10-29',
    timestamp: 1793251200000,
    items: [
      {
        aptName: '동탄역 롯데캐슬',
        dong: '오산동',
        contractDate: '20261029',
        priceVal: 15.6,
        priceEok: '15억 6,000만',
        area: 84.9,
        areaPyeong: 34.2,
        floor: 32,
        type: 'high',
        isNewHigh: true,
        delta: 0.8,
        deltaPercent: 5.4,
      },
      {
        aptName: '동탄린스트라우스더레이크',
        dong: '송동',
        contractDate: '20261028',
        priceVal: 12.6,
        priceEok: '12억 6,000만',
        area: 98.4,
        areaPyeong: 38.0,
        floor: 24,
        type: 'high',
        isNewHigh: true,
        delta: 0.6,
        deltaPercent: 5.0,
      },
    ],
  },
  {
    dateStr: '2026.10.27 (화)',
    dateKey: '2026-10-27',
    timestamp: 1793078400000,
    items: [
      {
        aptName: '동탄역 시범 더샵 센트럴시티',
        dong: '청계동',
        contractDate: '20261027',
        priceVal: 11.4,
        priceEok: '11억 4,000만',
        area: 84.5,
        areaPyeong: 33.5,
        floor: 20,
        type: 'normal',
        isNewHigh: false,
        delta: 0,
        deltaPercent: 0,
      },
      {
        aptName: '동탄호수공원 아이파크',
        dong: '장지동',
        contractDate: '20261022',
        priceVal: 7.4,
        priceEok: '7억 4,000만',
        area: 84.5,
        areaPyeong: 33.4,
        floor: 15,
        type: 'normal',
        isNewHigh: false,
        delta: -0.5,
        deltaPercent: -6.3,
      },
    ],
  },
];

describe('Masterpiece Inline Timeline Detail Explorer & Donut Fullscreen Removal', () => {
  beforeEach(() => {
    mockTrackEvent.mockClear();
    document.body.style.overflow = '';
  });

  it('removes donut-fullscreen-open-btn ("크게 보기") and modal trigger from AptDonutSection', () => {
    render(
      <AptDonutSection
        variant="navigator"
        initialMode="energy"
        initialPeriod="90d"
        mounted={true}
        recentTransactions={REAL_TRANSACTIONS}
      />
    );

    expect(screen.queryByTestId('donut-fullscreen-open-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('zone-donut-fullscreen-modal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('donut-chart-pane'));
    expect(screen.queryByTestId('zone-donut-fullscreen-modal')).not.toBeInTheDocument();
  });

  it('expands MacroTimelineView inline ("자세히 보기" -> Masterpiece Inline Tab) with 4-card real stats and Master-Detail date rail without any modal overlay', () => {
    const onDetailsClick = jest.fn();

    render(
      <MacroTimelineView
        compactHeroMode={true}
        displayedTimelineData={[SAMPLE_TIMELINE_GROUPS[0]]}
        fullTimelineData={SAMPLE_TIMELINE_GROUPS}
        onDetailsClick={onDetailsClick}
      />
    );

    // Initially in compactHeroMode: segment tabs, inline stats grid, and date rail are hidden
    expect(screen.queryByTestId('timeline-inline-expanded-view')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline-inline-stats-grid')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline-inline-date-rail')).not.toBeInTheDocument();
    expect(screen.queryByTestId('timeline-segment-tabs')).not.toBeInTheDocument();

    // Click "자세히 보기" inline expand button
    const expandBtn = screen.getByTestId('timeline-inline-expand-btn');
    expect(expandBtn).toHaveTextContent('자세히 보기');
    fireEvent.click(expandBtn);

    // Inline expanded view is active (and body overflow is NOT locked by any modal)
    expect(screen.getByTestId('timeline-inline-expanded-view')).toBeInTheDocument();
    expect(screen.queryByTestId('zone-donut-fullscreen-modal')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
    expect(expandBtn).toHaveTextContent('기본 화면으로 축소');
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'timeline_inline_expand_toggle',
      expect.objectContaining({ expanded: true })
    );

    // 4-Card Statistical Briefing Strip renders accurate metrics for all 4 items across 2 dates
    const statsGrid = screen.getByTestId('timeline-inline-stats-grid');
    expect(statsGrid).toBeInTheDocument();
    expect(within(statsGrid).getByTestId('timeline-inline-stat-volume')).toHaveTextContent('4건');
    expect(within(statsGrid).getByTestId('timeline-inline-stat-volume')).toHaveTextContent('4개 단지 · 2개 등록일');
    expect(within(statsGrid).getByTestId('timeline-inline-stat-peak')).toHaveTextContent('롯데캐슬');
    expect(within(statsGrid).getByTestId('timeline-inline-stat-peak')).toHaveTextContent('신고가 2건');

    // Left Master Date Rail renders all date groups from fullTimelineData
    const dateRail = screen.getByTestId('timeline-inline-date-rail');
    expect(dateRail).toBeInTheDocument();
    const dateItemOct27 = within(dateRail).getByTestId('timeline-date-rail-item-2026.10.27 (화)');
    expect(dateItemOct27).toHaveTextContent('2건');

    // Clicking a date in the Left Master Rail filters the right detail feed and recalculates the 4 stat cards
    fireEvent.click(dateItemOct27);
    expect(within(statsGrid).getByTestId('timeline-inline-stat-volume')).toHaveTextContent('2건');
    expect(screen.getByTestId('timeline-card-동탄호수공원 아이파크')).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-card-동탄역 롯데캐슬')).not.toBeInTheDocument();

    // Clicking "전체 일자" reset button in the date rail restores all dates
    fireEvent.click(within(dateRail).getByTestId('timeline-date-rail-reset'));
    expect(within(statsGrid).getByTestId('timeline-inline-stat-volume')).toHaveTextContent('4건');
    expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
  });

  it('supports inline energy temperature filter chips and card/list view mode switching in inline expanded mode', () => {
    render(
      <MacroTimelineView
        compactHeroMode={true}
        displayedTimelineData={SAMPLE_TIMELINE_GROUPS}
        fullTimelineData={SAMPLE_TIMELINE_GROUPS}
      />
    );

    fireEvent.click(screen.getByTestId('timeline-inline-expand-btn'));

    // Inline energy chips are rendered and filter items
    const energyChips = screen.getByTestId('timeline-inline-energy-chips');
    expect(energyChips).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('timeline-energy-chip-falling'));
    expect(screen.getByTestId('timeline-card-동탄호수공원 아이파크')).toBeInTheDocument();
    expect(screen.queryByTestId('timeline-card-동탄역 롯데캐슬')).not.toBeInTheDocument();

    // Reset energy chip to all
    fireEvent.click(screen.getByTestId('timeline-energy-chip-all'));
    expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();

    // Switch to compact list view mode
    const listBtn = screen.getByLabelText('리스트 뷰 보기');
    fireEvent.click(listBtn);
    expect(screen.getByTestId('timeline-row-동탄역 롯데캐슬')).toBeInTheDocument();

    // Collapse back to compact Hero mode
    fireEvent.click(screen.getByTestId('timeline-inline-expand-btn'));
    expect(screen.queryByTestId('timeline-inline-expanded-view')).not.toBeInTheDocument();
  });

  it('enforces Ad Money v5.0 invariants (zero emojis, zero legacy monospace fonts) in inline expanded view', () => {
    const { container } = render(
      <MacroTimelineView
        compactHeroMode={true}
        isInlineExpanded={true}
        displayedTimelineData={SAMPLE_TIMELINE_GROUPS}
        fullTimelineData={SAMPLE_TIMELINE_GROUPS}
      />
    );

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.textContent || '')).toBe(false);
    expect(container.innerHTML).not.toMatch(/font-mono|Consolas|Gulim/i);
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
