'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Building2,
  ArrowUpRight,
  ArrowRightLeft,
  BookOpen,
  Calculator,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { getRelatedGuidesForApartment } from '@/lib/data/guides';
import {
  RecirculationTargetAptSchema,
  TerminalRecirculationHubPropsSchema,
  selectRecirculationTargets,
  type RecirculationTargetApt,
  type TerminalRecirculationHubProps,
} from '@/lib/ads/recirculationEngine';

export {
  RecirculationTargetAptSchema,
  TerminalRecirculationHubPropsSchema,
  type RecirculationTargetApt,
  type TerminalRecirculationHubProps,
};

const CLUSTER_TAG_META: Record<
  RecirculationTargetApt['clusterTag'],
  { label: string; badgeClass: string }
> = {
  SAME_DONG: {
    label: '동일 법정동 권역',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  SAME_PRICE_BAND: {
    label: '유사 실거래 가격대',
    badgeClass: 'bg-blue-50 text-blue-600 border-blue-200',
  },
  TOP_VOLUME: {
    label: '거래량 상위 단지',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

function formatPriceWonDisplay(priceWon: number): string {
  if (!Number.isFinite(priceWon) || priceWon <= 0) {
    return '실거래 집계중';
  }
  const eok = priceWon / 100_000_000;
  if (eok >= 1) {
    const rounded = Math.round(eok * 10) / 10;
    return `${rounded.toLocaleString('ko-KR')}억 원`;
  }
  const man = Math.round(priceWon / 10_000);
  return `${man.toLocaleString('ko-KR')}만 원`;
}

/**
 * Chapter 08 Terminal 3-Way Recirculation Hub.
 * Complexity: Time O(1) render (3 fixed targets), Space O(1).
 * Pre-reserves bounding box (min-h-[320px] sm:min-h-[340px]) for Zero-CLS (CLS < 0.001).
 */
export function TerminalRecirculationHub(props: TerminalRecirculationHubProps) {
  const validated = useMemo(() => {
    const parsed = TerminalRecirculationHubPropsSchema.safeParse(props);
    if (parsed.success) {
      return parsed.data;
    }
    const fallbackTargets = selectRecirculationTargets({
      currentAptName: props.currentAptName || '동탄역 롯데캐슬',
      currentDong: props.currentDong || '오산동',
      currentPriceWon: Number.isFinite(props.currentPriceWon) ? props.currentPriceWon : 0,
    });
    return {
      currentAptName: props.currentAptName || '동탄역 롯데캐슬',
      currentDong: props.currentDong || '오산동',
      currentPriceWon: Number.isFinite(props.currentPriceWon) ? Math.max(0, props.currentPriceWon) : 0,
      targets: fallbackTargets,
      onSelectApartment: props.onSelectApartment,
      onOpenCompare: props.onOpenCompare,
      onOpenMortgage: props.onOpenMortgage,
    };
  }, [props]);

  const primaryTarget = validated.targets[0];
  const {
    relatedGuides,
    hasDirectMatch: hasDirectGuideMatch,
    zone: matchedZone,
  } = useMemo(
    () =>
      getRelatedGuidesForApartment({
        aptName: validated.currentAptName,
        dong: validated.currentDong,
        minPadCount: 2,
        maxTotal: 2,
      }),
    [validated.currentAptName, validated.currentDong]
  );

  return (
    <section
      id="chapter-08-recirculation-hub"
      data-testid="terminal-recirculation-hub"
      aria-label="연관 단지 탐색 및 금융 시뮬레이션 허브"
      className="mt-6 min-h-[320px] sm:min-h-[340px] rounded-2xl border border-slate-200 bg-slate-50/90 p-5 sm:p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold tracking-wider uppercase mb-1.5">
            <TrendingUp size={12} className="text-emerald-400" />
            <span>RECIRCULATION HUB</span>
          </div>
          <h4 className="text-[16px] sm:text-[18px] font-extrabold text-slate-900 tracking-tight">
            동일 권역·유사 가격대 연관 단지 연속 탐색
          </h4>
        </div>
        <p className="text-[12px] font-medium text-slate-600 tabular-nums">
          기준 단지: <span className="font-bold text-slate-900">{validated.currentAptName}</span> ({validated.currentDong})
        </p>
      </div>

      {/* Node 1: 3 Similar Complex Quick-Link Cards */}
      <div
        data-testid="recirc-similar-grid"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4"
      >
        {validated.targets.map((target, idx) => {
          const meta = CLUSTER_TAG_META[target.clusterTag];
          const jeonsePct =
            target.jeonseRatioPercent !== undefined
              ? target.jeonseRatioPercent
              : Math.round(target.jeonseRatio * 1000) / 10;

          return (
            <div
              key={`${target.aptName}-${idx}`}
              data-testid={`recirc-target-card-${idx}`}
              data-cluster-tag={target.clusterTag}
              className="group flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 transition-all hover:border-slate-300 hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badgeClass}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 tabular-nums">
                    유사도 {Math.round(target.similarityScore * 100)}%
                  </span>
                </div>

                <button
                  type="button"
                  data-testid={`recirc-select-apt-${idx}`}
                  onClick={() => validated.onSelectApartment(target.aptName)}
                  className="w-full text-left group-hover:text-emerald-600 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[14px] font-extrabold text-slate-900 group-hover:text-emerald-600 truncate">
                      {target.aptName}
                    </span>
                    <ArrowUpRight
                      size={15}
                      className="shrink-0 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-slate-500">
                    <MapPin size={11} className="text-slate-400 shrink-0" />
                    <span>{target.dong}</span>
                  </div>
                </button>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-slate-400 font-medium block">최근 실거래</span>
                  <span className="text-[13px] font-extrabold text-slate-900 tabular-nums">
                    {formatPriceWonDisplay(target.latestPriceWon)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 font-medium block">전세가율</span>
                  <span className="text-[12px] font-bold text-slate-700 tabular-nums">
                    {jeonsePct.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  data-testid={`recirc-card-explore-${idx}`}
                  onClick={() => validated.onSelectApartment(target.aptName)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 transition-colors"
                >
                  <Building2 size={12} />
                  <span>상세 리포트</span>
                </button>
                <button
                  type="button"
                  data-testid={`recirc-card-compare-${idx}`}
                  onClick={() => validated.onOpenCompare(validated.currentAptName, target.aptName)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <ArrowRightLeft size={12} />
                  <span>1:1 비교</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Node 2 & Node 3: 1:1 Compare Prefill Launcher & Mortgage/Tax Calculator Launcher */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          data-testid="recirc-compare-launcher"
          onClick={() =>
            validated.onOpenCompare(
              validated.currentAptName,
              primaryTarget ? primaryTarget.aptName : ''
            )
          }
          className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-left transition-colors hover:bg-emerald-50"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <ArrowRightLeft size={17} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-slate-900 truncate">
                1:1 단지 비교 대시보드 즉시 실행
              </div>
              <div className="text-[11px] font-medium text-slate-600 truncate">
                {validated.currentAptName} vs {primaryTarget?.aptName} 실거래·인프라 비교
              </div>
            </div>
          </div>
          <ArrowUpRight size={16} className="shrink-0 text-emerald-700 ml-2" />
        </button>

        <button
          type="button"
          data-testid="recirc-mortgage-launcher"
          onClick={() =>
            validated.onOpenMortgage(validated.currentAptName, validated.currentPriceWon)
          }
          className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-left transition-colors hover:bg-blue-50"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Calculator size={17} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-extrabold text-slate-900 truncate">
                실거래 연동 주담대·취득세 계산기
              </div>
              <div className="text-[11px] font-medium text-slate-600 truncate tabular-nums">
                기준가 {formatPriceWonDisplay(validated.currentPriceWon)} 기반 DSR·원리금 시뮬레이션
              </div>
            </div>
          </div>
          <ArrowUpRight size={16} className="shrink-0 text-blue-600 ml-2" />
        </button>
      </div>

      {/* Node 4: Related 1:1 Comparison Guide Deep-Read Links */}
      {relatedGuides.length > 0 && (
        <div
          data-testid="recirc-related-guides"
          className="mt-4 pt-3.5 border-t border-slate-200/80 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-[12px] font-extrabold text-slate-900 flex items-center gap-1.5">
              <BookOpen size={14} className="text-blue-600 shrink-0" />
              <span>
                {hasDirectGuideMatch
                  ? `${validated.currentAptName} 포함 1:1 실거래 비교 가이드`
                  : `${matchedZone?.name || validated.currentDong} 권역 실거래 비교 가이드`}
              </span>
            </h5>
            <Link
              href="/guide"
              prefetch={false}
              className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-0.5 shrink-0"
            >
              <span>전체 가이드</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {relatedGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guide/${guide.slug}`}
                prefetch={false}
                className="group flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 transition-colors hover:border-emerald-300"
              >
                <div className="min-w-0">
                  <span className="text-[10px] font-extrabold text-emerald-700 block">
                    {guide.category}
                  </span>
                  <span className="text-[12px] font-extrabold text-slate-900 group-hover:text-emerald-700 truncate block transition-colors">
                    {guide.title}
                  </span>
                </div>
                <ArrowUpRight
                  size={15}
                  className="shrink-0 text-slate-400 group-hover:text-emerald-600 transition-colors"
                />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

export default TerminalRecirculationHub;
