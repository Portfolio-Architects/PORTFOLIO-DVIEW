import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  MacroTimelineView,
  formatDailyAvgPrice,
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

      const activeDots = container.querySelectorAll('.bg-\\[\\#ea6100\\]');
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
});
