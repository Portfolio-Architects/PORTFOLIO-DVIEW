'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { staticDataService } from '@/lib/services/staticDataService';
import { BUILD_VERSION } from '@/lib/build-version';
import { getTodayYmdKST } from '@/lib/todayUpdateEvaluator';
import { useLiveTransactionDelta } from '@/hooks/useLiveTransactionDelta';

export { TodayUpdatePillBadge } from './TodayUpdatePillBadge';
export type { TodayUpdatePillBadgeProps } from './TodayUpdatePillBadge';

/**
 * 서브타이틀 실시간 지표 (등록 단지 수 / 국토부 매매 실거래 누적 건수 / 최신 국토부 등록일·계약일).
 * - 데이터 출처: /data/market-stats.json (sync-transactions.js 가 실제 집계값으로만 생성, 약 100B)
 * - 단지 수는 차트 드롭다운("동탄 전체 (N개 단지)")과 동일한 apartments-by-dong.json 기준입니다.
 * - 값이 없으면 숫자를 지어내지 않고 폭만 확보한 스켈레톤(Zero-CLS)을 노출합니다.
 */
export interface MarketStats {
  apartmentCount?: number;
  saleTxCount: number;
  latestContractDate: string | null;
  latestRegisteredDate?: string | null;
  todayRegisteredCount?: number;
  todayNewHighCount?: number;
  lastSyncTime?: string;
}

function useMarketStats(): MarketStats | null {
  // 하이드레이션 일치: 첫 렌더는 서버와 동일하게 데이터 없음으로 시작하고, 마운트 후에만 SWR 캐시/요청을 사용합니다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const { data: swrData } = useSWR<MarketStats>(
    mounted ? `/data/market-stats.json?v=${BUILD_VERSION}` : null,
    (url: string) => staticDataService.fetchJson<MarketStats>(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
      shouldRetryOnError: false,
    }
  );
  const { data: liveDelta } = useLiveTransactionDelta(mounted);
  const effectiveLiveStats =
    liveDelta?.marketStats && Number.isFinite(liveDelta.marketStats.saleTxCount) && liveDelta.marketStats.saleTxCount > 0
      ? (liveDelta.marketStats as MarketStats)
      : undefined;
  const data = mounted ? (effectiveLiveStats || swrData) : undefined;
  if (!data || !Number.isFinite(data.saleTxCount) || data.saleTxCount <= 0) return null;
  return data;
}

function formatContractDate(yyyymmdd: string | null): string | null {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${Number(yyyymmdd.slice(4, 6))}월 ${Number(yyyymmdd.slice(6, 8))}일`;
}

function formatShortDotDate(yyyymmdd: string | null): string | null {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${yyyymmdd.slice(4, 6)}.${yyyymmdd.slice(6, 8)}`;
}

