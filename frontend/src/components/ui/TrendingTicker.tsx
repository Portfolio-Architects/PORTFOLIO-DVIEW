'use client';

import { useState, useEffect } from 'react';
import { Flame, ChevronDown } from 'lucide-react';

export interface PopularAptItem {
  name: string;
  dong: string;
  favCount: number;
  avg3M: number;
  latestPrice: string;
  rank: number;
}

interface TrendingTickerProps {
  popularAptItems: PopularAptItem[];
  onSelectApt?: (name: string) => void;
}

export function TrendingTicker({ popularAptItems, onSelectApt }: TrendingTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (popularAptItems.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % popularAptItems.length);
    }, 3000); // 3 seconds rolling
    return () => clearInterval(interval);
  }, [popularAptItems, isHovered]);

  if (!popularAptItems || popularAptItems.length === 0) return null;

  return (
    <div 
      className="relative bg-surface border-y border-border px-3 sm:px-6 md:px-10 lg:px-16 py-2.5 min-h-[46px] flex items-center justify-between w-full shadow-sm transition-all z-40 select-none cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between max-w-[2000px] w-full mx-auto">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <Flame size={16} className="text-teal-500 animate-pulse fill-teal-500" />
            <span className="text-[13px] font-black text-teal-600 dark:text-teal-400 tracking-tight">실시간 인기</span>
          </div>
          
          {/* Rolling Area */}
          <div className="relative h-[26px] overflow-hidden flex-1 min-w-0">
            <div 
              className="flex flex-col transition-transform duration-500 ease-in-out"
              style={{ transform: `translateY(-${currentIndex * 26}px)` }}
            >
              {popularAptItems.map((item, idx) => (
                <div 
                  key={item.name} 
                  className="h-[26px] flex items-center justify-between w-full min-w-0"
                  onClick={() => onSelectApt?.(item.name)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-[13px] font-black text-teal-500 w-[32px] text-left shrink-0 whitespace-nowrap">{item.rank}위</span>
                    {item.dong && (
                      <span className="text-[10px] font-extrabold text-secondary bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0 h-4 flex items-center">
                        {item.dong}
                      </span>
                    )}
                    <span className="text-[13px] font-bold text-primary truncate hover:text-teal-500 transition-colors">
                      {item.name}
                    </span>
                  </div>
                  
                  <div className="hidden sm:flex items-center gap-3 shrink-0 ml-4 text-[12px]">
                    {item.latestPrice && (
                      <span className="text-secondary font-bold">
                        최근거래 <span className="text-primary font-black">{item.latestPrice}</span>
                      </span>
                    )}
                    <span className="text-teal-600 dark:text-teal-400 font-extrabold bg-teal-500/5 px-2 py-0.5 rounded-[6px] border border-teal-500/10 shrink-0">
                      관심 {item.favCount}명
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hover / Dropdown Indicator */}
        <div className="flex items-center gap-1 ml-4 text-tertiary shrink-0">
          <span className="text-[11px] font-bold hidden sm:inline text-secondary/80">전체보기</span>
          <ChevronDown size={14} className={`transition-transform duration-300 ${isHovered ? 'rotate-180 text-primary' : ''}`} />
        </div>

        {/* Hover Popover Dropdown */}
        <div 
          className={`absolute left-3 right-3 sm:left-6 sm:right-6 md:left-10 md:right-10 lg:left-16 lg:right-16 top-full mt-1.5 bg-white dark:bg-zinc-950 border border-border rounded-2xl shadow-xl p-3.5 z-50 flex flex-col gap-1 transition-all duration-200 ${
            isHovered ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-1 pointer-events-none'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/60 mb-2">
            <span className="text-[13px] font-black text-primary flex items-center gap-1">
              <span>📈</span> 실시간 급상승 인기 단지
            </span>
            <span className="text-[11px] text-tertiary font-bold">D-VIEW 관심도 및 거래 기준</span>
          </div>
          {popularAptItems.map((item, idx) => (
            <div 
              key={item.name}
              onClick={() => {
                onSelectApt?.(item.name);
                setIsHovered(false);
              }}
              className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-[10px] cursor-pointer transition-colors group/item"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className={`w-5 h-5 flex items-center justify-center rounded-[6px] text-[11px] font-black shrink-0 ${
                  idx === 0 ? 'bg-red-500/10 text-red-500' :
                  idx === 1 ? 'bg-orange-500/10 text-orange-500' :
                  idx === 2 ? 'bg-yellow-500/10 text-yellow-500' :
                  'bg-zinc-500/10 text-tertiary'
                }`}>
                  {idx + 1}
                </span>
                {item.dong && (
                  <span className="text-[11px] font-bold text-tertiary bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                    {item.dong}
                  </span>
                )}
                <span className="text-[13.5px] font-bold text-secondary group-hover/item:text-primary group-hover/item:font-extrabold truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4 text-[12.5px]">
                {item.latestPrice && (
                  <span className="text-secondary font-bold">
                    최근거래 <span className="text-primary font-black">{item.latestPrice}</span>
                  </span>
                )}
                <span className="text-teal-600 dark:text-teal-400 font-extrabold bg-teal-500/5 px-2 py-0.5 rounded-[6px] border border-teal-500/10 shrink-0">
                  관심 {item.favCount}명
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
