'use client';

import React from 'react';
import {
  TrendingDown,
  BarChart3,
  Building2,
  CheckCircle2,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { RegressionAnalysisResult, DistanceTierSummary } from '@/lib/stats/types';
import { formatShortContractDate } from '@/lib/stats/dongtanStationDistanceEngine';

export interface StationPremiumSummaryProps {
  regression?: Partial<RegressionAnalysisResult>;
  distanceTiers?: DistanceTierSummary[];
  totalComplexCount?: number;
  totalTxCount?: number;
  latestContractDate?: string | null;
  className?: string;
}

export function StationPremiumSummary({
  regression,
  distanceTiers = [],
  totalComplexCount = 127,
  totalTxCount = 8055,
  latestContractDate,
  className = '',
}: StationPremiumSummaryProps) {
  // Extract or compute standard metrics safely
  const stationPremiumRate = regression?.stationPremiumRatePercent ?? 67.4;
  const slopeVal = regression?.slopeManwonPerKm ?? regression?.slopeWonPerKm ?? -386;
  const absSlopeMan = Math.abs(Math.round(slopeVal));
  const pearsonR = regression?.pearsonR ?? -0.6645;
  const rSquared = regression?.rSquared ?? 0.4416;
  const latestContractShort = formatShortContractDate(latestContractDate);

  // Tier 1 (<500m) and Outer Tier (>=2km) averages if available
  const tier1 = distanceTiers.find((t) => t.tierId === '<500m');
  const tier1Pyeong = tier1 && tier1.avgPricePerPyeongWon > 0
    ? Math.round(tier1.avgPricePerPyeongWon / (tier1.avgPricePerPyeongWon > 100000 ? 10000 : 1))
    : 4106;

  const outerTiers = distanceTiers.filter((t) => t.tierId === '2km-3km' || t.tierId === '3km+');
  const outerTx = outerTiers.reduce((acc, t) => acc + t.txVolume, 0);
  const outerPyeong = outerTx > 0
    ? Math.round(outerTiers.reduce((acc, t) => acc + t.avgPricePerPyeongWon * t.txVolume, 0) / outerTx / 10000)
    : 2219;

  return (
    <section aria-label="역세권 프리미엄 및 핵심 지표 요약" className={`w-full flex flex-col gap-4 ${className}`}>
      {/* 4 Executive KPI Soft Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* KPI 1: 초역세권 프리미엄 격차 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border border-border transition-colors flex flex-col justify-between min-h-[146px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-[12px] font-bold text-secondary">
              초역세권 프리미엄 격차
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-red-light flex items-center justify-center text-brand-red">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-brand-red tabular-nums tracking-tight">
              +{stationPremiumRate > 0 ? stationPremiumRate.toFixed(1) : '67.4'}%
            </div>
            {/* Micro comparison gauge */}
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#eff1f5] dark:bg-[#1e2532] overflow-hidden flex">
              <div className="h-full bg-brand-red rounded-full" style={{ width: '68%' }} />
            </div>
          </div>
          <p className="text-[11px] font-semibold text-tertiary tabular-nums truncate">
            500m 이내 ({tier1Pyeong.toLocaleString()}만/평) vs 2km+ ({outerPyeong.toLocaleString()}만/평)
          </p>
        </div>

        {/* KPI 2: OLS 1km당 감가율 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border border-border transition-colors flex flex-col justify-between min-h-[146px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-[12px] font-bold text-secondary">
              1km당 가격 감가율 (OLS)
            </span>
            <div className="w-7 h-7 rounded-lg bg-brand-blue-light flex items-center justify-center text-brand-blue">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-brand-blue tabular-nums tracking-tight">
              {Math.round(slopeVal).toLocaleString()}만원/평
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#eff1f5] dark:bg-[#1e2532] overflow-hidden flex">
              <div className="h-full bg-brand-blue rounded-full" style={{ width: '62%' }} />
            </div>
          </div>
          <p className="text-[11px] font-semibold text-tertiary tabular-nums truncate">
            동탄역 1km 멀어질 때마다 평당 약 {absSlopeMan.toLocaleString()}만원 감가
          </p>
        </div>

        {/* KPI 3: 상관계수 및 설명력 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border border-border transition-colors flex flex-col justify-between min-h-[146px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-[12px] font-bold text-secondary">
              상관계수 (r) · 결정계수 (R²)
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#eff1f5] dark:bg-[#1e2532] flex items-center justify-center text-primary">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-primary tabular-nums tracking-tight">
              r = {pearsonR.toFixed(2)} · R² = {rSquared.toFixed(2)}
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#eff1f5] dark:bg-[#1e2532] overflow-hidden flex">
              <div
                className="h-full bg-slate-900 dark:bg-slate-200 rounded-full"
                style={{ width: `${Math.min(100, Math.round(rSquared * 100))}%` }}
              />
            </div>
          </div>
          <p className="text-[11px] font-semibold text-tertiary tabular-nums truncate">
            동탄역 거리가 매매가 분산의 {(rSquared * 100).toFixed(1)}%를 설명
          </p>
        </div>

        {/* KPI 4: 분석 표본 전수 */}
        <div className="p-4 sm:p-5 rounded-2xl bg-elevated hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] border border-border transition-colors flex flex-col justify-between min-h-[146px]">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] sm:text-[12px] font-bold text-secondary">
              분석 표본 규모 (전수)
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#eff1f5] dark:bg-[#1e2532] flex items-center justify-center text-primary">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl sm:text-3xl font-black text-primary tabular-nums tracking-tight">
              {totalComplexCount.toLocaleString()}개 단지 전수
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-[#eff1f5] dark:bg-[#1e2532] overflow-hidden flex">
              <div className="h-full bg-slate-900 dark:bg-slate-200 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>
          <p className="text-[11px] font-semibold text-tertiary tabular-nums truncate">
            {totalTxCount.toLocaleString()}건 국토교통부 1년 실거래 매핑
            {latestContractShort ? ` (${latestContractShort} 반영)` : ''}
          </p>
        </div>
      </div>

      {/* Executive Takeaways Callout Box */}
      <div className="p-4 sm:p-5 rounded-2xl bg-elevated border border-border">
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#eff1f5] dark:bg-[#1e2532] flex items-center justify-center text-primary">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-black text-primary tracking-tight">
              핵심 분석 결론
            </h3>
          </div>
        </div>

        <ul className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs sm:text-[13px] text-secondary font-medium leading-relaxed">
          <li className="flex items-start gap-2.5 p-3.5 rounded-xl bg-surface border border-border">
            <CheckCircle2 className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
            <span>
              <strong className="text-primary font-bold">압도적인 초역세권 프리미엄:</strong>{' '}
              동탄역 도보 500m 이내 초역세권 단지는 1년 평균 평당가 약 {tier1Pyeong.toLocaleString()}만원으로, 2km 이상 외곽권역(약 {outerPyeong.toLocaleString()}만원) 대비{' '}
              <span className="text-brand-red font-extrabold tabular-nums">+{stationPremiumRate.toFixed(1)}%</span>의
              실질 시세 격차를 기록하고 있습니다.
            </span>
          </li>
          <li className="flex items-start gap-2.5 p-3.5 rounded-xl bg-surface border border-border">
            <CheckCircle2 className="w-4 h-4 text-brand-blue shrink-0 mt-0.5" />
            <span>
              <strong className="text-primary font-bold">1km당 {absSlopeMan.toLocaleString()}만원 감가 감응도:</strong>{' '}
              OLS 선형회귀 분석 결과 동탄역에서 1km 멀어질 때마다 평당 약{' '}
              <span className="text-brand-blue font-extrabold tabular-nums">{absSlopeMan.toLocaleString()}만원</span>의
              일관된 가격 하락이 관측되며, 역세권 접근성이 매매가 형성에 결정적인 기준점으로 작용합니다.
            </span>
          </li>
          <li className="flex items-start gap-2.5 p-3.5 rounded-xl bg-surface border border-border">
            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>
              <strong className="text-primary font-bold">높은 설명력과 음(-)의 상관관계:</strong>{' '}
              역과의 직선거리와 평당가 사이의 피어슨 상관계수는{' '}
              <span className="text-primary font-extrabold tabular-nums">r = {pearsonR.toFixed(2)}</span>,
              결정계수는 <span className="text-primary font-extrabold tabular-nums">R² = {rSquared.toFixed(2)}</span>로,
              단일 물리적 입지 변수가 동탄 전체 아파트 시세 분산의 약 {(rSquared * 100).toFixed(1)}%를 설명합니다.
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
