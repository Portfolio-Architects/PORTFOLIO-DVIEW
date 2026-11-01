'use client';

import React, { useCallback } from 'react';
import { BellRing, Smartphone, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { usePWA } from '@/components/pwa/PWAProvider';
import { trackEvent } from '@/lib/utils/analytics';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';

export interface RetentionActionCardProps {
  selectedAptName?: string | null;
  onOpenPushModal: (aptName: string) => void;
  onOpenA2HSModal?: () => void;
  onOpenAptFitFinder?: () => void;
  className?: string;
}

export const RetentionActionCard = React.memo(function RetentionActionCard({
  selectedAptName,
  onOpenPushModal,
  onOpenA2HSModal,
  onOpenAptFitFinder,
  className = '',
}: RetentionActionCardProps) {
  const { triggerCustomA2HSModal } = usePWA();

  const handlePushClick = useCallback(() => {
    const targetApt = selectedAptName || '동탄 전체';
    trackEvent('push_modal_open', {
      surface: 'zone2_terminal',
      trigger: 'hero_card',
      apt_name: targetApt,
    });
    onOpenPushModal(targetApt);
  }, [selectedAptName, onOpenPushModal]);

  const handleA2HSClick = useCallback(() => {
    trackEvent('a2hs_modal_open', {
      surface: 'zone2_terminal',
      trigger: 'hero_card',
    });
    if (onOpenA2HSModal) {
      onOpenA2HSModal();
    } else {
      triggerCustomA2HSModal();
    }
  }, [onOpenA2HSModal, triggerCustomA2HSModal]);

  const handleQuizClick = useCallback(() => {
    trackEvent('open_calculator', {
      calculator_type: 'apt_fit_finder',
      surface: 'zone2_terminal',
    });
    onOpenAptFitFinder?.();
  }, [onOpenAptFitFinder]);

  const displayName = selectedAptName ? getDisplayAptName(selectedAptName) : '동탄 전역';

  return (
    <div
      data-testid="retention-action-card"
      className={`w-full bg-surface border border-border/80 rounded-[22px] sm:rounded-[26px] p-4 sm:p-5 flex flex-col gap-3.5 shadow-xs transition-colors ${className}`}
    >
      {/* Header Label */}
      <div className="flex items-center justify-between pb-2 border-b border-border/40">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-[12px] sm:text-[13px] font-black text-primary tracking-tight">
            데일리 리텐션 & 퀵 분석 허브
          </span>
        </div>
        <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded-full">
          습관 루프
        </span>
      </div>

      {/* Dual Core Retention Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Action 1: Morning 7 AM Web Push Alert */}
        <button
          type="button"
          onClick={handlePushClick}
          className="flex flex-col text-left p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 border border-blue-200/60 dark:border-blue-800/50 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <BellRing className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9.5px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 rounded">
              매일 07:00
            </span>
          </div>
          <span className="text-[12.5px] font-black text-primary tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            오전 7시 실거래 알림 받기
          </span>
          <span className="text-[10.5px] text-secondary font-medium mt-0.5 truncate">
            {displayName} 신규 체결 즉시 발송
          </span>
        </button>

        {/* Action 2: Home Screen A2HS Shortcut */}
        <button
          type="button"
          onClick={handleA2HSClick}
          className="flex flex-col text-left p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-border/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shadow-xs">
              <Smartphone className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9.5px] font-extrabold text-secondary bg-slate-200/80 dark:bg-slate-800 px-1.5 py-0.2 rounded">
              1초 바로가기
            </span>
          </div>
          <span className="text-[12.5px] font-black text-primary tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            홈 화면에 앱 추가
          </span>
          <span className="text-[10.5px] text-secondary font-medium mt-0.5 truncate">
            스토어 설치 없이 바탕화면 실행
          </span>
        </button>
      </div>

      {/* Quick Tool Action: AptFitFinder */}
      <button
        type="button"
        onClick={handleQuizClick}
        className="w-full flex items-center justify-between p-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/50 border border-border/60 hover:border-border transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex flex-col min-w-0 text-left">
            <span className="text-[11.5px] font-extrabold text-primary truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              내게 맞는 단지 찾기 (AptFitFinder)
            </span>
            <span className="text-[9.5px] text-tertiary truncate">
              예산·학군·교통 1분 맞춤 AI 매칭
            </span>
          </div>
        </div>
        <ChevronRight className="w-3.5 h-3.5 text-tertiary group-hover:translate-x-0.5 transition-transform shrink-0" />
      </button>
    </div>
  );
});

export default RetentionActionCard;
