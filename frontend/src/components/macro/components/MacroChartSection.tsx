import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, Check, ChevronDown, Clock, Search, Star, X } from 'lucide-react';
import { findTxKey, getDisplayAptName, normalizeAptName } from '@/lib/utils/apartmentMapping';
import { useFavorites, isApartmentInFavorites } from '@/hooks/useFavorites';
import {
  filterAndRankApartments,
  getHighlightSegments,
} from '@/lib/utils/apartmentSearch';
import {
  addRecentApartment,
  getRecentApartments,
  removeRecentApartment,
  type RecentApartmentItem,
} from '@/lib/utils/recentApartments';
import { TimeframeSelector } from './MacroControls';
import { DongApartment, buildInitialApartments } from '@/lib/dong-apartments';
import type { AptTxSummary } from '@/types/transaction';
import { getControlSelectClass, getControlInputClass } from '@/lib/design-system/controls';
import { useDebounce } from '@/hooks/useDebounce';
import { trackEvent, trackApartmentView, trackSearchQuery } from '@/lib/utils/analytics';

export interface MacroChartSectionProps {
  isDefaultAptSettingUp: boolean;
  mounted: boolean;
  selectedTimelineApt: string | null;
  setSelectedTimelineApt: (apt: string | null) => void;
  preloadApartmentModal: () => void;
  defaultTimelineApts: string[];
  sheetApartments?: Record<string, DongApartment[]>;
  txSummaryData?: Record<string, AptTxSummary> | { summary?: Record<string, AptTxSummary> };
  nameMapping?: Record<string, string>;
  userFavorites?: Set<string>;
  onToggleFavorite?: (aptName: string) => void;
  onSelectApt?: (name: string, dong?: string) => void;
  onOpenMortgageModal?: (aptName?: string) => void;
  onHoverApt?: (name: string) => void;
  timeframe: '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL';
  setTimeframe: (tf: '3M' | '6M' | '1Y' | '3Y' | '5Y' | 'ALL') => void;
  isAptTxLoading: boolean;
  aptRealTxData: any[] | null;
  mainLineData: any[];
  mainXTicks: string[];
  mainYTicks: number[];
  renderChart: () => React.ReactNode;
  trafficNoticeBoardNode?: React.ReactNode;
  className?: string;
}

interface EnrichedCatalogApt {
  name: string;
  displayName: string;
  dong: string;
  txKey?: string;
  householdCount?: number;
  realPriceLabel: string | null;
}

type NavigableComboboxItem =
  | { kind: 'macro-all'; key: string }
  | {
      kind: 'apt';
      key: string;
      apt: EnrichedCatalogApt;
      section: 'search' | 'cross-dong' | 'favorites' | 'recent' | 'default' | 'all';
      isCrossDong?: boolean;
    };

function formatRealPriceMan(priceMan: number): string | null {
  if (!priceMan || !Number.isFinite(priceMan) || priceMan <= 0) return null;
  const rounded = Math.round(priceMan);
  const eok = Math.floor(rounded / 10000);
  const remainder = rounded % 10000;
  if (eok === 0) return `${remainder.toLocaleString()}만`;
  if (remainder === 0) return `${eok}억`;
  return `${eok}억 ${remainder.toLocaleString()}만`;
}

