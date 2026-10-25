"use client";

import React, { useState, useMemo } from 'react';
import { Landmark, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  calculatePolicyLoan,
  PolicyLoanType,
} from '@/lib/utils/policyLoanCalculators';

export interface PolicyLoanQuickWidgetProps {
  onOpenMortgageModal?: () => void;
  onOpenMortgage?: () => void;
}

export const PolicyLoanQuickWidget = React.memo(function PolicyLoanQuickWidget({
  onOpenMortgageModal,
  onOpenMortgage,
}: PolicyLoanQuickWidgetProps) {
  const [loanType, setLoanType] = useState<PolicyLoanType>('NEWBORN');
  const [homePriceWon, setHomePriceWon] = useState<number>(700_000_000); // 7억
  const [annualIncomeWon, setAnnualIncomeWon] = useState<number>(80_000_000); // 8,000만

  const handleOpen = onOpenMortgageModal || onOpenMortgage;

  const result = useMemo(() => {
    return calculatePolicyLoan({
      loanType,
      homePriceWon,
      annualIncomeWon,
      loanPeriodYears: 30,
    });
  }, [loanType, homePriceWon, annualIncomeWon]);

  return (
    <div
      data-testid="policy-loan-quick-widget"
      className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:shadow-sm transition-all duration-200"
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Landmark size={16} />
            </div>
            <div>
              <h3 className="text-[14px] sm:text-[15px] font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                내집마련 정책대출 간이 진단
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                2026 정부 저리 정책자금 모의 한도 및 최저 금리
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 text-[10px] font-extrabold shrink-0 border border-blue-200/60 dark:border-blue-800/50">
            D-VIEW 금융
          </span>
        </div>

        {/* Loan Type Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/60 dark:border-slate-700/60 mb-3.5">
          <button
            type="button"
            onClick={() => setLoanType('NEWBORN')}
            className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
              loanType === 'NEWBORN'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            신생아 특례
          </button>
          <button
            type="button"
            onClick={() => setLoanType('DIDIMDOL')}
            className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
              loanType === 'DIDIMDOL'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            디딤돌 대출
          </button>
          <button
            type="button"
            onClick={() => setLoanType('BOGEUMJARI')}
            className={`py-1.5 text-[11px] font-bold rounded-lg transition-all cursor-pointer text-center ${
              loanType === 'BOGEUMJARI'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            보금자리론
          </button>
        </div>

        {/* Interactive Presets */}
        <div className="flex flex-col gap-2.5 mb-4">
          {/* Home Price Preset */}
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-700 dark:text-slate-300 font-bold">주택 매매가</span>
            <div className="flex gap-1">
              {[500_000_000, 700_000_000, 900_000_000].map((price) => (
                <button
                  key={price}
                  type="button"
                  onClick={() => setHomePriceWon(price)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border cursor-pointer transition-colors tabular-nums ${
                    homePriceWon === price
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  {price / 100_000_000}억
                </button>
              ))}
            </div>
          </div>

          {/* Annual Income Preset */}
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="text-slate-700 dark:text-slate-300 font-bold">부부합산 소득</span>
            <div className="flex gap-1">
              {[50_000_000, 80_000_000, 130_000_000].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => setAnnualIncomeWon(inc)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-bold border cursor-pointer transition-colors tabular-nums ${
                    annualIncomeWon === inc
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:border-blue-300'
                  }`}
                >
                  {inc / 10_000_000}천만
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Result Card */}
        <div className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 rounded-xl p-3.5 mb-4">
          {result.isEligible ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-blue-600 dark:text-blue-400" />
                  예상 지원 한도
                </span>
                <span className="text-[14px] font-black text-blue-600 dark:text-blue-400 tabular-nums">
                  최대 {(result.maxLimitWon / 100_000_000).toFixed(1)}억 원
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                <span>예상 최저 금리</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">연 {result.estimatedRatePercent}%</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-300 font-medium pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                <span>월 예상 원리금 (30년)</span>
                <span className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  약 {Math.round(result.monthlyPaymentWon / 10000).toLocaleString()}만 원
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 py-1 text-red-600 dark:text-red-400">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold block">{result.badgeText}</span>
                <span className="text-[10px] opacity-90">{result.ineligibleReason}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CTA Button */}
      {handleOpen && (
        <button
          type="button"
          onClick={handleOpen}
          className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-[12px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs active:scale-[0.98]"
        >
          <span>정밀 정책자금 한도 계산기 열기</span>
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
});
