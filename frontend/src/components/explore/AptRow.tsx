import React, { memo } from 'react';
import { Camera } from 'lucide-react';
import { EnrichedApt } from './types';
import { preloadApartmentModal } from '@/lib/preload';

interface AptRowProps {
  item: EnrichedApt;
  index: number;
  handleSelectApt: (name: string) => void;
  currentCategory: string;
  photoCount: number;
  views: number;
  preloadApartmentTx?: (apartmentName: string, dong: string) => void;
}

export const AptRow = memo(({ 
  item, 
  index, 
  handleSelectApt, 
  currentCategory,
  photoCount,
  views,
  preloadApartmentTx
}: AptRowProps) => {

  const getRankBadgeStyle = (idx: number) => {
    switch (idx) {
      case 0:
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40';
      case 1:
        return 'bg-brand-blue-light text-brand-blue dark:bg-brand-blue-light/10 border border-brand-blue/20';
      case 2:
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200/20';
      case 3:
        return 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50';
      default:
        return 'bg-slate-100 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border border-border/30';
    }
  };



  const renderRightMetric = () => {
    if (currentCategory === 'rank-abs-price' || currentCategory === 'favorites') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">최근 평균 매매가</span>
          <span className="text-sm md:text-base font-black text-[#057e77] dark:text-emerald-400 mt-0.5">{item.totalPrice > 0 ? item.formattedPrice : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-price' || currentCategory.startsWith('dong-')) {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">평당 매매가</span>
          <span className="text-sm md:text-base font-black text-brand-green dark:text-brand-green mt-0.5">{item.pyeongPrice > 0 ? item.formattedPyeong : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-jeonse') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">전세가율</span>
          <span className="text-sm md:text-base font-black text-brand-blue dark:text-brand-blue mt-0.5">{item.ratio > 0 ? item.formattedRatio : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-turnover') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">최근 3개월 회전율</span>
          <span className="text-sm md:text-base font-black text-[#057e77] dark:text-emerald-400 mt-0.5">{item.turnoverRate > 0 ? `${item.turnoverRate.toFixed(1)}%` : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-views') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">조회수</span>
          <span className="text-sm md:text-base font-black text-[#057e77] dark:text-emerald-400 mt-0.5">{views > 0 ? `${views.toLocaleString()}회` : '0회'}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start md:items-end">
        <span className="text-[11px] font-bold text-tertiary">최근 평균 매매가</span>
        <span className="text-sm md:text-base font-black text-[#057e77] dark:text-emerald-400 mt-0.5">{item.totalPrice > 0 ? item.formattedPrice : '-'}</span>
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
        className="group flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-5 border border-border hover:border-emerald-200/40 rounded-2xl bg-surface hover:bg-slate-50/20 dark:hover:bg-slate-900/10 transition-all cursor-pointer shadow-sm relative overflow-hidden w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Rank Badge */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-lg font-black ${getRankBadgeStyle(index)}`}>
            {index + 1}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-primary truncate leading-snug" suppressHydrationWarning>
                {item.apt.name}
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-secondary shrink-0">
                {item.apt.dong}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-secondary shrink-0">
                {item.formattedYearBuilt}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-secondary shrink-0">
                {item.formattedHousehold}
              </span>
              {photoCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0 flex items-center gap-0.5">
                  <Camera className="w-2.5 h-2.5" />
                  사진 {photoCount}장
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] font-bold text-tertiary select-none">
              {item.totalPrice > 0 && (
                <span className="bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg border border-border/30 text-secondary">
                  평당 <strong className="text-secondary font-black">{item.formattedPyeong}</strong> (매매 {item.formattedPrice})
                </span>
              )}
              {item.jeonsePrice > 0 && (
                <span className="bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg border border-border/30 text-secondary">
                  전세 <strong className="text-secondary font-black">{item.formattedJeonse}</strong> (가율 {item.formattedRatio})
                </span>
              )}
              {item.volume3M > 0 && (
                <span className="bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg border border-border/30 text-secondary">
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
          <span className="text-[12px] font-extrabold text-secondary bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-border/40 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200/20 transition-all">
            상세 분석
          </span>
        </div>
      </div>
    </div>
  );
});
AptRow.displayName = 'AptRow';
