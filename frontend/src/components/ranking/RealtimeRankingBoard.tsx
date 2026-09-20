"use client";

import React, { useState, useMemo } from 'react';
import { Flame, TrendingUp, Sparkles, BarChart3, ArrowUpRight } from 'lucide-react';
import {
  getRealtimeRankings,
  RealtimeRankingItem,
  RealtimeRankingData,
} from '@/lib/utils/rankingCalculations';

export interface RealtimeRankingBoardProps {
  recentTransactions?: any[] | null;
  txSummaryData?: Record<string, any> | null;
  sheetApartments?: any[] | Record<string, any> | null;
  onSelectComplex?: (complexName: string) => void;
  onSelectApt?: (aptName: string) => void;
}

type RankingTabType = 'high' | 'gap' | 'surge';

export const RealtimeRankingBoard = React.memo(function RealtimeRankingBoard({
  recentTransactions,
  txSummaryData,
  sheetApartments,
  onSelectComplex,
  onSelectApt,
}: RealtimeRankingBoardProps) {
  const [activeTab, setActiveTab] = useState<RankingTabType>('high');

  const handleSelect = onSelectComplex || onSelectApt;

  const rankings: RealtimeRankingData = useMemo(() => {
    return getRealtimeRankings(recentTransactions, txSummaryData || sheetApartments);
  }, [recentTransactions, txSummaryData, sheetApartments]);

  const currentItems: RealtimeRankingItem[] = useMemo(() => {
    switch (activeTab) {
      case 'high':
        return rankings.newHighList;
      case 'gap':
        return rankings.optimalGapList;
      case 'surge':
        return rankings.weeklySurgeList;
      default:
        return rankings.newHighList;
    }
  }, [activeTab, rankings]);

  return (
    <div
      data-testid="realtime-ranking-board"
      className="w-full bg-surface border border-border/80 rounded-[22px] sm:rounded-[26px] p-5 sm:p-6 lg:p-7 flex flex-col gap-4.5 shadow-sm mb-6"
    >
      {/* Header with 3 Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-brand-orange flex items-center justify-center shrink-0">
            <Flame size={18} />
          </div>
          <div>
            <h3 className="text-[15px] sm:text-[16px] font-black text-primary tracking-tight flex items-center gap-1.5">
              동탄 실시간 시장 랭킹 보드
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
                LIVE
              </span>
            </h3>
            <p className="text-[11px] text-tertiary font-medium">
              국토교통부 실거래가 기반 신고가·갭투자·거래량 급상승 순위
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl shrink-0 overflow-x-auto">
          <button
            type="button"
            data-testid="ranking-tab-high"
            onClick={() => setActiveTab('high')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'high'
                ? 'bg-surface text-brand-orange shadow-xs'
                : 'text-tertiary hover:text-primary'
            }`}
          >
            <Sparkles size={12} />
            <span>실시간 신고가 TOP 10</span>
          </button>
          <button
            type="button"
            data-testid="ranking-tab-gap"
            onClick={() => setActiveTab('gap')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'gap'
                ? 'bg-surface text-brand-orange shadow-xs'
                : 'text-tertiary hover:text-primary'
            }`}
          >
            <TrendingUp size={12} />
            <span>전세가율·갭 최적</span>
          </button>
          <button
            type="button"
            data-testid="ranking-tab-surge"
            onClick={() => setActiveTab('surge')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer transition-all whitespace-nowrap ${
              activeTab === 'surge'
                ? 'bg-surface text-brand-orange shadow-xs'
                : 'text-tertiary hover:text-primary'
            }`}
          >
            <BarChart3 size={12} />
            <span>주간 거래량 급증</span>
          </button>
        </div>
      </div>

      {/* Rankings List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {currentItems.map((item) => (
          <div
            key={`${item.rank}-${item.apartmentName}`}
            data-testid={`ranking-item-${item.rank}`}
            onClick={() => handleSelect?.(item.apartmentName)}
            className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:border-brand-orange/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 ${
                  item.rank === 1
                    ? 'bg-amber-400 text-amber-950 shadow-xs'
                    : item.rank === 2
                    ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
                    : item.rank === 3
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200'
                    : 'text-tertiary font-bold'
                }`}
              >
                {item.rank}
              </span>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-extrabold text-primary truncate group-hover:text-brand-orange transition-colors">
                    {item.displayAptName || item.apartmentName}
                  </span>
                  {(item.badge || item.badgeText) && (
                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-black shrink-0 ${
                        item.badgeType === 'high'
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50'
                          : item.badgeType === 'gap'
                          ? 'bg-teal-50 text-brand-orange dark:bg-teal-950/40 border border-teal-200/50'
                          : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200/50'
                      }`}
                    >
                      {item.badge || item.badgeText}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-tertiary truncate">
                  {item.dong} · {item.subText || item.secondaryValue}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pl-2">
              <span className="text-[13px] font-black text-primary group-hover:text-brand-orange transition-colors">
                {item.metricValue || item.primaryValue}
              </span>
              <ArrowUpRight size={13} className="text-tertiary group-hover:text-brand-orange transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
