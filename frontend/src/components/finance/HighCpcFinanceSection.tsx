"use client";

import React from 'react';
import { PolicyLoanQuickWidget } from './PolicyLoanQuickWidget';
import { JeonseGuaranteeQuickPreview } from './JeonseGuaranteeQuickPreview';

export interface HighCpcFinanceSectionProps {
  onOpenMortgageModal?: (aptName?: string, priceWon?: number, trigger?: string) => void;
  onOpenMortgage?: (aptName?: string, priceWon?: number, trigger?: string) => void;
  onOpenJeonseSafetyModal?: (aptName?: string, trigger?: string) => void;
  onOpenJeonseSafety?: (aptName?: string, trigger?: string) => void;
  onOpenTaxCalculator?: (aptName?: string, trigger?: string) => void;
  onOpenSellTiming?: (aptName?: string, trigger?: string) => void;
  apartmentName?: string | null;
  defaultPriceWon?: number;
  isSplitMode?: boolean;
}

export const HighCpcFinanceSection = React.memo(function HighCpcFinanceSection({
  onOpenMortgageModal,
  onOpenMortgage,
  onOpenJeonseSafetyModal,
  onOpenJeonseSafety,
  onOpenTaxCalculator,
  onOpenSellTiming,
  apartmentName,
  defaultPriceWon,
  isSplitMode = false,
}: HighCpcFinanceSectionProps) {
  const resolvedAptName =
    typeof apartmentName === 'string' && apartmentName.trim().length > 0
      ? apartmentName.trim()
      : undefined;
  const resolvedPriceWon =
    typeof defaultPriceWon === 'number' && Number.isFinite(defaultPriceWon) && defaultPriceWon > 0
      ? defaultPriceWon
      : undefined;

  const mortgageFn = onOpenMortgageModal || onOpenMortgage;
  const jeonseFn = onOpenJeonseSafetyModal || onOpenJeonseSafety;

  const handleHeaderMortgage = () =>
    mortgageFn?.(resolvedAptName, resolvedPriceWon, 'finance_header_btn');
  const handleWidgetMortgage = (aptOverride?: string, priceOverride?: number) =>
    mortgageFn?.(
      aptOverride ?? resolvedAptName,
      priceOverride ?? resolvedPriceWon,
      'policy_widget_cta'
    );
  const handleHeaderJeonse = () =>
    jeonseFn?.(resolvedAptName, 'finance_header_btn');
  const handleWidgetJeonse = (aptOverride?: string) =>
    jeonseFn?.(aptOverride ?? resolvedAptName, 'jeonse_widget_cta');
  const handleTax = () =>
    onOpenTaxCalculator?.(resolvedAptName, 'finance_header_btn');
  const handleSellTiming = () =>
    onOpenSellTiming?.(resolvedAptName, 'finance_header_btn');
  return (
    <section
      data-testid="high-cpc-finance-section"
      aria-label="부동산 금융 한도 및 전세보증 안전진단 리포트"
      className="my-6"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 px-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[16px] sm:text-[18px] font-black text-primary tracking-tight">
              내집마련 금융 · 전세 안전진단
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-[#eff1f5] dark:bg-[#1e2532] text-secondary text-[10px] font-extrabold">
              2026 스트레스 DSR 3단계 · HUG 126% 반영
            </span>
            {apartmentName && defaultPriceWon && defaultPriceWon > 0 && (
              <span
                data-testid="finance-benchmark-target-badge"
                className="px-2.5 py-0.5 rounded-md bg-[#eff1f5] dark:bg-[#1e2532] text-primary border border-border text-[10.5px] font-extrabold flex items-center gap-1 tabular-nums"
              >
                <span>선택 기준:</span>
                <span className="underline underline-offset-2">{apartmentName}</span>
                <span>({(defaultPriceWon / 100_000_000).toFixed(1)}억)</span>
              </span>
            )}
          </div>
          <p className="text-[11.5px] sm:text-[12.5px] text-secondary font-medium mt-0.5">
            주담대·신생아특례·디딤돌 한도 및 HUG 보증 실시간 진단
          </p>
        </div>

        {/* Quick Modal Trigger Buttons */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            type="button"
            data-testid="open-mortgage-modal-btn"
            onClick={handleHeaderMortgage}
            className="flex items-center px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 text-[12px] font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            <span>주담대·DSR 계산기</span>
          </button>

          <button
            type="button"
            data-testid="open-jeonse-safety-modal-btn"
            onClick={handleHeaderJeonse}
            className="flex items-center px-3.5 py-2 rounded-xl bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-primary border border-border text-[12px] font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            <span>전세 안전진단</span>
          </button>

          {onOpenTaxCalculator && (
            <button
              type="button"
              data-testid="open-tax-modal-btn"
              onClick={handleTax}
              className="flex items-center px-3.5 py-2 rounded-xl bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-primary border border-border text-[12px] font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
            >
              <span>취득세·중개보수</span>
            </button>
          )}

          {onOpenSellTiming && (
            <button
              type="button"
              data-testid="open-sell-timing-modal-btn"
              onClick={handleSellTiming}
              className="flex items-center px-3.5 py-2 rounded-xl bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] text-primary border border-border text-[12px] font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
            >
              <span>양도세·매도타이밍</span>
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Interactive Quick Widgets (switches to 1-Column vertical stack in split mode) */}
      <div
        data-testid="finance-quick-widgets-grid"
        className={`grid grid-cols-1 ${isSplitMode ? '' : 'lg:grid-cols-2'} gap-4 transition-all duration-300 ease-out`}
      >
        <PolicyLoanQuickWidget
          onOpenMortgageModal={mortgageFn ? handleWidgetMortgage : undefined}
          initialHomePriceWon={defaultPriceWon}
          apartmentName={apartmentName}
        />
        <JeonseGuaranteeQuickPreview
          onOpenJeonseSafetyModal={jeonseFn ? handleWidgetJeonse : undefined}
          initialEstimatedPriceWon={defaultPriceWon}
          apartmentName={apartmentName}
        />
      </div>
    </section>
  );
});
