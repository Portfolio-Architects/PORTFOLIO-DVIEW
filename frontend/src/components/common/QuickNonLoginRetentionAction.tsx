'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { BellRing, Check, Star } from 'lucide-react';
import { useFavorites, isApartmentInFavorites } from '@/hooks/useFavorites';
import { usePWA } from '@/components/pwa/PWAProvider';
import PushSubscriptionModal from '@/components/pwa/PushSubscriptionModal';
import { getDisplayAptName, resolveCanonicalAptSlug } from '@/lib/utils/apartmentMapping';
import { trackEvent } from '@/lib/utils/analytics';

export interface QuickRetentionPushTarget {
  aptName: string;
  canonicalSlug: string;
  dong?: string;
  guideSlug?: string;
}

export interface QuickNonLoginRetentionActionProps {
  aptName: string;
  displayAptName?: string;
  canonicalSlug?: string;
  dong?: string;
  guideSlug?: string;
  surface: string;
  triggerPrefix?: string;
  size?: 'xs' | 'sm';
  compactMobileLabels?: boolean;
  favUnselectedLabel?: string;
  favSelectedLabel?: string;
  alertLabel?: string;
  alertPostFavLabel?: string;
  testIdPrefix?: string;
  className?: string;
  onOpenPushModal?: (target: QuickRetentionPushTarget) => void;
}

