'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Building2 } from 'lucide-react';
import type { AdSlotFormat } from '@/components/ads/core/adSlotGeometry';
import {
  type NativeCpaFallbackPayload,
  type CpaCampaignTemplate,
  CPA_CAMPAIGN_CATALOG,
} from '@/lib/ads/cascadeFallback';

export interface AdSlotAdBlockViewProps {
  format?: AdSlotFormat;
  fallbackType?: 'mbti-promo' | 'dashboard-promo' | 'minimal' | 'cpa';
  cpaPayload: NativeCpaFallbackPayload;
  cpaTemplate?: CpaCampaignTemplate;
  minHeightClass: string;
  onAdBlockFallbackClick: (e?: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function AdSlotAdBlockView({
  format,
  fallbackType,
  cpaPayload,
  cpaTemplate: propTemplate,
  minHeightClass,
  onAdBlockFallbackClick,
}: AdSlotAdBlockViewProps) {
  const cpaTemplate =
    propTemplate ||
    CPA_CAMPAIGN_CATALOG[cpaPayload.cpaCampaignId] ||
    CPA_CAMPAIGN_CATALOG['jeonse-sentinel'];

  if (format === 'horizontal-strip') {
    return (
      <div
        data-testid="ad-slot-adblock-fallback"
        data-cpa-campaign-id={cpaPayload.cpaCampaignId}
        data-source-trigger="ADBLOCK_ACTIVE"
        data-estimated-cpa-won={cpaPayload.estimatedCpaValueWon}
        className={`w-full h-full flex flex-row items-center justify-between gap-2 px-3 py-1.5 pl-10 pr-8 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] bg-elevated text-left z-10 tabular-nums overflow-hidden ${minHeightClass}`}
      >
        {fallbackType === 'minimal' ? (
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs truncate min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            <span className="truncate">D-VIEW 스폰서십 | 쾌적한 주거 데이터 분석 경험을 제공합니다.</span>
          </div>
        ) : (
          <Link
            href={cpaPayload.targetUrl}
            prefetch={false}
            data-testid="ad-slot-adblock-cta"
            onClick={onAdBlockFallbackClick}
            className="group flex flex-row items-center justify-between gap-2 w-full min-w-0 hover:opacity-95 transition-opacity"
          >
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <h4 className="text-xs font-black text-slate-900 dark:text-slate-50 group-hover:underline transition-colors truncate">
                {cpaPayload.title}
              </h4>
              <p className="hidden sm:block text-[11px] text-slate-600 dark:text-slate-400 truncate">
                {cpaPayload.subtitle}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold transition-colors shrink-0 whitespace-nowrap">
              <span>{cpaPayload.ctaText}</span>
              <ArrowRight size={12} />
            </span>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div
      data-testid="ad-slot-adblock-fallback"
      data-cpa-campaign-id={cpaPayload.cpaCampaignId}
      data-source-trigger="ADBLOCK_ACTIVE"
      data-estimated-cpa-won={cpaPayload.estimatedCpaValueWon}
      className={`w-full h-full flex flex-col items-center justify-center p-5 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] bg-elevated text-center z-10 tabular-nums ${minHeightClass}`}
    >
      {fallbackType === 'minimal' ? (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>D-VIEW 스폰서십 | 쾌적한 주거 데이터 분석 경험을 제공합니다.</span>
        </div>
      ) : (
        <Link
          href={cpaPayload.targetUrl}
          prefetch={false}
          data-testid="ad-slot-adblock-cta"
          onClick={onAdBlockFallbackClick}
          className="group flex flex-col items-center justify-center gap-1.5 max-w-lg w-full hover:opacity-95 transition-opacity"
        >
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#eff1f5] dark:bg-[#1e2532] border border-border/60 text-primary text-[11px] font-bold">
            {cpaTemplate.accentTone === 'emerald' ? (
              <ShieldCheck size={14} />
            ) : (
              <Building2 size={14} />
            )}
            <span>{cpaTemplate.badgeText}</span>
          </span>
          <h4 className="text-xs sm:text-sm font-black text-slate-900 dark:text-slate-50 group-hover:underline transition-colors inline-flex items-center gap-1">
            <span>{cpaPayload.title}</span>
            <ArrowRight size={14} />
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            {cpaPayload.subtitle}
          </p>
          <span className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold transition-colors">
            <span>{cpaPayload.ctaText}</span>
            <ArrowRight size={14} />
          </span>
        </Link>
      )}
    </div>
  );
}

export default AdSlotAdBlockView;