function StatSkeleton({ widthClass }: { widthClass: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3.5 ${widthClass} rounded bg-slate-200/70 dark:bg-slate-800/70 align-middle animate-pulse`}
    />
  );
}

/** subtitleStrong 용: "동탄 185개 단지 · 국토부 매매 실거래 65,405건" */
export function MarketStatsStrong() {
  const stats = useMarketStats();
  const aptCount = stats?.apartmentCount && stats.apartmentCount > 0 ? stats.apartmentCount : null;
  return (
    <>
      동탄{' '}
      <span className="inline-block min-w-[1.75rem] tabular-nums">
        {aptCount ? aptCount.toLocaleString('ko-KR') : <StatSkeleton widthClass="w-6" />}
      </span>
      개 단지 · 국토부 매매 실거래{' '}
      <span className="inline-block min-w-[4.5rem] text-emerald-700 dark:text-emerald-400 font-extrabold tabular-nums">
        {stats ? `${stats.saleTxCount.toLocaleString('ko-KR')}건` : <StatSkeleton widthClass="w-14" />}
      </span>
    </>
  );
}

/**
 * subtitleLight 용 통합 실시간 실거래 티커 바:
 * - 당일 07:00 신규 등록분 존재 시: "| ● 오늘 신규 36건 · 신고가 15건 (11.14 07:00)"
 * - 주말/공휴일 등 과거 등록일 기준 시: "| 11월 13일 국토부 등록 반영"
 * - 마운트/로딩 전: Zero-CLS 폭 예약 스켈레톤
 */
export function MarketStatsLight({ text }: { text?: string } = {}) {
  const stats = useMarketStats();
  const registeredLabel = formatContractDate(stats?.latestRegisteredDate ?? null);
  const shortRegLabel = formatShortDotDate(stats?.latestRegisteredDate ?? null);
  const contractFallbackLabel = formatContractDate(stats?.latestContractDate ?? null);

  const todayYmdKST = getTodayYmdKST();
  const isTodayBatch = Boolean(stats?.latestRegisteredDate && stats.latestRegisteredDate === todayYmdKST);
  const todayRegisteredCount =
    isTodayBatch && typeof stats?.todayRegisteredCount === 'number' && stats.todayRegisteredCount > 0
      ? stats.todayRegisteredCount
      : 0;
  const todayNewHighCount =
    isTodayBatch && typeof stats?.todayNewHighCount === 'number' && stats.todayNewHighCount > 0
      ? stats.todayNewHighCount
      : 0;

  const trimmedText = typeof text === 'string' ? text.trim() : '';

  let statusNode: React.ReactNode = null;
  if (!stats) {
    statusNode = <StatSkeleton widthClass="w-36 sm:w-44" />;
  } else if (isTodayBatch && todayRegisteredCount > 0) {
    statusNode = (
      <span
        data-testid="market-stats-today-ticker"
        className="inline-flex flex-wrap items-center gap-1.5 tabular-nums"
      >
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span className="font-bold text-emerald-700 dark:text-emerald-400">
          오늘 신규 {todayRegisteredCount.toLocaleString('ko-KR')}건
        </span>
        {todayNewHighCount > 0 && (
          <>
            <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">
              ·
            </span>
            <span className="font-extrabold text-brand-red">
              신고가 {todayNewHighCount.toLocaleString('ko-KR')}건
            </span>
          </>
        )}
        {shortRegLabel && (
          <span className="text-tertiary font-medium text-[12px] sm:text-[13px]">
            ({shortRegLabel} 07:00)
          </span>
        )}
      </span>
    );
  } else if (isTodayBatch) {
    statusNode = (
      <span
        data-testid="market-stats-today-ticker"
        className="inline-flex items-center gap-1.5 tabular-nums"
      >
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        <span className="font-bold text-emerald-700 dark:text-emerald-400">
          오늘 07:00 실거래 갱신
        </span>
        {shortRegLabel && (
          <span className="text-tertiary font-medium text-[12px] sm:text-[13px]">
            ({shortRegLabel})
          </span>
        )}
      </span>
    );
  } else if (registeredLabel) {
    statusNode = (
      <span className="text-tertiary font-medium tabular-nums">
        {registeredLabel} 국토부 등록 반영
      </span>
    );
  } else if (contractFallbackLabel) {
    statusNode = (
      <span className="text-tertiary font-medium tabular-nums">
        {contractFallbackLabel} 거래 반영
      </span>
    );
  }

  if (!trimmedText && !statusNode) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 min-h-[20px]">
      <span
        aria-hidden="true"
        className="hidden sm:inline-block w-px h-3 bg-slate-200 dark:bg-slate-700 shrink-0"
      />
      {trimmedText ? <span className="text-secondary">{trimmedText}</span> : null}
      {trimmedText && statusNode ? (
        <span
          aria-hidden="true"
          className="inline-block w-px h-3 bg-slate-200 dark:bg-slate-700 shrink-0"
        />
      ) : null}
      {statusNode}
    </span>
  );
}
