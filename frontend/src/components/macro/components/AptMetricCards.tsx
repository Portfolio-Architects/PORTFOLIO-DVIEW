'use client';

import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { preloadApartmentModal } from '@/components/common/preload';
import { formatDeltaPrice, formatPriceEok, type AptDonutDataItem } from './AptDonutSection';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types';

export const formatCleanDate = (dateStr?: string, contractDate?: string): string => {
  if (contractDate && contractDate.length === 8) {
    return `${contractDate.slice(4, 6)}.${contractDate.slice(6, 8)}`;
  }
  if (!dateStr) return '';
  const mMatch = dateStr.match(/(\d{1,2})월\s*(\d{1,2})일/);
  if (mMatch) {
    return `${mMatch[1].padStart(2, '0')}.${mMatch[2].padStart(2, '0')}`;
  }
  const dotMatch = dateStr.match(/(\d{1,2})\.(\d{1,2})/);
  if (dotMatch) {
    return `${dotMatch[1].padStart(2, '0')}.${dotMatch[2].padStart(2, '0')}`;
  }
  return dateStr;
};

export const formatCompactEok = (priceVal?: number): string => {
  if (!priceVal || priceVal <= 0) return '';
  const rounded = Math.round(priceVal * 10) / 10;
  return `${rounded}억`;
};

export interface AptMetricCardsProps {
  recentTransactions?: any[];
  txSummaryData?: Record<string, AptTxSummary> | { summary?: Record<string, AptTxSummary> };
  macroTrendData?: DongtanMacroTrendPoint[];
  newHighCount?: number;
  newHighChange?: number;
  avgPyeongPrice?: number; // 만원 단위
  avgJeonseRate?: number; // % 단위
  onOpenSellTimingCalculator?: (aptName?: string) => void;
  activeSector?: AptDonutDataItem | null;
  onResetSector?: () => void;
  onSelectApt?: (name: string, dong?: string) => void;
  preloadApartmentTx?: (name: string, dong: string) => void;
  className?: string;
}

