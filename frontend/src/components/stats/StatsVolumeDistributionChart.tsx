'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import type { VolumeDistributionItem } from '@/types/stats';

export interface StatsVolumeDistributionChartProps {
  distribution: VolumeDistributionItem[];
  isLoading?: boolean;
  className?: string;
  onSliceClick?: (tierName: string) => void;
}

const TIER_COLORS: Record<string, string> = {
  '소형 (60㎡ 이하)': '#10b981', // Emerald
  '중소형 (60~85㎡)': '#057e77', // Brand Deep Teal
  '중대형 (85~102㎡)': '#3b82f6', // Ocean Blue
  '대형 (102㎡ 초과)': '#e11d48', // Ruby Rose
};

const FALLBACK_COLORS = ['#057e77', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function StatsVolumeDistributionChart({
  distribution,
  isLoading = false,
  className = '',
  onSliceClick,
}: StatsVolumeDistributionChartProps) {
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const totalVolume = distribution.reduce((acc, item) => acc + item.value, 0);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const activeItem = activeIndex !== null ? distribution[activeIndex] : null;

  return (
    <div
      data-testid="stats-volume-distribution-chart"
      className={`p-5 sm:p-6 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <PieChartIcon size={18} className="text-teal-600" />
            <span>평형대별 거래량 비중</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            총 {totalVolume.toLocaleString()}건 실거래 평형 수요 분포
          </p>
        </div>
      </div>

      {totalVolume === 0 ? (
        <div className="w-full h-[260px] flex flex-col items-center justify-center text-slate-400 text-xs">
          <p>해당 조건에 매칭되는 거래 내역이 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* Donut Chart with Center Text Overlay */}
          <div className="relative w-full h-[220px] sm:h-[240px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <PieChart>
                <Pie
                  data={distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius="68%"
                  outerRadius="90%"
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  onClick={(data) => {
                    if (data && data.name) onSliceClick?.(data.name);
                  }}
                  cursor="pointer"
                >
                  {distribution.map((entry, index) => {
                    const color =
                      TIER_COLORS[entry.name] || FALLBACK_COLORS[index % FALLBACK_COLORS.length];
                    const isSelected = activeIndex === index;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={color}
                        stroke={isSelected ? '#fff' : 'transparent'}
                        strokeWidth={isSelected ? 2 : 0}
                        opacity={activeIndex === null || isSelected ? 1 : 0.6}
                      />
                    );
                  })}
                </Pie>
                <RechartsTooltip
                  formatter={(value: any, name: any) => [
                    `${value}건 (${
                      totalVolume > 0 ? ((Number(value) / totalVolume) * 100).toFixed(1) : 0
                    }%)`,
                    name,
                  ]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label Overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[11px] font-bold text-slate-400">
                {activeItem ? activeItem.name.split(' ')[0] : '총 거래'}
              </span>
              <span className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {activeItem ? `${activeItem.percentage}%` : `${totalVolume}건`}
              </span>
            </div>
          </div>

          {/* Donut Slices Breakdown Table / Legend */}
          <div data-testid="donut-slices" className="w-full space-y-2 mt-4 pt-3 border-t border-border/40 text-xs sm:text-sm">
            {distribution.map((tier, idx) => {
              const color =
                TIER_COLORS[tier.name] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
              const isSelected = activeIndex === idx;

              return (
                <div
                  key={tier.name}
                  data-testid={`donut-slice-${tier.name}`}
                  onClick={() => onSliceClick?.(tier.name)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer ${
                    isSelected ? 'bg-body font-bold' : 'hover:bg-body/60 text-secondary'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="font-semibold">{tier.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {tier.value}건 ({tier.percentage}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default StatsVolumeDistributionChart;