export const QuickNonLoginRetentionAction = React.memo(function QuickNonLoginRetentionAction({
  aptName,
  displayAptName,
  canonicalSlug,
  dong,
  guideSlug,
  surface,
  triggerPrefix = 'quick_retention',
  size = 'sm',
  compactMobileLabels = false,
  favUnselectedLabel,
  favSelectedLabel,
  alertLabel,
  alertPostFavLabel,
  testIdPrefix = 'quick-retention',
  className = '',
  onOpenPushModal,
}: QuickNonLoginRetentionActionProps) {
  const [isLocalPushModalOpen, setIsLocalPushModalOpen] = useState(false);

  const cleanDong = useMemo(() => {
    const trimmed = typeof dong === 'string' ? dong.trim() : '';
    return trimmed || undefined;
  }, [dong]);

  const resolvedDisplay = useMemo(() => {
    const raw = (displayAptName || aptName || '').trim();
    if (!raw) return '관심 단지';
    return displayAptName ? raw : getDisplayAptName(raw) || raw;
  }, [displayAptName, aptName]);

  const resolvedCanonical = useMemo(() => {
    const explicit = typeof canonicalSlug === 'string' ? canonicalSlug.trim() : '';
    if (explicit) {
      return resolveCanonicalAptSlug(explicit, cleanDong ? { dong: cleanDong } : undefined) || explicit;
    }
    const base = (aptName || displayAptName || '').trim();
    if (!base) return '';
    return resolveCanonicalAptSlug(base, cleanDong ? { dong: cleanDong } : undefined) || base;
  }, [canonicalSlug, aptName, displayAptName, cleanDong]);

  const { userFavorites, handleToggleFavorite } = useFavorites(undefined, {}, {
    fetchGlobalCounts: false,
    skipRemoteInTest: true,
  });
  const { showToast } = usePWA();

  const isFavorite = useMemo(() => {
    if (!resolvedCanonical) return false;
    return (
      isApartmentInFavorites(userFavorites, resolvedCanonical) ||
      (aptName ? isApartmentInFavorites(userFavorites, aptName) : false) ||
      isApartmentInFavorites(userFavorites, resolvedDisplay)
    );
  }, [userFavorites, resolvedCanonical, aptName, resolvedDisplay]);

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!resolvedCanonical) return;

      const nextIsFavorite = !isFavorite;
      trackEvent('watchlist_toggle_favorite', {
        apt_name: resolvedDisplay,
        apartment_name: resolvedCanonical,
        canonical_slug: resolvedCanonical,
        ...(cleanDong ? { dong: cleanDong } : {}),
        ...(guideSlug ? { guide_slug: guideSlug } : {}),
        is_favorite: nextIsFavorite,
        surface,
        trigger: `${triggerPrefix}_fav`,
      });

      void handleToggleFavorite(resolvedCanonical);

      if (nextIsFavorite) {
        showToast?.(
          `${resolvedDisplay} 로그인 없이 관심단지에 찜했습니다 · 평일 07시 실거래 알림도 켜보세요`
        );
      }
    },
    [
      resolvedCanonical,
      isFavorite,
      resolvedDisplay,
      cleanDong,
      guideSlug,
      surface,
      triggerPrefix,
      handleToggleFavorite,
      showToast,
    ]
  );

  const handleAlertClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!resolvedCanonical) return;

      const trigger = isFavorite
        ? `${triggerPrefix}_post_fav_7am`
        : `${triggerPrefix}_7am_cta`;

      trackEvent('push_modal_open', {
        surface,
        trigger,
        apt_name: resolvedDisplay,
        apartment_name: resolvedCanonical,
        ...(cleanDong ? { dong: cleanDong } : {}),
        ...(guideSlug ? { guide_slug: guideSlug } : {}),
      });

      if (onOpenPushModal) {
        onOpenPushModal({
          aptName: resolvedDisplay,
          canonicalSlug: resolvedCanonical,
          dong: cleanDong,
          guideSlug,
        });
      } else {
        setIsLocalPushModalOpen(true);
      }
    },
    [
      resolvedCanonical,
      isFavorite,
      triggerPrefix,
      surface,
      resolvedDisplay,
      cleanDong,
      guideSlug,
      onOpenPushModal,
    ]
  );

  if (!resolvedCanonical) {
    return null;
  }

  const isCompact = size === 'xs';
  const useMobileCondensed = Boolean(isCompact && compactMobileLabels);
  const resolvedFavUnselected =
    favUnselectedLabel ?? (isCompact ? '비로그인 찜' : '비로그인 1초 찜');
  const resolvedFavSelected = favSelectedLabel ?? (isCompact ? '찜됨' : '관심 찜됨');
  const resolvedAlertText = isFavorite
    ? alertPostFavLabel ?? '평일 07시 알림'
    : alertLabel ?? (isCompact ? '07시 알림' : '평일 07시 알림');

  const favBtnSizeClass = isCompact
    ? 'h-7 px-2 sm:px-2.5 rounded-lg text-[11px] gap-1'
    : 'min-h-[36px] px-3 py-1.5 rounded-xl text-[11.5px] sm:text-xs gap-1.5';

  const alertBtnSizeClass = isCompact
    ? 'h-7 px-2 sm:px-2.5 rounded-lg text-[11px] gap-1'
    : 'min-h-[36px] px-3 py-1.5 rounded-xl text-[11.5px] sm:text-xs gap-1.5';

  return (
    <>
      <div
        data-testid={`${testIdPrefix}-group`}
        data-is-favorite={isFavorite ? 'true' : 'false'}
        className={`inline-flex items-center gap-1 sm:gap-1.5 shrink-0 ${className}`.trim()}
      >
        <button
          type="button"
          data-testid={`${testIdPrefix}-fav-btn`}
          aria-pressed={isFavorite}
          aria-label={`${resolvedDisplay} ${isFavorite ? '비로그인 관심단지 찜 해제' : '비로그인 관심단지 1초 찜하기'}`}
          onClick={handleFavoriteClick}
          className={`${favBtnSizeClass} inline-flex items-center justify-center font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
            isFavorite
              ? 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
              : 'bg-surface hover:bg-blue-50 dark:bg-[#202027] dark:hover:bg-blue-950/40 border border-slate-200/90 dark:border-slate-700 text-primary hover:text-blue-600 dark:hover:text-blue-400'
          }`}
        >
          {isFavorite ? (
            <Check
              size={isCompact ? 12 : 13}
              strokeWidth={2.5}
              className="shrink-0 text-emerald-600 dark:text-emerald-400"
            />
          ) : (
            <Star size={isCompact ? 12 : 13} strokeWidth={2.3} className="shrink-0 text-blue-600 dark:text-blue-400" />
          )}
          {isFavorite ? (
            <span>{resolvedFavSelected}</span>
          ) : useMobileCondensed && favUnselectedLabel === undefined ? (
            <span>
              <span className="hidden sm:inline">비로그인 </span>찜
            </span>
          ) : (
            <span>{resolvedFavUnselected}</span>
          )}
        </button>

        <button
          type="button"
          data-testid={`${testIdPrefix}-7am-btn`}
          data-post-favorite-nudge={isFavorite ? 'true' : 'false'}
          aria-label={`${resolvedDisplay} 평일 오전 7시 실거래 변동 알림 설정`}
          onClick={handleAlertClick}
          className={`${alertBtnSizeClass} inline-flex items-center justify-center font-extrabold whitespace-nowrap shrink-0 transition-colors cursor-pointer tabular-nums ${
            isFavorite
              ? 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent shadow-2xs ring-2 ring-blue-500/25'
              : 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent'
          }`}
        >
          <BellRing size={isCompact ? 11 : 13} strokeWidth={2.4} className="shrink-0" />
          {useMobileCondensed &&
          ((isFavorite && alertPostFavLabel === undefined) ||
            (!isFavorite && alertLabel === undefined)) ? (
            <span>
              {isFavorite ? <span className="hidden sm:inline">평일 </span> : null}
              07시
              <span className="hidden sm:inline"> 알림</span>
            </span>
          ) : (
            <span>{resolvedAlertText}</span>
          )}
        </button>
      </div>

      {!onOpenPushModal && isLocalPushModalOpen && (
        <PushSubscriptionModal
          isOpen={isLocalPushModalOpen}
          onClose={() => setIsLocalPushModalOpen(false)}
          aptName={resolvedDisplay}
          canonicalSlug={resolvedCanonical}
          dong={cleanDong}
          guideSlug={guideSlug}
        />
      )}
    </>
  );
});

export default QuickNonLoginRetentionAction;
