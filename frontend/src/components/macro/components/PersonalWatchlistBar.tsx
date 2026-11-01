'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Sparkles,
  Star,
  Plus,
  Search,
  Building2,
  TrendingUp,
  TrendingDown,
  X,
  Check,
} from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { getRecentApartments, addRecentApartment, type RecentApartmentItem } from '@/lib/utils/recentApartments';
import { formatPriceEok } from '@/lib/analytics/statsEngine';
import { normalizeAptName, getDisplayAptName, isSameApartment } from '@/lib/utils/apartmentMapping';
import { filterAndRankApartments } from '@/lib/utils/apartmentSearch';
import { trackEvent } from '@/lib/utils/analytics';
import type { DongApartment } from '@/lib/dong-apartments';
import type { AptTxSummary, RecentTransaction } from '@/types';

export interface PersonalWatchlistBarProps {
  recentTransactions?: RecentTransaction[];
  txSummaryData?: Record<string, AptTxSummary>;
  sheetApartments?: Record<string, DongApartment[]>;
  favoriteCounts?: Record<string, number>;
  onSelectApt?: (aptName: string, dong?: string) => void;
  className?: string;
}

const FALLBACK_POPULAR_APTS = [
  '동탄역 롯데캐슬',
  '동탄역 시범 한화꿈에그린 프레스티지',
  '동탄역 시범 더샵 센트럴시티',
  '동탄역 시범 우남퍼스트빌',
  '동탄린스트라우스더레이크',
];

function getTxTimestamp(tx: RecentTransaction): number {
  const dStr = tx.registeredDate || tx.contractDate || tx.date;
  if (!dStr) return 0;
  const digits = dStr.replace(/[^0-9]/g, '');
  if (digits.length >= 8) {
    const y = parseInt(digits.substring(0, 4), 10);
    const m = parseInt(digits.substring(4, 6), 10) - 1;
    const d = parseInt(digits.substring(6, 8), 10);
    return new Date(y, m, d).getTime();
  }
  const t = new Date(dStr).getTime();
  return isNaN(t) ? 0 : t;
}

function formatDeltaPrice(delta: number): string {
  if (!delta || delta === 0) return '보합';
  const abs = Math.abs(delta);
  if (abs >= 10000) {
    const eok = Math.floor(abs / 10000);
    const remainder = abs % 10000;
    return remainder > 0 ? `${eok}억 ${remainder.toLocaleString()}만` : `${eok}억`;
  }
  return `${abs.toLocaleString()}만`;
}

