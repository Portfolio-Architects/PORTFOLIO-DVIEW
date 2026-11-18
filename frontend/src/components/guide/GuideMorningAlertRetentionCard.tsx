'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, Check, Smartphone, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites, isApartmentInFavorites } from '@/hooks/useFavorites';
import { usePWA } from '@/components/pwa/PWAProvider';
import PushSubscriptionModal from '@/components/pwa/PushSubscriptionModal';
import { getToggleBtnClass, getToggleTrackClass } from '@/lib/design-system/controls';
import { getVisualSignalPillClass } from '@/lib/design-system/copyDiet';
import { trackEvent } from '@/lib/utils/analytics';

export interface GuideRetentionAptItem {
  name: string;
  displayName: string;
  canonicalSlug: string;
  dong?: string;
  latestPrice?: number;
  latestPriceStr?: string;
}

export interface GuideMorningAlertRetentionCardProps {
  guideSlug: string;
  apartments?: ReadonlyArray<GuideRetentionAptItem>;
  surface?: string;
  sectionId?: string;
}

export const GuideMorningAlertRetentionCard = React.memo(
  function GuideMorningAlertRetentionCard({
    guideSlug,
    apartments = [],
    surface = 'guide_retention_card',
    sectionId = 'guide-morning-alert-retention',
  }: GuideMorningAlertRetentionCardProps) {
    const candidateApts = useMemo(
      () =>
        (apartments || [])
          .filter((item) => Boolean(item && (item.canonicalSlug || item.displayName || item.name)))
          .slice(0, 4),
      [apartments]
    );

    const [selectedIdx, setSelectedIdx] = useState(0);
    const [isPushModalOpen, setIsPushModalOpen] = useState(false);

    useEffect(() => {
      setSelectedIdx(0);
    }, [guideSlug]);

    const safeIdx =
      candidateApts.length > 0 ? Math.min(selectedIdx, candidateApts.length - 1) : 0;
    const activeApt = candidateApts[safeIdx] || null;

    const selectedCanonical =
      activeApt?.canonicalSlug || activeApt?.name || '동탄 전체';
    const selectedDisplay =
      activeApt?.displayName || activeApt?.name || '동탄 전역';
    const selectedDong = activeApt?.dong?.trim() || undefined;
    const verifiedPriceLabel =
      activeApt &&
      typeof activeApt.latestPrice === 'number' &&
      activeApt.latestPrice > 0 &&
      activeApt.latestPriceStr &&
      activeApt.latestPriceStr !== '정보 없음'
        ? activeApt.latestPriceStr
        : null;

    const { user } = useAuth();
    const { userFavorites, handleToggleFavorite } = useFavorites(user, {}, {
      fetchGlobalCounts: false,
      skipRemoteInTest: true,
    });
    const { isIOS, isPushSupported, isStandalone, triggerCustomA2HSModal, showToast } = usePWA();
    const showIosA2hsShortcut = Boolean(isIOS && !isPushSupported && !isStandalone);

    const isFavorite = useMemo(
      () =>
        activeApt
          ? isApartmentInFavorites(userFavorites, selectedCanonical) ||
            isApartmentInFavorites(userFavorites, selectedDisplay)
          : false,
      [activeApt, userFavorites, selectedCanonical, selectedDisplay]
    );

    const handleSelectAptTab = useCallback(
      (idx: number, item: GuideRetentionAptItem) => {
        setSelectedIdx(idx);
        trackEvent('guide_retention_apt_select', {
          guide_slug: guideSlug,
          apt_name: item.displayName || item.name,
          apartment_name: item.canonicalSlug || item.name,
          dong: item.dong || undefined,
          surface,
          trigger: 'apt_selector_pill',
        });
      },
      [guideSlug, surface]
    );

    const handleWatchlistClick = useCallback(() => {
      if (!activeApt) return;
      const nextIsFavorite = !isFavorite;
      trackEvent('watchlist_toggle_favorite', {
        apt_name: selectedDisplay,
        apartment_name: selectedCanonical,
        canonical_slug: selectedCanonical,
        dong: selectedDong,
        is_favorite: nextIsFavorite,
        guide_slug: guideSlug,
        surface,
        trigger: 'guide_watchlist_btn',
      });
      void handleToggleFavorite(selectedCanonical);
      if (nextIsFavorite) {
        showToast?.(
          `${selectedDisplay} 로그인 없이 관심단지에 찜했습니다 · 평일 07시 실거래 알림도 켜보세요`
        );
      }
    }, [
      activeApt,
      isFavorite,
      selectedDisplay,
      selectedCanonical,
      selectedDong,
      guideSlug,
      surface,
      handleToggleFavorite,
      showToast,
    ]);

    const handleOpenPushModal = useCallback(() => {
      trackEvent('push_modal_open', {
        surface,
        trigger: 'morning_7am_cta',
        apt_name: selectedDisplay,
        apartment_name: selectedCanonical,
        dong: selectedDong,
        guide_slug: guideSlug,
      });
      setIsPushModalOpen(true);
    }, [surface, selectedDisplay, selectedCanonical, selectedDong, guideSlug]);

    const handleOpenIosA2hs = useCallback(() => {
      trackEvent('a2hs_modal_open', {
        surface,
        trigger: 'guide_ios_retention_bridge',
        apt_name: selectedDisplay,
        apartment_name: selectedCanonical,
        dong: selectedDong,
        guide_slug: guideSlug,
      });
      triggerCustomA2HSModal?.();
    }, [surface, selectedDisplay, selectedCanonical, selectedDong, guideSlug, triggerCustomA2HSModal]);

    return (
      <section
        id={sectionId}
        data-testid="guide-morning-alert-retention-card"
        aria-label="오전 7시 실거래 알림 및 관심단지 저장"
        className="scroll-mt-40 md:scroll-mt-48 w-full min-h-[132px] rounded-2xl bg-[#f9fafb] dark:bg-[#17171c] p-4 sm:p-5 space-y-3.5 transition-colors box-border"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span className={getVisualSignalPillClass('down', 'tabular-nums')}>
              <BellRing size={11} className="shrink-0" />
              <span>평일 07:00</span>
            </span>
            <span className={getVisualSignalPillClass('safe')}>
              <Star size={11} className="shrink-0" />
              <span>비로그인 1초 찜</span>
            </span>
            <h3 className="text-sm sm:text-[15px] font-black text-primary tracking-tight">
              실거래 신고 즉시 오전 7시 알림 받기
            </h3>
          </div>
          <span className="text-[11.5px] font-bold text-secondary tabular-nums">
            05:38~06:38 국토부 동기화 직후 브리핑
          </span>
        </div>

        {candidateApts.length > 0 && (
          <div
            data-testid="guide-retention-apt-selector"
            role="tablist"
            aria-label="알림 받을 대표 단지 선택"
            className={getToggleTrackClass(
              'flex items-center overflow-x-auto overscroll-x-contain no-scrollbar max-w-full w-fit'
            )}
          >
            {candidateApts.map((apt, idx) => {
              const isSelected = idx === safeIdx;
              const priceChip =
                typeof apt.latestPrice === 'number' &&
                apt.latestPrice > 0 &&
                apt.latestPriceStr &&
                apt.latestPriceStr !== '정보 없음'
                  ? apt.latestPriceStr
                  : null;
              return (
                <button
                  key={`retention-apt-${apt.canonicalSlug}-${idx}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  data-testid={`guide-retention-apt-tab-${idx}`}
                  onClick={() => handleSelectAptTab(idx, apt)}
                  className={getToggleBtnClass({
                    active: isSelected,
                    size: 'sm',
                    tone: 'blue',
                    extraClass: 'tabular-nums',
                  })}
                >
                  <span>{apt.displayName || apt.name}</span>
                  {priceChip && (
                    <span className="text-[10.5px] font-extrabold text-emerald-700 dark:text-emerald-400">
                      {priceChip}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-1">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs sm:text-[13px] font-extrabold text-primary truncate tabular-nums">
              <span>{selectedDisplay}</span>
              {selectedDong ? <span className="text-tertiary"> · {selectedDong}</span> : null}
              {verifiedPriceLabel ? (
                <span className="text-emerald-700 dark:text-emerald-400">
                  {' '}
                  · 최근 실거래 {verifiedPriceLabel}
                </span>
              ) : null}
            </p>
            <p
              data-testid="guide-retention-summary-copy"
              className="text-[11.5px] font-semibold text-secondary sm:truncate tabular-nums"
            >
              로그인 없이 관심단지 저장 · 평일 07시 매매·전세 변동 요약 발송
            </p>
          </div>

          <div className="w-full sm:w-auto max-w-full min-w-0 flex flex-col sm:flex-row sm:flex-nowrap items-stretch sm:items-center gap-2 shrink-0">
            {activeApt ? (
              <>
                <div className="flex items-center gap-2 w-full sm:w-auto min-w-0 shrink-0">
                  <button
                    type="button"
                    data-testid="guide-retention-watchlist-btn"
                    aria-pressed={isFavorite}
                    onClick={handleWatchlistClick}
                    className={
                      isFavorite
                        ? 'min-h-[38px] py-2 px-2.5 sm:px-3.5 flex-1 sm:flex-initial min-w-0 whitespace-nowrap justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 text-[11.5px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 leading-snug transition-colors cursor-pointer'
                        : 'min-h-[38px] py-2 px-2.5 sm:px-3.5 flex-1 sm:flex-initial min-w-0 whitespace-nowrap justify-center rounded-xl bg-surface hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 text-secondary hover:text-blue-600 dark:hover:text-blue-400 text-[11.5px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 leading-snug transition-colors cursor-pointer'
                    }
                  >
                    {isFavorite ? (
                      <>
                        <Check size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="truncate">관심 저장됨</span>
                      </>
                    ) : (
                      <>
                        <Star size={14} className="shrink-0" />
                        <span className="truncate">+ 관심단지 담기</span>
                      </>
                    )}
                  </button>

                  {showIosA2hsShortcut && (
                    <button
                      type="button"
                      data-testid="guide-ios-a2hs-shortcut-btn"
                      aria-label="아이폰·아이패드 홈 화면 추가 안내 열기"
                      onClick={handleOpenIosA2hs}
                      className="min-h-[38px] py-2 px-2.5 sm:px-3.5 flex-1 sm:flex-initial min-w-0 whitespace-nowrap justify-center rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11.5px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 leading-snug transition-colors cursor-pointer"
                    >
                      <Smartphone size={14} className="shrink-0" />
                      <span className="sm:hidden truncate">홈 추가</span>
                      <span className="hidden sm:inline truncate">아이폰 홈 화면 추가</span>
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  data-testid="guide-morning-7am-push-btn"
                  data-post-favorite-nudge={isFavorite ? 'true' : 'false'}
                  onClick={handleOpenPushModal}
                  className={`min-h-[38px] py-2 px-3 sm:px-4 w-full sm:w-auto min-w-0 whitespace-nowrap justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11.5px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 leading-snug text-center transition-colors cursor-pointer shadow-2xs tabular-nums ${
                    isFavorite ? 'ring-2 ring-blue-500/30' : ''
                  }`}
                >
                  <BellRing size={14} className="shrink-0" />
                  <span className="truncate">
                    {isFavorite
                      ? '관심 저장됨 · 평일 07시 변동 알림 켜기'
                      : '이 단지 실거래 신고 즉시 오전 7시 알림 받기'}
                  </span>
                </button>
              </>
            ) : (
              <div
                data-testid="guide-retention-empty-apt-action-row"
                className="flex items-center gap-2 w-full sm:w-auto min-w-0"
              >
                {showIosA2hsShortcut && (
                  <button
                    type="button"
                    data-testid="guide-ios-a2hs-shortcut-btn"
                    aria-label="아이폰·아이패드 홈 화면 추가 안내 열기"
                    onClick={handleOpenIosA2hs}
                    className="min-h-[38px] py-2 px-2 sm:px-3.5 shrink-0 whitespace-nowrap justify-center rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-[11.5px] sm:text-xs font-extrabold inline-flex items-center gap-1 leading-snug transition-colors cursor-pointer"
                  >
                    <Smartphone size={14} className="shrink-0" />
                    <span className="sm:hidden">홈 추가</span>
                    <span className="hidden sm:inline">아이폰 홈 화면 추가</span>
                  </button>
                )}

                <button
                  type="button"
                  data-testid="guide-morning-7am-push-btn"
                  onClick={handleOpenPushModal}
                  className="min-h-[38px] py-2 px-3 sm:px-4 flex-1 sm:flex-initial min-w-0 whitespace-nowrap justify-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[11.5px] sm:text-xs font-extrabold inline-flex items-center gap-1.5 leading-snug text-center transition-colors cursor-pointer shadow-2xs"
                >
                  <BellRing size={14} className="shrink-0" />
                  <span className="truncate">실거래 신고 즉시 오전 7시 알림 받기</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <PushSubscriptionModal
          isOpen={isPushModalOpen}
          onClose={() => setIsPushModalOpen(false)}
          aptName={selectedDisplay}
          canonicalSlug={selectedCanonical}
          dong={selectedDong}
          guideSlug={guideSlug}
        />
      </section>
    );
  }
);

export default GuideMorningAlertRetentionCard;
