"use client";

import React from 'react';
import { PolicyLoanQuickWidget } from './PolicyLoanQuickWidget';
import { JeonseGuaranteeQuickPreview } from './JeonseGuaranteeQuickPreview';

export interface HighCpcFinanceSectionProps {
  onOpenMortgageModal?: () => void;
  onOpenMortgage?: () => void;
  onOpenJeonseSafetyModal?: () => void;
  onOpenJeonseSafety?: () => void;
}

export const HighCpcFinanceSection = React.memo(function HighCpcFinanceSection({
  onOpenMortgageModal,
  onOpenMortgage,
  onOpenJeonseSafetyModal,
  onOpenJeonseSafety,
}: HighCpcFinanceSectionProps) {
  const mortgageHandler = onOpenMortgageModal || onOpenMortgage;
  const jeonseHandler = onOpenJeonseSafetyModal || onOpenJeonseSafety;

  return (
    <section
      data-testid="high-cpc-finance-section"
      aria-label="고수익 금융 및 안심진단 서비스"
      className="w-full flex flex-col gap-3 mb-6"
    >
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-orange animate-pulse" />
          <h2 className="text-[15px] sm:text-[16px] font-black text-primary tracking-tight">
            내집마련 정책자금 & 전세 안전진단 센터
          </h2>
        </div>
        <span className="text-[11px] text-tertiary font-medium hidden sm:inline-block">
          실시간 최저 금리 및 깡통전세 예방 솔루션
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-stretch">
        <PolicyLoanQuickWidget
          onOpenMortgageModal={mortgageHandler}
          onOpenMortgage={mortgageHandler}
        />
        <JeonseGuaranteeQuickPreview
          onOpenJeonseSafetyModal={jeonseHandler}
          onOpenJeonseSafety={jeonseHandler}
        />
      </div>
    </section>
  );
});