export const PersonalWatchlistBar = React.memo(function PersonalWatchlistBar({
  recentTransactions,
  txSummaryData,
  sheetApartments,
  favoriteCounts: externalFavoriteCounts,
  onSelectApt,
  className = '',
}: PersonalWatchlistBarProps) {
  const [mounted, setMounted] = useState(false);
  const [lastVisitTs, setLastVisitTs] = useState<number | null>(null);
  const [recentApts, setRecentApts] = useState<RecentApartmentItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const {
    userFavorites,
    handleToggleFavorite,
    favoriteCounts: hookFavoriteCounts,
  } = useFavorites();

  const combinedFavoriteCounts = externalFavoriteCounts || hookFavoriteCounts || {};

  // Hydration-safe initial mount & localStorage reading
  useEffect(() => {
    setMounted(true);
    let previousTs: number | null = null;
    try {
      const stored = window.localStorage.getItem('dview_last_visit_ts');
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= Date.now()) {
          previousTs = parsed;
        }
      }
      // Update with current visit timestamp after reading previous
      window.localStorage.setItem('dview_last_visit_ts', Date.now().toString());
    } catch {
      // storage unavailable / security exception fallback
    }
    setLastVisitTs(previousTs);
    setRecentApts(getRecentApartments());
  }, []);

  // Sync recent apartments on storage update
  useEffect(() => {
    const handleStorageChange = () => {
      setRecentApts(getRecentApartments());
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('dview_favorites_updated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('dview_favorites_updated', handleStorageChange);
    };
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute live Delta
  const cutoffTs = useMemo(() => {
    if (lastVisitTs !== null && !isNaN(lastVisitTs)) {
      return lastVisitTs;
    }
    // First visit: last 7 days
    return Date.now() - 7 * 24 * 60 * 60 * 1000;
  }, [lastVisitTs]);

  const newTransactions = useMemo(() => {
    if (!recentTransactions || recentTransactions.length === 0) return [];
    return recentTransactions.filter((tx) => getTxTimestamp(tx) > cutoffTs);
  }, [recentTransactions, cutoffTs]);

  const totalNewCount = newTransactions.length;

  const favoritesNewCount = useMemo(() => {
    if (userFavorites.size === 0 || newTransactions.length === 0) return 0;
    return newTransactions.filter(
      (tx) =>
        userFavorites.has(tx.aptName) ||
        userFavorites.has(normalizeAptName(tx.aptName))
    ).length;
  }, [newTransactions, userFavorites]);

  // All apartments index for quick search
  const allApartmentsList = useMemo(() => {
    if (!sheetApartments) return [];
    const list: { name: string; dong: string }[] = [];
    const seen = new Set<string>();
    Object.entries(sheetApartments).forEach(([dong, apts]) => {
      apts.forEach((apt) => {
        if (!seen.has(apt.name)) {
          seen.add(apt.name);
          list.push({ name: apt.name, dong: apt.dong || dong });
        }
      });
    });
    return list;
  }, [sheetApartments]);

  // Filtered search results
  const filteredSearchResults = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];
    return filterAndRankApartments(allApartmentsList, q).slice(0, 6);
  }, [searchQuery, allApartmentsList]);

  // Watchlist items (Favorites take priority, then recent apartments)
  const watchlistItems = useMemo(() => {
    const items: { name: string; dong: string; isFavorite: boolean }[] = [];
    const added = new Set<string>();

    // 1. Favorites
    userFavorites.forEach((favName) => {
      added.add(favName);
      added.add(normalizeAptName(favName));
      // find dong from sheetApartments or recentApts
      const recentMatch = recentApts.find(
        (r) => r.name === favName || normalizeAptName(r.name) === normalizeAptName(favName)
      );
      const sheetMatch = allApartmentsList.find(
        (a) => a.name === favName || normalizeAptName(a.name) === normalizeAptName(favName)
      );
      items.push({
        name: favName,
        dong: recentMatch?.dong || sheetMatch?.dong || '',
        isFavorite: true,
      });
    });

    // 2. If user has no favorites, show recent apartments
    if (items.length === 0) {
      recentApts.forEach((apt) => {
        const norm = normalizeAptName(apt.name);
        if (!added.has(apt.name) && !added.has(norm)) {
          added.add(apt.name);
          added.add(norm);
          items.push({
            name: apt.name,
            dong: apt.dong,
            isFavorite: false,
          });
        }
      });
    }

    return items;
  }, [userFavorites, recentApts, allApartmentsList]);

  // Cold Start Top 5 Onboarding Candidates
  const coldStartCandidates = useMemo(() => {
    // 1. Try favoriteCounts
    const sortedFavKeys = Object.entries(combinedFavoriteCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .filter((name) => name && name.trim().length > 0);

    if (sortedFavKeys.length >= 5) {
      return sortedFavKeys.slice(0, 5);
    }

    // 2. Fallback: Most frequent apartments in recentTransactions
    if (recentTransactions && recentTransactions.length > 0) {
      const freq: Record<string, number> = {};
      recentTransactions.forEach((tx) => {
        if (tx.aptName) {
          freq[tx.aptName] = (freq[tx.aptName] || 0) + 1;
        }
      });
      const topTxs = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);

      const combined = Array.from(new Set([...sortedFavKeys, ...topTxs]));
      if (combined.length >= 5) {
        return combined.slice(0, 5);
      }
    }

    // 3. Fallback: hardcoded verified landmarks
    return Array.from(new Set([...sortedFavKeys, ...FALLBACK_POPULAR_APTS])).slice(0, 5);
  }, [combinedFavoriteCounts, recentTransactions]);

  const handleComplexSelect = useCallback(
    (name: string, dong?: string) => {
      addRecentApartment({ name, dong: dong || '' });
      setRecentApts(getRecentApartments());
      trackEvent('watchlist_card_click', { apt_name: name, surface: 'zone1_bar' });
      onSelectApt?.(name, dong);
    },
    [onSelectApt]
  );

  const handleToggleFav = useCallback(
    async (aptName: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const willBeFav = !userFavorites.has(aptName);
      trackEvent('watchlist_toggle_favorite', {
        apt_name: aptName,
        is_favorite: willBeFav,
        is_favorited: willBeFav,
        source: 'watchlist',
        surface: 'zone1_bar',
      });
      await handleToggleFavorite(aptName);
    },
    [userFavorites, handleToggleFavorite]
  );

  const handleOnboardingChipClick = useCallback(
    async (aptName: string) => {
      trackEvent('watchlist_onboarding_chip_click', { apt_name: aptName });
      await handleToggleFavorite(aptName);
      handleComplexSelect(aptName);
    },
    [handleToggleFavorite, handleComplexSelect]
  );

  const handleDeltaBadgeClick = useCallback(() => {
    trackEvent('delta_badge_click', {
      delta_count: totalNewCount,
      new_tx_count: totalNewCount,
      favorites_tx_count: favoritesNewCount,
    });
  }, [totalNewCount, favoritesNewCount]);

  // Loading skeleton during SSR to guarantee Zero-CLS
  if (!mounted) {
    return (
      <div
        data-testid="personal-watchlist-bar"
        className={`w-full bg-surface border-b border-border/60 py-3 px-4 sm:px-6 md:px-10 lg:px-16 min-h-[88px] sm:min-h-[96px] box-border animate-pulse ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="h-6 w-72 bg-black/5 dark:bg-white/5 rounded-full" />
          <div className="h-8 w-48 bg-black/5 dark:bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  const isColdStart = watchlistItems.length === 0;

  return (
    <section
      data-testid="personal-watchlist-bar"
      aria-label="방문 간 실거래 변동 브리핑 및 내 관심단지 워치리스트"
      className={`w-full bg-surface border-b border-border/60 py-3.5 px-4 sm:px-6 md:px-10 lg:px-16 box-border transition-colors ${className}`}
    >
      <div className="flex flex-col gap-3 max-w-[2000px] mx-auto min-w-0">
        {/* Top Control Row: Delta Badge & Integrated Search Input */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 min-w-0">
          {/* Live Delta Badge */}
          <button
            type="button"
            onClick={handleDeltaBadgeClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50/90 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200/60 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 transition-colors w-fit text-left cursor-pointer group"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 group-hover:rotate-12 transition-transform" />
            <span className="text-[11.5px] sm:text-[12.5px] font-extrabold tracking-tight tabular-nums">
              {lastVisitTs !== null
                ? `지난 방문 이후 동탄 신규 실거래 +${totalNewCount}건 · 내 관심단지 ${favoritesNewCount}건`
                : `동탄 최근 7일 신규 실거래 +${totalNewCount}건`}
            </span>
          </button>

          {/* Integrated Apartment Search Input */}
          <div ref={searchContainerRef} className="relative w-full sm:w-64 md:w-72 shrink-0">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="단지명 빠른 검색..."
                aria-label="단지명 검색"
                className="w-full pl-8 pr-7 py-1.5 text-[12px] font-bold bg-slate-50 dark:bg-slate-900/60 border border-border/80 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl outline-hidden text-primary placeholder:text-slate-400 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="검색어 지우기"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Menu */}
            {isSearchOpen && searchQuery.trim() && (
              <div className="absolute top-full mt-1.5 left-0 right-0 z-50 bg-surface border border-border rounded-xl shadow-lg overflow-hidden py-1 max-h-56 overflow-y-auto">
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((apt) => (
                    <button
                      key={`${apt.dong}-${apt.name}`}
                      type="button"
                      onClick={() => {
                        handleComplexSelect(apt.name, apt.dong);
                        setSearchQuery('');
                        setIsSearchOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <span className="text-[12px] font-bold text-primary truncate">
                        {getDisplayAptName(apt.name)}
                      </span>
                      <span className="text-[10px] text-tertiary shrink-0 ml-2">
                        {apt.dong}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2.5 text-[11px] text-tertiary text-center">
                    일치하는 단지가 없습니다.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Watchlist Strip: Returning Cards OR Cold-Start Onboarding Chips */}
        {!isColdStart ? (
          <div className="w-full flex items-center gap-2.5 overflow-x-auto no-scrollbar py-1 scroll-smooth">
            {watchlistItems.map((item) => {
              const summary =
                txSummaryData?.[item.name] ||
                txSummaryData?.[normalizeAptName(item.name)];
              const latestTx = recentTransactions?.find(
                (t) =>
                  t.aptName === item.name ||
                  normalizeAptName(t.aptName) === normalizeAptName(item.name)
              );

              const priceStr =
                summary?.latestPriceEok ||
                latestTx?.priceEok ||
                (summary?.latestPrice ? formatPriceEok(summary.latestPrice) : '실거래 집계 중');

              const deltaVal = latestTx?.delta ?? 0;
              const isRising = deltaVal > 0;
              const isFalling = deltaVal < 0;

              const isNew = newTransactions.some(
                (t) =>
                  t.aptName === item.name ||
                  normalizeAptName(t.aptName) === normalizeAptName(item.name)
              );

              return (
                <div
                  key={item.name}
                  data-testid={`watchlist-card-${item.name}`}
                  onClick={() => handleComplexSelect(item.name, item.dong)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-50/90 dark:bg-slate-900/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/40 border border-border/60 hover:border-blue-500/40 transition-all cursor-pointer shrink-0 min-w-[150px] max-w-[210px] group shadow-2xs"
                >
                  <button
                    type="button"
                    data-testid={`watchlist-fav-toggle-${item.name}`}
                    aria-label={`${item.name} 관심 단지 해제/등록`}
                    onClick={(e) => handleToggleFav(item.name, e)}
                    className="shrink-0 p-1 rounded-md text-blue-600 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        userFavorites.has(item.name)
                          ? 'fill-blue-500 text-blue-600'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[12px] font-extrabold text-primary truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {getDisplayAptName(item.name)}
                      </span>
                      {isNew && (
                        <span className="px-1 py-0.2 rounded text-[8.5px] font-black bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300 shrink-0">
                          NEW
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] tabular-nums font-bold">
                      <span className="text-secondary">{priceStr}</span>
                      {deltaVal !== 0 ? (
                        <span
                          className={`flex items-center text-[9.5px] font-extrabold ${
                            isRising
                              ? 'text-red-500'
                              : isFalling
                              ? 'text-blue-500'
                              : 'text-tertiary'
                          }`}
                        >
                          {isRising ? '+' : ''}
                          {formatDeltaPrice(deltaVal)}
                        </span>
                      ) : (
                        <span className="text-[9.5px] text-tertiary font-medium">보합</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Cold-Start Onboarding Strip */
          <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-0.5">
            <div className="flex items-center gap-1.5 text-[11.5px] sm:text-[12px] font-bold text-secondary">
              <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>관심 단지를 담아두면 다음 방문부터 새 실거래 변동을 브리핑해 드려요</span>
            </div>

            {/* Top 5 One-Click Onboarding Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 scroll-smooth">
              {coldStartCandidates.map((candidateName) => (
                <button
                  key={candidateName}
                  type="button"
                  data-testid={`watchlist-chip-${candidateName}`}
                  onClick={() => handleOnboardingChipClick(candidateName)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-border/60 hover:border-blue-400/60 text-secondary hover:text-blue-600 dark:hover:text-blue-300 text-[11px] font-extrabold transition-all shrink-0 cursor-pointer group"
                >
                  <Plus className="w-3 h-3 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  <span>{getDisplayAptName(candidateName)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
});

export default PersonalWatchlistBar;
