import React, { memo } from 'react';
import { Star } from 'lucide-react';
import { EnrichedApt } from './types';
import { preloadApartmentModal } from '@/components/common/ComponentPreloader';
import { formatEokWithUnit } from '@/components/MacroDashboardClient';
import { trackEvent } from '@/lib/utils/analytics';

interface AptRowProps {
  item: EnrichedApt;
  index: number;
  handleSelectApt: (name: string) => void;
  currentCategory: string;
  photoCount: number;
  views: number;
  maxPyeongPrice?: number;
  preloadApartmentTx?: (apartmentName: string, dong: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (aptName: string) => void;
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
  preloadApartmentTx,
  isFavorite = false,
  onToggleFavorite,
}: AptRowProps) => {

  const getRankBadgeStyle = (idx: number) => {
    switch (idx) {
      case 0:
        return 'dview-spark-badge text-white shadow-2xs';
      case 1:
      case 2:
        return 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs';
      case 3:
        return 'bg-[#eff1f5] dark:bg-[#1e2532] text-primary';
      default:
        return 'bg-[#eff1f5] dark:bg-[#1e2532] text-secondary';
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
          <span className="text-sm md:text-base font-black text-primary tabular-nums mt-0.5">{item.totalPrice > 0 ? item.formattedPrice : '-'}</span>
        </div>
      );
    }
    if (isPyeongMode) {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">3.3㎡당 평단가</span>
          <span className="text-sm md:text-base font-black text-primary tabular-nums mt-0.5">
            {item.pyeongPrice > 0 ? `${item.formattedPyeong}/평` : '-'}
          </span>
          {eq34PriceMan > 0 && (
            <span className="text-[11px] font-semibold text-secondary tabular-nums mt-0.5">
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
          <span className="text-sm md:text-base font-black text-primary tabular-nums mt-0.5">{item.ratio > 0 ? item.formattedRatio : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-turnover') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">최근 3개월 회전율</span>
          <span className="text-sm md:text-base font-black text-primary tabular-nums mt-0.5">{item.turnoverRate > 0 ? `${item.turnoverRate.toFixed(1)}%` : '-'}</span>
        </div>
      );
    }
    if (currentCategory === 'rank-views') {
      return (
        <div className="flex flex-col items-start md:items-end">
          <span className="text-[11px] font-bold text-tertiary">조회수</span>
          <span className="text-sm md:text-base font-black text-primary tabular-nums mt-0.5">{views > 0 ? `${views.toLocaleString()}회` : '0회'}</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start md:items-end">
        <span className="text-[11px] font-bold text-tertiary">최근 평균 매매가</span>
        <span className="text-sm md:text-base font-black text-primary tabular-nums mt-0.5">{item.totalPrice > 0 ? item.formattedPrice : '-'}</span>
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
        className="group flex flex-col md:flex-row items-stretch md:items-center justify-between p-4 md:p-5 rounded-2xl bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] transition-colors cursor-pointer relative overflow-hidden w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20 dark:focus-visible:ring-white/25"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Rank Badge */}
          <div className={`w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0 text-base md:text-lg font-black tabular-nums ${getRankBadgeStyle(index)}`}>
            {index + 1}
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-primary truncate leading-snug" suppressHydrationWarning>
                {item.apt.name}
              </h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#eff1f5] dark:bg-[#1e2532] text-secondary shrink-0">
                {item.apt.dong}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#eff1f5] dark:bg-[#1e2532] text-secondary shrink-0">
                {item.formattedYearBuilt}
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#eff1f5] dark:bg-[#1e2532] text-secondary shrink-0">
                {item.formattedHousehold}
              </span>
              {photoCount > 0 && (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#eff1f5] dark:bg-[#1e2532] text-primary shrink-0 tabular-nums">
                  사진 {photoCount}장
                </span>
              )}
            </div>

            {/* Inline Relative Pyeong Price Gauge Bar (Active in Pyeong Mode) */}
            {isPyeongMode && relativePyeongPct > 0 && (
              <div className="flex items-center gap-2.5 mt-2 max-w-md">
                <div className="flex-1 h-1.5 rounded-full bg-[#eff1f5] dark:bg-[#1e2532] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      index === 0 ? 'bg-slate-900 dark:bg-slate-100' : index < 3 ? 'bg-slate-600 dark:bg-slate-300' : 'bg-slate-400 dark:bg-slate-500'
                    }`}
                    style={{ width: `${relativePyeongPct}%` }}
                  />
                </div>
                <span className="text-[10.5px] tabular-nums font-semibold text-tertiary shrink-0">
                  {index === 0 && relativePyeongPct === 100
                    ? '1위 기준 (100%)'
                    : `1위 대비 ${relativePyeongPct}%`}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] font-bold text-tertiary select-none">
              {item.totalPrice > 0 && (
                <span className="bg-surface px-2.5 py-1 rounded-lg text-secondary">
                  평당 <strong className="text-primary font-black tabular-nums">{item.formattedPyeong}</strong> · 평균 매매 <strong className="text-secondary font-black tabular-nums">{item.formattedPrice}</strong>
                </span>
              )}
              {item.jeonsePrice > 0 && (
                <span className="bg-surface px-2.5 py-1 rounded-lg text-secondary">
                  전세 <strong className="text-secondary font-black tabular-nums">{item.formattedJeonse}</strong> (전세가율 {item.formattedRatio})
                </span>
              )}
              {item.volume3M > 0 && (
                <span className="bg-surface px-2.5 py-1 rounded-lg text-secondary">
                  3개월 거래 <strong className="text-secondary font-black tabular-nums">{item.formattedVolume}</strong> (회전율 {item.formattedTurnover || '0%'})
                </span>
              )}
              {item.totalPrice === 0 && item.jeonsePrice === 0 && item.volume3M === 0 && (
                <span className="text-tertiary">최근 거래 정보가 부족합니다.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side Metric and Action Button */}
        <div className="flex md:flex-col items-end justify-between md:justify-center gap-2.5 mt-4 md:mt-0 pt-3 md:pt-0 border-t md:border-t-0 border-border/40 border-dashed shrink-0 pl-0 md:pl-6 md:w-44">
          {renderRightMetric()}
          <div className="flex items-center gap-1.5">
            {onToggleFavorite && (
              <button
                type="button"
                data-testid={`explore-fav-toggle-${item.apt.name}`}
                aria-pressed={isFavorite}
                aria-label={`${item.apt.name} ${isFavorite ? '관심단지 해제' : '관심단지 저장'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  trackEvent('watchlist_toggle_favorite', {
                    apt_name: item.apt.name,
                    is_favorite: !isFavorite,
                    surface: 'explore_list',
                  });
                  onToggleFavorite(item.apt.name);
                }}
                className={`w-9 h-9 md:w-8 md:h-8 inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer touch-manipulation ${
                  isFavorite
                    ? 'bg-brand-red-light text-brand-red'
                    : 'bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#252c3d] text-tertiary hover:text-primary'
                }`}
                title={isFavorite ? '내 관심단지 해제' : '내 관심단지 저장'}
              >
                <Star
                  size={15}
                  className={isFavorite ? 'fill-current text-brand-red' : ''}
                />
              </button>
            )}
            <span className="min-h-[36px] md:min-h-[32px] inline-flex items-center text-[12px] font-extrabold text-secondary bg-surface px-3.5 py-1.5 rounded-xl group-hover:bg-slate-900 group-hover:text-white dark:group-hover:bg-slate-100 dark:group-hover:text-slate-900 transition-colors">
              상세 분석
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
AptRow.displayName = 'AptRow';
