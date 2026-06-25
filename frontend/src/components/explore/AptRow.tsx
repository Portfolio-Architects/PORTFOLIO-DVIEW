import React, { useState, useEffect, useRef, memo } from 'react';
import { Heart, Camera } from 'lucide-react';
import { EnrichedApt } from './types';

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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (animateTimeoutRef.current) {
        clearTimeout(animateTimeoutRef.current);
        animateTimeoutRef.current = null;
      }
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
    if (animateTimeoutRef.current) {
      clearTimeout(animateTimeoutRef.current);
      animateTimeoutRef.current = null;
    }
    animateTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setAnimate(false);
        animateTimeoutRef.current = null;
      }
    }, 300);
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
  preloadApartmentTx?: (apartmentName: string, dong: string) => void;
}

export const AptRow = memo(({ 
  item, 
  index, 
  handleSelectApt, 
  onToggleFavorite, 
  currentCategory,
  isFavorited,
  likes,
  photoCount,
  views,
  preloadApartmentTx
}: AptRowProps) => {
  const displayLikes = isFavorited ? Math.max(likes, 1) : likes;
  
  return (
    <div className="w-full flex flex-col px-0 py-0">
      {/* Desktop View (Hidden on Mobile) */}
      <div 
        onClick={() => handleSelectApt(item.apt.name)}
        onMouseEnter={() => {
          preloadApartmentTx?.(item.apt.name, item.apt.dong);
          import('@/components/ApartmentModal').catch(() => {});
          import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
        }}
        onTouchStart={() => {
          preloadApartmentTx?.(item.apt.name, item.apt.dong);
          import('@/components/ApartmentModal').catch(() => {});
          import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
        }}
        className="hidden md:flex items-center px-6 h-[60px] border-b border-neutral-100/70 dark:border-zinc-900/30 last:border-b-0 cursor-pointer transition-all duration-200 ease-in-out hover:bg-neutral-50/60 dark:hover:bg-zinc-900/30"
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
          <span className="text-[15.5px] font-black text-neutral-900 dark:text-neutral-100 leading-none group-hover:text-toss-blue transition-colors">{item.apt.name}</span>
          {photoCount > 0 && (
            <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-100/50 dark:border-emerald-900/30 leading-none flex items-center shrink-0 gap-0.5 shadow-sm">
              <Camera className="w-2.5 h-2.5" />
              사진 {photoCount}장
            </span>
          )}
          {displayLikes > 0 && (
            <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 text-[10px] font-bold rounded-full border border-rose-100/50 dark:border-rose-900/30 leading-none flex items-center shrink-0 gap-0.5 shadow-sm">
              <Heart className="w-2.5 h-2.5 fill-current" />
              관심 {displayLikes}
            </span>
          )}
        </div>

        {/* Age (shown at xl) */}
        <div className="w-[95px] text-right pr-3 text-[13.5px] font-semibold text-neutral-600 dark:text-neutral-400 leading-none shrink-0 hidden xl:block whitespace-nowrap">
          {item.formattedYearBuilt}
        </div>
        
        {/* Price */}
        <div className="w-[130px] text-right pr-3 text-[15.5px] font-black text-neutral-950 dark:text-neutral-50 shrink-0 whitespace-nowrap">
          {item.formattedPrice}
        </div>
        
        {/* Pyeong */}
        <div className="w-[90px] text-right pr-3 text-[14.5px] font-extrabold text-emerald-700 dark:text-toss-blue shrink-0 whitespace-nowrap">
          {item.formattedPyeong}
        </div>

        {/* Jeonse (shown at lg) */}
        <div className="w-[120px] text-right pr-3 flex flex-col justify-center items-end gap-1 shrink-0 hidden lg:flex">
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
        <div className="w-[90px] text-right pr-3 text-[13.5px] font-medium text-neutral-500 dark:text-neutral-400 leading-none shrink-0 hidden xl:block whitespace-nowrap">
          {item.formattedHousehold}
        </div>

        {/* Volume (shown at xl) */}
        <div className="w-[100px] text-right pr-3 flex flex-col justify-center items-end gap-1 shrink-0 hidden xl:flex">
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
        onTouchStart={() => {
          preloadApartmentTx?.(item.apt.name, item.apt.dong);
          import('@/components/ApartmentModal').catch(() => {});
          import('@/components/apartment-modal/TransactionChartSection').catch(() => {});
        }}
        className={`flex md:hidden items-center justify-between px-4 h-[64px] cursor-pointer transition-all duration-200 ease-in-out active:bg-neutral-100/60 dark:active:bg-zinc-900/40 ${
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
                <span className="text-[14.5px] font-black text-emerald-700 dark:text-toss-blue tracking-tight leading-tight">
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
