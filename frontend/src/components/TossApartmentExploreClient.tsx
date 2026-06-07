'use client';

import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { VariableSizeList as List, areEqual } from 'react-window';
import { useDebounce } from '@/hooks/useDebounce';
import { Heart, Search, ChevronRight, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, Camera, ChevronDown, X, Sparkles, Coins, Activity } from 'lucide-react';
import PageHeroHeader from './PageHeroHeader';
import HotComplexRanking from './HotComplexRanking';
import { DONGS, getDongByName } from '@/lib/dongs';
import { normalizeAptName, findTxKey } from '@/lib/utils/apartmentMapping';
import { formatEokWithUnit } from '@/components/MacroDashboardClient';
import { DongApartment } from '@/lib/dong-apartments';
import { AptTxSummary } from '@/lib/types/transaction';
import { FieldReportData } from '@/lib/types/report.types';
import { NativeAdPlaceholder } from '@/components/ui/NativeAdPlaceholder';

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
  
  if (str.length >= 6) {
    return `${year}.${String(month).padStart(2, '0')} (${ageStr})`;
  } else {
    return `${year} (${ageStr})`;
  }
};

const InteractiveHeart = memo(({ 
  isFavorited, 
  name, 
  onToggle, 
  size = 18 
}: { 
  isFavorited: boolean; 
  name: string; 
  onToggle: (name: string) => void; 
  size?: number; 
}) => {
  const [localFavorited, setLocalFavorited] = useState(isFavorited);
  const [animate, setAnimate] = useState(false);

  // 상위 상태와 동기화
  useEffect(() => {
    setLocalFavorited(isFavorited);
  }, [isFavorited]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalFavorited(prev => !prev);
    setAnimate(true);
    onToggle(name);
    setTimeout(() => setAnimate(false), 300);
  };

  return (
    <button 
      onClick={handleClick}
      aria-label={`${name} 즐겨찾기 ${localFavorited ? '해제' : '추가'}`}
      className="focus:outline-none p-1 rounded-full hover:bg-body/80 active:scale-95 transition-all duration-150 shrink-0 flex items-center justify-center"
    >
      <Heart 
        size={size} 
        className={`transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
          localFavorited 
            ? "text-toss-red fill-current" 
            : "text-border dark:text-zinc-600 hover:text-rose-400"
        } ${animate ? "scale-[1.4] rotate-[12deg]" : "scale-100"}`}
      />
    </button>
  );
});
InteractiveHeart.displayName = 'InteractiveHeart';

interface RowData {
  items: Array<{
    apt: DongApartment;
    pyeongPrice: number;
    totalPrice: number;
    jeonsePrice: number;
    ratio: number;
    dropRatio: number;
    maxPrice: number;
    avg1MPrice: number;
    volume3M: number;
    volume1M: number;
    turnoverRate: number;
    hasTx: boolean;
    views: number;
    photoCount: number;
    likes: number;
    isFavorited: boolean;
    
    // [자기개선] Row 렌더링 CPU/GC 부하를 줄이기 위한 선연산 포맷 필드
    formattedYearBuilt: string;
    formattedPrice: string;
    formattedJeonse: string;
    formattedRatio: string;
    formattedPyeong: string;
    formattedHousehold: string;
    formattedVolume: string;
    formattedTurnover: string;
  }>;
  handleSelectApt: (name: string) => void;
  onToggleFavorite: (name: string) => void;
}

