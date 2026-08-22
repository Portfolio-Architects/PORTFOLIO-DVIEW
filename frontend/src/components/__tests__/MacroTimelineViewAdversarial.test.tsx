import React, { useState, useMemo, useCallback } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  MacroTimelineView,
  TimelineGroup,
  TimelineItem,
  formatDailyAvgPrice,
} from '../macro/components/MacroTimelineView';
import {
  TimelineItemCard,
  TimelineItemRow,
  formatEokWithUnit,
  formatGapPrice,
  formatDeltaPrice,
} from '../MacroDashboardClient';
import {
  useMacroFilters,
  DONGTAN1_DONGS,
  DONGTAN2_DONGS,
  LANDMARK_APTS,
  QuickFilterChipType,
  TimelineSortOrder,
  TimelineViewMode,
} from '../macro/hooks/useMacroFilters';

// Mock react-intersection-observer
jest.mock('react-intersection-observer', () => ({
  useInView: () => ({
    ref: jest.fn(),
    inView: false,
  }),
}));

// Mock external dependencies
jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchAllApartments: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoading: false, handleLogin: jest.fn() }),
}));

jest.mock('@/hooks/useStaticData', () => ({
  useLocationScores: () => ({ locationScores: {} }),
}));

describe('MacroTimelineView Adversarial & Stress Test Suite (M4 Challenger)', () => {
  // =========================================================================
  // 1. Boundary & Mathematical Edge Cases (Oracles & Formatters)
  // =========================================================================
  describe('Boundary & Mathematical Oracles', () => {
    test('formatDailyAvgPrice handles empty, null, undefined, 0, NaN, and extreme values safely', () => {
      expect(formatDailyAvgPrice([])).toBe('');
      // @ts-expect-error test invalid inputs
      expect(formatDailyAvgPrice(null)).toBe('');
      // @ts-expect-error test invalid inputs
      expect(formatDailyAvgPrice(undefined)).toBe('');

      // Single item with 0 price
      const zeroItem: TimelineItem[] = [{
        aptName: 'Zero Apt',
        dong: '오산동',
        priceEok: '0만',
        priceVal: 0,
        areaPyeong: 34,
        area: 84,
        floor: 1,
        type: 'normal',
        delta: 0,
      }];
      expect(formatDailyAvgPrice(zeroItem)).toBe('0만');

      // Sub-1-eok price: 0.5 eok (5000만)
      const subEokItems: TimelineItem[] = [{
        aptName: 'Small Apt',
        dong: '오산동',
        priceEok: '5,000만',
        priceVal: 0.5,
        areaPyeong: 20,
        area: 50,
        floor: 2,
        type: 'normal',
        delta: 0,
      }];
      expect(formatDailyAvgPrice(subEokItems)).toBe('5,000만');

      // Exact eok price: 10.0 eok (10억 0만 -> 10억)
      const exactEokItems: TimelineItem[] = [{
        aptName: 'Exact Apt',
        dong: '오산동',
        priceEok: '10억',
        priceVal: 10.0,
        areaPyeong: 34,
        area: 84,
        floor: 5,
        type: 'normal',
        delta: 0,
      }];
      expect(formatDailyAvgPrice(exactEokItems)).toBe('10억');

      // Multi-billion luxury transaction: 105.75 eok (105억 7,500만)
      const luxuryItems: TimelineItem[] = [{
        aptName: 'Super Luxury Penthouse',
        dong: '오산동',
        priceEok: '105억 7,500만',
        priceVal: 105.75,
        areaPyeong: 100,
        area: 250,
        floor: 60,
        type: 'high',
        delta: 15.0,
      }];
      expect(formatDailyAvgPrice(luxuryItems)).toBe('105억 7,500만');
    });

    test('formatDeltaPrice and formatEokWithUnit handle boundary values without crashing', () => {
      expect(formatDeltaPrice(0)).toBe('0만');
      // @ts-expect-error test NaN
      expect(formatDeltaPrice(NaN)).toBe('');
      // @ts-expect-error test undefined
      expect(formatDeltaPrice(undefined)).toBe('');

      // 0.05 eok = 500만
      expect(formatDeltaPrice(0.05)).toBe('500만');
      // 1.5 eok = 1억 5,000만
      expect(formatDeltaPrice(1.5)).toBe('1억 5,000만');
      // -2.0 eok (negative delta) = 2억
      expect(formatDeltaPrice(-2.0)).toBe('2억');

      // formatEokWithUnit
      const eok1 = formatEokWithUnit(5000); // 5000만
      expect(eok1.value).toBe('5,000');
      expect(eok1.unit).toBe('만원');

      const eok2 = formatEokWithUnit(10000); // 1억
      expect(eok2.value).toBe('1억');

      const eok3 = formatEokWithUnit(15500); // 1억 5,500만
      expect(eok3.value).toContain('1억');
    });
  });

  // =========================================================================
  // 2. Event Propagation & StopPropagation Isolation
  // =========================================================================
  describe('Event Propagation & Strict Event Isolation', () => {
    test('TimelineItemCard strictly isolates Favorite Heart and Detail clicks from Card Selection', () => {
      const onCardClickMock = jest.fn();
      const onCardHoverMock = jest.fn();
      const onDetailsClickMock = jest.fn();
      const onDetailsHoverMock = jest.fn();
      const onToggleFavoriteMock = jest.fn();

      const testItem: TimelineItem = {
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
      };

      const { rerender } = render(
        <TimelineItemCard
          item={testItem}
          isSelected={false}
          areaUnit="p"
          isFavorite={false}
          onToggleFavorite={onToggleFavoriteMock}
          onCardHover={onCardHoverMock}
          onCardClick={onCardClickMock}
          onDetailsClick={onDetailsClickMock}
          onDetailsHover={onDetailsHoverMock}
        />
      );

      // 1. Click Favorite Heart
      const favHeartBtn = screen.getByRole('button', { name: /관심 단지 등록/ });
      fireEvent.click(favHeartBtn);
      expect(onToggleFavoriteMock).toHaveBeenCalledTimes(1);
      expect(onToggleFavoriteMock).toHaveBeenCalledWith('동탄역 롯데캐슬');
      expect(onCardClickMock).not.toHaveBeenCalled();
      expect(onDetailsClickMock).not.toHaveBeenCalled();

      // 2. Click Details Button
      const detailBtn = screen.getByRole('button', { name: /상세 정보 보기/ });
      fireEvent.click(detailBtn);
      expect(onDetailsClickMock).toHaveBeenCalledTimes(1);
      expect(onDetailsClickMock).toHaveBeenCalledWith('동탄역 롯데캐슬');
      expect(onCardClickMock).not.toHaveBeenCalled();

      // 3. Click Main Card Body
      const cardBodyBtn = screen.getByRole('button', { name: /실거래 분석 아파트 선택/ });
      fireEvent.click(cardBodyBtn);
      expect(onCardClickMock).toHaveBeenCalledTimes(1);
      expect(onCardClickMock).toHaveBeenCalledWith('동탄역 롯데캐슬');

      // 4. Test with isFavorite=true
      rerender(
        <TimelineItemCard
          item={testItem}
          isSelected={true}
          areaUnit="p"
          isFavorite={true}
          onToggleFavorite={onToggleFavoriteMock}
          onCardHover={onCardHoverMock}
          onCardClick={onCardClickMock}
          onDetailsClick={onDetailsClickMock}
          onDetailsHover={onDetailsHoverMock}
        />
      );
      fireEvent.click(favHeartBtn);
      expect(onToggleFavoriteMock).toHaveBeenCalledTimes(2);
      expect(onCardClickMock).toHaveBeenCalledTimes(1);
    });

    test('TimelineItemRow strictly isolates Favorite Heart and Detail clicks from Row Selection', () => {
      const onCardClickMock = jest.fn();
      const onDetailsClickMock = jest.fn();
      const onToggleFavoriteMock = jest.fn();

      const testItem: TimelineItem = {
        aptName: '동탄역 시범 우남퍼스트빌',
        dong: '청계동',
        priceEok: '14억 2,000만',
        priceVal: 14.2,
        areaPyeong: 34,
        area: 84.9,
        floor: 15,
        type: 'high',
        delta: 0.8,
        deltaPercent: 5.9,
      };

      render(
        <TimelineItemRow
          item={testItem}
          isSelected={false}
          areaUnit="m2"
          isFavorite={false}
          onToggleFavorite={onToggleFavoriteMock}
          onCardClick={onCardClickMock}
          onDetailsClick={onDetailsClickMock}
        />
      );

      // 1. Click Heart
      const favHeartBtn = screen.getByRole('button', { name: /관심 단지 등록/ });
      fireEvent.click(favHeartBtn);
      expect(onToggleFavoriteMock).toHaveBeenCalledTimes(1);
      expect(onCardClickMock).not.toHaveBeenCalled();

      // 2. Click Details
      const detailBtn = screen.getByRole('button', { name: /상세 정보 보기/ });
      fireEvent.click(detailBtn);
      expect(onDetailsClickMock).toHaveBeenCalledTimes(1);
      expect(onCardClickMock).not.toHaveBeenCalled();

      // 3. Click Row Main Info Button
      const rowBodyBtn = screen.getByRole('button', { name: /실거래 분석 아파트 선택/ });
      fireEvent.click(rowBodyBtn);
      expect(onCardClickMock).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 3. Chaotic Rapid Interaction Stress Test (50 Sequential Cycles)
  // =========================================================================
  describe('Chaotic Rapid Interactions & State Stability', () => {
    function InteractiveStressHarness({ initialGroups }: { initialGroups: TimelineGroup[] }) {
      const {
        quickFilter,
        setQuickFilter,
        searchQuery,
        setSearchQuery,
        sortOrder,
        setSortOrder,
        viewMode,
        setViewMode,
        resetFilters,
        timelineDongFilter,
        setTimelineDongFilter,
        timelineAptFilter,
        setTimelineAptFilter,
        availableDongs,
        availableApts,
      } = useMacroFilters();

      const [selectedApt, setSelectedApt] = useState<string | null>(null);
      const [favorites, setFavorites] = useState<Set<string>>(new Set(['동탄역 롯데캐슬']));

      const handleToggleFavorite = useCallback((apt: string) => {
        setFavorites((prev) => {
          const next = new Set(prev);
          if (next.has(apt)) next.delete(apt);
          else next.add(apt);
          return next;
        });
      }, []);

      // Filter timeline groups
      const processedGroups = useMemo(() => {
        return initialGroups
          .map((group) => {
            const filteredItems = group.items.filter((item) => {
              if (quickFilter === 'dongtan1' && !DONGTAN1_DONGS.includes(item.dong)) return false;
              if (quickFilter === 'dongtan2' && !DONGTAN2_DONGS.includes(item.dong)) return false;
              if (quickFilter === 'high' && item.type !== 'high') return false;
              if (quickFilter === 'pyeong30' && (item.areaPyeong < 30 || item.areaPyeong >= 40)) return false;
              if (quickFilter === 'billion10' && item.priceVal < 10.0) return false;
              if (quickFilter === 'landmark' && !LANDMARK_APTS.some((lm) => item.aptName.includes(lm))) return false;

              if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase();
                if (!item.aptName.toLowerCase().includes(q) && !item.dong.toLowerCase().includes(q)) return false;
              }

              return true;
            });

            const sortedItems = [...filteredItems].sort((a, b) => {
              if (sortOrder === 'price_desc') return b.priceVal - a.priceVal;
              if (sortOrder === 'delta_desc') return b.delta - a.delta;
              if (sortOrder === 'area_desc') return b.area - a.area;
              return b.priceVal - a.priceVal;
            });

            return {
              ...group,
              items: sortedItems,
            };
          })
          .filter((g) => g.items.length > 0);
      }, [initialGroups, quickFilter, searchQuery, sortOrder]);

      return (
        <div>
          <span data-testid="current-quick-filter">{quickFilter}</span>
          <span data-testid="current-view-mode">{viewMode}</span>
          <span data-testid="current-sort-order">{sortOrder}</span>
          <span data-testid="current-selected-apt">{selectedApt || 'none'}</span>
          <span data-testid="favorites-count">{favorites.size}</span>

          <MacroTimelineView
            timelineGroups={processedGroups}
            selectedApt={selectedApt}
            onSelectApt={setSelectedApt}
            onDetailsClick={setSelectedApt}
            userFavorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            timelineDongFilter={timelineDongFilter}
            setTimelineDongFilter={setTimelineDongFilter}
            timelineAptFilter={timelineAptFilter}
            setTimelineAptFilter={setTimelineAptFilter}
            availableDongs={availableDongs}
            availableApts={availableApts}
            quickFilter={quickFilter}
            setQuickFilter={setQuickFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onResetFilters={resetFilters}
          />
        </div>
      );
    }

    const testGroups: TimelineGroup[] = [
      {
        dateStr: '2026.08.22 (토)',
        timestamp: 1787356800000,
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
          },
          {
            aptName: '시범다은마을 동탄포스코더샵',
            dong: '반송동',
            priceEok: '8억 5,000만',
            priceVal: 8.5,
            areaPyeong: 34,
            area: 84.8,
            floor: 9,
            type: 'normal',
            delta: -0.3,
          },
          {
            aptName: '메타폴리스',
            dong: '반송동',
            priceEok: '11억 2,000만',
            priceVal: 11.2,
            areaPyeong: 40,
            area: 132.0,
            floor: 45,
            type: 'high',
            delta: 1.2,
          },
        ],
      },
    ];

    test('performs 50 rapid sequential filter, sort, search, and view mode mutations without tearing or exceptions', () => {
      render(<InteractiveStressHarness initialGroups={testGroups} />);

      const chips: QuickFilterChipType[] = [
        'all', 'dongtan1', 'dongtan2', 'high', 'pyeong30', 'billion10', 'landmark'
      ];
      const sortOrders: TimelineSortOrder[] = ['latest', 'price_desc', 'delta_desc', 'area_desc'];
      const searchTerms = ['', '동탄', '반송동', '메타', '롯데', '존재하지않는단지123', '   시범   ', '특수문자!@#$%'];

      // Perform 50 rapid sequential randomized cycles
      for (let i = 0; i < 50; i++) {
        act(() => {
          // 1. Click a chip
          const chipToClick = chips[i % chips.length];
          const chipBtn = screen.getByRole('button', { name: new RegExp(chipToClick === 'all' ? '전체' : chipToClick === 'high' ? '신고가' : chipToClick === 'dongtan1' ? '동탄1' : chipToClick === 'dongtan2' ? '동탄2' : chipToClick === 'pyeong30' ? '30평대' : chipToClick === 'billion10' ? '10억' : '대장단지') });
          fireEvent.click(chipBtn);

          // 2. Toggle view mode
          const viewModeBtn = screen.getByRole('button', { name: i % 2 === 0 ? '리스트 뷰 보기' : '카드 뷰 보기' });
          fireEvent.click(viewModeBtn);

          // 3. Change search input
          const searchInput = screen.getByPlaceholderText('단지명 검색...');
          fireEvent.change(searchInput, { target: { value: searchTerms[i % searchTerms.length] } });

          // 4. Change sort order
          const sortSelect = screen.getByLabelText('정렬 기준 선택');
          fireEvent.change(sortSelect, { target: { value: sortOrders[i % sortOrders.length] } });
        });
      }

      // Reset filters and verify restoration
      const searchInput = screen.getByPlaceholderText('단지명 검색...');
      fireEvent.change(searchInput, { target: { value: '초기화테스트' } });

      // Reset filters via chip bar reset button and verify restoration
      const chipBarResetBtn = screen.getByRole('button', { name: '모든 필터 초기화' });
      fireEvent.click(chipBarResetBtn);

      expect(screen.getByTestId('current-quick-filter')).toHaveTextContent('all');
      expect(searchInput).toHaveValue('');

      // Test empty state reset button as well
      fireEvent.change(searchInput, { target: { value: '매칭불가' } });
      const emptyStateResetBtn = screen.getByRole('button', { name: /필터 조건 초기화/ });
      fireEvent.click(emptyStateResetBtn);

      expect(screen.getByTestId('current-quick-filter')).toHaveTextContent('all');
      expect(searchInput).toHaveValue('');
    });
  });

  // =========================================================================
  // 4. Extreme Load Stress Test (1,000 Transactions in Memory)
  // =========================================================================
  describe('High Volume Scale & Zero Failure Stress', () => {
    test('renders 1,000 transaction items across 30 dates without memory leaks or render crashes', () => {
      const massiveGroups: TimelineGroup[] = [];
      for (let d = 1; d <= 30; d++) {
        const items: TimelineItem[] = [];
        for (let i = 1; i <= 35; i++) {
          const price = 5 + (i * 0.3);
          items.push({
            aptName: `단지_${d}_${i}`,
            displayAptName: `동탄역 대단지_${d}_${i}`,
            dong: i % 2 === 0 ? '청계동' : '반송동',
            priceEok: `${Math.floor(price)}억 ${Math.round((price % 1) * 10000)}만`,
            priceVal: price,
            areaPyeong: 20 + (i % 30),
            area: 59 + (i % 50),
            floor: (i % 30) + 1,
            type: i % 5 === 0 ? 'high' : 'normal',
            delta: (i % 3 === 0 ? 0.5 : -0.2),
            deltaPercent: (i % 3 === 0 ? 4.5 : -1.8),
          });
        }
        massiveGroups.push({
          dateStr: `2026.08.${d < 10 ? '0' + d : d}`,
          timestamp: 1787356800000 - d * 86400000,
          items,
        });
      }

      const { container } = render(
        <MacroTimelineView
          timelineGroups={massiveGroups}
          selectedApt={null}
          viewMode="card"
        />
      );

      // Verify container renders cleanly
      expect(container.querySelectorAll('[data-testid^="highest-price-badge-"]').length).toBe(30);
      expect(screen.getByText('일자별 최근 실거래')).toBeInTheDocument();
      // Total count across 30 dates * 35 items = 1050
      expect(screen.getByText('1050건')).toBeInTheDocument();
    });

    test('handles empty dataset gracefully with clean fallback UI', () => {
      const onResetMock = jest.fn();
      render(
        <MacroTimelineView
          timelineGroups={[]}
          emptyMessage="조건에 맞는 데이터가 없습니다."
          onResetFilters={onResetMock}
        />
      );

      expect(screen.getByText('조건에 맞는 데이터가 없습니다.')).toBeInTheDocument();
      const resetBtn = screen.getByRole('button', { name: /필터 조건 초기화/ });
      fireEvent.click(resetBtn);
      expect(onResetMock).toHaveBeenCalledTimes(1);
    });

    test('handles tie-breaks when multiple apartments share the highest price on the same date', () => {
      const tieGroup: TimelineGroup = {
        dateStr: '2026.08.22 (토)',
        timestamp: 1787356800000,
        items: [
          {
            aptName: '단지 A',
            displayAptName: '단지 A',
            dong: '오산동',
            priceEok: '15억',
            priceVal: 15.0,
            areaPyeong: 34,
            area: 84,
            floor: 10,
            type: 'high',
            delta: 1.0,
          },
          {
            aptName: '단지 B',
            displayAptName: '단지 B',
            dong: '청계동',
            priceEok: '15억',
            priceVal: 15.0,
            areaPyeong: 34,
            area: 84,
            floor: 15,
            type: 'high',
            delta: 1.0,
          },
        ],
      };

      const { container } = render(
        <MacroTimelineView
          timelineGroups={[tieGroup]}
          selectedApt={null}
        />
      );

      const badge = screen.getByTestId('highest-price-badge-2026.08.22 (토)');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('👑 최고가:');
      expect(badge).toHaveTextContent('15억');
    });

    test('verifies pagination buttons (더보기 and 처음으로 접기) trigger setVisibleTimelineCount correctly', () => {
      const setVisibleCountMock = jest.fn();
      const dummyGroup: TimelineGroup = {
        dateStr: '2026.08.22 (토)',
        timestamp: 1787356800000,
        items: [
          { aptName: 'A1', dong: '청계동', priceEok: '10억', priceVal: 10, areaPyeong: 34, area: 84, floor: 5, type: 'normal', delta: 0 },
          { aptName: 'A2', dong: '청계동', priceEok: '10억', priceVal: 10, areaPyeong: 34, area: 84, floor: 5, type: 'normal', delta: 0 },
          { aptName: 'A3', dong: '청계동', priceEok: '10억', priceVal: 10, areaPyeong: 34, area: 84, floor: 5, type: 'normal', delta: 0 },
          { aptName: 'A4', dong: '청계동', priceEok: '10억', priceVal: 10, areaPyeong: 34, area: 84, floor: 5, type: 'normal', delta: 0 },
          { aptName: 'A5', dong: '청계동', priceEok: '10억', priceVal: 10, areaPyeong: 34, area: 84, floor: 5, type: 'normal', delta: 0 },
        ],
      };

      // Case 1: More items remaining -> "최근 실거래 더보기" button visible
      const { rerender } = render(
        <MacroTimelineView
          timelineGroups={[dummyGroup]}
          totalTimelineCardsCount={25}
          visibleTimelineCount={5}
          setVisibleTimelineCount={setVisibleCountMock}
        />
      );

      const loadMoreBtn = screen.getByRole('button', { name: /최근 실거래 더보기/ });
      fireEvent.click(loadMoreBtn);
      expect(setVisibleCountMock).toHaveBeenCalled();

      // Case 2: All items visible (>= 4 total items) -> "처음으로 접기" button visible
      rerender(
        <MacroTimelineView
          timelineGroups={[dummyGroup]}
          totalTimelineCardsCount={5}
          visibleTimelineCount={5}
          setVisibleTimelineCount={setVisibleCountMock}
        />
      );

      const collapseBtn = screen.getByRole('button', { name: /처음으로 접기/ });
      fireEvent.click(collapseBtn);
      expect(setVisibleCountMock).toHaveBeenCalled();
    });

    test('renders safely without throwing when all optional handlers are omitted', () => {
      const basicGroup: TimelineGroup = {
        dateStr: '2026.08.22 (토)',
        timestamp: 1787356800000,
        items: [
          {
            aptName: '단독 단지',
            dong: '영천동',
            priceEok: '9억',
            priceVal: 9.0,
            areaPyeong: 30,
            area: 74,
            floor: 3,
            type: 'normal',
            delta: 0,
          },
        ],
      };

      expect(() => {
        render(
          <MacroTimelineView
            timelineGroups={[basicGroup]}
          />
        );
      }).not.toThrow();
    });
  });
});
