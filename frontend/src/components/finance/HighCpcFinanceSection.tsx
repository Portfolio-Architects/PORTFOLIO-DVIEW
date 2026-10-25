"use client";

import React from 'react';
import { PolicyLoanQuickWidget } from './PolicyLoanQuickWidget';
import { JeonseGuaranteeQuickPreview } from './JeonseGuaranteeQuickPreview';

export interface HighCpcFinanceSectionProps {
  onOpenMortgageModal?: (aptName?: string) => void;
  onOpenMortgage?: (aptName?: string) => void;
  onOpenJeonseSafetyModal?: (aptName?: string) => void;
  onOpenJeonseSafety?: (aptName?: string) => void;
}

export const HighCpcFinanceSection = React.memo(function HighCpcFinanceSection({
  onOpenMortgageModal,
  onOpenMortgage,
  onOpenJeonseSafetyModal,
  onOpenJeonseSafety,
}: HighCpcFinanceSectionProps) {
  const handleMortgage = () => (onOpenMortgageModal || onOpenMortgage)?.();
  const handleJeonse = () => (onOpenJeonseSafetyModal || onOpenJeonseSafety)?.();
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
            <h2 className="text-[16px] sm:text-[18px] font-black text-slate-900 dark:text-slate-50 tracking-tight">
              동탄 내집마련 금융 · 전세보증 안전진단 센터
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50 text-[10px] font-extrabold">
              2026 스트레스 DSR 3단계 · HUG 126% 반영
            </span>
          </div>
          <p className="text-[11.5px] sm:text-[12.5px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            매수 자금 계획(주담대·신생아특례·디딤돌)과 전세보증금 반환보증 가입 가능 여부를 실시간으로 시뮬레이션하세요.
          </p>
        </div>

        {/* Quick Modal Trigger Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            data-testid="open-mortgage-modal-btn"
            onClick={handleMortgage}
            className="flex items-center px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            <span>주담대·DSR 계산기</span>
          </button>

          <button
            type="button"
            data-testid="open-jeonse-safety-modal-btn"
            onClick={handleJeonse}
            className="flex items-center px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-blue-50/50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 text-[12px] font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            <span>전세 안전진단</span>
          </button>
        </div>
      </div>

      {/* 2-Column Interactive Quick Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PolicyLoanQuickWidget onOpenMortgageModal={handleMortgage} />
        <JeonseGuaranteeQuickPreview onOpenJeonseSafetyModal={handleJeonse} />
      </div>
    </section>
  );
});