export const MacroChartSection = React.memo(function MacroChartSection({
  isDefaultAptSettingUp,
  mounted,
  selectedTimelineApt,
  setSelectedTimelineApt,
  preloadApartmentModal,
  defaultTimelineApts,
  sheetApartments,
  txSummaryData,
  nameMapping,
  userFavorites: propUserFavorites,
  onToggleFavorite: propToggleFavorite,
  onSelectApt,
  onOpenMortgageModal,
  onHoverApt,
  timeframe,
  setTimeframe,
  isAptTxLoading,
  aptRealTxData,
  mainLineData,
  renderChart,
  trafficNoticeBoardNode,
  className,
}: MacroChartSectionProps) {
  const [selectedDong, setSelectedDong] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [recentApts, setRecentApts] = useState<RecentApartmentItem[]>([]);

  const fallbackFavoritesHook = useFavorites();
  const effectiveUserFavorites =
    propUserFavorites !== undefined ? propUserFavorites : fallbackFavoritesHook.userFavorites;
  const effectiveToggleFavorite =
    propToggleFavorite || fallbackFavoritesHook.handleToggleFavorite;

  const comboboxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const lastTrackedSearchQueryRef = useRef<string>('');
  const searchMatchCountRef = useRef<number>(0);
  const isImeComposingRef = useRef<boolean>(false);

  const debouncedChartSearch = useDebounce(searchQuery, 1000);

  useEffect(() => {
    if (!searchQuery.trim()) {
      lastTrackedSearchQueryRef.current = '';
    }
  }, [searchQuery]);

  useEffect(() => {
    const query = debouncedChartSearch.trim();
    if (mounted && query) {
      if (lastTrackedSearchQueryRef.current !== query) {
        lastTrackedSearchQueryRef.current = query;
        trackEvent('search_apartment', { query, surface: 'dashboard_chart' });
      }
      if (onSelectApt) {
        trackSearchQuery({
          search_term: query,
          query,
          surface: 'dashboard_chart',
          trigger: 'debounce',
          results_count: searchMatchCountRef.current,
        });
      }
    }
  }, [debouncedChartSearch, mounted, onSelectApt]);

  useEffect(() => {
    if (mounted) {
      setRecentApts(getRecentApartments());
    }
  }, [mounted]);

  // Close dropdown when clicking outside combobox container
  useEffect(() => {
    if (!isDropdownOpen || typeof document === 'undefined') return;
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [isDropdownOpen]);

  const summaryMap = useMemo<Record<string, AptTxSummary>>(() => {
    if (!txSummaryData) return {};
    const maybeWrapped = txSummaryData as { summary?: Record<string, AptTxSummary> };
    if (maybeWrapped.summary && typeof maybeWrapped.summary === 'object') {
      return maybeWrapped.summary;
    }
    return txSummaryData as Record<string, AptTxSummary>;
  }, [txSummaryData]);

  // Extract all dongs and unique apartments with verified 100% real transaction price labels
  const dongsData = useMemo(() => {
    let source: Record<string, DongApartment[]> = {};
    if (sheetApartments && Object.keys(sheetApartments).length > 0) {
      source = sheetApartments;
    } else {
      source = buildInitialApartments();
    }

    const dongs = Object.keys(source).sort((a, b) => a.localeCompare(b, 'ko'));
    const allApts: EnrichedCatalogApt[] = [];
    const seen = new Set<string>();
    const hasSummaryKeys = Object.keys(summaryMap).length > 0;

    Object.entries(source).forEach(([dongKey, apts]) => {
      apts.forEach((a) => {
        const name = a.name;
        if (!seen.has(name)) {
          seen.add(name);
          const dong = a.dong || dongKey;
          const displayName = getDisplayAptName(name);
          let realPriceLabel: string | null = null;

          if (hasSummaryKeys) {
            const rawKey = a.txKey || name;
            const resolvedKey =
              findTxKey(rawKey, summaryMap, nameMapping, false, dong) || rawKey;
            const summary = summaryMap[resolvedKey];
            const verifiedPrice =
              summary?.latestPrice || summary?.avg1MPrice || summary?.avg3MPrice || 0;
            realPriceLabel = formatRealPriceMan(verifiedPrice);
          }

          allApts.push({
            name,
            displayName,
            dong,
            txKey: a.txKey,
            householdCount: a.householdCount,
            realPriceLabel,
          });
        }
      });
    });

    allApts.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ko'));
    return { dongs, allApts };
  }, [sheetApartments, summaryMap, nameMapping]);

  const aptByNameMap = useMemo(() => {
    const map = new Map<string, EnrichedCatalogApt>();
    for (const apt of dongsData.allApts) {
      map.set(apt.name, apt);
      if (!map.has(apt.displayName)) {
        map.set(apt.displayName, apt);
      }
      const normRaw = normalizeAptName(apt.name);
      if (normRaw && !map.has(normRaw)) {
        map.set(normRaw, apt);
      }
      const normDisp = normalizeAptName(apt.displayName);
      if (normDisp && !map.has(normDisp)) {
        map.set(normDisp, apt);
      }
    }
    return map;
  }, [dongsData.allApts]);

  const currentAptObj = useMemo(() => {
    if (!selectedTimelineApt) return null;
    return (
      aptByNameMap.get(selectedTimelineApt) ||
      aptByNameMap.get(getDisplayAptName(selectedTimelineApt)) ||
      aptByNameMap.get(normalizeAptName(selectedTimelineApt)) ||
      null
    );
  }, [selectedTimelineApt, aptByNameMap]);

  const isSelectedAptFavorite = useMemo(() => {
    if (!selectedTimelineApt) return false;
    return isApartmentInFavorites(effectiveUserFavorites, selectedTimelineApt, nameMapping);
  }, [effectiveUserFavorites, selectedTimelineApt, nameMapping]);

  const trimmedSearch = searchQuery.trim();

  // Scoped pool based on selectedDong
  const scopedPool = useMemo(() => {
    if (selectedDong === 'all') return dongsData.allApts;
    if (selectedDong === 'default') {
      return defaultTimelineApts
        .map((name) => aptByNameMap.get(name) || aptByNameMap.get(getDisplayAptName(name)))
        .filter((a): a is EnrichedCatalogApt => Boolean(a));
    }
    return dongsData.allApts.filter((a) => a.dong === selectedDong);
  }, [selectedDong, dongsData.allApts, defaultTimelineApts, aptByNameMap]);

  // Smart search results (primary in selectedDong + cross-dong escape hatch so users never hit false dead-ends)
  const { primarySearchMatches, crossDongSearchMatches } = useMemo(() => {
    if (!trimmedSearch) {
      return { primarySearchMatches: [], crossDongSearchMatches: [] };
    }
    const primary = filterAndRankApartments(scopedPool, trimmedSearch);
    if (selectedDong === 'all') {
      return { primarySearchMatches: primary, crossDongSearchMatches: [] };
    }
    const primaryNames = new Set(primary.map((a) => a.name));
    const allMatches = filterAndRankApartments(dongsData.allApts, trimmedSearch);
    const crossDong = allMatches.filter((a) => !primaryNames.has(a.name));
    return { primarySearchMatches: primary, crossDongSearchMatches: crossDong };
  }, [trimmedSearch, scopedPool, selectedDong, dongsData.allApts]);

  // Empty-query recommendation groups
  const favoriteResolvedApts = useMemo(() => {
    const resolved: EnrichedCatalogApt[] = [];
    const seen = new Set<string>();
    effectiveUserFavorites.forEach((favName) => {
      const match =
        aptByNameMap.get(favName) ||
        aptByNameMap.get(getDisplayAptName(favName)) ||
        aptByNameMap.get(normalizeAptName(favName));
      if (match && !seen.has(match.name)) {
        seen.add(match.name);
        resolved.push(match);
      }
    });
    return resolved;
  }, [effectiveUserFavorites, aptByNameMap]);

  const recentResolvedApts = useMemo(() => {
    const resolved: EnrichedCatalogApt[] = [];
    const seen = new Set<string>();
    for (const r of recentApts) {
      const match =
        aptByNameMap.get(r.name) || aptByNameMap.get(getDisplayAptName(r.name));
      if (match && !seen.has(match.name)) {
        seen.add(match.name);
        resolved.push(match);
        if (resolved.length >= 4) break;
      }
    }
    return resolved;
  }, [recentApts, aptByNameMap]);

  const defaultResolvedApts = useMemo(() => {
    const resolved: EnrichedCatalogApt[] = [];
    const seen = new Set<string>();
    for (const aptName of defaultTimelineApts) {
      const match =
        aptByNameMap.get(aptName) || aptByNameMap.get(getDisplayAptName(aptName));
      if (match && !seen.has(match.name)) {
        seen.add(match.name);
        resolved.push(match);
      }
    }
    return resolved;
  }, [defaultTimelineApts, aptByNameMap]);

  // Build unified navigable option list for keyboard ArrowUp/ArrowDown/Enter
  const navigableItems = useMemo<NavigableComboboxItem[]>(() => {
    if (trimmedSearch) {
      const items: NavigableComboboxItem[] = [];
      for (const apt of primarySearchMatches) {
        items.push({
          kind: 'apt',
          key: `search-${apt.name}`,
          apt,
          section: 'search',
          isCrossDong: false,
        });
      }
      for (const apt of crossDongSearchMatches) {
        items.push({
          kind: 'apt',
          key: `cross-${apt.name}`,
          apt,
          section: 'cross-dong',
          isCrossDong: true,
        });
      }
      return items;
    }

    const items: NavigableComboboxItem[] = [{ kind: 'macro-all', key: 'macro-all' }];
    if (selectedDong === 'all') {
      for (const apt of favoriteResolvedApts) {
        items.push({ kind: 'apt', key: `fav-${apt.name}`, apt, section: 'favorites' });
      }
      for (const apt of recentResolvedApts) {
        items.push({ kind: 'apt', key: `recent-${apt.name}`, apt, section: 'recent' });
      }
      for (const apt of defaultResolvedApts) {
        items.push({ kind: 'apt', key: `default-${apt.name}`, apt, section: 'default' });
      }
      for (const apt of dongsData.allApts) {
        items.push({ kind: 'apt', key: `all-${apt.name}`, apt, section: 'all' });
      }
    } else if (selectedDong === 'default') {
      for (const apt of defaultResolvedApts) {
        items.push({ kind: 'apt', key: `default-${apt.name}`, apt, section: 'default' });
      }
    } else {
      for (const apt of scopedPool) {
        items.push({ kind: 'apt', key: `dong-${apt.name}`, apt, section: 'all' });
      }
    }
    return items;
  }, [
    trimmedSearch,
    primarySearchMatches,
    crossDongSearchMatches,
    selectedDong,
    favoriteResolvedApts,
    recentResolvedApts,
    defaultResolvedApts,
    dongsData.allApts,
    scopedPool,
  ]);

  // Keep activeIndex pointing to top match when typing
  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedSearch, selectedDong]);

  // Scroll active option into view during keyboard navigation
  useEffect(() => {
    if (!isDropdownOpen || !listboxRef.current) return;
    const activeEl = listboxRef.current.querySelector(
      `[data-nav-index="${activeIndex}"]`
    ) as HTMLElement | null;
    activeEl?.scrollIntoView?.({ block: 'nearest' });
  }, [activeIndex, isDropdownOpen]);

  const handleSelectMacroAll = useCallback(() => {
    setSelectedTimelineApt(null);
    setSearchQuery('');
    setIsDropdownOpen(false);
  }, [setSelectedTimelineApt]);

  const handleSelectApartment = useCallback(
    (apt: EnrichedCatalogApt, isCrossDong = false) => {
      const activeSearch = searchQuery.trim();
      if (activeSearch) {
        if (lastTrackedSearchQueryRef.current !== activeSearch) {
          lastTrackedSearchQueryRef.current = activeSearch;
          trackEvent('search_apartment', { query: activeSearch, surface: 'dashboard_chart' });
        }
        trackSearchQuery({
          search_term: activeSearch,
          query: activeSearch,
          selected_apt: apt.name,
          surface: 'dashboard_chart',
          trigger: 'combobox_select',
          results_count: searchMatchCountRef.current,
        });
      }
      trackApartmentView({
        apartment_name: apt.name,
        apt_name: apt.name,
        dong: apt.dong || undefined,
        surface: 'dashboard_chart',
        trigger: activeSearch ? 'search_select' : 'combobox_select',
        view_type: 'chart_preview',
      });
      setSelectedTimelineApt(apt.name);
      if (isCrossDong) {
        setSelectedDong('all');
      }
      setRecentApts(addRecentApartment({ name: apt.name, dong: apt.dong }));
      onHoverApt?.(apt.name);
      preloadApartmentModal();
      setSearchQuery('');
      setIsDropdownOpen(false);
    },
    [searchQuery, setSelectedTimelineApt, onHoverApt, preloadApartmentModal]
  );

  const handleRemoveRecent = useCallback(
    (e: React.MouseEvent, aptName: string) => {
      e.preventDefault();
      e.stopPropagation();
      setRecentApts(removeRecentApartment(aptName));
    },
    []
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const nativeEvt = e.nativeEvent as KeyboardEvent & { isComposing?: boolean; keyCode?: number };
      const isComposing =
        isImeComposingRef.current ||
        Boolean(nativeEvt?.isComposing) ||
        Boolean((e as unknown as { isComposing?: boolean }).isComposing) ||
        e.keyCode === 229 ||
        nativeEvt?.keyCode === 229;

      if (isComposing && (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        return;
      }

      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isDropdownOpen) {
          setIsDropdownOpen(true);
          setActiveIndex(0);
          return;
        }
        if (navigableItems.length > 0) {
          setActiveIndex((prev) => (prev + 1) % navigableItems.length);
        }
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isDropdownOpen) {
          setIsDropdownOpen(true);
          setActiveIndex(0);
          return;
        }
        if (navigableItems.length > 0) {
          setActiveIndex((prev) => (prev - 1 + navigableItems.length) % navigableItems.length);
        }
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (navigableItems.length === 0) {
          const activeSearch = searchQuery.trim();
          if (activeSearch) {
            trackSearchQuery({
              search_term: activeSearch,
              query: activeSearch,
              surface: 'dashboard_chart',
              trigger: 'enter_no_match',
              results_count: 0,
            });
          }
          return;
        }
        const safeIndex =
          activeIndex >= 0 && activeIndex < navigableItems.length ? activeIndex : 0;
        const targetItem = navigableItems[safeIndex];
        if (!targetItem) return;
        if (targetItem.kind === 'macro-all') {
          handleSelectMacroAll();
        } else {
          handleSelectApartment(targetItem.apt, targetItem.isCrossDong);
        }
      }
    },
    [
      isDropdownOpen,
      navigableItems,
      activeIndex,
      searchQuery,
      handleSelectMacroAll,
      handleSelectApartment,
    ]
  );

  const navIndexByKey = useMemo(() => {
    const map = new Map<string, number>();
    navigableItems.forEach((item, idx) => {
      map.set(item.key, idx);
    });
    return map;
  }, [navigableItems]);

  const renderAptOptionRow = (
    apt: EnrichedCatalogApt,
    itemKey: string,
    opts?: {
      highlightQuery?: string;
      isRecentRow?: boolean;
      isCrossDong?: boolean;
    }
  ) => {
    const navIdx = navIndexByKey.get(itemKey) ?? -1;
    const isHighlightedRow = navIdx === activeIndex;
    const isCurrentlySelected =
      selectedTimelineApt === apt.name ||
      (selectedTimelineApt &&
        getDisplayAptName(selectedTimelineApt) === apt.displayName);
    const segments = opts?.highlightQuery
      ? getHighlightSegments(apt.displayName, opts.highlightQuery)
      : [{ text: apt.displayName, highlighted: false }];
    const isRowFavorite = isApartmentInFavorites(
      effectiveUserFavorites,
      apt.name,
      nameMapping
    );

    return (
      <div
        key={itemKey}
        data-nav-index={navIdx}
        role="option"
        aria-selected={Boolean(isCurrentlySelected)}
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={() => {
          if (navIdx >= 0) setActiveIndex(navIdx);
          onHoverApt?.(apt.name);
        }}
        onClick={() => handleSelectApartment(apt, opts?.isCrossDong)}
        className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors ${
          isHighlightedRow
            ? 'bg-blue-50/90 dark:bg-blue-950/40'
            : 'hover:bg-[#f9fafb] dark:hover:bg-[#202027]'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {opts?.isRecentRow && (
            <Clock size={12} className="text-tertiary shrink-0" />
          )}
          <span className="text-[12.5px] font-bold text-primary truncate">
            {segments.map((seg, idx) =>
              seg.highlighted ? (
                <span
                  key={idx}
                  className="text-blue-600 dark:text-blue-400 font-black"
                >
                  {seg.text}
                </span>
              ) : (
                <React.Fragment key={idx}>{seg.text}</React.Fragment>
              )
            )}
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-[#f2f4f6] dark:bg-[#202027] text-[10.5px] font-bold text-secondary shrink-0">
            {apt.dong}
          </span>
          {isCurrentlySelected && (
            <Check size={12} className="text-blue-600 dark:text-blue-400 shrink-0" />
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {apt.realPriceLabel ? (
            <span className="text-[11.5px] font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {apt.realPriceLabel}
            </span>
          ) : apt.householdCount ? (
            <span className="text-[11px] font-semibold text-tertiary tabular-nums">
              {apt.householdCount.toLocaleString()}세대
            </span>
          ) : null}

          <button
            type="button"
            data-testid={`combobox-fav-toggle-${apt.name}`}
            aria-label={`${apt.displayName} ${isRowFavorite ? '관심단지 해제' : '관심단지 저장'}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              trackEvent('watchlist_toggle_favorite', {
                apt_name: apt.name,
                is_favorite: !isRowFavorite,
                source: 'chart_combobox',
              });
              effectiveToggleFavorite(apt.name);
            }}
            className="p-0.5 rounded-md text-tertiary hover:text-blue-600 dark:hover:text-blue-400 hover:bg-[#f2f4f6] dark:hover:bg-[#2c2c35] transition-colors cursor-pointer"
          >
            <Star
              size={12}
              className={
                isRowFavorite
                  ? 'fill-blue-500 text-blue-600 dark:text-blue-400'
                  : 'text-tertiary hover:text-blue-500'
              }
            />
          </button>

          {opts?.isRecentRow && (
            <button
              type="button"
              aria-label={`${apt.displayName} 최근 검색 기록 삭제`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => handleRemoveRecent(e, apt.name)}
              className="p-0.5 rounded-md text-tertiary hover:text-primary hover:bg-[#f2f4f6] dark:hover:bg-[#2c2c35] transition-colors cursor-pointer"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>
    );
  };

  const totalSearchCount = primarySearchMatches.length + crossDongSearchMatches.length;
  searchMatchCountRef.current = totalSearchCount;

  const idlePlaceholder = selectedTimelineApt
    ? `${getDisplayAptName(selectedTimelineApt)} · 단지명/초성 검색`
    : '전체 추이 보기 · 단지명/초성 검색';

  return (
    <div className={`w-full flex flex-col gap-4 min-w-0 lg:h-[526px] box-border ${className || ''}`}>
      {/* Right Panel: Interactive Market Feed & Trend */}
      <div className="w-full flex flex-col bg-surface pb-2 flex-1 lg:h-[526px] min-h-[420px] min-w-0 box-border justify-between">
        <div className="flex-1 flex flex-col min-h-[260px] md:min-h-[300px]">
          {/* Header Row: Title & Action + Timeframe (relative z-20 so Zero-CLS combobox popover floats cleanly over chart) */}
          <div className="relative z-20 flex flex-col gap-3 mb-4 pb-3.5 border-b border-border/40 w-full min-w-0">
            <div className="flex justify-between items-center w-full gap-2 flex-wrap">
              {/* Title & Detail CTA */}
              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                <h3 className="text-[14.5px] sm:text-[15.5px] font-black text-primary tracking-tight flex items-center gap-1.5 break-keep">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                  <span>
                    {selectedTimelineApt
                      ? `${getDisplayAptName(selectedTimelineApt)} 시세 추이`
                      : '동탄 아파트 시세 추이'}
                  </span>
                </h3>

                {selectedTimelineApt && !isDefaultAptSettingUp && (
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button
                      type="button"
                      data-testid="chart-header-favorite-cta"
                      aria-pressed={isSelectedAptFavorite}
                      aria-label={`${getDisplayAptName(selectedTimelineApt)} ${
                        isSelectedAptFavorite ? '관심단지 해제' : '관심단지 저장'
                      }`}
                      onClick={() => {
                        trackEvent('watchlist_toggle_favorite', {
                          apt_name: selectedTimelineApt,
                          is_favorite: !isSelectedAptFavorite,
                          source: 'chart_header',
                        });
                        effectiveToggleFavorite(selectedTimelineApt);
                      }}
                      className={`px-2.5 py-1 border-none rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-2xs ${
                        isSelectedAptFavorite
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-slate-100 hover:bg-blue-50 text-secondary hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-400'
                      }`}
                    >
                      <Star
                        size={11}
                        className={isSelectedAptFavorite ? 'fill-current shrink-0' : 'shrink-0'}
                      />
                      <span>{isSelectedAptFavorite ? '관심단지 저장됨' : '관심단지'}</span>
                    </button>
                    {onOpenMortgageModal && (
                      <button
                        type="button"
                        data-testid="chart-header-mortgage-cta"
                        onClick={() => onOpenMortgageModal(selectedTimelineApt)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 dark:text-emerald-400 border-none rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-2xs"
                      >
                        대출·한도 계산
                      </button>
                    )}
                    <button
                      type="button"
                      data-testid="chart-header-detail-cta"
                      onClick={() => onSelectApt && onSelectApt(selectedTimelineApt, currentAptObj?.dong)}
                      onMouseEnter={() => onHoverApt && onHoverApt(selectedTimelineApt)}
                      onTouchStart={() => onHoverApt && onHoverApt(selectedTimelineApt)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 dark:text-blue-400 border-none rounded-xl text-[11px] font-extrabold cursor-pointer transition-colors shrink-0 flex items-center gap-1 shadow-xs"
                    >
                      <span>상세 리포트 보기</span>
                      <ArrowRight size={11} strokeWidth={2.5} className="shrink-0" />
                    </button>
                  </div>
                )}
              </div>

              {/* Timeframe Selector (3M, 6M, 1Y, 3Y, 5Y, ALL) */}
              <TimeframeSelector
                timeframe={timeframe}
                setTimeframe={setTimeframe}
              />
            </div>

            {/* Filter Bar: Region Select + Unified Searchable Apartment Combobox */}
            {isDefaultAptSettingUp ? (
              <div className="w-full h-[34px] sm:h-[36px] bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800/50 dark:to-slate-800/30 rounded-[10px] animate-pulse" />
            ) : (
              mounted && (
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full min-w-0 pt-0.5">
                  {/* 1. Dong (Region) Filter */}
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      aria-label="아파트 지역 필터 선택"
                      value={selectedDong}
                      onChange={(e) => {
                        setSelectedDong(e.target.value);
                        setSearchQuery('');
                      }}
                      className={getControlSelectClass('shrink-0 tabular-nums')}
                    >
                      <option value="all">동탄 전체 ({dongsData.allApts.length}개 단지)</option>
                      <option value="default">대표 4개 단지</option>
                      {dongsData.dongs.map((dong) => {
                        const count = dongsData.allApts.filter((a) => a.dong === dong).length;
                        return (
                          <option key={dong} value={dong}>
                            {dong} ({count})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 2. Unified Searchable Apartment Combobox */}
                  <div
                    ref={comboboxRef}
                    className="relative flex-1 min-w-[180px] w-full"
                  >
                    <div className="relative flex items-center w-full">
                      <Search
                        size={13.5}
                        strokeWidth={2.4}
                        className="absolute left-3 text-tertiary pointer-events-none"
                      />
                      <input
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-expanded={isDropdownOpen}
                        aria-controls="chart-apt-combobox-listbox"
                        aria-autocomplete="list"
                        aria-label="단지명 실시간 검색"
                        value={searchQuery}
                        placeholder={
                          isDropdownOpen
                            ? '단지명·동·초성 검색 (예: 힐스테이트 동탄역, ㄹㄷㅋㅅ)'
                            : idlePlaceholder
                        }
                        onFocus={() => {
                          setRecentApts(getRecentApartments());
                          setIsDropdownOpen(true);
                          preloadApartmentModal();
                        }}
                        onClick={() => {
                          if (!isDropdownOpen) {
                            setRecentApts(getRecentApartments());
                            setIsDropdownOpen(true);
                          }
                        }}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (!isDropdownOpen) {
                            setIsDropdownOpen(true);
                          }
                        }}
                        onCompositionStart={() => {
                          isImeComposingRef.current = true;
                        }}
                        onCompositionEnd={() => {
                          isImeComposingRef.current = false;
                        }}
                        onKeyDown={handleInputKeyDown}
                        className={getControlInputClass(
                          `w-full pl-8 pr-8 ${
                            !isDropdownOpen && !searchQuery && selectedTimelineApt
                              ? 'placeholder:text-primary placeholder:font-extrabold'
                              : ''
                          }`
                        )}
                      />

                      {searchQuery ? (
                        <button
                          type="button"
                          aria-label="검색어 지우기"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSearchQuery('');
                            setIsDropdownOpen(true);
                            inputRef.current?.focus();
                          }}
                          className="absolute right-2.5 p-0.5 rounded-md text-tertiary hover:text-primary transition-colors cursor-pointer"
                        >
                          <X size={13.5} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          aria-label="시세 그래프 조회 아파트 선택"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            if (isDropdownOpen) {
                              setIsDropdownOpen(false);
                            } else {
                              setRecentApts(getRecentApartments());
                              setIsDropdownOpen(true);
                              inputRef.current?.focus();
                            }
                          }}
                          className="absolute right-2.5 p-0.5 rounded-md text-tertiary hover:text-primary transition-colors cursor-pointer"
                        >
                          <ChevronDown
                            size={14}
                            className={`transition-transform duration-150 ${
                              isDropdownOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Zero-CLS Floating Combobox Listbox */}
                    {isDropdownOpen && (
                      <div
                        ref={listboxRef}
                        id="chart-apt-combobox-listbox"
                        role="listbox"
                        aria-label="시세 그래프 조회 아파트 검색 목록"
                        className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-surface dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#2c2c35] rounded-2xl shadow-xl max-h-[320px] overflow-y-auto p-1.5 flex flex-col gap-1"
                      >
                        {trimmedSearch ? (
                          totalSearchCount === 0 ? (
                            <div className="px-3 py-5 text-center flex flex-col items-center gap-1.5">
                              <span className="text-[12.5px] font-extrabold text-secondary">
                                일치하는 아파트 단지가 없습니다
                              </span>
                              <span className="text-[11px] font-medium text-tertiary">
                                단지명 일부나 초성(예: 동탄역 힐스테이트, ㄹㄷㅋㅅ)으로 검색해 보세요
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className="px-2.5 pt-1 pb-0.5 flex items-center justify-between text-[10.5px] font-extrabold text-tertiary">
                                <span className="tabular-nums">
                                  검색 결과 {totalSearchCount}개
                                </span>
                                <span>Enter로 바로 선택</span>
                              </div>

                              {primarySearchMatches.map((apt) =>
                                renderAptOptionRow(apt, `search-${apt.name}`, {
                                  highlightQuery: trimmedSearch,
                                })
                              )}

                              {crossDongSearchMatches.length > 0 && (
                                <>
                                  <div className="px-2.5 pt-2 pb-0.5 mt-0.5 border-t border-[#f2f4f6] dark:border-[#202027] text-[10.5px] font-extrabold text-tertiary">
                                    다른 법정동 검색 결과 ({crossDongSearchMatches.length}개)
                                  </div>
                                  {crossDongSearchMatches.map((apt) =>
                                    renderAptOptionRow(apt, `cross-${apt.name}`, {
                                      highlightQuery: trimmedSearch,
                                      isCrossDong: true,
                                    })
                                  )}
                                </>
                              )}
                            </>
                          )
                        ) : (
                          <>
                            {/* Macro All Option */}
                            <div
                              data-testid="combobox-option-macro-all"
                              data-nav-index={navIndexByKey.get('macro-all') ?? 0}
                              role="option"
                              aria-selected={selectedTimelineApt === null}
                              onMouseDown={(e) => e.preventDefault()}
                              onMouseEnter={() =>
                                setActiveIndex(navIndexByKey.get('macro-all') ?? 0)
                              }
                              onClick={handleSelectMacroAll}
                              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors ${
                                activeIndex === (navIndexByKey.get('macro-all') ?? 0)
                                  ? 'bg-blue-50/90 dark:bg-blue-950/40'
                                  : 'hover:bg-[#f9fafb] dark:hover:bg-[#202027]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[12.5px] font-extrabold text-blue-600 dark:text-blue-400 truncate">
                                  전체 추이 보기 (동탄 매크로 평균)
                                </span>
                              </div>
                              {selectedTimelineApt === null && (
                                <Check
                                  size={12}
                                  className="text-blue-600 dark:text-blue-400 shrink-0"
                                />
                              )}
                            </div>

                            {/* Saved Favorite Apartments */}
                            {selectedDong === 'all' && favoriteResolvedApts.length > 0 && (
                              <div className="pt-1 border-t border-[#f2f4f6] dark:border-[#202027]">
                                <div className="px-2.5 py-1 text-[10.5px] font-extrabold text-blue-600 dark:text-blue-400 flex items-center justify-between tabular-nums">
                                  <span>내 관심단지 ({favoriteResolvedApts.length})</span>
                                </div>
                                {favoriteResolvedApts.map((apt) =>
                                  renderAptOptionRow(apt, `fav-${apt.name}`)
                                )}
                              </div>
                            )}

                            {/* Recent Apartments */}
                            {selectedDong === 'all' && recentResolvedApts.length > 0 && (
                              <div className="pt-1 border-t border-[#f2f4f6] dark:border-[#202027]">
                                <div className="px-2.5 py-1 text-[10.5px] font-extrabold text-tertiary">
                                  최근 조회한 단지
                                </div>
                                {recentResolvedApts.map((apt) =>
                                  renderAptOptionRow(apt, `recent-${apt.name}`, {
                                    isRecentRow: true,
                                  })
                                )}
                              </div>
                            )}

                            {/* Representative Apartments */}
                            {(selectedDong === 'all' || selectedDong === 'default') &&
                              defaultResolvedApts.length > 0 && (
                                <div className="pt-1 border-t border-[#f2f4f6] dark:border-[#202027]">
                                  <div className="px-2.5 py-1 text-[10.5px] font-extrabold text-tertiary">
                                    동탄 대표 단지
                                  </div>
                                  {defaultResolvedApts.map((apt) =>
                                    renderAptOptionRow(apt, `default-${apt.name}`)
                                  )}
                                </div>
                              )}

                            {/* All / Dong-specific Apartments */}
                            {selectedDong === 'all' ? (
                              <div className="pt-1 border-t border-[#f2f4f6] dark:border-[#202027]">
                                <div className="px-2.5 py-1 text-[10.5px] font-extrabold text-tertiary tabular-nums">
                                  전체 단지 ({dongsData.allApts.length}개)
                                </div>
                                {dongsData.allApts.map((apt) =>
                                  renderAptOptionRow(apt, `all-${apt.name}`)
                                )}
                              </div>
                            ) : selectedDong !== 'default' ? (
                              <div className="pt-1 border-t border-[#f2f4f6] dark:border-[#202027]">
                                <div className="px-2.5 py-1 text-[10.5px] font-extrabold text-tertiary tabular-nums">
                                  {selectedDong} 아파트 ({scopedPool.length}개)
                                </div>
                                {scopedPool.map((apt) =>
                                  renderAptOptionRow(apt, `dong-${apt.name}`)
                                )}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="w-full flex-1 min-h-[240px] md:min-h-[280px] relative z-10 overflow-hidden mt-2 sm:mt-0">
            {isDefaultAptSettingUp || (isAptTxLoading && !aptRealTxData && !!selectedTimelineApt) ? (
              <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center bg-slate-50/30 dark:bg-slate-900/10 border border-border/30 rounded-2xl animate-pulse relative overflow-hidden">
                <div className="absolute w-[180px] h-[180px] rounded-full bg-blue-50/60 blur-[60px] top-1/2 left-1/3 -translate-y-1/2 pointer-events-none" />
                <div className="absolute w-[180px] h-[180px] rounded-full bg-emerald-500/5 blur-[60px] top-1/2 right-1/3 -translate-y-1/2 pointer-events-none" />

                <div className="flex items-center gap-1.5 mb-3.5 flex-none">
                  <div className="w-1.5 h-6 bg-blue-600/30 rounded-full animate-bounce duration-500 delay-100" />
                  <div className="w-1.5 h-10 bg-blue-600/40 rounded-full animate-bounce duration-500 delay-200" />
                  <div className="w-1.5 h-14 bg-blue-600/60 rounded-full animate-bounce duration-500 delay-300" />
                  <div className="w-1.5 h-10 bg-emerald-500/50 rounded-full animate-bounce duration-500 delay-400" />
                  <div className="w-1.5 h-12 bg-emerald-500/60 rounded-full animate-bounce duration-500 delay-500" />
                  <div className="w-1.5 h-8 bg-emerald-500/40 rounded-full animate-bounce duration-500 delay-600" />
                </div>

                <span className="text-secondary text-[12.5px] font-extrabold mb-1.5 tracking-tight">
                  관심 단지 정보를 분석하고 있습니다...
                </span>
                <span className="text-[10px] text-tertiary font-bold opacity-75">
                  내 자산 가치에 맞춘 전용 리포트를 생성하는 중입니다.
                </span>
              </div>
            ) : (
              renderChart()
            )}
          </div>

          {selectedTimelineApt && (!mainLineData || mainLineData.length === 0) && !isAptTxLoading && !isDefaultAptSettingUp && (
            <div className="text-[10.5px] text-tertiary text-center mt-1.5 font-medium flex items-center justify-center gap-1">
              <span>※ 개별 실거래 세부내역 수집 대기 중인 단지입니다.</span>
            </div>
          )}
        </div>
      </div>

      {/* Traffic notice board widget */}
      {trafficNoticeBoardNode}
    </div>
  );
});
