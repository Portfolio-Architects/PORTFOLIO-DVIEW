import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Plus, Search, Star, X } from 'lucide-react';
import Link from 'next/link';
import { useFavorites, isApartmentInFavorites } from '@/hooks/useFavorites';
import { trackEvent } from '@/lib/utils/analytics';
import { useInView } from 'react-intersection-observer';
import { normalizeAptName, isSameApartment, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { filterAndRankApartments } from '@/lib/utils/apartmentSearch';
import { getRecentApartments } from '@/lib/utils/recentApartments';
import { buildInitialApartments, type DongApartment } from '@/lib/dong-apartments';
import { TimelineFilterControls } from './MacroControls';
import {
  getToggleTrackClass,
  getToggleBtnClass,
  getControlPillClass,
} from '@/lib/design-system/controls';
import { HyperlocalInsightCards } from '@/components/stats/HyperlocalInsightCards';
import { StatsPyeongRankingChart } from '@/components/stats/StatsPyeongRankingChart';
import { AdSlot } from '@/components/ads/AdSlot';
import type { ComplexStatItem, HyperlocalInsightCardsData } from '@/types/stats';
import type { TimelinePeriod } from '@/types/transaction';
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
  contractDate?: string;
  date?: string;
  isNewHigh?: boolean;
  registeredDate?: string;
  registeredDateLabel?: string;
}

export interface TimelineGroup {
  dateStr: string;
  timestamp: number;
  items: TimelineItem[];
  date?: string;
  dateLabel?: string;
  dateKey?: string;
  year?: number;
  totalCount?: number;
  avgPriceVal?: number;
  avgPriceEok?: string;
  highestPriceApt?: HighestPriceAptInfo;
}

export function getGroupYear(g: TimelineGroup): number | null {
  if (typeof g.year === 'number' && !isNaN(g.year)) return g.year;
  if (g.dateStr) {
    const m = g.dateStr.match(/^(\d{4})/);
    if (m) return parseInt(m[1], 10);
  }
  if (g.dateKey) {
    const m = g.dateKey.match(/^(\d{4})/);
    if (m) return parseInt(m[1], 10);
  }
  if (typeof g.timestamp === 'number' && !isNaN(g.timestamp) && g.timestamp > 0) {
    const d = new Date(g.timestamp);
    if (!isNaN(d.getTime())) return d.getFullYear();
  }
  return null;
}

export interface TimelineAggregateMetrics {
  isValid: boolean;
  totalItems: number;
  avgPriceEokVal: number;
  maxPriceEokVal: number;
  minPriceEokVal: number;
  avgPyeongPriceMan: number;
  newHighCount: number;
  newHighRatio: number;
  risingCount: number;
  risingRatio: number;
  estimatedLtv70Eok: number;
  estimatedEquityEok: number;
  estimatedMonthlyPaymentMan: number;
}

export function computeTimelineAggregateMetrics(groups: TimelineGroup[] | null | undefined): TimelineAggregateMetrics {
  const emptyResult: TimelineAggregateMetrics = {
    isValid: false,
    totalItems: 0,
    avgPriceEokVal: 0,
    maxPriceEokVal: 0,
    minPriceEokVal: 0,
    avgPyeongPriceMan: 0,
    newHighCount: 0,
    newHighRatio: 0,
    risingCount: 0,
    risingRatio: 0,
    estimatedLtv70Eok: 0,
    estimatedEquityEok: 0,
    estimatedMonthlyPaymentMan: 0,
  };

  if (!groups || !Array.isArray(groups) || groups.length === 0) {
    return emptyResult;
  }

  let totalItems = 0;
  let priceSum = 0;
  let maxPrice = -Infinity;
  let minPrice = Infinity;
  let pyeongPriceSum = 0;
  let pyeongValidCount = 0;
  let newHighCount = 0;
  let risingCount = 0;

  for (const g of groups) {
    if (!g || !Array.isArray(g.items)) continue;
    for (const item of g.items) {
      if (!item) continue;
      if (typeof item.priceVal !== 'number' || isNaN(item.priceVal) || !isFinite(item.priceVal) || item.priceVal <= 0) {
        continue;
      }
      const pVal = item.priceVal;
      totalItems++;
      priceSum += pVal;
      if (pVal > maxPrice) maxPrice = pVal;
      if (pVal < minPrice) minPrice = pVal;

      const pyeong = item.areaPyeong && item.areaPyeong > 0
        ? item.areaPyeong
        : (item.area && item.area > 0 ? item.area / 3.3058 : 0);
      if (pyeong > 0 && pVal > 0) {
        pyeongPriceSum += (pVal * 10000) / pyeong;
        pyeongValidCount++;
      }

      if (item.type === 'high' || item.isNewHigh) {
        newHighCount++;
      }
      if (typeof item.delta === 'number' && !isNaN(item.delta) && item.delta > 0) {
        risingCount++;
      }
    }
  }

  if (totalItems === 0) {
    return emptyResult;
  }

  const avgRaw = priceSum / totalItems;
  const avgPriceEokVal = Math.round(avgRaw * 100) / 100;
  const maxPriceEokVal = maxPrice === -Infinity ? 0 : Math.round(maxPrice * 100) / 100;
  const minPriceEokVal = minPrice === Infinity ? 0 : Math.round(minPrice * 100) / 100;
  const avgPyeongPriceMan = pyeongValidCount > 0 ? Math.round(pyeongPriceSum / pyeongValidCount) : 0;
  const newHighRatio = Math.round((newHighCount / totalItems) * 100);
  const risingRatio = Math.round((risingCount / totalItems) * 100);

  // LTV 70% & 30-Year 3.85% Annual Equal Principal+Interest Simulation
  const estimatedLtv70Eok = Math.round(avgRaw * 0.7 * 10) / 10;
  const estimatedEquityEok = Math.max(0, Math.round((avgRaw - estimatedLtv70Eok) * 10) / 10);
  const loanPrincipalMan = estimatedLtv70Eok * 10000;
  const monthlyRate = 0.0385 / 12;
  const months = 360;
  const factor = Math.pow(1 + monthlyRate, months);
  const estimatedMonthlyPaymentMan = loanPrincipalMan > 0
    ? Math.round((loanPrincipalMan * monthlyRate * factor) / (factor - 1))
    : 0;

  return {
    isValid: true,
    totalItems,
    avgPriceEokVal,
    maxPriceEokVal,
    minPriceEokVal,
    avgPyeongPriceMan,
    newHighCount,
    newHighRatio,
    risingCount,
    risingRatio,
    estimatedLtv70Eok,
    estimatedEquityEok,
    estimatedMonthlyPaymentMan,
  };
}

export function formatShortDateLabel(dateStr: string): string {
  if (!dateStr) return '';
  const dotMatch = dateStr.match(/(?:\d{4}\.)?(\d{1,2})\.(\d{1,2})/);
  if (dotMatch) {
    return `${dotMatch[1].padStart(2, '0')}.${dotMatch[2].padStart(2, '0')}`;
  }
  const korMatch = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (korMatch) {
    return `${korMatch[1]}/${korMatch[2]}`;
  }
  return dateStr.slice(0, 6).trim();
}

