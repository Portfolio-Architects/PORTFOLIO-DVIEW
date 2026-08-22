import React, { useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, RotateCcw, Heart, ExternalLink } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { normalizeAptName, isSameApartment } from '@/lib/utils/apartmentMapping';
import { TimelineFilterControls } from './MacroControls';
import type {
  RegionFilterType,
  PyeongFilterType,
  TradeTypeFilterType,
  QuickFilterChipType,
  TimelineSortOrder,
  TimelineViewMode,
} from '../hooks/useMacroFilters';

export interface HighestPriceAptInfo {
  aptName: string;
  displayAptName?: string;
  priceEok: string;
  priceVal: number;
}

export interface TimelineItem {
  aptName: string;
  dong: string;
  priceEok: string;
  priceVal: number;
  areaPyeong: number;
  area: number;
  floor: number;
  type: string;
  delta: number;
  deltaPercent?: number;
  prevPriceVal?: number;
  areaLabelM2?: string;
  areaLabelPyeong?: string;
  displayAptName?: string;
}

export interface TimelineGroup {
  dateStr: string;
  timestamp: number;
  items: TimelineItem[];
  dateKey?: string;
  totalCount?: number;
  avgPriceVal?: number;
  avgPriceEok?: string;
  highestPriceApt?: HighestPriceAptInfo;
}

