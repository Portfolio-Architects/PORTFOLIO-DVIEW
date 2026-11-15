'use client';

import React, { useCallback } from 'react';
import { Coins, GraduationCap, Train, ArrowRight } from 'lucide-react';
import { trackEvent } from '@/lib/utils/analytics';

export interface AptFitFinderCardProps {
  onOpenAptFitFinder?: () => void;
  className?: string;
}

export const AptFitFinderCard = React.memo(function AptFitFinderCard({
  onOpenAptFitFinder,
  className = '',
}: AptFitFinderCardProps) {
  const handleQuizClick = useCallback(() => {
    trackEvent('open_calculator', {
      calculator_type: 'apt_fit_finder',
      surface: 'zone2_terminal',
    });
    onOpenAptFitFinder?.();
  }, [onOpenAptFitFinder]);

  return (
    <div
      data-testid="apt-fit-finder-card"
      className={`w-full h-full bg-elevated rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3.5 transition-colors ${className}`}
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex flex-wrap min-[360px]:flex-nowrap justify-between items-center border-b border-slate-200/70 dark:border-slate-800/80 pb-3 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="bg-blue-600/10 dark:bg-blue-600/25 text-blue-700 dark:text-blue-400 font-extrabold text-[10.5px] px-2 sm:px-2.5 py-0.5 rounded-[8px] shrink-0">
              AI 매칭
            </span>
            <h4 className="text-[14px] font-extrabold text-primary tracking-tight truncate">
              내게 맞는 단지 찾기
            </h4>
          </div>
          <span className="text-[10.5px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full shrink-0 tabular-nums">
            7문항 · 1분
          </span>
        </div>

        {/* Concise Description */}
        <p className="text-[12.5px] text-secondary leading-relaxed font-medium break-keep">
          예산 · 학군 · 교통 7가지 조건 기반 동탄 단지 맞춤 매칭
        </p>

        {/* 3-Column Filter Preview Grid (stacks cleanly below 360px to avoid truncation) */}
        <div className="grid grid-cols-1 min-[360px]:grid-cols-3 gap-2 pt-0.5">
          <div className="rounded-xl bg-surface p-2.5 sm:p-3 flex flex-row min-[360px]:flex-col items-center min-[360px]:items-start justify-between min-[360px]:justify-start gap-1 min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-bold text-tertiary min-w-0">
              <Coins className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate">가용 예산</span>
            </div>
            <span className="text-[12px] font-bold text-primary tabular-nums shrink-0 min-[360px]:shrink min-[360px]:w-full min-[360px]:truncate">
              3억 ~ 14억+
            </span>
          </div>

          <div className="rounded-xl bg-surface p-2.5 sm:p-3 flex flex-row min-[360px]:flex-col items-center min-[360px]:items-start justify-between min-[360px]:justify-start gap-1 min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-bold text-tertiary min-w-0">
              <GraduationCap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="truncate">자녀 · 학군</span>
            </div>
            <span className="text-[12px] font-bold text-primary shrink-0 min-[360px]:shrink min-[360px]:w-full min-[360px]:truncate">
              초품아 · 학원
            </span>
          </div>

          <div className="rounded-xl bg-surface p-2.5 sm:p-3 flex flex-row min-[360px]:flex-col items-center min-[360px]:items-start justify-between min-[360px]:justify-start gap-1 min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-bold text-tertiary min-w-0">
              <Train className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300 shrink-0" />
              <span className="truncate">광역 교통</span>
            </div>
            <span className="text-[12px] font-bold text-primary shrink-0 min-[360px]:shrink min-[360px]:w-full min-[360px]:truncate">
              GTX · 트램
            </span>
          </div>
        </div>
      </div>

      {/* Footer CTA Row */}
      <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-wrap min-[360px]:flex-nowrap items-center justify-between gap-2 shrink-0">
        <span className="text-[11px] text-tertiary font-medium break-keep">
          실거래 · 입지 지표 기반 TOP 3 추천
        </span>
        <button
          type="button"
          data-testid="apt-fit-finder-cta"
          aria-label="내게 맞는 단지 찾기"
          onClick={handleQuizClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12px] font-bold transition-all active:scale-95 cursor-pointer shrink-0 ml-auto"
        >
          <span>내게 맞는 단지 찾기</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
});

export default AptFitFinderCard;
