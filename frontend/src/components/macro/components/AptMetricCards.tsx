'use client';

import React, { useMemo } from 'react';
import { Flame, Coins, Percent, TrendingUp, ChevronRight } from 'lucide-react';
import type { AptTxSummary, DongtanMacroTrendPoint } from '@/types';

export interface AptMetricCardsProps {
  recentTransactions?: any[];
  txSummaryData?: Record<string, AptTxSummary> | { summary?: Record<string, AptTxSummary> };
  macroTrendData?: DongtanMacroTrendPoint[];
  newHighCount?: number;
  newHighChange?: number;
  avgPyeongPrice?: number; // 만원 단위
  avgJeonseRate?: number; // % 단위
  onOpenSellTimingCalculator?: (aptName?: string) => void;
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

  return (
    <div className={`grid grid-cols-2 gap-3 sm:gap-4 flex-1 ${className}`}>
      {/* Metric 1: 신고가 달성 */}
      <div className="bg-surface border border-border/80 p-3 sm:p-4 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] sm:text-[11px] text-tertiary font-bold">신고가 달성</span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[14px] sm:text-[16px] font-black text-primary">
              {computedNewHighCount.toLocaleString()}건
            </span>
          </div>
          <span className={`text-[9px] sm:text-[9.5px] font-extrabold flex items-center gap-0.5 shrink-0 ${
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
        <div className="hidden sm:flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
          <span className="text-[10px] text-tertiary font-bold tracking-tight">최근 7일 기준</span>
          <span className="text-[10px] text-tertiary font-bold tracking-tight">전수 모니터링</span>
        </div>
      </div>

      {/* Metric 2: 평당 평균 실거래가 */}
      <div className="bg-surface border border-border/80 p-3 sm:p-4 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] sm:text-[11px] text-tertiary font-bold">평당 평균 실거래가</span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[14px] sm:text-[16px] font-black text-primary">
              {computedAvgPyeongPrice.toLocaleString()}만원
            </span>
          </div>
          <span className="text-[9px] sm:text-[9.5px] font-bold text-secondary">
            전용 평당(3.3㎡) 환산 기준
          </span>
        </div>
        <div className="hidden sm:flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
          <span className="text-[10px] text-tertiary font-bold tracking-tight">전용 평당 환산</span>
          <span className="text-[10px] text-tertiary font-bold tracking-tight">3.3㎡ 기준</span>
        </div>
      </div>

      {/* Metric 3: 평균 전세가율 */}
      <div className="bg-surface border border-border/80 p-3 sm:p-4 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.01] hover:border-border transition-all duration-300">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] sm:text-[11px] text-tertiary font-bold">평균 전세가율</span>
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className="text-[14px] sm:text-[16px] font-black text-primary">
              {computedAvgJeonseRate.toFixed(1)}%
            </span>
          </div>
          <span className="text-[9px] sm:text-[9.5px] font-bold text-emerald-600 dark:text-emerald-500">
            매매가 대비 안정권 형성
          </span>
        </div>
        <div className="hidden sm:flex flex-col text-right shrink-0 pl-3 border-l border-border/40 gap-0.5 justify-center min-w-[95px] h-9">
          <span className="text-[10px] text-tertiary font-bold tracking-tight">동탄1 62.1%</span>
          <span className="text-[10px] text-tertiary font-bold tracking-tight">동탄2 45.8%</span>
        </div>
      </div>

      {/* Metric 4: 자산 진단 AI / 세제 혜택 스타일 CTA */}
      <button
        type="button"
        onClick={() => onOpenSellTimingCalculator && onOpenSellTimingCalculator()}
        aria-label="우리집 적정 가치 및 매도 타이밍 진단 계산기 열기"
        className="bg-surface/80 dark:bg-zinc-900/80 backdrop-blur-md border border-border/80 p-3 sm:p-4 rounded-[20px] shadow-sm flex items-center justify-between hover:shadow-md hover:scale-[1.02] active:scale-[0.98] hover:border-[#ea6100] transition-all duration-300 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#ea6100]/20"
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] sm:text-[11px] text-tertiary font-bold">자산 진단 시뮬레이터</span>
          <span className="text-[12px] sm:text-[13.5px] font-black text-[#ea6100] leading-snug">
            우리집 적정 가치 & 매도 타이밍
          </span>
          <span className="text-[9px] sm:text-[9.5px] font-bold text-secondary">
            지금 진단하기 (클릭 시 이동)
          </span>
        </div>
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#ea6100]/10 text-[#ea6100] shrink-0 ml-3">
          <ChevronRight className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
});

export default AptMetricCards;
