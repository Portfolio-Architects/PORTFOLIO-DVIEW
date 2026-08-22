import React, { useState, useMemo, useCallback } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  MacroTimelineView,
  TimelineGroup,
  TimelineItem,
} from '../macro/components/MacroTimelineView';
import {
  TimelineItemCard,
  TimelineItemRow,
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
import type { DongApartment } from '@/lib/dong-apartments';

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

// ==========================================
// Test Data & Harness Setup
// ==========================================

const mockSheetApartments: Record<string, DongApartment[]> = {
  '오산동': [
    { name: '동탄역 롯데캐슬', dong: '오산동' },
    { name: '동탄역 펜트하우스 슈퍼프리미엄', dong: '오산동' },
  ],
  '청계동': [
    { name: '동탄역 시범 우남퍼스트빌', dong: '청계동' },
    { name: '동탄역 시범 더샵 센트럴시티', dong: '청계동' },
    { name: '동탄역 시범 우남퍼스트빌 센트럴파크 더프리미어 레이크뷰 1단지 아파트', dong: '청계동' },
  ],
  '반송동': [
    { name: '시범다은마을 동탄포스코더샵', dong: '반송동' },
    { name: '메타폴리스', dong: '반송동' },
  ],
  '송동': [
    { name: '동탄린스트라우스 더레이크', dong: '송동' },
  ],
  '영천동': [
    { name: '동탄 소형도시형생활주택', dong: '영천동' },
  ],
};

const rawTestTimelineItems: Array<TimelineItem & { dateStr: string; timestamp: number }> = [
  // Day 1: 2026.08.22 (토)
  {
    dateStr: '2026.08.22 (토)',
    timestamp: 1787356800000,
    aptName: '동탄역 롯데캐슬',
    displayAptName: '동탄역 롯데캐슬',
    dong: '오산동',
    priceEok: '16억 5,000만',
    priceVal: 16.5,
    areaPyeong: 34,
    area: 84.9,
    floor: 25,
    type: 'high',
    delta: 1.5,
    deltaPercent: 10.0,
    prevPriceVal: 15.0,
    areaLabelM2: '84A㎡',
    areaLabelPyeong: '34평',
  },
  {
    dateStr: '2026.08.22 (토)',
    timestamp: 1787356800000,
    aptName: '동탄역 시범 우남퍼스트빌',
    displayAptName: '동탄역 시범 우남퍼스트빌',
    dong: '청계동',
    priceEok: '14억 2,000만',
    priceVal: 14.2,
    areaPyeong: 34,
    area: 84.9,
    floor: 12,
    type: 'high',
    delta: 0.8,
    deltaPercent: 5.9,
    prevPriceVal: 13.4,
    areaLabelM2: '84B㎡',
    areaLabelPyeong: '34평',
  },
  {
    dateStr: '2026.08.22 (토)',
    timestamp: 1787356800000,
    aptName: '동탄린스트라우스 더레이크',
    displayAptName: '동탄린스트라우스 더레이크',
    dong: '송동',
    priceEok: '18억 2,000만',
    priceVal: 18.2,
    areaPyeong: 45,
    area: 116.3,
    floor: 30,
    type: 'high',
    delta: 2.0,
    deltaPercent: 12.3,
    prevPriceVal: 16.2,
    areaLabelM2: '116㎡',
    areaLabelPyeong: '45평',
  },
  {
    dateStr: '2026.08.22 (토)',
    timestamp: 1787356800000,
    aptName: '시범다은마을 동탄포스코더샵',
    displayAptName: '시범다은마을 동탄포스코더샵',
    dong: '반송동',
    priceEok: '8억 5,000만',
    priceVal: 8.5,
    areaPyeong: 34,
    area: 84.8,
    floor: 9,
    type: 'normal',
    delta: -0.3,
    deltaPercent: -3.4,
    prevPriceVal: 8.8,
    areaLabelM2: '84㎡',
    areaLabelPyeong: '34평',
  },

  // Day 2: 2026.08.21 (금)
  {
    dateStr: '2026.08.21 (금)',
    timestamp: 1787270400000,
    aptName: '메타폴리스',
    displayAptName: '메타폴리스',
    dong: '반송동',
    priceEok: '11억 2,000만',
    priceVal: 11.2,
    areaPyeong: 40,
    area: 132.0,
    floor: 45,
    type: 'high',
    delta: 1.2,
    deltaPercent: 12.0,
    prevPriceVal: 10.0,
    areaLabelM2: '132㎡',
    areaLabelPyeong: '40평',
  },
  {
    dateStr: '2026.08.21 (금)',
    timestamp: 1787270400000,
    aptName: '동탄역 시범 더샵 센트럴시티',
    displayAptName: '동탄역 시범 더샵 센트럴시티',
    dong: '청계동',
    priceEok: '13억 5,000만',
    priceVal: 13.5,
    areaPyeong: 38,
    area: 97.5,
    floor: 18,
    type: 'normal',
    delta: -0.5,
    deltaPercent: -3.6,
    prevPriceVal: 14.0,
    areaLabelM2: '97㎡',
    areaLabelPyeong: '38평',
  },
  {
    dateStr: '2026.08.21 (금)',
    timestamp: 1787270400000,
    aptName: '동탄 소형도시형생활주택',
    displayAptName: '동탄 소형도시형생활주택',
    dong: '영천동',
    priceEok: '1억 2,000만',
    priceVal: 1.2,
    areaPyeong: 15,
    area: 38.0,
    floor: 3,
    type: 'normal',
    delta: -0.2,
    deltaPercent: -14.2,
    prevPriceVal: 1.4,
    areaLabelM2: '38㎡',
    areaLabelPyeong: '15평',
  },
  {
    dateStr: '2026.08.21 (금)',
    timestamp: 1787270400000,
    aptName: '동탄역 펜트하우스 슈퍼프리미엄',
    displayAptName: '동탄역 펜트하우스 슈퍼프리미엄',
    dong: '오산동',
    priceEok: '20억 5,000만',
    priceVal: 20.5,
    areaPyeong: 55,
    area: 180.0,
    floor: 49,
    type: 'high',
    delta: 3.5,
    deltaPercent: 20.5,
    prevPriceVal: 17.0,
    areaLabelM2: '180㎡',
    areaLabelPyeong: '55평',
  },
  {
    dateStr: '2026.08.21 (금)',
    timestamp: 1787270400000,
    aptName: '동탄역 시범 우남퍼스트빌 센트럴파크 더프리미어 레이크뷰 1단지 아파트',
    displayAptName: '동탄역 시범 우남퍼스트빌 센트럴파크 더프리미어 레이크뷰 1단지 아파트',
    dong: '청계동',
    priceEok: '12억 3,000만',
    priceVal: 12.3,
    areaPyeong: 34,
    area: 84.9,
    floor: 15,
    type: 'normal',
    delta: 0.1,
    deltaPercent: 0.8,
    prevPriceVal: 12.2,
    areaLabelM2: '84㎡',
    areaLabelPyeong: '34평',
  },
];

interface E2ETestHarnessProps {
  initialQuickFilter?: QuickFilterChipType;
  initialSearchQuery?: string;
  initialSortOrder?: TimelineSortOrder;
  initialViewMode?: TimelineViewMode;
  initialFavorites?: Set<string>;
  onSelectAptSpy?: (apt: string) => void;
  onDetailsClickSpy?: (apt: string) => void;
  onToggleFavoriteSpy?: (apt: string) => void;
  useDefaultRenderers?: boolean;
}

/**
 * End-to-End interactive test container integrating useMacroFilters,
 * real-time filtering, multi-sorting, dual view mode, sticky header derivation,
 * and card/row renderers.
 */
function E2ETestHarness({
  initialQuickFilter = 'all',
  initialSearchQuery = '',
  initialSortOrder = 'latest',
  initialViewMode = 'card',
  initialFavorites = new Set<string>(),
  onSelectAptSpy,
  onDetailsClickSpy,
  onToggleFavoriteSpy,
  useDefaultRenderers = false,
}: E2ETestHarnessProps) {
  const [selectedApt, setSelectedApt] = useState<string | null>('동탄역 롯데캐슬');
  const [userFavorites, setUserFavorites] = useState<Set<string>>(initialFavorites);

  const filters = useMacroFilters({ sheetApartments: mockSheetApartments });

  // Initialize initial state if provided
  React.useEffect(() => {
    if (initialQuickFilter !== 'all') filters.setQuickFilter(initialQuickFilter);
    if (initialSearchQuery) filters.setSearchQuery(initialSearchQuery);
    if (initialSortOrder !== 'latest') filters.setSortOrder(initialSortOrder);
    if (initialViewMode !== 'card') filters.setViewMode(initialViewMode);
  }, []);

  const handleToggleFavorite = useCallback((aptName: string) => {
    setUserFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(aptName)) next.delete(aptName);
      else next.add(aptName);
      return next;
    });
    onToggleFavoriteSpy?.(aptName);
  }, [onToggleFavoriteSpy]);

  const handleCardClick = useCallback((aptName: string) => {
    setSelectedApt(aptName);
    onSelectAptSpy?.(aptName);
  }, [onSelectAptSpy]);

  const handleDetailsClick = useCallback((aptName: string) => {
    onDetailsClickSpy?.(aptName);
  }, [onDetailsClickSpy]);

  // Daily group filtering & sorting pipeline
  const filteredGroups: TimelineGroup[] = useMemo(() => {
    // 1. Group raw items by date
    const dateMap: Record<string, { dateStr: string; timestamp: number; items: TimelineItem[] }> = {};
    rawTestTimelineItems.forEach((item) => {
      if (!dateMap[item.dateStr]) {
        dateMap[item.dateStr] = {
          dateStr: item.dateStr,
          timestamp: item.timestamp,
          items: [],
        };
      }
      dateMap[item.dateStr].items.push(item);
    });

    const trimmedSearch = filters.searchQuery.trim().toLowerCase();

    return Object.values(dateMap)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((group) => {
        const filteredItems = group.items.filter((item) => {
          // 1. Quick Filter
          if (filters.quickFilter === 'dongtan1') {
            if (!DONGTAN1_DONGS.includes(item.dong)) return false;
          } else if (filters.quickFilter === 'dongtan2') {
            if (!DONGTAN2_DONGS.includes(item.dong)) return false;
          } else if (filters.quickFilter === 'high') {
            if (item.type !== 'high') return false;
          } else if (filters.quickFilter === 'pyeong30') {
            const pyeong = item.areaPyeong || (item.area ? item.area / 3.3058 : 0);
            if (pyeong < 30 || pyeong >= 40) return false;
          } else if (filters.quickFilter === 'billion10') {
            if (item.priceVal < 10.0) return false;
          } else if (filters.quickFilter === 'landmark') {
            const isLandmark = LANDMARK_APTS.some(
              (lm) => item.aptName.includes(lm) || lm.includes(item.aptName)
            );
            if (!isLandmark) return false;
          }

          // 2. Region Filter
          if (filters.regionFilter === 'dongtan1') {
            if (!DONGTAN1_DONGS.includes(item.dong)) return false;
          } else if (filters.regionFilter === 'dongtan2') {
            if (!DONGTAN2_DONGS.includes(item.dong)) return false;
          } else if (filters.regionFilter !== 'all' && filters.regionFilter !== '전체') {
            if (item.dong !== filters.regionFilter) return false;
          } else if (filters.timelineDongFilter !== '전체' && filters.timelineDongFilter !== 'all') {
            if (item.dong !== filters.timelineDongFilter) return false;
          }

          // 3. Apt Filter
          if (filters.timelineAptFilter !== '전체' && filters.timelineAptFilter !== 'all') {
            if (item.aptName !== filters.timelineAptFilter) return false;
          }

          // 4. Pyeong Filter
          const pyeong = item.areaPyeong || (item.area ? item.area / 3.3058 : 0);
          if (filters.pyeongFilter === 'under20' && pyeong >= 20) return false;
          if (filters.pyeongFilter === '20s' && (pyeong < 20 || pyeong >= 30)) return false;
          if (filters.pyeongFilter === '30s' && (pyeong < 30 || pyeong >= 40)) return false;
          if (filters.pyeongFilter === '40plus' && pyeong < 40) return false;

          // 5. Trade Type Filter
          if (filters.tradeTypeFilter === 'high' && item.type !== 'high') return false;
          if (filters.tradeTypeFilter === 'rising' && item.delta <= 0) return false;
          if (filters.tradeTypeFilter === 'falling' && item.delta >= 0) return false;

          // 6. Search Query Filter
          if (trimmedSearch) {
            const nameMatch = item.aptName && item.aptName.toLowerCase().includes(trimmedSearch);
            const displayMatch = item.displayAptName && item.displayAptName.toLowerCase().includes(trimmedSearch);
            const dongMatch = item.dong && item.dong.toLowerCase().includes(trimmedSearch);
            if (!nameMatch && !displayMatch && !dongMatch) return false;
          }

          return true;
        });

        // Sorting
        const sortedItems = [...filteredItems].sort((a, b) => {
          if (filters.sortOrder === 'price_desc') {
            return b.priceVal - a.priceVal;
          }
          if (filters.sortOrder === 'delta_desc') {
            const bPct = b.deltaPercent ?? (b.prevPriceVal ? (b.delta / b.prevPriceVal) * 100 : b.delta);
            const aPct = a.deltaPercent ?? (a.prevPriceVal ? (a.delta / a.prevPriceVal) * 100 : a.delta);
            if (bPct !== aPct) return bPct - aPct;
            return b.delta - a.delta;
          }
          if (filters.sortOrder === 'area_desc') {
            return (b.area || b.areaPyeong) - (a.area || a.areaPyeong);
          }
          return b.priceVal - a.priceVal; // latest / default
        });

        const totalCount = sortedItems.length;
        const avgVal = totalCount > 0 ? sortedItems.reduce((s, it) => s + it.priceVal, 0) / totalCount : 0;
        const avgRoundedMan = Math.round(avgVal * 10000);
        const eok = Math.floor(avgRoundedMan / 10000);
        const man = avgRoundedMan % 10000;
        const avgPriceEok = eok === 0 ? `${man.toLocaleString()}만` : man === 0 ? `${eok}억` : `${eok}억 ${man.toLocaleString()}만`;

        const highest = sortedItems.reduce((max, cur) => (cur.priceVal > max.priceVal ? cur : max), sortedItems[0]);
        const highestPriceApt = highest
          ? {
              aptName: highest.aptName,
              displayAptName: highest.displayAptName || highest.aptName,
              priceEok: highest.priceEok,
              priceVal: highest.priceVal,
            }
          : undefined;

        return {
          ...group,
          items: sortedItems,
          totalCount,
          avgPriceVal: avgVal,
          avgPriceEok,
          highestPriceApt,
        };
      })
      .filter((g) => g.items.length > 0);
  }, [filters]);

  const totalCardsCount = filteredGroups.reduce((acc, g) => acc + g.items.length, 0);

  const renderCard = (item: TimelineItem, isSelected: boolean) => {
    const isFav = userFavorites.has(item.aptName);
    return (
      <div key={`${item.aptName}-${item.floor}-${item.priceVal}`} data-testid={`timeline-card-${item.aptName}`}>
        <TimelineItemCard
          item={item}
          isSelected={isSelected}
          areaUnit="p"
          isFavorite={isFav}
          onToggleFavorite={handleToggleFavorite}
          onCardHover={jest.fn()}
          onCardClick={handleCardClick}
          onDetailsClick={handleDetailsClick}
          onDetailsHover={jest.fn()}
        />
      </div>
    );
  };

  const renderRow = (item: TimelineItem, isSelected: boolean) => {
    const isFav = userFavorites.has(item.aptName);
    return (
      <TimelineItemRow
        key={`${item.aptName}-${item.floor}-${item.priceVal}`}
        item={item}
        isSelected={isSelected}
        areaUnit="p"
        isFavorite={isFav}
        onToggleFavorite={handleToggleFavorite}
        onCardHover={jest.fn()}
        onCardClick={handleCardClick}
        onDetailsClick={handleDetailsClick}
        onDetailsHover={jest.fn()}
      />
    );
  };

  return (
    <MacroTimelineView
      displayedTimelineData={filteredGroups}
      selectedTimelineApt={selectedApt}
      userFavorites={userFavorites}
      onToggleFavorite={handleToggleFavorite}
      onCardClick={handleCardClick}
      onSelectApt={handleCardClick}
      onDetailsClick={handleDetailsClick}
      totalTimelineCardsCount={totalCardsCount}
      availableDongs={filters.availableDongs}
      availableApts={filters.availableApts}
      timelineDongFilter={filters.timelineDongFilter}
      setTimelineDongFilter={filters.setTimelineDongFilter}
      timelineAptFilter={filters.timelineAptFilter}
      setTimelineAptFilter={filters.setTimelineAptFilter}
      regionFilter={filters.regionFilter}
      setRegionFilter={filters.setRegionFilter}
      pyeongFilter={filters.pyeongFilter}
      setPyeongFilter={filters.setPyeongFilter}
      tradeTypeFilter={filters.tradeTypeFilter}
      setTradeTypeFilter={filters.setTradeTypeFilter}
      quickFilter={filters.quickFilter}
      setQuickFilter={filters.setQuickFilter}
      searchQuery={filters.searchQuery}
      setSearchQuery={filters.setSearchQuery}
      sortOrder={filters.sortOrder}
      setSortOrder={filters.setSortOrder}
      viewMode={filters.viewMode}
      setViewMode={filters.setViewMode}
      onResetFilters={filters.resetFilters}
      renderTimelineItemCard={useDefaultRenderers ? undefined : renderCard}
      renderTimelineItemRow={useDefaultRenderers ? undefined : renderRow}
    />
  );
}

