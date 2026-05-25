'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Flame, ChevronUp, ChevronDown, Minus } from 'lucide-react';

interface TrendingTickerProps {
  topApts: { name: string; rank: number; change?: 'up' | 'down' | 'same'; changeValue?: number }[];
  onSelectApt?: (name: string) => void;
}

export function TrendingTicker({ topApts, onSelectApt }: TrendingTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (topApts.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % topApts.length);
    }, 3000); // 3 seconds rolling
    return () => clearInterval(interval);
  }, [topApts, isHovered]);

  if (topApts.length === 0) return null;

  const currentApt = topApts[currentIndex];

  const renderChangeIcon = (change?: 'up' | 'down' | 'same') => {
    if (change === 'up') return <ChevronUp size={14} className="text-rose-500 inline mr-0.5" />;
    if (change === 'down') return <ChevronDown size={14} className="text-blue-500 inline mr-0.5" />;
    return <Minus size={12} className="text-tertiary inline mr-0.5" />;
  };

  return (
    <div 
      className="bg-surface border-y border-border px-3 sm:px-6 md:px-10 lg:px-16 py-2.5 min-h-[46px] flex items-center justify-between w-full overflow-hidden shadow-sm transition-all"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between max-w-[2000px] w-full mx-auto">
        <div className="flex items-center gap-4 flex-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <Flame size={16} className="text-emerald-500 animate-pulse fill-emerald-500" />
            <span className="text-[13px] font-black text-emerald-600 tracking-tight">실시간 인기 단지</span>
          </div>
          
          <div className="flex-1 relative h-6 overflow-hidden flex items-center">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:underline text-primary transition-all duration-300 transform"
              onClick={() => onSelectApt?.(currentApt.name)}
            >
              <span className="text-[13px] font-black text-emerald-500 w-4 inline-block">{currentApt.rank}</span>
              <span className="text-[13px] font-bold tracking-tight text-primary max-w-[150px] sm:max-w-xs truncate">
                {currentApt.name}
              </span>
              <span className="text-[11px] font-semibold text-tertiary shrink-0 ml-1">
                {renderChangeIcon(currentApt.change)}
                {currentApt.change !== 'same' && (currentApt.changeValue || 1)}
              </span>
            </div>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] font-semibold text-tertiary overflow-x-auto no-scrollbar shrink-0 ml-4 max-w-[50%]">
          {topApts.slice(0, 5).map((apt) => (
            <button
              key={apt.name}
              onClick={() => onSelectApt?.(apt.name)}
              className={`hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap ${
                currentApt.name === apt.name ? 'text-emerald-600 font-bold' : ''
              }`}
            >
              <span>{apt.rank}위</span>
              <span className="truncate max-w-[70px]">{apt.name.replace('동탄역 ', '')}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
