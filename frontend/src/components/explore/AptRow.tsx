import React, { memo } from 'react';
import { EnrichedApt } from './types';
import { preloadApartmentModal } from '@/lib/preload';
import { formatEokWithUnit } from '@/components/MacroDashboardClient';

interface AptRowProps {
  item: EnrichedApt;
  index: number;
  handleSelectApt: (name: string) => void;
  currentCategory: string;
  photoCount: number;
  views: number;
  maxPyeongPrice?: number;
  preloadApartmentTx?: (apartmentName: string, dong: string) => void;
}

const formatEqPrice = (priceMan: number) => {
  if (!priceMan || priceMan <= 0) return '-';
  const { value, unit } = formatEokWithUnit(priceMan);
  return value + (unit === '만원' ? '만' : '');
};

export const AptRow = memo(({ 
  item, 
  index, 
  handleSelectApt, 
  currentCategory,
  photoCount,
  views,
  maxPyeongPrice = 0,
  preloadApartmentTx
}: AptRowProps) => {

  const getRankBadgeStyle = (idx: number) => {
    switch (idx) {
      case 0:
        return 'bg-blue-600 text-white border border-blue-600 shadow-2xs';
      case 1:
        return 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40';
      case 2:
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40';
      case 3:
        return 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50';
      default:
        return 'bg-slate-100 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border border-border/30';
    }
  };

  const isPyeongMode = currentCategory === 'rank-price' || currentCategory.startsWith('dong-');
  const eq34PriceMan = item.pyeongPrice > 0 ? Math.round(item.pyeongPrice * 34) : 0;
  const formattedEq34 = formatEqPrice(eq34PriceMan);
  const relativePyeongPct =
    maxPyeongPrice > 0 && item.pyeongPrice > 0
      ? Math.max(12, Math.min(100, Math.round((item.pyeongPrice / maxPyeongPrice) * 100)))
      : 0;

  const renderRightMetric = () => {
    if (currentCategory === 'rank-abs-price' || currentCategory === 'favorites') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">최근 평균 매매가</span>
          <span className="text-sm md:text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">{item.totalPrice > 0 ? item.formattedPrice : '-'}</span>
        </div>
      );
    }
    if (isPyeongMode) {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">3.3㎡당 평단가</span>
          <span className="text-sm md:text-base font-black text-blue-600 dark:text-blue-400 font-mono tabular-nums mt-0.5">
            {item.pyeongPrice > 0 ? `${item.formattedPyeong}/평` : '-'}
          </span>
          {eq34PriceMan > 0 && (
            <span className="text-[11px] font-semibold text-secondary font-mono tabular-nums mt-0.5">
              34평 환산 {formattedEq34}
            </span>
          )}
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
          <span className="text-sm md:text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">{item.turnoverRate > 0 ? `${item.turnoverRate.toFixed(1)}%` : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-views') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">조회수</span>
          <span className="text-sm md:text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">{views > 0 ? `${views.toLocaleString()}회` : '0회'}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start md:items-end">
        <span className="text-[11px] font-bold text-tertiary">최근 평균 매매가</span>
        <span className="text-sm md:text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">{item.totalPrice > 0 ? item.formattedPrice : '-'}</span>
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
        className="group flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-5 border border-border hover:border-blue-500/30 rounded-2xl bg-surface hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-all cursor-pointer shadow-xs relative overflow-hidden w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Rank Badge */}
          <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 text-base md:text-lg font-black font-mono tabular-nums ${getRankBadgeStyle(index)}`}>
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
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                  사진 {photoCount}장
                </span>
              )}
            </div>

            {/* Inline Relative Pyeong Price Gauge Bar (Active in Pyeong Mode) */}
            {isPyeongMode && relativePyeongPct > 0 && (
              <div className="flex items-center gap-2.5 mt-2 max-w-md">
                <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      index === 0 ? 'bg-blue-600' : index < 3 ? 'bg-blue-500' : 'bg-slate-400 dark:bg-slate-500'
                    }`}
                    style={{ width: `${relativePyeongPct}%` }}
                  />
                </div>
                <span className="text-[10.5px] font-mono tabular-nums font-semibold text-tertiary shrink-0">
                  {index === 0 && relativePyeongPct === 100
                    ? '1위 기준 (100%)'
                    : `1위 대비 ${relativePyeongPct}%`}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-bold text-tertiary select-none">
              {item.totalPrice > 0 && (
                <span className="bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg border border-border/30 text-secondary">
                  평당 <strong className="text-primary font-black font-mono tabular-nums">{item.formattedPyeong}</strong> · 평균 매매 <strong className="text-secondary font-black font-mono tabular-nums">{item.formattedPrice}</strong>
                </span>
              )}
              {item.jeonsePrice > 0 && (
                <span className="bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg border border-border/30 text-secondary">
                  전세 <strong className="text-secondary font-black font-mono tabular-nums">{item.formattedJeonse}</strong> (전세가율 {item.formattedRatio})
                </span>
              )}
              {item.volume3M > 0 && (
                <span className="bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-lg border border-border/30 text-secondary">
                  3개월 거래 <strong className="text-secondary font-black font-mono tabular-nums">{item.formattedVolume}</strong> (회전율 {item.formattedTurnover || '0%'})
                </span>
              )}
              {item.totalPrice === 0 && item.jeonsePrice === 0 && item.volume3M === 0 && (
                <span className="text-tertiary">최근 거래 정보가 부족합니다.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side Metric and Action Button */}
        <div className="flex md:flex-col items-end justify-between md:justify-center gap-2.5 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/40 border-dashed shrink-0 pl-0 md:pl-6 md:w-40">
          {renderRightMetric()}
          <span className="text-[12px] font-extrabold text-secondary bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 rounded-xl border border-border/40 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:border-blue-200/40 transition-all">
            상세 분석
          </span>
        </div>
      </div>
    </div>
  );
});
AptRow.displayName = 'AptRow';
