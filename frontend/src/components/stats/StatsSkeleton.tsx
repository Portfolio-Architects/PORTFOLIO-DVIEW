'use client';

import React from 'react';

export function StatsSkeleton() {
  return (
    <div
      aria-label="통계 페이지 로딩 스켈레톤"
      className="w-full flex flex-col gap-6 animate-pulse"
    >
      {/* Topic Selector Skeleton */}
      <div className="w-full h-[140px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-4 border border-[#f2f4f6] dark:border-[#202027]">
        <div className="h-4 w-48 bg-slate-200/70 dark:bg-slate-800 rounded-md mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[80px] bg-slate-200/50 dark:bg-slate-800/60 rounded-xl" />
          ))}
        </div>
      </div>

      {/* AdSlot #1 (Horizontal-Strip) Skeleton */}
      <div className="w-full min-h-[90px] sm:min-h-[100px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]" />

      {/* 4 KPI Soft Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="min-h-[136px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-4 border border-[#f2f4f6] dark:border-[#202027] flex flex-col justify-between"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-28 bg-slate-200/70 dark:bg-slate-800 rounded" />
              <div className="w-7 h-7 rounded-lg bg-slate-200/60 dark:bg-slate-800" />
            </div>
            <div className="h-8 w-36 bg-slate-200/80 dark:bg-slate-700 rounded my-2" />
            <div className="h-3 w-44 bg-slate-200/50 dark:bg-slate-800/50 rounded" />
          </div>
        ))}
      </div>

      {/* Takeaways Box Skeleton */}
      <div className="w-full min-h-[140px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-5 border border-[#f2f4f6] dark:border-[#202027] flex flex-col gap-3">
        <div className="h-4 w-52 bg-slate-200/70 dark:bg-slate-800 rounded" />
        <div className="h-3.5 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded" />
        <div className="h-3.5 w-5/6 bg-slate-200/50 dark:bg-slate-800/50 rounded" />
        <div className="h-3.5 w-4/6 bg-slate-200/50 dark:bg-slate-800/50 rounded" />
      </div>

      {/* DistanceBandComparisonChart Skeleton */}
      <div className="w-full min-h-[380px] sm:min-h-[420px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-6 border border-[#f2f4f6] dark:border-[#202027] flex flex-col justify-between">
        <div className="flex justify-between items-center mb-4">
          <div className="h-5 w-48 bg-slate-200/70 dark:bg-slate-800 rounded" />
          <div className="h-7 w-52 bg-slate-200/60 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="grid grid-cols-5 gap-4 items-end h-[210px] w-full border-b border-[#f2f4f6] dark:border-[#202027] pb-2">
          {[80, 65, 50, 35, 25].map((h, idx) => (
            <div key={idx} className="flex flex-col items-center justify-end h-full">
              <div
                style={{ height: `${h}%` }}
                className="w-full max-w-[56px] rounded-t-xl bg-slate-200/70 dark:bg-slate-800"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-4 pt-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-3 w-16 mx-auto bg-slate-200/50 dark:bg-slate-800/50 rounded" />
          ))}
        </div>
      </div>

      {/* AdSlot #2 (In-Feed) Skeleton */}
      <div className="w-full min-h-[140px] sm:min-h-[160px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]" />

      {/* DistanceRegressionScatterPlot Skeleton */}
      <div className="w-full h-[400px] sm:h-[480px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-6 border border-[#f2f4f6] dark:border-[#202027] flex flex-col justify-between">
        <div className="flex justify-between items-center mb-3">
          <div className="h-5 w-56 bg-slate-200/70 dark:bg-slate-800 rounded" />
          <div className="h-4 w-44 bg-slate-200/50 dark:bg-slate-800/50 rounded" />
        </div>
        <div className="w-full flex-1 rounded-xl bg-slate-200/40 dark:bg-slate-800/40" />
      </div>

      {/* AdSlot #3 (Rectangle) Skeleton */}
      <div className="w-full min-h-[250px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]" />

      {/* ComplexDrillDownTable Skeleton */}
      <div className="w-full min-h-[400px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-6 border border-[#f2f4f6] dark:border-[#202027] flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="h-5 w-64 bg-slate-200/70 dark:bg-slate-800 rounded" />
          <div className="h-8 w-48 bg-slate-200/60 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="h-10 w-full bg-slate-200/50 dark:bg-slate-800/50 rounded-lg" />
        <div className="flex flex-col gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-[52px] bg-slate-200/40 dark:bg-slate-800/40 rounded-xl" />
          ))}
        </div>
      </div>

      {/* AdSlot #4 (Banner) Skeleton */}
      <div className="w-full min-h-[250px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] border border-[#f2f4f6] dark:border-[#202027]" />
    </div>
  );
}
