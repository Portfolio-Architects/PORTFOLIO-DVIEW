import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  MacroTimelineView,
  formatDailyAvgPrice,
  getGroupYear,
  TimelineGroup,
  TimelineItem,
  HighestPriceAptInfo,
} from '../macro/components/MacroTimelineView';

// Mock react-intersection-observer
jest.mock('react-intersection-observer', () => ({
  useInView: () => ({
    ref: jest.fn(),
    inView: false,
  }),
}));

describe('MacroTimelineView Component & Presentation Test Suite', () => {
  const sampleGroups: TimelineGroup[] = [
    {
      dateStr: '2026.08.21 (목)',
      dateKey: '2026-08-21',
      timestamp: 1787270400000,
      highestPriceApt: {
        aptName: '동탄역 롯데캐슬',
        displayAptName: '동탄역 롯데캐슬',
        priceEok: '16억 5,000만',
        priceVal: 16.5,
      },
      items: [
        {
          aptName: '동탄역 롯데캐슬',
          dong: '오산동',
          priceEok: '16억 5,000만',
          priceVal: 16.5,
          areaPyeong: 34,
          area: 84.9,
          floor: 25,
          type: 'high',
          delta: 1.5,
          deltaPercent: 10.0,
        },
        {
          aptName: '동탄역 시범 우남퍼스트빌',
          dong: '청계동',
          priceEok: '14억 2,000만',
          priceVal: 14.2,
          areaPyeong: 34,
          area: 84.9,
          floor: 12,
          type: 'normal',
          delta: 0.2,
          deltaPercent: 1.4,
        },
      ],
    },
    {
      dateStr: '2026.08.20 (수)',
      dateKey: '2026-08-20',
      timestamp: 1787184000000,
      items: [
        {
          aptName: '동탄역 시범 더샵 센트럴시티',
          dong: '청계동',
          priceEok: '15억',
          priceVal: 15.0,
          areaPyeong: 38,
          area: 97.5,
          floor: 18,
          type: 'normal',
          delta: -0.5,
          deltaPercent: -3.2,
        },
        {
          aptName: '동탄린스트라우스 더레이크',
          dong: '송동',
          priceEok: '18억 2,000만',
          priceVal: 18.2,
          areaPyeong: 45,
          area: 116.3,
          floor: 30,
          type: 'high',
          delta: 2.0,
          deltaPercent: 12.3,
        },
      ],
    },
  ];

  describe('1. Sticky Date Header & Peak Price Highlights', () => {
    it('renders explicit highest price highlight badge with amber styling and crown icon', () => {
      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          selectedApt={null}
          viewMode="card"
          showHighestPriceBadge={true}
        />
      );

      // Verify date strings
      expect(screen.getByText('2026.08.21 (목)')).toBeInTheDocument();
      expect(screen.getByText('2026.08.20 (수)')).toBeInTheDocument();

      // Verify explicit highest price badge on first group
      const badge1 = screen.getByTestId('highest-price-badge-2026.08.21 (목)');
      expect(badge1).toBeInTheDocument();
      expect(badge1).toHaveClass('bg-amber-50');
      expect(badge1).toHaveClass('text-amber-700');
      expect(badge1).toHaveTextContent('👑 최고가:');
      expect(badge1).toHaveTextContent('동탄역 롯데캐슬');
      expect(badge1).toHaveTextContent('16억 5,000만');

      // Verify volume counts
      expect(screen.getAllByText('총 2건 거래')).toHaveLength(2);
    });

    it('automatically computes highest price apartment when highestPriceApt is not explicitly provided', () => {
      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          selectedApt={null}
          viewMode="card"
          showHighestPriceBadge={true}
        />
      );

      // The second group does not have explicit highestPriceApt, but contains 15.0 and 18.2 items -> 18.2 is max
      const badge2 = screen.getByTestId('highest-price-badge-2026.08.20 (수)');
      expect(badge2).toBeInTheDocument();
      expect(badge2).toHaveTextContent('👑 최고가:');
      expect(badge2).toHaveTextContent('동탄린스트라우스 더레이크');
      expect(badge2).toHaveTextContent('18억 2,000만');
    });

    it('computes and formats daily average price accurately', () => {
      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          selectedApt={null}
        />
      );

      // Group 1: (16.5 + 14.2) / 2 = 15.35억 -> 15억 3,500만
      expect(screen.getByText('평균 15억 3,500만')).toBeInTheDocument();

      // Group 2: (15.0 + 18.2) / 2 = 16.6억 -> 16억 6,000만
      expect(screen.getByText('평균 16억 6,000만')).toBeInTheDocument();
    });

    it('highlights active dot indicator when selected apartment matches an item in the group', () => {
      const { container } = render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          selectedApt="동탄역 롯데캐슬"
        />
      );

      const activeDots = container.querySelectorAll('.bg-\\[\\#057e77\\]');
      expect(activeDots.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('2. Dual View Mode Controller (Card Grid vs Compact List)', () => {
    it('renders 3-column responsive card grid by default or when viewMode is "card"', () => {
      const { container } = render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          viewMode="card"
        />
      );

      const gridContainer = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
      expect(gridContainer).toBeInTheDocument();

      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-card-동탄역 시범 우남퍼스트빌')).toBeInTheDocument();
    });

    it('renders dense compact list view when viewMode is "list"', () => {
      const { container } = render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          viewMode="list"
        />
      );

      const listContainer = container.querySelector('.flex.flex-col.divide-y');
      expect(listContainer).toBeInTheDocument();

      expect(screen.getByTestId('timeline-row-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-row-동탄역 시범 우남퍼스트빌')).toBeInTheDocument();
    });

    it('supports custom render functions renderTimelineItemCard and renderTimelineItemRow', () => {
      const renderCardMock = jest.fn((item: TimelineItem) => (
        <div data-testid={`custom-card-${item.aptName}`}>{item.aptName}</div>
      ));
      const renderRowMock = jest.fn((item: TimelineItem) => (
        <div data-testid={`custom-row-${item.aptName}`}>{item.aptName}</div>
      ));

      // 1. Card mode with custom card renderer
      const { rerender } = render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          viewMode="card"
          renderTimelineItemCard={renderCardMock}
          renderTimelineItemRow={renderRowMock}
        />
      );

      expect(renderCardMock).toHaveBeenCalled();
      expect(screen.getByTestId('custom-card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(renderRowMock).not.toHaveBeenCalled();

      // 2. List mode with custom row renderer
      rerender(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          viewMode="list"
          renderTimelineItemCard={renderCardMock}
          renderTimelineItemRow={renderRowMock}
        />
      );

      expect(renderRowMock).toHaveBeenCalled();
      expect(screen.getByTestId('custom-row-동탄역 롯데캐슬')).toBeInTheDocument();
    });
  });

  describe('3. Item Interactions, Favorites, and Event Isolation', () => {
    it('handles favorite heart toggle with event isolation (stopPropagation)', () => {
      const onToggleFavoriteMock = jest.fn();
      const onSelectAptMock = jest.fn();

      const userFavorites = new Set(['동탄역 롯데캐슬']);

      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          userFavorites={userFavorites}
          onToggleFavorite={onToggleFavoriteMock}
          onSelectApt={onSelectAptMock}
          viewMode="card"
        />
      );

      const favoriteHeartBtn = screen.getByLabelText('동탄역 시범 우남퍼스트빌 관심 단지 등록');
      expect(favoriteHeartBtn).toBeInTheDocument();

      fireEvent.click(favoriteHeartBtn);
      expect(onToggleFavoriteMock).toHaveBeenCalledWith('동탄역 시범 우남퍼스트빌');
      expect(onSelectAptMock).not.toHaveBeenCalled(); // Event propagation was isolated
    });

    it('handles direct modal details click with event isolation', () => {
      const onDetailsClickMock = jest.fn();
      const onSelectAptMock = jest.fn();

      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          onDetailsClick={onDetailsClickMock}
          onSelectApt={onSelectAptMock}
          viewMode="card"
        />
      );

      const detailBtn = screen.getByLabelText('동탄역 롯데캐슬 상세 분석 리포트 보기');
      expect(detailBtn).toBeInTheDocument();

      fireEvent.click(detailBtn);
      expect(onDetailsClickMock).toHaveBeenCalledWith('동탄역 롯데캐슬');
      expect(onSelectAptMock).not.toHaveBeenCalled();
    });

    it('triggers onSelectApt or onCardClick when clicking the card body', () => {
      const onSelectAptMock = jest.fn();

      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          onSelectApt={onSelectAptMock}
          viewMode="card"
        />
      );

      const card = screen.getByTestId('timeline-card-동탄역 롯데캐슬');
      fireEvent.click(card);
      expect(onSelectAptMock).toHaveBeenCalledWith('동탄역 롯데캐슬');
    });
  });

  describe('4. Empty State & Loading State Handling', () => {
    it('displays user-friendly empty state when timeline data is empty', () => {
      render(
        <MacroTimelineView
          timelineGroups={[]}
          emptyMessage="조건에 일치하는 거래가 없습니다."
        />
      );

      expect(screen.getByText('조건에 일치하는 거래가 없습니다.')).toBeInTheDocument();
      expect(screen.getByText('필터 조건을 변경하거나 검색어를 재설정해 보세요.')).toBeInTheDocument();
    });

    it('renders filter reset button in empty state and calls onResetFilters when clicked', () => {
      const onResetFiltersMock = jest.fn();
      render(
        <MacroTimelineView
          timelineGroups={[]}
          onResetFilters={onResetFiltersMock}
        />
      );

      const resetBtn = screen.getByRole('button', { name: /필터/i });
      expect(resetBtn).toBeInTheDocument();

      fireEvent.click(resetBtn);
      expect(onResetFiltersMock).toHaveBeenCalledTimes(1);
    });

    it('renders loading state when isLoading is true', () => {
      render(
        <MacroTimelineView
          timelineGroups={[]}
          isLoading={true}
        />
      );

      expect(screen.getByText('최근 실거래 타임라인 로딩 중...')).toBeInTheDocument();
    });
  });

  describe('5. Infinite Scroll & Load More Controls', () => {
    it('renders load more button when total visible count exceeds visible timeline count', () => {
      const setVisibleTimelineCountMock = jest.fn();
      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          totalTimelineCardsCount={30}
          visibleTimelineCount={10}
          setVisibleTimelineCount={setVisibleTimelineCountMock}
        />
      );

      const loadMoreBtn = screen.getByRole('button', { name: /최근 실거래 더보기/i });
      expect(loadMoreBtn).toBeInTheDocument();

      fireEvent.click(loadMoreBtn);
      expect(setVisibleTimelineCountMock).toHaveBeenCalled();
    });

    it('renders collapse to top button when all items are shown and total > 3', () => {
      const setVisibleTimelineCountMock = jest.fn();
      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          totalTimelineCardsCount={4}
          visibleTimelineCount={4}
          setVisibleTimelineCount={setVisibleTimelineCountMock}
        />
      );

      const collapseBtn = screen.getByRole('button', { name: /처음으로 접기/i });
      expect(collapseBtn).toBeInTheDocument();

      fireEvent.click(collapseBtn);
      expect(setVisibleTimelineCountMock).toHaveBeenCalled();
    });
  });

  describe('6. formatDailyAvgPrice Helper Unit Tests', () => {
    it('returns empty string for empty item list', () => {
      expect(formatDailyAvgPrice([])).toBe('');
    });

    it('formats pure eok amount without remaining man units', () => {
      const items = [{ priceVal: 15.0 } as TimelineItem];
      expect(formatDailyAvgPrice(items)).toBe('15억');
    });

    it('formats combined eok and man units', () => {
      const items = [
        { priceVal: 16.5 } as TimelineItem,
        { priceVal: 14.2 } as TimelineItem,
      ];
      // avg = 15.35 -> 15억 3,500만
      expect(formatDailyAvgPrice(items)).toBe('15억 3,500만');
    });

    it('formats pure man amount under 1 eok', () => {
      const items = [{ priceVal: 0.85 } as TimelineItem];
      expect(formatDailyAvgPrice(items)).toBe('8,500만');
    });
  });

  describe('7. Backward Compatibility with Legacy Prop Signatures', () => {
    it('renders cleanly with displayedTimelineData and selectedTimelineApt', () => {
      render(
        <MacroTimelineView
          displayedTimelineData={sampleGroups}
          selectedTimelineApt="동탄역 롯데캐슬"
          totalTimelineCardsCount={4}
          visibleTimelineCount={4}
          timelineDongFilter="전체"
          setTimelineDongFilter={jest.fn()}
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['오산동', '청계동']}
          availableApts={['동탄역 롯데캐슬']}
          renderTimelineItemCard={(item) => <div data-testid={`legacy-card-${item.aptName}`}>{item.aptName}</div>}
        />
      );

      expect(screen.getByTestId('legacy-card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.getByText('4건')).toBeInTheDocument();
    });
  });

  describe('8. Date Accordion Collapse & Expand Features', () => {
    it('collapses and expands individual date group when header is clicked', () => {
      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          totalTimelineCardsCount={4}
          visibleTimelineCount={4}
        />
      );

      // Initially all cards are expanded
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();

      // Click date header to collapse
      const dateHeaderBtn = screen.getByTestId('timeline-date-header-2026.08.21 (목)');
      fireEvent.click(dateHeaderBtn);

      // Card should now be hidden/collapsed
      expect(screen.queryByTestId('timeline-card-동탄역 롯데캐슬')).not.toBeInTheDocument();
      expect(screen.getByText(/접힘/)).toBeInTheDocument();

      // Click again to expand
      fireEvent.click(dateHeaderBtn);
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
    });

    it('toggles all date groups when "모두 접기" and "모두 펼치기" is clicked', () => {
      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          totalTimelineCardsCount={4}
          visibleTimelineCount={4}
        />
      );

      const collapseAllBtn = screen.getByTestId('timeline-collapse-all-btn');
      expect(collapseAllBtn).toHaveTextContent('모두 접기');

      // Click "모두 접기" -> all groups collapse
      fireEvent.click(collapseAllBtn);

      expect(screen.queryByTestId('timeline-card-동탄역 롯데캐슬')).not.toBeInTheDocument();
      expect(screen.queryByTestId('timeline-card-동탄린스트라우스 더레이크')).not.toBeInTheDocument();
      expect(collapseAllBtn).toHaveTextContent('모두 펼치기');

      // Click "모두 펼치기" -> all groups expand
      fireEvent.click(collapseAllBtn);
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-card-동탄린스트라우스 더레이크')).toBeInTheDocument();
    });

    it('auto-uncollapses date group when an apartment in it is selected', () => {
      const { rerender } = render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          totalTimelineCardsCount={4}
          visibleTimelineCount={4}
          selectedTimelineApt={null}
        />
      );

      // Collapse the 2026.08.21 group
      const dateHeaderBtn = screen.getByTestId('timeline-date-header-2026.08.21 (목)');
      fireEvent.click(dateHeaderBtn);
      expect(screen.queryByTestId('timeline-card-동탄역 롯데캐슬')).not.toBeInTheDocument();

      // User selects apartment in that collapsed group
      rerender(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          totalTimelineCardsCount={4}
          visibleTimelineCount={4}
          selectedTimelineApt="동탄역 롯데캐슬"
        />
      );

      // Should automatically un-collapse so the selected card is visible
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
    });
  });

  describe('9. Period Selection Tabs & Actions', () => {
    it('renders period tabs (90일, 1년, 3년, 전체) and triggers setPeriodFilter on tab click', () => {
      const setPeriodFilter = jest.fn();
      render(
        <MacroTimelineView
          timelineGroups={sampleGroups}
          totalTimelineCardsCount={4}
          visibleTimelineCount={4}
          periodFilter="90d"
          setPeriodFilter={setPeriodFilter}
        />
      );

      const tab90d = screen.getByTestId('timeline-period-tab-90d');
      const tab1y = screen.getByTestId('timeline-period-tab-1y');
      const tab3y = screen.getByTestId('timeline-period-tab-3y');
      const tabAll = screen.getByTestId('timeline-period-tab-all');

      expect(tab90d).toBeInTheDocument();
      expect(tab1y).toBeInTheDocument();
      expect(tab3y).toBeInTheDocument();
      expect(tabAll).toBeInTheDocument();

      fireEvent.click(tab1y);
      expect(setPeriodFilter).toHaveBeenCalledWith('1y');

      fireEvent.click(tab3y);
      expect(setPeriodFilter).toHaveBeenCalledWith('3y');

      fireEvent.click(tabAll);
      expect(setPeriodFilter).toHaveBeenCalledWith('all');
    });
  });

  describe('10. Multi-Year Daily Transactions & Year Display Feature', () => {
    it('accurately resolves year via getGroupYear helper', () => {
      expect(getGroupYear({ dateStr: '2026.09.17 (목)', timestamp: 0, items: [] })).toBe(2026);
      expect(getGroupYear({ dateStr: '2025년 8월 15일', timestamp: 0, items: [] })).toBe(2025);
      expect(getGroupYear({ dateStr: '09.17', dateKey: '2024-09-17', timestamp: 0, items: [] })).toBe(2024);
      expect(getGroupYear({ dateStr: 'custom', year: 2023, timestamp: 0, items: [] })).toBe(2023);
      expect(getGroupYear({ dateStr: 'no-year', timestamp: new Date('2022-05-10').getTime(), items: [] })).toBe(2022);
      expect(getGroupYear({ dateStr: 'invalid', timestamp: 0, items: [] })).toBeNull();
    });

    it('renders prominent year divider headers when dataset contains multiple years', () => {
      const multiYearGroups: TimelineGroup[] = [
        {
          dateStr: '2026.09.17 (목)',
          dateKey: '2026-09-17',
          year: 2026,
          timestamp: new Date('2026-09-17').getTime(),
          items: [
            {
              aptName: '동탄역 롯데캐슬',
              dong: '오산동',
              priceEok: '16억',
              priceVal: 16.0,
              areaPyeong: 34,
              area: 84.9,
              floor: 20,
              type: 'high',
              delta: 1.0,
            },
          ],
        },
        {
          dateStr: '2026.09.16 (수)',
          dateKey: '2026-09-16',
          year: 2026,
          timestamp: new Date('2026-09-16').getTime(),
          items: [
            {
              aptName: '동탄역 시범 우남퍼스트빌',
              dong: '청계동',
              priceEok: '14억',
              priceVal: 14.0,
              areaPyeong: 34,
              area: 84.9,
              floor: 10,
              type: 'normal',
              delta: 0.2,
            },
          ],
        },
        {
          dateStr: '2025.09.17 (수)',
          dateKey: '2025-09-17',
          year: 2025,
          timestamp: new Date('2025-09-17').getTime(),
          items: [
            {
              aptName: '동탄역 시범 더샵 센트럴시티',
              dong: '청계동',
              priceEok: '13억',
              priceVal: 13.0,
              areaPyeong: 34,
              area: 84.9,
              floor: 15,
              type: 'normal',
              delta: -0.3,
            },
          ],
        },
      ];

      render(
        <MacroTimelineView
          timelineGroups={multiYearGroups}
          totalTimelineCardsCount={3}
          visibleTimelineCount={10}
        />
      );

      // Verify year dividers rendered for 2026 and 2025
      const divider2026 = screen.getByTestId('timeline-year-divider-2026');
      const divider2025 = screen.getByTestId('timeline-year-divider-2025');

      expect(divider2026).toBeInTheDocument();
      expect(divider2026).toHaveTextContent('2026년 실거래');
      expect(divider2025).toBeInTheDocument();
      expect(divider2025).toHaveTextContent('2025년 실거래');

      // Verify date headers show full year and don't collide despite sharing month/day
      expect(screen.getByTestId('timeline-date-header-2026.09.17 (목)')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-date-header-2025.09.17 (수)')).toBeInTheDocument();

      // Verify accordion collapse works independently per year
      const btn2026 = screen.getByTestId('timeline-date-header-2026.09.17 (목)');
      fireEvent.click(btn2026);

      // 2026 card should be collapsed (not in document), but 2025 card remains visible
      expect(screen.queryByTestId('timeline-card-동탄역 롯데캐슬')).not.toBeInTheDocument();
      expect(screen.getByTestId('timeline-card-동탄역 시범 더샵 센트럴시티')).toBeInTheDocument();
    });

    it('does not display top year divider when dataset contains only a single year', () => {
      const singleYearGroups: TimelineGroup[] = [
        {
          dateStr: '2026.09.17 (목)',
          year: 2026,
          timestamp: new Date('2026-09-17').getTime(),
          items: [
            {
              aptName: '동탄역 롯데캐슬',
              dong: '오산동',
              priceEok: '16억',
              priceVal: 16.0,
              areaPyeong: 34,
              area: 84.9,
              floor: 20,
              type: 'high',
              delta: 1.0,
            },
          ],
        },
      ];

      render(
        <MacroTimelineView
          timelineGroups={singleYearGroups}
          totalTimelineCardsCount={1}
          visibleTimelineCount={10}
        />
      );

      expect(screen.queryByTestId('timeline-year-divider-2026')).not.toBeInTheDocument();
      expect(screen.getByText('2026.09.17 (목)')).toBeInTheDocument();
    });
  });
});
