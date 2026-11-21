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

  const hasSpecificApt = Boolean(
    selectedAptName && selectedAptName !== '동탄 전체' && selectedAptName !== '동탄 전역'
  );
  const displayName =
    hasSpecificApt && selectedAptName ? getDisplayAptName(selectedAptName) : '동탄 전체';

  return (
    <div
      data-testid="retention-action-card"
      className={`w-full h-full bg-elevated rounded-2xl p-4 sm:p-5 flex flex-col justify-between gap-3 transition-colors ${className}`}
    >
      {/* Header Label */}
      <div className="flex flex-wrap min-[360px]:flex-nowrap items-center justify-between gap-2 border-b border-slate-200/70 dark:border-slate-800/80 pb-3 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <Zap className="w-3.5 h-3.5 text-brand-red shrink-0" />
          <span className="text-[13px] sm:text-[14px] font-extrabold text-primary tracking-tight truncate">
            실거래 알림 · 바로가기
          </span>
        </div>
        <span className="text-[10.5px] font-extrabold text-secondary bg-[#eff1f5] dark:bg-[#1e2532] px-2 py-0.5 rounded-full shrink-0">
          로그인 불필요
        </span>
      </div>

      {/* Dual Core Retention Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 flex-1">
        {/* Action 1: Morning 7 AM Web Push Alert */}
        <button
          type="button"
          onClick={handlePushClick}
          className="h-full flex flex-col justify-between text-left p-3.5 sm:p-4 rounded-xl bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg dview-spark-badge flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[13px] font-extrabold text-primary tracking-tight break-keep transition-colors">
              오전 7시 실거래 알림 받기
            </span>
            <span className="text-[11.5px] text-secondary font-medium leading-snug break-keep line-clamp-2">
              {hasSpecificApt
                ? `동탄 전체 · ${displayName} 매매 요약`
                : '동탄 전체 매매 건수·신고가 요약'}
            </span>
          </div>
        </button>

        {/* Action 2: Home Screen A2HS Shortcut */}
        <button
          type="button"
          onClick={handleA2HSClick}
          className="h-full flex flex-col justify-between text-left p-3.5 sm:p-4 rounded-xl bg-surface hover:bg-[#eff1f5] dark:hover:bg-[#1e2532] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[13px] font-extrabold text-primary tracking-tight break-keep transition-colors">
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
          국토부 새벽 수집 · 매일 오전 7시대 요약
        </span>
        <span className="text-[11px] font-semibold text-secondary truncate">
          {hasSpecificApt ? `동탄 전체 · ${displayName}` : '동탄 전체'}
        </span>
      </div>
    </div>
  );
});

export default RetentionActionCard;
