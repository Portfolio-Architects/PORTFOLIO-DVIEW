import { useState, useEffect, useMemo, useCallback } from 'react';
import type { DongApartment } from '@/lib/dong-apartments';

export type RegionFilterType = 'all' | 'dongtan1' | 'dongtan2' | string;
export type PyeongFilterType = 'all' | 'under20' | '20s' | '30s' | '40plus';
export type TradeTypeFilterType = 'all' | 'high' | 'rising' | 'falling';

/**
 * 7 One-Touch Quick Filter Chips:
 * - all: 전체
 * - dongtan1: 동탄1 권역 (반송동, 석우동, 능동)
 * - dongtan2: 동탄2 권역 (청계동, 영천동, 오산동, 목동, 산척동, 장지동, 송동, 신동)
 * - high: 신고가 갱신 거래
 * - pyeong30: 30평대 국민평형 (전용 84㎡ 내외)
 * - billion10: 10억 클럽 (실거래가 10억 원 이상)
 * - landmark: 대장단지 (시세 리딩 랜드마크 단지)
 */
export type QuickFilterChipType = 'all' | 'dongtan1' | 'dongtan2' | 'high' | 'pyeong30' | 'billion10' | 'landmark';

/**
 * 4-Way Multi-Sort Orders:
 * - latest: 최신 계약순 (기본 계약일자 내림차순)
 * - price_desc: 실거래가 높은순 (거래가격 내림차순)
 * - delta_desc: 상승률 높은순 (상승률/변동액 내림차순)
 * - area_desc: 전용면적순 (전용면적/평형 내림차순)
 */
export type TimelineSortOrder = 'latest' | 'price_desc' | 'delta_desc' | 'area_desc';

/**
 * Timeline Layout View Modes:
 * - card: 3열 반응형 와이드 카드 그리드
 * - list: 컴팩트 행/테이블 리스트 뷰
 */
export type TimelineViewMode = 'card' | 'list';

export const DONGTAN1_DONGS = ['반송동', '석우동', '능동'];
export const DONGTAN2_DONGS = ['청계동', '영천동', '오산동', '목동', '산척동', '장지동', '송동', '신동'];

/** 동탄 1·2 신도시 핵심 시세 리딩 대장단지 */
export const LANDMARK_APTS = [
  '동탄역 롯데캐슬',
  '동탄역 시범 우남퍼스트빌',
  '동탄역 시범 더샵 센트럴시티',
  '동탄역 시범 한화꿈에그린 프레스티지',
  '동탄린스트라우스 더레이크',
  '동탄역 예미지 시그너스',
  '동탄역 유림노르웨이숲',
  '동탄역 반도유보라 아이비파크 4.0',
  '동탄역 반도유보라 아이비파크 8.0',
  '메타폴리스',
  '시범다은마을 동탄포스코더샵',
  '시범한빛마을 동탄아이파크',
  '동탄 레이크자이 더테라스',
];

export interface UseMacroFiltersProps {
  sheetApartments?: Record<string, DongApartment[]>;
}

export interface UseMacroFiltersReturn {
  // M1 State Additions
  quickFilter: QuickFilterChipType;
  setQuickFilter: (chip: QuickFilterChipType) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortOrder: TimelineSortOrder;
  setSortOrder: (order: TimelineSortOrder) => void;
  viewMode: TimelineViewMode;
  setViewMode: (mode: TimelineViewMode) => void;
  resetFilters: () => void;

  // Region / Dong State (with aliases for PROJECT.md contract compliance)
  region: RegionFilterType;
  setRegion: (region: RegionFilterType) => void;
  regionFilter: RegionFilterType;
  setRegionFilter: (region: RegionFilterType) => void;

  dong: string;
  setDong: (dong: string) => void;
  timelineDongFilter: string;
  setTimelineDongFilter: (dong: string) => void;

  selectedApt: string;
  setSelectedApt: (apt: string) => void;
  timelineAptFilter: string;
  setTimelineAptFilter: (apt: string) => void;

  // Additional Filter Dimensions
  pyeongFilter: PyeongFilterType;
  setPyeongFilter: (pyeong: PyeongFilterType) => void;
  tradeTypeFilter: TradeTypeFilterType;
  setTradeTypeFilter: (type: TradeTypeFilterType) => void;

  // Utility & Chart States
  gapRankingDong: string;
  setGapRankingDong: (dong: string) => void;
  timeframe: "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
  setTimeframe: (tf: "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL") => void;

  // Derived Option Lists
  availableDongs: string[];
  availableApts: string[];
}

