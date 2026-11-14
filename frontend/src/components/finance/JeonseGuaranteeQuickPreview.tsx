"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  evaluateJeonseSafety,
} from '@/lib/utils/jeonseSafetyCalculators';
import {
  getSeoAccordionClass,
  getSeoAccordionSummaryClass,
  getSeoAccordionBodyClass,
  getSeoAccordionChevronClass,
} from '@/lib/design-system/copyDiet';
import { trackEvent } from '@/lib/utils/analytics';

export interface JeonseGuaranteeQuickPreviewProps {
  onOpenJeonseSafetyModal?: (aptName?: string) => void;
  onOpenJeonseSafety?: (aptName?: string) => void;
  initialEstimatedPriceWon?: number;
  apartmentName?: string | null;
}

export const JeonseGuaranteeQuickPreview = React.memo(function JeonseGuaranteeQuickPreview({
  onOpenJeonseSafetyModal,
  onOpenJeonseSafety,
  initialEstimatedPriceWon,
  apartmentName,
}: JeonseGuaranteeQuickPreviewProps) {
  const [estimatedPriceWon, setEstimatedPriceWon] = useState<number>(initialEstimatedPriceWon || 600_000_000); // 6억 기본
  const [jeonseDepositWon, setJeonseDepositWon] = useState<number>(
    initialEstimatedPriceWon ? Math.round((initialEstimatedPriceWon * 0.6) / 10_000_000) * 10_000_000 : 400_000_000 // 통상 전세가율 60% 추정
  );
  const [seniorMortgageWon, setSeniorMortgageWon] = useState<number>(0); // 무융자 기본

  useEffect(() => {
    if (initialEstimatedPriceWon && initialEstimatedPriceWon > 0) {
      setEstimatedPriceWon(initialEstimatedPriceWon);
      setJeonseDepositWon(Math.round((initialEstimatedPriceWon * 0.6) / 10_000_000) * 10_000_000);
    }
  }, [initialEstimatedPriceWon]);

  const resolvedAptName =
    typeof apartmentName === 'string' && apartmentName.trim().length > 0
      ? apartmentName.trim()
      : undefined;

  const trackQuickInteract = (trigger: string, extra?: Record<string, unknown>) => {
    trackEvent('finance_quick_interact', {
      calculator_type: 'jeonse_safety',
      surface: 'finance_quick_widget',
      trigger,
      apartment_name: resolvedAptName,
      apt_name: resolvedAptName,
      ...extra,
    });
  };

  const openCallback = onOpenJeonseSafetyModal || onOpenJeonseSafety;
  const handleOpen = openCallback
    ? () => {
        if (resolvedAptName !== undefined) {
          openCallback(resolvedAptName);
        } else {
          openCallback();
        }
      }
    : undefined;

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
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-sm transition-all duration-200"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div>
            <h3 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
              HUG 126% 전세보증금 안심 진단
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              공시가 126% 룰 기준 깡통전세 및 반환보증 가입성 검증
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold shrink-0 border border-emerald-200/60 dark:border-emerald-800/50">
            D-VIEW 안심
          </span>
        </div>

        {/* Inputs Preset Grid */}
        <div className="flex flex-col gap-2.5 mb-3.5">
          {/* Estimated Price Selector */}
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-700 dark:text-slate-300 font-bold">주택 시세</span>
            <div className="flex gap-1">
              {[400_000_000, 600_000_000, 800_000_000].map((price) => (
                <button
                  key={price}
                  type="button"
                  onClick={() => {
                    trackQuickInteract(`price_preset_${price / 100_000_000}eok`, {
                      estimated_price_won: price,
                    });
                    setEstimatedPriceWon(price);
                  }}
                  className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border cursor-pointer transition-colors tabular-nums ${
                    estimatedPriceWon === price
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-emerald-300'
                  }`}
                >
                  {price / 100_000_000}억
                </button>
              ))}
            </div>
          </div>

          {/* Jeonse Deposit Selector */}
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-700 dark:text-slate-300 font-bold">전세 보증금</span>
            <div className="flex gap-1">
              {[300_000_000, 400_000_000, 500_000_000].map((dep) => (
                <button
                  key={dep}
                  type="button"
                  onClick={() => {
                    trackQuickInteract(`deposit_preset_${dep / 100_000_000}eok`, {
                      jeonse_deposit_won: dep,
                    });
                    setJeonseDepositWon(dep);
                  }}
                  className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border cursor-pointer transition-colors tabular-nums ${
                    jeonseDepositWon === dep
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-emerald-300'
                  }`}
                >
                  {dep / 100_000_000}억
                </button>
              ))}
            </div>
          </div>

          {/* Senior Mortgage Selector */}
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-700 dark:text-slate-300 font-bold">선순위 근저당</span>
            <div className="flex gap-1">
              {[0, 50_000_000, 100_000_000].map((mort) => (
                <button
                  key={mort}
                  type="button"
                  onClick={() => {
                    trackQuickInteract(
                      mort === 0 ? 'mortgage_preset_none' : `mortgage_preset_${mort / 1_000_000}m`,
                      { senior_mortgage_won: mort }
                    );
                    setSeniorMortgageWon(mort);
                  }}
                  className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border cursor-pointer transition-colors tabular-nums ${
                    seniorMortgageWon === mort
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-emerald-300'
                  }`}
                >
                  {mort === 0 ? '무융자' : `${mort / 10_000_000}천만`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Diagnosis Result Card */}
        <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-3.5 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">부채비율 (보증산정 대비)</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-black text-slate-900 dark:text-slate-100 tabular-nums">
                {result.debtRatioPercent}%
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  result.riskLevel === 'SAFE'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60'
                    : result.riskLevel === 'CAUTION'
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-200/60'
                    : 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 border border-red-200/60'
                }`}
              >
                {result.riskLevel === 'SAFE' ? '안전 (보증가입)' : result.riskLevel === 'CAUTION' ? '주의 (역전세유의)' : '위험 (가입거절)'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 font-medium pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
            <span>HUG 산정 상한액</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              약 {(result.guaranteeLimitWon / 100_000_000).toFixed(1)}억 원
            </span>
          </div>

          <p className="text-[10.5px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed font-bold">
            {estimatedPriceWon <= 0 || jeonseDepositWon <= 0
              ? '시세 · 전세보증금 입력 대기'
              : result.riskLevel === 'SAFE'
              ? 'HUG 반환보증 가입 가능 · 역전세 저위험 구간'
              : result.riskLevel === 'CAUTION'
              ? '보증 가입 가능 · 선순위 근저당 감액 권장'
              : 'HUG 126% 기준 초과 · 반환보증 거절 고위험'}
          </p>

          <details className={getSeoAccordionClass('mt-2 bg-white/80 dark:bg-slate-900/80')}>
            <summary
              data-testid="hug-guide-accordion-summary"
              onClick={(e) => {
                const detailsEl = e.currentTarget.closest('details');
                if (!detailsEl?.open) {
                  trackQuickInteract('hug_guide_accordion_open', {
                    risk_level: result.riskLevel,
                  });
                }
              }}
              className={getSeoAccordionSummaryClass('min-h-[34px] px-2.5 py-1.5 text-[10.5px]')}
            >
              <span>HUG 보증 산정 해설 더보기</span>
              <ChevronDown size={13} className={getSeoAccordionChevronClass()} />
            </summary>
            <div className={getSeoAccordionBodyClass('px-2.5 py-2 text-[10.5px]')}>
              <p>{result.diagnosisSummary}</p>
            </div>
          </details>
        </div>
      </div>

      {/* CTA Button */}
      {handleOpen && (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl text-[12px] font-bold transition-all cursor-pointer flex items-center justify-center shadow-xs active:scale-[0.98]"
        >
          <span>내 전세 계약서 안심 4단계 정밀진단</span>
        </button>
      )}
    </div>
  );
});
