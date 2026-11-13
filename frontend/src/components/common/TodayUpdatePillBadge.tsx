'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Clock } from 'lucide-react';
import { staticDataService } from '@/lib/services/staticDataService';
import { BUILD_VERSION } from '@/lib/build-version';
import {
  evaluateTodayUpdateMetrics,
  TodayUpdateMetrics,
} from '@/lib/todayUpdateEvaluator';
import {
  useLiveTransactionDelta,
  mergeLiveDeltaRecentTransactions,
} from '@/hooks/useLiveTransactionDelta';
import type { MarketStats } from './MarketStatsSubtitle';

export interface TodayUpdatePillBadgeProps {
  metrics?: TodayUpdateMetrics;
  recentTransactions?: Array<{
    registeredDate?: string;
    contractDate?: string;
    isNewHigh?: boolean;
    type?: string;
    [key: string]: unknown;
  }>;
  marketStats?: MarketStats | null;
  variant?: 'pill' | 'compact' | 'subtle';
  className?: string;
  onClick?: () => void;
}

/**
 * TodayUpdatePillBadge
 * Live status pulse badge representing today's newly registered transactions from MOLIT.
 * Adheres strictly to:
 * - Ad Money Design System v5.0 (Value Emerald tokens)
 * - Zero-CLS Bounding Box Invariant (fixed h-[26px] height footprint)
 * - Strict Real Data Only Rule (truthful 0-count neutral state on weekends/holidays)
 */
export function TodayUpdatePillBadge({
  metrics: propMetrics,
  recentTransactions: propRecentTransactions,
  marketStats: propMarketStats,
  variant = 'pill',
  className = '',
  onClick,
}: TodayUpdatePillBadgeProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const shouldFetchStats = mounted && !propMetrics && !propMarketStats;
  const { data: liveDelta } = useLiveTransactionDelta(shouldFetchStats);
  const { data: fetchedMarketStats } = useSWR<MarketStats>(
    shouldFetchStats ? `/data/market-stats.json?v=${BUILD_VERSION}` : null,
    (url: string) => staticDataService.fetchJson<MarketStats>(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
      shouldRetryOnError: false,
    }
  );

  const effectiveMarketStats =
    propMarketStats ||
    (liveDelta?.marketStats && Number(liveDelta.marketStats.saleTxCount) > 0
      ? (liveDelta.marketStats as MarketStats)
      : null) ||
    fetchedMarketStats ||
    null;

  const effectiveRecentTransactions =
    propRecentTransactions && propRecentTransactions.length > 0
      ? liveDelta?.deltaTransactions?.length
        ? mergeLiveDeltaRecentTransactions(propRecentTransactions as never, liveDelta.deltaTransactions)
        : propRecentTransactions
      : liveDelta?.deltaTransactions || [];

  // Zero-CLS Pre-reserved Shimmer Skeleton (h-[26px])
  if (
    !mounted ||
    (!propMetrics &&
      !effectiveMarketStats &&
      (!effectiveRecentTransactions || effectiveRecentTransactions.length === 0))
  ) {
    return (
      <div
        data-testid="today-update-pill-badge-skeleton"
        aria-hidden="true"
        className={`h-[26px] min-w-[130px] sm:min-w-[160px] rounded-full bg-slate-200/70 dark:bg-slate-800/60 animate-pulse shrink-0 ${className}`}
      />
    );
  }

  const metrics =
    propMetrics ||
    evaluateTodayUpdateMetrics(
      effectiveRecentTransactions,
      effectiveMarketStats,
      new Date()
    );

  const isClickable = typeof onClick === 'function';
  const interactiveProps = isClickable
    ? {
        role: 'button',
        tabIndex: 0,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        },
      }
    : {};

  // Case A: Today's new transactions registered (Value Emerald Live Pulse)
  if (metrics.isTodayUpdated && metrics.todayRegisteredCount > 0) {
    const mainText =
      variant === 'compact'
        ? `오늘 등록 ${metrics.todayRegisteredCount}건`
        : `오늘 신규 ${metrics.todayRegisteredCount}건 등록 (07:00 반영)`;

    return (
      <div
        data-testid="today-update-pill-badge"
        {...interactiveProps}
        onClick={onClick}
        aria-label={`오늘 아침 7시 갱신, 신규 실거래 ${metrics.todayRegisteredCount}건 등록`}
        className={`h-[26px] inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 text-[11px] sm:text-xs font-bold sm:font-extrabold tracking-tight tabular-nums select-none shrink-0 transition-colors ${
          isClickable ? 'cursor-pointer hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50' : ''
        } ${className}`}
      >
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>

        <span>{mainText}</span>

        {metrics.todayNewHighCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 rounded bg-red-500 text-white text-[9.5px] font-black shrink-0">
            신고가 {metrics.todayNewHighCount}건
          </span>
        )}
      </div>
    );
  }

  // Case B: No new transactions today (Strict Real Data: Truthful neutral indicator on weekends/holidays)
  const emptyLabel = metrics.latestRegisteredDateLabel
    ? `최신 실거래 갱신 완료 (${metrics.latestRegisteredDateLabel})`
    : '최신 실거래 갱신 완료';

  return (
    <div
      data-testid="today-update-pill-badge-empty"
      {...interactiveProps}
      onClick={onClick}
      aria-label={`최신 실거래 갱신 완료, ${metrics.latestRegisteredDateLabel || '최신'} 국토부 등록 반영`}
      className={`h-[26px] inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-[11px] sm:text-xs font-semibold tracking-tight tabular-nums select-none shrink-0 ${
        isClickable ? 'cursor-pointer hover:bg-slate-200/60 dark:hover:bg-slate-700/60' : ''
      } ${className}`}
    >
      <Clock size={12} className="shrink-0 text-slate-400" aria-hidden="true" />
      <span>{emptyLabel}</span>
    </div>
  );
}
