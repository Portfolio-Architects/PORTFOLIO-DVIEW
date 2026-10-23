'use client';

import React from 'react';

export function AdSlotSkeletonView() {
  return (
    <div
      data-testid="ad-slot-skeleton"
      className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100/80 dark:bg-slate-800/50 rounded-2xl animate-pulse pointer-events-none p-4 text-center border border-slate-200/50 dark:border-slate-700/50 z-0"
      aria-hidden="true"
    >
      <div className="w-16 h-3 bg-slate-300/80 dark:bg-slate-700/80 rounded mb-2" />
      <div className="w-48 sm:w-64 h-3.5 bg-slate-200/80 dark:bg-slate-700/50 rounded mb-1.5" />
      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
        스폰서드 광고를 불러오는 중입니다...
      </span>
    </div>
  );
}

export default AdSlotSkeletonView;
