import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  TimelineFilterControls,
  QUICK_FILTER_CHIPS,
  TIMELINE_SORT_OPTIONS,
  TimeframeSelector,
  FavoriteOrderEditor,
} from '../macro/components/MacroControls';

describe('MacroControls Component Suite - Comprehensive Unit Tests', () => {
  const defaultProps = {
    timelineAptFilter: '전체',
    setTimelineAptFilter: jest.fn(),
    availableDongs: ['반송동', '오산동', '청계동'],
    availableApts: ['동탄역 롯데캐슬', '동탄역시범우남퍼스트빌'],
    regionFilter: 'all',
    setRegionFilter: jest.fn(),
    timelineDongFilter: '전체',
    setTimelineDongFilter: jest.fn(),
  };

  describe('1. Quick Filter Chips Bar', () => {
    it('renders all 7 quick filter chips with exact labels and icons', () => {
      render(<TimelineFilterControls {...defaultProps} quickFilter="all" setQuickFilter={jest.fn()} />);

      expect(QUICK_FILTER_CHIPS).toHaveLength(7);
      expect(screen.getByText('전체')).toBeInTheDocument();
      expect(screen.getByText('동탄1')).toBeInTheDocument();
      expect(screen.getByText('동탄2')).toBeInTheDocument();
      expect(screen.getByText('신고가🔥')).toBeInTheDocument();
      expect(screen.getByText('30평대 국평')).toBeInTheDocument();
      expect(screen.getByText('10억 클럽')).toBeInTheDocument();
      expect(screen.getByText('대장단지')).toBeInTheDocument();
    });

    it('highlights the active quick filter chip and triggers setQuickFilter on click', () => {
      const setQuickFilterMock = jest.fn();
      const { rerender } = render(
        <TimelineFilterControls
          {...defaultProps}
          quickFilter="dongtan2"
          setQuickFilter={setQuickFilterMock}
        />
      );

      const dongtan2Chip = screen.getByRole('button', { name: /동탄2/i });
      expect(dongtan2Chip).toHaveClass('bg-[#ea6100]');
      expect(dongtan2Chip).toHaveClass('text-white');

      const highChip = screen.getByRole('button', { name: /신고가🔥/i });
      fireEvent.click(highChip);
      expect(setQuickFilterMock).toHaveBeenCalledWith('high');

      const landmarkChip = screen.getByRole('button', { name: /대장단지/i });
      fireEvent.click(landmarkChip);
      expect(setQuickFilterMock).toHaveBeenCalledWith('landmark');

      rerender(
        <TimelineFilterControls
          {...defaultProps}
          quickFilter="billion10"
          setQuickFilter={setQuickFilterMock}
        />
      );
      const billionChip = screen.getByRole('button', { name: /10억 클럽/i });
      expect(billionChip).toHaveClass('bg-[#ea6100]');
    });
  });

  describe('2. Real-Time Inline Search Input', () => {
    it('renders search input with accessibility labels and updates on change', () => {
      const setSearchQueryMock = jest.fn();
      render(
        <TimelineFilterControls
          {...defaultProps}
          searchQuery=""
          setSearchQuery={setSearchQueryMock}
        />
      );

      const searchInput = screen.getByLabelText('단지명 검색');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('placeholder', '단지명 검색...');

      fireEvent.change(searchInput, { target: { value: '롯데캐슬' } });
      expect(setSearchQueryMock).toHaveBeenCalledWith('롯데캐슬');
    });

    it('renders clear button when search query is active and clears query on click', () => {
      const setSearchQueryMock = jest.fn();
      render(
        <TimelineFilterControls
          {...defaultProps}
          searchQuery="롯데캐슬"
          setSearchQuery={setSearchQueryMock}
        />
      );

      const clearBtn = screen.getByLabelText('검색어 지우기');
      expect(clearBtn).toBeInTheDocument();

      fireEvent.click(clearBtn);
      expect(setSearchQueryMock).toHaveBeenCalledWith('');
    });
  });

  describe('3. Multi-Sort Selector', () => {
    it('renders sort selector with 4 sort options and triggers setSortOrder', () => {
      const setSortOrderMock = jest.fn();
      render(
        <TimelineFilterControls
          {...defaultProps}
          sortOrder="latest"
          setSortOrder={setSortOrderMock}
        />
      );

      const sortSelect = screen.getByLabelText('정렬 기준 선택');
      expect(sortSelect).toBeInTheDocument();
      expect(sortSelect).toHaveValue('latest');

      expect(TIMELINE_SORT_OPTIONS).toHaveLength(4);
      fireEvent.change(sortSelect, { target: { value: 'price_desc' } });
      expect(setSortOrderMock).toHaveBeenCalledWith('price_desc');

      fireEvent.change(sortSelect, { target: { value: 'delta_desc' } });
      expect(setSortOrderMock).toHaveBeenCalledWith('delta_desc');

      fireEvent.change(sortSelect, { target: { value: 'area_desc' } });
      expect(setSortOrderMock).toHaveBeenCalledWith('area_desc');
    });
  });

  describe('4. View Mode Segmented Controller', () => {
    it('renders card and list toggle buttons and switches viewMode', () => {
      const setViewModeMock = jest.fn();
      const { rerender } = render(
        <TimelineFilterControls
          {...defaultProps}
          viewMode="card"
          setViewMode={setViewModeMock}
        />
      );

      const cardBtn = screen.getByLabelText('카드 뷰 보기');
      const listBtn = screen.getByLabelText('리스트 뷰 보기');

      expect(cardBtn).toHaveClass('text-[#ea6100]');
      expect(listBtn).not.toHaveClass('text-[#ea6100]');

      fireEvent.click(listBtn);
      expect(setViewModeMock).toHaveBeenCalledWith('list');

      rerender(
        <TimelineFilterControls
          {...defaultProps}
          viewMode="list"
          setViewMode={setViewModeMock}
        />
      );
      expect(listBtn).toHaveClass('text-[#ea6100]');
    });
  });

  describe('5. Reset Filters Button', () => {
    it('shows reset button when active filter condition exists and calls onResetFilters', () => {
      const onResetFiltersMock = jest.fn();
      const { rerender } = render(
        <TimelineFilterControls
          {...defaultProps}
          quickFilter="all"
          searchQuery=""
          onResetFilters={onResetFiltersMock}
        />
      );

      // No active filters -> Reset button not shown
      expect(screen.queryByLabelText('모든 필터 초기화')).not.toBeInTheDocument();

      // Quick filter activated -> Reset button shown
      rerender(
        <TimelineFilterControls
          {...defaultProps}
          quickFilter="dongtan1"
          searchQuery=""
          onResetFilters={onResetFiltersMock}
        />
      );
      const resetBtn = screen.getByLabelText('모든 필터 초기화');
      expect(resetBtn).toBeInTheDocument();

      fireEvent.click(resetBtn);
      expect(onResetFiltersMock).toHaveBeenCalledTimes(1);

      // Search query active -> Reset button shown
      rerender(
        <TimelineFilterControls
          {...defaultProps}
          quickFilter="all"
          searchQuery="우남"
          onResetFilters={onResetFiltersMock}
        />
      );
      expect(screen.getByLabelText('모든 필터 초기화')).toBeInTheDocument();
    });
  });

  describe('6. Backward Compatibility & Graceful Fallbacks', () => {
    it('renders cleanly without crashing when optional M1 props are omitted (legacy callers)', () => {
      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['반송동', '오산동']}
          availableApts={['동탄역 롯데캐슬']}
          regionFilter="all"
          setRegionFilter={jest.fn()}
        />
      );

      expect(screen.getByLabelText('권역 및 법정동 선택')).toBeInTheDocument();
      expect(screen.getByLabelText('단지 선택')).toBeInTheDocument();
      expect(screen.getByText('전체')).toBeInTheDocument();
    });
  });

  describe('7. TimeframeSelector & FavoriteOrderEditor', () => {
    it('renders all 6 timeframe buttons and switches timeframe', () => {
      const setTimeframeMock = jest.fn();
      render(<TimeframeSelector timeframe="3Y" setTimeframe={setTimeframeMock} />);

      const timeframes = ['3M', '6M', '1Y', '3Y', '5Y', 'ALL'];
      timeframes.forEach((tf) => {
        expect(screen.getByText(tf)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('1Y'));
      expect(setTimeframeMock).toHaveBeenCalledWith('1Y');
    });

    it('renders FavoriteOrderEditor and toggles dropdown list', () => {
      const setShowOrderEditorMock = jest.fn();
      const mockRef = React.createRef<HTMLDivElement>();

      const { rerender } = render(
        <FavoriteOrderEditor
          showOrderEditor={false}
          setShowOrderEditor={setShowOrderEditorMock}
          orderEditorRef={mockRef}
          favoritesArray={['동탄역 롯데캐슬', '동탄역시범우남퍼스트빌']}
          draggedIndex={null}
          handleDragStart={jest.fn()}
          handleDragOver={jest.fn()}
          handleDragEnd={jest.fn()}
        />
      );

      const toggleBtn = screen.getByTitle('관심 단지 정렬 순서 편집');
      expect(toggleBtn).toBeInTheDocument();

      fireEvent.click(toggleBtn);
      expect(setShowOrderEditorMock).toHaveBeenCalledWith(true);

      rerender(
        <FavoriteOrderEditor
          showOrderEditor={true}
          setShowOrderEditor={setShowOrderEditorMock}
          orderEditorRef={mockRef}
          favoritesArray={['동탄역 롯데캐슬', '동탄역시범우남퍼스트빌']}
          draggedIndex={null}
          handleDragStart={jest.fn()}
          handleDragOver={jest.fn()}
          handleDragEnd={jest.fn()}
        />
      );

      expect(screen.getByText('⭐ 관심 단지 순서 편집')).toBeInTheDocument();
      expect(screen.getByText('동탄역 롯데캐슬')).toBeInTheDocument();
    });
  });
});
