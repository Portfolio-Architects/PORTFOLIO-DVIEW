import React from 'react';

/**
 * StatsDashboardSkeleton
 * Zero-CLS pre-sized skeleton layout with reserved bounding boxes for charts and ad slots.
 * Guarantees CLS < 0.01 during initial page loading or ISR revalidation.
 */
export function StatsDashboardSkeleton() {
  return (
    <div
      data-testid="stats-dashboard-skeleton"
      className="w-full min-h-[100dvh] bg-body animate-pulse flex flex-col"
    >
      {/* 1. Header Hero Skeleton */}
      <div className="w-full border-b border-border/60 bg-surface/50">
        <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-6 sm:py-8 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-col gap-1.5">
              <div className="w-48 sm:w-72 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
              <div className="w-64 sm:w-96 h-4 rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Filter Bar Skeleton */}
      <div className="w-full border-b border-border/40 bg-surface/30">
        <div className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-3.5 flex items-center justify-between gap-4 overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-hidden">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="w-20 sm:w-24 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"
              />
            ))}
          </div>
          <div className="hidden sm:block w-32 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="w-full max-w-[2000px] mx-auto px-4 sm:px-6 md:px-10 lg:px-16 py-6 flex flex-col gap-6">
        {/* 3. KPI Grid Skeleton (4 cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 sm:h-28 rounded-2xl bg-surface border border-border/60 p-4 flex flex-col justify-between"
            >
              <div className="w-20 h-3.5 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-32 sm:w-40 h-7 rounded-lg bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>

        {/* 4. Filter Bottom AdSlot Skeleton (min-h-[90px] sm:min-h-[100px]) */}
        <div className="w-full min-h-[90px] sm:min-h-[100px] rounded-2xl bg-surface border border-dashed border-border/60 flex items-center justify-center">
          <div className="w-40 h-4 rounded bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* 5. Hyperlocal Insight Cards Skeleton (4 cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="min-h-[136px] rounded-2xl bg-surface border border-border/60 p-4 flex flex-col justify-between gap-3"
            >
              <div className="flex items-center justify-between">
                <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
              <div className="w-36 h-5 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="w-48 h-3.5 rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
          ))}
        </div>

        {/* 6. Time-Series Trend Chart Skeleton */}
        <div className="w-full h-[380px] sm:h-[420px] rounded-2xl bg-surface border border-border/60 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="w-44 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="w-32 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
          <div className="w-full h-[280px] rounded-xl bg-slate-100/70 dark:bg-slate-800/40" />
        </div>

        {/* 7. Mid-Feed AdSlot Skeleton (min-h-[140px] sm:min-h-[160px]) */}
        <div className="w-full min-h-[140px] sm:min-h-[160px] rounded-2xl bg-surface border border-dashed border-border/60 flex items-center justify-center">
          <div className="w-48 h-4 rounded bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* 8. 2-Column Grid: Ranking Table & Donut Distribution Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
          {/* Ranking Board Skeleton (7/12 cols) */}
          <div className="lg:col-span-7 min-h-[480px] rounded-2xl bg-surface border border-border/60 p-5 sm:p-6 flex flex-col gap-4">
            <div className="w-40 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-col divide-y divide-border/40">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="py-3 flex items-center justify-between">
                  <div className="w-44 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="w-24 h-4 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>

          {/* Volume Distribution Skeleton (5/12 cols) */}
          <div className="lg:col-span-5 min-h-[480px] rounded-2xl bg-surface border border-border/60 p-5 sm:p-6 flex flex-col justify-between">
            <div className="w-36 h-6 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="w-48 h-48 mx-auto rounded-full bg-slate-100/80 dark:bg-slate-800/50 border-8 border-slate-200 dark:border-slate-700/60" />
            <div className="flex flex-col gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex justify-between items-center">
                  <div className="w-28 h-3.5 rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="w-16 h-3.5 rounded bg-slate-200 dark:bg-slate-800" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 9. Bottom Anchor AdSlot Skeleton (min-h-[250px]) */}
        <div className="w-full min-h-[250px] rounded-2xl bg-surface border border-dashed border-border/60 flex items-center justify-center">
          <div className="w-52 h-4 rounded bg-slate-200 dark:bg-slate-800" />
        </div>
      </main>
    </div>
  );
}

export default StatsDashboardSkeleton;
