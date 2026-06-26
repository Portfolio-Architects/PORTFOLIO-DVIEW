'use client';

import React, { useState, useMemo, useRef, useEffect, useDeferredValue } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Search, ArrowUp, ArrowDown, ChevronDown, X, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { DONGS } from '@/lib/dongs';
import { findTxKey } from '@/lib/utils/apartmentMapping';
import { formatEokWithUnit } from '@/components/MacroDashboardClient';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { FieldReportData } from '@/lib/types/report.types';
import { trackEvent } from '@/lib/utils/analytics';

// subcomponents
import { EnrichedApt } from './explore/types';
import { FavoriteOrderEditor } from './explore/FavoriteOrderEditor';
import { SearchSuggestionDropdown } from './explore/SearchSuggestionDropdown';
import { AptRow } from './explore/AptRow';

const formatPrice = (priceMan: number) => {
  const { value, unit } = formatEokWithUnit(priceMan);
  return value + (unit === '만원' ? '만' : '');
};

const formatYearBuilt = (yearStr?: string | number) => {
  if (!yearStr) return '-';
  const str = String(yearStr).replace(/[^0-9]/g, '');
  
  let year = 0;
  let month = 1;
  
  if (str.length === 4) {
    year = parseInt(str);
  } else if (str.length >= 6) {
    year = parseInt(str.substring(0, 4));
    month = parseInt(str.substring(4, 6));
  } else {
    return `${String(yearStr)}년`;
  }
  
  if (isNaN(year)) return `${String(yearStr)}년`;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  let diffYears = currentYear - year;
  let diffMonths = currentMonth - month;
  
  if (diffMonths < 0) {
    diffYears--;
    diffMonths += 12;
  }
  
  let ageStr = '';
  if (diffYears < 0) {
    ageStr = '분양권';
  } else if (diffYears === 0 && diffMonths === 0) {
    ageStr = '신축';
  } else {
    ageStr = diffYears === 0 ? `${diffMonths}M` : `${diffYears + 1}년차`;
  }
  
  return ageStr;
};



interface TossApartmentExploreClientProps {
  sheetApartments: Record<string, DongApartment[]>;
  txSummaryData: Record<string, AptTxSummary>;
  nameMapping: Record<string, string>;
  fieldReportsMap: Map<string, FieldReportData>;
  publicRentalSet: Set<string>;
  userFavorites: Set<string>;
  favoriteCounts: Record<string, number>;
  typeMap: Record<string, Record<string, { typeM2: string; typePyeong: string }>>;
  handleSelectApt: (name: string) => void;
  onToggleFavorite: (name: string) => void;
  onOpenCompare?: () => void;
  onOpenJeonseSafety?: (aptName?: string) => void;
  onOpenMortgage?: (aptName?: string) => void;
  onSearchFocus?: () => void;
  preloadApartmentTx?: (apartmentName: string, dong: string) => void;
  updateFavoriteOrder?: (newOrder: string[]) => Promise<void>;
}

const TossApartmentExploreClientPropsSchema = z.object({
  sheetApartments: z.record(z.string(), z.array(z.any())),
  txSummaryData: z.record(z.string(), z.any()),
  nameMapping: z.record(z.string(), z.string()),
  favoriteCounts: z.record(z.string(), z.number()),
  typeMap: z.record(z.string(), z.any()),
});

