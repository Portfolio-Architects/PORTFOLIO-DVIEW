import React, { useState, useEffect, useRef, memo } from 'react';
import { Heart, Camera } from 'lucide-react';
import { EnrichedApt } from './types';
import { preloadApartmentModal } from '@/lib/utils/preloadHelpers';

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

  const getRankBadgeStyle = (idx: number) => {
    switch (idx) {
      case 0:
        return 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400';
      case 1:
        return 'bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400';
      case 2:
        return 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-orange-600 dark:text-orange-400';
      case 3:
        return 'bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-neutral-400';
    }
  };



  const renderRightMetric = () => {
    if (currentCategory === 'rank-abs-price' || currentCategory === 'favorites') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">최근 평균 매매가</span>
          <span className="text-sm md:text-base font-black text-[#ea6100] mt-0.5">{item.totalPrice > 0 ? item.formattedPrice : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-price' || currentCategory.startsWith('dong-')) {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">평당 매매가</span>
          <span className="text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{item.pyeongPrice > 0 ? item.formattedPyeong : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-jeonse') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">전세가율</span>
          <span className="text-sm md:text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{item.ratio > 0 ? item.formattedRatio : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-turnover') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">최근 3개월 회전율</span>
          <span className="text-sm md:text-base font-black text-[#ea6100] mt-0.5">{item.turnoverRate > 0 ? `${item.turnoverRate.toFixed(1)}%` : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-views') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">조회수</span>
          <span className="text-sm md:text-base font-black text-orange-500 mt-0.5">{views > 0 ? `${views.toLocaleString()}회` : '0회'}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start md:items-end">
        <span className="text-[11px] font-bold text-tertiary">최근 평균 매매가</span>
        <span className="text-sm md:text-base font-black text-[#ea6100] mt-0.5">{item.totalPrice > 0 ? item.formattedPrice : '-'}</span>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col px-0 py-1.5">
      <div 
        onMouseEnter={() => {
          preloadApartmentTx?.(item.apt.name, item.apt.dong);
          preloadApartmentModal();
        }}
        onTouchStart={() => {
          preloadApartmentTx?.(item.apt.name, item.apt.dong);
          preloadApartmentModal();
        }}
        onClick={() => handleSelectApt(item.apt.name)}
        className="group flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-5 border border-border hover:border-emerald-500/40 rounded-2xl bg-surface hover:bg-neutral-50/20 dark:hover:bg-zinc-900/10 transition-all cursor-pointer shadow-sm relative overflow-hidden w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Rank Badge */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-black ${getRankBadgeStyle(index)}`}>
            {index + 1}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-primary truncate leading-snug">{item.apt.name}</h3>
              <InteractiveHeart 
                isFavorited={isFavorited} 
                name={item.apt.name} 
                onToggle={onToggleFavorite} 
                size={17} 
              />
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-secondary shrink-0">
                {item.apt.dong}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-secondary shrink-0">
                {item.formattedYearBuilt}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-zinc-800 text-secondary shrink-0">
                {item.formattedHousehold}
              </span>
              {photoCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-0.5">
                  <Camera className="w-2.5 h-2.5" />
                  사진 {photoCount}장
                </span>
              )}
              {displayLikes > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 shrink-0 flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5 fill-current" />
                  관심 {displayLikes}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] font-bold text-tertiary select-none">
              {item.totalPrice > 0 && (
                <span className="bg-neutral-50 dark:bg-zinc-800/40 px-2.5 py-1 rounded-lg border border-border/30 text-secondary">
                  평당 <strong className="text-secondary font-black">{item.formattedPyeong}</strong> (매매 {item.formattedPrice})
                </span>
              )}
              {item.jeonsePrice > 0 && (
                <span className="bg-neutral-50 dark:bg-zinc-800/40 px-2.5 py-1 rounded-lg border border-border/30 text-secondary">
                  전세 <strong className="text-secondary font-black">{item.formattedJeonse}</strong> (가율 {item.formattedRatio})
                </span>
              )}
              {item.volume3M > 0 && (
                <span className="bg-neutral-50 dark:bg-zinc-800/40 px-2.5 py-1 rounded-lg border border-border/30 text-secondary">
                  3달 거래량 <strong className="text-secondary font-black">{item.formattedVolume}</strong> (회전율 {item.formattedTurnover || '0%'})
                </span>
              )}
              {item.totalPrice === 0 && item.jeonsePrice === 0 && item.volume3M === 0 && (
                <span className="text-tertiary">최근 거래 정보가 부족합니다.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side Metric and Action Button */}
        <div className="flex md:flex-col items-end justify-between md:justify-center gap-2.5 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/40 border-dashed shrink-0 pl-0 md:pl-6 md:w-36">
          {renderRightMetric()}
          <span className="text-[12px] font-extrabold text-secondary bg-neutral-50 dark:bg-zinc-800/40 px-3 py-1.5 rounded-xl border border-border/40 group-hover:bg-emerald-500/10 group-hover:text-emerald-600 group-hover:border-emerald-500/20 transition-all">
            상세 분석
          </span>
        </div>
      </div>
    </div>
  );
});
AptRow.displayName = 'AptRow';
