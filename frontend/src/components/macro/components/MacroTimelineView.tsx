import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronUp, RotateCcw, ExternalLink, Flame, Landmark, ShieldCheck, BarChart3, Search, Crown } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
import { normalizeAptName, isSameApartment, getDisplayAptName } from '@/lib/utils/apartmentMapping';
import { TimelineFilterControls } from './MacroControls';
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
}

export interface TimelineGroup {
  dateStr: string;
  timestamp: number;
  items: TimelineItem[];
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
}: {
  item: TimelineItem;
  isSelected: boolean;
  onCardClick?: (aptName: string) => void;
  onDetailsClick?: (aptName: string) => void;
  onMortgageClick?: (aptName: string) => void;
}) {
  const displayName = item.displayAptName || item.aptName;
  return (
    <div
      data-testid={`timeline-card-${item.aptName}`}
      onClick={() => onCardClick?.(item.aptName)}
      className={`p-3 bg-surface hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between gap-2 shadow-xs ${
        isSelected
          ? 'border-[#057e77] ring-2 ring-[#057e77]/20 bg-[#057e77]/5'
          : 'border-border/60 hover:border-border'
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
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onMortgageClick && (
            <button
              type="button"
              data-testid={`timeline-item-mortgage-btn-${item.aptName}`}
              aria-label={`${item.aptName} 주담대 금리 및 한도 계산`}
              onClick={(e) => {
                e.stopPropagation();
                onMortgageClick(item.aptName);
              }}
              className="px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-[#057e77] dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50 text-[9.5px] font-extrabold transition-colors"
            >
              대출·금리
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
}: {
  item: TimelineItem;
  isSelected: boolean;
  onCardClick?: (aptName: string) => void;
  onDetailsClick?: (aptName: string) => void;
  onMortgageClick?: (aptName: string) => void;
}) {
  const displayName = item.displayAptName || item.aptName;
  return (
    <div
      data-testid={`timeline-row-${item.aptName}`}
      onClick={() => onCardClick?.(item.aptName)}
      className={`px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
        isSelected ? 'bg-[#057e77]/5' : ''
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
          {onMortgageClick && (
            <button
              type="button"
              data-testid={`timeline-row-mortgage-btn-${item.aptName}`}
              aria-label={`${item.aptName} 주담대 금리 및 한도 계산`}
              onClick={(e) => {
                e.stopPropagation();
                onMortgageClick(item.aptName);
              }}
              className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-[#057e77] dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50 text-[9px] font-extrabold transition-colors"
            >
              대출·금리
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
  className,
}: MacroTimelineViewProps) {
  const effectiveData = displayedTimelineData || timelineGroups || [];
  const fullSourceData = fullTimelineData && fullTimelineData.length > 0 ? fullTimelineData : effectiveData;
  const effectiveSelectedApt = selectedTimelineApt !== undefined ? selectedTimelineApt : (selectedApt || null);
  const effectiveOnCardClick = onCardClick || onSelectApt;
  const effectiveTaxHandler = onOpenSellTimingCalculator || onOpenTaxCalculator;

  const totalCalculatedItems = fullSourceData.reduce((acc, g) => acc + (g.items ? g.items.length : 0), 0);
  const effectiveTotalCount = totalTimelineCardsCount ?? totalCalculatedItems;
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
  ]);

  const renderedGroups = useMemo(() => {
    if (!selectedDateJump) return effectiveData;
    const matched = fullSourceData.filter((g) => g.dateStr === selectedDateJump);
    return matched.length > 0 ? matched : effectiveData;
  }, [effectiveData, fullSourceData, selectedDateJump]);

  const metricsSourceGroups = useMemo(() => {
    if (selectedDateJump) {
      const matched = fullSourceData.filter((g) => g.dateStr === selectedDateJump);
      if (matched.length > 0) return matched;
    }
    return fullSourceData;
  }, [fullSourceData, selectedDateJump]);

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
          <div className="w-6 h-6 border-2 border-[#057e77] border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-[13px] font-bold text-secondary">최근 실거래 타임라인 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full flex flex-col gap-4 min-w-0 max-w-full box-border ${className || ''}`}>
      {/* Daily Timeline Card Container */}
      <div className="flex flex-col bg-surface rounded-[22px] sm:rounded-[26px] shadow-sm border border-border/80 p-5 sm:p-6 lg:p-7 min-h-[420px] min-w-0 max-w-full overflow-hidden w-full box-border">
        {/* Header & Filter Controls Bar */}
        <div className="flex flex-col gap-3.5 mb-4 sm:mb-5 w-full">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[14px] xs:text-[15px] sm:text-[18px] font-black text-primary tracking-tight whitespace-nowrap shrink-0">
                일자별 최근 실거래
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] sm:text-[11px] font-extrabold text-secondary">
                {effectiveTotalCount}건
              </span>

              {/* Quick Period Selector (7d / 30d / 90d / 1y) */}
              {setPeriodFilter && (
                <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl shrink-0 border border-border/50 ml-1">
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
                        className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[10.5px] font-extrabold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-surface text-[#057e77] shadow-xs font-black"
                            : "text-tertiary hover:text-secondary"
                        }`}
                      >
                        {labelMap[p]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Collapse / Expand All Control */}
            {renderedGroups.length > 0 && (
              <button
                type="button"
                onClick={toggleAllCollapse}
                aria-label={isAllCollapsed ? '일자별 모두 펼치기' : '일자별 모두 접기'}
                data-testid="timeline-collapse-all-btn"
                className="px-2.5 py-1 rounded-xl bg-body hover:bg-slate-100 dark:hover:bg-slate-800 border border-border/60 text-[11px] font-bold text-secondary hover:text-primary flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              >
                {isAllCollapsed ? (
                  <>
                    <ChevronDown size={13} className="text-secondary" />
                    <span>모두 펼치기</span>
                  </>
                ) : (
                  <>
                    <ChevronUp size={13} className="text-secondary" />
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

          {/* Real-Time Filtered Summary KPI & High-CPC Finance Simulation Bar */}
          {aggregateMetrics.isValid && (
            <div
              data-testid="timeline-summary-kpi-bar"
              className="w-full flex flex-col gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-slate-50/90 dark:bg-slate-900/50 border border-border/60"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 w-full">
                {/* KPI 1: Average Price & Price per 3.3㎡ */}
                <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-xl bg-surface border border-border/50 shadow-2xs">
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-tertiary">조회 구간 평균가 · 단가</span>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-[12px] sm:text-[13px] font-black text-primary">
                      구간 평균 {aggregateMetrics.avgPriceEokVal}억
                    </span>
                    {aggregateMetrics.avgPyeongPriceMan > 0 && (
                      <span className="text-[10px] font-extrabold text-[#057e77] dark:text-emerald-400">
                        3.3㎡당 {aggregateMetrics.avgPyeongPriceMan.toLocaleString()}만원
                      </span>
                    )}
                  </div>
                </div>

                {/* KPI 2: Price Range Spectrum */}
                <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-xl bg-surface border border-border/50 shadow-2xs">
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-tertiary">실거래 가격 스펙트럼</span>
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-[11.5px] sm:text-[12.5px] font-black text-primary">
                      최저 {aggregateMetrics.minPriceEokVal}억 ~ 최고 {aggregateMetrics.maxPriceEokVal}억
                    </span>
                  </div>
                </div>

                {/* KPI 3: Market Momentum (Rising & New High Ratio) */}
                <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-xl bg-surface border border-border/50 shadow-2xs">
                  <span className="text-[9.5px] sm:text-[10px] font-bold text-tertiary">상승 모멘텀 · 최고가 경신율</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11.5px] sm:text-[12.5px] font-black text-red-500 dark:text-red-400">
                      상승비중 {aggregateMetrics.risingRatio}% ({aggregateMetrics.risingCount}건)
                    </span>
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                      · 경신율 {aggregateMetrics.newHighRatio}%
                    </span>
                  </div>
                </div>

                {/* KPI 4: LTV 70% & DSR Mortgage Simulation */}
                <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 shadow-2xs">
                  <span className="text-[9.5px] sm:text-[10px] font-extrabold text-[#057e77] dark:text-emerald-400">
                    평균 매수가 주담대 시뮬레이션 (LTV 70%)
                  </span>
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-[11.5px] sm:text-[12.5px] font-black text-primary">
                      한도 약 {aggregateMetrics.estimatedLtv70Eok}억
                    </span>
                    <span className="text-[9.5px] sm:text-[10px] font-bold text-secondary">
                      (자기자본 {aggregateMetrics.estimatedEquityEok}억 · 월 {aggregateMetrics.estimatedMonthlyPaymentMan.toLocaleString()}만)
                    </span>
                  </div>
                </div>
              </div>

              {/* AdSense High-CPC Financial Funnel Action Bar */}
              <div
                data-testid="timeline-finance-cta-bar"
                className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/40 flex-wrap"
              >
                <span className="text-[10px] sm:text-[10.5px] font-bold text-secondary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#057e77] shrink-0" />
                  <span>{`${effectiveSelectedApt ? `[${effectiveSelectedApt}] ` : ''}실거래 단지 맞춤 금융·세금 원클릭 진단`}</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    data-testid="timeline-cta-mortgage"
                    aria-label="주담대 최저금리 및 DSR 한도 계산"
                    onClick={() => handleFinanceAction('mortgage')}
                    className="px-2.5 py-1 rounded-lg bg-[#057e77] hover:bg-[#046660] text-white text-[10px] sm:text-[10.5px] font-extrabold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <Landmark size={12} className="shrink-0" />
                    <span>주담대 최저금리·DSR 한도 계산</span>
                  </button>
                  <button
                    type="button"
                    data-testid="timeline-cta-jeonse"
                    aria-label="전세보증보험 및 깡통전세 안전진단"
                    onClick={() => handleFinanceAction('jeonse')}
                    className="px-2.5 py-1 rounded-lg bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary border border-border/70 text-[10px] sm:text-[10.5px] font-extrabold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <ShieldCheck size={12} className="shrink-0" />
                    <span>전세보증보험 안전진단</span>
                  </button>
                  <button
                    type="button"
                    data-testid="timeline-cta-tax"
                    aria-label="갈아타기 및 양도소득세 시뮬레이션"
                    onClick={() => handleFinanceAction('tax')}
                    className="px-2.5 py-1 rounded-lg bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-secondary hover:text-primary border border-border/70 text-[10px] sm:text-[10.5px] font-extrabold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                  >
                    <BarChart3 size={12} className="shrink-0" />
                    <span>갈아타기·양도세 계산</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Date Jump Navigator Bar (Rendered when multiple dates exist across full filtered dataset) */}
          {fullSourceData.length > 1 && (
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
                className={`px-2.5 py-1 rounded-lg text-[10px] xs:text-[10.5px] font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  selectedDateJump === null
                    ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-secondary border border-border/50'
                }`}
              >
                {`모든 날짜 (${fullSourceData.length}일)`}
              </button>
              {fullSourceData.slice(0, 14).map((group) => {
                const isDateActive = selectedDateJump === group.dateStr;
                const shortLabel = formatShortDateLabel(group.dateStr);
                const pillItemCount = group.totalCount ?? group.items.length;
                return (
                  <button
                    key={group.dateKey || group.dateStr}
                    type="button"
                    data-testid={`timeline-date-jump-pill-${group.dateStr}`}
                    aria-label={`${shortLabel} 일자 바로가기`}
                    aria-pressed={isDateActive}
                    onClick={() => handleDateJumpClick(group.dateStr)}
                    className={`px-2 py-1 rounded-lg text-[10px] xs:text-[10.5px] font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      isDateActive
                        ? 'bg-[#057e77] text-white shadow-2xs font-extrabold ring-2 ring-[#057e77]/20'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-secondary border border-border/60'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={11} className="shrink-0" />
                      <span>{`${shortLabel} · ${pillItemCount}건`}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Timeline Stream */}
        <div className={`flex-1 ${isMobileViewport ? "max-h-none overflow-visible" : "max-h-[520px] md:max-h-none overflow-y-auto"} pr-0.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full flex flex-col gap-5 mt-1 min-h-0 w-full box-border`}>
          {renderedGroups.length === 0 ? (
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
                  className="mt-2 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/80 dark:border-emerald-800/60 text-[#057e77] dark:text-emerald-400 text-[12px] font-bold transition-colors cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                >
                  <RotateCcw size={13} />
                  <span>필터 조건 초기화</span>
                </button>
              )}
            </div>
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
                <React.Fragment key={group.dateKey || group.dateStr}>
                  {showYearDivider && (
                    <div
                      data-testid={`timeline-year-divider-${currentYear}`}
                      className="w-full flex items-center gap-3 pt-3 pb-1 -ml-1 select-none"
                    >
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#057e77]/10 dark:bg-[#057e77]/20 text-[#057e77] dark:text-[#2dd4bf] border border-[#057e77]/20 text-[12px] sm:text-[13px] font-black tracking-wide shadow-2xs">
                        <Calendar size={13} className="shrink-0 text-[#057e77] dark:text-[#2dd4bf]" />
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
                    className="w-full text-left sticky top-0 z-20 bg-surface/95 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 backdrop-blur-md border border-border/40 py-2.5 px-3 -mx-2 rounded-xl flex items-center justify-between shadow-xs transition-all mb-1 cursor-pointer group/date select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full transition-all duration-300 shrink-0 ${
                          isGroupSelected
                            ? "bg-[#057e77] ring-4 ring-[#057e77]/20 scale-110"
                            : "bg-slate-300 dark:bg-slate-600"
                        }`}
                      />
                      <h3 className="text-[12.5px] xs:text-[13.5px] font-black text-primary flex items-center gap-1.5 truncate">
                        <Calendar size={13.5} className="text-[#057e77] shrink-0" />
                        {group.dateStr}
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
                          <Crown size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                          <Flame size={11} className="text-red-500 shrink-0" />
                          <span>{`최고가경신 ${groupNewHighCount}건`}</span>
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-secondary text-[10px] xs:text-[10.5px] font-extrabold">
                        총 {groupItemCount}건 거래
                      </span>
                      {avgPriceText && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[#057e77] dark:text-[#14b8a6] text-[10px] xs:text-[10.5px] font-black hidden xs:inline-block">
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
                                    onCardClick={effectiveOnCardClick}
                                    onDetailsClick={onDetailsClick}
                                    onMortgageClick={onOpenMortgage}
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
                                />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    )
                  )}
                </div>
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
                  className="flex-1 py-2.5 bg-body hover:bg-body/80 border border-border/40 text-[12px] xs:text-[12.5px] font-bold text-secondary rounded-[12px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
                >
                  <span>최근 실거래 더보기 (+20개 / 남은 {effectiveTotalCount - effectiveVisibleCount}개)</span>
                  <ChevronDown size={14} />
                </button>
                <button
                  type="button"
                  data-testid="timeline-show-all-btn"
                  aria-label="나머지 실거래 일괄 표시"
                  onClick={() => setVisibleTimelineCount(effectiveTotalCount)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-border/50 text-[11.5px] font-extrabold text-primary rounded-[12px] transition-colors cursor-pointer shrink-0 shadow-xs"
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
