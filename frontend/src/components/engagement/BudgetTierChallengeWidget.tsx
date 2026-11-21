'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Wallet, TrendingUp, ArrowRight, Share2, Check, Compass } from 'lucide-react';
import {
  evaluateDongtanBudgetTier,
  type BudgetTierComplexItem,
} from '@/lib/finance/budgetTierEngine';
import { formatPriceEok } from '@/lib/utils/analyticsUtils';
import { getVisualSignalPillClass } from '@/lib/design-system/copyDiet';
import { trackEvent } from '@/lib/utils/analytics';

export interface BudgetTierChallengeWidgetProps {
  catalog: BudgetTierComplexItem[];
  surface: string;
  variant?: 'full' | 'compact';
  className?: string;
}

const PRESETS = [
  { label: '신혼 1.5억 / 8천', cash: 15000, income: 8000, firstHome: true },
  { label: '실수요 3억 / 1억', cash: 30000, income: 10000, firstHome: false },
  { label: '갈아타기 5억 / 1.4억', cash: 50000, income: 14000, firstHome: false },
] as const;

export default function BudgetTierChallengeWidget({
  catalog,
  surface,
  variant = 'full',
  className = '',
}: BudgetTierChallengeWidgetProps) {
  const [cashManwon, setCashManwon] = useState(30000);
  const [annualIncomeManwon, setAnnualIncomeManwon] = useState(10000);
  const [isFirstHome, setIsFirstHome] = useState(true);
  const [copied, setCopied] = useState(false);

  const diagnosis = useMemo(
    () =>
      evaluateDongtanBudgetTier(
        { cashManwon, annualIncomeManwon, isFirstHome },
        catalog
      ),
    [cashManwon, annualIncomeManwon, isFirstHome, catalog]
  );

  const handleApplyPreset = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      setCashManwon(preset.cash);
      setAnnualIncomeManwon(preset.income);
      setIsFirstHome(preset.firstHome);
      trackEvent('budget_tier_preset_click', {
        surface,
        preset_label: preset.label,
      });
    },
    [surface]
  );

  const handleCopyResult = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const topNames = diagnosis.topAffordableComplexes
      .slice(0, 3)
      .map((c) => `${c.displayName}(${c.latestPriceStr})`)
      .join(', ');
    const shareText = [
      `[D-VIEW 내 현금·연봉 동탄 현실 티어 진단]`,
      `현금 ${formatPriceEok(cashManwon)} + 합산연봉 ${formatPriceEok(annualIncomeManwon)} -> ${diagnosis.tierName}`,
      `현실 최대 매수 예산: ${diagnosis.maxBudgetStr} (동탄 ${diagnosis.totalVerifiedCount}단지 중 ${diagnosis.affordableCount}곳 사정권)`,
      topNames ? `대표 진입 가능 단지: ${topNames}` : '',
      diagnosis.nextUnlockTarget
        ? `다음 목표: ${diagnosis.nextUnlockTarget.gapStr} 더 확보하면 ${diagnosis.nextUnlockTarget.complex.displayName} 진입`
        : '',
      'https://dongtanview.com/guide/dongtan-budget-tier-ranking',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      trackEvent('budget_tier_share', {
        surface,
        tier_code: diagnosis.tierCode,
      });
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore clipboard denial
    }
  }, [annualIncomeManwon, cashManwon, diagnosis, surface]);

  const isCompact = variant === 'compact';

  return (
    <section
      data-testid="budget-tier-challenge-widget"
      aria-label="내 현금·연봉으로 동탄 어디까지 현실 티어 진단"
      className={`rounded-2xl bg-[#f7f8fa] dark:bg-[#151a23] ${isCompact ? 'p-4' : 'p-4 sm:p-5'} space-y-3.5 tabular-nums ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-[#eff1f5] dark:bg-[#1e2532] text-primary shrink-0">
            <Wallet size={15} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-[15px] font-black text-primary tracking-tight truncate">
              내 현금·연봉으로 동탄 어디까지?
            </h3>
            <span className="text-[11px] font-bold text-tertiary block truncate">
              스트레스 DSR 40% · 국토부 검증 {diagnosis.totalVerifiedCount}개 실거래 단지 기준
            </span>
          </div>
        </div>

        <label className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-secondary cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isFirstHome}
            onChange={(e) => setIsFirstHome(e.target.checked)}
            className="rounded border-slate-300 dark:border-slate-700 accent-slate-900 dark:accent-white"
          />
          <span>생애최초 (LTV 80%)</span>
        </label>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map((preset) => {
          const isSelected =
            cashManwon === preset.cash &&
            annualIncomeManwon === preset.income &&
            isFirstHome === preset.firstHome;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyPreset(preset)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-body hover:bg-[#eff1f5] dark:bg-[#0e1117] dark:hover:bg-[#1e2532] text-secondary'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Two Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-body dark:bg-[#0e1117] p-3 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={`tier-cash-${surface}`} className="text-[11.5px] font-bold text-secondary">
              보유 현금 (자기자본)
            </label>
            <span className="text-sm font-black text-primary tabular-nums">
              {formatPriceEok(cashManwon)}
            </span>
          </div>
          <input
            id={`tier-cash-${surface}`}
            data-testid="budget-tier-cash-slider"
            type="range"
            min={5000}
            max={100000}
            step={1000}
            value={cashManwon}
            onChange={(e) => setCashManwon(Number(e.target.value))}
            className="dview-range-slider w-full accent-slate-900 dark:accent-white cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-semibold text-tertiary tabular-nums">
            <span>5,000만</span>
            <span>5억</span>
            <span>10억</span>
          </div>
        </div>

        <div className="rounded-xl bg-body dark:bg-[#0e1117] p-3 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor={`tier-income-${surface}`} className="text-[11.5px] font-bold text-secondary">
              부부 합산 연봉 (세전)
            </label>
            <span className="text-sm font-black text-primary tabular-nums">
              {formatPriceEok(annualIncomeManwon)}
            </span>
          </div>
          <input
            id={`tier-income-${surface}`}
            data-testid="budget-tier-income-slider"
            type="range"
            min={4000}
            max={25000}
            step={500}
            value={annualIncomeManwon}
            onChange={(e) => setAnnualIncomeManwon(Number(e.target.value))}
            className="dview-range-slider w-full accent-slate-900 dark:accent-white cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-semibold text-tertiary tabular-nums">
            <span>4,000만</span>
            <span>1.4억</span>
            <span>2.5억</span>
          </div>
        </div>
      </div>

      {/* Live Tier Diagnosis Output */}
      <div className="rounded-xl bg-body dark:bg-[#0e1117] p-3.5 space-y-3" data-testid="budget-tier-result">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={getVisualSignalPillClass(diagnosis.tierCode === 'S' ? 'jackpot' : diagnosis.tierCode === 'A' ? 'up' : 'neutral')}>
                {diagnosis.tierCode === 'STARTER' ? '준비 단계' : `${diagnosis.tierCode}티어`}
              </span>
              <span className="text-[12.5px] font-black text-primary break-keep">
                {diagnosis.tierName.includes(' · ') ? diagnosis.tierName.split(' · ')[1] : diagnosis.tierName}
              </span>
            </div>
            <p className="text-[12px] text-secondary leading-snug break-keep">
              {diagnosis.tierSummary}
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[11px] font-bold text-tertiary">현실 최대 매수 예산</div>
            <div className="text-lg sm:text-xl font-black text-primary tabular-nums">
              {diagnosis.maxBudgetStr}
            </div>
            <div className="text-[10.5px] font-semibold text-tertiary tabular-nums">
              대출 가능 {formatPriceEok(diagnosis.effectiveLoanManwon)}
            </div>
          </div>
        </div>

        {/* Coverage Gauge */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11.5px] font-bold">
            <span className="text-primary">
              동탄 {diagnosis.totalVerifiedCount}개 검증 단지 중{' '}
              <strong className="text-primary tabular-nums">
                {diagnosis.affordableCount}곳 ({diagnosis.affordableRatioPct}%)
              </strong>{' '}
              사정권
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-900 dark:bg-white transition-all duration-200"
              style={{ width: `${Math.min(100, Math.max(2, diagnosis.affordableRatioPct))}%` }}
            />
          </div>
        </div>

        {/* Next Unlock Challenge Banner */}
        {diagnosis.nextUnlockTarget && (
          <div
            data-testid="budget-tier-next-unlock"
            className="rounded-xl bg-[#f7f8fa] dark:bg-[#151a23] px-3 py-2 flex items-start sm:items-center justify-between gap-2 text-[11.5px]"
          >
            <div className="flex items-start sm:items-center gap-1.5 min-w-0">
              <TrendingUp size={13} className="text-brand-red shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
              <span className="text-secondary line-clamp-2 sm:truncate break-keep leading-snug">
                <strong className="text-brand-red tabular-nums">{diagnosis.nextUnlockTarget.gapStr}</strong>만 더 확보하면{' '}
                <strong className="text-primary">
                  {diagnosis.nextUnlockTarget.complex.displayName}
                </strong>{' '}
                ({diagnosis.nextUnlockTarget.complex.latestPriceStr}) 사정권 진입
              </span>
            </div>
          </div>
        )}

        {/* Top Affordable Real-Transaction Complexes */}
        {!isCompact && diagnosis.topAffordableComplexes.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {diagnosis.topAffordableComplexes.map((apt) => (
              <Link
                key={apt.canonicalSlug}
                href={`/apartment/${encodeURIComponent(apt.canonicalSlug)}`}
                prefetch={false}
                className="group rounded-xl bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] p-2.5 flex flex-col justify-between gap-1 transition-colors min-w-0"
              >
                <div className="flex items-center justify-between gap-1 text-[10.5px] font-bold text-tertiary">
                  <span className="truncate">{apt.dong}</span>
                  {apt.jeonseRatio !== null && (
                    <span className="shrink-0 tabular-nums">전세 {apt.jeonseRatio.toFixed(0)}%</span>
                  )}
                </div>
                <div className="text-[12.5px] font-extrabold text-primary group-hover:underline truncate">
                  {apt.displayName}
                </div>
                <div className="text-xs font-black text-primary tabular-nums">
                  {apt.latestPriceStr}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Action Links */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#eff1f5] dark:border-[#1e2532]">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/guide/${diagnosis.recommendedGuideSlug}`}
              prefetch={false}
              className="inline-flex items-center gap-1 text-[12px] font-extrabold text-primary hover:underline"
            >
              <span>{diagnosis.recommendedGuideLabel}</span>
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
            {surface !== 'explore_bottom' && (
              <Link
                href="/explore"
                prefetch={false}
                className="inline-flex items-center gap-1 text-[11.5px] font-bold text-secondary hover:text-primary"
              >
                <Compass size={12} aria-hidden="true" />
                <span>전체 단지 비교</span>
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyResult}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f7f8fa] hover:bg-[#eff1f5] dark:bg-[#151a23] dark:hover:bg-[#1e2532] text-[11px] font-bold text-secondary transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check size={12} className="text-primary" aria-hidden="true" />
                <span>결과 복사됨</span>
              </>
            ) : (
              <>
                <Share2 size={12} aria-hidden="true" />
                <span>진단 결과 공유</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
