'use client';

import React, { useCallback } from 'react';
import { BellRing, Smartphone, Zap } from 'lucide-react';
import { usePWA } from '@/components/pwa/PWAProvider';
import { trackEvent } from '@/lib/utils/analytics';
import { getDisplayAptName } from '@/lib/utils/apartmentMapping';

export interface RetentionActionCardProps {
  selectedAptName?: string | null;
  onOpenPushModal: (aptName: string) => void;
  onOpenA2HSModal?: () => void;
  className?: string;
}

export const RetentionActionCard = React.memo(function RetentionActionCard({
  selectedAptName,
  onOpenPushModal,
  onOpenA2HSModal,
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

  const displayName = selectedAptName ? getDisplayAptName(selectedAptName) : '동탄 전역';

  return (
    <div
      data-testid="retention-action-card"
      className={`w-full h-full bg-elevated rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 transition-colors ${className}`}
    >
      {/* Header Label */}
      <div className="flex flex-wrap min-[360px]:flex-nowrap items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800/80 pb-3 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Zap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="text-[13px] sm:text-[14px] font-extrabold text-primary tracking-tight truncate">
            데일리 리텐션 & 퀵 분석 허브
          </span>
        </div>
        <span className="text-[10.5px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full shrink-0">
          습관 루프
        </span>
      </div>

      {/* Dual Core Retention Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
        {/* Action 1: Morning 7 AM Web Push Alert */}
        <button
          type="button"
          onClick={handlePushClick}
          className="h-full flex flex-col justify-between text-left p-3.5 sm:p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-2 py-0.5 rounded-md tabular-nums shrink-0">
              매일 07:00
            </span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[13px] font-extrabold text-primary tracking-tight break-keep group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              오전 7시 실거래 알림 받기
            </span>
            <span className="text-[11.5px] text-secondary font-medium leading-snug break-keep line-clamp-2">
              {displayName} 신규 체결 즉시 발송
            </span>
          </div>
        </button>

        {/* Action 2: Home Screen A2HS Shortcut */}
        <button
          type="button"
          onClick={handleA2HSClick}
          className="h-full flex flex-col justify-between text-left p-3.5 sm:p-4 rounded-xl bg-surface hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-800 dark:bg-slate-700 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-extrabold text-secondary bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded-md shrink-0">
              1초 바로가기
            </span>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[13px] font-extrabold text-primary tracking-tight break-keep group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              홈 화면에 앱 추가
            </span>
            <span className="text-[11.5px] text-secondary font-medium leading-snug break-keep line-clamp-2">
              스토어 설치 없이 바탕화면 실행
            </span>
          </div>
        </button>
      </div>

      {/* Footer Metadata Strip */}
      <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/80 flex flex-wrap min-[360px]:flex-nowrap items-center justify-between gap-2 shrink-0">
        <span className="text-[11px] text-tertiary font-medium tabular-nums">
          매일 07:00 국토부 신규 체결 기준
        </span>
        <span className="text-[11px] font-semibold text-secondary truncate">
          {displayName}
        </span>
      </div>
    </div>
  );
});

export default RetentionActionCard;
