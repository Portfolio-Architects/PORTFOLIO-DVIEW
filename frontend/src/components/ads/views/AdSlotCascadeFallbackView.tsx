'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Building2 } from 'lucide-react';
import type { AdSlotFormat } from '@/components/ads/core/adSlotGeometry';
import {
  CPA_CAMPAIGN_CATALOG,
  type NativeCpaFallbackPayload,
  type CascadeSlotStatus,
  type CpaCampaignTemplate,
} from '@/lib/ads/cascadeFallback';

export interface AdSlotCascadeFallbackViewProps {
  format?: AdSlotFormat;
  cpaPayload?: NativeCpaFallbackPayload;
  payload?: NativeCpaFallbackPayload;
  cpaTemplate?: CpaCampaignTemplate;
  cascadeStatus?: CascadeSlotStatus;
  lateFillDiscarded?: boolean;
  minHeightClass: string;
  onCascadeCtaClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onCtaClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * Pure Presentational View for 1st-Party Native High-CPC Financial/Real-Estate CPA Fallback Card.
 * Enforces Zero-CLS geometry, Ad Money v5.0 soft-surface tokens (`bg-[#f9fafb] dark:bg-[#17171c] bg-elevated`), and 0 unicode emojis.
 */
export function AdSlotCascadeFallbackView({
  format,
  cpaPayload,
  payload,
  cpaTemplate: propTemplate,
  cascadeStatus = 'FALLBACK_ACTIVE',
  lateFillDiscarded = false,
  minHeightClass,
  onCascadeCtaClick,
  onCtaClick,
}: AdSlotCascadeFallbackViewProps) {
  const resolvedPayload =
    cpaPayload ||
    payload || {
      slotId: 'default-slot',
      cpaCampaignId: 'mortgage-refinance',
      title: CPA_CAMPAIGN_CATALOG['mortgage-refinance'].title,
      subtitle: CPA_CAMPAIGN_CATALOG['mortgage-refinance'].subtitle,
      ctaText: CPA_CAMPAIGN_CATALOG['mortgage-refinance'].ctaText,
      targetUrl: CPA_CAMPAIGN_CATALOG['mortgage-refinance'].targetUrl,
      estimatedCpaValueWon: CPA_CAMPAIGN_CATALOG['mortgage-refinance'].estimatedCpaValueWon,
      sourceTrigger: 'UNFILLED_ATTRIBUTE',
    };

  const cpaTemplate =
    propTemplate ||
    CPA_CAMPAIGN_CATALOG[resolvedPayload.cpaCampaignId] ||
    CPA_CAMPAIGN_CATALOG['mortgage-refinance'];

  const handleClick = onCascadeCtaClick || onCtaClick;
  const isExternalPartnerUrl =
    /^https?:\/\//i.test(resolvedPayload.targetUrl) &&
    !resolvedPayload.targetUrl.startsWith('https://dongtanview.com');

  const isCompactStrip = format === 'horizontal-strip';

  if (isCompactStrip) {
    return (
      <div
        data-testid="ad-slot-cascade-fallback"
        data-cpa-campaign-id={resolvedPayload.cpaCampaignId}
        data-source-trigger={resolvedPayload.sourceTrigger}
        data-cascade-status={cascadeStatus}
        data-estimated-cpa-won={resolvedPayload.estimatedCpaValueWon}
        data-late-fill-discarded={lateFillDiscarded ? 'true' : 'false'}
        className={`w-full h-full flex flex-row items-center justify-between gap-2 px-3 py-1.5 pl-10 pr-8 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] bg-elevated text-left z-10 tabular-nums overflow-hidden ${minHeightClass}`}
      >
        <Link
          href={resolvedPayload.targetUrl}
          prefetch={false}
          {...(isExternalPartnerUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          data-testid="ad-slot-cascade-cta"
          onClick={handleClick}
          className="group flex flex-row items-center justify-between gap-2 w-full min-w-0 hover:opacity-95 transition-opacity"
        >
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <h4 className="text-xs font-black text-slate-900 dark:text-slate-50 group-hover:underline transition-colors truncate">
              {resolvedPayload.title}
            </h4>
            <p className="hidden sm:block text-[11px] text-slate-600 dark:text-slate-400 truncate">
              {resolvedPayload.subtitle}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold transition-colors shrink-0 whitespace-nowrap">
            <span>{resolvedPayload.ctaText}</span>
            <ArrowRight size={12} />
          </span>
        </Link>
      </div>
    );
  }

  return (
    <div
      data-testid="ad-slot-cascade-fallback"
      data-cpa-campaign-id={resolvedPayload.cpaCampaignId}
      data-source-trigger={resolvedPayload.sourceTrigger}
      data-cascade-status={cascadeStatus}
      data-estimated-cpa-won={resolvedPayload.estimatedCpaValueWon}
      data-late-fill-discarded={lateFillDiscarded ? 'true' : 'false'}
      className={`w-full h-full flex flex-col items-center justify-center p-5 rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] bg-elevated text-center z-10 tabular-nums ${minHeightClass}`}
    >
      <Link
        href={resolvedPayload.targetUrl}
        prefetch={false}
        {...(isExternalPartnerUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        data-testid="ad-slot-cascade-cta"
        onClick={handleClick}
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
          <span>{resolvedPayload.title}</span>
          <ArrowRight size={14} />
        </h4>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          {resolvedPayload.subtitle}
        </p>
        <span className="mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-[11px] font-bold transition-colors">
          <span>{resolvedPayload.ctaText}</span>
          <ArrowRight size={14} />
        </span>
      </Link>
    </div>
  );
}

export default AdSlotCascadeFallbackView;
