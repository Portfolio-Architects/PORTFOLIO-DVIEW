'use client';

import React, { useState } from 'react';
import { TrainFront } from 'lucide-react';
import type { DistanceTierSummary } from '@/lib/stats/types';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';

export type ComparisonMetric = 'pyeong' | 'price' | 'volume';

export interface DistanceBandComparisonChartProps {
  distanceTiers: DistanceTierSummary[];
  activeMetric?: ComparisonMetric;
  onMetricChange?: (metric: ComparisonMetric) => void;
  className?: string;
}

export function DistanceBandComparisonChart({
  distanceTiers = [],
  activeMetric: controlledMetric,
  onMetricChange,
  className = '',
}: DistanceBandComparisonChartProps) {
  const [internalMetric, setInternalMetric] = useState<ComparisonMetric>('pyeong');
  const currentMetric = controlledMetric ?? internalMetric;

  const handleMetricToggle = (metric: ComparisonMetric) => {
    if (onMetricChange) {
      onMetricChange(metric);
    } else {
      setInternalMetric(metric);
    }
  };

  // Compute maximum value for bar scaling
  const getMetricValue = (t: DistanceTierSummary, metric: ComparisonMetric) => {
    switch (metric) {
      case 'pyeong':
        // If in 원, convert to 만원
        return t.avgPricePerPyeongWon > 100000
          ? Math.round(t.avgPricePerPyeongWon / 10000)
          : Math.round(t.avgPricePerPyeongWon);
      case 'price':
        // in 억원 (with 1 decimal)
        return t.avgPriceWon > 100000
          ? Math.round((t.avgPriceWon / 100000000) * 10) / 10
          : 0;
      case 'volume':
        return t.txVolume;
      default:
        return 0;
    }
  };

  const getMetricDisplay = (t: DistanceTierSummary, metric: ComparisonMetric) => {
    const val = getMetricValue(t, metric);
    switch (metric) {
      case 'pyeong':
        return `${val.toLocaleString()}만원/평`;
      case 'price':
        return `${val.toFixed(1)}억원`;
      case 'volume':
        return `${val.toLocaleString()}건 (${t.complexCount}개 단지)`;
      default:
        return `${val}`;
    }
  };

  const values = distanceTiers.map((t) => getMetricValue(t, currentMetric));
  const maxValue = Math.max(...values, 1);

  // Distinct color accents for distance tiers (Ad Money v6.0 Live Spark palette)
  const tierColors: Record<
    string,
    { bar: string; track: string; badge: string; text: string; pill: string }
  > = {
    '<500m': {
      bar: 'bg-[#2f6bff] shadow-[0_4px_14px_rgba(47,107,255,0.28)]',
      track: 'bg-brand-blue-light/60 border border-brand-blue/15',
      badge: 'bg-brand-blue-light text-brand-blue',
      text: 'text-brand-blue',
      pill: 'bg-[#2f6bff] text-white',
    },
    '500m-1km': {
      bar: 'bg-[#2f6bff]/80 dark:bg-[#60a5fa]/85 shadow-[0_4px_12px_rgba(47,107,255,0.18)]',
      track: 'bg-brand-blue-light/35 border border-brand-blue/10',
      badge: 'bg-brand-blue-light text-brand-blue',
      text: 'text-primary',
      pill: 'bg-brand-blue-light text-brand-blue',
    },
    '1km-2km': {
      bar: 'bg-slate-700 dark:bg-slate-300',
      track: 'bg-[#eff1f5]/70 dark:bg-[#1e2532]/70 border border-border',
      badge: 'bg-[#eff1f5] dark:bg-[#1e2532] text-secondary',
      text: 'text-primary',
      pill: 'bg-[#eff1f5] dark:bg-[#1e2532] text-secondary',
    },
    '2km-3km': {
      bar: 'bg-slate-500 dark:bg-slate-400',
      track: 'bg-[#eff1f5]/50 dark:bg-[#1e2532]/50 border border-border',
      badge: 'bg-[#eff1f5] dark:bg-[#1e2532] text-secondary',
      text: 'text-secondary',
      pill: 'bg-[#eff1f5] dark:bg-[#1e2532] text-secondary',
    },
    '3km+': {
      bar: 'bg-slate-400 dark:bg-slate-500',
      track: 'bg-[#eff1f5]/40 dark:bg-[#1e2532]/40 border border-border',
      badge: 'bg-[#eff1f5] dark:bg-[#1e2532] text-tertiary',
      text: 'text-secondary',
      pill: 'bg-[#eff1f5] dark:bg-[#1e2532] text-tertiary',
    },
  };

  return (
    <section
      aria-label="동탄역 거리 구간별 아파트 시세 비교 차트"
      className={`w-full rounded-2xl bg-elevated p-4 sm:p-6 border border-border min-h-[380px] sm:min-h-[420px] flex flex-col justify-between ${className}`}
    >
      {/* Header & Metric Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#eff1f5] dark:bg-[#1e2532] flex items-center justify-center text-primary">
              <TrainFront className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-primary tracking-tight">
              동탄역 거리 구간별 실거래 시세 비교
            </h3>
          </div>
          <p className="text-[11px] sm:text-[12px] font-medium text-secondary mt-0.5">
            초역세권(500m 이내)부터 외곽권역(3km 이상)까지 5단계 거리 티어 시세 구조
          </p>
        </div>

        {/* Metric Switcher using concentric radius geometry */}
        <div className={getToggleTrackClass()}>
          <button
            type="button"
            onClick={() => handleMetricToggle('pyeong')}
            className={getToggleBtnClass(currentMetric === 'pyeong', { size: 'sm', tone: 'neutral' })}
          >
            평당가 비교
          </button>
          <button
            type="button"
            onClick={() => handleMetricToggle('price')}
            className={getToggleBtnClass(currentMetric === 'price', { size: 'sm', tone: 'neutral' })}
          >
            평균 매매가
          </button>
          <button
            type="button"
            onClick={() => handleMetricToggle('volume')}
            className={getToggleBtnClass(currentMetric === 'volume', { size: 'sm', tone: 'neutral' })}
          >
            거래량·단지수
          </button>
        </div>
      </div>

      {/* High-Contrast Inner Canvas Area (Zero-CLS Rigid Container min-h-[250px]) */}
      <div className="w-full flex-1 min-h-[250px] rounded-xl bg-surface border border-border p-3.5 sm:p-5 flex flex-col justify-end shadow-[inset_0_1px_2px_rgba(15,23,42,0.03)]">
        {/* Bar Plot with Reference Gridlines */}
        <div className="relative grid grid-cols-5 gap-2.5 sm:gap-5 items-end h-[210px] w-full border-b border-border pb-2">
          {/* Subtle Horizontal Reference Gridlines */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-6 bottom-2 flex flex-col justify-between"
          >
            <div className="w-full border-t border-dashed border-slate-200/80 dark:border-slate-800/80" />
            <div className="w-full border-t border-dashed border-slate-200/80 dark:border-slate-800/80" />
            <div className="w-full border-t border-dashed border-slate-200/80 dark:border-slate-800/80" />
          </div>

          {distanceTiers.map((tier) => {
            const rawVal = getMetricValue(tier, currentMetric);
            const heightPct = maxValue > 0 ? Math.max(14, Math.round((rawVal / maxValue) * 100)) : 14;
            const style = tierColors[tier.tierId] || tierColors['3km+'];

            return (
              <div key={tier.tierId} className="relative z-10 flex flex-col items-center h-full justify-end group">
                {/* Metric Value Label above bar */}
                <div className="mb-2 text-center flex flex-col items-center">
                  <span className={`text-[12px] sm:text-[14px] font-black tabular-nums tracking-tight block ${style.text}`}>
                    {currentMetric === 'price'
                      ? `${rawVal.toFixed(1)}억`
                      : currentMetric === 'volume'
                      ? `${rawVal.toLocaleString()}건`
                      : `${rawVal.toLocaleString()}만`}
                  </span>
                  {tier.premiumVsAveragePercent !== 0 && currentMetric === 'pyeong' && (
                    <span
                      className={`mt-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold tabular-nums ${
                        tier.premiumVsAveragePercent > 0
                          ? 'bg-brand-red-light text-brand-red'
                          : 'bg-brand-blue-light text-brand-blue'
                      }`}
                    >
                      {tier.premiumVsAveragePercent > 0
                        ? `+${tier.premiumVsAveragePercent}%`
                        : `${tier.premiumVsAveragePercent}%`}
                    </span>
                  )}
                </div>

                {/* Sculpted Bar Track & Fill */}
                <div
                  className={`w-full max-w-[68px] sm:max-w-[88px] rounded-t-xl overflow-hidden flex flex-col justify-end h-full max-h-[142px] p-1 ${style.track}`}
                >
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-lg transition-all duration-300 ${style.bar}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Tier Cards */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 pt-3 text-center">
          {distanceTiers.map((tier) => {
            const style = tierColors[tier.tierId] || tierColors['3km+'];
            return (
              <div
                key={tier.tierId}
                className="flex flex-col items-center p-1.5 sm:p-2 rounded-lg bg-elevated border border-border"
              >
                <span className="text-[11px] sm:text-[12px] font-extrabold text-primary leading-tight tabular-nums">
                  {tier.tierId}
                </span>
                <span className="text-[10px] font-semibold text-secondary truncate max-w-full mt-0.5">
                  {tier.tierLabel.split('(')[1]?.replace(')', '') || tier.tierLabel}
                </span>
                <span className={`mt-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold tabular-nums ${style.badge}`}>
                  {tier.complexCount}개 단지
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart Footer Notes */}
      <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-tertiary">
        <span className="tabular-nums">
          * 동탄역 중심 WGS84 좌표(37.200092, 127.095514) 기준 Haversine 구면거리
        </span>
        <span className="font-bold text-secondary tabular-nums">
          현재 기준: {getMetricDisplay(distanceTiers[0] || ({} as DistanceTierSummary), currentMetric)} (초역세권)
        </span>
      </div>
    </section>
  );
}
