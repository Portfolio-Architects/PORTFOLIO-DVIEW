'use client';

import React from 'react';
import { Flame, ShieldCheck, TrendingUp, Zap, ArrowUpRight } from 'lucide-react';
import type { ComplexStatItem, HyperlocalInsightCardsData } from '@/types/stats';
import { formatPriceEok } from '@/lib/analytics/statsEngine';

export interface HyperlocalInsightCardsProps {
  insights: HyperlocalInsightCardsData;
  onSelectComplex?: (aptKey: string, aptName: string) => void;
  onOpenJeonseSafety?: (aptName: string) => void;
  onOpenCompare?: (aptName: string) => void;
}

export function HyperlocalInsightCards({
  insights,
  onSelectComplex,
  onOpenJeonseSafety,
  onOpenCompare,
}: HyperlocalInsightCardsProps) {
  const { newHighComplex, optimalGapComplex, volumeSurgeComplex, urgentBargainComplex } = insights;

  return (
    <div
      data-testid="stats-hyperlocal-insights"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8"
    >
      {/* 1. 신고가 갱신 단지 */}
      <div
        data-testid="insight-card-new-high"
        onClick={() => newHighComplex && onSelectComplex?.(newHighComplex.aptKey, newHighComplex.aptName)}
        className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-orange-200/80 dark:border-orange-900/40 bg-gradient-to-br from-orange-50/70 to-white dark:from-orange-950/20 dark:to-surface shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400">
              <Flame size={12} className="animate-pulse" />
              신고가 갱신
            </span>
            <ArrowUpRight size={14} className="text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors line-clamp-1">
            {newHighComplex?.aptName || '해당 없음'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {newHighComplex ? `${newHighComplex.dong} · ${newHighComplex.region}` : '최근 90일 거래 없음'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-orange-100/80 dark:border-orange-900/30 flex items-baseline justify-between">
          <span className="text-[11px] font-bold text-slate-400">최고 체결가</span>
          <p className="text-sm sm:text-base font-black text-orange-600 dark:text-orange-400">
            {newHighComplex?.highestPrice
              ? `${newHighComplex.highestPrice.toLocaleString()}만원`
              : '-'}
          </p>
        </div>
      </div>

      {/* 2. 전세가율·갭 최적 단지 */}
      <div
        data-testid="insight-card-optimal-gap"
        onClick={() => {
          if (optimalGapComplex) {
            if (onOpenJeonseSafety) {
              onOpenJeonseSafety(optimalGapComplex.aptName);
            } else if (onSelectComplex) {
              onSelectComplex(optimalGapComplex.aptKey, optimalGapComplex.aptName);
            }
          }
        }}
        className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/70 to-white dark:from-emerald-950/20 dark:to-surface shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck size={12} />
              전세가율 최적
            </span>
            <ArrowUpRight size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors line-clamp-1">
            {optimalGapComplex?.aptName || '해당 없음'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {optimalGapComplex ? `${optimalGapComplex.dong} · 매매 ${formatPriceEok(optimalGapComplex.avgPrice)}` : '전세 데이터 없음'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-emerald-100/80 dark:border-emerald-900/30 flex items-baseline justify-between">
          <span className="text-[11px] font-bold text-slate-400">전세가율</span>
          <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400">
            {optimalGapComplex?.jeonseRatio ? `${optimalGapComplex.jeonseRatio}%` : '-'}
          </p>
        </div>
      </div>

      {/* 3. 주간 거래량 급증 단지 */}
      <div
        data-testid="insight-card-volume-surge"
        onClick={() => volumeSurgeComplex && onSelectComplex?.(volumeSurgeComplex.aptKey, volumeSurgeComplex.aptName)}
        className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 bg-gradient-to-br from-blue-50/70 to-white dark:from-blue-950/20 dark:to-surface shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
              <TrendingUp size={12} />
              거래량 급증
            </span>
            <ArrowUpRight size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">
            {volumeSurgeComplex?.aptName || '해당 없음'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {volumeSurgeComplex ? `${volumeSurgeComplex.dong} · 평당 ${volumeSurgeComplex.avgPyeongPrice.toLocaleString()}만` : '거래 데이터 없음'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-blue-100/80 dark:border-blue-900/30 flex items-baseline justify-between">
          <span className="text-[11px] font-bold text-slate-400">체결 건수</span>
          <p className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400">
            {volumeSurgeComplex?.txCount ? `${volumeSurgeComplex.txCount}건` : '-'}
          </p>
        </div>
      </div>

      {/* 4. 낙폭과대 급매 단지 */}
      <div
        data-testid="insight-card-urgent-bargain"
        onClick={() => {
          if (urgentBargainComplex) {
            if (onOpenCompare) {
              onOpenCompare(urgentBargainComplex.aptName);
            } else if (onSelectComplex) {
              onSelectComplex(urgentBargainComplex.aptKey, urgentBargainComplex.aptName);
            }
          }
        }}
        className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/70 to-white dark:from-rose-950/20 dark:to-surface shadow-xs hover:shadow-md transition-all cursor-pointer"
      >
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300">
              <Zap size={12} />
              낙폭과대 급매
            </span>
            <ArrowUpRight size={14} className="text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-rose-600 transition-colors line-clamp-1">
            {urgentBargainComplex?.aptName || '해당 없음'}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {urgentBargainComplex
              ? `${urgentBargainComplex.dong} · 고점 ${formatPriceEok(urgentBargainComplex.highestPrice)}`
              : '급매 데이터 없음'}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-rose-100/80 dark:border-rose-900/30 flex items-baseline justify-between">
          <span className="text-[11px] font-bold text-slate-400">고점 대비 할인율</span>
          <p className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400">
            {urgentBargainComplex?.urgentSaleDiscountRate
              ? `-${urgentBargainComplex.urgentSaleDiscountRate}%`
              : '-'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default HyperlocalInsightCards;
