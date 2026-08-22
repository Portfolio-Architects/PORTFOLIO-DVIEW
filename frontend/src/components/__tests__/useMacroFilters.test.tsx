import { renderHook, act } from '@testing-library/react';
import {
  useMacroFilters,
  DONGTAN1_DONGS,
  DONGTAN2_DONGS,
  LANDMARK_APTS,
  QuickFilterChipType,
  TimelineSortOrder,
  TimelineViewMode,
} from '../macro/hooks/useMacroFilters';

describe('useMacroFilters Hook - Comprehensive Unit Tests', () => {
  const mockSheetApartments = {
    '청계동': [
      { name: '동탄역시범우남퍼스트빌', dong: '청계동', lat: 37.2, lng: 127.1 },
      { name: '동탄역반도유보라아이비파크4.0', dong: '청계동', lat: 37.2, lng: 127.1 },
    ],
    '오산동': [
      { name: '동탄역 롯데캐슬', dong: '오산동', lat: 37.2, lng: 127.1 },
    ],
    '반송동': [
      { name: '시범다은삼성래미안', dong: '반송동', lat: 37.2, lng: 127.05 },
      { name: '시범다은포스코더샵', dong: '반송동', lat: 37.2, lng: 127.05 },
    ],
    '영천동': [
      { name: '동탄파크푸르지오', dong: '영천동', lat: 37.21, lng: 127.11 },
    ],
  };

  describe('1. Initial State & Constants', () => {
    it('initializes with correct default values and aliases', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheetApartments as any }));

      expect(result.current.quickFilter).toBe('all');
      expect(result.current.searchQuery).toBe('');
      expect(result.current.sortOrder).toBe('latest');
      expect(result.current.viewMode).toBe('card');

      expect(result.current.regionFilter).toBe('all');
      expect(result.current.region).toBe('all');
      expect(result.current.timelineDongFilter).toBe('전체');
      expect(result.current.dong).toBe('전체');
      expect(result.current.timelineAptFilter).toBe('전체');
      expect(result.current.selectedApt).toBe('전체');

      expect(result.current.pyeongFilter).toBe('all');
      expect(result.current.tradeTypeFilter).toBe('all');
      expect(result.current.gapRankingDong).toBe('전체');
      expect(result.current.timeframe).toBe('3Y');
    });

    it('exports well-formed constants and arrays', () => {
      expect(DONGTAN1_DONGS).toEqual(['반송동', '석우동', '능동']);
      expect(DONGTAN2_DONGS).toContain('청계동');
      expect(DONGTAN2_DONGS).toContain('오산동');
      expect(LANDMARK_APTS).toContain('동탄역 롯데캐슬');
      expect(LANDMARK_APTS).toContain('동탄린스트라우스 더레이크');
      expect(LANDMARK_APTS.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe('2. Quick Filter Chips & Bidirectional Synchronization', () => {
    it('synchronizes quickFilter chip to dongtan1 region and resets dong', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheetApartments as any }));

      act(() => {
        result.current.setQuickFilter('dongtan1');
      });

      expect(result.current.quickFilter).toBe('dongtan1');
      expect(result.current.regionFilter).toBe('dongtan1');
      expect(result.current.region).toBe('dongtan1');
      expect(result.current.timelineDongFilter).toBe('전체');
      expect(result.current.availableApts).toEqual(['시범다은삼성래미안', '시범다은포스코더샵']);
    });

    it('synchronizes quickFilter chip to dongtan2 region and resets dong', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheetApartments as any }));

      act(() => {
        result.current.setQuickFilter('dongtan2');
      });

      expect(result.current.quickFilter).toBe('dongtan2');
      expect(result.current.regionFilter).toBe('dongtan2');
      expect(result.current.availableApts).toEqual([
        '동탄역 롯데캐슬',
        '동탄역반도유보라아이비파크4.0',
        '동탄역시범우남퍼스트빌',
        '동탄파크푸르지오',
      ]);
    });

    it('synchronizes high trade type chip', () => {
      const { result } = renderHook(() => useMacroFilters());

      act(() => {
        result.current.setQuickFilter('high');
      });
      expect(result.current.quickFilter).toBe('high');
      expect(result.current.tradeTypeFilter).toBe('high');
    });

    it('synchronizes pyeong30 chip', () => {
      const { result } = renderHook(() => useMacroFilters());

      act(() => {
        result.current.setQuickFilter('pyeong30');
      });
      expect(result.current.quickFilter).toBe('pyeong30');
      expect(result.current.pyeongFilter).toBe('30s');
    });

    it('supports standalone billion10 and landmark chips', () => {
      const { result } = renderHook(() => useMacroFilters());

      act(() => {
        result.current.setQuickFilter('billion10');
      });
      expect(result.current.quickFilter).toBe('billion10');

      act(() => {
        result.current.setQuickFilter('landmark');
      });
      expect(result.current.quickFilter).toBe('landmark');
    });

    it('synchronizes reverse direction when setting regionFilter, pyeongFilter, and tradeTypeFilter', () => {
      const { result } = renderHook(() => useMacroFilters());

      act(() => {
        result.current.setRegionFilter('dongtan1');
      });
      expect(result.current.quickFilter).toBe('dongtan1');

      act(() => {
        result.current.setRegionFilter('all');
      });
      expect(result.current.quickFilter).toBe('all');

      act(() => {
        result.current.setPyeongFilter('30s');
      });
      expect(result.current.quickFilter).toBe('pyeong30');

      act(() => {
        result.current.setPyeongFilter('all');
      });
      expect(result.current.quickFilter).toBe('all');

      act(() => {
        result.current.setTradeTypeFilter('high');
      });
      expect(result.current.quickFilter).toBe('high');

      act(() => {
        result.current.setTradeTypeFilter('all');
      });
      expect(result.current.quickFilter).toBe('all');
    });
  });

  describe('3. Search Query, Sort Order, View Mode & Reset', () => {
    it('manages searchQuery correctly', () => {
      const { result } = renderHook(() => useMacroFilters());

      act(() => {
        result.current.setSearchQuery('롯데캐슬');
      });
      expect(result.current.searchQuery).toBe('롯데캐슬');

      act(() => {
        result.current.setSearchQuery('');
      });
      expect(result.current.searchQuery).toBe('');
    });

    it('manages sortOrder across all valid sort options', () => {
      const { result } = renderHook(() => useMacroFilters());
      const sortOrders: TimelineSortOrder[] = ['latest', 'price_desc', 'delta_desc', 'area_desc'];

      sortOrders.forEach((order) => {
        act(() => {
          result.current.setSortOrder(order);
        });
        expect(result.current.sortOrder).toBe(order);
      });
    });

    it('manages viewMode switching between card and list', () => {
      const { result } = renderHook(() => useMacroFilters());

      act(() => {
        result.current.setViewMode('list');
      });
      expect(result.current.viewMode).toBe('list');

      act(() => {
        result.current.setViewMode('card');
      });
      expect(result.current.viewMode).toBe('card');
    });

    it('atomically resets all filter dimensions with resetFilters()', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheetApartments as any }));

      act(() => {
        result.current.setQuickFilter('high');
        result.current.setSearchQuery('우남');
        result.current.setSortOrder('price_desc');
        result.current.setViewMode('list');
        result.current.setTimelineDongFilter('청계동');
        result.current.setTimelineAptFilter('동탄역시범우남퍼스트빌');
        result.current.setPyeongFilter('30s');
        result.current.setTradeTypeFilter('high');
        result.current.setRegionFilter('dongtan2');
      });

      expect(result.current.quickFilter).not.toBe('all');
      expect(result.current.searchQuery).toBe('우남');
      expect(result.current.sortOrder).toBe('price_desc');

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.quickFilter).toBe('all');
      expect(result.current.searchQuery).toBe('');
      expect(result.current.sortOrder).toBe('latest');
      expect(result.current.regionFilter).toBe('all');
      expect(result.current.timelineDongFilter).toBe('전체');
      expect(result.current.timelineAptFilter).toBe('전체');
      expect(result.current.pyeongFilter).toBe('all');
      expect(result.current.tradeTypeFilter).toBe('all');
    });
  });

  describe('4. Available Dongs & Apartments Derivation Edge Cases', () => {
    it('handles null/undefined sheetApartments gracefully', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: undefined }));
      expect(result.current.availableDongs).toEqual([]);
      expect(result.current.availableApts).toEqual([]);
    });

    it('filters availableApts by specific custom dong when regionFilter is not all/dongtan1/dongtan2', () => {
      const { result } = renderHook(() => useMacroFilters({ sheetApartments: mockSheetApartments as any }));

      act(() => {
        result.current.setRegionFilter('오산동');
      });

      expect(result.current.availableApts).toEqual(['동탄역 롯데캐슬']);
    });
  });
});
