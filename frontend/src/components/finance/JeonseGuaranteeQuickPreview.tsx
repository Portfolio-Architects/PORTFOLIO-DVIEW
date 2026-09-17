"use client";

import React, { useState, useMemo } from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import {
  evaluateJeonseSafety,
  JeonseRiskLevel,
} from '@/lib/utils/jeonseSafetyCalculators';

export interface JeonseGuaranteeQuickPreviewProps {
  onOpenJeonseSafetyModal?: () => void;
  onOpenJeonseSafety?: () => void;
}

export const JeonseGuaranteeQuickPreview = React.memo(function JeonseGuaranteeQuickPreview({
  onOpenJeonseSafetyModal,
  onOpenJeonseSafety,
}: JeonseGuaranteeQuickPreviewProps) {
  const [estimatedPriceWon, setEstimatedPriceWon] = useState<number>(600_000_000); // 6억
  const [jeonseDepositWon, setJeonseDepositWon] = useState<number>(400_000_000); // 4억
  const [seniorMortgageWon, setSeniorMortgageWon] = useState<number>(0); // 무융자 기본

  const handleOpen = onOpenJeonseSafetyModal || onOpenJeonseSafety;

  const result = useMemo(() => {
    return evaluateJeonseSafety({
      estimatedPriceWon,
      seniorMortgageWon,
      jeonseDepositWon,
    });
  }, [estimatedPriceWon, seniorMortgageWon, jeonseDepositWon]);

  return (
    <div
      data-testid="jeonse-guarantee-quick-preview"
      className="bg-surface border border-border/70 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-200"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-brand-orange flex items-center justify-center shrink-0">
              <ShieldCheck size={17} />
            </div>
            <div>
              <h3 className="text-[14px] sm:text-[15px] font-black text-primary tracking-tight">
                HUG 126% 전세보증금 안심 진단
              </h3>
              <p className="text-[10.5px] sm:text-[11px] text-tertiary font-medium">
                공시가 126% 룰 기준 깡통전세 및 반환보증 가입성 검증
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-brand-orange text-[10px] font-extrabold shrink-0 border border-teal-200/50 dark:border-teal-800/40">
            D-VIEW 안심
          </span>
        </div>

        {/* Inputs Preset Grid */}
        <div className="flex flex-col gap-2.5 mb-3.5">
          {/* Estimated Price Selector */}
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-secondary font-bold">주택 시세</span>
            <div className="flex gap-1">
              {[400_000_000, 600_000_000, 800_000_000].map((price) => (
                <button
                  key={price}
                  type="button"
                  onClick={() => setEstimatedPriceWon(price)}
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border cursor-pointer transition-colors ${
                    estimatedPriceWon === price
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-body text-secondary border-border/70 hover:border-border'
                  }`}
                >
                  {price / 100_000_000}억
                </button>
              ))}
            </div>
          </div>

          {/* Jeonse Deposit Selector */}
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-secondary font-bold">전세 보증금</span>
            <div className="flex gap-1">
              {[300_000_000, 400_000_000, 500_000_000].map((dep) => (
                <button
                  key={dep}
                  type="button"
                  onClick={() => setJeonseDepositWon(dep)}
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border cursor-pointer transition-colors ${
                    jeonseDepositWon === dep
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-body text-secondary border-border/70 hover:border-border'
                  }`}
                >
                  {dep / 100_000_000}억
                </button>
              ))}
            </div>
          </div>

          {/* Senior Mortgage Selector */}
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-secondary font-bold">선순위 근저당</span>
            <div className="flex gap-1">
              {[0, 50_000_000, 100_000_000].map((mort) => (
                <button
                  key={mort}
                  type="button"
                  onClick={() => setSeniorMortgageWon(mort)}
                  className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border cursor-pointer transition-colors ${
                    seniorMortgageWon === mort
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-body text-secondary border-border/70 hover:border-border'
                  }`}
                >
                  {mort === 0 ? '무융자' : `${mort / 10_000_000}천만`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnosis Result Card */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-border/60 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-tertiary">부채비율 (보증산정 대비)</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-black text-primary tabular-nums">
                {result.debtRatioPercent}%
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                  result.riskLevel === 'SAFE'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60'
                    : result.riskLevel === 'CAUTION'
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/60'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/60'
                }`}
              >
                {result.riskLevel === 'SAFE' ? '안전 (보증가입)' : result.riskLevel === 'CAUTION' ? '주의 (역전세유의)' : '위험 (가입거절)'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-secondary font-medium pt-1.5 border-t border-border/40">
            <span>HUG 산정 상한액</span>
            <span className="font-extrabold text-primary">
              약 {(result.guaranteeLimitWon / 100_000_000).toFixed(1)}억 원
            </span>
          </div>

          <p className="text-[10px] text-tertiary mt-2 leading-relaxed font-medium">
            {result.diagnosisSummary}
          </p>
        </div>
      </div>

      {/* CTA Button */}
      {handleOpen && (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full py-2.5 px-3 bg-brand-orange hover:bg-brand-orange/95 text-white rounded-xl text-[12px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
        >
          <span>내 전세 계약서 안심 4단계 정밀진단</span>
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
});
