'use client';

import React from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import type { ComplexStatItem } from '@/types/stats';
import { formatPriceEok } from '@/lib/analytics/statsEngine';
import { RankingBreakAdBanner } from './StatsAdBanners';
import { getToggleTrackClass, getToggleBtnClass } from '@/lib/design-system/controls';

export interface StatsPyeongRankingChartProps {
  rankings: ComplexStatItem[];
  onSelectComplex?: (aptKey: string, aptName: string) => void;
  isLoading?: boolean;
  className?: string;
  testMode?: boolean;
}

const getBarColor = (rank: number) => {
  if (rank === 1) return '#2563eb'; // Trust Blue 600
  if (rank <= 3) return '#3b82f6'; // Trust Blue 500
  return '#94a3b8'; // Minimalist Muted Slate 400
};

const formatPyeongAxisTick = (val: number) => {
  if (!Number.isFinite(val) || val <= 0) return '0';
  return `${val.toLocaleString()}만`;
};

export function StatsPyeongRankingChart({
  rankings,
  onSelectComplex,
  isLoading = false,
  className = '',
  testMode = false,
}: StatsPyeongRankingChartProps) {
  // Default to 'table' (clean ranking list with inline gauge bars) to eliminate dual chart+table visual clutter
  const [viewTab, setViewTab] = React.useState<'both' | 'chart' | 'table'>('table');
  const [isExpanded, setIsExpanded] = React.useState<boolean>(false);

  const safeRankings = Array.isArray(rankings) ? rankings : [];
  const topRankings = safeRankings.slice(0, 20);
  const hasData = topRankings.length > 0;

  const safeNum = (val: unknown) =>
    typeof val === 'number' && Number.isFinite(val) && val > 0 ? val : 0;
  const safePyeong = (val: number) => safeNum(val);

  const maxPyeongPrice = hasData
    ? Math.max(...topRankings.map((item) => safePyeong(item.avgPyeongPrice)), 1)
    : 1;

  const avgTopPyeongPrice = hasData
    ? Math.round(
        topRankings.reduce((acc, item) => acc + safePyeong(item.avgPyeongPrice), 0) /
          topRankings.length
      )
    : 0;

  const top1Item = hasData
    ? topRankings.reduce(
        (best, cur) =>
          safePyeong(cur.avgPyeongPrice) > safePyeong(best.avgPyeongPrice) ? cur : best,
        topRankings[0]
      )
    : null;
  const cutoffItem = hasData
    ? topRankings.reduce(
        (worst, cur) =>
          safePyeong(cur.avgPyeongPrice) < safePyeong(worst.avgPyeongPrice) ? cur : worst,
        topRankings[topRankings.length - 1]
      )
    : null;
  const cutoffRank = cutoffItem ? topRankings.indexOf(cutoffItem) + 1 : topRankings.length;
  const dongtan2Count = topRankings.filter((item) => item.region === '동탄2').length;
  const dongtan1Count = topRankings.filter((item) => item.region === '동탄1').length;
  const newHighCount = topRankings.filter((item) => item.isNewHigh).length;

  const chartData = topRankings.slice(0, 10).map((item, idx) => {
    const rank = idx + 1;
    const nameStr = String(item.aptName || '').replace(/\s+/g, '');
    const shortName =
      nameStr.length > 9 ? `${nameStr.substring(0, 9)}…` : nameStr;
    return {
      ...item,
      rank,
      avgPyeongPrice: safePyeong(item.avgPyeongPrice),
      avgPrice: safeNum(item.avgPrice),
      displayName: `${rank}위 ${shortName}`,
      eq84Price: Math.round(safePyeong(item.avgPyeongPrice) * 34),
    };
  });

  const podiumItems = topRankings.slice(0, 3);
  const remainingItems = topRankings.slice(3);
  const visibleRemainingItems =
    testMode || isExpanded || remainingItems.length <= 7
      ? remainingItems
      : remainingItems.slice(0, 7);
  const hiddenCount = remainingItems.length - visibleRemainingItems.length;

  return (
    <div
      data-testid="stats-pyeong-ranking-chart"
      aria-busy={isLoading}
      className={`p-5 sm:p-6 rounded-2xl border border-border/60 bg-surface shadow-xs flex flex-col justify-between ${className}`}
    >
      {/* Consumer-Friendly Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-base sm:text-[17px] text-primary tracking-tight">
              단지별 평당가 TOP 20
            </h3>
            {hasData && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-secondary text-[11px] font-bold tabular-nums">
                TOP {topRankings.length}
              </span>
            )}
          </div>
          <p className="text-xs text-tertiary mt-0.5">
            3.3㎡(1평)당 평균 실거래가 및 34평(국민평형) 환산 시세 비교 · 단지 클릭 시 상세 분석
          </p>
        </div>

        {/* Action Controls: Explore Tab Link + Clean Segmented View Toggle */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Link
            href="/explore?category=rank-price"
            className="inline-flex items-center px-2.5 py-1.5 rounded-lg bg-blue-50/80 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors shrink-0"
          >
            <span>아파트 탐색에서 전체 보기</span>
          </Link>

          <div className={getToggleTrackClass()}>
            <button
              type="button"
              onClick={() => setViewTab('table')}
              className={getToggleBtnClass({ active: viewTab === 'table', size: 'sm' })}
            >
              목록만
            </button>
            <button
              type="button"
              onClick={() => setViewTab('chart')}
              className={getToggleBtnClass({ active: viewTab === 'chart', size: 'sm' })}
            >
              차트만
            </button>
            <button
              type="button"
              onClick={() => setViewTab('both')}
              className={getToggleBtnClass({ active: viewTab === 'both', size: 'sm' })}
            >
              통합 뷰
            </button>
          </div>
        </div>
      </div>

      {!hasData ? (
        <div className="w-full h-[280px] flex flex-col items-center justify-center text-tertiary text-xs">
          <p>해당 필터 조건에 매칭되는 아파트 단지 거래가 없습니다.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Minimalist Single-Container Summary Strip */}
          <div
            data-testid="ranking-summary-strip"
            className="grid grid-cols-2 lg:grid-cols-4 gap-y-3 gap-x-4 py-3.5 px-4 rounded-xl bg-body/60 border border-border/50"
          >
            {/* Metric 1: 1위 최고 평당가 */}
            <div className="flex flex-col justify-between min-w-0 lg:pr-3 lg:border-r lg:border-border/40">
              <span className="text-[11px] font-medium text-tertiary">1위 최고 평당가</span>
              <p className="text-sm sm:text-[15px] font-extrabold tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
                {top1Item ? `${safePyeong(top1Item.avgPyeongPrice).toLocaleString()}만원/평` : '-'}
              </p>
              <span className="text-[11px] text-secondary truncate mt-0.5 tabular-nums">
                {top1Item
                  ? `${top1Item.aptName} · 34평 ${formatPriceEok(
                      Math.round(safePyeong(top1Item.avgPyeongPrice) * 34)
                    )}`
                  : '-'}
              </span>
            </div>

            {/* Metric 2: TOP 20 평균 평당가 */}
            <div className="flex flex-col justify-between min-w-0 lg:pr-3 lg:border-r lg:border-border/40">
              <span className="text-[11px] font-medium text-tertiary">
                TOP {topRankings.length} 평균 평당가
              </span>
              <p className="text-sm sm:text-[15px] font-extrabold tabular-nums text-primary mt-0.5">
                {avgTopPyeongPrice.toLocaleString()}만원/평
              </p>
              <span className="text-[11px] text-secondary truncate mt-0.5 tabular-nums">
                34평(84㎡) 평균 {formatPriceEok(Math.round(avgTopPyeongPrice * 34))}
              </span>
            </div>

            {/* Metric 3: TOP 20 진입 기준선 */}
            <div className="flex flex-col justify-between min-w-0 lg:pr-3 lg:border-r lg:border-border/40">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-medium text-tertiary">
                  TOP {topRankings.length} 진입 기준선
                </span>
                <span className="text-[10px] tabular-nums text-secondary">
                  {cutoffItem
                    ? `1위 대비 ${Math.round(
                        (safePyeong(cutoffItem.avgPyeongPrice) / maxPyeongPrice) * 100
                      )}%`
                    : '-'}
                </span>
              </div>
              <p className="text-sm sm:text-[15px] font-extrabold tabular-nums text-primary mt-0.5">
                {cutoffItem ? `${safePyeong(cutoffItem.avgPyeongPrice).toLocaleString()}만원/평` : '-'}
              </p>
              <span className="text-[11px] text-secondary truncate mt-0.5">
                {cutoffItem ? `${cutoffRank}위 ${cutoffItem.aptName}` : '-'}
              </span>
            </div>

            {/* Metric 4: 권역 · 신고가 분포 */}
            <div className="flex flex-col justify-between min-w-0">
              <span className="text-[11px] font-medium text-tertiary">권역 · 신고가 분포</span>
              <p className="text-sm sm:text-[15px] font-extrabold tabular-nums text-primary mt-0.5">
                동탄2 {dongtan2Count}곳 · 동탄1 {dongtan1Count}곳
              </p>
              <span className="text-[11px] text-secondary truncate mt-0.5 tabular-nums">
                신고가 경신 {newHighCount}개 단지 포함
              </span>
            </div>
          </div>

          {/* Horizontal Bar Chart (Shown when user selects '차트만' or '통합 뷰') */}
          {(viewTab === 'both' || viewTab === 'chart') && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold text-tertiary">
                  상위 10개 단지 시각 비교 (단위: 만원/3.3㎡)
                </span>
                <div className="flex items-center gap-3 text-[11px] text-tertiary">
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                    TOP 1~3
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                    4~10위
                  </span>
                </div>
              </div>

              <div className="w-full h-[250px] sm:h-[270px]">
                <ResponsiveContainer width="100%" height="100%" minWidth={280} minHeight={220}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="2 2"
                      horizontal={false}
                      stroke="rgba(148, 163, 184, 0.14)"
                    />
                    <XAxis
                      type="number"
                      tickFormatter={formatPyeongAxisTick}
                      tick={{ fontSize: 10.5, fill: 'currentColor' }}
                      className="text-slate-400 dark:text-slate-500 tabular-nums"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="displayName"
                      width={132}
                      interval={0}
                      tick={{ fontSize: 11, fill: 'currentColor' }}
                      className="text-slate-600 dark:text-slate-300 font-medium"
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      formatter={(value: unknown) => [
                        `${safeNum(Number(value)).toLocaleString()} 만원/평`,
                        '3.3㎡당 평당가',
                      ]}
                      labelFormatter={(label, p) => {
                        const item = p?.[0]?.payload;
                        return item
                          ? `${item.rank}위 ${item.aptName} (${item.dong}) · 34평 환산 ${formatPriceEok(safeNum(item.eq84Price))}`
                          : String(label);
                      }}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        color: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.2)',
                        fontSize: '12px',
                      }}
                      itemStyle={{ color: '#60a5fa', fontWeight: 700 }}
                      labelStyle={{ color: '#f8fafc', fontWeight: 600, marginBottom: '2px' }}
                    />
                    <Bar
                      dataKey="avgPyeongPrice"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={15}
                      onClick={(data: unknown) => {
                        const payload = data as { aptKey?: string; aptName?: string } | null;
                        if (payload && payload.aptKey && payload.aptName) {
                          onSelectComplex?.(payload.aptKey, payload.aptName);
                        }
                      }}
                      cursor="pointer"
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(index + 1)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Consumer-Friendly Ranking Board (Inline Progress Gauge + 34-Pyeong Equivalent Price) */}
          {(viewTab === 'both' || viewTab === 'table') && (
            <div data-testid="ranking-list" className="flex flex-col gap-4">
              {/* Section 1: TOP 1~3 Highlight Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {podiumItems.map((item, idx) => {
                  const rank = idx + 1;
                  const itemPyeong = safePyeong(item.avgPyeongPrice);
                  const itemAvgPrice = safeNum(item.avgPrice);
                  const itemHighestPrice = safeNum(item.highestPrice);
                  const itemTxCount = safeNum(item.txCount);
                  const itemJeonseRatio = safeNum(item.jeonseRatio);
                  const rawPct =
                    itemPyeong > 0 ? Math.round((itemPyeong / maxPyeongPrice) * 100) : 0;
                  const relativePct =
                    itemPyeong > 0 ? Math.max(12, Math.min(100, rawPct)) : 0;
                  const isTopBenchmark = rank === 1 && itemPyeong >= maxPyeongPrice && itemPyeong > 0;
                  const eq84Price = Math.round(itemPyeong * 34);

                  return (
                    <div
                      key={`${item.aptKey || item.aptName}-${rank}`}
                      data-testid={`ranking-item-${rank}`}
                      onClick={() => onSelectComplex?.(item.aptKey, item.aptName)}
                      className="p-4 rounded-xl border border-border/60 bg-body/40 hover:bg-body hover:border-blue-500/40 transition-all cursor-pointer flex flex-col justify-between gap-2.5 group"
                    >
                      {/* Top Row: Rank Badge + Complex Name + Dong Pill */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            className={`w-5 h-5 rounded-md text-[11px] tabular-nums font-bold flex items-center justify-center shrink-0 ${
                              rank === 1
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                            }`}
                          >
                            {rank}
                          </span>
                          <span className="font-bold text-[13.5px] text-primary truncate">
                            {rank}위 {item.aptName}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-secondary text-[10px] font-medium shrink-0">
                            {item.dong}
                          </span>
                          {item.isNewHigh && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                              신고가
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Middle Row: Primary Pyeong Price & Prominent 34-Pyeong Equivalent Pill */}
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-base sm:text-[17px] font-black tabular-nums text-primary">
                          {itemPyeong.toLocaleString()}만원/평
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-[11px] font-bold tabular-nums shrink-0">
                          34평 환산 {formatPriceEok(eq84Price)}
                        </span>
                      </div>

                      {/* Inline Relative Gauge Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            rank === 1 ? 'bg-blue-600' : 'bg-blue-500/80'
                          }`}
                          style={{ width: `${relativePct}%` }}
                        />
                      </div>

                      {/* Bottom Row: Consumer Metadata & Relative Ratio */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-secondary tabular-nums">
                        <span className="truncate">
                          평균 {formatPriceEok(itemAvgPrice)} ·{' '}
                          {itemJeonseRatio > 0
                            ? `전세가율 ${itemJeonseRatio}%`
                            : `최고 실거래가 ${formatPriceEok(itemHighestPrice)}`}{' '}
                          · {itemTxCount}건
                        </span>
                        <span className="text-tertiary shrink-0">
                          {isTopBenchmark
                            ? '1위 기준 (100%)'
                            : itemPyeong > 0
                              ? `1위 대비 ${relativePct}%`
                              : '-'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Strategic Ad Placement: Ranking Break after Rank 3 */}
              {topRankings.length >= 3 && (
                <div className="my-0.5">
                  <RankingBreakAdBanner testMode={testMode} />
                </div>
              )}

              {/* Section 2: Ranks 4~20 Clean Consumer Table with Inline Gauge Bars */}
              {visibleRemainingItems.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 divide-y divide-border/40 border-t border-border/40">
                  {visibleRemainingItems.map((item, idx) => {
                    const rank = idx + 4;
                    const itemPyeong = safePyeong(item.avgPyeongPrice);
                    const itemTxCount = safeNum(item.txCount);
                    const rawPct =
                      itemPyeong > 0 ? Math.round((itemPyeong / maxPyeongPrice) * 100) : 0;
                    const relativePct =
                      itemPyeong > 0 ? Math.max(12, Math.min(100, rawPct)) : 0;
                    const eq84Price = Math.round(itemPyeong * 34);

                    return (
                      <div
                        key={`${item.aptKey || item.aptName}-${rank}`}
                        data-testid={`ranking-item-${rank}`}
                        onClick={() => onSelectComplex?.(item.aptKey, item.aptName)}
                        className="py-2.5 px-2 hover:bg-body/60 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                      >
                        {/* Left: Rank + Complex Name + Dong */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-5 text-xs tabular-nums font-bold text-tertiary text-right shrink-0">
                            {rank}
                          </span>
                          <div className="flex flex-col min-w-0 flex-1 gap-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="font-semibold text-[13px] text-primary truncate">
                                {rank}위 {item.aptName}
                              </span>
                              <span className="text-[11px] text-tertiary shrink-0">
                                {item.dong}
                              </span>
                              {item.isNewHigh && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                                  신고가
                                </span>
                              )}
                            </div>
                            {/* Subtle Inline Gauge + Sub-meta */}
                            <div className="flex items-center gap-2">
                              <div className="w-16 sm:w-20 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                <div
                                  className="h-full rounded-full bg-slate-400 dark:bg-slate-500"
                                  style={{ width: `${relativePct}%` }}
                                />
                              </div>
                              <span className="text-[10.5px] text-tertiary tabular-nums truncate">
                                34평 환산 {formatPriceEok(eq84Price)} · 1위 대비 {relativePct}% · {itemTxCount}건
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Pyeong Price */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-primary font-bold tabular-nums text-[13px]">
                            {itemPyeong.toLocaleString()}만원/평
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Progressive Disclosure Toggle (TOP 10 <-> TOP 20) */}
              {!testMode && remainingItems.length > 7 && (
                <div className="flex items-center justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="w-full sm:w-auto px-5 py-2 rounded-xl border border-border/60 bg-body/50 hover:bg-body text-secondary hover:text-primary text-xs font-bold transition-colors flex items-center justify-center cursor-pointer"
                  >
                    {isExpanded ? (
                      <span>상위 10개 단지만 간단히 보기</span>
                    ) : (
                      <span>11위 ~ {topRankings.length}위 단지 더보기 ({hiddenCount}개)</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StatsPyeongRankingChart;
