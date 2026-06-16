'use client';

import React, { useState, useMemo, useRef, useEffect, memo } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Heart, Search, ChevronRight, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, Camera, ChevronDown, X, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
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
  
  return ageStr;
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
  const animateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (animateTimeoutRef.current) clearTimeout(animateTimeoutRef.current);
    };
  }, []);

  // 상위 상태와 동기화
  useEffect(() => {
    setLocalFavorited(isFavorited);
  }, [isFavorited]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocalFavorited(prev => !prev);
    setAnimate(true);
    onToggle(name);
    if (animateTimeoutRef.current) clearTimeout(animateTimeoutRef.current);
    animateTimeoutRef.current = setTimeout(() => setAnimate(false), 300);
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

interface EnrichedApt {
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
  
  formattedYearBuilt: string;
  formattedPrice: string;
  formattedJeonse: string;
  formattedRatio: string;
  formattedPyeong: string;
  formattedHousehold: string;
  formattedVolume: string;
  formattedTurnover: string;
}

interface AptRowProps {
  item: EnrichedApt;
  index: number;
  handleSelectApt: (name: string) => void;
  onToggleFavorite: (name: string) => void;
  currentCategory: string;
  isFavorited: boolean;
  likes: number;
  photoCount: number;
  views: number;
}

const AptRow = memo(({ 
  item, 
  index, 
  handleSelectApt, 
  onToggleFavorite, 
  currentCategory,
  isFavorited,
  likes,
  photoCount,
  views
}: AptRowProps) => {
  /*
   * 🛡️ DEFENSIVE DESIGN (방어적 설계):
   * 1. Null / Empty Values: totalPrice, ratio, turnoverRate, views 값이 0 이하일 경우 런타임 에러나 NaN 노출을 방지하기 위해 '-' 또는 '0'으로 안전하게 fallback 처리합니다.
   * 2. Text Clipping / Wrapping: 긴 아파트명(예: 동탄역시범대원칸타빌아파트)이 모바일 해상도에서 잘리거나 레이아웃을 해치지 않도록 flex-1, min-w-0, truncate를 적용하고 우측 지표 영역의 flex-shrink-0 너비를 보장합니다.
   * 3. Muted Color Styles: 데이터 부족 상태를 구분하기 위해 ratio나 turnoverRate가 비활성 상태일 때 gray 톤으로 연출하고 특정 임계값(예: 전세율 60% 이상, 회전율 2.5% 이상)일 때만 emerald/indigo 색상을 활성화합니다.
   *
   * 🔄 VIRTUAL DRY RUN (가상 드라이 런):
   * - Input: item { name: "동탄역롯데캐슬", totalPrice: 1520000, ratio: 0.72 }, currentCategory: "rank-jeonse"
   * - Step 1: Left side renders Rank Badge "index+1", Name "동탄역롯데캐슬", Subtitle "오산동 • 2021년 • 940세대".
   * - Step 2: Since currentCategory is "rank-jeonse", Right side switches to Case "rank-jeonse".
   * - Step 3: Top metric text displays "72%" (emerald color because ratio >= 0.6).
   * - Step 4: Bottom sub-metric text displays "전세 11.0억 / 매매 15.2억".
   * - Result: Extremely compact and scannable row without rendering a heavy 3-column slab card.
   */
  return (
    <div className="w-full flex flex-col px-0 md:px-4 py-0.5 md:py-1">
      {/* Desktop View (Hidden on Mobile) */}
      <div 
        onClick={() => handleSelectApt(item.apt.name)}
        className={`hidden md:flex items-center md:px-4 h-[66px] border border-neutral-100/70 dark:border-zinc-900/40 hover:border-emerald-500/20 rounded-2xl cursor-pointer transition-all duration-200 ease-in-out active:scale-[0.995] ${
          index % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-[#fafcfb]/70 dark:bg-zinc-900/10'
        } hover:bg-neutral-50 dark:hover:bg-zinc-800/20 hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)]`}
      >
        {/* Heart */}
        <div className="w-[36px] text-center flex justify-center items-center shrink-0">
          <InteractiveHeart 
            isFavorited={isFavorited} 
            name={item.apt.name} 
            onToggle={onToggleFavorite} 
            size={18} 
          />
        </div>
        
        {/* Rank */}
        <div className="w-[40px] text-center shrink-0 flex items-center justify-center">
          {index < 3 ? (
            <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-black tracking-tight shadow-sm ${
              index === 0 ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 text-white shadow-amber-500/20' :
              index === 1 ? 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white shadow-slate-400/20' :
              'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white shadow-amber-700/20'
            }`}>
              {index + 1}
            </span>
          ) : (
            <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[12.5px] font-bold text-neutral-600 dark:text-neutral-100 bg-neutral-100 dark:bg-neutral-800/60">{index + 1}</span>
          )}
        </div>
        
        {/* Name */}
        <div className="flex-1 min-w-[120px] flex items-center ml-2 flex-wrap gap-x-1.5 gap-y-1">
          <span className="text-[15.5px] font-black text-neutral-900 dark:text-neutral-100 leading-none group-hover:text-[#00d29d] transition-colors">{item.apt.name}</span>
          {photoCount > 0 && (
            <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-100/50 dark:border-emerald-900/30 leading-none flex items-center shrink-0 gap-0.5 shadow-sm">
              <Camera className="w-2.5 h-2.5" />
              사진 {photoCount}장
            </span>
          )}
          {likes > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-[10px] font-bold rounded-full border border-rose-100/50 dark:border-rose-900/30 leading-none flex items-center shrink-0 gap-0.5 shadow-sm">
              <Heart className="w-2.5 h-2.5 fill-current" />
              관심 {likes}
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
        <div className="w-[85px] text-right pr-2 text-[14.5px] font-extrabold text-[#008060] dark:text-[#00d29d] shrink-0 whitespace-nowrap">
          {item.formattedPyeong}
        </div>

        {/* Jeonse (shown at lg) */}
        <div className="w-[110px] text-right pr-2 flex flex-col justify-center items-end gap-1 shrink-0 hidden lg:flex">
          <span className="text-[14px] font-bold text-neutral-900 dark:text-neutral-100 leading-none whitespace-nowrap">
            {item.formattedJeonse}
          </span>
          <span className={`text-[9.5px] font-extrabold leading-none whitespace-nowrap px-1.5 py-0.5 rounded ${
            item.ratio >= 0.6 
              ? 'bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400' 
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

      {/* Mobile View (Hidden on Desktop) - Sleek Toss-style List Tile */}
      <div 
        onClick={() => handleSelectApt(item.apt.name)}
        className={`flex md:hidden items-center justify-between px-4 py-3.5 cursor-pointer transition-all duration-200 ease-in-out active:bg-neutral-100/60 dark:active:bg-zinc-900/40 ${
          index % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-neutral-50/20 dark:bg-zinc-900/5'
        } border-b border-neutral-100/40 dark:border-zinc-900/10`}
      >
        {/* Left Side: Rank, Name, Subtitle */}
        <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
          {/* Rank Badge */}
          <div className="shrink-0 flex items-center justify-center">
            {index < 3 ? (
              <span className={`w-[20px] h-[20px] rounded-full flex items-center justify-center text-[10px] font-black tracking-tight ${
                index === 0 ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 text-white shadow-sm' :
                index === 1 ? 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white shadow-sm' :
                'bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white shadow-sm'
              }`}>
                {index + 1}
              </span>
            ) : (
              <span className="w-[20px] h-[20px] rounded-full flex items-center justify-center text-[11px] font-bold text-neutral-400 dark:text-neutral-500">
                {index + 1}
              </span>
            )}
          </div>

          {/* Name & Subtitle */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[14.5px] font-extrabold text-neutral-900 dark:text-neutral-50 break-keep whitespace-normal tracking-tight">
                {item.apt.name}
              </span>
              {photoCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-500/10 px-1 py-0.5 rounded shrink-0">
                  <Camera className="w-2.5 h-2.5" />{photoCount}
                </span>
              )}
            </div>
            
            {/* Subtitle Info */}
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 dark:text-neutral-500 font-semibold mt-0.5 truncate tracking-tight">
              <span className="text-neutral-500 dark:text-neutral-400">{item.apt.dong}</span>
              <span className="text-neutral-300 dark:text-zinc-800">•</span>
              <span>{item.formattedYearBuilt}</span>
              <span className="text-neutral-300 dark:text-zinc-800">•</span>
              <span>{item.formattedHousehold}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Dynamic Metric & Favorite Heart */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Dynamic Metric Value */}
          <div className="text-right flex flex-col justify-center">
            {currentCategory === 'rank-abs-price' || currentCategory === 'favorites' ? (
              <>
                <span className="text-[14.5px] font-black text-neutral-900 dark:text-neutral-50 tracking-tight leading-tight">
                  {item.totalPrice > 0 ? item.formattedPrice : '-'}
                </span>
                <span className="text-[10.5px] font-bold text-neutral-400 dark:text-neutral-500 mt-0.5 tracking-tight leading-none">
                  {item.pyeongPrice > 0 ? `${item.formattedPyeong}` : '-'}
                </span>
              </>
            ) : currentCategory === 'rank-price' || currentCategory.startsWith('dong-') ? (
              <>
                <span className="text-[14.5px] font-black text-neutral-900 dark:text-neutral-50 tracking-tight leading-tight">
                  {item.pyeongPrice > 0 ? `${item.formattedPyeong}` : '-'}
                </span>
                <span className="text-[10.5px] font-bold text-neutral-400 dark:text-neutral-500 mt-0.5 tracking-tight leading-none">
                  {item.totalPrice > 0 ? `매매 ${item.formattedPrice}` : '-'}
                </span>
              </>
            ) : currentCategory === 'rank-jeonse' ? (
              <>
                <span className="text-[14.5px] font-black text-[#008060] dark:text-[#00d29d] tracking-tight leading-tight">
                  {item.ratio > 0 ? item.formattedRatio : '-'}
                </span>
                <span className="text-[10.5px] font-bold text-neutral-400 dark:text-neutral-500 mt-0.5 tracking-tight leading-none">
                  {item.jeonsePrice > 0 ? `전세 ${item.formattedJeonse}` : '-'}
                </span>
              </>
            ) : currentCategory === 'rank-turnover' ? (
              <>
                <span className="text-[14.5px] font-black text-indigo-600 dark:text-indigo-400 tracking-tight leading-tight">
                  {item.turnoverRate > 0 ? `${item.turnoverRate.toFixed(1)}%` : '-'}
                </span>
                <span className="text-[10.5px] font-bold text-neutral-400 dark:text-neutral-500 mt-0.5 tracking-tight leading-none">
                  {item.volume3M > 0 ? `거래 ${item.volume3M}건` : '-'}
                </span>
              </>
            ) : currentCategory === 'rank-views' ? (
              <>
                <span className="text-[14.5px] font-black text-orange-500 tracking-tight leading-tight">
                  {views > 0 ? `${views.toLocaleString()}회` : '0회'}
                </span>
                <span className="text-[10.5px] font-bold text-neutral-400 dark:text-neutral-500 mt-0.5 tracking-tight leading-none">
                  {item.totalPrice > 0 ? `매매 ${item.formattedPrice}` : '-'}
                </span>
              </>
            ) : (
              <>
                <span className="text-[14.5px] font-black text-neutral-900 dark:text-neutral-50 tracking-tight leading-tight">
                  {item.totalPrice > 0 ? item.formattedPrice : '-'}
                </span>
                <span className="text-[10.5px] font-bold text-neutral-400 dark:text-neutral-500 mt-0.5 tracking-tight leading-none">
                  {item.pyeongPrice > 0 ? `${item.formattedPyeong}` : '-'}
                </span>
              </>
            )}
          </div>

          {/* Heart Icon (Compact, without the heavy capsule) */}
          <div className="shrink-0 flex items-center justify-center">
            <InteractiveHeart 
              isFavorited={isFavorited} 
              name={item.apt.name} 
              onToggle={onToggleFavorite} 
              size={16} 
            />
          </div>
        </div>
      </div>
    </div>
  );
});
AptRow.displayName = 'AptRow';

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

const TossApartmentExploreClientPropsSchema = z.object({
  sheetApartments: z.record(z.string(), z.array(z.any())),
  txSummaryData: z.record(z.string(), z.any()),
  nameMapping: z.record(z.string(), z.string()),
  favoriteCounts: z.record(z.string(), z.number()),
  typeMap: z.record(z.string(), z.any()),
});

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
  const [visibleCount, setVisibleCount] = useState(15);
  const searchFocusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (searchFocusTimeoutRef.current) clearTimeout(searchFocusTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
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
  const debouncedSearchQuery = useDebounce(searchQuery, 200);

  // 카테고리나 검색어 변경 시 노출 갯수를 15개로 초기화하여 CLS 방지
  useEffect(() => {
    setVisibleCount(15);
  }, [currentCategory, debouncedSearchQuery]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const [sortKey, setSortKey] = useState<string>('totalPrice');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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
    else if (key === 'volume3M') setCurrentCategory('custom-sort');
    else if (key === 'turnoverRate') setCurrentCategory('rank-turnover');
    else if (key === 'views') setCurrentCategory('rank-views');
    else setCurrentCategory('custom-sort');
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
    }
  }, [currentCategory]);

  useEffect(() => {
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
    return Object.values(sheetApartments).flat().filter((a: DongApartment) => !publicRentalSet.has(a.name));
  }, [sheetApartments, publicRentalSet]);

  const enrichedApts = useMemo(() => {
    return allApts.map((apt: DongApartment) => {
      const rawKey = apt.txKey || apt.name;
      const txKey = findTxKey(rawKey, txSummaryData, nameMapping) || rawKey;

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

      if (valA === valB) return 0;
      return sortDirection === 'desc' ? valB - valA : valA - valB;
    });

    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().replace(/\s+/g, '');
      filtered = filtered.filter(a => a.apt.name.toLowerCase().replace(/\s+/g, '').includes(q));
    }

    return filtered;
  }, [enrichedApts, currentCategory, debouncedSearchQuery, sortKey, sortDirection, userFavorites, favoriteCounts, fieldReportsMap]);

  const { suggestionsApts, suggestionsDongs, suggestionsBrands } = useMemo(() => {
    const q = searchQuery.toLowerCase().replace(/\s+/g, '');
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
  }, [enrichedApts, searchQuery]);

  const recommendedKeywords = ['동탄역', '시범단지', '롯데캐슬', '반도유보라', '자이', '더샵'];



  return (
    <div className="flex flex-col w-full bg-transparent">
      {/* Standardized Hero Header */}
      <div className="shrink-0">
        <PageHeroHeader 
          title="D-VIEW 아파트 탐색"
          subtitleStrong="동탄 전역 아파트 비교 분석"
          subtitleLight="시세, 거래량, 관심도 등 다양한 지표로 아파트를 탐색하세요"
        />
      </div>


      {/* Main Content Area */}
      <div className="w-full px-4 sm:px-6 md:px-10 lg:px-16 pt-3 md:pt-5 pb-8 md:pb-4 bg-transparent flex-1 min-h-0 flex flex-col">
        <div className="flex w-full bg-surface md:rounded-2xl md:border md:border-border/80 md:shadow-sm items-stretch flex-1 min-h-0">
          <aside className="hidden md:flex flex-col w-[240px] shrink-0 border-r border-border bg-neutral-50/40 dark:bg-zinc-900/10 py-6 px-4 sticky top-[68px] self-start md:rounded-l-2xl">

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
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
        <div className="px-0 py-3 md:py-4 border-b border-border flex flex-col md:flex-row md:justify-between md:items-end gap-3 md:gap-4 shrink-0 bg-white/95 dark:bg-[#1e1e1e]/95 backdrop-blur-md relative z-10">
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
            <p className="text-[13px] md:text-[15px] font-medium text-tertiary mt-0 md:mt-2">총 {sortedApts.length}개 단지</p>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2.5 w-full md:w-auto shrink-0">
            <div className="relative w-full md:w-[220px] shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" size={18} />
              <input 
              type="text" 
              placeholder="단지명 검색 (예: 롯데캐슬)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                if (searchFocusTimeoutRef.current) clearTimeout(searchFocusTimeoutRef.current);
                searchFocusTimeoutRef.current = setTimeout(() => setIsSearchFocused(false), 200);
              }}
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
            </div>

            {/* Mobile Category Chips Scrollbar (Default view below search bar) */}
            <div 
              className="flex md:hidden overflow-x-auto no-scrollbar gap-1.5 py-1.5 w-full scroll-smooth shrink-0"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
            
            <div 
              className="flex flex-row overflow-x-auto whitespace-nowrap gap-2 py-1 w-full md:w-auto shrink-0 -mx-4 px-4 md:mx-0 md:px-0 md:items-center md:gap-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {onOpenCompare && (
                <button
                  onClick={onOpenCompare}
                  className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[#00664d] dark:text-[#00d29d] text-[12px] font-extrabold rounded-full transition-all active:scale-95 cursor-pointer border border-emerald-500/20 whitespace-nowrap shrink-0 text-center inline-block"
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
          {/* Table Header */}
          <div className="hidden md:flex sticky top-[68px] z-20 bg-surface/90 backdrop-blur-md items-center md:pl-8 md:pr-[47px] py-3.5 border-b border-neutral-100 dark:border-zinc-900/40 text-[12.5px] font-extrabold text-neutral-500 dark:text-neutral-400 shrink-0 select-none shadow-sm shadow-black/[0.01]">
            <div className="w-[36px] shrink-0" aria-hidden="true">&nbsp;</div>
            <button 
              onClick={() => handleHeaderSort('views')}
              className={`w-[40px] text-center shrink-0 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1.5 rounded-lg transition-all cursor-pointer relative flex items-center justify-center ${sortKey === 'views' ? 'text-[#008060] dark:text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              <span className="w-full text-center">순위</span>
              {sortKey === 'views' && (
                <span className="absolute -right-0.5 top-1/2 -translate-y-1/2">
                  {sortDirection === 'desc' ? <ArrowDown className="w-2.5 h-2.5 text-[#008060] dark:text-[#00d29d]" /> : <ArrowUp className="w-2.5 h-2.5 text-[#008060] dark:text-[#00d29d]" />}
                </span>
              )}
            </button>
            <button 
              onClick={() => handleHeaderSort('name')}
              className={`flex-1 min-w-[120px] ml-2 text-left focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 px-2 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${sortKey === 'name' ? 'text-[#008060] dark:text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              <span>단지명</span>
              {sortKey === 'name' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" />)}
            </button>
            <button 
              onClick={() => handleHeaderSort('yearBuilt')}
              className={`w-[105px] text-right pr-2 shrink-0 hidden xl:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'yearBuilt' ? 'text-[#008060] dark:text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'yearBuilt' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" />)}
              <span>연식</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('totalPrice')}
              className={`w-[100px] text-right pr-2 shrink-0 flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'totalPrice' ? 'text-[#008060] dark:text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'totalPrice' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" />)}
              <span>매매가</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('pyeongPrice')}
              className={`w-[85px] text-right pr-2 shrink-0 flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'pyeongPrice' ? 'text-[#008060] dark:text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'pyeongPrice' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" />)}
              <span>평당가</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('ratio')}
              className={`w-[110px] text-right pr-2 shrink-0 hidden lg:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'ratio' ? 'text-[#008060] dark:text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'ratio' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" />)}
              <span>전세가</span>
            </button>
            <button 
              onClick={() => handleHeaderSort('householdCount')}
              className={`w-[80px] text-right pr-2 shrink-0 hidden xl:flex items-center justify-end gap-1 focus:outline-none hover:bg-neutral-50 dark:hover:bg-zinc-900/50 py-1 rounded-lg transition-all cursor-pointer ${sortKey === 'householdCount' ? 'text-[#008060] dark:text-[#00d29d] bg-neutral-50 dark:bg-zinc-900/50 font-black' : ''}`}
            >
              {sortKey === 'householdCount' && (sortDirection === 'desc' ? <ArrowDown className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" /> : <ArrowUp className="w-3 h-3 text-[#008060] dark:text-[#00d29d]" />)}
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
            <div id="explore-list-container" className="w-full flex-1 pt-1.5">
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
                    />
                    {index === 14 && sortedApts.length > 15 && (
                      <div className="px-3 md:px-4 py-1.5 md:py-1 w-full">
                        <NativeAdPlaceholder location="아파트 탐색 리스트 중간" isCompact={true} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* 분석 단지 더보기 버튼 (CLS 최적화 및 뷰포트 안정화) */}
              {sortedApts.length > visibleCount && (
                <div className="w-full flex justify-center mt-4 mb-2 px-1 md:px-0">
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
        active ? 'bg-[#e0fbf4] text-[#008060]' : 'text-primary hover:bg-body/50'
      }`}
    >
      {label}
      {active && <div className="w-1.5 h-1.5 rounded-full bg-[#00b386]" />}
    </button>
  );
}
