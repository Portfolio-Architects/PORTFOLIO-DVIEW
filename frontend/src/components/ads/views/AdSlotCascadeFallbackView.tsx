'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Building2 } from 'lucide-react';
import {
  CPA_CAMPAIGN_CATALOG,
  type NativeCpaFallbackPayload,
  type CascadeSlotStatus,
  type CpaCampaignTemplate,
} from '@/lib/ads/cascadeFallback';

export interface AdSlotCascadeFallbackViewProps {
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
        <span
          className={
            cpaTemplate.accentTone === 'emerald'
              ? 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold'
              : 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 text-[11px] font-bold'
          }
        >
          {cpaTemplate.accentTone === 'emerald' ? (
            <ShieldCheck size={14} />
          ) : (
            <Building2 size={14} />
          )}
          <span>{cpaTemplate.badgeText}</span>
        </span>
        <h4
          className={
            cpaTemplate.accentTone === 'emerald'
              ? 'text-xs sm:text-sm font-black text-slate-900 dark:text-slate-50 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors inline-flex items-center gap-1'
              : 'text-xs sm:text-sm font-black text-slate-900 dark:text-slate-50 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors inline-flex items-center gap-1'
          }
        >
          <span>{resolvedPayload.title}</span>
          <ArrowRight size={14} />
        </h4>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">
          {resolvedPayload.subtitle}
        </p>
        <span
          className={
            cpaTemplate.accentTone === 'emerald'
              ? 'mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-slate-50 text-[11px] font-bold transition-colors'
              : 'mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-slate-50 text-[11px] font-bold transition-colors'
          }
        >
          <span>{resolvedPayload.ctaText}</span>
          <ArrowRight size={14} />
        </span>
      </Link>
    </div>
  );
}

export default AdSlotCascadeFallbackView;
