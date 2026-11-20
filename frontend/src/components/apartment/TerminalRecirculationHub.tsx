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
      aria-label="비슷한 단지 더 보기"
      className="mt-4 min-h-[320px] sm:min-h-[340px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-5 sm:p-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1.5 pb-4 border-b border-[#f2f4f6] dark:border-[#202027]">
        <h4 className="text-[16px] sm:text-[18px] font-extrabold text-primary tracking-tight">
          비슷한 단지 더 보기
        </h4>
        <p className="text-[12px] font-medium text-tertiary tabular-nums">
          기준: <span className="font-semibold text-secondary">{validated.currentAptName}</span> ({validated.currentDong})
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
              className="group flex flex-col justify-between rounded-xl bg-surface dark:bg-[#202027] p-4 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <span className="text-[11px] font-semibold text-tertiary">
                    {meta.label}
                  </span>
                </div>

                <button
                  type="button"
                  data-testid={`recirc-select-apt-${idx}`}
                  onClick={() => validated.onSelectApartment(target.aptName)}
                  className="w-full text-left border-none bg-transparent p-0 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[14px] font-bold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                      {target.aptName}
                    </span>
                    <ArrowUpRight
                      size={14}
                      className="shrink-0 text-tertiary group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[11px] font-medium text-tertiary">
                    <MapPin size={11} className="shrink-0" />
                    <span>{target.dong}</span>
                  </div>
                </button>
              </div>

              <div className="mt-3 pt-2.5 border-t border-[#f2f4f6] dark:border-[#2c2c35] flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-tertiary font-medium block">최근 실거래</span>
                  <span className="text-[13.5px] font-extrabold text-primary tabular-nums">
                    {formatPriceWonDisplay(target.latestPriceWon)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-tertiary font-medium block">전세가율</span>
                  <span className="text-[12.5px] font-bold text-secondary tabular-nums">
                    {jeonsePct.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  data-testid={`recirc-card-explore-${idx}`}
                  onClick={() => validated.onSelectApartment(target.aptName)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#f2f4f6] hover:bg-[#e5e8eb] dark:bg-[#2c2c35] dark:hover:bg-slate-700 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary border-none cursor-pointer transition-colors"
                >
                  <Building2 size={12} />
                  <span>상세 보기</span>
                </button>
                <button
                  type="button"
                  data-testid={`recirc-card-compare-${idx}`}
                  onClick={() => validated.onOpenCompare(validated.currentAptName, target.aptName)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#f9fafb] hover:bg-[#f2f4f6] dark:bg-[#17171c] dark:hover:bg-[#2c2c35] px-2.5 py-1.5 text-[11.5px] font-semibold text-secondary hover:text-primary border-none cursor-pointer transition-colors"
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
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          data-testid="recirc-compare-launcher"
          onClick={() =>
            validated.onOpenCompare(
              validated.currentAptName,
              primaryTarget ? primaryTarget.aptName : ''
            )
          }
          className="flex items-center justify-between rounded-xl bg-surface hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] px-4 py-3 text-left transition-colors border-none cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f6] dark:bg-[#2c2c35] text-secondary">
              <ArrowRightLeft size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-primary truncate">
                단지 1:1 비교
              </div>
              <div className="text-[11px] font-medium text-tertiary truncate">
                {validated.currentAptName} vs {primaryTarget?.aptName}
              </div>
            </div>
          </div>
          <ArrowUpRight size={15} className="shrink-0 text-tertiary ml-2" />
        </button>

        <button
          type="button"
          data-testid="recirc-mortgage-launcher"
          onClick={() =>
            validated.onOpenMortgage(validated.currentAptName, validated.currentPriceWon)
          }
          className="flex items-center justify-between rounded-xl bg-surface hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] px-4 py-3 text-left transition-colors border-none cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f2f4f6] dark:bg-[#2c2c35] text-secondary">
              <Calculator size={15} />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-primary truncate">
                이 단지 대출·취득세 계산
              </div>
              <div className="text-[11px] font-medium text-tertiary truncate tabular-nums">
                기준가 {formatPriceWonDisplay(validated.currentPriceWon)}
              </div>
            </div>
          </div>
          <ArrowUpRight size={15} className="shrink-0 text-tertiary ml-2" />
        </button>
      </div>

      {/* Node 4: Related 1:1 Comparison Guide Deep-Read Links */}
      {relatedGuides.length > 0 && (
        <div
          data-testid="recirc-related-guides"
          className="mt-4 pt-4 border-t border-[#f2f4f6] dark:border-[#202027] space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <h5 className="text-[12.5px] font-bold text-secondary flex items-center gap-1.5">
              <BookOpen size={14} className="text-tertiary shrink-0" />
              <span>
                {hasDirectGuideMatch
                  ? `${validated.currentAptName} 비교 리포트`
                  : `${matchedZone?.name || validated.currentDong} 권역 비교 리포트`}
              </span>
            </h5>
            <Link
              href="/guide"
              prefetch={false}
              className="text-[11.5px] font-semibold text-tertiary hover:text-primary inline-flex items-center gap-0.5 shrink-0"
            >
              <span>전체 보기</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {relatedGuides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/guide/${guide.slug}`}
                prefetch={false}
                className="group flex items-center justify-between gap-2 rounded-xl bg-surface hover:bg-[#f2f4f6] dark:bg-[#202027] dark:hover:bg-[#2c2c35] px-3.5 py-2.5 transition-colors"
              >
                <div className="min-w-0">
                  <span className="text-[10.5px] font-semibold text-tertiary block">
                    {guide.category}
                  </span>
                  <span className="text-[12px] font-bold text-primary group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate block transition-colors">
                    {guide.title}
                  </span>
                </div>
                <ArrowUpRight
                  size={14}
                  className="shrink-0 text-tertiary group-hover:text-primary transition-colors"
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
