'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Building2,
  TrendingUp,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import type { GuideAptMiniPreviewItem } from '@/lib/data/guides';
import { trackEvent, trackVirtualPageView } from '@/lib/utils/analytics';
import { sendTelemetry } from '@/lib/ads/cascadeFallback';

export interface GuideAptPreviewCardProps {
  item: GuideAptMiniPreviewItem;
  guideSlug: string;
  placement: 'article_top' | 'zone_section' | 'article_bottom';
  sectionTitle?: string;
}

export function recordGuideAptPreviewClick(params: {
  item: GuideAptMiniPreviewItem;
  guideSlug: string;
  placement: 'article_top' | 'zone_section' | 'article_bottom';
  sectionTitle?: string;
  suppressVirtualPageView?: boolean;
}): void {
  const { item, guideSlug, placement, sectionTitle, suppressVirtualPageView } = params;
  const pageTitle = `${item.displayName} 실거래가·전세가율 상세 리포트 | D-VIEW`;

  if (!suppressVirtualPageView) {
    trackVirtualPageView(item.href, {
      page_title: pageTitle,
      guide_slug: guideSlug,
      placement,
      apartment_name: item.canonicalSlug,
      dong: item.dong,
    });
  }

  trackEvent('guide_apt_preview_click', {
    guide_slug: guideSlug,
    placement,
    section_title: sectionTitle || placement,
    apartment_name: item.canonicalSlug,
    display_name: item.displayName,
    dong: item.dong,
    target_path: item.href,
  });

  sendTelemetry({
    eventType: 'CLICK',
    slotId: `guide_${guideSlug}_${placement}_${item.canonicalSlug}`,
    placementSlotId: `guide_${placement}`,
    apartmentName: item.canonicalSlug,
    dong: item.dong,
    timestamp: new Date().toISOString(),
  });
}

export default function GuideAptPreviewCard({
  item,
  guideSlug,
  placement,
  sectionTitle,
}: GuideAptPreviewCardProps) {
  const handleCardClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const isModifiedClick =
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      (typeof e.button === 'number' && e.button !== 0);
    recordGuideAptPreviewClick({
      item,
      guideSlug,
      placement,
      sectionTitle,
      suppressVirtualPageView: isModifiedClick,
    });
  };

  const hasSubKey = item.displayName !== item.name;
  const latestSpecParts: string[] = [];
  if (item.latestArea > 0) {
    latestSpecParts.push(`전용 ${item.latestArea}㎡`);
  }
  if (item.latestFloor > 0) {
    latestSpecParts.push(`${item.latestFloor}층`);
  }
  const latestSpecText = latestSpecParts.join(' · ');

  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={handleCardClick}
      data-testid={`guide-apt-preview-card-${placement}`}
      data-apt-slug={item.canonicalSlug}
      data-apt-dong={item.dong}
      aria-label={`${item.displayName} 실시간 실거래가 미니 프리뷰 및 단지 상세 이동`}
      className="group relative flex flex-col justify-between min-h-[158px] sm:min-h-[168px] rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/90 hover:bg-slate-100/80 dark:bg-slate-900/80 dark:hover:bg-slate-800/80 hover:border-emerald-500/40 p-4 transition-all duration-200 shadow-2xs hover:shadow-sm no-underline"
    >
      <div className="space-y-3">
        {/* Top Metadata Row: Dong/Zone Badge & Live Indicator */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-lg">
            <Building2 size={12} className="shrink-0" />
            <span>
              {item.dong} · {item.zoneName}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/50 px-2 py-0.5 rounded-md shrink-0">
            <TrendingUp size={11} className="shrink-0" />
            <span>실거래 프리뷰</span>
          </span>
        </div>

        {/* Complex Display Name + Official Key */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[15px] sm:text-base font-black text-slate-900 dark:text-slate-50 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug break-keep">
              <span>{item.displayName}</span>
              {hasSubKey && (
                <span className="ml-1.5 text-[11.5px] font-semibold text-slate-500 dark:text-slate-400">
                  ({item.name})
                </span>
              )}
            </div>
          </div>

          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:border-emerald-500/40 transition-colors shrink-0">
            <ArrowUpRight size={14} />
          </span>
        </div>

        {/* Real Transaction Metrics Grid */}
        <dl className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-slate-200/70 dark:border-slate-800/80 text-xs">
          <div className="rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800/70 px-3 py-2">
            <dt className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
              최근 매매 실거래
            </dt>
            <dd className="mt-0.5 text-[14px] sm:text-[15px] font-black tabular-nums text-emerald-700 dark:text-emerald-400">
              {item.latestPriceStr}
            </dd>
          </div>

          <div className="rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200/60 dark:border-slate-800/70 px-3 py-2">
            <dt className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
              최근 전세 실거래
            </dt>
            <dd className="mt-0.5 text-[14px] sm:text-[15px] font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
              {item.latestRentStr}
            </dd>
          </div>

          <div className="px-1">
            <dt className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
              <ShieldCheck size={11} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>전세가율 · 실거주 PER</span>
            </dt>
            <dd className="mt-0.5 text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-200">
              {item.jeonseRatio > 0 ? (
                <span>
                  {item.jeonseRatio}%
                  {item.perValue ? ` (PER ${item.perValue})` : ''}
                </span>
              ) : (
                '정보 없음'
              )}
            </dd>
          </div>

          <div className="px-1">
            <dt className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              누적 실거래량
            </dt>
            <dd className="mt-0.5 text-xs font-extrabold tabular-nums text-slate-800 dark:text-slate-200">
              {item.txCount > 0 ? `${item.txCount.toLocaleString()}건` : '정보 없음'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Footer Meta Bar: Latest Contract Date + Area/Floor + Deep-Link CTA */}
      <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/70 flex items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-semibold tabular-nums truncate">
          <Calendar size={11} className="shrink-0" />
          <span>계약 {item.latestDate}</span>
          {latestSpecText && <span>· {latestSpecText}</span>}
        </span>

        <span className="inline-flex items-center gap-0.5 font-extrabold text-emerald-700 dark:text-emerald-400 group-hover:underline shrink-0">
          <span>단지 상세 리포트</span>
          <ArrowUpRight size={12} />
        </span>
      </div>
    </Link>
  );
}
