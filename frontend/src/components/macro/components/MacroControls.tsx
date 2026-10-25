import React from 'react';
import { Settings, Search, X, LayoutGrid, List, GripVertical } from 'lucide-react';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';
import {
  getToggleTrackClass,
  getToggleBtnClass,
  getControlSelectClass,
  getControlInputClass,
  getControlPillClass,
} from '@/lib/design-system/controls';
import type { TimelinePeriod } from '@/types/transaction';
import type {
  RegionFilterType,
  PyeongFilterType,
  TradeTypeFilterType,
  QuickFilterChipType,
  TimelineSortOrder,
  TimelineViewMode,
} from '../hooks/useMacroFilters';

export const QUICK_FILTER_CHIPS: Array<{
  id: QuickFilterChipType;
  label: string;
  icon: string;
  description: string;
}> = [
  { id: 'all', label: '전체', icon: '', description: '전체 실거래 내역' },
  { id: 'dongtan1', label: '동탄1', icon: '', description: '동탄1 신도시 (반송/석우/능동)' },
  { id: 'dongtan2', label: '동탄2', icon: '', description: '동탄2 신도시 (청계/영천/오산/목동 등)' },
  { id: 'high', label: '신고가', icon: '', description: '신고가 갱신 거래' },
  { id: 'pyeong30', label: '30평대 국평', icon: '', description: '전용 84㎡ 내외 국민평형' },
  { id: 'billion10', label: '10억 클럽', icon: '', description: '10억 원 이상 프리미엄 거래' },
  { id: 'landmark', label: '대장단지', icon: '', description: '동탄 핵심 시세 리딩 단지' },
];

export const TIMELINE_SORT_OPTIONS: Array<{
  value: TimelineSortOrder;
  label: string;
}> = [
  { value: 'latest', label: '최신 등록순' },
  { value: 'price_desc', label: '실거래가 높은순' },
  { value: 'delta_desc', label: '상승률 높은순' },
  { value: 'area_desc', label: '전용면적순' },
];

export interface TimelineFilterControlsProps {
  // Legacy Props (100% backward compatible)
  timelineDongFilter?: string;
  setTimelineDongFilter?: (dong: string) => void;
  timelineAptFilter: string;
  setTimelineAptFilter: (apt: string) => void;
  availableDongs: string[];
  availableApts: string[];
  regionFilter?: RegionFilterType;
  setRegionFilter?: (region: RegionFilterType) => void;
  pyeongFilter?: PyeongFilterType;
  setPyeongFilter?: (pyeong: PyeongFilterType) => void;
  tradeTypeFilter?: TradeTypeFilterType;
  setTradeTypeFilter?: (type: TradeTypeFilterType) => void;

  // New M1 Props
  quickFilter?: QuickFilterChipType;
  setQuickFilter?: (chip: QuickFilterChipType) => void;
  showQuickFilters?: boolean;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  sortOrder?: TimelineSortOrder;
  setSortOrder?: (order: TimelineSortOrder) => void;
  viewMode?: TimelineViewMode;
  setViewMode?: (mode: TimelineViewMode) => void;
  periodFilter?: TimelinePeriod;
  setPeriodFilter?: (period: TimelinePeriod) => void;
  onResetFilters?: () => void;
}

