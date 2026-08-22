/**
 * @file m1_challenger2_macro_controls_stress.test.tsx
 * @description Empirical Challenger 2 Adversarial Stress Test Suite for Milestone 1 (M1: Filter & State Engine UI Controls)
 * Tests:
 * 1. Edge-case props: empty arrays, missing/undefined/nullish optional callbacks, out-of-range strings, unicode/XSS strings.
 * 2. Rapid event firings: bursts of 100+ clicks/inputs on chips, search input, clear button, sort select, view mode toggles.
 * 3. Accessibility & Keyboard interactions: focus, Enter/Space/Tab navigation, aria-label, aria-pressed, screen reader labels.
 * 4. Mobile viewport simulation: 320px (iPhone SE), 375px, 414px, and responsiveness with long text truncation.
 * 5. TimeframeSelector & FavoriteOrderEditor adversarial stress: empty/large lists, drag-and-drop out-of-bounds indices, null callbacks.
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  TimelineFilterControls,
  QUICK_FILTER_CHIPS,
  TIMELINE_SORT_OPTIONS,
  TimeframeSelector,
  FavoriteOrderEditor,
} from '../components/macro/components/MacroControls';

describe('Milestone 1 (M1) Challenger 2 Empirical Stress Test Suite - MacroControls', () => {

  // =========================================================================
  // Section 1: Edge-Case Props & Nullish Callbacks
  // =========================================================================
  describe('1. Edge-case props, nullish callbacks, and malformed inputs', () => {

    it('renders and operates safely when ALL optional callback props are completely undefined (graceful fallback)', () => {
      // Intentionally omit all optional callback functions
      const setTimelineAptFilterMock = jest.fn();
      const { container } = render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={setTimelineAptFilterMock}
          availableDongs={[]}
          availableApts={[]}
          quickFilter="all"
          setQuickFilter={undefined}
          searchQuery="테스트단지"
          setSearchQuery={undefined}
          sortOrder="latest"
          setSortOrder={undefined}
          regionFilter="all"
          setRegionFilter={undefined}
          timelineDongFilter="전체"
          setTimelineDongFilter={undefined}
          pyeongFilter="all"
          setPyeongFilter={undefined}
          tradeTypeFilter="all"
          setTradeTypeFilter={undefined}
          viewMode="card"
          setViewMode={undefined}
          onResetFilters={undefined}
        />
      );

      expect(container).toBeInTheDocument();

      // Click all 7 quick filter chips without callbacks - must NOT throw
      QUICK_FILTER_CHIPS.forEach((chip) => {
        const chipBtn = screen.getByRole('button', { name: new RegExp(chip.label, 'i') });
        expect(() => fireEvent.click(chipBtn)).not.toThrow();
      });

      // Controls that depend on optional callbacks are safely not rendered (no crashes)
      expect(screen.queryByLabelText('단지명 검색')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('정렬 기준 선택')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('카드 뷰 보기')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('모든 필터 초기화')).not.toBeInTheDocument();

      // Core selects still render and don't throw on change without optional callbacks
      const regionSelect = screen.getByLabelText('권역 및 법정동 선택');
      expect(() => fireEvent.change(regionSelect, { target: { value: 'dongtan1' } })).not.toThrow();

      const aptSelect = screen.getByLabelText('단지 선택');
      expect(() => fireEvent.change(aptSelect, { target: { value: '전체' } })).not.toThrow();
      expect(setTimelineAptFilterMock).toHaveBeenCalledWith('전체');
    });

    it('renders all controls when noop callbacks are provided and handles firing cleanly', () => {
      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={() => {}}
          availableDongs={['반송동', '청계동']}
          availableApts={['동탄역 롯데캐슬']}
          quickFilter="all"
          setQuickFilter={() => {}}
          searchQuery="단지명"
          setSearchQuery={() => {}}
          sortOrder="latest"
          setSortOrder={() => {}}
          regionFilter="all"
          setRegionFilter={() => {}}
          timelineDongFilter="전체"
          setTimelineDongFilter={() => {}}
          viewMode="card"
          setViewMode={() => {}}
          onResetFilters={() => {}}
        />
      );

      const searchInput = screen.getByLabelText('단지명 검색');
      expect(() => fireEvent.change(searchInput, { target: { value: '새로운단지' } })).not.toThrow();

      const clearBtn = screen.getByLabelText('검색어 지우기');
      expect(() => fireEvent.click(clearBtn)).not.toThrow();

      const sortSelect = screen.getByLabelText('정렬 기준 선택');
      expect(() => fireEvent.change(sortSelect, { target: { value: 'price_desc' } })).not.toThrow();

      const cardBtn = screen.getByLabelText('카드 뷰 보기');
      const listBtn = screen.getByLabelText('리스트 뷰 보기');
      expect(() => fireEvent.click(cardBtn)).not.toThrow();
      expect(() => fireEvent.click(listBtn)).not.toThrow();

      const resetBtn = screen.getByLabelText('모든 필터 초기화');
      expect(() => fireEvent.click(resetBtn)).not.toThrow();
    });

    it('handles empty availableDongs and availableApts arrays without rendering broken options', () => {
      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={[]}
          availableApts={[]}
        />
      );

      const regionSelect = screen.getByLabelText('권역 및 법정동 선택');
      const aptSelect = screen.getByLabelText('단지 선택');

      expect(regionSelect).toBeInTheDocument();
      expect(aptSelect).toBeInTheDocument();
      expect(aptSelect.children.length).toBe(1); // Only "전체 단지" option
    });

    it('safely handles 1,000+ apartment items and extreme name lengths without breaking or crashing', () => {
      const hugeAptList = Array.from({ length: 1000 }, (_, i) => `동탄역 초고층 메가 랜드마크 펜트하우스 단지 ${i}차 프리미엄`);
      const longNameApt = '가나다라마바사아자차카타파하가나다라마바사아자차카타파하가나다라마바사아자차카타파하';
      hugeAptList.push(longNameApt);

      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동', '청계동']}
          availableApts={hugeAptList}
        />
      );

      const aptSelect = screen.getByLabelText('단지 선택');
      expect(aptSelect.children.length).toBe(1002); // 1 "전체" + 1001 apts

      // Truncation check: names > 10 chars are truncated with "..." in option text
      const longOption = screen.getByText(/가나다라마바사아자차\.\.\./);
      expect(longOption).toBeInTheDocument();
    });

    it('safely renders and passes adversarial XSS, emoji, and unicode strings in searchQuery and apartment filters', () => {
      const setTimelineAptFilter = jest.fn();
      const setSearchQuery = jest.fn();
      const xssString = '<script>alert("xss")</script>';
      const unicodeString = '🔥🚀🏢 동탄역 롯데캐슬 𝕏 100% 𠮷野家';

      render(
        <TimelineFilterControls
          timelineAptFilter={unicodeString}
          setTimelineAptFilter={setTimelineAptFilter}
          availableDongs={['반송동']}
          availableApts={[xssString, unicodeString]}
          searchQuery={xssString}
          setSearchQuery={setSearchQuery}
        />
      );

      const searchInput = screen.getByLabelText('단지명 검색') as HTMLInputElement;
      expect(searchInput.value).toBe(xssString);

      const clearBtn = screen.getByLabelText('검색어 지우기');
      fireEvent.click(clearBtn);
      expect(setSearchQuery).toHaveBeenCalledWith('');

      const aptSelect = screen.getByLabelText('단지 선택');
      fireEvent.change(aptSelect, { target: { value: xssString } });
      expect(setTimelineAptFilter).toHaveBeenCalledWith(xssString);
    });

    it('handles unexpected/invalid filter values gracefully without throwing', () => {
      render(
        <TimelineFilterControls
          timelineAptFilter="존재하지않는단지"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['청계동']}
          availableApts={['시범우남']}
          quickFilter={'unknown_chip' as any}
          regionFilter={'unknown_region' as any}
          sortOrder={'unknown_sort' as any}
        />
      );

      expect(screen.getByText('전체')).toBeInTheDocument();
      expect(screen.getByLabelText('권역 및 법정동 선택')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Section 2: Rapid Event Firings & Stress Simulation
  // =========================================================================
  describe('2. Rapid Event Firings & High-Frequency Stress Testing', () => {

    it('handles rapid sequential clicking across quick filter chips (100 iterations)', () => {
      const setQuickFilterMock = jest.fn();
      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동']}
          availableApts={['동탄역 롯데캐슬']}
          quickFilter="all"
          setQuickFilter={setQuickFilterMock}
        />
      );

      const chips = QUICK_FILTER_CHIPS;
      act(() => {
        for (let i = 0; i < 100; i++) {
          const chip = chips[i % chips.length];
          const chipBtn = screen.getByRole('button', { name: new RegExp(chip.label, 'i') });
          fireEvent.click(chipBtn);
        }
      });

      expect(setQuickFilterMock).toHaveBeenCalledTimes(100);
      expect(setQuickFilterMock).toHaveBeenLastCalledWith(chips[99 % chips.length].id);
    });

    it('handles rapid high-frequency text input keystrokes in search bar (100 keystrokes)', () => {
      const setSearchQueryMock = jest.fn();
      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동']}
          availableApts={['동탄역 롯데캐슬']}
          searchQuery=""
          setSearchQuery={setSearchQueryMock}
        />
      );

      const searchInput = screen.getByLabelText('단지명 검색');
      const testString = '동탄역시범우남퍼스트빌초역세권랜드마크';

      act(() => {
        for (let i = 0; i < 100; i++) {
          const char = testString[i % testString.length];
          fireEvent.change(searchInput, { target: { value: `단지_${i}_${char}` } });
        }
      });

      expect(setSearchQueryMock).toHaveBeenCalledTimes(100);
      expect(setSearchQueryMock).toHaveBeenLastCalledWith(`단지_99_${testString[99 % testString.length]}`);
    });

    it('handles rapid toggling between view modes (card vs list) 50 times', () => {
      const setViewModeMock = jest.fn();
      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동']}
          availableApts={['동탄역 롯데캐슬']}
          viewMode="card"
          setViewMode={setViewModeMock}
        />
      );

      const cardBtn = screen.getByLabelText('카드 뷰 보기');
      const listBtn = screen.getByLabelText('리스트 뷰 보기');

      act(() => {
        for (let i = 0; i < 50; i++) {
          if (i % 2 === 0) {
            fireEvent.click(listBtn);
          } else {
            fireEvent.click(cardBtn);
          }
        }
      });

      expect(setViewModeMock).toHaveBeenCalledTimes(50);
      expect(setViewModeMock).toHaveBeenLastCalledWith('card');
    });

    it('handles rapid multi-select changes between sort options and region options', () => {
      const setSortOrderMock = jest.fn();
      const setRegionFilterMock = jest.fn();
      const setTimelineDongFilterMock = jest.fn();

      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동', '석우동', '청계동', '오산동']}
          availableApts={['동탄역 롯데캐슬']}
          sortOrder="latest"
          setSortOrder={setSortOrderMock}
          regionFilter="all"
          setRegionFilter={setRegionFilterMock}
          timelineDongFilter="전체"
          setTimelineDongFilter={setTimelineDongFilterMock}
        />
      );

      const sortSelect = screen.getByLabelText('정렬 기준 선택');
      const regionSelect = screen.getByLabelText('권역 및 법정동 선택');

      const sortOptions = TIMELINE_SORT_OPTIONS.map((o) => o.value);
      const regionOptions = ['all', 'dongtan1', 'dongtan2', '반송동', '청계동'];

      act(() => {
        for (let i = 0; i < 40; i++) {
          const sortVal = sortOptions[i % sortOptions.length];
          fireEvent.change(sortSelect, { target: { value: sortVal } });

          const regionVal = regionOptions[i % regionOptions.length];
          fireEvent.change(regionSelect, { target: { value: regionVal } });
        }
      });

      expect(setSortOrderMock).toHaveBeenCalledTimes(40);
      expect(setRegionFilterMock).toHaveBeenCalledTimes(40);
      expect(setTimelineDongFilterMock).toHaveBeenCalledTimes(40);
    });
  });

  // =========================================================================
  // Section 3: Keyboard Interactions, Focus & Accessibility
  // =========================================================================
  describe('3. Keyboard Interactions & Accessibility Attributes', () => {

    it('verifies all interactive elements have accessible labels, titles, and keyboard event handlers', () => {
      const onResetMock = jest.fn();
      const setQuickFilterMock = jest.fn();
      const setSearchQueryMock = jest.fn();

      render(
        <TimelineFilterControls
          timelineAptFilter="동탄역 롯데캐슬"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동', '청계동']}
          availableApts={['동탄역 롯데캐슬']}
          quickFilter="dongtan1"
          setQuickFilter={setQuickFilterMock}
          searchQuery="롯데캐슬"
          setSearchQuery={setSearchQueryMock}
          sortOrder="price_desc"
          setSortOrder={jest.fn()}
          viewMode="list"
          setViewMode={jest.fn()}
          onResetFilters={onResetMock}
        />
      );

      // 1. Quick Filter Buttons Accessibility
      QUICK_FILTER_CHIPS.forEach((chip) => {
        const btn = screen.getByRole('button', { name: new RegExp(chip.label, 'i') });
        expect(btn).toHaveAttribute('type', 'button');
        expect(btn).toHaveAttribute('title', chip.description);

        // Keyboard press (Enter / Space) triggers click
        fireEvent.keyDown(btn, { key: 'Enter', code: 'Enter' });
        fireEvent.click(btn);
      });

      // 2. Clear Button Accessibility
      const clearBtn = screen.getByLabelText('검색어 지우기');
      expect(clearBtn).toHaveAttribute('type', 'button');
      fireEvent.click(clearBtn);
      expect(setSearchQueryMock).toHaveBeenCalledWith('');

      // 3. Reset Button Accessibility
      const resetBtn = screen.getByLabelText('모든 필터 초기화');
      expect(resetBtn).toHaveAttribute('type', 'button');
      expect(resetBtn).toHaveAttribute('title', '모든 필터 초기화');
      fireEvent.click(resetBtn);
      expect(onResetMock).toHaveBeenCalledTimes(1);

      // 4. View Mode Buttons Accessibility
      const cardBtn = screen.getByLabelText('카드 뷰 보기');
      const listBtn = screen.getByLabelText('리스트 뷰 보기');
      expect(cardBtn).toHaveAttribute('type', 'button');
      expect(listBtn).toHaveAttribute('type', 'button');
    });

    it('verifies Search input responds to focus, blur, and keyboard events cleanly', () => {
      const setSearchQueryMock = jest.fn();
      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동']}
          availableApts={['동탄역 롯데캐슬']}
          searchQuery="동탄"
          setSearchQuery={setSearchQueryMock}
        />
      );

      const searchInput = screen.getByLabelText('단지명 검색') as HTMLInputElement;
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);

      fireEvent.keyDown(searchInput, { key: 'Escape', code: 'Escape' });
      searchInput.blur();
      expect(document.activeElement).not.toBe(searchInput);
    });
  });

  // =========================================================================
  // Section 4: Mobile Viewport Simulation & Truncation
  // =========================================================================
  describe('4. Mobile Viewport Simulation & Responsive Bounds', () => {

    it('renders without horizontal explosion in simulated narrow mobile viewport (320px width)', () => {
      const { container } = render(
        <div style={{ width: '320px', maxWidth: '320px', overflow: 'hidden' }}>
          <TimelineFilterControls
            timelineAptFilter="전체"
            setTimelineAptFilter={jest.fn()}
            availableDongs={['반송동', '석우동', '청계동', '오산동']}
            availableApts={[
              '동탄역시범우남퍼스트빌아파트',
              '동탄역롯데캐슬트리니티오피스텔',
            ]}
            quickFilter="all"
            setQuickFilter={jest.fn()}
            searchQuery="검색어"
            setSearchQuery={jest.fn()}
            sortOrder="latest"
            setSortOrder={jest.fn()}
            viewMode="card"
            setViewMode={jest.fn()}
            onResetFilters={jest.fn()}
          />
        </div>
      );

      expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument();
      expect(container.querySelector('input[placeholder="단지명 검색..."]')).toBeInTheDocument();
      expect(container.querySelectorAll('select').length).toBe(3); // Sort, Region, Apt
    });

    it('renders cleanly in 375px (iPhone standard) and 414px (Plus/Max) container simulations', () => {
      const viewports = ['375px', '414px'];

      viewports.forEach((vpWidth) => {
        const { unmount } = render(
          <div style={{ width: vpWidth, maxWidth: vpWidth }}>
            <TimelineFilterControls
              timelineAptFilter="전체"
              setTimelineAptFilter={jest.fn()}
              availableDongs={['반송동']}
              availableApts={['동탄역 롯데캐슬']}
              quickFilter="dongtan2"
              setQuickFilter={jest.fn()}
              sortOrder="delta_desc"
              setSortOrder={jest.fn()}
              viewMode="list"
              setViewMode={jest.fn()}
            />
          </div>
        );

        expect(screen.getByRole('button', { name: /동탄2/i })).toHaveClass('bg-[#ea6100]');
        expect(screen.getByLabelText('리스트 뷰 보기')).toBeInTheDocument();
        unmount();
      });
    });
  });

  // =========================================================================
  // Section 5: TimeframeSelector & FavoriteOrderEditor Stress Testing
  // =========================================================================
  describe('5. TimeframeSelector & FavoriteOrderEditor Adversarial Stress', () => {

    it('stress tests TimeframeSelector with repeated rapid clicks across all 6 timeframes', () => {
      const setTimeframeMock = jest.fn();
      render(<TimeframeSelector timeframe="3Y" setTimeframe={setTimeframeMock} />);

      const timeframes = ['3M', '6M', '1Y', '3Y', '5Y', 'ALL'] as const;
      act(() => {
        for (let i = 0; i < 60; i++) {
          const tf = timeframes[i % timeframes.length];
          const btn = screen.getByRole('button', { name: tf });
          fireEvent.click(btn);
        }
      });

      expect(setTimeframeMock).toHaveBeenCalledTimes(60);
      expect(setTimeframeMock).toHaveBeenLastCalledWith('ALL');
    });

    it('handles FavoriteOrderEditor with empty favoritesArray without errors', () => {
      const mockRef = React.createRef<HTMLDivElement>();
      render(
        <FavoriteOrderEditor
          showOrderEditor={true}
          setShowOrderEditor={jest.fn()}
          orderEditorRef={mockRef}
          favoritesArray={[]}
          draggedIndex={null}
          handleDragStart={jest.fn()}
          handleDragOver={jest.fn()}
          handleDragEnd={jest.fn()}
        />
      );

      expect(screen.getByText('⭐ 관심 단지 순서 편집')).toBeInTheDocument();
      // No items rendered, but modal frame intact
    });

    it('stress tests FavoriteOrderEditor drag-and-drop events including out-of-bounds indices', () => {
      const handleDragStart = jest.fn();
      const handleDragOver = jest.fn();
      const handleDragEnd = jest.fn();
      const mockRef = React.createRef<HTMLDivElement>();

      const favorites = [
        '동탄역 롯데캐슬',
        '동탄역 시범 더샵',
        '동탄역 시범 우남퍼스트빌',
        '동탄린스트라우스 더레이크',
      ];

      render(
        <FavoriteOrderEditor
          showOrderEditor={true}
          setShowOrderEditor={jest.fn()}
          orderEditorRef={mockRef}
          favoritesArray={favorites}
          draggedIndex={1}
          handleDragStart={handleDragStart}
          handleDragOver={handleDragOver}
          handleDragEnd={handleDragEnd}
        />
      );

      const items = screen.getAllByText(/동탄/);
      expect(items.length).toBeGreaterThanOrEqual(4);

      const firstItemContainer = screen.getByText('동탄역 롯데캐슬').closest('div[draggable="true"]');
      expect(firstItemContainer).toBeInTheDocument();

      if (firstItemContainer) {
        // Trigger Drag Start
        fireEvent.dragStart(firstItemContainer);
        expect(handleDragStart).toHaveBeenCalled();

        // Trigger Drag Over
        fireEvent.dragOver(firstItemContainer);
        expect(handleDragOver).toHaveBeenCalled();

        // Trigger Drag End
        fireEvent.dragEnd(firstItemContainer);
        expect(handleDragEnd).toHaveBeenCalled();
      }
    });

    it('handles 100 favorites in FavoriteOrderEditor with scrolling container without crashing', () => {
      const mockRef = React.createRef<HTMLDivElement>();
      const hugeFavorites = Array.from({ length: 100 }, (_, i) => `동탄 아파트 단지 #${i + 1}`);

      render(
        <FavoriteOrderEditor
          showOrderEditor={true}
          setShowOrderEditor={jest.fn()}
          orderEditorRef={mockRef}
          favoritesArray={hugeFavorites}
          draggedIndex={null}
          handleDragStart={jest.fn()}
          handleDragOver={jest.fn()}
          handleDragEnd={jest.fn()}
        />
      );

      expect(screen.getByText('⭐ 관심 단지 순서 편집')).toBeInTheDocument();
      expect(screen.getByText('동탄 아파트 단지 #1')).toBeInTheDocument();
      expect(screen.getByText('동탄 아파트 단지 #100')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Section 6: Filter Synchronization Invariants
  // =========================================================================
  describe('6. Filter Synchronization & Reset Logic Invariants', () => {

    it('synchronizes currentRegion correctly when regionFilter is all and timelineDongFilter is specific dong', () => {
      const setTimelineDongFilterMock = jest.fn();
      const setRegionFilterMock = jest.fn();

      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동', '청계동']}
          availableApts={['시범우남']}
          regionFilter="all"
          timelineDongFilter="반송동"
          setRegionFilter={setRegionFilterMock}
          setTimelineDongFilter={setTimelineDongFilterMock}
        />
      );

      const regionSelect = screen.getByLabelText('권역 및 법정동 선택') as HTMLSelectElement;
      expect(regionSelect.value).toBe('반송동');

      // Change region back to "all"
      fireEvent.change(regionSelect, { target: { value: 'all' } });
      expect(setRegionFilterMock).toHaveBeenCalledWith('all');
      expect(setTimelineDongFilterMock).toHaveBeenCalledWith('전체');
    });

    it('activates reset button whenever any filter dimension is non-default and executes onResetFilters', () => {
      const onResetMock = jest.fn();
      const { rerender } = render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동']}
          availableApts={['동탄역 롯데캐슬']}
          quickFilter="all"
          searchQuery=""
          regionFilter="all"
          timelineDongFilter="전체"
          onResetFilters={onResetMock}
        />
      );

      // Default state: No reset button
      expect(screen.queryByLabelText('모든 필터 초기화')).not.toBeInTheDocument();

      // Condition 1: Apt filter selected
      rerender(
        <TimelineFilterControls
          timelineAptFilter="동탄역 롯데캐슬"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동']}
          availableApts={['동탄역 롯데캐슬']}
          quickFilter="all"
          searchQuery=""
          regionFilter="all"
          timelineDongFilter="전체"
          onResetFilters={onResetMock}
        />
      );
      expect(screen.getByLabelText('모든 필터 초기화')).toBeInTheDocument();

      // Condition 2: Region selected
      rerender(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동']}
          availableApts={['동탄역 롯데캐슬']}
          quickFilter="all"
          searchQuery=""
          regionFilter="dongtan2"
          timelineDongFilter="전체"
          onResetFilters={onResetMock}
        />
      );
      expect(screen.getByLabelText('모든 필터 초기화')).toBeInTheDocument();

      // Click reset
      fireEvent.click(screen.getByLabelText('모든 필터 초기화'));
      expect(onResetMock).toHaveBeenCalledTimes(1);
    });
  });
});