export interface MacroTimelineViewProps {
  displayedTimelineData?: TimelineGroup[];
  timelineGroups?: TimelineGroup[];
  fullTimelineData?: TimelineGroup[];
  selectedTimelineApt?: string | null;
  selectedApt?: string | null;
  nameMapping?: Record<string, string>;
  areaUnit?: string;
  isMobileViewport?: boolean;
  totalTimelineCardsCount?: number;
  visibleTimelineCount?: number;
  setVisibleTimelineCount?: React.Dispatch<React.SetStateAction<number>>;
  enableInfiniteScroll?: boolean;
  onCardHover?: (aptName: string, dong: string) => void;
  onCardClick?: (aptName: string) => void;
  onSelectApt?: (aptName: string) => void;
  onDetailsClick?: (aptName: string) => void;
  onDetailsHover?: (aptName: string, dong: string) => void;
  onOpenMortgage?: (aptName?: string) => void;
  onOpenJeonseSafety?: (aptName?: string) => void;
  onOpenSellTimingCalculator?: (aptName?: string) => void;
  onOpenTaxCalculator?: (aptName?: string) => void;
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
  periodFilter?: TimelinePeriod;
  setPeriodFilter?: (period: TimelinePeriod) => void;
  onResetFilters?: () => void;
  renderTimelineItemCard?: (item: TimelineItem, isSelected: boolean) => React.ReactNode;
  renderTimelineItemRow?: (item: TimelineItem, isSelected: boolean) => React.ReactNode;
  isLoading?: boolean;
  emptyMessage?: string;
  showHighestPriceBadge?: boolean;
  showQuickFilters?: boolean;
  insights?: HyperlocalInsightCardsData;
  pyeongRankings?: ComplexStatItem[];
  onSelectComplex?: (aptKey: string, aptName: string) => void;
  onOpenCompare?: (aptName?: string) => void;
  userFavorites?: Set<string>;
  onToggleFavorite?: (aptName: string) => void;
  sheetApartments?: Record<string, DongApartment[]>;
  timelineSegment?: 'all' | 'favorites' | 'new_high' | 'ranking';
  setTimelineSegment?: (segment: 'all' | 'favorites' | 'new_high' | 'ranking') => void;
  liveRankingBoardNode?: React.ReactNode;
  enableInFeedAd?: boolean;
  inFeedAdSlotId?: string;
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

export function formatDeltaPercent(val: number | undefined): string {
  if (typeof val !== 'number' || isNaN(val) || !isFinite(val) || val === 0) return '';
  const rounded = Math.round(val * 10) / 10;
  if (rounded === 0) return '';
  return ` (${rounded > 0 ? '+' : ''}${rounded}%)`;
}

function DefaultTimelineCard({
  item,
  isSelected,
  onCardClick,
  onDetailsClick,
  onMortgageClick,
  isFavorite,
  onToggleFavorite,
}: {
  item: TimelineItem;
  isSelected: boolean;
  onCardClick?: (aptName: string) => void;
  onDetailsClick?: (aptName: string) => void;
  onMortgageClick?: (aptName: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (aptName: string) => void;
}) {
  const displayName = item.displayAptName || item.aptName;
  return (
    <div
      data-testid={`timeline-card-${item.aptName}`}
      onClick={() => onCardClick?.(item.aptName)}
      className={`p-3.5 bg-elevated hover:bg-slate-100/90 dark:hover:bg-slate-800/80 rounded-2xl transition-all cursor-pointer relative group flex flex-col justify-between gap-2 ${
        isSelected
          ? 'ring-2 ring-blue-600/30 bg-blue-50/70 dark:bg-blue-950/30'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-extrabold text-primary truncate">{displayName}</span>
            {item.type === 'high' && (
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 text-[9.5px] font-black">
                신고가
              </span>
            )}
          </div>
          <span className="text-[10px] text-tertiary">
            {item.dong} · {item.floor}층 · {item.areaPyeong ? `${item.areaPyeong}평` : `${item.area}㎡`}
            {(() => {
              const cDate = item.contractDate || item.date;
              if (!cDate) return null;
              const clean = cDate.replace(/[-.]/g, '');
              const mm = clean.length >= 6 ? clean.substring(4, 6) : '';
              const dd = clean.length >= 8 ? clean.substring(6, 8) : '';
              return mm && dd ? ` · 계약일 ${mm}.${dd}` : null;
            })()}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleFavorite && (
            <button
              type="button"
              data-testid={`timeline-fav-toggle-${item.aptName}`}
              aria-label={`${item.aptName} ${isFavorite ? '찜 해제' : '찜하기'}`}
              onClick={(e) => {
                e.stopPropagation();
                const willBeFav = !isFavorite;
                trackEvent('watchlist_toggle_favorite', {
                  apt_name: item.aptName,
                  is_favorite: willBeFav,
                  source: 'timeline',
                });
                onToggleFavorite(item.aptName);
              }}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-tertiary transition-colors"
            >
              <Star
                size={13}
                className={
                  isFavorite
                    ? 'fill-blue-500 text-blue-600'
                    : 'text-tertiary hover:text-blue-500'
                }
              />
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
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-tertiary transition-colors"
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
                ? 'text-red-500'
                : 'text-blue-500'
            }`}
          >
            {item.delta > 0 ? '+' : '-'} {Math.abs(item.delta)}억
            {formatDeltaPercent(item.deltaPercent)}
          </span>
        )}
      </div>
    </div>
  );
}