export const TimelineFilterControls = React.memo(function TimelineFilterControls({
  timelineDongFilter = "전체",
  setTimelineDongFilter,
  timelineAptFilter,
  setTimelineAptFilter,
  availableDongs,
  availableApts,
  regionFilter = "all",
  setRegionFilter,
  pyeongFilter = "all",
  setPyeongFilter,
  tradeTypeFilter = "all",
  setTradeTypeFilter,
  quickFilter = "all",
  setQuickFilter,
  showQuickFilters = true,
  searchQuery = "",
  setSearchQuery,
  sortOrder = "latest",
  setSortOrder,
  viewMode = "card",
  setViewMode,
  periodFilter = "90d",
  setPeriodFilter,
  onResetFilters,
}: TimelineFilterControlsProps) {
  const currentRegion = regionFilter !== "all" ? regionFilter : (timelineDongFilter !== "전체" ? timelineDongFilter : "all");

  const handleRegionChange = (val: string) => {
    if (setRegionFilter) {
      setRegionFilter(val as RegionFilterType);
    }
    if (setTimelineDongFilter) {
      if (val === "all") setTimelineDongFilter("전체");
      else setTimelineDongFilter(val);
    }
  };

  const isFiltersActive =
    (showQuickFilters && quickFilter !== 'all') ||
    (searchQuery && searchQuery.trim().length > 0) ||
    currentRegion !== 'all' ||
    timelineAptFilter !== '전체' ||
    pyeongFilter !== 'all' ||
    tradeTypeFilter !== 'all';

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* 1. Quick Filter Chips Bar with Smooth Horizontal Scroll (optional) */}
      {showQuickFilters && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 w-full">
          {QUICK_FILTER_CHIPS.map((chip) => {
            const isActive = quickFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setQuickFilter?.(chip.id)}
                className={getControlPillClass({ active: isActive })}
                title={chip.description}
              >
                <span>{chip.label}</span>
              </button>
            );
          })}

          {/* Reset Button */}
          {isFiltersActive && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className={getControlPillClass({ extraClass: 'hover:text-red-500' })}
              title="모든 필터 초기화"
              aria-label="모든 필터 초기화"
            >
              <span>초기화</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Action Toolbar: Search + Sort + Dropdowns + View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        {/* Left: Real-Time Inline Search Input & Reset Button */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1 sm:min-w-[160px] sm:max-w-[300px]">
          {setSearchQuery && (
            <div className="relative flex items-center w-full">
              <Search size={14} className="absolute left-3 text-tertiary pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="단지명 검색..."
                aria-label="단지명 검색"
                className={getControlInputClass('w-full pl-8 pr-8')}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 text-tertiary hover:text-primary transition-colors p-0.5 rounded-full"
                  aria-label="검색어 지우기"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {!showQuickFilters && isFiltersActive && onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className={getControlPillClass({ extraClass: 'hover:text-red-500' })}
              title="모든 필터 초기화"
              aria-label="모든 필터 초기화"
            >
              <span>초기화</span>
            </button>
          )}
        </div>

        {/* Right: Dropdowns + Sort + View Mode Toggle */}
        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-1.5 sm:gap-2 w-full sm:w-auto min-w-0 sm:ml-auto">
          {/* Multi-Sort Selector */}
          {setSortOrder && (
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as TimelineSortOrder)}
              aria-label="정렬 기준 선택"
              className={getControlSelectClass('shrink-0 min-w-0 w-[104px] xs:w-[112px] sm:w-[124px] truncate')}
            >
              {TIMELINE_SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Region / Dong Dropdown */}
          <select
            value={currentRegion}
            onChange={(e) => handleRegionChange(e.target.value)}
            aria-label="권역 및 법정동 선택"
            className={getControlSelectClass('shrink-0 min-w-0 w-[104px] xs:w-[114px] sm:w-[134px] truncate')}
          >
            <option value="all">전체 권역/동</option>
            <optgroup label="권역 그룹">
              <option value="dongtan1">동탄1 권역</option>
              <option value="dongtan2">동탄2 권역</option>
            </optgroup>
            <optgroup label="개별 법정동">
              {availableDongs.map((dong) => (
                <option key={dong} value={dong}>
                  {dong}
                </option>
              ))}
            </optgroup>
          </select>

          {/* Pyeong Dropdown */}
          {setPyeongFilter && (
            <select
              value={pyeongFilter}
              onChange={(e) => setPyeongFilter(e.target.value as PyeongFilterType)}
              aria-label="평형대 선택"
              data-testid="timeline-pyeong-select"
              className={getControlSelectClass('shrink-0 min-w-0 w-[96px] xs:w-[106px] sm:w-[120px] truncate')}
            >
              <option value="all">전체 평형</option>
              <option value="under20">20평 미만</option>
              <option value="20s">20평대</option>
              <option value="30s">30평대(국평)</option>
              <option value="40plus">40평대 이상</option>
            </select>
          )}

          {/* Trade Type Dropdown */}
          {setTradeTypeFilter && (
            <select
              value={tradeTypeFilter}
              onChange={(e) => setTradeTypeFilter(e.target.value as TradeTypeFilterType)}
              aria-label="거래 유형 선택"
              data-testid="timeline-tradetype-select"
              className={getControlSelectClass('shrink-0 min-w-0 w-[96px] xs:w-[106px] sm:w-[118px] truncate')}
            >
              <option value="all">전체 유형</option>
              <option value="high">신고가 거래</option>
              <option value="rising">상승 거래</option>
              <option value="falling">하락 거래</option>
            </select>
          )}

          {/* Apt Dropdown */}
          <select
            value={timelineAptFilter}
            onChange={(e) => setTimelineAptFilter(e.target.value)}
            aria-label="단지 선택"
            className={getControlSelectClass('shrink-0 min-w-0 w-[104px] xs:w-[114px] sm:w-[140px] truncate')}
          >
            <option value="전체">전체 단지</option>
            {availableApts.map((apt) => (
              <option key={apt} value={apt}>
                {getDisplayAptName(apt).length > 10 ? getDisplayAptName(apt).substring(0, 10) + "..." : getDisplayAptName(apt)}
              </option>
            ))}
          </select>

          {/* Period Selector (7d / 30d / 90d / 1y) */}
          {setPeriodFilter && (
            <div className={getToggleTrackClass()}>
              {(['7d', '30d', '90d', '1y'] as const).map((p) => {
                const labelMap = { '7d': '7일', '30d': '30일', '90d': '90일', '1y': '1년' };
                const isSelected = periodFilter === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      if (setPeriodFilter) {
                        React.startTransition(() => {
                          setPeriodFilter(p);
                        });
                      }
                    }}
                    aria-label={`조회 기간 ${labelMap[p]}`}
                    data-testid={`period-filter-${p}`}
                    className={getToggleBtnClass({ active: isSelected })}
                  >
                    {labelMap[p]}
                  </button>
                );
              })}
            </div>
          )}

          {/* View Mode Toggle (Card Grid vs Compact List) */}
          {setViewMode && (
            <div className={getToggleTrackClass()}>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                aria-label="카드 뷰 보기"
                title="카드 그리드 뷰"
                className={getToggleBtnClass({
                  active: viewMode === 'card',
                  extraClass: 'px-2.5 sm:px-3',
                })}
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="리스트 뷰 보기"
                title="컴팩트 리스트 뷰"
                className={getToggleBtnClass({
                  active: viewMode === 'list',
                  extraClass: 'px-2.5 sm:px-3',
                })}
              >
                <List size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export interface TimeframeSelectorProps {
  timeframe: "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL";
  setTimeframe: (tf: "3M" | "6M" | "1Y" | "3Y" | "5Y" | "ALL") => void;
}

export const TimeframeSelector = React.memo(function TimeframeSelector({
  timeframe,
  setTimeframe,
}: TimeframeSelectorProps) {
  return (
    <div className={getToggleTrackClass('self-start sm:self-auto mt-1 sm:mt-0')}>
      {(["3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const).map((tf) => (
        <button
          key={tf}
          type="button"
          onClick={() => setTimeframe(tf)}
          aria-pressed={timeframe === tf}
          className={getToggleBtnClass({
            active: timeframe === tf,
            size: 'sm',
          })}
        >
          {tf}
        </button>
      ))}
    </div>
  );
});

export interface FavoriteOrderEditorProps {
  showOrderEditor: boolean;
  setShowOrderEditor: (show: boolean) => void;
  orderEditorRef: React.RefObject<HTMLDivElement | null>;
  favoritesArray: string[];
  draggedIndex: number | null;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
}

export const FavoriteOrderEditor = React.memo(function FavoriteOrderEditor({
  showOrderEditor,
  setShowOrderEditor,
  orderEditorRef,
  favoritesArray,
  draggedIndex,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
}: FavoriteOrderEditorProps) {
  return (
    <div className="relative flex items-center" ref={orderEditorRef}>
      <button
        onClick={() => setShowOrderEditor(!showOrderEditor)}
        title="관심 단지 정렬 순서 편집"
        className="w-9 h-9 flex items-center justify-center bg-elevated hover:bg-[#f2f4f6] dark:bg-slate-800 dark:hover:bg-slate-700 text-secondary hover:text-primary rounded-xl transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-600/20 shrink-0"
      >
        <Settings size={15} />
      </button>

      {showOrderEditor && (
        <div className="absolute right-0 top-[32px] z-[50] w-[260px] max-w-[calc(100vw-32px)] max-h-[320px] overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] text-secondary font-extrabold mb-2 border-b border-border/60 pb-1.5 flex justify-between items-center">
            <span>관심 단지 순서 편집</span>
            <span className="text-[9px] text-tertiary font-normal">드래그하여 순서 변경</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {favoritesArray.map((fav, index) => (
              <div
                key={fav}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex justify-between items-center px-2.5 py-1.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-border/40 rounded-xl cursor-grab active:cursor-grabbing text-[11px] font-bold text-primary select-none transition-colors ${
                  draggedIndex === index ? "opacity-40 border-dashed border-blue-600" : ""
                }`}
              >
                <span className="truncate pr-2">{getDisplayAptName(fav)}</span>
                <GripVertical size={12} className="text-tertiary shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