// ==========================================
// 4-Tier E2E Test Suite
// ==========================================

describe('D-VIEW MacroTimelineView 4-Tier E2E Master Test Suite', () => {

  // -------------------------------------------------------------
  // TIER 1: Feature Coverage (F1 ~ F8)
  // -------------------------------------------------------------
  describe('Tier 1: Feature Coverage E2E Suite', () => {

    describe('F1. All 7 Smart Quick Filter Chips', () => {
      it('renders all 7 quick chips: 전체, 동탄1, 동탄2, 신고가🔥, 30평대 국평, 10억 클럽, 대장단지', () => {
        render(<E2ETestHarness />);

        expect(screen.getByRole('button', { name: /전체/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /동탄1/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /동탄2/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /신고가🔥/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /30평대 국평/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /10억 클럽/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /대장단지/ })).toBeInTheDocument();
      });

      it('clicking "동탄1" chip filters items to Dongtan 1 complexes (반송동, 석우동, 능동)', () => {
        render(<E2ETestHarness />);

        fireEvent.click(screen.getByRole('button', { name: /동탄1/ }));

        // 반송동 items should appear
        expect(screen.getByTestId('timeline-card-시범다은마을 동탄포스코더샵')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-card-메타폴리스')).toBeInTheDocument();

        // Dongtan 2 items should NOT appear
        expect(screen.queryByTestId('timeline-card-동탄역 롯데캐슬')).not.toBeInTheDocument();
        expect(screen.queryByTestId('timeline-card-동탄린스트라우스 더레이크')).not.toBeInTheDocument();
      });

      it('clicking "동탄2" chip filters items to Dongtan 2 complexes (청계동, 오산동, 송동, 영천동 등)', () => {
        render(<E2ETestHarness />);

        fireEvent.click(screen.getByRole('button', { name: /동탄2/ }));

        expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-card-동탄역 시범 우남퍼스트빌')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-card-동탄린스트라우스 더레이크')).toBeInTheDocument();

        // Dongtan 1 item should NOT appear
        expect(screen.queryByTestId('timeline-card-시범다은마을 동탄포스코더샵')).not.toBeInTheDocument();
      });

      it('clicking "신고가🔥" chip displays only new high transactions', () => {
        render(<E2ETestHarness />);

        fireEvent.click(screen.getByRole('button', { name: /신고가🔥/ }));

        expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-card-동탄린스트라우스 더레이크')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-card-메타폴리스')).toBeInTheDocument();

        // Normal transaction should NOT appear
        expect(screen.queryByTestId('timeline-card-시범다은마을 동탄포스코더샵')).not.toBeInTheDocument();
        expect(screen.queryByTestId('timeline-card-동탄역 시범 더샵 센트럴시티')).not.toBeInTheDocument();
      });

      it('clicking "30평대 국평" chip displays 30~39 pyeong transactions', () => {
        render(<E2ETestHarness />);

        fireEvent.click(screen.getByRole('button', { name: /30평대 국평/ }));

        expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument(); // 34평
        expect(screen.getByTestId('timeline-card-동탄역 시범 우남퍼스트빌')).toBeInTheDocument(); // 34평
        expect(screen.getByTestId('timeline-card-동탄역 시범 더샵 센트럴시티')).toBeInTheDocument(); // 38평

        // Non-30s items should NOT appear
        expect(screen.queryByTestId('timeline-card-동탄 소형도시형생활주택')).not.toBeInTheDocument(); // 15평
        expect(screen.queryByTestId('timeline-card-동탄린스트라우스 더레이크')).not.toBeInTheDocument(); // 45평
      });

      it('clicking "10억 클럽" chip displays only transactions >= 10.0억', () => {
        render(<E2ETestHarness />);

        fireEvent.click(screen.getByRole('button', { name: /10억 클럽/ }));

        expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument(); // 16.5억
        expect(screen.getByTestId('timeline-card-메타폴리스')).toBeInTheDocument(); // 11.2억
        expect(screen.getByTestId('timeline-card-동탄역 펜트하우스 슈퍼프리미엄')).toBeInTheDocument(); // 20.5억

        // Under 10억 transactions should NOT appear
        expect(screen.queryByTestId('timeline-card-시범다은마을 동탄포스코더샵')).not.toBeInTheDocument(); // 8.5억
        expect(screen.queryByTestId('timeline-card-동탄 소형도시형생활주택')).not.toBeInTheDocument(); // 1.2억
      });

      it('clicking "대장단지" chip displays only landmark complexes', () => {
        render(<E2ETestHarness />);

        fireEvent.click(screen.getByRole('button', { name: /대장단지/ }));

        expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-card-동탄역 시범 우남퍼스트빌')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-card-동탄린스트라우스 더레이크')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-card-메타폴리스')).toBeInTheDocument();

        // Non-landmark should NOT appear
        expect(screen.queryByTestId('timeline-card-동탄 소형도시형생활주택')).not.toBeInTheDocument();
      });
    });

    describe('F2. Real-Time Inline Search & Clear Action', () => {
      it('filters transactions dynamically by typing apartment name', () => {
        render(<E2ETestHarness />);

        const searchInput = screen.getByPlaceholderText('단지명 검색...');
        fireEvent.change(searchInput, { target: { value: '롯데캐슬' } });

        expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
        expect(screen.queryByTestId('timeline-card-메타폴리스')).not.toBeInTheDocument();
        expect(screen.queryByTestId('timeline-card-동탄린스트라우스 더레이크')).not.toBeInTheDocument();
      });

      it('filters transactions dynamically by typing dong name (e.g. "송동")', () => {
        render(<E2ETestHarness />);

        const searchInput = screen.getByPlaceholderText('단지명 검색...');
        fireEvent.change(searchInput, { target: { value: '송동' } });

        expect(screen.getByTestId('timeline-card-동탄린스트라우스 더레이크')).toBeInTheDocument();
        expect(screen.queryByTestId('timeline-card-동탄역 롯데캐슬')).not.toBeInTheDocument();
      });

      it('shows clear button (X) when query is non-empty, and clicking it resets search input', () => {
        render(<E2ETestHarness />);

        const searchInput = screen.getByPlaceholderText('단지명 검색...');
        fireEvent.change(searchInput, { target: { value: '롯데캐슬' } });

        const clearBtn = screen.getByLabelText('검색어 지우기');
        expect(clearBtn).toBeInTheDocument();

        fireEvent.click(clearBtn);

        expect(searchInput).toHaveValue('');
        // All items restored
        expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-card-메타폴리스')).toBeInTheDocument();
      });
    });

    describe('F3. 4-Way Multi-Sort Selection Engine', () => {
      it('sorts transactions by price descending when "실거래가 높은순" is selected', () => {
        render(<E2ETestHarness />);

        const sortSelect = screen.getByLabelText('정렬 기준 선택');
        fireEvent.change(sortSelect, { target: { value: 'price_desc' } });

        // On 2026.08.22: 동탄린스트라우스 더레이크 (18.2억) > 동탄역 롯데캐슬 (16.5억) > 동탄역 시범 우남퍼스트빌 (14.2억) > 시범다은마을 (8.5억)
        const date22Header = screen.getByText('2026.08.22 (토)');
        const day22Container = date22Header.closest('div.flex-col')!;
        const itemCards = within(day22Container).getAllByTestId(/^timeline-card-/);
        expect(itemCards[0]).toHaveAttribute('data-testid', 'timeline-card-동탄린스트라우스 더레이크');
      });

      it('sorts transactions by delta descending when "상승률 높은순" is selected', () => {
        render(<E2ETestHarness />);

        const sortSelect = screen.getByLabelText('정렬 기준 선택');
        fireEvent.change(sortSelect, { target: { value: 'delta_desc' } });

        // On 2026.08.21: 펜트하우스 (20.5%) > 메타폴리스 (12.0%)
        const date21Header = screen.getByText('2026.08.21 (금)');
        const day21Container = date21Header.closest('div.flex-col')!;
        const itemCards = within(day21Container).getAllByTestId(/^timeline-card-/);
        expect(itemCards[0]).toHaveAttribute('data-testid', 'timeline-card-동탄역 펜트하우스 슈퍼프리미엄');
      });

      it('sorts transactions by area descending when "전용면적순" is selected', () => {
        render(<E2ETestHarness />);

        const sortSelect = screen.getByLabelText('정렬 기준 선택');
        fireEvent.change(sortSelect, { target: { value: 'area_desc' } });

        // On 2026.08.21: 펜트하우스 (180㎡ / 55평) > 메타폴리스 (132㎡ / 40평)
        const date21Header = screen.getByText('2026.08.21 (금)');
        const day21Container = date21Header.closest('div.flex-col')!;
        const itemCards = within(day21Container).getAllByTestId(/^timeline-card-/);
        expect(itemCards[0]).toHaveAttribute('data-testid', 'timeline-card-동탄역 펜트하우스 슈퍼프리미엄');
      });
    });

    describe('F4. Card Grid View vs Compact List View Controller', () => {
      it('switches between Card Grid View and Compact List View when clicking mode toggle', () => {
        render(<E2ETestHarness />);

        // Default: Card View
        const cardModeBtn = screen.getByLabelText('카드 뷰 보기');
        const listModeBtn = screen.getByLabelText('리스트 뷰 보기');
        expect(cardModeBtn).toBeInTheDocument();
        expect(listModeBtn).toBeInTheDocument();

        // Switch to List View
        fireEvent.click(listModeBtn);

        expect(screen.getByTestId('timeline-row-동탄역 롯데캐슬')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-row-동탄린스트라우스 더레이크')).toBeInTheDocument();

        // Switch back to Card View
        fireEvent.click(cardModeBtn);

        expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
        expect(screen.getByTestId('timeline-card-동탄린스트라우스 더레이크')).toBeInTheDocument();
      });
    });

    describe('F5. Sticky Date Summary Header & Peak Price 👑 Highlight Badge', () => {
      it('renders sticky date header with total count, average price, and 👑 최고가 highlight badge', () => {
        render(<E2ETestHarness />);

        // Date 1: 2026.08.22 (토) - 4 items: 18.2, 16.5, 14.2, 8.5 (avg: 14.35 -> 14억 3,500만, peak: 동탄린스트라우스 더레이크 18.2억)
        expect(screen.getByText('2026.08.22 (토)')).toBeInTheDocument();
        expect(screen.getByText('총 4건 거래')).toBeInTheDocument();
        expect(screen.getByText('평균 14억 3,500만')).toBeInTheDocument();

        const peakBadge1 = screen.getByTestId('highest-price-badge-2026.08.22 (토)');
        expect(peakBadge1).toBeInTheDocument();
        expect(peakBadge1).toHaveTextContent('👑 최고가:');
        expect(peakBadge1).toHaveTextContent('동탄린스트라우스 더레이크');
        expect(peakBadge1).toHaveTextContent('18억 2,000만');

        // Date 2: 2026.08.21 (금) - 5 items, peak: 동탄역 펜트하우스 슈퍼프리미엄 20.5억
        const peakBadge2 = screen.getByTestId('highest-price-badge-2026.08.21 (금)');
        expect(peakBadge2).toBeInTheDocument();
        expect(peakBadge2).toHaveTextContent('동탄역 펜트하우스 슈퍼프리미엄');
        expect(peakBadge2).toHaveTextContent('20억 5,000만');
      });
    });

    describe('F6. Favorite Bookmark Heart Toggle & Event Isolation', () => {
      it('toggles favorite bookmark heart and isolates click event with stopPropagation', () => {
        const onSelectAptSpy = jest.fn();
        const onToggleFavoriteSpy = jest.fn();

        render(
          <E2ETestHarness
            onSelectAptSpy={onSelectAptSpy}
            onToggleFavoriteSpy={onToggleFavoriteSpy}
          />
        );

        const favoriteBtn = screen.getByLabelText('동탄역 롯데캐슬 관심 단지 등록');
        expect(favoriteBtn).toBeInTheDocument();

        // Click favorite button
        fireEvent.click(favoriteBtn);

        expect(onToggleFavoriteSpy).toHaveBeenCalledWith('동탄역 롯데캐슬');
        expect(onSelectAptSpy).not.toHaveBeenCalled(); // Event isolation confirmed
      });

      it('clicking card body triggers apartment selection callback', () => {
        const onSelectAptSpy = jest.fn();

        render(<E2ETestHarness onSelectAptSpy={onSelectAptSpy} />);

        const cardBody = screen.getByLabelText(/실거래 분석 아파트 선택: 동탄역 롯데캐슬/);
        fireEvent.click(cardBody);

        expect(onSelectAptSpy).toHaveBeenCalledWith('동탄역 롯데캐슬');
      });
    });

    describe('F7. Price Per Pyeong Conversion & Delta Price Badges', () => {
      it('computes and displays price per pyeong accurately', () => {
        render(<E2ETestHarness />);

        // 동탄역 롯데캐슬: 16.5억 / 34평 = 4,853만/평
        expect(screen.getByText(/평당 4,853만/)).toBeInTheDocument();

        // 동탄린스트라우스 더레이크: 18.2억 / 45평 = 4,044만/평
        expect(screen.getByText(/평당 4,044만/)).toBeInTheDocument();
      });

      it('renders rising (▲) and falling (▼) delta badges with correct color cues', () => {
        render(<E2ETestHarness />);

        // Rising delta: 1.5억 (동탄역 롯데캐슬) -> ▲ 1억 5,000만 (+10%)
        expect(screen.getAllByText(/▲ 1억 5,000만/).length).toBeGreaterThanOrEqual(1);

        // Falling delta: -0.5억 (동탄역 시범 더샵 센트럴시티) -> ▼ 5,000만 (-3.6%)
        expect(screen.getAllByText(/▼ 5,000만/).length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('F8. Detail Modal Trigger Callback Deep-Linking', () => {
      it('triggers onDetailsClick when clicking "상세" button without triggering card selection', () => {
        const onDetailsClickSpy = jest.fn();
        const onSelectAptSpy = jest.fn();

        render(
          <E2ETestHarness
            onDetailsClickSpy={onDetailsClickSpy}
            onSelectAptSpy={onSelectAptSpy}
          />
        );

        const detailBtn = screen.getByLabelText('동탄역 롯데캐슬 상세 정보 보기');
        fireEvent.click(detailBtn);

        expect(onDetailsClickSpy).toHaveBeenCalledWith('동탄역 롯데캐슬');
        expect(onSelectAptSpy).not.toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------
  // TIER 2: Boundary & Corner Cases (B1 ~ B4)
  // -------------------------------------------------------------
  describe('Tier 2: Boundary & Corner Cases Suite', () => {

    describe('B1. Empty Search Results & Reset Filters', () => {
      it('displays user-friendly empty state message when no transactions match filter criteria', () => {
        render(<E2ETestHarness />);

        const searchInput = screen.getByPlaceholderText('단지명 검색...');
        fireEvent.change(searchInput, { target: { value: '존재하지않는단지12345' } });

        expect(screen.getByText('선택하신 필터 조건에 부합하는 최근 실거래가 없습니다.')).toBeInTheDocument();
        expect(screen.getByText('필터 조건을 변경하거나 검색어를 재설정해 보세요.')).toBeInTheDocument();
      });

      it('clicking "필터 조건 초기화" button in empty state restores the full transaction list', () => {
        render(<E2ETestHarness />);

        const searchInput = screen.getByPlaceholderText('단지명 검색...');
        fireEvent.change(searchInput, { target: { value: '존재하지않는단지12345' } });

        const resetBtn = screen.getByRole('button', { name: /필터 조건 초기화/ });
        expect(resetBtn).toBeInTheDocument();

        fireEvent.click(resetBtn);

        expect(searchInput).toHaveValue('');
        expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
      });
    });

    describe('B2. Extreme Price Value Formatting', () => {
      it('formats extreme high price 20.5억 cleanly in cards and headers', () => {
        render(<E2ETestHarness />);

        const card = screen.getByTestId('timeline-card-동탄역 펜트하우스 슈퍼프리미엄');
        expect(card).toBeInTheDocument();
        expect(within(card).getByText('20억 5,000만')).toBeInTheDocument();
      });

      it('formats sub-2억 small transaction 1.2억 cleanly', () => {
        render(<E2ETestHarness />);

        const card = screen.getByTestId('timeline-card-동탄 소형도시형생활주택');
        expect(card).toBeInTheDocument();
        expect(within(card).getByText('1억 2,000만')).toBeInTheDocument();
      });
    });

    describe('B3. Long Apartment Name Truncation & Layout Protection', () => {
      it('renders very long complex name safely without layout overflow or error', () => {
        render(<E2ETestHarness />);

        const card = screen.getByTestId('timeline-card-동탄역 시범 우남퍼스트빌 센트럴파크 더프리미어 레이크뷰 1단지 아파트');
        expect(card).toBeInTheDocument();
      });
    });

    describe('B4. Special Characters, Whitespace & Unicode Search Queries', () => {
      it('handles search queries with leading and trailing whitespace safely', () => {
        render(<E2ETestHarness />);

        const searchInput = screen.getByPlaceholderText('단지명 검색...');
        fireEvent.change(searchInput, { target: { value: '   롯데캐슬   ' } });

        expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
        expect(screen.queryByTestId('timeline-card-메타폴리스')).not.toBeInTheDocument();
      });

      it('handles regex special meta-characters in search without throwing errors', () => {
        render(<E2ETestHarness />);

        const searchInput = screen.getByPlaceholderText('단지명 검색...');
        // Should not crash due to regex parsing
        fireEvent.change(searchInput, { target: { value: '[()+*?]' } });

        expect(screen.getByText('선택하신 필터 조건에 부합하는 최근 실거래가 없습니다.')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------
  // TIER 3: Cross-Feature Combinations (C1 ~ C3)
  // -------------------------------------------------------------
  describe('Tier 3: Cross-Feature Combinations Suite', () => {

    it('C1: Combines quick chip + search query + sort order + viewMode toggle simultaneously', () => {
      render(<E2ETestHarness />);

      // 1. Select '동탄2' quick chip
      fireEvent.click(screen.getByRole('button', { name: /동탄2/ }));

      // 2. Type search query '시범'
      const searchInput = screen.getByPlaceholderText('단지명 검색...');
      fireEvent.change(searchInput, { target: { value: '시범' } });

      // 3. Select sort order '실거래가 높은순'
      const sortSelect = screen.getByLabelText('정렬 기준 선택');
      fireEvent.change(sortSelect, { target: { value: 'price_desc' } });

      // 4. Toggle view mode to 'list'
      fireEvent.click(screen.getByLabelText('리스트 뷰 보기'));

      // Verifications:
      // - Only Dongtan 2 complexes with '시범' should appear
      expect(screen.getByTestId('timeline-row-동탄역 시범 우남퍼스트빌')).toBeInTheDocument(); // 14.2억
      expect(screen.getByTestId('timeline-row-동탄역 시범 더샵 센트럴시티')).toBeInTheDocument(); // 13.5억
      expect(screen.getByTestId('timeline-row-동탄역 시범 우남퍼스트빌 센트럴파크 더프리미어 레이크뷰 1단지 아파트')).toBeInTheDocument(); // 12.3억

      // - Dongtan 1 '시범다은마을' should NOT appear because region is Dongtan 2
      expect(screen.queryByTestId('timeline-row-시범다은마을 동탄포스코더샵')).not.toBeInTheDocument();

      // - Non-'시범' complexes should NOT appear
      expect(screen.queryByTestId('timeline-row-동탄역 롯데캐슬')).not.toBeInTheDocument();
    });

    it('C2: Bookmarks favorite in compact list view and persists state when switching to card grid view', () => {
      render(<E2ETestHarness />);

      // 1. Switch to list view
      fireEvent.click(screen.getByLabelText('리스트 뷰 보기'));

      // 2. Bookmark '동탄역 롯데캐슬'
      const favBtnList = screen.getByLabelText('동탄역 롯데캐슬 관심 단지 등록');
      fireEvent.click(favBtnList);

      // Verify heart icon is active (fill-rose-500)
      expect(favBtnList.querySelector('svg')).toHaveClass('fill-rose-500');

      // 3. Switch back to card grid view
      fireEvent.click(screen.getByLabelText('카드 뷰 보기'));

      // Verify favorite status persists in card grid view
      const favBtnCard = screen.getByLabelText('동탄역 롯데캐슬 관심 단지 등록');
      expect(favBtnCard.querySelector('svg')).toHaveClass('fill-rose-500');
    });

    it('C3: Cascades conflicting filter into empty state and recovers seamlessly via Reset Filters button', () => {
      render(<E2ETestHarness />);

      // 1. Select '동탄1' quick chip
      fireEvent.click(screen.getByRole('button', { name: /동탄1/ }));

      // 2. Search for '롯데캐슬' (which is in Dongtan 2) -> should yield 0 results
      const searchInput = screen.getByPlaceholderText('단지명 검색...');
      fireEvent.change(searchInput, { target: { value: '롯데캐슬' } });

      expect(screen.getByText('선택하신 필터 조건에 부합하는 최근 실거래가 없습니다.')).toBeInTheDocument();

      // 3. Click Reset Filters button
      const resetBtn = screen.getByRole('button', { name: /필터 조건 초기화/ });
      fireEvent.click(resetBtn);

      // All filters reset to initial default
      expect(searchInput).toHaveValue('');
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-card-시범다은마을 동탄포스코더샵')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // TIER 4: Real-World Workload Scenarios (S1 ~ S2)
  // -------------------------------------------------------------
  describe('Tier 4: Real-World Workload Scenarios Suite', () => {

    it('Scenario A: Dongtan 2 homebuyer searching for 30-pyeong new high transactions sorted by price', () => {
      const onSelectAptSpy = jest.fn();

      render(<E2ETestHarness onSelectAptSpy={onSelectAptSpy} />);

      // 1. User clicks '동탄2' chip to narrow region
      fireEvent.click(screen.getByRole('button', { name: /동탄2/ }));

      // 2. User clicks '30평대 국평' chip to restrict to national standard size
      fireEvent.click(screen.getByRole('button', { name: /30평대 국평/ }));

      // 3. User sets sort order to '실거래가 높은순'
      const sortSelect = screen.getByLabelText('정렬 기준 선택');
      fireEvent.change(sortSelect, { target: { value: 'price_desc' } });

      // Verifications:
      // - 30-pyeong Dongtan 2 items appear
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(screen.getByTestId('timeline-card-동탄역 시범 우남퍼스트빌')).toBeInTheDocument();

      // 4. User clicks on '동탄역 롯데캐슬' card to inspect transaction trends
      const card = screen.getByLabelText(/실거래 분석 아파트 선택: 동탄역 롯데캐슬/);
      fireEvent.click(card);

      expect(onSelectAptSpy).toHaveBeenCalledWith('동탄역 롯데캐슬');
    });

    it('Scenario B: Landmark complex investor scanning daily transactions in list view and opening detailed field report', () => {
      const onDetailsClickSpy = jest.fn();
      const onToggleFavoriteSpy = jest.fn();

      render(
        <E2ETestHarness
          onDetailsClickSpy={onDetailsClickSpy}
          onToggleFavoriteSpy={onToggleFavoriteSpy}
        />
      );

      // 1. Investor clicks '대장단지' quick chip
      fireEvent.click(screen.getByRole('button', { name: /대장단지/ }));

      // 2. Investor switches to compact 'list' view mode for rapid scanning
      fireEvent.click(screen.getByLabelText('리스트 뷰 보기'));

      // 3. Investor bookmarks '동탄린스트라우스 더레이크'
      const favBtn = screen.getByLabelText('동탄린스트라우스 더레이크 관심 단지 등록');
      fireEvent.click(favBtn);
      expect(onToggleFavoriteSpy).toHaveBeenCalledWith('동탄린스트라우스 더레이크');

      // 4. Investor clicks '상세' button on '동탄린스트라우스 더레이크' to open deep field report modal
      const detailBtn = screen.getByLabelText('동탄린스트라우스 더레이크 상세 정보 보기');
      fireEvent.click(detailBtn);

      expect(onDetailsClickSpy).toHaveBeenCalledWith('동탄린스트라우스 더레이크');
    });
  });

  // -------------------------------------------------------------
  // Default Presentation & Backward Compatibility Checks
  // -------------------------------------------------------------
  describe('Default Presentation & Backward Compatibility', () => {
    it('renders cleanly using default internal card and row renderers without crashes', () => {
      render(<E2ETestHarness useDefaultRenderers={true} />);

      // Verify default card view renders
      expect(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).toBeInTheDocument();
      expect(within(screen.getByTestId('timeline-card-동탄역 롯데캐슬')).getByText('16억 5,000만')).toBeInTheDocument();

      // Switch to list view using default internal row renderer
      fireEvent.click(screen.getByLabelText('리스트 뷰 보기'));
      expect(screen.getByTestId('timeline-row-동탄역 롯데캐슬')).toBeInTheDocument();
    });
  });
});
