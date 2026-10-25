'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { staticDataService } from '@/lib/services/staticDataService';
import { BUILD_VERSION } from '@/lib/build-version';

/**
 * 서브타이틀 실시간 지표 (등록 단지 수 / 국토부 매매 실거래 누적 건수 / 최신 계약일).
 * - 데이터 출처: /data/market-stats.json (sync-transactions.js 가 실제 집계값으로만 생성, 약 100B)
 * - 단지 수는 차트 드롭다운("동탄 전체 (N개 단지)")과 동일한 apartments-by-dong.json 기준입니다.
 * - 값이 없으면 숫자를 지어내지 않고 폭만 확보한 스켈레톤(Zero-CLS)을 노출합니다.
 */
export interface MarketStats {
  apartmentCount?: number;
  saleTxCount: number;
  latestContractDate: string | null;
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
  const data = mounted ? swrData : undefined;
  if (!data || !Number.isFinite(data.saleTxCount) || data.saleTxCount <= 0) return null;
  return data;
}

function formatContractDate(yyyymmdd: string | null): string | null {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return null;
  return `${Number(yyyymmdd.slice(4, 6))}월 ${Number(yyyymmdd.slice(6, 8))}일`;
}

function StatSkeleton({ widthClass }: { widthClass: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-3 ${widthClass} rounded bg-slate-200 dark:bg-slate-700 align-middle animate-pulse`}
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

/** subtitleLight 용: 구분선 + 행동 유도 문구 + (넓은 화면) 최신 거래 반영일 */
export function MarketStatsLight({ text }: { text: string }) {
  const stats = useMarketStats();
  const dateLabel = formatContractDate(stats?.latestContractDate ?? null);
  return (
    <>
      <span className="hidden sm:inline text-slate-300 dark:text-slate-600 mr-1.5">—</span>
      {text}
      <span className="hidden lg:inline-block min-w-[9.5rem] text-slate-500 dark:text-slate-400 tabular-nums">
        {dateLabel ? ` · ${dateLabel} 거래 반영` : ''}
      </span>
    </>
  );
}
