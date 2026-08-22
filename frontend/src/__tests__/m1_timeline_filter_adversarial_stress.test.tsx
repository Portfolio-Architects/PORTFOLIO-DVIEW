import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  useMacroFilters,
  DONGTAN1_DONGS,
  DONGTAN2_DONGS,
  LANDMARK_APTS,
  QuickFilterChipType,
  TimelineSortOrder,
  TimelineViewMode,
  RegionFilterType,
  PyeongFilterType,
  TradeTypeFilterType,
} from '../components/macro/hooks/useMacroFilters';
import {
  TimelineFilterControls,
  QUICK_FILTER_CHIPS,
  TIMELINE_SORT_OPTIONS,
  TimeframeSelector,
  FavoriteOrderEditor,
} from '../components/macro/components/MacroControls';

describe('Milestone 1 Empirical Challenger Adversarial Stress Test Suite', () => {
  const comprehensiveSheetApartments = {
    '청계동': [
      { name: '동탄역 시범우남퍼스트빌', dong: '청계동', lat: 37.2001, lng: 127.101 },
      { name: '동탄역 시범 더샵 센트럴시티', dong: '청계동', lat: 37.2002, lng: 127.102 },
      { name: '동탄역 시범 한화꿈에그린 프레스티지', dong: '청계동', lat: 37.2003, lng: 127.103 },
      { name: '동탄역 반도유보라 아이비파크 4.0', dong: '청계동', lat: 37.2004, lng: 127.104 },
    ],
    '오산동': [
      { name: '동탄역 롯데캐슬', dong: '오산동', lat: 37.199, lng: 127.098 },
      { name: '동탄역 예미지 시그너스', dong: '오산동', lat: 37.1991, lng: 127.0981 },
      { name: '동탄역 유림노르웨이숲', dong: '오산동', lat: 37.1992, lng: 127.0982 },
      { name: '동탄역 반도유보라 아이비파크 8.0', dong: '오산동', lat: 37.1993, lng: 127.0983 },
    ],
    '반송동': [
      { name: '메타폴리스', dong: '반송동', lat: 37.205, lng: 127.065 },
      { name: '시범다은마을 동탄포스코더샵', dong: '반송동', lat: 37.206, lng: 127.066 },
      { name: '시범한빛마을 동탄아이파크', dong: '반송동', lat: 37.207, lng: 127.067 },
    ],
    '송동': [
      { name: '동탄린스트라우스 더레이크', dong: '송동', lat: 37.172, lng: 127.109 },
      { name: '동탄 레이크자이 더테라스', dong: '송동', lat: 37.173, lng: 127.110 },
    ],
    '영천동': [
      { name: '동탄파크푸르지오', dong: '영천동', lat: 37.215, lng: 127.115 },
    ],
    '능동': [
      { name: '동탄이지더원', dong: '능동', lat: 37.21, lng: 127.05 },
    ],
    '석우동': [
      { name: '우미린풍경채', dong: '석우동', lat: 37.218, lng: 127.075 },
    ],
    '목동': [
      { name: '힐스테이트동탄', dong: '목동', lat: 37.19, lng: 127.13 },
    ],
    '산척동': [
      { name: '더샵레이크에듀타운', dong: '산척동', lat: 37.17, lng: 127.12 },
    ],
    '장지동': [
      { name: '동탄자이파밀리에', dong: '장지동', lat: 37.15, lng: 127.11 },
    ],
    '신동': [
      { name: '동탄어울림파밀리에', dong: '신동', lat: 37.18, lng: 127.15 },
    ],
  };

  // =========================================================================
  // Section 1: Rapid Switching & Randomized Walk Property Tests across 7 Chips
  // =========================================================================
  describe('1. Rapid Switching across 7 Chips & Invariant Preservation', () => {
    const ALL_CHIPS: QuickFilterChipType[] = [
      'all',
      'dongtan1',
      'dongtan2',
      'high',
      'pyeong30',
      'billion10',
      'landmark',
    ];

    it('validates state invariants for every individual chip transition from any initial state', () => {
      const { result } = renderHook(() =>
        useMacroFilters({ sheetApartments: comprehensiveSheetApartments as any })
      );

      for (const startChip of ALL_CHIPS) {
        for (const targetChip of ALL_CHIPS) {
          act(() => {
            result.current.setQuickFilter(startChip);
          });
          expect(result.current.quickFilter).toBe(startChip);

          act(() => {
            result.current.setQuickFilter(targetChip);
          });
          expect(result.current.quickFilter).toBe(targetChip);

          // Verify specific invariants per targetChip
          if (targetChip === 'all') {
            expect(result.current.regionFilter).toBe('all');
            expect(result.current.region).toBe('all');
            expect(result.current.timelineDongFilter).toBe('전체');
            expect(result.current.dong).toBe('전체');
            expect(result.current.pyeongFilter).toBe('all');
            expect(result.current.tradeTypeFilter).toBe('all');
          } else if (targetChip === 'dongtan1') {
            expect(result.current.regionFilter).toBe('dongtan1');
            expect(result.current.region).toBe('dongtan1');
            expect(result.current.timelineDongFilter).toBe('전체');
            // availableApts should only include DONGTAN1 apartments
            const d1Apts = result.current.availableApts;
            expect(d1Apts).toContain('메타폴리스');
            expect(d1Apts).toContain('동탄이지더원');
            expect(d1Apts).toContain('우미린풍경채');
            expect(d1Apts).not.toContain('동탄역 롯데캐슬');
          } else if (targetChip === 'dongtan2') {
            expect(result.current.regionFilter).toBe('dongtan2');
            expect(result.current.region).toBe('dongtan2');
            expect(result.current.timelineDongFilter).toBe('전체');
            const d2Apts = result.current.availableApts;
            expect(d2Apts).toContain('동탄역 롯데캐슬');
            expect(d2Apts).toContain('동탄린스트라우스 더레이크');
            expect(d2Apts).not.toContain('메타폴리스');
          } else if (targetChip === 'high') {
            expect(result.current.tradeTypeFilter).toBe('high');
          } else if (targetChip === 'pyeong30') {
            expect(result.current.pyeongFilter).toBe('30s');
          }
        }
      }
    });

    it('executes a 500-step randomized walk across all 7 chips and maintains memory consistency', () => {
      const { result } = renderHook(() =>
        useMacroFilters({ sheetApartments: comprehensiveSheetApartments as any })
      );

      const STEPS = 500;
      for (let i = 0; i < STEPS; i++) {
        const randomChip = ALL_CHIPS[Math.floor(Math.random() * ALL_CHIPS.length)];
        act(() => {
          result.current.setQuickFilter(randomChip);
        });
        expect(result.current.quickFilter).toBe(randomChip);

        if (randomChip === 'dongtan1') {
          expect(result.current.regionFilter).toBe('dongtan1');
        } else if (randomChip === 'dongtan2') {
          expect(result.current.regionFilter).toBe('dongtan2');
        } else if (randomChip === 'high') {
          expect(result.current.tradeTypeFilter).toBe('high');
        } else if (randomChip === 'pyeong30') {
          expect(result.current.pyeongFilter).toBe('30s');
        }
      }

      // Finally reset and check
      act(() => {
        result.current.resetFilters();
      });
      expect(result.current.quickFilter).toBe('all');
      expect(result.current.regionFilter).toBe('all');
      expect(result.current.timelineDongFilter).toBe('전체');
      expect(result.current.pyeongFilter).toBe('all');
      expect(result.current.tradeTypeFilter).toBe('all');
    });

    it('stress-tests interleaved setter calls between dropdowns and quickFilter chips', () => {
      const { result } = renderHook(() =>
        useMacroFilters({ sheetApartments: comprehensiveSheetApartments as any })
      );

      // 1. Set region to dongtan1 via setRegionFilter
      act(() => {
        result.current.setRegionFilter('dongtan1');
      });
      expect(result.current.quickFilter).toBe('dongtan1');

      // 2. Set tradeType to high -> chip becomes high
      act(() => {
        result.current.setTradeTypeFilter('high');
      });
      expect(result.current.quickFilter).toBe('high');

      // 3. Set pyeong to 30s -> chip becomes pyeong30
      act(() => {
        result.current.setPyeongFilter('30s');
      });
      expect(result.current.quickFilter).toBe('pyeong30');

      // 4. Set pyeong back to all -> chip resets from pyeong30 to all
      act(() => {
        result.current.setPyeongFilter('all');
      });
      expect(result.current.quickFilter).toBe('all');

      // 5. Set region to specific Dong '청계동' via setRegionFilter
      act(() => {
        result.current.setRegionFilter('청계동');
        result.current.setTimelineDongFilter('청계동');
      });
      expect(result.current.timelineDongFilter).toBe('청계동');
      expect(result.current.availableApts).toEqual([
        '동탄역 반도유보라 아이비파크 4.0',
        '동탄역 시범 더샵 센트럴시티',
        '동탄역 시범 한화꿈에그린 프레스티지',
        '동탄역 시범우남퍼스트빌',
      ]);

      // 6. Test legacy fallback when regionFilter is 'all' and only timelineDongFilter is set
      act(() => {
        result.current.setRegionFilter('all');
        result.current.setTimelineDongFilter('송동');
      });
      expect(result.current.availableApts).toEqual([
        '동탄 레이크자이 더테라스',
        '동탄린스트라우스 더레이크',
      ]);
    });
  });

  // =========================================================================
  // Section 2: Search Input Fuzzing & Stress Testing
  // =========================================================================
  describe('2. Search Query Fuzzing (Regex, Unicode, Injection, Boundary Inputs)', () => {
    const ADVERSARIAL_SEARCH_STRINGS = [
      '',
      '   ',
      '\t\n\r  ',
      '롯데캐슬',
      '시범우남',
      '.*+?^${}()|[]\\',
      '[[[(((\\\\.*+?)))',
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      '\' OR \'1\'=\'1\' --',
      '"; DROP TABLE complexes; --',
      'ㄱ',
      'ㄷㅌㅇ',
      'ㄹㄷㅋㅅ',
      '🔥👑⚡💎',
      '동탄 123 !@#$%^&*()_+=-',
      'A'.repeat(5000), // Massive string stress
      '동탄역 롯데캐슬 84㎡ A-Type (101동 1502호)',
      'null',
      'undefined',
      'NaN',
      '0',
      'true',
      'false',
      ' \u200B \u200C \u200D \uFEFF ', // Zero-width spaces
    ];

    it('handles all adversarial search strings without throwing errors or mutating unrelated states', () => {
      const { result } = renderHook(() => useMacroFilters());

      for (const query of ADVERSARIAL_SEARCH_STRINGS) {
        act(() => {
          result.current.setSearchQuery(query);
        });
        expect(result.current.searchQuery).toBe(query);

        // Invariant: Other filter states must remain completely unperturbed
        expect(result.current.sortOrder).toBe('latest');
        expect(result.current.viewMode).toBe('card');
      }
    });

    it('tests search input in MacroControls component with fuzz inputs and clear button', () => {
      const setSearchQueryMock = jest.fn();
      const { rerender } = render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['청계동', '오산동']}
          availableApts={['동탄역 롯데캐슬', '동탄역 시범우남퍼스트빌']}
          searchQuery=""
          setSearchQuery={setSearchQueryMock}
        />
      );

      const searchInput = screen.getByLabelText('단지명 검색');
      expect(screen.queryByLabelText('검색어 지우기')).not.toBeInTheDocument();

      // Type adversarial string
      fireEvent.change(searchInput, { target: { value: '<script>alert(1)</script>' } });
      expect(setSearchQueryMock).toHaveBeenCalledWith('<script>alert(1)</script>');

      // Rerender with active query
      rerender(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['청계동', '오산동']}
          availableApts={['동탄역 롯데캐슬', '동탄역 시범우남퍼스트빌']}
          searchQuery="<script>alert(1)</script>"
          setSearchQuery={setSearchQueryMock}
        />
      );

      const clearBtn = screen.getByLabelText('검색어 지우기');
      expect(clearBtn).toBeInTheDocument();

      fireEvent.click(clearBtn);
      expect(setSearchQueryMock).toHaveBeenCalledWith('');
    });
  });

  // =========================================================================
  // Section 3: Multi-Sort State Transitions & Order Permutations
  // =========================================================================
  describe('3. Multi-Sort Engine State Transitions & Order Permutations', () => {
    const SORT_ORDERS: TimelineSortOrder[] = ['latest', 'price_desc', 'delta_desc', 'area_desc'];

    it('tests all 16 pairwise sort order transitions (complete directed graph)', () => {
      const { result } = renderHook(() => useMacroFilters());

      for (const fromOrder of SORT_ORDERS) {
        for (const toOrder of SORT_ORDERS) {
          act(() => {
            result.current.setSortOrder(fromOrder);
          });
          expect(result.current.sortOrder).toBe(fromOrder);

          act(() => {
            result.current.setSortOrder(toOrder);
          });
          expect(result.current.sortOrder).toBe(toOrder);
        }
      }
    });

    it('verifies UI selection reflects every sort option cleanly in MacroControls', () => {
      const setSortOrderMock = jest.fn();
      const { rerender } = render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동']}
          availableApts={['메타폴리스']}
          sortOrder="latest"
          setSortOrder={setSortOrderMock}
        />
      );

      const sortSelect = screen.getByLabelText('정렬 기준 선택');

      for (const option of TIMELINE_SORT_OPTIONS) {
        fireEvent.change(sortSelect, { target: { value: option.value } });
        expect(setSortOrderMock).toHaveBeenCalledWith(option.value);

        rerender(
          <TimelineFilterControls
            timelineAptFilter="전체"
            setTimelineAptFilter={jest.fn()}
            availableDongs={['반송동']}
            availableApts={['메타폴리스']}
            sortOrder={option.value}
            setSortOrder={setSortOrderMock}
          />
        );
        expect(sortSelect).toHaveValue(option.value);
      }
    });
  });

  // =========================================================================
  // Section 4: Atomic resetFilters() State Consistency
  // =========================================================================
  describe('4. Atomic resetFilters() State Consistency under Chaos Stress', () => {
    it('reliably resets all 9 filter dimensions from complex dirty state without leaking memory', () => {
      const { result } = renderHook(() =>
        useMacroFilters({ sheetApartments: comprehensiveSheetApartments as any })
      );

      const CHAOS_CONFIGS = [
        {
          quick: 'landmark' as QuickFilterChipType,
          search: '동탄역 롯데캐슬 101동',
          sort: 'price_desc' as TimelineSortOrder,
          view: 'list' as TimelineViewMode,
          region: 'dongtan2' as RegionFilterType,
          dong: '오산동',
          apt: '동탄역 롯데캐슬',
          pyeong: '30s' as PyeongFilterType,
          trade: 'high' as TradeTypeFilterType,
        },
        {
          quick: 'billion10' as QuickFilterChipType,
          search: '10억',
          sort: 'delta_desc' as TimelineSortOrder,
          view: 'card' as TimelineViewMode,
          region: 'dongtan1' as RegionFilterType,
          dong: '반송동',
          apt: '메타폴리스',
          pyeong: '40plus' as PyeongFilterType,
          trade: 'rising' as TradeTypeFilterType,
        },
        {
          quick: 'dongtan1' as QuickFilterChipType,
          search: '시범',
          sort: 'area_desc' as TimelineSortOrder,
          view: 'list' as TimelineViewMode,
          region: 'dongtan1' as RegionFilterType,
          dong: '석우동',
          apt: '우미린풍경채',
          pyeong: '20s' as PyeongFilterType,
          trade: 'falling' as TradeTypeFilterType,
        },
      ];

      for (const chaos of CHAOS_CONFIGS) {
        // Apply chaos states
        act(() => {
          result.current.setQuickFilter(chaos.quick);
          result.current.setSearchQuery(chaos.search);
          result.current.setSortOrder(chaos.sort);
          result.current.setViewMode(chaos.view);
          result.current.setRegionFilter(chaos.region);
          result.current.setTimelineDongFilter(chaos.dong);
          result.current.setTimelineAptFilter(chaos.apt);
          result.current.setPyeongFilter(chaos.pyeong);
          result.current.setTradeTypeFilter(chaos.trade);
        });

        // Verify dirty states took effect
        expect(result.current.searchQuery).toBe(chaos.search);
        expect(result.current.sortOrder).toBe(chaos.sort);
        expect(result.current.viewMode).toBe(chaos.view);

        // Execute atomic reset
        act(() => {
          result.current.resetFilters();
        });

        // Verify ALL filter dimensions are reset to clean defaults
        expect(result.current.quickFilter).toBe('all');
        expect(result.current.searchQuery).toBe('');
        expect(result.current.sortOrder).toBe('latest');
        expect(result.current.regionFilter).toBe('all');
        expect(result.current.region).toBe('all');
        expect(result.current.timelineDongFilter).toBe('전체');
        expect(result.current.dong).toBe('전체');
        expect(result.current.timelineAptFilter).toBe('전체');
        expect(result.current.selectedApt).toBe('전체');
        expect(result.current.pyeongFilter).toBe('all');
        expect(result.current.tradeTypeFilter).toBe('all');

        // View mode is a presentation layout preference preserved across filter resets
        expect(result.current.viewMode).toBe(chaos.view);
      }
    });
  });

  // =========================================================================
  // Section 5: MacroControls Component Robustness & Interactive Boundaries
  // =========================================================================
  describe('5. MacroControls Component Boundary & Accessibility Assertions', () => {
    it('correctly toggles the Reset button visibility based on all possible active filter predicates', () => {
      const onResetFiltersMock = jest.fn();
      const baseProps = {
        timelineAptFilter: '전체',
        setTimelineAptFilter: jest.fn(),
        availableDongs: ['청계동'],
        availableApts: ['동탄역 시범우남퍼스트빌'],
        regionFilter: 'all',
        quickFilter: 'all' as QuickFilterChipType,
        searchQuery: '',
        onResetFilters: onResetFiltersMock,
      };

      // 1. All clean -> No Reset button
      const { rerender } = render(<TimelineFilterControls {...baseProps} />);
      expect(screen.queryByLabelText('모든 필터 초기화')).not.toBeInTheDocument();

      // 2. Whitespace-only search query should NOT trigger reset button
      rerender(<TimelineFilterControls {...baseProps} searchQuery="   " />);
      expect(screen.queryByLabelText('모든 필터 초기화')).not.toBeInTheDocument();

      // 3. Non-empty search query -> Reset button appears
      rerender(<TimelineFilterControls {...baseProps} searchQuery="동탄" />);
      expect(screen.getByLabelText('모든 필터 초기화')).toBeInTheDocument();

      // 4. Quick filter != 'all' -> Reset button appears
      rerender(<TimelineFilterControls {...baseProps} quickFilter="dongtan2" />);
      expect(screen.getByLabelText('모든 필터 초기화')).toBeInTheDocument();

      // 5. Region filter != 'all' -> Reset button appears
      rerender(<TimelineFilterControls {...baseProps} regionFilter="dongtan1" />);
      expect(screen.getByLabelText('모든 필터 초기화')).toBeInTheDocument();

      // 6. Selected Apt != '전체' -> Reset button appears
      rerender(<TimelineFilterControls {...baseProps} timelineAptFilter="동탄역 시범우남퍼스트빌" />);
      expect(screen.getByLabelText('모든 필터 초기화')).toBeInTheDocument();

      // Click reset button
      fireEvent.click(screen.getByLabelText('모든 필터 초기화'));
      expect(onResetFiltersMock).toHaveBeenCalledTimes(1);
    });

    it('handles FavoriteOrderEditor drag and drop state changes safely', () => {
      const setShowOrderEditorMock = jest.fn();
      const handleDragStartMock = jest.fn();
      const handleDragOverMock = jest.fn();
      const handleDragEndMock = jest.fn();
      const mockRef = React.createRef<HTMLDivElement>();

      render(
        <FavoriteOrderEditor
          showOrderEditor={true}
          setShowOrderEditor={setShowOrderEditorMock}
          orderEditorRef={mockRef}
          favoritesArray={['동탄역 롯데캐슬', '동탄린스트라우스 더레이크', '메타폴리스']}
          draggedIndex={1}
          handleDragStart={handleDragStartMock}
          handleDragOver={handleDragOverMock}
          handleDragEnd={handleDragEndMock}
        />
      );

      const items = screen.getAllByText(/동탄|메타폴리스/);
      expect(items.length).toBeGreaterThanOrEqual(3);

      // Trigger drag events on first draggable item
      const firstItem = screen.getByText('동탄역 롯데캐슬').closest('div');
      expect(firstItem).toHaveAttribute('draggable', 'true');

      if (firstItem) {
        fireEvent.dragStart(firstItem);
        expect(handleDragStartMock).toHaveBeenCalled();

        fireEvent.dragOver(firstItem);
        expect(handleDragOverMock).toHaveBeenCalled();

        fireEvent.dragEnd(firstItem);
        expect(handleDragEndMock).toHaveBeenCalled();
      }
    });

    it('supports rapid viewMode switching between card and list', () => {
      const setViewModeMock = jest.fn();
      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={[]}
          availableApts={[]}
          viewMode="card"
          setViewMode={setViewModeMock}
        />
      );

      const cardBtn = screen.getByLabelText('카드 뷰 보기');
      const listBtn = screen.getByLabelText('리스트 뷰 보기');

      fireEvent.click(listBtn);
      expect(setViewModeMock).toHaveBeenCalledWith('list');

      fireEvent.click(cardBtn);
      expect(setViewModeMock).toHaveBeenCalledWith('card');
    });
  });
});
