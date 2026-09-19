'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Bar,
  Line,
  Area,
} from 'recharts';
import type { MacroTimeSeriesPoint } from '@/types/stats';
import { formatPriceEok } from '@/lib/analytics/statsEngine';

export interface StatsTimeTrendChartProps {
  data: MacroTimeSeriesPoint[];
  isLoading?: boolean;
  className?: string;
  height?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    dataKey?: string | number;
    color?: string;
    payload?: MacroTimeSeriesPoint;
  }>;
  label?: string;
}

const CustomTrendTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || !payload.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const salePriceMan = point.avgSalePrice || 0;
  const rentDepositMan = point.avgRentDeposit || 0;
  const volume = point.volume || 0;

  const jeonseRatio =
    salePriceMan > 0 && rentDepositMan > 0
      ? ((rentDepositMan / salePriceMan) * 100).toFixed(1)
      : null;

  const gapMan = salePriceMan > 0 && rentDepositMan > 0 ? salePriceMan - rentDepositMan : null;

  return (
    <div className="bg-surface/95 dark:bg-zinc-900/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-border/80 text-xs flex flex-col gap-2 min-w-[200px] z-50">
      <div className="font-extrabold text-slate-800 dark:text-slate-100 border-b border-border/50 pb-1.5 flex justify-between items-center">
        <span>{label} 월별 거래 분석</span>
        <span className="text-slate-400 font-semibold">{volume}건 체결</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">평균 매매가</span>
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {formatPriceEok(salePriceMan)}
          </span>
        </div>

        {rentDepositMan > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-500 dark:text-slate-400 font-medium">평균 전세가</span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {formatPriceEok(rentDepositMan)}
            </span>
          </div>
        )}

        {jeonseRatio && (
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <span className="text-slate-500 dark:text-slate-400 font-medium">전세가율</span>
            <span className="font-black text-emerald-600 dark:text-emerald-400">{jeonseRatio}%</span>
          </div>
        )}

        {gapMan && gapMan > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400 font-medium">예상 갭차이</span>
            <span className="font-black text-rose-500">{formatPriceEok(gapMan)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export function StatsTimeTrendChart({
  data,
  isLoading = false,
  className = '',
  height = 360,
}: StatsTimeTrendChartProps) {
  // Format price ticks for YAxis (만원 -> 억)
  const formatYAxisPrice = (manWon: number) => {
    if (manWon <= 0) return '0';
    const eok = manWon / 10000;
    return `${eok % 1 === 0 ? eok : eok.toFixed(1)}억`;
  };

  const hasData = data && data.length > 0;

  return (
    <div
      data-testid="stats-time-trend-chart"
      className={`p-5 sm:p-6 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between ${className}`}
    >
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <span>월별 실거래가 & 전세가 추이</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            거래량 바 차트와 매매/전세 평균 시세 흐름
          </p>
        </div>

        {/* Legend pills */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-2.5 rounded-xs bg-teal-600/30 border border-teal-600" />
            <span>거래량</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-1 rounded-full bg-teal-600" />
            <span>매매 평균</span>
          </div>
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <span className="w-2.5 h-1 rounded-full bg-amber-500 border-b border-dashed border-amber-500" />
            <span>전세 평균</span>
          </div>
        </div>
      </div>

      {/* Semantic test runner element (enables headless Jest DOM assertions) */}
      <div data-testid="time-trend-data-points" className="sr-only">
        {data.map((pt) => (
          <span key={pt.date} data-testid={`trend-point-${pt.date}`}>
            {pt.date}: {pt.avgSalePrice}만원 ({pt.volume}건)
          </span>
        ))}
      </div>

      {/* Chart Container */}
      {!hasData ? (
        <div className="w-full h-[300px] flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
          <p>해당 조건의 월별 실거래 추이 데이터가 없습니다.</p>
          <p className="text-[11px] mt-1 text-slate-400/80">다른 권역이나 기간 필터를 선택해보세요.</p>
        </div>
      ) : (
        <div className="w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="trendSaleGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#057e77" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#057e77" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-slate-400 dark:text-slate-500"
                axisLine={{ stroke: 'currentColor', className: 'text-border/40' }}
                tickLine={false}
              />

              {/* Left YAxis: Price (만원 / 억) */}
              <YAxis
                yAxisId="price"
                tickFormatter={formatYAxisPrice}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-slate-400 dark:text-slate-500"
                axisLine={false}
                tickLine={false}
                domain={['auto', 'auto']}
              />

              {/* Right YAxis: Volume */}
              <YAxis
                yAxisId="volume"
                orientation="right"
                tick={{ fontSize: 10, fill: 'currentColor' }}
                className="text-slate-400/60 dark:text-slate-600"
                axisLine={false}
                tickLine={false}
                domain={[0, 'auto']}
              />

              <RechartsTooltip content={<CustomTrendTooltip />} />

              {/* Volume Bar */}
              <Bar
                yAxisId="volume"
                dataKey="volume"
                name="거래량"
                fill="#057e77"
                fillOpacity={0.2}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />

              {/* Sale Price Area */}
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="avgSalePrice"
                name="매매 평균가"
                stroke="#057e77"
                strokeWidth={2.5}
                fill="url(#trendSaleGrad)"
                dot={{ r: 3, fill: '#057e77', strokeWidth: 1.5, stroke: '#fff' }}
                activeDot={{ r: 6, fill: '#057e77', stroke: '#fff', strokeWidth: 2 }}
              />

              {/* Rent Price Line */}
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="avgRentDeposit"
                name="전세 평균가"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 2.5, fill: '#f59e0b', strokeWidth: 1, stroke: '#fff' }}
                activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default StatsTimeTrendChart;
