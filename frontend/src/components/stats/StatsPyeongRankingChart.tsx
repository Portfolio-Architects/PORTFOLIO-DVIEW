'use client';

import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import { Trophy, TrendingUp, Sparkles, Building2 } from 'lucide-react';
import type { ComplexStatItem } from '@/types/stats';
import { formatPriceEok } from '@/lib/analytics/statsEngine';
import { RankingBreakAdBanner } from './StatsAdBanners';

export interface StatsPyeongRankingChartProps {
  rankings: ComplexStatItem[];
  onSelectComplex?: (aptKey: string, aptName: string) => void;
  isLoading?: boolean;
  className?: string;
  testMode?: boolean;
}

const getRankBadgeColor = (rank: number) => {
  if (rank === 1) return 'bg-amber-400 text-slate-950 font-black shadow-xs ring-2 ring-amber-300';
  if (rank === 2) return 'bg-slate-300 text-slate-900 font-bold';
  if (rank === 3) return 'bg-amber-700 text-amber-50 font-bold';
  return 'bg-body text-slate-500 font-semibold border border-border/60';
};

const getBarColor = (rank: number) => {
  if (rank === 1) return '#f59e0b'; // Gold
  if (rank === 2) return '#94a3b8'; // Silver
  if (rank === 3) return '#b45309'; // Bronze
  return '#057e77'; // Brand Teal
};

export function StatsPyeongRankingChart({
  rankings,
  onSelectComplex,
  isLoading = false,
  className = '',
  testMode = false,
}: StatsPyeongRankingChartProps) {
  const [viewTab, setViewTab] = React.useState<'both' | 'chart' | 'table'>('both');

  const topRankings = rankings.slice(0, 20);
  const chartData = topRankings.slice(0, 10).map((item, idx) => ({
    ...item,
    rank: idx + 1,
    displayName: item.aptName.length > 10 ? `${item.aptName.substring(0, 9)}…` : item.aptName,
  }));

  const hasData = topRankings.length > 0;

  return (
    <div
      data-testid="stats-pyeong-ranking-chart"
      className={`p-5 sm:p-6 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between ${className}`}
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

        {/* View Toggle */}
        <div className="flex items-center bg-body p-1 rounded-xl border border-border/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewTab('both')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              viewTab === 'both' ? 'bg-surface text-primary shadow-xs' : 'text-tertiary'
            }`}
          >
            통합 뷰
          </button>
          <button
            type="button"
            onClick={() => setViewTab('chart')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              viewTab === 'chart' ? 'bg-surface text-primary shadow-xs' : 'text-tertiary'
            }`}
          >
            차트만
          </button>
          <button
            type="button"
            onClick={() => setViewTab('table')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              viewTab === 'table' ? 'bg-surface text-primary shadow-xs' : 'text-tertiary'
            }`}
          >
            목록만
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="w-full h-[320px] flex flex-col items-center justify-center text-slate-400 text-xs">
          <p>해당 필터 조건에 매칭되는 아파트 단지 거래가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Horizontal Bar Chart (TOP 10 visual comparison) */}
          {(viewTab === 'both' || viewTab === 'chart') && (
            <div className="w-full h-[280px] sm:h-[320px] pt-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={240}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <XAxis
                    type="number"
                    tickFormatter={(val) => `${Math.round(val / 1000)}k`}
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="text-slate-400 dark:text-slate-500"
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="displayName"
                    width={90}
                    tick={{ fontSize: 11, fill: 'currentColor' }}
                    className="text-slate-700 dark:text-slate-300 font-semibold"
                    axisLine={false}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    formatter={(value: any) => [`${Number(value).toLocaleString()} 만원/평`, '3.3㎡당 평당가']}
                    labelFormatter={(label, p) => {
                      const item = p[0]?.payload;
                      return item ? `${item.rank}위 ${item.aptName} (${item.dong})` : label;
                    }}
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      borderRadius: '16px',
                      border: '1px solid rgba(0,0,0,0.08)',
                      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="avgPyeongPrice"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={20}
                    onClick={(data: any) => {
                      if (data && data.aptKey) {
                        onSelectComplex?.(data.aptKey, data.aptName);
                      }
                    }}
                    cursor="pointer"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(index + 1)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ranking List Table with Strategic Ad Placement after Rank 3 */}
          {(viewTab === 'both' || viewTab === 'table') && (
            <div data-testid="ranking-list" className="space-y-1.5 pt-2 border-t border-border/40">
              {topRankings.map((item, idx) => {
                const rank = idx + 1;
                return (
                  <React.Fragment key={`${item.aptKey || item.aptName}-${rank}`}>
                    <div
                      data-testid={`ranking-item-${rank}`}
                      onClick={() => onSelectComplex?.(item.aptKey, item.aptName)}
                      className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-body transition-colors cursor-pointer border-b border-border/30 last:border-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Rank Badge */}
                        <span
                          className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center shrink-0 ${getRankBadgeColor(
                            rank
                          )}`}
                        >
                          {rank}
                        </span>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                              {rank}위 {item.aptName} ({item.dong})
                            </span>
                            {item.isNewHigh && (
                              <span className="px-1.5 py-0.2 rounded-md bg-orange-100 dark:bg-orange-950/60 text-orange-600 text-[10px] font-extrabold">
                                신고가
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {item.dong} · {item.region} · 평균 {formatPriceEok(item.avgPrice)} · {item.txCount}건
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <span className="text-orange-600 dark:text-orange-400 font-extrabold text-xs sm:text-sm">
                          {item.avgPyeongPrice.toLocaleString()}만원/평
                        </span>
                        {item.jeonseRatio > 0 && (
                          <span className="text-[10px] text-slate-400">
                            전세가율 {item.jeonseRatio}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 3. AdSense Placement: Ranking Break after Rank 3 */}
                    {idx === 2 && (
                      <div className="my-2">
                        <RankingBreakAdBanner testMode={testMode} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StatsPyeongRankingChart;