const Row = memo(({ index, style, data }: { index: number; style: React.CSSProperties; data: RowData }) => {
  const { items, handleSelectApt, onToggleFavorite } = data;

  const isAd = items.length > 15 && index === 15;
  if (isAd) {
    return (
      <div style={style} className="w-full px-1 md:px-0 flex items-center h-[calc(100%-8px)] my-1">
        <NativeAdPlaceholder 
          location="아파트 탐색 목록 15번째 광고" 
          adSlot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_EXPLORE_LIST || "test-explore-list-slot"} 
          isCompact={true}
        />
      </div>
    );
  }

  const actualIndex = items.length > 15 && index > 15 ? index - 1 : index;
  const item = items[actualIndex];
  if (!item) return null;

  return (
    <div style={style} className="w-full">
      {/* Desktop View (Hidden on Mobile) */}
      <div 
        onClick={() => handleSelectApt(item.apt.name)}
        className={`hidden md:flex items-center md:px-4 h-[calc(100%-8px)] my-1 border border-neutral-100/70 dark:border-zinc-900/40 hover:border-emerald-500/20 rounded-2xl cursor-pointer transition-all duration-200 ease-in-out active:scale-[0.995] ${
          actualIndex % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-[#fafcfb]/70 dark:bg-zinc-900/10'
        } hover:bg-neutral-50 dark:hover:bg-zinc-800/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)]`}
      >
        {/* Heart */}
        <div className="w-[36px] text-center flex justify-center items-center shrink-0">
          <InteractiveHeart 
            isFavorited={item.isFavorited} 
            name={item.apt.name} 
            onToggle={onToggleFavorite} 
            size={18} 
          />
        </div>
        
        {/* Rank */}
        <div className="w-[40px] text-center shrink-0 flex items-center justify-center">
          {actualIndex < 3 ? (
            <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-black tracking-tight shadow-sm ${
              actualIndex === 0 ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white shadow-amber-500/20' :
              actualIndex === 1 ? 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white shadow-slate-400/20' :
              'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white shadow-amber-700/20'
            }`}>
              {actualIndex + 1}
            </span>
          ) : (
            <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12.5px] font-bold text-neutral-400 dark:text-neutral-500 bg-neutral-100/40 dark:bg-neutral-800/30">{actualIndex + 1}</span>
          )}
        </div>
        
        {/* Name */}
        <div className="flex-1 min-w-[120px] flex items-center ml-2 flex-wrap gap-x-1.5 gap-y-1">
          <span className="text-[15.5px] font-black text-neutral-900 dark:text-neutral-100 leading-none group-hover:text-[#00d29d] transition-colors">{item.apt.name}</span>
          {item.photoCount > 0 && (
            <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-full border border-emerald-100/50 dark:border-emerald-900/30 leading-none flex items-center shrink-0 gap-0.5 shadow-sm">
              <Camera className="w-2.5 h-2.5" />
              사진 {item.photoCount}장
            </span>
          )}
          {item.likes > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold rounded-full border border-rose-100/50 dark:border-rose-900/30 leading-none flex items-center shrink-0 gap-0.5 shadow-sm">
              <Heart className="w-2.5 h-2.5 fill-current" />
              관심 {item.likes}
            </span>
          )}
        </div>

        {/* Age (shown at xl) */}
        <div className="w-[105px] text-right pr-2 text-[13.5px] font-semibold text-neutral-600 dark:text-neutral-400 leading-none shrink-0 hidden xl:block whitespace-nowrap">
          {item.formattedYearBuilt}
        </div>
        
        {/* Price */}
        <div className="w-[100px] text-right pr-2 text-[15.5px] font-black text-neutral-950 dark:text-neutral-50 shrink-0 whitespace-nowrap">
          {item.formattedPrice}
        </div>
        
        {/* Pyeong */}
        <div className="w-[85px] text-right pr-2 text-[14.5px] font-extrabold text-[#00b386] dark:text-[#00d29d] shrink-0 whitespace-nowrap">
          {item.formattedPyeong}
        </div>

        {/* Jeonse (shown at lg) */}
        <div className="w-[110px] text-right pr-2 flex flex-col justify-center items-end gap-1 shrink-0 hidden lg:flex">
          <span className="text-[14px] font-bold text-neutral-900 dark:text-neutral-100 leading-none whitespace-nowrap">
            {item.formattedJeonse}
          </span>
          <span className={`text-[9.5px] font-extrabold leading-none whitespace-nowrap px-1.5 py-0.5 rounded ${
            item.ratio >= 0.6 
              ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400' 
              : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400'
          }`}>
            {item.formattedRatio}
          </span>
        </div>

        {/* Household (shown at xl) */}
        <div className="w-[80px] text-right pr-2 text-[13.5px] font-medium text-neutral-500 dark:text-neutral-400 leading-none shrink-0 hidden xl:block whitespace-nowrap">
          {item.formattedHousehold}
        </div>

        {/* Volume (shown at xl) */}
        <div className="w-[100px] text-right pr-2 flex flex-col justify-center items-end gap-1 shrink-0 hidden xl:flex">
          <span className="text-[13.5px] font-bold text-neutral-800 dark:text-neutral-200 leading-none whitespace-nowrap">
            {item.formattedVolume}
          </span>
          {item.formattedTurnover && (
            <span className={`text-[9.5px] font-extrabold leading-none whitespace-nowrap px-1.5 py-0.5 rounded ${
              item.turnoverRate >= 2.5 
                ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-teal-400' 
                : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400'
            }`}>
              회전율 {item.formattedTurnover}
            </span>
          )}
        </div>
      </div>

      {/* Mobile View (Hidden on Desktop) */}
      <div 
        onClick={() => handleSelectApt(item.apt.name)}
        className={`flex md:hidden flex-col justify-between p-4.5 h-[calc(100%-8px)] my-1.5 border border-black/[0.03] dark:border-white/[0.04] rounded-2xl cursor-pointer transition-all duration-300 ease-in-out active:scale-[0.98] ${
          actualIndex % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-[#fafcfb]/60 dark:bg-zinc-900/5'
        } hover:bg-neutral-50 dark:hover:bg-zinc-800/10 shadow-[0_4px_20px_rgba(0,0,0,0.015)] relative`}
      >
        {/* Favorite Heart & Likes Count - Positioned Top Right Premium Capsule */}
        <div className="absolute right-4.5 top-4.5 z-10">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all duration-300 ${
            item.isFavorited 
              ? 'bg-rose-50/90 dark:bg-rose-950/20 border-rose-100/50 dark:border-rose-900/30' 
              : 'bg-neutral-50/80 dark:bg-zinc-900/60 border-neutral-100/80 dark:border-zinc-800/40'
          }`}>
            <InteractiveHeart 
              isFavorited={item.isFavorited} 
              name={item.apt.name} 
              onToggle={onToggleFavorite} 
              size={13} 
            />
            {item.likes > 0 && (
              <span className={`text-[10px] font-extrabold tracking-tight ${
                item.isFavorited ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-500 dark:text-neutral-400'
              }`}>
                {item.likes}
              </span>
            )}
          </div>
        </div>

        {/* Mobile Top Info */}
        <div className="flex items-start gap-3 w-full min-w-0 mb-3.5 pr-20">
          {/* Rank Badge */}
          <div className="shrink-0 pt-0.5">
            {actualIndex < 3 ? (
              <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-black tracking-tighter shadow-md ${
                actualIndex === 0 ? 'bg-gradient-to-br from-amber-300 via-yellow-400 to-orange-500 text-white shadow-amber-500/20 ring-1 ring-amber-300/30' :
                actualIndex === 1 ? 'bg-gradient-to-br from-slate-200 via-slate-400 to-slate-600 text-white shadow-slate-400/20 ring-1 ring-slate-300/30' :
                'bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 text-white shadow-amber-700/20 ring-1 ring-amber-500/30'
              }`}>
                {actualIndex + 1}
              </span>
            ) : (
              <span className="w-[22px] h-[22px] rounded-full bg-neutral-100/60 dark:bg-neutral-800/40 border border-neutral-200/30 dark:border-neutral-700/30 flex items-center justify-center text-[11px] font-bold text-neutral-400 dark:text-neutral-500">
                {actualIndex + 1}
              </span>
            )}
          </div>
          
          {/* Name & Metadata */}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[15.5px] font-black text-neutral-900 dark:text-neutral-50 leading-tight mb-2 tracking-tight break-keep group-hover:text-[#00d29d] transition-colors">
              {item.apt.name}
            </span>
            
            {/* Meta & Micro Badges Combined Row */}
            <div className="flex items-center flex-wrap gap-1.5 text-[10.5px] text-neutral-500 dark:text-neutral-400 font-bold tracking-tight">
              <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[9.5px] font-extrabold rounded-md shadow-sm border border-emerald-100/20">
                {item.apt.dong}
              </span>
              <span>{item.formattedYearBuilt}</span>
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span>{item.formattedHousehold}</span>

              {/* Photo Count badge only inside text line */}
              {item.photoCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9.5px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/10">
                  <Camera className="w-2.5 h-2.5" />{item.photoCount}장
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Integrated Mobile Metrics Slab (Clean & Modern Unified Look) */}
        <div className="grid grid-cols-3 gap-0 w-full mt-1.5 p-1 bg-gradient-to-b from-neutral-50/60 to-neutral-100/20 dark:from-zinc-900/10 dark:to-zinc-900/20 backdrop-blur-md rounded-2xl border border-neutral-200/40 dark:border-zinc-800/10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
          {/* Price Block */}
          <div className="flex flex-col items-center justify-center text-center py-2 relative">
            <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-extrabold mb-1.5 flex items-center gap-0.5">
              <Coins className="w-2.5 h-2.5 opacity-40 text-emerald-500" /> 매매가
            </span>
            <span className="text-[13px] font-black text-neutral-900 dark:text-neutral-50 leading-none mb-1.5 tracking-tight">
              {item.formattedPrice}
            </span>
            <span className="text-[9.5px] font-extrabold text-[#00b386] dark:text-[#00d29d] leading-none bg-emerald-500/5 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded">
              {item.pyeongPrice > 0 ? `${item.formattedPyeong}` : '-'}
            </span>
          </div>

          {/* Jeonse Block */}
          <div className="flex flex-col items-center justify-center text-center py-2 border-x border-neutral-200/40 dark:border-zinc-800/20 relative">
            <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-extrabold mb-1.5 flex items-center gap-0.5">
              <Activity className="w-2.5 h-2.5 opacity-40 text-teal-500" /> 전세가
            </span>
            <span className="text-[13px] font-black text-neutral-900 dark:text-neutral-50 leading-none mb-1.5 tracking-tight">
              {item.jeonsePrice > 0 ? item.formattedJeonse : '-'}
            </span>
            <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded leading-none ${
              item.ratio >= 0.6 
                ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400' 
                : 'bg-neutral-100/60 dark:bg-neutral-800/40 text-neutral-400 dark:text-neutral-500'
            }`}>
              {item.ratio > 0 ? item.formattedRatio : '-'}
            </span>
          </div>

          {/* Volume Block */}
          <div className="flex flex-col items-center justify-center text-center py-2 relative">
            <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-extrabold mb-1.5 flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5 opacity-40 text-indigo-500" /> 거래량(3M)
            </span>
            <span className="text-[13px] font-black text-neutral-900 dark:text-neutral-50 leading-none mb-1.5 tracking-tight">
              {item.volume3M > 0 ? item.formattedVolume : '-'}
            </span>
            <span className={`text-[9.5px] font-extrabold px-1.5 py-0.5 rounded leading-none ${
              item.turnoverRate >= 2.5 
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' 
                : 'bg-neutral-100/60 dark:bg-neutral-800/40 text-neutral-400 dark:text-neutral-500'
            }`}>
              {item.formattedTurnover ? `${item.formattedTurnover}` : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}, areEqual);
Row.displayName = 'Row';

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
}

// Using similar props to what was passed to the left panel before
export default function TossApartmentExploreClient({
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
}: TossApartmentExploreClientProps) {
  const [currentCategory, setCurrentCategory] = useState<string>('rank-abs-price');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // [자기개선] 테이블 직접 정렬용 상태값 추가
  const [sortKey, setSortKey] = useState<string>('totalPrice'); // 'totalPrice' | 'pyeongPrice' | 'ratio' | 'volume3M' | 'turnoverRate' | 'views' | 'yearBuilt' | 'householdCount' | 'name'
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 사이드바 카테고리 전환 시 정렬 Key 동기화
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
    } else if (currentCategory === 'rank-volume') {
      setSortKey('volume3M');
      setSortDirection('desc');
    } else if (currentCategory === 'rank-turnover') {
      setSortKey('turnoverRate');
      setSortDirection('desc');
    } else if (currentCategory === 'rank-views') {
      setSortKey('views');
      setSortDirection('desc');
    }
  }, [currentCategory]);

  const handleHeaderSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
    
    // 카테고리 하이라이트 동기화
    if (key === 'totalPrice') setCurrentCategory('rank-abs-price');
    else if (key === 'pyeongPrice') setCurrentCategory('rank-price');
    else if (key === 'ratio') setCurrentCategory('rank-jeonse');
    else if (key === 'volume3M') setCurrentCategory('rank-volume');
    else if (key === 'turnoverRate') setCurrentCategory('rank-turnover');
    else if (key === 'views') setCurrentCategory('rank-views');
    else setCurrentCategory('custom-sort');
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 80);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  
  // Flatten and filter public rentals
  const allApts = useMemo(() => {
    return Object.values(sheetApartments).flat().filter((a: DongApartment) => !publicRentalSet.has(a.name));
  }, [sheetApartments, publicRentalSet]);

  // Enrich with data
  const enrichedApts = useMemo(() => {
    return allApts.map((apt: DongApartment) => {
      const rawKey = apt.txKey || apt.name;
      const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;

      const sum = txSummaryData[txKey];
      
      const pyeongPrice = sum?.avg3MPerPyeong || sum?.avg1MPerPyeong || (sum?.latestArea ? sum.latestPrice / (sum.latestArea / 3.3058) : 0);
      const sales = sum ? (sum.avg3MPrice || sum.avg1MPrice || sum.latestPrice || 0) : 0;
      const jeonse = sum ? (sum.avg3MRentDeposit || sum.avg1MRentDeposit || sum.latestRentDeposit || 0) : 0;
      const ratio = sales > 0 && jeonse > 0 ? (jeonse / sales) : 0;
      const dropRatio = sum && sum.maxPrice && sum.avg1MPrice && sum.maxPrice > sum.avg1MPrice ? (sum.maxPrice - sum.avg1MPrice) / sum.maxPrice : 0;
      const volume3M = sum?.avg3MTxCount || 0;
      const turnoverRate = apt.householdCount && volume3M ? (volume3M / apt.householdCount) * 100 : 0;

      // [자기개선] 렌더링 성능 최적화: 포맷팅을 렌더 단계가 아닌 데이터 바인딩 단계에서 1회만 선연산하여 캐싱
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
        views: fieldReportsMap.get(apt.name)?.viewCount || 0,
        photoCount: fieldReportsMap.get(apt.name)?.images?.length || 0,
        likes: favoriteCounts[apt.name] || 0,
        isFavorited: userFavorites.has(apt.name),

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
  }, [allApts, txSummaryData, nameMapping, fieldReportsMap, favoriteCounts, userFavorites]);

  // Sort based on category
  const sortedApts = useMemo(() => {
    let filtered = [...enrichedApts];

    if (currentCategory === 'favorites') {
      filtered = filtered.filter(a => a.isFavorited);
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

    // Sort logic
    filtered.sort((a, b) => {
      // 테마별 임시 예외 정렬
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
        valA = a.views;
        valB = b.views;
      } else if (sortKey === 'householdCount') {
        valA = a.apt.householdCount || 0;
        valB = b.apt.householdCount || 0;
      } else if (sortKey === 'yearBuilt') {
        valA = a.apt.yearBuilt ? parseInt(String(a.apt.yearBuilt).replace(/[^0-9]/g, '')) || 0 : 0;
        valB = b.apt.yearBuilt ? parseInt(String(b.apt.yearBuilt).replace(/[^0-9]/g, '')) || 0 : 0;
      } else if (sortKey === 'name') {
        return sortDirection === 'asc' 
          ? a.apt.name.localeCompare(b.apt.name, 'ko') 
          : b.apt.name.localeCompare(a.apt.name, 'ko');
      }

      if (valA === valB) return 0;
      return sortDirection === 'desc' ? valB - valA : valA - valB;
    });

    // Search filter
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().replace(/\s+/g, '');
      filtered = filtered.filter(a => a.apt.name.toLowerCase().replace(/\s+/g, '').includes(q));
    }

    return filtered;
  }, [enrichedApts, currentCategory, debouncedSearchQuery, sortKey, sortDirection]);

  // Suggestions data for autocomplete
  const { suggestionsApts, suggestionsDongs, suggestionsBrands } = useMemo(() => {
    const q = searchQuery.toLowerCase().replace(/\s+/g, '');
    if (!q) {
      return { suggestionsApts: [], suggestionsDongs: [], suggestionsBrands: [] };
    }

    // 1. Matching apartments (max 5)
    const matchingApts = enrichedApts.filter(item => 
      item.apt.name.toLowerCase().replace(/\s+/g, '').includes(q)
    ).slice(0, 5);

    // 2. Matching dongs
    const matchingDongs = DONGS.filter(dong => 
      dong.name.toLowerCase().includes(q) || q.includes(dong.name.toLowerCase())
    );

    // 3. Matching brands
    const BRANDS = ["롯데캐슬", "포스코", "더샵", "자이", "푸르지오", "힐스테이트", "반도유보라", "금강펜테리움", "우남퍼스트빌", "호반베르디움", "신안인스빌", "KCC", "스위첸", "e편한세상", "아이파크", "데시앙", "하우스디", "중흥"];
    const matchingBrands = BRANDS.filter(brand => 
      brand.toLowerCase().includes(q) && brand.toLowerCase() !== q
    ).slice(0, 3);

    return {
      suggestionsApts: matchingApts,
      suggestionsDongs: matchingDongs,
      suggestionsBrands: matchingBrands
    };
  }, [enrichedApts, searchQuery]);

  const recommendedKeywords = ['동탄역', '시범단지', '롯데캐슬', '반도유보라', '자이', '더샵'];

  const listRef = useRef<List>(null);
  const outerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(600);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateHeight = () => {
      if (window.innerWidth < 768) {
        setListHeight(Math.max(300, window.innerHeight - 260));
      } else {
        // 데스크톱 뷰: 브라우저 뷰포트 크기에 연동하되, 테이블 헤더가 sticky 상단에 붙었을 때 
        // 하단 푸터 영역 위까지 리스트가 채워지도록 headerOffset을 180px로 설정하여 
        // 950px 높이 기준 약 12개 단지(770px 높이)가 적절하게 노출되도록 보장합니다.
        const headerOffset = 180;
        setListHeight(Math.max(400, window.innerHeight - headerOffset));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    
    // 레이아웃 렌더링 지연에 따른 정합 처리를 위한 타이머
    const timer = setTimeout(updateHeight, 100);
    
    return () => {
      window.removeEventListener('resize', updateHeight);
      clearTimeout(timer);
    };
  }, []);

  // [자기개선] iOS Safari 등 구형 모바일 브라우저 및 하이브리드 웹뷰 환경에서
  // overscrollBehavior: 'contain'이 오작동하거나 지원되지 않는 경우를 대비한 
  // JS 레벨의 하이브리드 스크롤 격리(Zero-Scroll-Chaining) 폴백 차단기 구축.
  useEffect(() => {
    const outerEl = outerRef.current;
    if (!outerEl) return;

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touchY = e.touches[0].clientY;
      const deltaY = touchStartY - touchY; // 터치 위로 드래그 = 아래로 스크롤 (deltaY > 0)
      const { scrollTop, scrollHeight, clientHeight } = outerEl;

      // 1. 최상단 도달 시 터치 다운(위로 스크롤 시도) 차단
      if (scrollTop <= 0 && deltaY < 0) {
        if (e.cancelable) e.preventDefault();
      }
      // 2. 최하단 도달 시 터치 업(아래로 스크롤 시도) 차단
      else if (scrollTop + clientHeight >= scrollHeight - 1 && deltaY > 0) {
        if (e.cancelable) e.preventDefault();
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = outerEl;
      
      // 1. 최상단 도달 시 위로 휠 굴림 차단
      if (scrollTop <= 0 && e.deltaY < 0) {
        if (e.cancelable) e.preventDefault();
      } 
      // 2. 최하단 도달 시 아래로 휠 굴림 차단
      else if (scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0) {
        if (e.cancelable) e.preventDefault();
      }
    };

    outerEl.addEventListener('touchstart', handleTouchStart, { passive: true });
    outerEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    outerEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      outerEl.removeEventListener('touchstart', handleTouchStart);
      outerEl.removeEventListener('touchmove', handleTouchMove);
      outerEl.removeEventListener('wheel', handleWheel);
    };
  }, [sortedApts]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [sortedApts, isMobile]);

  const getItemSize = (index: number) => {
    const isAd = sortedApts.length > 15 && index === 15;
    if (isAd) {
      return isMobile ? 86 : 94;
    }
    const actualIndex = sortedApts.length > 15 && index > 15 ? index - 1 : index;
    if (!isMobile) return 66;
    const item = sortedApts[actualIndex];
    if (!item) return 180;
    
    // 1. 기본 3분할 메트릭 카드 높이 설정 (패딩 및 마진 포함 최소 높이)
    let size = 180;
    
    // 2. 사진/관심 뱃지 노출에 따른 높이 추가
    if (item.photoCount > 0 || item.likes > 0) {
      size += 15;
    }
    
    // 3. 아파트명 길이에 따른 타이틀 줄바꿈 추가 높이 보정
    if (item.apt.name.length >= 16) {
      size += 35;
    } else if (item.apt.name.length >= 11) {
      size += 20;
    }
    
    return size;
  };

  const itemData = useMemo(() => ({
    items: sortedApts,
    handleSelectApt,
    onToggleFavorite
  }), [sortedApts, handleSelectApt, onToggleFavorite]);

  return (
    <div className="flex flex-col w-full bg-surface">
      {/* Standardized Hero Header */}
      <PageHeroHeader 
        title="D-VIEW 아파트 탐색"
        subtitleStrong="동탄 전역 아파트 비교 분석"
        subtitleLight="시세, 거래량, 관심도 등 다양한 지표로 아파트를 탐색하세요"
      />

      {/* Real-time Hot Complex Ranking Card */}
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 shrink-0 bg-surface">
        <HotComplexRanking
          sheetApartments={sheetApartments}
          fieldReportsMap={fieldReportsMap}
          favoriteCounts={favoriteCounts}
          onSelectApt={handleSelectApt}
          txSummaryData={txSummaryData}
          nameMapping={nameMapping}
        />
      </div>


      {/* Main Content Area */}
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-2 pb-8 md:pb-12 bg-surface">
        <div className="flex w-full bg-surface md:rounded-2xl md:border md:border-border/80 md:shadow-sm items-stretch min-h-[500px]">
          <aside className="hidden md:flex flex-col w-[240px] shrink-0 border-r border-border bg-neutral-50/40 dark:bg-zinc-900/10 py-6 px-4 sticky top-[60px] md:rounded-l-2xl">

        <div className="mb-6">
          <h2 className="text-[14px] font-extrabold text-primary mb-3">단지 랭킹</h2>
          <div className="flex flex-col gap-1">
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
              label="최근 거래량 많은 순" 
              active={currentCategory === 'rank-volume'} 
              onClick={() => setCurrentCategory('rank-volume')} 
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
          <div className="flex flex-col gap-1">
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

      {/* Compact Dynamic Sticky Header (Mobile Only) */}
      <div 
        className={`fixed top-0 left-0 right-0 md:hidden z-30 bg-surface/95 backdrop-blur-md px-5 py-3 flex items-center justify-between transition-all duration-300 ${
          isScrolled ? 'translate-y-0 opacity-100 shadow-[0_4px_12px_rgba(0,0,0,0.05)]' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <button 
          className="flex items-center gap-1 focus:outline-none"
          onClick={() => setIsMobileMenuOpen(true)}
        >
          <h2 className="text-[16px] font-extrabold text-primary tracking-tight">
            {currentCategory === 'favorites' ? '내 관심 단지' : 
             currentCategory === 'rank-price' ? '평당가 높은 순' :
             currentCategory === 'rank-abs-price' ? '가격 높은 순' :
             currentCategory === 'rank-jeonse' ? '전세가율 높은 순' :
             currentCategory === 'rank-volume' ? '최근 거래량 많은 순' :
             currentCategory === 'rank-turnover' ? '회전율 높은 순' :
             currentCategory === 'rank-views' ? '조회수 많은 순' :
             `${currentCategory.replace('dong-', '')} 아파트`}
          </h2>
          <ChevronDown className="w-4 h-4 text-primary" />
        </button>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="p-1.5 -mr-1.5 rounded-full hover:bg-body transition-colors"
        >
          <ArrowUp className="w-5 h-5 text-tertiary" />
        </button>
      </div>

      {/* Main Table Area */}
      <div className="flex-1 flex flex-col bg-surface min-w-0 md:pl-6 lg:pl-8 md:pr-6 lg:pr-8 py-2 md:rounded-r-2xl">
        <div className="px-0 py-3 md:py-4 border-b border-border flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-4 shrink-0 bg-surface md:sticky md:top-[60px] md:z-10">
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
                 currentCategory === 'rank-volume' ? '최근 거래량 많은 순' :
                 currentCategory === 'rank-turnover' ? '회전율 높은 순' :
                 currentCategory === 'rank-views' ? '조회수 많은 순' :
                 `${currentCategory.replace('dong-', '')} 아파트`}
              </h2>
              <ChevronDown className="w-5 h-5 text-primary md:hidden" />
            </button>
            <p className="text-[13px] md:text-[15px] font-medium text-tertiary mt-0 md:mt-2">총 {sortedApts.length}개 단지</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto shrink-0">
            <div className="relative w-full md:w-[220px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
              <input 
              type="text" 
              placeholder="단지명 검색 (예: 롯데캐슬)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              role="searchbox"
              aria-label="단지명 검색"
              className="w-full bg-body border border-transparent focus:border-[#00d29d] focus:bg-surface focus:shadow-[0_0_0_2px_rgba(49,130,246,0.2)] rounded-xl py-2 md:py-2.5 pl-10 pr-10 text-[14px] font-medium text-primary outline-none transition-all placeholder:text-tertiary"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary p-1 focus:outline-none rounded-full hover:bg-body"
                aria-label="검색어 지우기"
              >
                <X size={16} />
              </button>
            )}

            {/* Premium Autocomplete & Suggestions Dropdown */}
            {isSearchFocused && (
              <div 
                className="absolute top-full left-0 md:left-auto md:right-0 mt-2 w-full md:w-[360px] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl z-50 overflow-y-auto max-h-[480px] p-4 flex flex-col gap-4"
                role="listbox"
                aria-label="검색 추천 및 자동완성"
              >
                {!searchQuery.trim() ? (
                  <>
                    {/* Recommended Keywords */}
                    <div>
                      <h4 className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Sparkles size={12} className="text-[#00d29d]" /> 추천 검색어
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {recommendedKeywords.map((kw) => (
                          <button
                            key={kw}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setSearchQuery(kw)}
                            className="bg-body hover:bg-black/5 dark:hover:bg-white/5 text-secondary text-[12px] font-bold px-3 py-1.5 rounded-full transition-all active:scale-95 border border-transparent hover:border-border"
                          >
                            {kw}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dongs Shortcuts */}
                    <div className="border-t border-border/40 pt-3">
                      <h4 className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1">
                        📍 법정동 바로가기
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {DONGS.map((dong) => (
                          <button
                            key={dong.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setCurrentCategory(`dong-${dong.name}`);
                              setSearchQuery('');
                              setIsSearchFocused(false);
                            }}
                            className="flex items-center gap-2 bg-body hover:bg-black/5 dark:hover:bg-white/5 p-2 rounded-xl text-left transition-all active:scale-95 border border-transparent hover:border-border"
                          >
                            <span className="text-[16px]">{dong.emoji}</span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-primary text-[12px] font-bold truncate">{dong.name}</span>
                              <span className="text-tertiary text-[9.5px] truncate max-w-[120px]">{dong.description}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Matching Apartments */}
                    <div>
                      <h4 className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1">
                        🏢 아파트 단지 바로가기
                      </h4>
                      {suggestionsApts.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {suggestionsApts.map((item) => (
                            <button
                              key={item.apt.name}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                handleSelectApt(item.apt.name);
                                setIsSearchFocused(false);
                              }}
                              className="flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all text-left group active:scale-99 border border-transparent hover:border-border"
                            >
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-primary text-[13px] font-bold group-hover:text-[#00d29d] transition-colors truncate">
                                  🏢 {item.apt.name}
                                </span>
                                <span className="text-tertiary text-[11px] mt-0.5">
                                  {item.apt.dong} · {item.formattedHousehold} · {item.formattedYearBuilt}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                {item.totalPrice > 0 ? (
                                  <span className="text-[#00d29d] text-[13px] font-extrabold">{item.formattedPrice}</span>
                                ) : (
                                  <span className="text-tertiary text-[12px]">-</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-tertiary text-[12px]">
                          검색 결과와 일치하는 아파트가 없습니다.
                        </div>
                      )}
                    </div>

                    {/* Matching Dongs or Brands */}
                    {(suggestionsDongs.length > 0 || suggestionsBrands.length > 0) && (
                      <div className="border-t border-border/40 pt-3 flex flex-col gap-3">
                        {suggestionsDongs.length > 0 && (
                          <div className="flex flex-col gap-1.5">
                            {suggestionsDongs.map((dong) => (
                              <button
                                key={dong.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setCurrentCategory(`dong-${dong.name}`);
                                  setSearchQuery('');
                                  setIsSearchFocused(false);
                                }}
                                className="flex items-center justify-between p-2.5 bg-toss-blue/5 hover:bg-toss-blue/10 border border-toss-blue/20 rounded-xl text-left transition-all active:scale-98"
                              >
                                <span className="text-toss-blue text-[13px] font-bold flex items-center gap-1.5">
                                  📍 {dong.emoji} {dong.name} 카테고리로 바로 이동
                                </span>
                                <ChevronRight size={14} className="text-toss-blue" />
                              </button>
                            ))}
                          </div>
                        )}

                        {suggestionsBrands.length > 0 && (
                          <div>
                            <h4 className="text-[11px] font-extrabold text-tertiary uppercase tracking-wider mb-2 flex items-center gap-1">
                              🔍 브랜드 검색 완성
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {suggestionsBrands.map((brand) => (
                                <button
                                  key={brand}
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => setSearchQuery(brand)}
                                  className="bg-body hover:bg-black/5 dark:hover:bg-white/5 text-primary text-[12px] font-bold px-3 py-1.5 rounded-full border border-border/80 transition-all active:scale-95"
                                >
                                  🔍 {brand}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            </div>
            
            <div 
              className="flex flex-row overflow-x-auto whitespace-nowrap gap-2 py-1 w-full md:w-auto shrink-0 -mx-4 px-4 md:mx-0 md:px-0 md:items-center md:gap-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {onOpenCompare && (
                <button
                  onClick={onOpenCompare}
                  className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00b386] dark:text-[#00d29d] text-[12px] font-extrabold rounded-full transition-all active:scale-95 cursor-pointer border border-emerald-500/20 whitespace-nowrap shrink-0 text-center inline-block"
                >
                  단지 비교분석
                </button>
              )}
              {onOpenJeonseSafety && (
                <button
                  onClick={() => onOpenJeonseSafety()}
                  className="px-4 py-2.5 bg-teal-50/50 hover:bg-teal-100/50 text-teal-600 dark:bg-teal-950/10 dark:hover:bg-teal-900/20 dark:text-teal-400 text-[12px] font-extrabold rounded-full transition-all active:scale-95 cursor-pointer border border-teal-500/15 whitespace-nowrap shrink-0 text-center inline-block"
                >
                  전세 안전진단
                </button>
              )}
              {onOpenMortgage && (
                <button
                  onClick={() => onOpenMortgage()}
                  className="px-4 py-2.5 bg-blue-50/50 hover:bg-blue-100/50 text-blue-600 dark:bg-blue-950/10 dark:hover:bg-blue-900/20 dark:text-blue-400 text-[12px] font-extrabold rounded-full transition-all active:scale-95 cursor-pointer border border-blue-500/15 whitespace-nowrap shrink-0 text-center inline-block"
                >
                  대출 한도진단
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col relative">
          {/* Table Header */}
          <div className="hidden md:flex sticky top-[60px] z-10 bg-surface/90 backdrop-blur-md items-center md:pl-4 md:pr-[31px] py-3.5 border-b border-neutral-100 dark:border-zinc-900/40 text-[12.5px] font-extrabold text-neutral-400 dark:text-neutral-500 shrink-0 select-none shadow-sm shadow-black/[0.01]">
            <div className="w-[36px] text-center shrink-0"></div>
            <button 
              onClick={() => handleHeaderSort('views')}
              className={`w-[40px] text-center shrink-0 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1.5 rounded-lg transition-all cursor-pointer relative flex items-center justify-center ${sortKey === 'views' ? 'text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50' : ''}`}
            >
              <span className="w-full text-center">순위</span>
              {sortKey === 'views' && (
                <span className="absolute -right-0.5 top-1/2 -translate-y-1/2">
                  {sortDirection === 'desc' ? <ArrowDown className="w-2.5 h-2.5 text-[#00d29d]" /> : <ArrowUp className="w-2.5 h-2.5 text-[#00d29d]" />}
                </span>
              )}
            </button>
            <button 
              onClick={() => handleHeaderSort('name')}
              className={`flex-1 min-w-[120px] ml-2 text-left focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 px-2 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${sortKey === 'name' ? 'text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50' : ''}`}
            >
              <span>단지명</span>
              {sortKey === 'name' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#00d29d]" />)}
            </button>
            <button 
              onClick={() => handleHeaderSort('yearBuilt')}
              className={`w-[105px] text-right pr-2 shrink-0 hidden xl:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'yearBuilt' ? 'text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50' : ''}`}
            >
              {sortKey === 'yearBuilt' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#00d29d]" />)}
              <span>연식</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('totalPrice')}
              className={`w-[100px] text-right pr-2 shrink-0 flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'totalPrice' ? 'text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50' : ''}`}
            >
              {sortKey === 'totalPrice' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#00d29d]" />)}
              <span>매매가</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('pyeongPrice')}
              className={`w-[85px] text-right pr-2 shrink-0 flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'pyeongPrice' ? 'text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50' : ''}`}
            >
              {sortKey === 'pyeongPrice' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#00d29d]" />)}
              <span>평당가</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('ratio')}
              className={`w-[110px] text-right pr-2 shrink-0 hidden lg:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'ratio' ? 'text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50' : ''}`}
            >
              {sortKey === 'ratio' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#00d29d]" />)}
              <span>전세가</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('householdCount')}
              className={`w-[80px] text-right pr-2 shrink-0 hidden xl:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'householdCount' ? 'text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50' : ''}`}
            >
              {sortKey === 'householdCount' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#00d29d]" />)}
              <span>세대수</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('volume3M')}
              className={`w-[100px] text-right pr-2 shrink-0 hidden xl:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'volume3M' ? 'text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50' : ''}`}
            >
              {sortKey === 'volume3M' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#00d29d]" />)}
              <span>거래량</span>
            </button>
          </div>

          {/* Table Body */}
          {!isMounted ? (
            <div 
              style={{ height: listHeight }} 
              className="w-full flex flex-col gap-3 py-2 animate-pulse overflow-hidden px-1 md:px-0"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-full rounded-2xl bg-neutral-100 dark:bg-zinc-900/40 border border-neutral-100/50 dark:border-zinc-900/20 h-[180px] md:h-[66px] shrink-0"
                />
              ))}
            </div>
          ) : sortedApts.length === 0 ? (
            <div 
              style={{ height: listHeight }} 
              className="flex flex-col items-center justify-center text-tertiary w-full border border-dashed border-border/85 rounded-2xl bg-body/10 px-4 transition-all duration-300"
            >
              <span className="text-[40px] mb-3 animate-bounce">🔍</span>
              <span className="text-[15px] font-extrabold text-primary">검색 결과가 없습니다</span>
              <span className="text-[13px] font-medium mt-2 text-tertiary text-center">단지명을 다시 확인하거나 카테고리 필터를 변경해 보세요</span>
            </div>
          ) : (
            <div id="explore-list-container" className="w-full">
              <List
                ref={listRef}
                outerRef={outerRef}
                height={listHeight}
                itemCount={sortedApts.length > 15 ? sortedApts.length + 1 : sortedApts.length}
                itemSize={getItemSize}
                itemData={itemData}
                width="100%"
                className="custom-scrollbar"
                style={{ overflowX: 'hidden', overscrollBehavior: 'contain' }}
              >
                {Row}
              </List>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Mobile Bottom Sheet Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end md:hidden">
          {/* Dimmed Background */}
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
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
                <div className="flex flex-col gap-1">
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
                    label="최근 거래량 많은 순" 
                    active={currentCategory === 'rank-volume'} 
                    onClick={() => { setCurrentCategory('rank-volume'); setIsMobileMenuOpen(false); }} 
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
                <div className="flex flex-col gap-1 pb-6">
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
}

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
        active ? 'bg-[#e0fbf4] text-[#00b386]' : 'text-primary hover:bg-body/50'
      }`}
    >
      {label}
      {active && <div className="w-1.5 h-1.5 rounded-full bg-[#00b386]" />}
    </button>
  );
}
