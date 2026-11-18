'use client';

import React, { useCallback } from 'react';
import { BellRing, Smartphone, Star } from 'lucide-react';
import { usePWA } from '@/components/pwa/PWAProvider';
import { QuickNonLoginRetentionAction } from '@/components/common/QuickNonLoginRetentionAction';
import { getVisualSignalPillClass } from '@/lib/design-system/copyDiet';
import { trackEvent } from '@/lib/utils/analytics';

export interface ApartmentQuickRetentionBarProps {
  apartmentName: string;
  canonicalSlug: string;
  dong?: string;
  latestPriceStr?: string;
}

/**
 * Lightweight above-the-fold retention bar for `/apartment/[aptName]` SSR landing visitors.
 * Enables 1-Click non-login favorite saving (`dview_guest_favorites`) and weekday 07:00 KST
 * MOLIT real-transaction alert subscription with Zero-CLS (`min-h-[60px]`) and Copy Diet compliance.
 */
export const ApartmentQuickRetentionBar = React.memo(function ApartmentQuickRetentionBar({
  apartmentName,
  canonicalSlug,
  dong,
  latestPriceStr,
}: ApartmentQuickRetentionBarProps) {
  const { isIOS, isPushSupported, isStandalone, triggerCustomA2HSModal } = usePWA();
  const showIosA2hsShortcut = Boolean(isIOS && !isPushSupported && !isStandalone);

  const verifiedPriceLabel =
    latestPriceStr && latestPriceStr !== '정보 없음' ? latestPriceStr : null;

  const handleOpenIosA2hs = useCallback(() => {
    trackEvent('a2hs_modal_open', {
      surface: 'apartment_ssr_report',
      trigger: 'apt_ssr_ios_retention_bridge',
      apt_name: apartmentName,
      apartment_name: canonicalSlug,
      ...(dong ? { dong } : {}),
    });
    triggerCustomA2HSModal?.();
  }, [apartmentName, canonicalSlug, dong, triggerCustomA2HSModal]);

  return (
    <div
      data-testid="apt-ssr-quick-retention-bar"
      role="region"
      aria-label={`${apartmentName} 비로그인 관심단지 찜 및 평일 07시 실거래 알림`}
      className="w-full min-h-[60px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-3.5 sm:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 transition-colors box-border"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2.5 min-w-0">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={getVisualSignalPillClass('safe')}>
            <Star size={11} className="shrink-0" />
            <span>비로그인 찜</span>
          </span>
          <span className={getVisualSignalPillClass('down')}>
            <BellRing size={11} className="shrink-0" />
            <span>평일 07시</span>
          </span>
        </div>

        <span
          data-testid="apt-ssr-quick-retention-copy"
          className="text-xs sm:text-[13px] font-extrabold text-primary truncate tabular-nums"
        >
          로그인 없이 1초 관심단지 찜 · 평일 07:00 실거래 변동 알림
          {verifiedPriceLabel ? ` (최근 ${verifiedPriceLabel})` : ''}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        <QuickNonLoginRetentionAction
          aptName={apartmentName}
          displayAptName={apartmentName}
          canonicalSlug={canonicalSlug}
          dong={dong}
          surface="apartment_ssr_report"
          triggerPrefix="apt_ssr"
          size="sm"
          testIdPrefix="apt-ssr-retention"
        />

        {showIosA2hsShortcut && (
          <button
            type="button"
            data-testid="apt-ssr-ios-a2hs-btn"
            aria-label="아이폰 홈 화면 추가 안내 열기"
            onClick={handleOpenIosA2hs}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11.5px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
          >
            <Smartphone size={13} className="shrink-0" />
            <span>홈 추가</span>
          </button>
        )}
      </div>
    </div>
  );
});

export default ApartmentQuickRetentionBar;