const TossApartmentExploreClient = React.memo(function TossApartmentExploreClient({
  sheetApartments,
  txSummaryData,
  nameMapping,
  fieldReportsMap,
  publicRentalSet,
  userFavorites,
  favoriteCounts,
  typeMap,
  handleSelectApt,
  onToggleFavorite,
  onOpenCompare,
  onOpenJeonseSafety,
  onOpenMortgage,
  onSearchFocus,
  preloadApartmentTx,
  updateFavoriteOrder,
}: TossApartmentExploreClientProps) {
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const favoritesArray = useMemo(() => Array.from(userFavorites || []), [userFavorites]);
  const isResizingRef = useRef(false);
  const animationFrameIdRef = useRef<number | null>(null);
  const resizeListenersRef = useRef<{
    mousemove: ((e: MouseEvent) => void) | null;
    mouseup: (() => void) | null;
  }>({ mousemove: null, mouseup: null });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const startX = e.clientX;
    const startWidth = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      if (animationFrameIdRef.current) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
      }
      animationFrameIdRef.current = window.requestAnimationFrame(() => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(180, Math.min(380, startWidth + deltaX));
        setSidebarWidth(newWidth);
      });
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleMouseUp);
      resizeListenersRef.current = { mousemove: null, mouseup: null };
      if (animationFrameIdRef.current) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };

    resizeListenersRef.current = { mousemove: handleMouseMove, mouseup: handleMouseUp };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('blur', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      if (animationFrameIdRef.current) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
      }
      const { mousemove, mouseup } = resizeListenersRef.current;
      if (mousemove) window.removeEventListener('mousemove', mousemove);
      if (mouseup) {
        window.removeEventListener('mouseup', mouseup);
        window.removeEventListener('blur', mouseup);
      }
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []);

  const [currentCategory, setCurrentCategory] = useState<string>('rank-abs-price');
  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('search') || params.get('q') || '';
    }
    return '';
  });
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(15);
  const searchFocusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Sync URL search query parameters dynamically with state to support Sitelinks Searchbox
  useEffect(() => {
    if (!mounted) return;
    const params = new URLSearchParams(window.location.search);
    const currentQuery = params.get('search') || params.get('q') || '';
    if (searchQuery !== currentQuery) {
      if (searchQuery) {
        params.set('search', searchQuery);
        params.delete('q'); // Clean up old 'q' parameters
      } else {
        params.delete('search');
        params.delete('q');
      }
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash;
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchQuery, mounted]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (searchFocusTimeoutRef.current) {
        clearTimeout(searchFocusTimeoutRef.current);
        searchFocusTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const parsedProps = TossApartmentExploreClientPropsSchema.safeParse({
        sheetApartments,
        txSummaryData,
        nameMapping,
        favoriteCounts,
        typeMap,
      });
      if (!parsedProps.success) {
        logger.warn(
          'TossApartmentExploreClient.props',
          'Props validation failed',
          { errors: parsedProps.error.format() }
        );
      }
    }
  }, [sheetApartments, txSummaryData, nameMapping, favoriteCounts, typeMap]);


  const categories = useMemo(() => [
    { id: 'favorites', label: '내 관심' },
    { id: 'rank-abs-price', label: '매매가순' },
    { id: 'rank-price', label: '평당가순' },
    { id: 'rank-jeonse', label: '전세율순' },
    { id: 'rank-turnover', label: '회전율순' },
    { id: 'rank-views', label: '조회순' },
    ...DONGS.map(d => ({ id: `dong-${d.name}`, label: d.name }))
  ], []);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const debouncedSearchQueryForAnalytics = useDebounce(searchQuery, 1000);

  // 카테고리나 검색어 변경 시 노출 갯수를 15개로 초기화하여 CLS 방지
  useEffect(() => {
    setVisibleCount(15);
  }, [currentCategory, deferredSearchQuery]);

  useEffect(() => {
    if (mounted && debouncedSearchQueryForAnalytics.trim()) {
      trackEvent('search_apartment', { query: debouncedSearchQueryForAnalytics });
    }
  }, [debouncedSearchQueryForAnalytics, mounted]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [sortKey, setSortKey] = useState<string>('totalPrice');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleHeaderSort = (key: string) => {
    const targetKey = (key === 'views' && currentCategory === 'favorites') ? 'custom' : key;
    if (sortKey === targetKey) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(targetKey);
      setSortDirection(targetKey === 'custom' ? 'asc' : 'desc');
    }
    
    // 카테고리 하이라이트 동기화
    if (key === 'totalPrice') setCurrentCategory('rank-abs-price');
    else if (key === 'pyeongPrice') setCurrentCategory('rank-price');
    else if (key === 'ratio') setCurrentCategory('rank-jeonse');
    else if (key === 'volume3M') setCurrentCategory('custom-sort');
    else if (key === 'turnoverRate') setCurrentCategory('rank-turnover');
    else if (key === 'views') setCurrentCategory('rank-views');
    else if (key !== 'views' && currentCategory === 'favorites') {
      // Keep category as favorites
    } else setCurrentCategory('custom-sort');
  };

  useEffect(() => {
    if (currentCategory === 'rank-abs-price') {
      setSortKey('totalPrice');
      setSortDirection('desc');
    } else if (currentCategory === 'rank-price' || currentCategory.startsWith('dong-')) {
      setSortKey('pyeongPrice');
      setSortDirection('desc');
    } else if (currentCategory === 'rank-jeonse') {
      setSortKey('ratio');
      setSortDirection('desc');
    } else if (currentCategory === 'rank-turnover') {
      setSortKey('turnoverRate');
      setSortDirection('desc');
    } else if (currentCategory === 'rank-views') {
      setSortKey('views');
      setSortDirection('desc');
    } else if (currentCategory === 'favorites') {
      setSortKey('custom');
      setSortDirection('asc');
    }
  }, [currentCategory]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let scrollFrame: number | null = null;
    const handleScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 80);
        scrollFrame = null;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
    };
  }, []);
  
  const allApts = useMemo(() => {
    return Object.values(sheetApartments)
      .flat()
      .filter((a: DongApartment) => !publicRentalSet.has(a.name) && a.lat !== 0 && a.lng !== 0);
  }, [sheetApartments, publicRentalSet]);

  const enrichedApts = useMemo(() => {
    return allApts.map((apt: DongApartment) => {
      const rawKey = apt.txKey || apt.name;
      const txKey = findTxKey(rawKey, txSummaryData, nameMapping, false, apt.dong) || rawKey;

      const sum = txSummaryData[txKey];
      
      const pyeongPrice = sum?.avg1MPerPyeong || sum?.avg3MPerPyeong || (sum?.latestArea ? sum.latestPrice / (sum.latestArea / 3.3058) : 0);
      const sales = sum ? (sum.avg1MPrice || sum.avg3MPrice || sum.latestPrice || 0) : 0;
      const jeonse = sum ? (sum.avg1MRentDeposit || sum.avg3MRentDeposit || sum.latestRentDeposit || 0) : 0;
      const ratio = sales > 0 && jeonse > 0 ? (jeonse / sales) : 0;
      const dropRatio = sum && sum.maxPrice && sum.avg1MPrice && sum.maxPrice > sum.avg1MPrice ? (sum.maxPrice - sum.avg1MPrice) / sum.maxPrice : 0;
      const volume3M = sum?.avg3MTxCount || 0;
      const turnoverRate = apt.householdCount && volume3M ? (volume3M / apt.householdCount) * 100 : 0;

      const formattedYearBuilt = formatYearBuilt(apt.yearBuilt);
      const formattedPrice = sales > 0 ? formatPrice(sales) : '-';
      const formattedJeonse = jeonse > 0 ? formatPrice(jeonse) : '-';
      const formattedRatio = ratio > 0 ? `${(ratio * 100).toFixed(0)}%` : '-';
      const formattedPyeong = pyeongPrice > 0 ? `${Math.floor(pyeongPrice).toLocaleString()}만` : '-';
      const formattedHousehold = apt.householdCount ? `${apt.householdCount.toLocaleString()}세대` : '-';
      const formattedVolume = volume3M > 0 ? `${volume3M}건` : '-';
      const formattedTurnover = turnoverRate > 0 ? `${turnoverRate.toFixed(1)}%` : '';
      
      return {
        apt,
        pyeongPrice,
        totalPrice: sales,
        jeonsePrice: jeonse,
        ratio,
        dropRatio,
        maxPrice: sum?.maxPrice || 0,
        avg1MPrice: sum?.avg1MPrice || 0,
        volume3M,
        volume1M: sum?.avg1MTxCount || 0,
        turnoverRate,
        hasTx: !!sum && !!(sum.avg1MPrice || sum.latestPrice) && !!(sum.avg1MRentDeposit || sum.latestRentDeposit),

        formattedYearBuilt,
        formattedPrice,
        formattedJeonse,
        formattedRatio,
        formattedPyeong,
        formattedHousehold,
        formattedVolume,
        formattedTurnover
      };
    });
  }, [allApts, txSummaryData, nameMapping]);

  const sortedApts = useMemo(() => {
    let filtered = [...enrichedApts];

    if (currentCategory === 'favorites') {
      filtered = filtered.filter(a => userFavorites.has(a.apt.name));
    } else if (currentCategory.startsWith('dong-')) {
      const dongName = currentCategory.replace('dong-', '');
      filtered = filtered.filter(a => a.apt.dong === dongName);
    } else if (currentCategory === 'theme-over-12') {
      filtered = filtered.filter(a => a.avg1MPrice >= 120000);
    } else if (currentCategory === 'theme-biggest-drop') {
      filtered = filtered.filter(a => a.maxPrice > 0 && a.avg1MPrice > 0 && a.maxPrice > a.avg1MPrice);
    } else if (currentCategory === 'theme-high-jeonse') {
      filtered = filtered.filter(a => a.ratio >= 0.6);
    } else if (currentCategory === 'theme-most-traded') {
      filtered = filtered.filter(a => a.volume3M > 0);
    }

    filtered.sort((a, b) => {
      if (currentCategory === 'theme-over-12') return b.avg1MPrice - a.avg1MPrice;
      if (currentCategory === 'theme-biggest-drop') return b.dropRatio - a.dropRatio;
      if (currentCategory === 'theme-high-jeonse') return b.ratio - a.ratio;
      if (currentCategory === 'theme-most-traded') return b.volume3M - a.volume3M;

      let valA = 0;
      let valB = 0;
      
      if (sortKey === 'totalPrice') {
        valA = a.totalPrice;
        valB = b.totalPrice;
      } else if (sortKey === 'pyeongPrice') {
        valA = a.pyeongPrice;
        valB = b.pyeongPrice;
      } else if (sortKey === 'ratio') {
        valA = a.ratio;
        valB = b.ratio;
      } else if (sortKey === 'volume3M') {
        valA = a.volume3M;
        valB = b.volume3M;
      } else if (sortKey === 'turnoverRate') {
        valA = a.turnoverRate;
        valB = b.turnoverRate;
      } else if (sortKey === 'views') {
        valA = fieldReportsMap.get(a.apt.name)?.viewCount || 0;
        valB = fieldReportsMap.get(b.apt.name)?.viewCount || 0;
      } else if (sortKey === 'householdCount') {
        valA = a.apt.householdCount || 0;
        valB = b.apt.householdCount || 0;
      } else if (sortKey === 'yearBuilt') {
        valA = a.apt.yearBuilt ? parseInt(String(a.apt.yearBuilt).replace(/[^0-9]/g, '')) || 0 : 0;
        valB = b.apt.yearBuilt ? parseInt(String(b.apt.yearBuilt).replace(/[^0-9]/g, '')) || 0 : 0;
      } else if (sortKey === 'likes') {
        valA = favoriteCounts[a.apt.name] || 0;
        valB = favoriteCounts[b.apt.name] || 0;
      } else if (sortKey === 'name') {
        return sortDirection === 'asc' 
          ? a.apt.name.localeCompare(b.apt.name, 'ko') 
          : b.apt.name.localeCompare(a.apt.name, 'ko');
      }

      if (currentCategory === 'favorites' && sortKey === 'custom') {
        const idxA = favoritesArray.indexOf(a.apt.name);
        const idxB = favoritesArray.indexOf(b.apt.name);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return sortDirection === 'desc' ? idxB - idxA : idxA - idxB;
      }

      if (valA === valB) return 0;
      return sortDirection === 'desc' ? valB - valA : valA - valB;
    });

    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.toLowerCase().replace(/\s+/g, '');
      filtered = filtered.filter(a => a.apt.name.toLowerCase().replace(/\s+/g, '').includes(q));
    }

    return filtered;
  }, [enrichedApts, currentCategory, deferredSearchQuery, sortKey, sortDirection, userFavorites, favoritesArray, favoriteCounts, fieldReportsMap]);

  const exploreJsonLd = useMemo(() => {
    if (!sortedApts || sortedApts.length === 0) return null;

    const listItems = sortedApts.slice(0, 50).map((item, idx) => {
      return {
        "@type": "ListItem",
        "position": idx + 1,
        "url": `https://dongtanview.com/apartment/${encodeURIComponent(item.apt.name)}`,
        "name": item.apt.name,
        "item": {
          "@type": "Place",
          "name": item.apt.name,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": "화성시",
            "addressRegion": "경기도",
            "streetAddress": item.apt.dong,
            "addressCountry": "KR"
          },
          "additionalProperty": [
            {
              "@type": "PropertyValue",
              "name": "평당가",
              "value": item.formattedPyeong
            },
            {
              "@type": "PropertyValue",
              "name": "매매가",
              "value": item.formattedPrice
            },
            {
              "@type": "PropertyValue",
              "name": "전세가",
              "value": item.formattedJeonse
            },
            {
              "@type": "PropertyValue",
              "name": "전세가율",
              "value": item.formattedRatio
            },
            {
              "@type": "PropertyValue",
              "name": "세대수",
              "value": item.formattedHousehold
            },
            {
              "@type": "PropertyValue",
              "name": "연식",
              "value": item.formattedYearBuilt
            }
          ]
        }
      };
    });

    const itemListSchema = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "D-VIEW 아파트 탐색 리스트",
      "description": "사용자 필터 및 검색 조건에 따라 동적으로 구성된 동탄 아파트 실거래 시세 및 입지 분석 목록입니다.",
      "itemListElement": listItems
    };

    return JSON.stringify(itemListSchema);
  }, [sortedApts]);

  const { suggestionsApts, suggestionsDongs, suggestionsBrands } = useMemo(() => {
    const q = deferredSearchQuery.toLowerCase().replace(/\s+/g, '');
    if (!q) {
      return { suggestionsApts: [], suggestionsDongs: [], suggestionsBrands: [] };
    }

    const matchingApts = enrichedApts.filter(item => 
      item.apt.name.toLowerCase().replace(/\s+/g, '').includes(q)
    ).slice(0, 5);

    const matchingDongs = DONGS.filter(dong => 
      dong.name.toLowerCase().includes(q) || q.includes(dong.name.toLowerCase())
    );

    const BRANDS = ["롯데캐슬", "포스코", "더샵", "자이", "푸르지오", "힐스테이트", "반도유보라", "금강펜테리움", "우남퍼스트빌", "호반베르디움", "신안인스빌", "KCC", "스위첸", "e편한세상", "아이파크", "데시앙", "하우스디", "중흥"];
    const matchingBrands = BRANDS.filter(brand => 
      brand.toLowerCase().includes(q) && brand.toLowerCase() !== q
    ).slice(0, 3);

    return {
      suggestionsApts: matchingApts,
      suggestionsDongs: matchingDongs,
      suggestionsBrands: matchingBrands
    };
  }, [enrichedApts, deferredSearchQuery]);

  const recommendedKeywords = ['동탄역', '시범단지', '롯데캐슬', '반도유보라', '자이', '더샵'];



  return (
    <div className="flex flex-col w-full bg-transparent">
      {exploreJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: exploreJsonLd }}
        />
      )}
      {/* Main Content Area */}
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-8 md:pb-4 bg-transparent flex-1 min-h-0 flex flex-col">
        <div className="flex w-full bg-surface md:rounded-2xl md:border md:border-border/80 md:shadow-sm items-stretch flex-1 min-h-0">
          <aside 
            style={{ width: `${sidebarWidth}px` }}
            className="hidden md:flex flex-col w-auto shrink-0 border-r border-border bg-neutral-50/40 dark:bg-zinc-900/10 py-6 px-4 sticky top-[68px] self-start md:rounded-l-2xl"
          >
        <div className="mb-6">
          <h2 className="text-[14px] font-extrabold text-primary mb-3">단지 랭킹</h2>
          <div className="flex flex-col gap-1" role="tablist" aria-label="단지 랭킹 필터">
            <SidebarItem 
              label="내 관심 단지" 
              active={currentCategory === 'favorites'} 
              onClick={() => setCurrentCategory('favorites')} 
            />
            <SidebarItem 
              label="가격 높은 순" 
              active={currentCategory === 'rank-abs-price'} 
              onClick={() => setCurrentCategory('rank-abs-price')} 
            />
            <SidebarItem 
              label="평당가 높은 순" 
              active={currentCategory === 'rank-price'} 
              onClick={() => setCurrentCategory('rank-price')} 
            />
            <SidebarItem 
              label="전세가율 높은 순" 
              active={currentCategory === 'rank-jeonse'} 
              onClick={() => setCurrentCategory('rank-jeonse')} 
            />
            <SidebarItem 
              label="회전율 높은 순" 
              active={currentCategory === 'rank-turnover'} 
              onClick={() => setCurrentCategory('rank-turnover')} 
            />
            <SidebarItem 
              label="조회수 많은 순" 
              active={currentCategory === 'rank-views'} 
              onClick={() => setCurrentCategory('rank-views')} 
            />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-[14px] font-extrabold text-primary mb-3">법정동별 보기</h2>
          <div className="flex flex-col gap-1" role="tablist" aria-label="법정동별 보기 필터">
            {DONGS.map(dong => (
              <SidebarItem 
                key={dong.name}
                label={dong.name} 
                active={currentCategory === `dong-${dong.name}`} 
                onClick={() => setCurrentCategory(`dong-${dong.name}`)} 
              />
            ))}
          </div>
        </div>
      </aside>

      {/* Drag Splitter Resizer (Desktop Only) */}
      <div 
        role="separator"
        aria-valuenow={sidebarWidth}
        aria-valuemin={180}
        aria-valuemax={380}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setSidebarWidth(prev => Math.max(180, prev - 10));
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            setSidebarWidth(prev => Math.min(380, prev + 10));
          }
        }}
        className="hidden md:block w-1 hover:w-1.5 bg-border/80 hover:bg-emerald-500/30 active:bg-emerald-500/50 cursor-col-resize select-none shrink-0 transition-all z-20 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-emerald-500/50"
        title="드래그 또는 화살표 키로 크기 조절"
        aria-label="사이드바 크기 조절기"
      />

      {/* Compact Dynamic Sticky Header (Mobile Only) */}
      <div 
        className={`fixed top-0 left-0 right-0 md:hidden z-30 bg-surface/95 backdrop-blur-md px-4 pt-3 pb-2 flex flex-col gap-2 transition-all duration-300 border-b border-border/40 shadow-sm ${
          isScrolled ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between w-full">
          <button 
            className="flex items-center gap-1 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <h2 className="text-[15px] font-black text-primary tracking-tight">
              {currentCategory === 'favorites' ? '내 관심 단지' : 
               currentCategory === 'rank-price' ? '평당가 높은 순' :
               currentCategory === 'rank-abs-price' ? '가격 높은 순' :
               currentCategory === 'rank-jeonse' ? '전세가율 높은 순' :
               currentCategory === 'rank-turnover' ? '회전율 높은 순' :
               currentCategory === 'rank-views' ? '조회수 많은 순' :
               `${currentCategory.replace('dong-', '')} 아파트`}
            </h2>
            <ChevronDown className="w-4 h-4 text-primary" />
          </button>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                const searchInput = document.querySelector('input[type="search"]') || document.querySelector('input[type="text"]');
                if (searchInput) (searchInput as HTMLInputElement).focus();
              }}
              className="p-1 rounded-full hover:bg-body transition-colors"
              aria-label="검색"
            >
              <Search className="w-4 h-4 text-secondary" />
            </button>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-1 rounded-full hover:bg-body transition-colors"
              aria-label="위로"
            >
              <ArrowUp className="w-4 h-4 text-secondary" />
            </button>
          </div>
        </div>

        {/* Sticky Filter Chips Bar */}
        <div 
          className="flex overflow-x-auto no-scrollbar gap-1.5 py-0.5 w-full scroll-smooth shrink-0"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {categories.map((cat) => {
            const isActive = currentCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCurrentCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-[11.5px] font-bold transition-all shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                    : 'bg-neutral-100 dark:bg-zinc-900 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 flex flex-col bg-transparent min-w-0 md:pl-6 lg:pl-8 md:pr-6 lg:pr-8 py-2 md:rounded-r-2xl">
        <div className="px-0 py-3 md:py-4 border-b border-border flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-4 shrink-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md relative z-30">
          <div className="flex flex-row justify-between items-center md:flex-col md:items-start">
            <button 
              className="flex items-center gap-1 focus:outline-none md:pointer-events-none"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <h2 className="text-[20px] md:text-[28px] font-extrabold text-primary tracking-tight">
                {currentCategory === 'favorites' ? '내 관심 단지' : 
                 currentCategory === 'rank-price' ? '평당가 높은 순' :
                 currentCategory === 'rank-abs-price' ? '가격 높은 순' :
                 currentCategory === 'rank-jeonse' ? '전세가율 높은 순' :
                 currentCategory === 'rank-turnover' ? '회전율 높은 순' :
                 currentCategory === 'rank-views' ? '조회수 많은 순' :
                 `${currentCategory.replace('dong-', '')} 아파트`}
              </h2>
              <ChevronDown className="w-5 h-5 text-primary md:hidden" />
            </button>
            <div className="flex items-center gap-2 mt-0 md:mt-2">
              <p className="text-[13px] md:text-[15px] font-medium text-tertiary">총 {sortedApts.length}개 단지</p>
              {currentCategory === 'favorites' && favoritesArray.length > 0 && (
                <FavoriteOrderEditor
                  favoritesArray={favoritesArray}
                  updateFavoriteOrder={updateFavoriteOrder}
                />
              )}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2.5 w-full md:w-auto shrink-0">
            <div className="relative w-full md:w-[220px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
              <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                setIsSearchFocused(true);
                if (onSearchFocus) onSearchFocus();
              }}
              onBlur={() => {
                if (searchFocusTimeoutRef.current) {
                  clearTimeout(searchFocusTimeoutRef.current);
                  searchFocusTimeoutRef.current = null;
                }
                searchFocusTimeoutRef.current = setTimeout(() => {
                  if (mountedRef.current) {
                    setIsSearchFocused(false);
                    searchFocusTimeoutRef.current = null;
                  }
                }, 200);
              }}
              role="combobox"
              aria-expanded={isSearchFocused}
              aria-haspopup="listbox"
              aria-controls="search-suggestions-listbox"
              aria-autocomplete="list"
              aria-label="단지명 검색"
              className="w-full bg-body border border-transparent focus:border-toss-blue focus:bg-surface focus:shadow-[0_0_0_2px_rgba(0,210,157,0.2)] rounded-xl py-2 md:py-2.5 pl-10 pr-10 text-[14px] font-medium text-primary outline-none transition-all"
            />
            {/* CSS Rolling Placeholder */}
            {!searchQuery && !isSearchFocused && (
              <div className="absolute left-10 top-1/2 -translate-y-1/2 h-6 overflow-hidden pointer-events-none select-none">
                <div className="flex flex-col animate-placeholder-roll">
                  <span className="text-[14px] font-medium text-tertiary h-6 flex items-center">단지명 검색 (예: 롯데캐슬)</span>
                  <span className="text-[14px] font-medium text-tertiary h-6 flex items-center">동탄 호수공원 근처 검색</span>
                  <span className="text-[14px] font-medium text-tertiary h-6 flex items-center">초품아 안심 단지 검색</span>
                  <span className="text-[14px] font-medium text-tertiary h-6 flex items-center">역세권/주거 안심 단지 검색</span>
                  <span className="text-[14px] font-medium text-tertiary h-6 flex items-center">단지명 검색 (예: 롯데캐슬)</span>
                </div>
              </div>
            )}
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary p-1 focus:outline-none rounded-full hover:bg-body"
                aria-label="검색어 지우기"
              >
                <X size={16} />
              </button>
            )}
            </div>

            {/* Mobile Category Chips Scrollbar (Default view below search bar) */}
            <div 
              className="flex md:hidden overflow-x-auto no-scrollbar gap-1.5 py-1.5 w-full scroll-smooth shrink-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {categories.map((cat) => {
                const isActive = currentCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCurrentCategory(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-bold transition-all shrink-0 active:scale-95 ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400 ring-1 ring-emerald-500/20'
                        : 'bg-neutral-100 dark:bg-zinc-900 text-neutral-500 dark:text-neutral-400 hover:text-neutral-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Premium Autocomplete & Suggestions Dropdown */}
            {isSearchFocused && (
              <SearchSuggestionDropdown
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                setIsSearchFocused={setIsSearchFocused}
                recommendedKeywords={recommendedKeywords}
                setCurrentCategory={setCurrentCategory}
                suggestionsApts={suggestionsApts}
                suggestionsDongs={suggestionsDongs}
                suggestionsBrands={suggestionsBrands}
                handleSelectApt={handleSelectApt}
                preloadApartmentTx={preloadApartmentTx}
              />
            )}
            
            <div 
              className="flex flex-row overflow-x-auto whitespace-nowrap gap-2 py-1 w-full md:w-auto shrink-0 -mx-4 px-4 md:mx-0 md:px-0 md:items-center md:gap-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
            >
              {onOpenCompare && (
                <button
                  onClick={onOpenCompare}
                  className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-toss-blue text-[12px] font-extrabold rounded-full transition-all active:scale-95 cursor-pointer border border-emerald-500/20 whitespace-nowrap shrink-0 text-center inline-block"
                >
                  단지 비교분석
                </button>
              )}
              {onOpenJeonseSafety && (
                <button
                  onClick={() => onOpenJeonseSafety()}
                  className="px-4 py-2.5 bg-teal-50/50 hover:bg-teal-100/50 text-teal-700 dark:bg-teal-950/10 dark:hover:bg-teal-900/20 dark:text-teal-400 text-[12px] font-extrabold rounded-full transition-all active:scale-95 cursor-pointer border border-teal-500/15 whitespace-nowrap shrink-0 text-center inline-block"
                >
                  전세 안전진단
                </button>
              )}
              {onOpenMortgage && (
                <button
                  onClick={() => onOpenMortgage()}
                  className="px-4 py-2.5 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-700 dark:bg-emerald-950/10 dark:hover:bg-emerald-900/20 dark:text-emerald-400 text-[12px] font-extrabold rounded-full transition-all active:scale-95 cursor-pointer border border-emerald-500/15 whitespace-nowrap shrink-0 text-center inline-block"
                >
                  대출 한도진단
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col relative">
          <div className="w-full bg-white dark:bg-zinc-950 border border-neutral-100 dark:border-zinc-900/40 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            {/* Table Header */}
            <div className="hidden md:flex sticky top-0 z-20 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm items-center px-6 py-4 border-b border-neutral-100 dark:border-zinc-900/40 text-[12.5px] font-extrabold text-neutral-500 dark:border-zinc-900/40 text-[12.5px] font-extrabold text-neutral-500 dark:text-neutral-400 shrink-0 select-none">
            <div className="w-[36px] shrink-0" aria-hidden="true">&nbsp;</div>
            <button 
              onClick={() => handleHeaderSort('views')}
              className={`w-[40px] text-center shrink-0 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1.5 rounded-lg transition-all cursor-pointer relative flex items-center justify-center ${sortKey === 'views' || (sortKey === 'custom' && currentCategory === 'favorites') ? 'text-emerald-700 dark:text-toss-blue bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              <span className="w-full text-center">순위</span>
              {(sortKey === 'views' || sortKey === 'custom') && (
                <span className="absolute -right-0.5 top-1/2 -translate-y-1/2">
                  {sortDirection === 'desc' ? <ArrowDown className="w-2.5 h-2.5 text-emerald-700 dark:text-toss-blue" /> : <ArrowUp className="w-2.5 h-2.5 text-emerald-700 dark:text-toss-blue" />}
                </span>
              )}
            </button>
            <button 
              onClick={() => handleHeaderSort('name')}
              className={`flex-1 min-w-[120px] ml-2 text-left focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 px-2 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${sortKey === 'name' ? 'text-emerald-700 dark:text-toss-blue bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              <span>단지명</span>
              {sortKey === 'name' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-700 dark:text-toss-blue" /> : <ArrowUp className="w-3 h-3 text-emerald-700 dark:text-toss-blue" />)}
            </button>
            <button 
              onClick={() => handleHeaderSort('yearBuilt')}
              className={`w-[95px] text-right pr-3 shrink-0 hidden xl:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'yearBuilt' ? 'text-emerald-700 dark:text-toss-blue bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'yearBuilt' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-700 dark:text-toss-blue" /> : <ArrowUp className="w-3 h-3 text-emerald-700 dark:text-toss-blue" />)}
              <span>연식</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('totalPrice')}
              className={`w-[130px] text-right pr-3 shrink-0 flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'totalPrice' ? 'text-emerald-700 dark:text-toss-blue bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'totalPrice' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-700 dark:text-toss-blue" /> : <ArrowUp className="w-3 h-3 text-emerald-700 dark:text-toss-blue" />)}
              <span>매매가</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('pyeongPrice')}
              className={`w-[90px] text-right pr-3 shrink-0 flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'pyeongPrice' ? 'text-emerald-700 dark:text-toss-blue bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'pyeongPrice' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-700 dark:text-toss-blue" /> : <ArrowUp className="w-3 h-3 text-emerald-700 dark:text-toss-blue" />)}
              <span>평당가</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('ratio')}
              className={`w-[120px] text-right pr-3 shrink-0 hidden lg:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'ratio' ? 'text-emerald-700 dark:text-toss-blue bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'ratio' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-700 dark:text-toss-blue" /> : <ArrowUp className="w-3 h-3 text-emerald-700 dark:text-toss-blue" />)}
              <span>전세가</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('householdCount')}
              className={`w-[90px] text-right pr-3 shrink-0 hidden xl:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'householdCount' ? 'text-emerald-700 dark:text-toss-blue bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'householdCount' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-700 dark:text-toss-blue" /> : <ArrowUp className="w-3 h-3 text-emerald-700 dark:text-toss-blue" />)}
              <span>세대수</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('volume3M')}
              className={`w-[100px] text-right pr-2 shrink-0 hidden xl:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'volume3M' ? 'text-[#008060] dark:text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'volume3M' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" />)}
              <span>거래량</span>
            </button>
          </div>

          {/* Table Body */}
          {sortedApts.length === 0 ? (
            <div 
              className="flex flex-col items-center justify-center text-tertiary w-full border border-dashed border-border/85 rounded-2xl bg-body/10 px-4 py-20 transition-all duration-300 min-h-[300px]"
            >
              <span className="text-[40px] mb-3 animate-bounce">🔍</span>
              <span className="text-[15px] font-extrabold text-primary">검색 결과가 없습니다</span>
              <span className="text-[13px] font-medium mt-2 text-tertiary text-center">단지명을 다시 확인하거나 카테고리 필터를 변경해 보세요</span>
            </div>
          ) : (
            <div id="explore-list-container" className="w-full flex-1 pt-0">
              <div className="flex flex-col w-full">
                {sortedApts.slice(0, visibleCount).map((item, index) => (
                  <React.Fragment key={item.apt.name}>
                    <AptRow 
                      item={item} 
                      index={index} 
                      handleSelectApt={handleSelectApt} 
                      onToggleFavorite={onToggleFavorite} 
                      currentCategory={currentCategory}
                      isFavorited={userFavorites.has(item.apt.name)}
                      likes={favoriteCounts[item.apt.name] || 0}
                      photoCount={fieldReportsMap.get(item.apt.name)?.images?.length || 0}
                      views={fieldReportsMap.get(item.apt.name)?.viewCount || 0}
                      preloadApartmentTx={preloadApartmentTx}
                    />
                  </React.Fragment>
                ))}
              </div>

              {/* 분석 단지 더보기 버튼 (CLS 최적화 및 뷰포트 안정화) */}
              {sortedApts.length > visibleCount && (
                <div className="w-full flex justify-center p-4">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 15)}
                    className="w-full py-4 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 font-extrabold text-[14.5px] rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30 shadow-sm flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer hover:shadow-md active:scale-[0.995]"
                  >
                    <Sparkles size={16} className="text-emerald-600 dark:text-emerald-400 animate-pulse" />
                    <span>분석 단지 더보기 ({visibleCount} / {sortedApts.length})</span>
                    <ChevronDown size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </button>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
      </div>

      {/* Mobile Bottom Sheet Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:hidden">
          {/* Dimmed Background */}
          <button 
            type="button"
            className="absolute inset-0 bg-black/40 transition-opacity border-none cursor-default" 
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="메뉴 닫기"
          />
          
          {/* Sheet */}
          <div className="relative w-full bg-surface rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-border shrink-0">
              <h2 className="text-[18px] font-extrabold text-primary">단지 보기 방식</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 -mr-1.5 rounded-full hover:bg-body transition-colors"
              >
                <X className="w-6 h-6 text-tertiary" />
              </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 px-5 py-2">
              <div className="py-3 mt-1">
                <h3 className="text-[13px] font-extrabold text-tertiary mb-2 px-2">단지 랭킹</h3>
                <div className="flex flex-col gap-1" role="tablist" aria-label="모바일 단지 랭킹 필터">
                  <MobileSidebarItem 
                    label="내 관심 단지" 
                    active={currentCategory === 'favorites'} 
                    onClick={() => { setCurrentCategory('favorites'); setIsMobileMenuOpen(false); }} 
                  />
                  <MobileSidebarItem 
                    label="가격 높은 순" 
                    active={currentCategory === 'rank-abs-price'} 
                    onClick={() => { setCurrentCategory('rank-abs-price'); setIsMobileMenuOpen(false); }} 
                  />
                  <MobileSidebarItem 
                    label="평당가 높은 순" 
                    active={currentCategory === 'rank-price'} 
                    onClick={() => { setCurrentCategory('rank-price'); setIsMobileMenuOpen(false); }} 
                  />
                  <MobileSidebarItem 
                    label="전세가율 높은 순" 
                    active={currentCategory === 'rank-jeonse'} 
                    onClick={() => { setCurrentCategory('rank-jeonse'); setIsMobileMenuOpen(false); }} 
                  />
                  <MobileSidebarItem 
                    label="회전율 높은 순" 
                    active={currentCategory === 'rank-turnover'} 
                    onClick={() => { setCurrentCategory('rank-turnover'); setIsMobileMenuOpen(false); }} 
                  />
                  <MobileSidebarItem 
                    label="조회수 많은 순" 
                    active={currentCategory === 'rank-views'} 
                    onClick={() => { setCurrentCategory('rank-views'); setIsMobileMenuOpen(false); }} 
                  />
                </div>
              </div>

              <div className="py-3 border-t border-border mt-1">
                <h3 className="text-[13px] font-extrabold text-tertiary mb-2 px-2 mt-2">법정동별 보기</h3>
                <div className="flex flex-col gap-1 pb-6" role="tablist" aria-label="모바일 법정동별 보기 필터">
                  {DONGS.map(dong => (
                    <MobileSidebarItem 
                      key={dong.name}
                      label={dong.name} 
                      active={currentCategory === `dong-${dong.name}`} 
                      onClick={() => { setCurrentCategory(`dong-${dong.name}`); setIsMobileMenuOpen(false); }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

    </div>
  );
});

function SidebarItem({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`text-left px-3 py-2.5 rounded-xl text-[14px] font-bold transition-all ${
        active ? 'bg-body text-primary' : 'text-secondary hover:bg-body/50'
      }`}
    >
      {label}
    </button>
  );
}

function MobileSidebarItem({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      role="tab"
      aria-selected={active}
      className={`text-left px-4 py-3.5 rounded-2xl text-[16px] font-bold transition-all flex items-center justify-between ${
        active ? 'bg-toss-blue-light text-emerald-800' : 'text-primary hover:bg-body/50'
      }`}
    >
      {label}
      {active && <div className="w-1.5 h-1.5 rounded-full bg-toss-blue" />}
    </button>
  );
}

TossApartmentExploreClient.displayName = 'TossApartmentExploreClient';
export default TossApartmentExploreClient;