function DefaultTimelineRow({
  item,
  isSelected,
  onCardClick,
  onDetailsClick,
  onMortgageClick,
  isFavorite,
  onToggleFavorite,
}: {
  item: TimelineItem;
  isSelected: boolean;
  onCardClick?: (aptName: string) => void;
  onDetailsClick?: (aptName: string) => void;
  onMortgageClick?: (aptName: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (aptName: string) => void;
}) {
  const displayName = item.displayAptName || item.aptName;
  return (
    <div
      data-testid={`timeline-row-${item.aptName}`}
      onClick={() => onCardClick?.(item.aptName)}
      className={`px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
        isSelected ? 'bg-blue-50/60' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] font-bold text-primary truncate">{displayName}</span>
            {item.type === 'high' && (
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 text-[9px] font-black">
                신고가
              </span>
            )}
          </div>
          <span className="text-[9.5px] text-tertiary">
            {item.dong} · {item.floor}층 · {item.areaPyeong ? `${item.areaPyeong}평` : `${item.area}㎡`}
            {(() => {
              const cDate = item.contractDate || item.date;
              if (!cDate) return null;
              const clean = cDate.replace(/[-.]/g, '');
              const mm = clean.length >= 6 ? clean.substring(4, 6) : '';
              const dd = clean.length >= 8 ? clean.substring(6, 8) : '';
              return mm && dd ? ` · 계약일 ${mm}.${dd}` : null;
            })()}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <div className="text-[12px] font-black text-primary">{item.priceEok}</div>
          {item.delta !== undefined && item.delta !== 0 && (
            <div
              className={`text-[9px] font-extrabold ${
                item.delta > 0 ? 'text-red-500' : 'text-blue-500'
              }`}
            >
              {item.delta > 0 ? '+' : '-'}{Math.abs(item.delta)}억
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          {onToggleFavorite && (
            <button
              type="button"
              data-testid={`timeline-fav-toggle-${item.aptName}`}
              aria-label={`${item.aptName} ${isFavorite ? '찜 해제' : '찜하기'}`}
              onClick={(e) => {
                e.stopPropagation();
                const willBeFav = !isFavorite;
                trackEvent('watchlist_toggle_favorite', {
                  apt_name: item.aptName,
                  is_favorite: willBeFav,
                  source: 'timeline',
                });
                onToggleFavorite(item.aptName);
              }}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-tertiary transition-colors"
            >
              <Star
                size={12}
                className={
                  isFavorite
                    ? 'fill-blue-500 text-blue-600'
                    : 'text-tertiary hover:text-blue-500'
                }
              />
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
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-tertiary transition-colors"
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
  fullTimelineData,
  selectedTimelineApt,
  selectedApt,
  nameMapping,
  isMobileViewport = false,
  totalTimelineCardsCount,
  visibleTimelineCount,
  setVisibleTimelineCount,
  enableInfiniteScroll = false,
  onCardHover: _onCardHover,
  onCardClick,
  onSelectApt,
  onDetailsClick,
  onDetailsHover: _onDetailsHover,
  onOpenMortgage,
  onOpenJeonseSafety,
  onOpenSellTimingCalculator,
  onOpenTaxCalculator,
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
  periodFilter = '90d',
  setPeriodFilter,
  onResetFilters,
  renderTimelineItemCard,
  renderTimelineItemRow,
  isLoading = false,
  emptyMessage,
  showHighestPriceBadge = false,
  showQuickFilters = false,
  insights,
  pyeongRankings,
  onSelectComplex,
  onOpenCompare,
  userFavorites: propUserFavorites,
  onToggleFavorite: propToggleFavorite,
  sheetApartments,
  timelineSegment,
  setTimelineSegment,
  liveRankingBoardNode,
  enableInFeedAd = false,
  inFeedAdSlotId = '1000000003',
  className,
}: MacroTimelineViewProps) {
  const fallbackFavoritesHook = useFavorites();
  const effectiveUserFavorites = propUserFavorites !== undefined ? propUserFavorites : fallbackFavoritesHook.userFavorites;
  const effectiveToggleFavorite = propToggleFavorite || fallbackFavoritesHook.handleToggleFavorite;

  const [localSegment, setLocalSegment] = useState<'all' | 'favorites' | 'new_high' | 'ranking'>('all');
  const activeSegment = timelineSegment !== undefined ? timelineSegment : localSegment;
  const [activeSectionTab, setActiveSectionTab] = useState<'timeline' | 'live_ranking' | 'ranking'>('timeline');

  const setActiveSegment = useCallback((segment: 'all' | 'favorites' | 'new_high' | 'ranking') => {
    trackEvent('timeline_segment_tab_click', { segment });
    if (setTimelineSegment) {
      setTimelineSegment(segment);
    } else {
      setLocalSegment(segment);
    }
    if (segment === 'ranking') {
      setActiveSectionTab('ranking');
    } else {
      setActiveSectionTab('timeline');
    }
  }, [setTimelineSegment]);

  const effectiveData = displayedTimelineData || timelineGroups || [];
  const fullSourceData = fullTimelineData && fullTimelineData.length > 0 ? fullTimelineData : effectiveData;
  const effectiveSelectedApt = selectedTimelineApt !== undefined ? selectedTimelineApt : (selectedApt || null);
  const effectiveOnCardClick = onCardClick || onSelectApt;
  const effectiveTaxHandler = onOpenSellTimingCalculator || onOpenTaxCalculator;

  const isFavoritesSegment = activeSegment === 'favorites';
  const isNewHighSegment = activeSegment === 'new_high';

  const [favAddQuery, setFavAddQuery] = useState('');

  const favoriteSearchCatalog = useMemo(() => {
    const source =
      sheetApartments && Object.keys(sheetApartments).length > 0
        ? sheetApartments
        : buildInitialApartments();
    const list: { name: string; displayName: string; dong: string; txKey?: string }[] = [];
    const seen = new Set<string>();

    Object.entries(source).forEach(([dongKey, apts]) => {
      apts.forEach((a) => {
        const norm = normalizeAptName(a.name);
        if (norm && !seen.has(norm)) {
          seen.add(norm);
          list.push({
            name: a.name,
            displayName: getDisplayAptName(a.name),
            dong: a.dong || dongKey,
            txKey: a.txKey,
          });
        }
      });
    });

    availableApts.forEach((aptName) => {
      if (!aptName || aptName === '전체') return;
      const norm = normalizeAptName(aptName);
      if (norm && !seen.has(norm)) {
        seen.add(norm);
        list.push({
          name: aptName,
          displayName: getDisplayAptName(aptName),
          dong: '동탄',
        });
      }
    });

    fullSourceData.forEach((g) => {
      g.items.forEach((it) => {
        const norm = normalizeAptName(it.aptName);
        if (norm && !seen.has(norm)) {
          seen.add(norm);
          list.push({
            name: it.aptName,
            displayName: it.displayAptName || getDisplayAptName(it.aptName),
            dong: it.dong || '동탄',
          });
        }
      });
    });

    return list;
  }, [sheetApartments, availableApts, fullSourceData]);

  const trimmedFavAddQuery = favAddQuery.trim();

  const favSearchMatches = useMemo(() => {
    if (!trimmedFavAddQuery) return [];
    return filterAndRankApartments(favoriteSearchCatalog, trimmedFavAddQuery).slice(0, 6);
  }, [favoriteSearchCatalog, trimmedFavAddQuery]);

  const favQuickSuggestions = useMemo(() => {
    if (!isFavoritesSegment) return [];
    const suggestions: { name: string; displayName: string; dong: string }[] = [];
    const seen = new Set<string>();
    const catalogByNorm = new Map(
      favoriteSearchCatalog.map((c) => [normalizeAptName(c.name), c])
    );

    const tryPush = (candidateName: string, fallbackDong = '동탄') => {
      if (!candidateName || suggestions.length >= 4) return;
      const norm = normalizeAptName(candidateName);
      if (!norm || seen.has(norm)) return;
      if (isApartmentInFavorites(effectiveUserFavorites, candidateName, nameMapping)) return;
      seen.add(norm);
      const catalogHit = catalogByNorm.get(norm);
      suggestions.push({
        name: catalogHit ? catalogHit.name : candidateName,
        displayName: catalogHit ? catalogHit.displayName : getDisplayAptName(candidateName),
        dong: catalogHit ? catalogHit.dong : fallbackDong,
      });
    };

    getRecentApartments().forEach((r) => tryPush(r.name, r.dong || '동탄'));
    for (const g of fullSourceData) {
      for (const it of g.items) {
        if (suggestions.length >= 4) break;
        tryPush(it.aptName, it.dong || '동탄');
      }
      if (suggestions.length >= 4) break;
    }
    for (const c of favoriteSearchCatalog) {
      if (suggestions.length >= 4) break;
      tryPush(c.name, c.dong);
    }

    return suggestions;
  }, [isFavoritesSegment, favoriteSearchCatalog, effectiveUserFavorites, nameMapping, fullSourceData]);

  const handleQuickToggleFavorite = useCallback(
    (aptName: string, source: string) => {
      const willBeFav = !isApartmentInFavorites(effectiveUserFavorites, aptName, nameMapping);
      trackEvent('watchlist_toggle_favorite', {
        apt_name: aptName,
        is_favorite: willBeFav,
        source,
      });
      effectiveToggleFavorite(aptName);
      if (willBeFav) {
        setFavAddQuery('');
      }
    },
    [effectiveUserFavorites, nameMapping, effectiveToggleFavorite]
  );

  const filterItemBySegment = useCallback((item: TimelineItem) => {
    if (isFavoritesSegment) {
      return isApartmentInFavorites(effectiveUserFavorites, item.aptName, nameMapping);
    }
    if (isNewHighSegment) {
      return item.type === 'high' || !!item.isNewHigh;
    }
    return true;
  }, [isFavoritesSegment, isNewHighSegment, effectiveUserFavorites, nameMapping]);

  const segmentedSourceData = useMemo(() => {
    if (activeSegment !== 'favorites' && activeSegment !== 'new_high') {
      return fullSourceData;
    }
    return fullSourceData
      .map((g) => ({
        ...g,
        items: g.items.filter(filterItemBySegment),
      }))
      .filter((g) => g.items.length > 0);
  }, [fullSourceData, activeSegment, filterItemBySegment]);

  const segmentedEffectiveData = useMemo(() => {
    if (activeSegment !== 'favorites' && activeSegment !== 'new_high') {
      return effectiveData;
    }
    return effectiveData
      .map((g) => ({
        ...g,
        items: g.items.filter(filterItemBySegment),
      }))
      .filter((g) => g.items.length > 0);
  }, [effectiveData, activeSegment, filterItemBySegment]);

  const handleComplexSelect = useCallback(
    (aptKey: string, aptName: string) => {
      if (onSelectComplex) {
        onSelectComplex(aptKey, aptName);
      } else if (onDetailsClick) {
        onDetailsClick(aptName);
      } else if (effectiveOnCardClick) {
        effectiveOnCardClick(aptName);
      }
    },
    [onSelectComplex, onDetailsClick, effectiveOnCardClick]
  );

  const totalCalculatedItems = segmentedSourceData.reduce((acc, g) => acc + (g.items ? g.items.length : 0), 0);
  const effectiveTotalCount = (activeSegment === 'favorites' || activeSegment === 'new_high')
    ? totalCalculatedItems
    : (totalTimelineCardsCount ?? totalCalculatedItems);
  const effectiveVisibleCount = visibleTimelineCount ?? effectiveTotalCount;

  // Quick Date Jump Filter State (null = show all dates)
  const [selectedDateJump, setSelectedDateJump] = useState<string | null>(null);

  // Reset date jump selection when upstream filters change
  useEffect(() => {
    setSelectedDateJump(null);
  }, [
    quickFilter,
    searchQuery,
    regionFilter,
    timelineDongFilter,
    timelineAptFilter,
    pyeongFilter,
    tradeTypeFilter,
    periodFilter,
    activeSegment,
  ]);

  const renderedGroups = useMemo(() => {
    if (!selectedDateJump) return segmentedEffectiveData;
    const matched = segmentedSourceData.filter((g) => g.dateStr === selectedDateJump);
    return matched.length > 0 ? matched : segmentedEffectiveData;
  }, [segmentedEffectiveData, segmentedSourceData, selectedDateJump]);

  const metricsSourceGroups = useMemo(() => {
    if (selectedDateJump) {
      const matched = segmentedSourceData.filter((g) => g.dateStr === selectedDateJump);
      if (matched.length > 0) return matched;
    }
    return segmentedSourceData;
  }, [segmentedSourceData, selectedDateJump]);

  const aggregateMetrics = useMemo(
    () => computeTimelineAggregateMetrics(metricsSourceGroups),
    [metricsSourceGroups]
  );

  const distinctYears = useMemo(() => {
    const years = new Set<number>();
    for (const g of renderedGroups) {
      const y = getGroupYear(g);
      if (y !== null) years.add(y);
    }
    return Array.from(years);
  }, [renderedGroups]);

  // Date Accordion Collapse State (Set of dateStr that are collapsed)
  const [collapsedDates, setCollapsedDates] = useState<Set<string>>(new Set());

  const allDates = useMemo(() => renderedGroups.map((g) => g.dateStr), [renderedGroups]);
  const isAllCollapsed = allDates.length > 0 && allDates.every((date) => collapsedDates.has(date));

  const toggleDateCollapse = useCallback((dateStr: string) => {
    setCollapsedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  }, []);

  const toggleAllCollapse = useCallback(() => {
    setCollapsedDates((prev) => {
      if (allDates.every((d) => prev.has(d))) {
        // Expand all
        return new Set();
      } else {
        // Collapse all
        return new Set(allDates);
      }
    });
  }, [allDates]);

  const handleDateJumpClick = useCallback((dateStr: string) => {
    setSelectedDateJump((prev) => (prev === dateStr ? null : dateStr));
    setCollapsedDates((prev) => {
      if (!prev.has(dateStr)) return prev;
      const next = new Set(prev);
      next.delete(dateStr);
      return next;
    });
  }, []);

  const handleFinanceAction = useCallback(
    (type: 'mortgage' | 'jeonse' | 'tax') => {
      const targetApt = effectiveSelectedApt || undefined;
      if (type === 'mortgage' && onOpenMortgage) {
        onOpenMortgage(targetApt);
        return;
      }
      if (type === 'jeonse' && onOpenJeonseSafety) {
        onOpenJeonseSafety(targetApt);
        return;
      }
      if (type === 'tax' && effectiveTaxHandler) {
        effectiveTaxHandler(targetApt);
        return;
      }
      if (typeof document !== 'undefined') {
        const financeEl = document.querySelector('[data-testid="high-cpc-finance-section"]');
        if (financeEl && typeof financeEl.scrollIntoView === 'function') {
          financeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    [effectiveSelectedApt, onOpenMortgage, onOpenJeonseSafety, effectiveTaxHandler]
  );

  // If user selects an apartment, auto-uncollapse that date group so the card is visible
  useEffect(() => {
    if (!effectiveSelectedApt) return;
    const targetGroup = renderedGroups.find((g) =>
      g.items.some((item) =>
        effectiveSelectedApt === item.aptName ||
        normalizeAptName(effectiveSelectedApt) === normalizeAptName(item.aptName) ||
        isSameApartment(effectiveSelectedApt, item.aptName, nameMapping)
      )
    );
    if (targetGroup && collapsedDates.has(targetGroup.dateStr)) {
      setCollapsedDates((prev) => {
        const next = new Set(prev);
        next.delete(targetGroup.dateStr);
        return next;
      });
    }
  }, [effectiveSelectedApt, renderedGroups, nameMapping, collapsedDates]);

  const { ref: sentinelRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '250px',
  });

  // Only auto-trigger when explicitly enabled (preventing unwanted infinite scroll jumps)
  useEffect(() => {
    if (enableInfiniteScroll && inView && setVisibleTimelineCount && effectiveTotalCount > effectiveVisibleCount) {
      setVisibleTimelineCount((prev) => Math.min(effectiveTotalCount, prev + 20));
    }
  }, [enableInfiniteScroll, inView, effectiveTotalCount, effectiveVisibleCount, setVisibleTimelineCount]);

  if (isLoading) {
    return (
      <div className={`w-full flex flex-col gap-4 min-w-0 max-w-full box-border ${className || ''}`}>
        <div className="flex flex-col items-center justify-center bg-surface rounded-2xl shadow-xs border border-border px-4 py-16 min-h-[300px]">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-[13px] font-bold text-secondary">최근 실거래 타임라인 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col gap-4 min-w-0 max-w-full box-border ${className || ''}`}>
      {/* Daily Timeline Card Container */}
      <div className="flex flex-col bg-surface py-4 sm:py-5 border-b border-border min-h-[420px] min-w-0 max-w-full overflow-hidden w-full box-border">
        {/* Header & Filter Controls Bar */}
        <div className="flex flex-col gap-3.5 mb-4 sm:mb-5 w-full">
          {/* Top 4-Segment Tabs & /stats Navigation Bar */}
          <div
            data-testid="timeline-segment-tabs"
            className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/60 w-full"
          >
            <div className={getToggleTrackClass('flex-wrap sm:inline-flex w-full sm:w-auto')}>
              <button
                type="button"
                data-testid="timeline-segment-all"
                aria-selected={activeSegment === 'all'}
                onClick={() => setActiveSegment('all')}
                className={getToggleBtnClass({
                  active: activeSegment === 'all',
                  tone: 'blue',
                  size: 'sm',
                  extraClass: 'tabular-nums',
                })}
              >
                <span>전체 실거래</span>
              </button>
              <button
                type="button"
                data-testid="timeline-segment-favorites"
                aria-selected={activeSegment === 'favorites'}
                onClick={() => setActiveSegment('favorites')}
                className={getToggleBtnClass({
                  active: activeSegment === 'favorites',
                  tone: 'neutral',
                  size: 'sm',
                  extraClass: 'tabular-nums flex items-center gap-1 text-blue-600 dark:text-blue-400',
                })}
              >
                <span>내 관심단지</span>
                <span className="px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[10px] font-black">
                  {effectiveUserFavorites.size}
                </span>
              </button>
              <button
                type="button"
                data-testid="timeline-segment-new-high"
                aria-selected={activeSegment === 'new_high'}
                onClick={() => setActiveSegment('new_high')}
                className={getToggleBtnClass({
                  active: activeSegment === 'new_high',
                  tone: 'neutral',
                  size: 'sm',
                  extraClass: 'tabular-nums text-red-600 dark:text-red-400',
                })}
              >
                <span>신고가 경신만</span>
              </button>
              {pyeongRankings !== undefined && (
                <button
                  type="button"
                  data-testid="timeline-segment-ranking"
                  aria-selected={activeSegment === 'ranking'}
                  onClick={() => setActiveSegment('ranking')}
                  className={getToggleBtnClass({
                    active: activeSegment === 'ranking',
                    tone: 'emerald',
                    size: 'sm',
                    extraClass: 'tabular-nums',
                  })}
                >
                  <span>평당가 랭킹</span>
                </button>
              )}
            </div>

            {/* /stats Link Button */}
            <Link
              href="/stats"
              data-testid="timeline-stats-link-btn"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-elevated hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary text-[11.5px] font-extrabold transition-colors cursor-pointer border border-border/50 shrink-0 shadow-2xs"
            >
              <span>심층 통계</span>
              <ExternalLink size={12} className="text-tertiary" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[14px] xs:text-[15px] sm:text-[18px] font-black text-primary tracking-tight whitespace-nowrap shrink-0">
                일자별 최근 실거래
              </h2>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11.5px] sm:text-[12.5px] font-extrabold text-secondary tabular-nums">
                {effectiveTotalCount}건
              </span>

              {/* Quick Period Selector (7d / 30d / 90d / 1y) */}
              {setPeriodFilter && (
                <div className={getToggleTrackClass('sm:ml-1')}>
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
                        aria-label={`실거래 기간 ${labelMap[p]}`}
                        data-testid={`timeline-period-tab-${p}`}
                        className={getToggleBtnClass({ active: isSelected, size: 'sm', extraClass: 'tabular-nums' })}
                      >
                        {labelMap[p]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Collapse / Expand All Control */}
            {activeSectionTab === 'timeline' && renderedGroups.length > 0 && (
              <button
                type="button"
                onClick={toggleAllCollapse}
                aria-label={isAllCollapsed ? '일자별 모두 펼치기' : '일자별 모두 접기'}
                data-testid="timeline-collapse-all-btn"
                className={getControlPillClass({ extraClass: 'active:scale-95 self-start sm:self-auto' })}
              >
                {isAllCollapsed ? (
                  <>
                    <ChevronDown size={14} className="text-secondary" />
                    <span>모두 펼치기</span>
                  </>
                ) : (
                  <>
                    <ChevronUp size={14} className="text-secondary" />
                    <span>모두 접기</span>
                  </>
                )}
              </button>
            )}
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
            showQuickFilters={showQuickFilters}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onResetFilters={onResetFilters}
          />

          {/* Hyperlocal Insight Summary Cards (4 Engagement Anchors) */}
          {insights && (
            <HyperlocalInsightCards
              insights={insights}
              onSelectComplex={handleComplexSelect}
              onOpenJeonseSafety={onOpenJeonseSafety}
              onOpenCompare={onOpenCompare}
              className="mb-0"
            />
          )}

          {/* Bottom View Switcher Tabs: [일자별 실거래 내역] vs [실시간 시장 랭킹] vs [단지별 평당가 랭킹] */}
          {(pyeongRankings !== undefined || liveRankingBoardNode !== undefined) && (
            <div
              data-testid="timeline-view-tab-switcher"
              className="flex items-center justify-between gap-2 pt-1 border-t border-border/60"
            >
              <div
                className={getToggleTrackClass(
                  pyeongRankings !== undefined && liveRankingBoardNode !== undefined
                    ? 'grid grid-cols-3 sm:inline-flex w-full sm:w-auto'
                    : 'grid grid-cols-2 sm:inline-flex w-full sm:w-auto'
                )}
              >
                <button
                  type="button"
                  data-testid="timeline-tab-transactions"
                  aria-selected={activeSectionTab === 'timeline'}
                  onClick={() => {
                    trackEvent('timeline_section_tab_click', { tab: 'timeline' });
                    setActiveSectionTab('timeline');
                  }}
                  className={getToggleBtnClass({
                    active: activeSectionTab === 'timeline',
                    tone: 'blue',
                    extraClass: 'px-2 xs:px-3 sm:px-3.5 text-[11px] xs:text-[12px] sm:text-[13px] min-w-0',
                  })}
                >
                  <span className="truncate">일자별 실거래 내역</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[10.5px] xs:text-[11px] font-black tabular-nums shrink-0">
                    {effectiveTotalCount}
                  </span>
                </button>
                {liveRankingBoardNode !== undefined && (
                  <button
                    type="button"
                    data-testid="timeline-tab-live-rankings"
                    aria-selected={activeSectionTab === 'live_ranking'}
                    onClick={() => {
                      trackEvent('timeline_section_tab_click', { tab: 'live_ranking' });
                      setActiveSectionTab('live_ranking');
                    }}
                    className={getToggleBtnClass({
                      active: activeSectionTab === 'live_ranking',
                      tone: 'blue',
                      extraClass: 'px-2 xs:px-3 sm:px-3.5 text-[11px] xs:text-[12px] sm:text-[13px] min-w-0',
                    })}
                  >
                    <span className="truncate">실시간 시장 랭킹</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[10.5px] xs:text-[11px] font-black tabular-nums shrink-0">
                      LIVE
                    </span>
                  </button>
                )}
                {pyeongRankings !== undefined && (
                  <button
                    type="button"
                    data-testid="timeline-tab-rankings"
                    aria-selected={activeSectionTab === 'ranking'}
                    onClick={() => {
                      trackEvent('timeline_section_tab_click', { tab: 'ranking' });
                      setActiveSectionTab('ranking');
                    }}
                    className={getToggleBtnClass({
                      active: activeSectionTab === 'ranking',
                      tone: 'emerald',
                      extraClass: 'px-2 xs:px-3 sm:px-3.5 text-[11px] xs:text-[12px] sm:text-[13px] min-w-0',
                    })}
                  >
                    <span className="truncate">단지별 평당가 랭킹</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-[10.5px] xs:text-[11px] font-black tabular-nums shrink-0">
                      TOP {Math.min(20, pyeongRankings.length)}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Date Jump Navigator Bar (Rendered when multiple dates exist across full filtered dataset) */}
          {activeSectionTab === 'timeline' && fullSourceData.length > 1 && (
            <div
              data-testid="timeline-date-jump-bar"
              className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 w-full"
            >
              <button
                type="button"
                data-testid="timeline-date-jump-all"
                aria-label="모든 날짜 보기"
                aria-pressed={selectedDateJump === null}
                onClick={() => setSelectedDateJump(null)}
                className={`h-[32px] sm:h-[34px] px-3 rounded-[10px] text-[12px] font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 tabular-nums ${
                  selectedDateJump === null
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-2xs'
                    : 'bg-elevated hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-secondary'
                }`}
              >
                {`모든 날짜 (${fullSourceData.length}일)`}
              </button>
              {fullSourceData.slice(0, 14).map((group, idx) => {
                const isDateActive = selectedDateJump === (group.dateStr || group.date);
                const shortLabel = formatShortDateLabel(group.dateStr || group.date || '');
                const pillItemCount = group.totalCount ?? group.items.length;
                return (
                  <button
                    key={group.dateKey || group.dateStr || group.date || `date-pill-${idx}`}
                    type="button"
                    data-testid={`timeline-date-jump-pill-${group.dateStr || group.date}`}
                    aria-label={`${shortLabel} 일자 바로가기`}
                    aria-pressed={isDateActive}
                    onClick={() => handleDateJumpClick(group.dateStr || group.date || '')}
                    className={`h-[32px] sm:h-[34px] px-3 rounded-[10px] text-[12px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 tabular-nums ${
                      isDateActive
                        ? 'bg-blue-600 text-white shadow-2xs font-extrabold ring-2 ring-blue-500/25'
                        : 'bg-elevated hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-secondary'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <span>{`${shortLabel} · ${pillItemCount}건`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Switched Content Area: [일자별 실거래 내역] vs [실시간 시장 랭킹] vs [단지별 평당가 랭킹] */}
        {activeSectionTab === 'live_ranking' && liveRankingBoardNode !== undefined ? (
          <div className="w-full mt-1" data-testid="timeline-live-ranking-panel">
            {liveRankingBoardNode}
          </div>
        ) : activeSectionTab === 'ranking' && pyeongRankings !== undefined ? (
          <div className="w-full mt-1">
            <StatsPyeongRankingChart
              rankings={pyeongRankings}
              onSelectComplex={handleComplexSelect}
              isLoading={isLoading}
            />
          </div>
        ) : (
        <div className={`flex-1 ${isMobileViewport ? "max-h-none overflow-visible" : "max-h-[520px] md:max-h-none overflow-y-auto"} pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full flex flex-col gap-5 mt-1 min-h-0 w-full box-border`}>
          {/* Active Favorites Watchlist Chip Bar + Quick Search-and-Add (Rendered when user has >= 1 favorite) */}
          {activeSegment === 'favorites' && effectiveUserFavorites.size > 0 && (
            <div
              data-testid="timeline-favorites-watchlist-bar"
              className="w-full flex flex-col gap-2.5 p-3.5 rounded-2xl bg-elevated/80 border border-border/60 box-border"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-[11.5px] font-extrabold text-secondary shrink-0 mr-1 tabular-nums">
                    저장된 관심단지 ({effectiveUserFavorites.size})
                  </span>
                  {Array.from(effectiveUserFavorites).map((favName) => {
                    const displayFav = getDisplayAptName(favName);
                    const isChipSelected =
                      !!effectiveSelectedApt &&
                      (effectiveSelectedApt === favName ||
                        normalizeAptName(effectiveSelectedApt) === normalizeAptName(favName) ||
                        isSameApartment(effectiveSelectedApt, favName, nameMapping));
                    return (
                      <span
                        key={favName}
                        className={`inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-xl text-[11.5px] font-bold transition-colors border ${
                          isChipSelected
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-surface text-primary border-border/70 hover:border-blue-400/60'
                        }`}
                      >
                        <Star
                          size={11}
                          className={
                            isChipSelected
                              ? 'fill-current text-white shrink-0'
                              : 'fill-blue-500 text-blue-600 shrink-0'
                          }
                        />
                        <button
                          type="button"
                          onClick={() => effectiveOnCardClick?.(favName)}
                          className="bg-transparent border-none p-0 text-inherit font-bold cursor-pointer truncate max-w-[160px]"
                        >
                          {displayFav}
                        </button>
                        <button
                          type="button"
                          data-testid={`favorites-chip-remove-${favName}`}
                          aria-label={`${displayFav} 관심단지 해제`}
                          onClick={() => handleQuickToggleFavorite(favName, 'favorites_chip')}
                          className={`p-0.5 rounded-md transition-colors cursor-pointer ${
                            isChipSelected
                              ? 'hover:bg-blue-700 text-white/90'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-tertiary hover:text-primary'
                          }`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Compact Quick-Add Input */}
                <div className="relative w-full sm:w-[240px] shrink-0">
                  <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
                  />
                  <input
                    type="text"
                    value={favAddQuery}
                    onChange={(e) => setFavAddQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && favSearchMatches.length > 0) {
                        e.preventDefault();
                        const topMatch = favSearchMatches.find(
                          (m) => !isApartmentInFavorites(effectiveUserFavorites, m.name, nameMapping)
                        ) || favSearchMatches[0];
                        if (topMatch) {
                          handleQuickToggleFavorite(topMatch.name, 'favorites_search_enter');
                        }
                      } else if (e.key === 'Escape') {
                        setFavAddQuery('');
                      }
                    }}
                    data-testid="favorites-quick-add-input"
                    aria-label="관심단지 검색 및 바로 추가"
                    placeholder="+ 관심단지 검색·추가 (초성 가능)"
                    className="w-full h-[32px] pl-8 pr-7 rounded-xl bg-surface border border-border/70 focus:border-blue-500 text-[12px] font-semibold text-primary placeholder:text-tertiary outline-none transition-colors"
                  />
                  {favAddQuery && (
                    <button
                      type="button"
                      aria-label="관심단지 검색어 지우기"
                      onClick={() => setFavAddQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {trimmedFavAddQuery && (
                <div className="w-full flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-border/40">
                  {favSearchMatches.length === 0 ? (
                    <span className="text-[11.5px] font-medium text-tertiary px-1">
                      일치하는 단지가 없습니다. 단지명 일부나 초성으로 검색해 보세요.
                    </span>
                  ) : (
                    favSearchMatches.map((apt) => {
                      const alreadyFav = isApartmentInFavorites(
                        effectiveUserFavorites,
                        apt.name,
                        nameMapping
                      );
                      return (
                        <button
                          key={apt.name}
                          type="button"
                          data-testid={`favorites-quick-add-btn-${apt.name}`}
                          onClick={() => handleQuickToggleFavorite(apt.name, 'favorites_search')}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11.5px] font-bold transition-colors cursor-pointer border ${
                            alreadyFav
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60'
                              : 'bg-surface hover:bg-blue-50 dark:hover:bg-blue-950/30 text-primary hover:text-blue-600 border-border/70'
                          }`}
                        >
                          {alreadyFav ? (
                            <Star size={11} className="fill-blue-500 text-blue-600 shrink-0" />
                          ) : (
                            <Plus size={11} className="text-blue-600 shrink-0" />
                          )}
                          <span>{apt.displayName}</span>
                          <span className="text-[10px] text-tertiary font-semibold">{apt.dong}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {renderedGroups.length === 0 ? (
            activeSegment === 'favorites' ? (
              <div
                data-testid="timeline-favorites-empty-prompt"
                className="flex-1 min-h-[220px] flex flex-col items-center justify-center p-6 sm:p-8 bg-elevated/60 rounded-2xl border border-dashed border-border/60 text-center gap-3.5 my-2"
              >
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
                  <Star size={20} className="fill-blue-500 text-blue-600" />
                </div>
                {effectiveUserFavorites.size === 0 ? (
                  <>
                    <div className="flex flex-col gap-1 max-w-[420px]">
                      <span className="text-[14px] font-extrabold text-primary">
                        등록된 관심 단지가 없습니다
                      </span>
                      <span className="text-[12px] text-tertiary leading-relaxed">
                        아래 검색창에서 단지를 바로 추가하거나, 타임라인의 별표 아이콘을 눌러 관심 단지를 추가해 보세요. 등록한 단지의 최신 실거래 변동을 모아 브리핑해 드립니다.
                      </span>
                    </div>

                    {/* Inline Quick Search & Add Box */}
                    <div className="w-full max-w-[420px] flex flex-col gap-2 text-left">
                      <div className="relative w-full">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary pointer-events-none"
                        />
                        <input
                          type="text"
                          value={favAddQuery}
                          onChange={(e) => setFavAddQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && favSearchMatches.length > 0) {
                              e.preventDefault();
                              handleQuickToggleFavorite(
                                favSearchMatches[0].name,
                                'favorites_empty_search_enter'
                              );
                            } else if (e.key === 'Escape') {
                              setFavAddQuery('');
                            }
                          }}
                          data-testid="favorites-quick-add-input"
                          aria-label="관심단지 검색 및 바로 추가"
                          placeholder="단지명 또는 초성 검색 (예: 롯데캐슬, ㄷㅌㅇ)"
                          className="w-full h-[36px] pl-9 pr-8 rounded-xl bg-surface border border-border/80 focus:border-blue-500 text-[12.5px] font-semibold text-primary placeholder:text-tertiary outline-none transition-colors shadow-2xs"
                        />
                        {favAddQuery && (
                          <button
                            type="button"
                            aria-label="관심단지 검색어 지우기"
                            onClick={() => setFavAddQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary cursor-pointer"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>

                      {trimmedFavAddQuery ? (
                        <div className="w-full bg-surface rounded-xl border border-border/70 p-1.5 flex flex-col gap-1 shadow-xs">
                          {favSearchMatches.length === 0 ? (
                            <span className="text-[11.5px] text-tertiary font-medium px-2.5 py-2 text-center">
                              일치하는 아파트 단지가 없습니다.
                            </span>
                          ) : (
                            favSearchMatches.map((apt) => (
                              <button
                                key={apt.name}
                                type="button"
                                data-testid={`favorites-quick-add-btn-${apt.name}`}
                                onClick={() =>
                                  handleQuickToggleFavorite(apt.name, 'favorites_empty_search')
                                }
                                className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-blue-50/80 dark:hover:bg-blue-950/40 text-left transition-colors cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[12.5px] font-bold text-primary truncate">
                                    {apt.displayName}
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-secondary shrink-0">
                                    {apt.dong}
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600 dark:text-blue-400 shrink-0">
                                  <Plus size={12} />
                                  <span>추가</span>
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      ) : (
                        favQuickSuggestions.length > 0 && (
                          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                            <span className="text-[11px] font-bold text-tertiary mr-0.5">
                              빠른 추가:
                            </span>
                            {favQuickSuggestions.map((sug) => (
                              <button
                                key={sug.name}
                                type="button"
                                data-testid={`favorites-quick-chip-${sug.name}`}
                                onClick={() =>
                                  handleQuickToggleFavorite(sug.name, 'favorites_empty_chip')
                                }
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-border/70 text-[11.5px] font-bold text-secondary hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                              >
                                <Plus size={11} className="text-blue-600 dark:text-blue-400 shrink-0" />
                                <span>{sug.displayName}</span>
                              </button>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-1 max-w-[380px]">
                    <span className="text-[14px] font-extrabold text-primary">
                      선택한 기간·필터에 관심단지의 실거래 내역이 없습니다
                    </span>
                    <span className="text-[12px] text-tertiary leading-relaxed">
                      기간을 1년으로 넓히거나 전체 실거래 보기로 전환해 다른 거래 내역을 확인해 보세요.
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {effectiveUserFavorites.size > 0 && setPeriodFilter && periodFilter !== '1y' && (
                    <button
                      type="button"
                      data-testid="favorites-expand-period-1y-btn"
                      onClick={() => setPeriodFilter('1y')}
                      className="px-4 py-2 rounded-xl bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 border border-border text-primary text-[12px] font-bold shadow-2xs transition-all cursor-pointer active:scale-95"
                    >
                      최근 1년 거래 보기
                    </button>
                  )}
                  <button
                    type="button"
                    data-testid="timeline-show-all-segment-btn"
                    onClick={() => setActiveSegment('all')}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    전체 실거래 보기
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-h-[200px] flex flex-col items-center justify-center text-tertiary text-[13.5px] gap-2 py-8">
                <Search size={24} className="text-tertiary/60" />
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
                    className="mt-2 px-3.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 text-[12px] font-bold transition-colors cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                  >
                    <span>필터 조건 초기화</span>
                  </button>
                )}
              </div>
            )
          ) : (
            renderedGroups.map((group, index) => {
              const currentYear = getGroupYear(group);
              const prevYear = index > 0 ? getGroupYear(renderedGroups[index - 1]) : null;
              const showYearDivider = currentYear !== null && (
                (distinctYears.length > 1 && index === 0) ||
                (prevYear !== null && currentYear !== prevYear)
              );

              const isGroupSelected = group.items.some(item => 
                effectiveSelectedApt ? (
                  effectiveSelectedApt === item.aptName ||
                  normalizeAptName(effectiveSelectedApt) === normalizeAptName(item.aptName) ||
                  isSameApartment(effectiveSelectedApt, item.aptName, nameMapping)
                ) : false
              );

              const avgPriceText = group.avgPriceEok || formatDailyAvgPrice(group.items);
              const groupNewHighCount = group.items.filter(
                (it) => it.type === 'high' || it.isNewHigh
              ).length;

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

              const isCollapsed = collapsedDates.has(group.dateStr);
              const groupItemCount = group.totalCount ?? group.items.length;

              return (
                <React.Fragment key={group.dateKey || group.dateStr || group.date || `group-${index}`}>
                  {showYearDivider && (
                    <div
                      data-testid={`timeline-year-divider-${currentYear}`}
                      className="w-full flex items-center gap-3 pt-3 pb-1 -ml-1 select-none"
                    >
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 text-[12px] sm:text-[13px] font-black tracking-wide shadow-2xs">

                        <span>{currentYear}년 실거래</span>
                      </div>
                      <div className="flex-1 h-px bg-slate-200/80 dark:bg-slate-800/80" />
                    </div>
                  )}

                  <div
                    key={group.dateStr}
                    data-testid={`timeline-group-${group.dateStr}`}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 120px' }}
                    className="flex flex-col gap-2.5 relative pl-3.5 sm:pl-4 border-l-2 border-slate-100 dark:border-slate-800/80 w-full box-border"
                  >
                  {/* Sticky Date Group Header (Collapsible Accordion Button) */}
                  <button
                    type="button"
                    onClick={() => toggleDateCollapse(group.dateStr)}
                    aria-expanded={!isCollapsed}
                    aria-label={`${group.dateStr} 실거래 내역 ${isCollapsed ? '펼치기' : '접기'}`}
                    data-testid={`timeline-date-header-${group.dateStr}`}
                    className="w-full text-left sticky top-0 z-20 bg-elevated/95 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 backdrop-blur-md py-2.5 px-3 -mx-2 rounded-xl flex items-center justify-between transition-all mb-1 cursor-pointer group/date select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 shrink-0 ${
                          isGroupSelected
                            ? "bg-blue-600 ring-4 ring-blue-500/25 scale-110"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      />
                      <h3 className="text-[12.5px] xs:text-[13.5px] font-black text-primary flex items-center gap-1.5 truncate">

                        <span>{group.dateStr}</span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 text-[9.5px] font-extrabold shrink-0">
                          국토부 등록일
                        </span>
                      </h3>
                      {isCollapsed && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-tertiary">
                          접힘 ({groupItemCount}건)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {showHighestPriceBadge && highestApt && (
                        <span
                          data-testid={`highest-price-badge-${group.dateStr}`}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 text-[10px] xs:text-[10.5px] font-black flex items-center gap-1 shadow-xs"
                        >

                          <span>최고가:</span>
                          <span className="max-w-[100px] xs:max-w-[140px] truncate">{highestApt.displayAptName || highestApt.aptName}</span>
                          <span>{highestApt.priceEok}</span>
                        </span>
                      )}
                      {groupNewHighCount > 0 && (
                        <span
                          data-testid={`new-high-count-badge-${group.dateStr}`}
                          className="px-1.5 py-0.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-800/40 text-red-600 dark:text-red-400 text-[10px] font-extrabold hidden sm:inline-flex items-center gap-1"
                        >

                          <span>{`최고가경신 ${groupNewHighCount}건`}</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-secondary text-[10px] xs:text-[10.5px] font-extrabold">
                        총 {groupItemCount}건 거래
                      </span>
                      {avgPriceText && (
                        <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[10px] xs:text-[10.5px] font-black hidden xs:inline-block">
                          평균 {avgPriceText}
                        </span>
                      )}
                      <div className="p-1 rounded-md text-tertiary group-hover/date:text-primary transition-transform duration-200">
                        <ChevronDown
                          size={15}
                          className={`transition-transform duration-200 ${
                            isCollapsed ? '-rotate-90 text-tertiary' : 'rotate-0 text-secondary'
                          }`}
                        />
                      </div>
                    </div>
                  </button>

                  {/* Items List (Dual View Mode: Card Grid vs Compact List) */}
                  {!isCollapsed && (
                    viewMode === 'list' ? (
                      <div className="flex flex-col divide-y divide-border bg-surface w-full">
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
                                    onCardClick={effectiveOnCardClick}
                                    onDetailsClick={onDetailsClick}
                                    onMortgageClick={onOpenMortgage}
                                    isFavorite={isApartmentInFavorites(effectiveUserFavorites, item.aptName, nameMapping)}
                                    onToggleFavorite={effectiveToggleFavorite}
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
                                  onCardClick={effectiveOnCardClick}
                                  onDetailsClick={onDetailsClick}
                                  onMortgageClick={onOpenMortgage}
                                  isFavorite={isApartmentInFavorites(effectiveUserFavorites, item.aptName, nameMapping)}
                                  onToggleFavorite={effectiveToggleFavorite}
                                />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
                {enableInFeedAd && index === 0 && (
                  <div
                    data-testid="timeline-infeed-ad-slot"
                    className="w-full py-1 box-border"
                  >
                    <AdSlot
                      slotId={inFeedAdSlotId}
                      format="in-feed"
                      apartmentName={effectiveSelectedApt || undefined}
                      className="w-full"
                    />
                  </div>
                )}
              </React.Fragment>
              );
            })
          )}

          {/* Infinite Scroll Sentinel & Fallback Load More */}
          {!selectedDateJump && setVisibleTimelineCount && effectiveTotalCount > effectiveVisibleCount && (
            <div ref={sentinelRef} className="w-full py-3 flex flex-col items-center justify-center gap-2">
              <div
                data-testid="timeline-load-more-progress"
                className="w-full flex items-center justify-between text-[10.5px] font-bold text-tertiary px-1"
              >
                <span>
                  {`현재 ${Math.min(effectiveVisibleCount, effectiveTotalCount)} / ${effectiveTotalCount}건 표시 중`}
                </span>
                <span>
                  {`${Math.round((Math.min(effectiveVisibleCount, effectiveTotalCount) / Math.max(1, effectiveTotalCount)) * 100)}%`}
                </span>
              </div>
              <div className="w-full flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleTimelineCount((prev) => Math.min(effectiveTotalCount, prev + 20))}
                  className="flex-1 py-2.5 bg-elevated hover:bg-slate-100 dark:hover:bg-slate-800 text-[12px] xs:text-[12.5px] font-bold text-secondary rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-[0.99]"
                >
                  <span>최근 실거래 더보기 (+20개 / 남은 {effectiveTotalCount - effectiveVisibleCount}개)</span>
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  data-testid="timeline-show-all-btn"
                  aria-label="나머지 실거래 일괄 표시"
                  onClick={() => setVisibleTimelineCount(effectiveTotalCount)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11.5px] font-extrabold text-primary rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  일괄 펼치기
                </button>
              </div>
            </div>
          )}

          {!selectedDateJump && setVisibleTimelineCount && effectiveTotalCount > 3 && effectiveTotalCount <= effectiveVisibleCount && (
            <div className="w-full py-2 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setVisibleTimelineCount(isMobileViewport ? 3 : 8)}
                className="px-4 py-1.5 bg-elevated hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold text-tertiary hover:text-secondary rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
              >
                <span>처음으로 접기</span>
                <ChevronUp size={13} />
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
});
