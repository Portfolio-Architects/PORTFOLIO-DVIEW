import React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/firebaseConfig', () => ({
  db: { __mockDb: true },
}));

jest.mock('@/lib/repositories/apartment.repository', () => ({
  fetchApartmentNames: jest.fn().mockResolvedValue([]),
  fetchAllApartments: jest.fn().mockResolvedValue([]),
}));

import {
  useMacroFilters,
  DONGTAN1_DONGS,
  DONGTAN2_DONGS,
  RegionFilterType,
  PyeongFilterType,
  TradeTypeFilterType,
} from '../components/macro/hooks/useMacroFilters';
import {
  MacroTimelineView,
  TimelineItem,
  TimelineGroup,
} from '../components/macro/components/MacroTimelineView';
import {
  formatEokWithUnit,
  formatDeltaPrice,
  TimelineItemCard,
} from '../components/MacroDashboardClient';

describe('Milestone M2 Empirical Challenger Stress Test Suite', () => {
  // Mock dataset generator for adversarial stress testing
  const generateMockTransactions = () => {
    const items: TimelineItem[] = [
      // 1. D1 Small (<20평)
      {
        aptName: '반송소형빌',
        dong: '반송동',
        priceEok: '3억 5,000만',
        priceVal: 3.5,
        areaPyeong: 18.5,
        area: 45.2,
        floor: 5,
        type: 'normal',
        delta: 0,
      },
      // 2. D1 Mid-Small (20평대) - Rising
      {
        aptName: '시범다은삼성래미안',
        dong: '반송동',
        priceEok: '7억 8,000만',
        priceVal: 7.8,
        areaPyeong: 25.0,
        area: 59.9,
        floor: 15,
        type: 'normal',
        delta: 0.3,
      },
      // 3. D1 Boundary 20평 exact (20.0평)
      {
        aptName: '능동이지더원',
        dong: '능동',
        priceEok: '6억',
        priceVal: 6.0,
        areaPyeong: 20.0,
        area: 49.5,
        floor: 8,
        type: 'normal',
        delta: -0.2,
      },
      // 4. D2 Boundary 30평 exact (30.0평) - High
      {
        aptName: '동탄역 롯데캐슬',
        dong: '오산동',
        priceEok: '16억 5,000만',
        priceVal: 16.5,
        areaPyeong: 30.0,
        area: 74.5,
        floor: 35,
        type: 'high',
        delta: 1.5,
      },
      // 5. D2 Boundary 29.99평 (20평대 upper bound)
      {
        aptName: '청계센트럴',
        dong: '청계동',
        priceEok: '8억 9,000만',
        priceVal: 8.9,
        areaPyeong: 29.99,
        area: 72.0,
        floor: 10,
        type: 'normal',
        delta: 0.1,
      },
      // 6. D2 Boundary 39.99평 (30평대 upper bound) - Falling
      {
        aptName: '동탄역시범우남퍼스트빌',
        dong: '청계동',
        priceEok: '14억',
        priceVal: 14.0,
        areaPyeong: 39.99,
        area: 98.0,
        floor: 18,
        type: 'normal',
        delta: -0.8,
      },
      // 7. D2 Large (40평+) - High
      {
        aptName: '동탄린스트라우스더레이크',
        dong: '송동',
        priceEok: '18억 2,000만',
        priceVal: 18.2,
        areaPyeong: 40.0,
        area: 102.5,
        floor: 28,
        type: 'high',
        delta: 2.0,
      },
      // 8. D2 Super Large (55평) - Falling
      {
        aptName: '동탄역유보라6.0',
        dong: '오산동',
        priceEok: '21억',
        priceVal: 21.0,
        areaPyeong: 55.0,
        area: 135.0,
        floor: 22,
        type: 'normal',
        delta: -1.2,
      },
    ];
    return items;
  };

  const filterTimelineItems = (
    items: TimelineItem[],
    options: {
      regionFilter: RegionFilterType;
      pyeongFilter: PyeongFilterType;
      tradeTypeFilter: TradeTypeFilterType;
    }
  ) => {
    return items.filter((item) => {
      // 1. Region / Dong match
      let matchesRegion = true;
      if (options.regionFilter === 'dongtan1') {
        matchesRegion = DONGTAN1_DONGS.includes(item.dong);
      } else if (options.regionFilter === 'dongtan2') {
        matchesRegion = DONGTAN2_DONGS.includes(item.dong);
      } else if (options.regionFilter !== 'all' && options.regionFilter !== '전체') {
        matchesRegion = item.dong === options.regionFilter;
      }

      // 2. Pyeong match
      let matchesPyeong = true;
      const pyeong = item.areaPyeong || (item.area ? item.area / 3.3058 : 0);
      if (options.pyeongFilter === 'under20') {
        matchesPyeong = pyeong < 20;
      } else if (options.pyeongFilter === '20s') {
        matchesPyeong = pyeong >= 20 && pyeong < 30;
      } else if (options.pyeongFilter === '30s') {
        matchesPyeong = pyeong >= 30 && pyeong < 40;
      } else if (options.pyeongFilter === '40plus') {
        matchesPyeong = pyeong >= 40;
      }

      // 3. Trade Type match
      let matchesTradeType = true;
      if (options.tradeTypeFilter === 'high') {
        matchesTradeType = item.type === 'high';
      } else if (options.tradeTypeFilter === 'rising') {
        matchesTradeType = item.delta > 0;
      } else if (options.tradeTypeFilter === 'falling') {
        matchesTradeType = item.delta < 0;
      }

      return matchesRegion && matchesPyeong && matchesTradeType;
    });
  };

  const calculateDailySummary = (filteredItems: TimelineItem[]) => {
    const totalCount = filteredItems.length;
    const avgVal = totalCount > 0 ? filteredItems.reduce((s, it) => s + it.priceVal, 0) / totalCount : 0;
    const avgRoundedMan = Math.round(avgVal * 10000);
    const eok = Math.floor(avgRoundedMan / 10000);
    const man = avgRoundedMan % 10000;
    const avgPriceEok =
      eok === 0 ? `${man.toLocaleString()}만` : man === 0 ? `${eok}억` : `${eok}억 ${man.toLocaleString()}만`;

    return {
      totalCount,
      avgVal,
      avgPriceEok,
    };
  };

  describe('1. Pyeong Bin Boundaries Stress Testing', () => {
    const mockItems = generateMockTransactions();

    it('accurately categorizes items under 20 pyeong (<20평: strict pyeong < 20)', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'all',
        pyeongFilter: 'under20',
        tradeTypeFilter: 'all',
      });
      expect(result.length).toBe(1);
      expect(result[0].aptName).toBe('반송소형빌');
      expect(result[0].areaPyeong).toBeLessThan(20);
    });

    it('accurately captures boundary 20.0평 and 29.99평 in 20평대 (20 <= pyeong < 30)', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'all',
        pyeongFilter: '20s',
        tradeTypeFilter: 'all',
      });
      expect(result.length).toBe(3);
      const names = result.map((r) => r.aptName);
      expect(names).toContain('시범다은삼성래미안'); // 25.0평
      expect(names).toContain('능동이지더원'); // 20.0평 boundary
      expect(names).toContain('청계센트럴'); // 29.99평 boundary
    });

    it('accurately captures boundary 30.0평 and 39.99평 in 30평대 (30 <= pyeong < 40)', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'all',
        pyeongFilter: '30s',
        tradeTypeFilter: 'all',
      });
      expect(result.length).toBe(2);
      const names = result.map((r) => r.aptName);
      expect(names).toContain('동탄역 롯데캐슬'); // 30.0평 boundary
      expect(names).toContain('동탄역시범우남퍼스트빌'); // 39.99평 boundary
    });

    it('accurately captures boundary 40.0평 and above in 40평+ (pyeong >= 40)', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'all',
        pyeongFilter: '40plus',
        tradeTypeFilter: 'all',
      });
      expect(result.length).toBe(2);
      const names = result.map((r) => r.aptName);
      expect(names).toContain('동탄린스트라우스더레이크'); // 40.0평 boundary
      expect(names).toContain('동탄역유보라6.0'); // 55.0평
    });

    it('computes pyeong from area in m2 when areaPyeong is missing', () => {
      const itemWithOnlyArea: TimelineItem = {
        aptName: '전용면적만있는단지',
        dong: '청계동',
        priceEok: '9억',
        priceVal: 9.0,
        areaPyeong: 0,
        area: 84.9, // 84.9 / 3.3058 = 25.68평
        floor: 10,
        type: 'normal',
        delta: 0,
      };

      const result20s = filterTimelineItems([itemWithOnlyArea], {
        regionFilter: 'all',
        pyeongFilter: '20s',
        tradeTypeFilter: 'all',
      });
      expect(result20s.length).toBe(1);

      const result30s = filterTimelineItems([itemWithOnlyArea], {
        regionFilter: 'all',
        pyeongFilter: '30s',
        tradeTypeFilter: 'all',
      });
      expect(result30s.length).toBe(0);
    });
  });

  describe('2. Trade Type Filtering Stress Testing', () => {
    const mockItems = generateMockTransactions();

    it('filters only new high (신고가🔥) transactions', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'all',
        pyeongFilter: 'all',
        tradeTypeFilter: 'high',
      });
      expect(result.length).toBe(2);
      expect(result.every((it) => it.type === 'high')).toBe(true);
      const names = result.map((r) => r.aptName);
      expect(names).toEqual(['동탄역 롯데캐슬', '동탄린스트라우스더레이크']);
    });

    it('filters strictly rising transactions (delta > 0)', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'all',
        pyeongFilter: 'all',
        tradeTypeFilter: 'rising',
      });
      expect(result.length).toBe(4);
      expect(result.every((it) => it.delta > 0)).toBe(true);
      const names = result.map((r) => r.aptName);
      expect(names).toContain('시범다은삼성래미안'); // delta 0.3
      expect(names).toContain('동탄역 롯데캐슬'); // delta 1.5
      expect(names).toContain('청계센트럴'); // delta 0.1
      expect(names).toContain('동탄린스트라우스더레이크'); // delta 2.0
    });

    it('filters strictly falling transactions (delta < 0)', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'all',
        pyeongFilter: 'all',
        tradeTypeFilter: 'falling',
      });
      expect(result.length).toBe(3);
      expect(result.every((it) => it.delta < 0)).toBe(true);
      const names = result.map((r) => r.aptName);
      expect(names).toContain('능동이지더원'); // delta -0.2
      expect(names).toContain('동탄역시범우남퍼스트빌'); // delta -0.8
      expect(names).toContain('동탄역유보라6.0'); // delta -1.2
    });

    it('excludes flat/unchanged transactions (delta === 0) from rising and falling filters', () => {
      const flatItems = mockItems.filter((it) => it.delta === 0);
      expect(flatItems.length).toBe(1);
      expect(flatItems[0].aptName).toBe('반송소형빌');

      const risingResult = filterTimelineItems(flatItems, {
        regionFilter: 'all',
        pyeongFilter: 'all',
        tradeTypeFilter: 'rising',
      });
      expect(risingResult.length).toBe(0);

      const fallingResult = filterTimelineItems(flatItems, {
        regionFilter: 'all',
        pyeongFilter: 'all',
        tradeTypeFilter: 'falling',
      });
      expect(fallingResult.length).toBe(0);
    });
  });

  describe('3. Region and Dong Bin Stress Testing', () => {
    const mockItems = generateMockTransactions();

    it('filters Dongtan 1 group correctly across all 3 dongs (반송동, 석우동, 능동)', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'dongtan1',
        pyeongFilter: 'all',
        tradeTypeFilter: 'all',
      });
      expect(result.length).toBe(3);
      expect(result.every((it) => ['반송동', '석우동', '능동'].includes(it.dong))).toBe(true);
    });

    it('filters Dongtan 2 group correctly across 8 dongs', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'dongtan2',
        pyeongFilter: 'all',
        tradeTypeFilter: 'all',
      });
      expect(result.length).toBe(5);
      expect(
        result.every((it) =>
          ['청계동', '영천동', '오산동', '목동', '산척동', '장지동', '송동', '신동'].includes(it.dong)
        )
      ).toBe(true);
    });

    it('filters specific single dong correctly (e.g. 오산동)', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: '오산동',
        pyeongFilter: 'all',
        tradeTypeFilter: 'all',
      });
      expect(result.length).toBe(2);
      expect(result.every((it) => it.dong === '오산동')).toBe(true);
      expect(result.map((r) => r.aptName)).toEqual(['동탄역 롯데캐슬', '동탄역유보라6.0']);
    });
  });

  describe('4. Daily Summary Calculation & Zero Division Resilience', () => {
    it('safely handles empty filtered items without zero division or NaN', () => {
      const summary = calculateDailySummary([]);
      expect(summary.totalCount).toBe(0);
      expect(summary.avgVal).toBe(0);
      expect(summary.avgPriceEok).toBe('0만');
      expect(Number.isNaN(summary.avgVal)).toBe(false);
    });

    it('calculates precise average price and format for multiple transactions', () => {
      const items: TimelineItem[] = [
        { aptName: 'A', dong: '청계동', priceEok: '10억', priceVal: 10.0, areaPyeong: 34, area: 84, floor: 1, type: 'normal', delta: 0 },
        { aptName: 'B', dong: '청계동', priceEok: '15억', priceVal: 15.0, areaPyeong: 34, area: 84, floor: 2, type: 'normal', delta: 0 },
      ];
      const summary = calculateDailySummary(items);
      expect(summary.totalCount).toBe(2);
      expect(summary.avgVal).toBe(12.5);
      expect(summary.avgPriceEok).toBe('12억 5,000만');
    });

    it('handles exact integer billion averages (e.g. 10.0 -> 10억)', () => {
      const items: TimelineItem[] = [
        { aptName: 'A', dong: '청계동', priceEok: '8억', priceVal: 8.0, areaPyeong: 34, area: 84, floor: 1, type: 'normal', delta: 0 },
        { aptName: 'B', dong: '청계동', priceEok: '12억', priceVal: 12.0, areaPyeong: 34, area: 84, floor: 2, type: 'normal', delta: 0 },
      ];
      const summary = calculateDailySummary(items);
      expect(summary.totalCount).toBe(2);
      expect(summary.avgVal).toBe(10.0);
      expect(summary.avgPriceEok).toBe('10억');
    });

    it('handles sub-billion averages (e.g. 0.85 -> 8,500만)', () => {
      const items: TimelineItem[] = [
        { aptName: 'A', dong: '청계동', priceEok: '8,000만', priceVal: 0.8, areaPyeong: 10, area: 24, floor: 1, type: 'normal', delta: 0 },
        { aptName: 'B', dong: '청계동', priceEok: '9,000만', priceVal: 0.9, areaPyeong: 10, area: 24, floor: 2, type: 'normal', delta: 0 },
      ];
      const summary = calculateDailySummary(items);
      expect(summary.totalCount).toBe(2);
      expect(summary.avgVal).toBeCloseTo(0.85);
      expect(summary.avgPriceEok).toBe('8,500만');
    });
  });

  describe('5. Complex Multi-Filter Combinations & Empty Result Handling in UI', () => {
    const mockItems = generateMockTransactions();

    it('handles multi-filter intersection yielding zero matches and renders empty state', () => {
      // Dongtan 1 + 40평+ + 신고가 (No such trade in mockItems)
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'dongtan1',
        pyeongFilter: '40plus',
        tradeTypeFilter: 'high',
      });
      expect(result.length).toBe(0);

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
          availableDongs={['반송동', '능동', '청계동', '오산동']}
          availableApts={['시범다은삼성래미안', '동탄역 롯데캐슬']}
          regionFilter="dongtan1"
          pyeongFilter="40plus"
          tradeTypeFilter="high"
          renderTimelineItemCard={jest.fn()}
        />
      );

      expect(screen.getByText('선택하신 필터 조건에 부합하는 최근 실거래가 없습니다.')).toBeInTheDocument();
      expect(screen.getByText('0건')).toBeInTheDocument();
    });

    it('handles multi-filter intersection yielding exactly 1 match (Dongtan 2 + 40평+ + High)', () => {
      const result = filterTimelineItems(mockItems, {
        regionFilter: 'dongtan2',
        pyeongFilter: '40plus',
        tradeTypeFilter: 'high',
      });
      expect(result.length).toBe(1);
      expect(result[0].aptName).toBe('동탄린스트라우스더레이크');
      expect(result[0].priceEok).toBe('18억 2,000만');
    });
  });

  describe('6. Format Helper Functions Stress Testing', () => {
    it('formatEokWithUnit formats various numeric ranges correctly', () => {
      expect(formatEokWithUnit(165000)).toEqual({ value: '16억 5,000', unit: '만원' });
      expect(formatEokWithUnit(100000)).toEqual({ value: '10억', unit: '원' });
      expect(formatEokWithUnit(8500)).toEqual({ value: '8,500', unit: '만원' });
      expect(formatEokWithUnit(0)).toEqual({ value: '0', unit: '만원' });
    });

    it('formatDeltaPrice formats positive, negative, and edge case deltas gracefully', () => {
      expect(formatDeltaPrice(1.5)).toBe('1억 5,000만');
      expect(formatDeltaPrice(1.0)).toBe('1억');
      expect(formatDeltaPrice(0.05)).toBe('500만');
      expect(formatDeltaPrice(-0.8)).toBe('8,000만');
      expect(formatDeltaPrice(0)).toBe('0만');
      expect(formatDeltaPrice(NaN)).toBe('');
      expect(formatDeltaPrice(null as any)).toBe('');
      expect(formatDeltaPrice(undefined as any)).toBe('');
    });
  });
});