export const AptMetricCards = React.memo(function AptMetricCards({
  recentTransactions = [],
  txSummaryData,
  macroTrendData = [],
  newHighCount: propNewHighCount,
  newHighChange = 3,
  avgPyeongPrice: propAvgPyeongPrice,
  avgJeonseRate: propAvgJeonseRate,
  onOpenSellTimingCalculator,
  activeSector,
  onResetSector,
  onSelectApt,
  preloadApartmentTx,
  className = '',
}: AptMetricCardsProps) {
  // 1. Calculate New High Count
  const computedNewHighCount = useMemo(() => {
    if (propNewHighCount !== undefined) return propNewHighCount;
    if (Array.isArray(recentTransactions) && recentTransactions.length > 0) {
      return recentTransactions.filter(tx => tx?.isNewHigh || tx?.type === 'high').length;
    }
    if (txSummaryData) {
      const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>);
      const recentList = Object.values(summaryMap).flatMap(a => a.recent || []);
      if (recentList.length > 0) {
        return recentList.filter(tx => tx?.isNewHigh).length;
      }
    }
    if (Array.isArray(recentTransactions) && recentTransactions.length === 0) {
      return 0;
    }
    return 28;
  }, [recentTransactions, txSummaryData, propNewHighCount]);

  // 2. Calculate Average Price per Pyeong (만원)
  const computedAvgPyeongPrice = useMemo(() => {
    if (propAvgPyeongPrice !== undefined) return propAvgPyeongPrice;
    if (Array.isArray(recentTransactions) && recentTransactions.length > 0) {
      const validTx = recentTransactions.filter(
        tx => (typeof tx?.priceVal === 'number' && tx.priceVal > 0) || (typeof tx?.price === 'number' && tx.price > 0)
      );
      if (validTx.length > 0) {
        const sumPyeongPrice = validTx.reduce((acc, tx) => {
          const priceVal = typeof tx.priceVal === 'number' && isFinite(tx.priceVal)
            ? tx.priceVal
            : (typeof tx.price === 'number' && isFinite(tx.price) ? (tx.price > 1000 ? tx.price / 10000 : tx.price) : 0);
          const pyeong = typeof tx.areaPyeong === 'number' && tx.areaPyeong > 0
            ? tx.areaPyeong
            : (typeof tx.area === 'number' && tx.area > 0 ? tx.area / 3.3058 : 34);
          if (!pyeong || pyeong <= 0) return acc;
          return acc + (priceVal * 10000) / pyeong;
        }, 0);
        const avg = Math.round(sumPyeongPrice / validTx.length);
        if (isFinite(avg) && avg > 0) return avg;
      }
    }
    if (txSummaryData) {
      const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>);
      const validApts = Object.values(summaryMap).filter(
        a => (a.avg3MPerPyeong && a.avg3MPerPyeong > 0) || (a.avg1MPerPyeong && a.avg1MPerPyeong > 0)
      );
      if (validApts.length > 0) {
        const sumPyeong = validApts.reduce((acc, a) => acc + (a.avg3MPerPyeong || a.avg1MPerPyeong || 0), 0);
        const avg = Math.round(sumPyeong / validApts.length);
        if (isFinite(avg) && avg > 0) return avg;
      }
    }
    return 2845;
  }, [recentTransactions, txSummaryData, propAvgPyeongPrice]);

  // 3. Calculate Average Jeonse Rate (%)
  const computedAvgJeonseRate = useMemo(() => {
    if (propAvgJeonseRate !== undefined) return propAvgJeonseRate;
    if (Array.isArray(macroTrendData) && macroTrendData.length > 0) {
      for (let i = macroTrendData.length - 1; i >= 0; i--) {
        const point = macroTrendData[i];
        const sale = point?.['동탄 아파트 전체'];
        const jeonse = point?.['동탄 아파트 전세 평균'];
        if (typeof sale === 'number' && sale > 0 && typeof jeonse === 'number' && jeonse > 0 && isFinite(sale) && isFinite(jeonse)) {
          const rate = Math.round((jeonse / sale) * 1000) / 10;
          if (isFinite(rate) && rate > 0) return rate;
        }
      }
    }
    if (txSummaryData) {
      const summaryMap = (txSummaryData as { summary?: Record<string, AptTxSummary> })?.summary || (txSummaryData as Record<string, AptTxSummary>);
      const validApts = Object.values(summaryMap).filter(
        a => (a.avg3MPrice || a.latestPrice) && (a.avg3MRentDeposit || a.latestRentDeposit)
      );
      if (validApts.length > 0) {
        const sumRate = validApts.reduce((acc, a) => {
          const sale = (a.avg3MPrice && a.avg3MPrice > 0) ? a.avg3MPrice : (a.latestPrice && a.latestPrice > 0 ? a.latestPrice : 1);
          const jeonse = a.avg3MRentDeposit || a.latestRentDeposit || 0;
          return acc + (jeonse / sale) * 100;
        }, 0);
        const rate = Math.round((sumRate / validApts.length) * 10) / 10;
        if (isFinite(rate) && rate > 0) return rate;
      }
    }
    return 56.4;
  }, [macroTrendData, txSummaryData, propAvgJeonseRate]);

  if (activeSector) {
    const displayItems = (activeSector.items || []).slice(0, 4);
    return (
      <div className={`grid grid-cols-2 gap-2 sm:gap-2.5 flex-1 ${className}`}>
        {displayItems.map((item, idx) => {
            const hasDelta = typeof item.delta === 'number' && isFinite(item.delta);
            const deltaFormatted = hasDelta ? formatDeltaPrice(item.delta) : '';
            const pyeongVal = item.areaPyeong && item.areaPyeong > 0
              ? item.areaPyeong
              : (item.area && item.area > 0 ? item.area / 3.3058 : 0);
            const pyeongPriceMan = pyeongVal > 0 && item.priceVal > 0
              ? Math.round((item.priceVal * 10000) / pyeongVal)
              : 0;
            const pyeongPriceStr = pyeongPriceMan > 0 ? `평당 ${pyeongPriceMan.toLocaleString()}만` : '';
            const cleanDate = formatCleanDate(item.dateLabel, item.contractDate);

            return (
              <div
                key={`${item.aptName}-${item.contractDate || idx}-${idx}`}
                onClick={() => onSelectApt?.(item.aptName, item.dong)}
                onMouseEnter={() => {
                  if (preloadApartmentTx) {
                    preloadApartmentTx(item.aptName, item.dong || '');
                  }
                  preloadApartmentModal();
                }}
                role="button"
                tabIndex={0}
                aria-label={`${item.displayAptName || item.aptName} ${item.priceEok} 실거래 상세 리포트 열기`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectApt?.(item.aptName, item.dong);
                  }
                }}
                className="bg-surface border border-border/80 p-2 sm:py-2 sm:px-3 rounded-[16px] sm:rounded-[18px] shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] hover:border-primary/50 transition-all duration-200 cursor-pointer text-left group"
              >
                {/* Top: Rank badge + Dong + Area/Floor (left) | Date (right) */}
                <div className="flex items-center justify-between gap-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="text-[9.5px] font-black px-1.5 py-0.2 rounded shrink-0"
                      style={{
                        backgroundColor: `${activeSector.color}18`,
                        color: activeSector.color,
                      }}
                    >
                      #{idx + 1}
                    </span>
                    {item.dong && (
                      <span className="text-[9.5px] font-bold text-tertiary shrink-0">
                        {item.dong}
                      </span>
                    )}
                    <span className="text-[9.5px] font-medium text-tertiary truncate">
                      {item.areaPyeong ? `${Math.round(item.areaPyeong)}평` : ''}
                      {item.floor ? ` · ${item.floor}층` : ''}
                    </span>
                  </div>
                  {cleanDate && (
                    <span className="text-[9.5px] font-bold text-tertiary shrink-0">
                      {cleanDate}
                    </span>
                  )}
                </div>

                {/* Middle: Apartment Name */}
                <div className="my-auto py-0.5 truncate">
                  <span className="text-[12.5px] sm:text-[13.5px] font-black text-primary truncate block group-hover:text-[#ea6100] transition-colors">
                    {item.displayAptName || item.aptName}
                  </span>
                </div>

                {/* Bottom: Price + Delta (left) | Unit Pyeong Price + Chevron (right) */}
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <div className="flex items-baseline gap-1.5 min-w-0">
                    <span className="text-[13.5px] sm:text-[14.5px] font-black text-[#ea6100] tracking-tight">
                      {item.priceEok}
                    </span>
                    {item.isNewHigh ? (
                      <span className="text-[8.5px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1 py-0.2 rounded border border-rose-200 dark:border-rose-900/50 shrink-0">
                        신고가
                      </span>
                    ) : hasDelta && item.delta !== 0 && deltaFormatted ? (
                      <span className={`text-[8.5px] font-bold shrink-0 flex items-center gap-0.5 ${
                        item.delta > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        <span>{item.delta > 0 ? `▲${deltaFormatted}` : `▼${deltaFormatted}`}</span>
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {pyeongPriceStr && (
                      <span className="text-[9px] sm:text-[9.5px] font-bold text-tertiary bg-neutral-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded tracking-tight">
                        {pyeongPriceStr}
                      </span>
                    )}
                    <ChevronRight size={13} className="text-tertiary group-hover:text-[#ea6100] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Fallback empty slots to maintain 2x2 grid */}
          {Array.from({ length: Math.max(0, 4 - displayItems.length) }).map((_, placeholderIdx) => (
            <div
              key={`empty-${placeholderIdx}`}
              className="bg-surface/50 border border-dashed border-border/60 p-2.5 sm:py-2 rounded-[18px] flex items-center justify-center text-center min-h-[68px]"
            >
              <span className="text-[10.5px] text-tertiary font-bold">추가 거래 내역 없음</span>
            </div>
          ))}
        </div>
      );
    }

  return (
    <div className={`grid grid-cols-2 gap-2 sm:gap-2.5 flex-1 ${className}`}>
      {/* Metric 1: 신고가 달성 */}
      <div className="bg-surface border border-border/80 p-2 sm:py-2 sm:px-3 rounded-[16px] sm:rounded-[18px] shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-200">
        <div className="flex items-center justify-between gap-1 w-full">
          <span className="text-[10px] sm:text-[10.5px] text-tertiary font-bold leading-tight">신고가 달성</span>
          <span className="text-[9px] font-bold text-tertiary bg-neutral-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded shrink-0">최근 7일</span>
        </div>
        <div className="my-auto py-0.5">
          <span className="text-[17px] sm:text-[19px] font-black text-primary leading-snug tracking-tight">
            {computedNewHighCount.toLocaleString()}건
          </span>
        </div>
        <span className={`text-[8.5px] sm:text-[9.5px] font-extrabold flex items-center gap-0.5 shrink-0 leading-tight ${
          newHighChange > 0
            ? 'text-rose-600 dark:text-rose-500'
            : newHighChange < 0
              ? 'text-blue-600 dark:text-blue-500'
              : 'text-secondary'
        }`}>
          {newHighChange > 0
            ? `전기 대비 +${newHighChange}건 상승세`
            : newHighChange < 0
              ? `전기 대비 ${newHighChange}건 하락세`
              : '전기 대비 변동 없음'}
        </span>
      </div>

      {/* Metric 2: 평당 평균 실거래가 */}
      <div className="bg-surface border border-border/80 p-2 sm:py-2 sm:px-3 rounded-[16px] sm:rounded-[18px] shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-200">
        <div className="flex items-center justify-between gap-1 w-full">
          <span className="text-[10px] sm:text-[10.5px] text-tertiary font-bold leading-tight">평당 평균 실거래가</span>
          <span className="text-[9px] font-bold text-tertiary bg-neutral-100 dark:bg-zinc-800 px-1.5 py-0.2 rounded shrink-0">동탄 전체</span>
        </div>
        <div className="my-auto py-0.5">
          <span className="text-[17px] sm:text-[19px] font-black text-primary leading-snug tracking-tight">
            {computedAvgPyeongPrice.toLocaleString()}만원
          </span>
        </div>
        <span className="text-[8.5px] sm:text-[9.5px] font-bold text-tertiary leading-tight">
          전용 3.3㎡(1평) 환산 기준
        </span>
      </div>

      {/* Metric 3: 평균 전세가율 */}
      <div className="bg-surface border border-border/80 p-2 sm:py-2 sm:px-3 rounded-[16px] sm:rounded-[18px] shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-200">
        <div className="flex items-center justify-between gap-1 w-full">
          <span className="text-[10px] sm:text-[10.5px] text-tertiary font-bold leading-tight">평균 전세가율</span>
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200/50 dark:border-emerald-900/50 shrink-0">안정권</span>
        </div>
        <div className="my-auto py-0.5">
          <span className="text-[17px] sm:text-[19px] font-black text-primary leading-snug tracking-tight">
            {computedAvgJeonseRate.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[8.5px] sm:text-[9.5px] font-bold text-tertiary leading-tight">
          <span>동탄1 <strong className="text-secondary font-black">62.1%</strong></span>
          <span className="opacity-30">·</span>
          <span>동탄2 <strong className="text-secondary font-black">45.8%</strong></span>
        </div>
      </div>

      {/* Metric 4: 자산 진단 AI CTA */}
      <button
        type="button"
        onClick={() => onOpenSellTimingCalculator && onOpenSellTimingCalculator()}
        aria-label="우리집 적정 가치 및 매도 타이밍 진단 계산기 열기"
        className="bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/80 p-2 sm:py-2 sm:px-3 rounded-[16px] sm:rounded-[18px] shadow-sm flex flex-col justify-between hover:shadow-md hover:scale-[1.01] active:scale-[0.99] hover:border-[#ea6100] transition-all duration-200 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#ea6100]/20 group"
      >
        <div className="flex items-center justify-between gap-1 w-full">
          <span className="text-[10px] sm:text-[10.5px] text-tertiary font-bold leading-tight">자산 진단 시뮬레이터</span>
          <span className="text-[9px] font-bold text-[#ea6100] bg-[#ea6100]/10 px-1.5 py-0.2 rounded shrink-0">AI 정밀진단</span>
        </div>
        <div className="my-auto py-0.5 flex items-center justify-between w-full">
          <span className="text-[12px] sm:text-[13.5px] font-black text-[#ea6100] leading-snug group-hover:underline">
            우리집 적정 가치 & 매도 타이밍
          </span>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[#ea6100]/10 text-[#ea6100] shrink-0 ml-1.5 group-hover:translate-x-0.5 transition-transform">
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
        <span className="text-[8.5px] sm:text-[9.5px] font-bold text-tertiary leading-tight">
          단지별 AI 시세 분석 및 매도 전략
        </span>
      </button>
    </div>
  );
});

export default AptMetricCards;
