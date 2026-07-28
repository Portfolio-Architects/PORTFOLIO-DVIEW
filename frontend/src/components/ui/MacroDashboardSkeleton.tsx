'use client';

import React from 'react';

export default function MacroDashboardSkeleton() {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse select-none" data-testid="macrodashboard-skeleton">
      {/* 1. Macro Summary Header Skeleton */}
      <div className="w-full bg-surface dark:bg-zinc-900 border border-border/60 rounded-3xl p-6 md:p-8 flex flex-col gap-3 shadow-sm">
        <div className="h-4 w-28 bg-neutral-200 dark:bg-zinc-800 rounded-md" />
        <div className="h-8 w-72 md:w-96 bg-neutral-300 dark:bg-zinc-750 rounded-xl" />
        <div className="h-4 w-full max-w-xl bg-neutral-200 dark:bg-zinc-800 rounded-md" />
      </div>

      {/* 2. Key Macro Indicators Grid Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '한국은행 기준금리' },
          { label: '주택담보대출 평균금리' },
          { label: 'KB 부동산 매매가격지수' },
          { label: '전국 아파트 거래량' }
        ].map((item, idx) => (
          <div
            key={idx}
            className="bg-surface dark:bg-zinc-900 border border-border/50 rounded-2xl p-5 flex flex-col gap-3 shadow-sm"
          >
            <div className="h-3.5 w-24 bg-neutral-200 dark:bg-zinc-800 rounded" />
            <div className="h-8 w-24 bg-neutral-300 dark:bg-zinc-750 rounded-lg" />
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 bg-emerald-500/20 rounded" />
              <div className="h-3 w-16 bg-neutral-200 dark:bg-zinc-800 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* 3. Macro Trend Interactive Chart Skeleton */}
      <div className="bg-surface dark:bg-zinc-900 border border-border/60 rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="h-5 w-52 bg-neutral-300 dark:bg-zinc-750 rounded-lg" />
            <div className="h-3.5 w-36 bg-neutral-200 dark:bg-zinc-800 rounded" />
          </div>
          <div className="flex gap-2">
            {['1년', '3년', '5년', '전체'].map((period) => (
              <div key={period} className="w-12 h-7 bg-neutral-200 dark:bg-zinc-800 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Chart Skeleton canvas */}
        <div className="w-full h-[260px] md:h-[320px] rounded-2xl bg-neutral-100 dark:bg-zinc-800/40 border border-border/30 p-6 flex flex-col justify-between">
          <div className="w-full border-b border-border/20 h-0" />
          <div className="w-full border-b border-border/20 h-0" />
          <div className="w-full border-b border-border/20 h-0" />
          <div className="w-full border-b border-border/20 h-0" />
          <div className="flex justify-between items-center pt-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-3 w-10 bg-neutral-200 dark:bg-zinc-800 rounded" />
            ))}
          </div>
        </div>
      </div>

      {/* 4. Macro News / Market Briefing Skeleton List */}
      <div className="flex flex-col gap-3">
        <div className="h-5 w-40 bg-neutral-300 dark:bg-zinc-750 rounded-lg" />
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface dark:bg-zinc-900 border border-border/50 rounded-2xl p-4 flex gap-4 items-center"
            >
              <div className="w-12 h-12 rounded-xl bg-neutral-200 dark:bg-zinc-800 shrink-0" />
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="h-4.5 w-3/4 bg-neutral-300 dark:bg-zinc-750 rounded-md" />
                <div className="h-3.5 w-1/2 bg-neutral-200 dark:bg-zinc-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