export interface MacroTimelineViewProps {
  displayedTimelineData?: TimelineGroup[];
  timelineGroups?: TimelineGroup[];
  selectedTimelineApt?: string | null;
  selectedApt?: string | null;
  nameMapping?: Record<string, string>;
  areaUnit?: string;
  isMobileViewport?: boolean;
  totalTimelineCardsCount?: number;
  visibleTimelineCount?: number;
  setVisibleTimelineCount?: React.Dispatch<React.SetStateAction<number>>;
  onCardHover?: (aptName: string, dong: string) => void;
  onCardClick?: (aptName: string) => void;
  onSelectApt?: (aptName: string) => void;
  onDetailsClick?: (aptName: string) => void;
  onDetailsHover?: (aptName: string, dong: string) => void;
  userFavorites?: Set<string> | string[];
  onToggleFavorite?: (aptName: string) => void;
  timelineDongFilter?: string;
  setTimelineDongFilter?: (dong: string) => void;
  timelineAptFilter?: string;
  setTimelineAptFilter?: (apt: string) => void;
  availableDongs?: string[];
  availableApts?: string[];
  regionFilter?: RegionFilterType;
  setRegionFilter?: (region: RegionFilterType) => void;
  pyeongFilter?: PyeongFilterType;
  setPyeongFilter?: (pyeong: PyeongFilterType) => void;
  tradeTypeFilter?: TradeTypeFilterType;
  setTradeTypeFilter?: (type: TradeTypeFilterType) => void;
  quickFilter?: QuickFilterChipType;
  setQuickFilter?: (chip: QuickFilterChipType) => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  sortOrder?: TimelineSortOrder;
  setSortOrder?: (order: TimelineSortOrder) => void;
  viewMode?: TimelineViewMode;
  setViewMode?: (mode: TimelineViewMode) => void;
  onResetFilters?: () => void;
  renderTimelineItemCard?: (item: TimelineItem, isSelected: boolean) => React.ReactNode;
  renderTimelineItemRow?: (item: TimelineItem, isSelected: boolean) => React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function formatDailyAvgPrice(items: TimelineItem[]): string {
  if (!items || items.length === 0) return '';
  const total = items.reduce((sum, item) => sum + item.priceVal, 0);
  const avg = total / items.length;
  const roundedMan = Math.round(avg * 10000);
  const eok = Math.floor(roundedMan / 10000);
  const man = roundedMan % 10000;
  if (eok === 0) return `${man.toLocaleString()}만`;
  if (man === 0) return `${eok}억`;
  return `${eok}억 ${man.toLocaleString()}만`;
}

function DefaultTimelineCard({
  item,
  isSelected,
  isFavorite,
  onToggleFavorite,
  onCardClick,
  onDetailsClick,
}: {
  item: TimelineItem;
  isSelected: boolean;
  isFavorite: boolean;
  onToggleFavorite?: (aptName: string) => void;
  onCardClick?: (aptName: string) => void;
  onDetailsClick?: (aptName: string) => void;
}) {
  const displayName = item.displayAptName || item.aptName;
  return (
    <div
      data-testid={`timeline-card-${item.aptName}`}
      onClick={() => onCardClick?.(item.aptName)}
      className={`p-3 bg-surface hover:bg-zinc-50 dark:hover:bg-zinc-800/60 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between gap-2 shadow-xs ${
        isSelected
          ? 'border-[#ea6100] ring-2 ring-[#ea6100]/20 bg-orange-50/10'
          : 'border-border/60 hover:border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-extrabold text-primary truncate">{displayName}</span>
            {item.type === 'high' && (
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 text-[9.5px] font-black">
                신고가🔥
              </span>
            )}
          </div>
          <span className="text-[10px] text-tertiary">
            {item.dong} · {item.floor}층 · {item.areaPyeong ? `${item.areaPyeong}평` : `${item.area}㎡`}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleFavorite && (
            <button
              type="button"
              aria-label={`${item.aptName} 관심 단지 등록`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.aptName);
              }}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-tertiary transition-colors"
            >
              <Heart size={14} className={isFavorite ? 'fill-rose-500 text-rose-500' : ''} />
            </button>
          )}
          {onDetailsClick && (
            <button
              type="button"
              aria-label={`${item.aptName} 상세 분석 리포트 보기`}
              onClick={(e) => {
                e.stopPropagation();
                onDetailsClick(item.aptName);
              }}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-tertiary transition-colors"
            >
              <ExternalLink size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-1 border-t border-border/40">
        <span className="text-[13px] font-black text-primary">{item.priceEok}</span>
        {item.delta !== undefined && item.delta !== 0 && (
          <span
            className={`text-[10px] font-extrabold flex items-center gap-0.5 ${
              item.delta > 0
                ? 'text-rose-500'
                : 'text-blue-500'
            }`}
          >
            {item.delta > 0 ? '▲' : '▼'} {Math.abs(item.delta)}억
            {item.deltaPercent ? ` (${item.deltaPercent > 0 ? '+' : ''}${item.deltaPercent}%)` : ''}
          </span>
        )}
      </div>
    </div>
  );
}

function DefaultTimelineRow({
  item,
  isSelected,
  isFavorite,
  onToggleFavorite,
  onCardClick,
  onDetailsClick,
}: {
  item: TimelineItem;
  isSelected: boolean;
  isFavorite: boolean;
  onToggleFavorite?: (aptName: string) => void;
  onCardClick?: (aptName: string) => void;
  onDetailsClick?: (aptName: string) => void;
}) {
  const displayName = item.displayAptName || item.aptName;
  return (
    <div
      data-testid={`timeline-row-${item.aptName}`}
      onClick={() => onCardClick?.(item.aptName)}
      className={`px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors cursor-pointer ${
        isSelected ? 'bg-orange-50/20' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] font-bold text-primary truncate">{displayName}</span>
            {item.type === 'high' && (
              <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 text-[9px] font-black">
                신고가
              </span>
            )}
          </div>
          <span className="text-[9.5px] text-tertiary">
            {item.dong} · {item.floor}층 · {item.areaPyeong ? `${item.areaPyeong}평` : `${item.area}㎡`}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-[12px] font-black text-primary">{item.priceEok}</div>
          {item.delta !== undefined && item.delta !== 0 && (
            <div
              className={`text-[9px] font-extrabold ${
                item.delta > 0 ? 'text-rose-500' : 'text-blue-500'
              }`}
            >
              {item.delta > 0 ? '▲' : '▼'}{Math.abs(item.delta)}억
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5">
          {onToggleFavorite && (
            <button
              type="button"
              aria-label={`${item.aptName} 관심 단지 등록`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(item.aptName);
              }}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-tertiary transition-colors"
            >
              <Heart size={13} className={isFavorite ? 'fill-rose-500 text-rose-500' : ''} />
            </button>
          )}
          {onDetailsClick && (
            <button
              type="button"
              aria-label={`${item.aptName} 상세 분석 리포트 보기`}
              onClick={(e) => {
                e.stopPropagation();
                onDetailsClick(item.aptName);
              }}
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-tertiary transition-colors"
            >
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export const MacroTimelineView = React.memo(function MacroTimelineView({
  displayedTimelineData,
  timelineGroups,
  selectedTimelineApt,
  selectedApt,
  nameMapping,
  isMobileViewport = false,
  totalTimelineCardsCount,
  visibleTimelineCount,
  setVisibleTimelineCount,
  onCardHover: _onCardHover,
  onCardClick,
  onSelectApt,
  onDetailsClick,
  onDetailsHover: _onDetailsHover,
  userFavorites,
  onToggleFavorite,
  timelineDongFilter = '전체',
  setTimelineDongFilter,
  timelineAptFilter = '전체',
  setTimelineAptFilter = () => {},
  availableDongs = [],
  availableApts = [],
  regionFilter = 'all',
  setRegionFilter,
  pyeongFilter = 'all',
  setPyeongFilter,
  tradeTypeFilter = 'all',
  setTradeTypeFilter,
  quickFilter = 'all',
  setQuickFilter,
  searchQuery = '',
  setSearchQuery,
  sortOrder = 'latest',
  setSortOrder,
  viewMode = 'card',
  setViewMode,
  onResetFilters,
  renderTimelineItemCard,
  renderTimelineItemRow,
  isLoading = false,
  emptyMessage,
  className,
}: MacroTimelineViewProps) {
  const effectiveData = displayedTimelineData || timelineGroups || [];
  const effectiveSelectedApt = selectedTimelineApt !== undefined ? selectedTimelineApt : (selectedApt || null);
  const effectiveOnCardClick = onCardClick || onSelectApt;

  const totalCalculatedItems = effectiveData.reduce((acc, g) => acc + (g.items ? g.items.length : 0), 0);
  const effectiveTotalCount = totalTimelineCardsCount ?? totalCalculatedItems;
  const effectiveVisibleCount = visibleTimelineCount ?? effectiveTotalCount;

  const isAptFavorite = (aptName: string): boolean => {
    if (!userFavorites) return false;
    if (userFavorites instanceof Set) return userFavorites.has(aptName);
    if (Array.isArray(userFavorites)) return userFavorites.includes(aptName);
    return false;
  };

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '250px',
  });

  useEffect(() => {
    if (inView && setVisibleTimelineCount && effectiveTotalCount > effectiveVisibleCount) {
      setVisibleTimelineCount((prev) => Math.min(effectiveTotalCount, prev + 20));
    }
  }, [inView, effectiveTotalCount, effectiveVisibleCount, setVisibleTimelineCount]);

  if (isLoading) {
    return (
      <div className={`w-full flex flex-col gap-4 min-w-0 max-w-full box-border ${className || ''}`}>
        <div className="flex flex-col items-center justify-center bg-surface rounded-2xl shadow-xs border border-border px-4 py-16 min-h-[300px]">
          <div className="w-6 h-6 border-2 border-[#ea6100] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-[13px] font-bold text-secondary">최근 실거래 타임라인 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col gap-4 min-w-0 max-w-full box-border ${className || ''}`}>
      {/* Daily Timeline Card Container */}
      <div className="flex flex-col bg-surface rounded-2xl shadow-xs border border-border px-3.5 sm:px-5 py-4 sm:py-5 min-h-[420px] min-w-0 max-w-full overflow-hidden w-full box-border">
        {/* Header & Filter Controls Bar */}
        <div className="flex flex-col gap-3 mb-3.5 sm:mb-4 w-full">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h2 className="text-[14px] xs:text-[15px] sm:text-[18px] font-black text-primary tracking-tight whitespace-nowrap shrink-0">
                일자별 최근 실거래
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] sm:text-[11px] font-extrabold text-secondary">
                {effectiveTotalCount}건
              </span>
            </div>
          </div>

          <TimelineFilterControls
            timelineDongFilter={timelineDongFilter}
            setTimelineDongFilter={setTimelineDongFilter}
            timelineAptFilter={timelineAptFilter}
            setTimelineAptFilter={setTimelineAptFilter}
            availableDongs={availableDongs}
            availableApts={availableApts}
            regionFilter={regionFilter}
            setRegionFilter={setRegionFilter}
            pyeongFilter={pyeongFilter}
            setPyeongFilter={setPyeongFilter}
            tradeTypeFilter={tradeTypeFilter}
            setTradeTypeFilter={setTradeTypeFilter}
            quickFilter={quickFilter}
            setQuickFilter={setQuickFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onResetFilters={onResetFilters}
          />
        </div>

        {/* Scrollable Timeline Stream */}
        <div className={`flex-1 ${isMobileViewport ? "max-h-none overflow-visible" : "max-h-[520px] md:max-h-none overflow-y-auto"} pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full flex flex-col gap-5 mt-1 min-h-0 w-full box-border`}>
          {effectiveData.length === 0 ? (
            <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center text-tertiary text-[13.5px] gap-2 py-8">
              <span className="text-2xl">🔍</span>
              <span className="text-center font-medium">
                {emptyMessage || '선택하신 필터 조건에 부합하는 최근 실거래가 없습니다.'}
              </span>
              <span className="text-[11px] text-tertiary/80 text-center">
                필터 조건을 변경하거나 검색어를 재설정해 보세요.
              </span>
              {onResetFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  aria-label="필터 조건 초기화 필터 초기화"
                  className="mt-2 px-3.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 hover:bg-orange-100 dark:hover:bg-orange-900/40 border border-orange-200/80 dark:border-orange-800/60 text-[#ea6100] text-[12px] font-bold transition-colors cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>필터 조건 초기화</span>
                </button>
              )}
            </div>
          ) : (
            effectiveData.map((group) => {
              const isGroupSelected = group.items.some(item => 
                effectiveSelectedApt ? (
                  effectiveSelectedApt === item.aptName ||
                  normalizeAptName(effectiveSelectedApt) === normalizeAptName(item.aptName) ||
                  isSameApartment(effectiveSelectedApt, item.aptName, nameMapping)
                ) : false
              );

              const avgPriceText = group.avgPriceEok || formatDailyAvgPrice(group.items);

              const highestApt: HighestPriceAptInfo | null = group.highestPriceApt || (
                group.items && group.items.length > 0
                  ? (() => {
                      const top = group.items.reduce((max, cur) => (cur.priceVal > max.priceVal ? cur : max), group.items[0]);
                      return {
                        aptName: top.aptName,
                        displayAptName: top.displayAptName,
                        priceEok: top.priceEok,
                        priceVal: top.priceVal,
                      };
                    })()
                  : null
              );

              return (
                <div key={group.dateStr} className="flex flex-col gap-2.5 relative pl-3.5 sm:pl-4 border-l-2 border-slate-100 dark:border-slate-800/80 w-full box-border">
                  {/* Sticky Date Group Header */}
                  <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-md border-b border-border/40 py-2.5 px-3 -mx-2 rounded-xl flex items-center justify-between shadow-xs transition-colors mb-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 shrink-0 ${
                        isGroupSelected
                          ? "bg-[#ea6100] ring-4 ring-[#ea6100]/20 scale-110"
                          : "bg-slate-300 dark:bg-slate-600"
                      }`} />
                      <h3 className="text-[12.5px] xs:text-[13.5px] font-black text-primary flex items-center gap-1.5 truncate">
                        <Calendar size={13.5} className="text-[#ea6100] shrink-0" />
                        {group.dateStr}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {highestApt && (
                        <span
                          data-testid={`highest-price-badge-${group.dateStr}`}
                          className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 text-[10px] xs:text-[10.5px] font-black flex items-center gap-1 shadow-xs"
                        >
                          <span>👑 최고가:</span>
                          <span className="max-w-[100px] xs:max-w-[140px] truncate">{highestApt.displayAptName || highestApt.aptName}</span>
                          <span>{highestApt.priceEok}</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-secondary text-[10px] xs:text-[10.5px] font-extrabold">
                        총 {group.items.length}건 거래
                      </span>
                      {avgPriceText && (
                        <span className="px-2 py-0.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#c44d00] dark:text-[#ea7f44] text-[10px] xs:text-[10.5px] font-black hidden xs:inline-block">
                          평균 {avgPriceText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items List (Dual View Mode: Card Grid vs Compact List) */}
                  {viewMode === 'list' ? (
                    <div className="flex flex-col divide-y divide-border/40 bg-surface rounded-xl border border-border/60 overflow-hidden shadow-xs w-full">
                      {group.items.map((item, idx) => {
                        const isSelected = !!effectiveSelectedApt && (
                          effectiveSelectedApt === item.aptName ||
                          normalizeAptName(effectiveSelectedApt) === normalizeAptName(item.aptName) ||
                          isSameApartment(effectiveSelectedApt, item.aptName, nameMapping)
                        );
                        return (
                          <React.Fragment key={`${item.aptName}-${item.floor}-${item.priceVal}-${idx}`}>
                            {renderTimelineItemRow
                              ? renderTimelineItemRow(item, isSelected)
                              : renderTimelineItemCard
                              ? renderTimelineItemCard(item, isSelected)
                              : (
                                <DefaultTimelineRow
                                  item={item}
                                  isSelected={isSelected}
                                  isFavorite={isAptFavorite(item.aptName)}
                                  onToggleFavorite={onToggleFavorite}
                                  onCardClick={effectiveOnCardClick}
                                  onDetailsClick={onDetailsClick}
                                />
                              )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full box-border">
                      {group.items.map((item, idx) => {
                        const isSelected = !!effectiveSelectedApt && (
                          effectiveSelectedApt === item.aptName ||
                          normalizeAptName(effectiveSelectedApt) === normalizeAptName(item.aptName) ||
                          isSameApartment(effectiveSelectedApt, item.aptName, nameMapping)
                        );
                        return (
                          <React.Fragment key={`${item.aptName}-${item.floor}-${item.priceVal}-${idx}`}>
                            {renderTimelineItemCard ? (
                              renderTimelineItemCard(item, isSelected)
                            ) : (
                              <DefaultTimelineCard
                                item={item}
                                isSelected={isSelected}
                                isFavorite={isAptFavorite(item.aptName)}
                                onToggleFavorite={onToggleFavorite}
                                onCardClick={effectiveOnCardClick}
                                onDetailsClick={onDetailsClick}
                              />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Infinite Scroll Sentinel & Fallback Load More */}
          {setVisibleTimelineCount && effectiveTotalCount > effectiveVisibleCount && (
            <div ref={sentinelRef} className="w-full py-3 flex flex-col items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setVisibleTimelineCount((prev) => Math.min(effectiveTotalCount, prev + 20))}
                className="w-full py-2.5 bg-body hover:bg-body/80 border border-border/40 text-[12px] xs:text-[12.5px] font-bold text-secondary rounded-[12px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <span>최근 실거래 더보기 (+20개 / 남은 {effectiveTotalCount - effectiveVisibleCount}개)</span>
                <ChevronDown size={14} />
              </button>
            </div>
          )}

          {setVisibleTimelineCount && effectiveTotalCount > 3 && effectiveTotalCount <= effectiveVisibleCount && (
            <div className="w-full py-2 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setVisibleTimelineCount(isMobileViewport ? 3 : 8)}
                className="px-4 py-1.5 bg-body hover:bg-body/80 border border-border/40 text-[11px] font-bold text-tertiary hover:text-secondary rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>처음으로 접기</span>
                <ChevronUp size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
