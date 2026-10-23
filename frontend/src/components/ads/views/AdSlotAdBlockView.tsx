'use client';

import React from 'react';
import { ArrowRight, ShieldCheck, Building2 } from 'lucide-react';
import {
  type NativeCpaFallbackPayload,
  type CpaCampaignTemplate,
  CPA_CAMPAIGN_CATALOG,
} from '@/lib/ads/cascadeFallback';

export interface AdSlotAdBlockViewProps {
  fallbackType?: 'mbti-promo' | 'dashboard-promo' | 'minimal' | 'cpa';
  cpaPayload: NativeCpaFallbackPayload;
  cpaTemplate?: CpaCampaignTemplate;
  minHeightClass: string;
  onAdBlockFallbackClick: (e?: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function AdSlotAdBlockView({
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

  return (
    <div
      data-testid="ad-slot-adblock-fallback"
      data-cpa-campaign-id={cpaPayload.cpaCampaignId}
      data-source-trigger="ADBLOCK_ACTIVE"
      data-estimated-cpa-won={cpaPayload.estimatedCpaValueWon}
      className={`w-full h-full flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-center z-10 ${minHeightClass}`}
    >
      {fallbackType === 'minimal' ? (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>D-VIEW 스폰서십 | 쾌적한 주거 데이터 분석 경험을 제공합니다.</span>
        </div>
      ) : (
        <a
          href={cpaPayload.targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="ad-slot-adblock-cta"
          onClick={onAdBlockFallbackClick}
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
            <span>{cpaPayload.title}</span>
            <ArrowRight size={14} />
          </h4>
          <p className="text-[11px] text-slate-600 dark:text-slate-400">
            {cpaPayload.subtitle}
          </p>
          <span
            className={
              cpaTemplate.accentTone === 'emerald'
                ? 'mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-slate-50 text-[11px] font-bold transition-colors'
                : 'mt-1 inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-slate-50 text-[11px] font-bold transition-colors'
            }
          >
            <span>{cpaPayload.ctaText}</span>
            <ArrowRight size={14} />
          </span>
        </a>
      )}
    </div>
  );
}

export default AdSlotAdBlockView;
