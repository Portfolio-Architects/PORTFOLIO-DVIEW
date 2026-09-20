'use client';

import React from 'react';
import { Trophy, PieChart as PieChartIcon } from 'lucide-react';

export interface TimeTrendChartSkeletonProps {
  height?: number;
  className?: string;
}

export function TimeTrendChartSkeleton({
  height = 360,
  className = '',
}: TimeTrendChartSkeletonProps) {
  return (
    <div
      data-testid="stats-time-trend-chart"
      className={`p-5 sm:p-6 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between w-full min-h-[240px] md:min-h-[280px] ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <span>월별 실거래가 & 전세가 추이</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            거래량 바 차트와 매매/전세 평균 시세 흐름
          </p>
        </div>

        {/* Legend pill skeletons */}
        <div className="flex items-center gap-3">
          <div className="w-16 h-4 bg-black/5 dark:bg-white/5 rounded-full animate-pulse" />
          <div className="w-16 h-4 bg-black/5 dark:bg-white/5 rounded-full animate-pulse" />
          <div className="w-16 h-4 bg-black/5 dark:bg-white/5 rounded-full animate-pulse" />
        </div>
      </div>

      {/* Chart Canvas Placeholder */}
      <div
        className="w-full flex flex-col items-center justify-center bg-black/5 dark:bg-white/5 rounded-xl animate-pulse relative overflow-hidden"
        style={{ height }}
      >
        <div className="flex items-end gap-3 h-36 mb-4 opacity-40">
          <div className="w-6 h-16 bg-teal-600/30 rounded-t" />
          <div className="w-6 h-24 bg-teal-600/30 rounded-t" />
          <div className="w-6 h-20 bg-teal-600/30 rounded-t" />
          <div className="w-6 h-28 bg-teal-600/30 rounded-t" />
          <div className="w-6 h-36 bg-teal-600/30 rounded-t" />
          <div className="w-6 h-32 bg-teal-600/30 rounded-t" />
        </div>
        <span className="text-xs text-tertiary font-bold tracking-tight">
          시계열 실거래 추이 분석 차트 로드 중...
        </span>
      </div>
    </div>
  );
}

export interface PyeongRankingChartSkeletonProps {
  className?: string;
}

export function PyeongRankingChartSkeleton({
  className = '',
}: PyeongRankingChartSkeletonProps) {
  return (
    <div
      data-testid="stats-pyeong-ranking-chart"
      className={`p-5 sm:p-6 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between w-full min-h-[240px] md:min-h-[280px] ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            <span>단지별 평당가 TOP 20</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            전용면적 기준 3.3㎡당 평균 실거래가 랭킹
          </p>
        </div>
        <div className="w-28 h-7 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse" />
      </div>

      {/* Chart Canvas Placeholder */}
      <div className="w-full h-[280px] sm:h-[320px] bg-black/5 dark:bg-white/5 rounded-xl animate-pulse flex flex-col items-center justify-center p-6 gap-3">
        <div className="w-full space-y-2.5 opacity-40">
          <div className="w-11/12 h-4 bg-teal-600/25 rounded" />
          <div className="w-10/12 h-4 bg-teal-600/25 rounded" />
          <div className="w-9/12 h-4 bg-teal-600/25 rounded" />
          <div className="w-8/12 h-4 bg-teal-600/25 rounded" />
          <div className="w-7/12 h-4 bg-teal-600/25 rounded" />
        </div>
        <span className="text-xs text-tertiary font-bold tracking-tight">
          평당가 순위 랭킹 데이터 준비 중...
        </span>
      </div>
    </div>
  );
}

export interface VolumeDistributionChartSkeletonProps {
  className?: string;
}

export function VolumeDistributionChartSkeleton({
  className = '',
}: VolumeDistributionChartSkeletonProps) {
  return (
    <div
      data-testid="stats-volume-distribution-chart"
      className={`p-5 sm:p-6 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between w-full min-h-[200px] ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <PieChartIcon size={18} className="text-teal-600" />
            <span>평형대별 거래량 비중</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            실거래 평형 수요 분포 분석 중
          </p>
        </div>
      </div>

      {/* Donut Circle Placeholder */}
      <div className="w-full h-[220px] sm:h-[240px] flex items-center justify-center">
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-full border-8 border-dashed border-teal-600/30 animate-pulse flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-surface" />
        </div>
      </div>

      {/* Breakdown Rows */}
      <div className="w-full space-y-2 mt-4 pt-3 border-t border-border/40">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-full h-7 bg-black/5 dark:bg-white/5 rounded-lg animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
