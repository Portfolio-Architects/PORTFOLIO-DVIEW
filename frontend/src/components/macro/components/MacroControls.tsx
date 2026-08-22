import React from 'react';
import { Settings, Search, X, LayoutGrid, List, RotateCcw } from 'lucide-react';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';
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
  { id: 'all', label: '전체', icon: '⚡', description: '전체 실거래 내역' },
  { id: 'dongtan1', label: '동탄1', icon: '🏙️', description: '동탄1 신도시 (반송/석우/능동)' },
  { id: 'dongtan2', label: '동탄2', icon: '🌳', description: '동탄2 신도시 (청계/영천/오산/목동 등)' },
  { id: 'high', label: '신고가🔥', icon: '🔥', description: '신고가 갱신 거래' },
  { id: 'pyeong30', label: '30평대 국평', icon: '📐', description: '전용 84㎡ 내외 국민평형' },
  { id: 'billion10', label: '10억 클럽', icon: '💎', description: '10억 원 이상 프리미엄 거래' },
  { id: 'landmark', label: '대장단지', icon: '👑', description: '동탄 핵심 시세 리딩 단지' },
];

export const TIMELINE_SORT_OPTIONS: Array<{
  value: TimelineSortOrder;
  label: string;
}> = [
  { value: 'latest', label: '최신 계약순' },
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
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  sortOrder?: TimelineSortOrder;
  setSortOrder?: (order: TimelineSortOrder) => void;
  viewMode?: TimelineViewMode;
  setViewMode?: (mode: TimelineViewMode) => void;
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
  pyeongFilter: _pyeongFilter = "all",
  setPyeongFilter: _setPyeongFilter,
  tradeTypeFilter: _tradeTypeFilter = "all",
  setTradeTypeFilter: _setTradeTypeFilter,
  quickFilter = "all",
  setQuickFilter,
  searchQuery = "",
  setSearchQuery,
  sortOrder = "latest",
  setSortOrder,
  viewMode = "card",
  setViewMode,
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
    quickFilter !== 'all' ||
    (searchQuery && searchQuery.trim().length > 0) ||
    currentRegion !== 'all' ||
    timelineAptFilter !== '전체';

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* 1. Quick Filter Chips Bar with Smooth Horizontal Scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-0.5 w-full">
        {QUICK_FILTER_CHIPS.map((chip) => {
          const isActive = quickFilter === chip.id;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setQuickFilter?.(chip.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10.5px] xs:text-[11px] font-extrabold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 shadow-2xs ${
                isActive
                  ? "bg-[#ea6100] text-white shadow-xs scale-[1.02] ring-2 ring-[#ea6100]/20"
                  : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-secondary border border-border/70 hover:border-border"
              }`}
              title={chip.description}
            >
              <span className="text-[11px]">{chip.icon}</span>
              <span>{chip.label}</span>
            </button>
          );
        })}

        {/* Reset Button */}
        {isFiltersActive && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] xs:text-[10.5px] font-bold text-tertiary hover:text-rose-500 bg-zinc-50 hover:bg-rose-50 dark:bg-zinc-800 dark:hover:bg-rose-950/30 border border-border/60 hover:border-rose-300 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            title="모든 필터 초기화"
            aria-label="모든 필터 초기화"
          >
            <RotateCcw size={11} />
            <span>초기화</span>
          </button>
        )}
      </div>

      {/* 2. Action Toolbar: Search + Sort + Dropdowns + View Mode Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        {/* Left: Real-Time Inline Search Input */}
        {setSearchQuery && (
          <div className="relative flex items-center flex-1 min-w-[130px] max-w-[240px]">
            <Search size={12} className="absolute left-2.5 text-tertiary pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="단지명 검색..."
              aria-label="단지명 검색"
              className="w-full pl-7 pr-7 h-[28px] bg-zinc-50 dark:bg-zinc-800 border border-border/80 text-primary rounded-xl text-[10px] xs:text-[11px] font-bold placeholder:text-tertiary/70 outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] transition-colors shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-tertiary hover:text-primary transition-colors p-0.5 rounded-full"
                aria-label="검색어 지우기"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}

        {/* Right: Dropdowns + Sort + View Mode Toggle */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 min-w-0 ml-auto">
          {/* Multi-Sort Selector */}
          {setSortOrder && (
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as TimelineSortOrder)}
              aria-label="정렬 기준 선택"
              className="px-1.5 sm:px-2 h-[26px] sm:h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[9.5px] xs:text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-xs shrink-0 min-w-0 w-[84px] xs:w-[96px] sm:w-[108px] truncate"
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
            className="px-1.5 sm:px-2 h-[26px] sm:h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[9.5px] xs:text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-xs shrink-0 min-w-0 w-[82px] xs:w-[94px] sm:w-[124px] truncate"
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

          {/* Apt Dropdown */}
          <select
            value={timelineAptFilter}
            onChange={(e) => setTimelineAptFilter(e.target.value)}
            aria-label="단지 선택"
            className="px-1.5 sm:px-2 h-[26px] sm:h-[28px] bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary rounded-xl text-[9.5px] xs:text-[10px] sm:text-[11px] font-extrabold cursor-pointer transition-colors outline-none focus:ring-1 focus:ring-[#ea6100] focus:border-[#ea6100] shadow-xs shrink-0 min-w-0 w-[84px] xs:w-[96px] sm:w-[130px] truncate"
          >
            <option value="전체">전체 단지</option>
            {availableApts.map((apt) => (
              <option key={apt} value={apt}>
                {getDisplayAptName(apt).length > 10 ? getDisplayAptName(apt).substring(0, 10) + "..." : getDisplayAptName(apt)}
              </option>
            ))}
          </select>

          {/* View Mode Toggle (Card Grid vs Compact List) */}
          {setViewMode && (
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl shrink-0 border border-border/50">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                aria-label="카드 뷰 보기"
                title="카드 그리드 뷰"
                className={`p-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'card'
                    ? "bg-surface text-[#ea6100] shadow-xs font-black"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                <LayoutGrid size={13} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="리스트 뷰 보기"
                title="컴팩트 리스트 뷰"
                className={`p-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? "bg-surface text-[#ea6100] shadow-xs font-black"
                    : "text-tertiary hover:text-secondary"
                }`}
              >
                <List size={13} />
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
    <div className="flex bg-body p-0.5 rounded-lg shadow-inner self-start sm:self-auto shrink-0 mt-1 sm:mt-0">
      {(["3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const).map((tf) => (
        <button
          key={tf}
          onClick={() => setTimeframe(tf)}
          className={`px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[10.5px] font-extrabold rounded-md transition-all duration-200 cursor-pointer ${
            timeframe === tf
              ? "bg-surface text-primary shadow-sm"
              : "text-tertiary hover:text-secondary"
          }`}
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
        className="w-7 h-7 flex items-center justify-center bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-border/80 text-secondary hover:text-primary rounded-xl transition-colors cursor-pointer outline-none focus:ring-1 focus:ring-[#ea6100] shadow-sm shrink-0"
      >
        <Settings size={13} />
      </button>

      {showOrderEditor && (
        <div className="absolute right-0 top-[32px] z-[50] w-[260px] max-w-[calc(100vw-32px)] max-h-[320px] overflow-y-auto bg-surface border border-border rounded-2xl shadow-xl p-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-[11px] text-secondary font-extrabold mb-2 border-b border-border/60 pb-1.5 flex justify-between items-center">
            <span>⭐ 관심 단지 순서 편집</span>
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
                className={`flex justify-between items-center px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-border/40 rounded-xl cursor-grab active:cursor-grabbing text-[11px] font-bold text-primary select-none transition-colors ${
                  draggedIndex === index ? "opacity-40 border-dashed border-[#ea6100]" : ""
                }`}
              >
                <span className="truncate pr-2">{getDisplayAptName(fav)}</span>
                <span className="text-tertiary text-[10px] shrink-0 font-normal">☰</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