export function useMacroFilters({ sheetApartments }: UseMacroFiltersProps = {}): UseMacroFiltersReturn {
  const [gapRankingDong, setGapRankingDong] = useState<string>("전체");
  const [timelineDongFilter, setTimelineDongFilter] = useState<string>("전체");
  const [timelineAptFilter, setTimelineAptFilter] = useState<string>("전체");
  const [timeframe, setTimeframe] = useState<"3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL">("3Y");

  // Multi-Filter Dimensions
  const [regionFilter, setRegionFilterState] = useState<RegionFilterType>("all");
  const [pyeongFilter, setPyeongFilterState] = useState<PyeongFilterType>("all");
  const [tradeTypeFilter, setTradeTypeFilterState] = useState<TradeTypeFilterType>("all");

  // New M1 State Dimensions
  const [quickFilter, setQuickFilterState] = useState<QuickFilterChipType>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<TimelineSortOrder>("latest");
  const [viewMode, setViewMode] = useState<TimelineViewMode>("card");

  useEffect(() => {
    setTimelineAptFilter("전체");
  }, [timelineDongFilter, regionFilter]);

  const setRegionFilter = useCallback((region: RegionFilterType) => {
    setRegionFilterState(region);
    if (region === 'dongtan1') {
      setQuickFilterState('dongtan1');
    } else if (region === 'dongtan2') {
      setQuickFilterState('dongtan2');
    } else if (region === 'all' || region === '전체') {
      setQuickFilterState((prev) => (prev === 'dongtan1' || prev === 'dongtan2' ? 'all' : prev));
    } else {
      setQuickFilterState((prev) => (prev === 'dongtan1' || prev === 'dongtan2' ? 'all' : prev));
    }
  }, []);

  const setPyeongFilter = useCallback((pyeong: PyeongFilterType) => {
    setPyeongFilterState(pyeong);
    if (pyeong === '30s') {
      setQuickFilterState('pyeong30');
    } else if (pyeong !== 'all') {
      setQuickFilterState((prev) => (prev === 'pyeong30' ? 'all' : prev));
    } else {
      setQuickFilterState((prev) => (prev === 'pyeong30' ? 'all' : prev));
    }
  }, []);

  const setTradeTypeFilter = useCallback((tradeType: TradeTypeFilterType) => {
    setTradeTypeFilterState(tradeType);
    if (tradeType === 'high') {
      setQuickFilterState('high');
    } else if (tradeType !== 'all') {
      setQuickFilterState((prev) => (prev === 'high' ? 'all' : prev));
    } else {
      setQuickFilterState((prev) => (prev === 'high' ? 'all' : prev));
    }
  }, []);

  const setQuickFilter = useCallback((chip: QuickFilterChipType) => {
    setQuickFilterState(chip);
    switch (chip) {
      case 'all':
        setRegionFilterState('all');
        setTimelineDongFilter('전체');
        setPyeongFilterState('all');
        setTradeTypeFilterState('all');
        break;
      case 'dongtan1':
        setRegionFilterState('dongtan1');
        setTimelineDongFilter('전체');
        break;
      case 'dongtan2':
        setRegionFilterState('dongtan2');
        setTimelineDongFilter('전체');
        break;
      case 'high':
        setTradeTypeFilterState('high');
        break;
      case 'pyeong30':
        setPyeongFilterState('30s');
        break;
      case 'billion10':
      case 'landmark':
        // Custom item filter conditions evaluated in downstream filtering logic
        break;
    }
  }, []);

  const resetFilters = useCallback(() => {
    setQuickFilterState('all');
    setSearchQuery('');
    setSortOrder('latest');
    setRegionFilterState('all');
    setTimelineDongFilter('전체');
    setTimelineAptFilter('전체');
    setPyeongFilterState('all');
    setTradeTypeFilterState('all');
  }, []);

  const availableDongs = useMemo(() => {
    if (!sheetApartments) return [];
    return Object.keys(sheetApartments).sort();
  }, [sheetApartments]);

  const availableApts = useMemo(() => {
    if (!sheetApartments) return [];

    // 1. Region Group / Dong filter
    if (regionFilter === 'dongtan1') {
      return DONGTAN1_DONGS.flatMap(d => (sheetApartments[d] || []).map(a => a.name)).sort();
    }
    if (regionFilter === 'dongtan2') {
      return DONGTAN2_DONGS.flatMap(d => (sheetApartments[d] || []).map(a => a.name)).sort();
    }
    if (regionFilter !== 'all' && regionFilter !== '전체') {
      if (sheetApartments[regionFilter]) {
        return (sheetApartments[regionFilter] || []).map(a => a.name).sort();
      }
    }

    // 2. Legacy Dong Filter
    if (timelineDongFilter !== "전체" && timelineDongFilter !== "all") {
      return (sheetApartments[timelineDongFilter] || []).map(a => a.name).sort();
    }

    return Object.values(sheetApartments).flat().map(a => a.name).sort();
  }, [sheetApartments, timelineDongFilter, regionFilter]);

  return {
    quickFilter,
    setQuickFilter,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    viewMode,
    setViewMode,
    resetFilters,

    region: regionFilter,
    setRegion: setRegionFilter,
    regionFilter,
    setRegionFilter,

    dong: timelineDongFilter,
    setDong: setTimelineDongFilter,
    timelineDongFilter,
    setTimelineDongFilter,

    selectedApt: timelineAptFilter,
    setSelectedApt: setTimelineAptFilter,
    timelineAptFilter,
    setTimelineAptFilter,

    pyeongFilter,
    setPyeongFilter,
    tradeTypeFilter,
    setTradeTypeFilter,
    gapRankingDong,
    setGapRankingDong,
    timeframe,
    setTimeframe,
    availableDongs,
    availableApts,
  };
}
