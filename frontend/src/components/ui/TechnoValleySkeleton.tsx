'use client';

import React from 'react';

export default function TechnoValleySkeleton() {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse select-none" data-testid="technovalley-skeleton">
      {/* 1. Header Banner Skeleton */}
      <div className="w-full bg-surface dark:bg-slate-900 border border-border/60 rounded-3xl p-6 md:p-8 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md" />
          <div className="h-4 w-16 bg-emerald-500/20 rounded-full" />
        </div>
        <div className="h-8 w-64 md:w-80 bg-slate-300 dark:bg-slate-800 rounded-xl" />
        <div className="h-4 w-full max-w-lg bg-slate-200 dark:bg-slate-800 rounded-md" />
      </div>

      {/* 2. Key Metrics Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-surface dark:bg-slate-900 border border-border/50 rounded-2xl p-5 flex flex-col gap-3 shadow-sm"
          >
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="h-7 w-28 bg-slate-300 dark:bg-slate-800 rounded-lg" />
            <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      {/* 3. Rent & Price Trend Chart Skeleton */}
      <div className="bg-surface dark:bg-slate-900 border border-border/60 rounded-3xl p-6 flex flex-col gap-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <div className="h-5 w-48 bg-slate-300 dark:bg-slate-800 rounded-lg" />
            <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="w-16 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="w-16 h-8 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        </div>

        {/* Mock Chart Area */}
        <div className="w-full h-[240px] md:h-[300px] rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-border/30 flex items-end justify-between p-6 gap-3">
          {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95].map((h, idx) => (
            <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <div
                className="w-full bg-slate-250 dark:bg-slate-800 rounded-t-lg transition-all"
                style={{ height: `${h}%` }}
              />
              <div className="h-3 w-8 bg-slate-200 dark:bg-slate-800 rounded shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* 4. Complex List Skeleton */}
      <div className="flex flex-col gap-3">
        <div className="h-5 w-36 bg-slate-300 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-surface dark:bg-slate-900 border border-border/50 rounded-2xl p-5 flex items-center justify-between gap-4"
            >
              <div className="flex flex-col gap-2 flex-1">
                <div className="h-4.5 w-40 bg-slate-300 dark:bg-slate-800 rounded-md" />
                <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
