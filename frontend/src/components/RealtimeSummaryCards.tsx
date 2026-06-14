'use client';

import { TrendingUp, Sparkles, Activity, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface RealtimeSummaryCardsProps {
  metrics: {
    recent7DaysCount: number;
    prev7DaysCount: number;
    recent30DaysCount: number;
    newHighCount30Days: number;
    newHighRatio30Days: number;
    upTransactionsCount30Days: number;
    upTransactionsRatio30Days: number;
  };
}

export default function RealtimeSummaryCards({ metrics }: RealtimeSummaryCardsProps) {
  const {
    recent7DaysCount,
    prev7DaysCount,
    newHighCount30Days,
    newHighRatio30Days,
    upTransactionsCount30Days,
    upTransactionsRatio30Days
  } = metrics;

  // 1. 거래량 전주 대비 증감량 계산
  const volDiff = recent7DaysCount - prev7DaysCount;
  const volDiffPercent = prev7DaysCount > 0 ? Math.round((volDiff / prev7DaysCount) * 100) : 0;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      
      {/* 1. 최근 7일 거래 활성화 지수 */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 p-5 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-300" />
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-tertiary tracking-wider uppercase">
              거래 활성화 지수
            </span>
            <h3 className="text-[14px] font-black text-secondary">
              최근 7일 거래량
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-[#008262]/10 dark:bg-[#00d29d]/10 text-[#008262] dark:text-[#00d29d] flex items-center justify-center">
            <Activity size={18} className="animate-pulse" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-black text-primary tracking-tight">
            {recent7DaysCount}
          </span>
          <span className="text-[14px] font-extrabold text-secondary">건</span>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {volDiff > 0 ? (
            <div className="inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight size={12} />
              <span>전주 대비 {volDiff}건 증가 ({volDiffPercent}%)</span>
            </div>
          ) : volDiff < 0 ? (
            <div className="inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
              <ArrowDownRight size={12} />
              <span>전주 대비 {Math.abs(volDiff)}건 감소 ({Math.abs(volDiffPercent)}%)</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500">
              <Minus size={12} />
              <span>전주와 거래량 동일</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. 최근 30일 신고가 경신율 */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 p-5 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all duration-300" />
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-tertiary tracking-wider uppercase">
              최고 시세 경신 동향
            </span>
            <h3 className="text-[14px] font-black text-secondary">
              최근 30일 신고가율
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Sparkles size={18} className="fill-amber-100 dark:fill-amber-950/20" />
          </div>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-black text-primary tracking-tight">
            {newHighRatio30Days.toFixed(1)}
          </span>
          <span className="text-[14px] font-extrabold text-secondary">%</span>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <div className="inline-flex items-center gap-0.5 text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400">
            <span>최근 30일 중 {newHighCount30Days}건 신고가 돌파</span>
          </div>
        </div>
      </div>

      {/* 3. 최근 30일 상승 거래 비중 */}
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-surface/40 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-300 p-5 group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300" />
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-tertiary tracking-wider uppercase">
              직전 대비 매수 심리
            </span>
            <h3 className="text-[14px] font-black text-secondary">
              상승 거래 비중
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-black text-primary tracking-tight">
            {upTransactionsRatio30Days.toFixed(1)}
          </span>
          <span className="text-[14px] font-extrabold text-secondary">%</span>
        </div>

        {/* 상승 거래 온도계 인디케이터 */}
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="w-full h-1.5 bg-border/50 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-1000"
              style={{ width: `${upTransactionsRatio30Days}%` }}
            />
          </div>
          <span className="text-[10.5px] text-tertiary font-bold">
            이전 거래가 대비 상승한 거래 건수: {upTransactionsCount30Days}건
          </span>
        </div>
      </div>

    </div>
  );
}
