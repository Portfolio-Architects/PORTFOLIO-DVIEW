import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  useMacroFilters,
  DONGTAN1_DONGS,
  DONGTAN2_DONGS,
} from '../components/macro/hooks/useMacroFilters';
import {
  TimelineFilterControls,
} from '../components/macro/components/MacroControls';
import {
  MacroTimelineView,
  TimelineItem,
  TimelineGroup,
} from '../components/macro/components/MacroTimelineView';

describe('Milestone M2: Multi-Filter System & Sticky Daily Timeline Test Suite', () => {
  const mockSheetApartments = {
    '청계동': [
      { name: '동탄역시범우남퍼스트빌', dong: '청계동', lat: 37.2, lng: 127.1 },
      { name: '동탄역반도유보라아이비파크4.0', dong: '청계동', lat: 37.2, lng: 127.1 },
    ],
    '반송동': [
      { name: '시범다은삼성래미안', dong: '반송동', lat: 37.2, lng: 127.05 },
      { name: '시범다은포스코더샵', dong: '반송동', lat: 37.2, lng: 127.05 },
    ],
    '영천동': [
      { name: '동탄파크푸르지오', dong: '영천동', lat: 37.21, lng: 127.11 },
    ],
  };

  describe('1. useMacroFilters Hook with Multi-Filter Dimensions', () => {
    it('initializes with default multi-filter values', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheetApartments as any }));

      expect(result.current.regionFilter).toBe('all');
      expect(result.current.pyeongFilter).toBe('all');
      expect(result.current.tradeTypeFilter).toBe('all');
      expect(result.current.timelineDongFilter).toBe('전체');
      expect(result.current.timelineAptFilter).toBe('전체');
    });

    it('filters available apartments for dongtan1 group (반송동, 석우동, 능동)', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheetApartments as any }));

      act(() => {
        result.current.setRegionFilter('dongtan1');
      });

      expect(result.current.regionFilter).toBe('dongtan1');
      expect(result.current.availableApts).toEqual([
        '시범다은삼성래미안',
        '시범다은포스코더샵',
      ]);
    });

    it('filters available apartments for dongtan2 group (청계동, 영천동, 등)', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheetApartments as any }));

      act(() => {
        result.current.setRegionFilter('dongtan2');
      });

      expect(result.current.regionFilter).toBe('dongtan2');
      expect(result.current.availableApts).toEqual([
        '동탄역반도유보라아이비파크4.0',
        '동탄역시범우남퍼스트빌',
        '동탄파크푸르지오',
      ]);
    });

    it('resets timelineAptFilter to 전체 when regionFilter or timelineDongFilter changes', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheetApartments as any }));

      act(() => {
        result.current.setTimelineAptFilter('동탄역시범우남퍼스트빌');
      });
      expect(result.current.timelineAptFilter).toBe('동탄역시범우남퍼스트빌');

      act(() => {
        result.current.setRegionFilter('dongtan1');
      });
      expect(result.current.timelineAptFilter).toBe('전체');
    });

    it('manages pyeongFilter and tradeTypeFilter states correctly', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheetApartments as any }));

      act(() => {
        result.current.setPyeongFilter('30s');
        result.current.setTradeTypeFilter('high');
      });

      expect(result.current.pyeongFilter).toBe('30s');
      expect(result.current.tradeTypeFilter).toBe('high');
    });
  });

  describe('2. TimelineFilterControls Component Interaction', () => {
    it('renders region selector and apt selector cleanly', () => {
      const setRegionFilterMock = jest.fn();
      const setTimelineAptFilterMock = jest.fn();

      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={setTimelineAptFilterMock}
          availableDongs={['반송동', '영천동', '청계동']}
          availableApts={['시범다은삼성래미안', '동탄역시범우남퍼스트빌']}
          regionFilter="all"
          setRegionFilter={setRegionFilterMock}
        />
      );

      // Verify dropdowns
      expect(screen.getByLabelText('권역 및 법정동 선택')).toBeInTheDocument();
      expect(screen.getByLabelText('단지 선택')).toBeInTheDocument();
    });

    it('triggers filter setter callbacks on dropdown changes', () => {
      const setRegionFilterMock = jest.fn();
      const setTimelineAptFilterMock = jest.fn();

      render(
        <TimelineFilterControls
          timelineAptFilter="전체"
          setTimelineAptFilter={setTimelineAptFilterMock}
          availableDongs={['반송동', '청계동']}
          availableApts={['동탄역 롯데캐슬']}
          regionFilter="all"
          setRegionFilter={setRegionFilterMock}
        />
      );

      // Change region dropdown to dongtan2
      const regionSelect = screen.getByLabelText('권역 및 법정동 선택');
      fireEvent.change(regionSelect, { target: { value: 'dongtan2' } });
      expect(setRegionFilterMock).toHaveBeenCalledWith('dongtan2');

      // Change apt dropdown
      const aptSelect = screen.getByLabelText('단지 선택');
      fireEvent.change(aptSelect, { target: { value: '동탄역 롯데캐슬' } });
      expect(setTimelineAptFilterMock).toHaveBeenCalledWith('동탄역 롯데캐슬');
    });
  });

  describe('3. MacroTimelineView Sticky Headers & Summary Badges', () => {
    const sampleGroups: TimelineGroup[] = [
      {
        dateStr: '8월 21일 (목)',
        timestamp: 1787270400000,
        totalCount: 2,
        avgPriceVal: 15.5,
        avgPriceEok: '15억 5,000만',
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
          {
            aptName: '동탄역 시범 우남퍼스트빌',
            dong: '청계동',
            priceEok: '15억',
            priceVal: 15.0,
            areaPyeong: 34,
            area: 84.9,
            floor: 12,
            type: 'normal',
            delta: 0.2,
          },
        ],
      },
    ];

    it('renders sticky date header with total count and average price summary badges', () => {
      const renderCardMock = jest.fn((item: TimelineItem) => (
        <div data-testid={`card-${item.aptName}`}>{item.aptName}</div>
      ));

      render(
        <MacroTimelineView
          displayedTimelineData={sampleGroups}
          selectedTimelineApt={null}
          areaUnit="m2"
          isMobileViewport={false}
          totalTimelineCardsCount={2}
          visibleTimelineCount={8}
          setVisibleTimelineCount={jest.fn()}
          onCardHover={jest.fn()}
          onCardClick={jest.fn()}
          onDetailsClick={jest.fn()}
          onDetailsHover={jest.fn()}
          timelineDongFilter="전체"
          setTimelineDongFilter={jest.fn()}
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={['오산동', '청계동']}
          availableApts={['동탄역 롯데캐슬', '동탄역 시범 우남퍼스트빌']}
          renderTimelineItemCard={renderCardMock}
        />
      );

      // Verify date text
      expect(screen.getByText('8월 21일 (목)')).toBeInTheDocument();
      // Verify total count badge
      expect(screen.getByText('총 2건 거래')).toBeInTheDocument();
      // Verify average price badge
      expect(screen.getByText('평균 15억 5,000만')).toBeInTheDocument();

      // Verify cards rendered
      expect(screen.getByTestId('card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.getByTestId('card-동탄역 시범 우남퍼스트빌')).toBeInTheDocument();
    });

    it('displays user-friendly empty state when no transactions match filters', () => {
      render(
        <MacroTimelineView
          displayedTimelineData={[]}
          selectedTimelineApt={null}
          areaUnit="m2"
          isMobileViewport={false}
          totalTimelineCardsCount={0}
          visibleTimelineCount={8}
          setVisibleTimelineCount={jest.fn()}
          onCardHover={jest.fn()}
          onCardClick={jest.fn()}
          onDetailsClick={jest.fn()}
          onDetailsHover={jest.fn()}
          timelineDongFilter="전체"
          setTimelineDongFilter={jest.fn()}
          timelineAptFilter="전체"
          setTimelineAptFilter={jest.fn()}
          availableDongs={[]}
          availableApts={[]}
          renderTimelineItemCard={jest.fn()}
        />
      );

      expect(screen.getByText('선택하신 필터 조건에 부합하는 최근 실거래가 없습니다.')).toBeInTheDocument();
    });
  });
});
