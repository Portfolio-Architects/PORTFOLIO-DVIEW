'use client';

import React, { useState } from 'react';
import { BarChart3, TrendingUp, Building2, TrainFront } from 'lucide-react';
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

  // Distinct color accents for distance tiers
  const tierColors: Record<string, { bar: string; badge: string; text: string }> = {
    '<500m': {
      bar: 'bg-blue-600 dark:bg-blue-500',
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
    },
    '500m-1km': {
      bar: 'bg-blue-500 dark:bg-blue-600',
      badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      text: 'text-blue-600 dark:text-blue-400',
    },
    '1km-2km': {
      bar: 'bg-emerald-600 dark:bg-emerald-500',
      badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    '2km-3km': {
      bar: 'bg-slate-500 dark:bg-slate-400',
      badge: 'bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
      text: 'text-slate-600 dark:text-slate-400',
    },
    '3km+': {
      bar: 'bg-slate-400 dark:bg-slate-500',
      badge: 'bg-slate-200/60 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
      text: 'text-slate-500 dark:text-slate-400',
    },
  };

  return (
    <section
      aria-label="동탄역 거리 구간별 아파트 시세 비교 차트"
      className={`w-full rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-4 sm:p-6 border border-[#f2f4f6] dark:border-[#202027] min-h-[380px] sm:min-h-[420px] flex flex-col justify-between ${className}`}
    >
      {/* Header & Metric Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <TrainFront className="w-4 h-4 text-blue-600 dark:text-blue-400" />
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
            className={getToggleBtnClass(currentMetric === 'pyeong', { size: 'sm', tone: 'blue' })}
          >
            평당가 비교
          </button>
          <button
            type="button"
            onClick={() => handleMetricToggle('price')}
            className={getToggleBtnClass(currentMetric === 'price', { size: 'sm', tone: 'blue' })}
          >
            평균 매매가
          </button>
          <button
            type="button"
            onClick={() => handleMetricToggle('volume')}
            className={getToggleBtnClass(currentMetric === 'volume', { size: 'sm', tone: 'blue' })}
          >
            거래량·단지수
          </button>
        </div>
      </div>

      {/* Bar Chart Area (Zero-CLS Rigid Container min-h-[240px]) */}
      <div className="w-full flex-1 min-h-[240px] flex flex-col justify-end pt-4 pb-2">
        <div className="grid grid-cols-5 gap-2 sm:gap-4 items-end h-[210px] w-full border-b border-[#f2f4f6] dark:border-[#202027] pb-2">
          {distanceTiers.map((tier) => {
            const rawVal = getMetricValue(tier, currentMetric);
            const heightPct = maxValue > 0 ? Math.max(12, Math.round((rawVal / maxValue) * 100)) : 12;
            const style = tierColors[tier.tierId] || tierColors['3km+'];

            return (
              <div key={tier.tierId} className="flex flex-col items-center h-full justify-end group">
                {/* Metric Value Label above bar */}
                <div className="mb-2 text-center">
                  <span className={`text-[11px] sm:text-[13px] font-black tabular-nums block ${style.text}`}>
                    {currentMetric === 'price'
                      ? `${rawVal.toFixed(1)}억`
                      : currentMetric === 'volume'
                      ? `${rawVal}건`
                      : `${rawVal.toLocaleString()}만`}
                  </span>
                  {tier.premiumVsAveragePercent !== 0 && currentMetric === 'pyeong' && (
                    <span
                      className={`text-[9px] sm:text-[10px] font-bold tabular-nums ${
                        tier.premiumVsAveragePercent > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-tertiary'
                      }`}
                    >
                      {tier.premiumVsAveragePercent > 0 ? `+${tier.premiumVsAveragePercent}%` : `${tier.premiumVsAveragePercent}%`}
                    </span>
                  )}
                </div>

                {/* Animated / Colored Bar */}
                <div className="w-full max-w-[56px] bg-slate-200/50 dark:bg-slate-800/40 rounded-t-xl overflow-hidden flex flex-col justify-end h-full max-h-[140px]">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-xl transition-all duration-300 ${style.bar}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 pt-3 text-center">
          {distanceTiers.map((tier) => (
            <div key={tier.tierId} className="flex flex-col items-center">
              <span className="text-[11px] sm:text-[12px] font-extrabold text-primary leading-tight">
                {tier.tierId}
              </span>
              <span className="text-[10px] font-medium text-tertiary truncate max-w-full">
                {tier.tierLabel.split('(')[1]?.replace(')', '') || tier.tierLabel}
              </span>
              <span className="text-[9px] font-bold text-secondary tabular-nums mt-0.5">
                {tier.complexCount}개 단지
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Footer Notes */}
      <div className="mt-3 pt-3 border-t border-[#f2f4f6] dark:border-[#202027] flex items-center justify-between text-[11px] text-tertiary">
        <span className="tabular-nums">
          * 동탄역 중심 WGS84 좌표(37.200092, 127.095514) 기준 Haversine 구면거리
        </span>
        <span className="font-bold tabular-nums">
          현재 기준: {getMetricDisplay(distanceTiers[0] || ({} as any), currentMetric)} (초역세권)
        </span>
      </div>
    </section>
  );
}
