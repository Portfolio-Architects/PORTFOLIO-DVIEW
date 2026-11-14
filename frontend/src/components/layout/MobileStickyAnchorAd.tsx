'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X } from 'lucide-react';
import { AdSlot } from '@/components/ads/AdSlot';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';

export const MOBILE_ANCHOR_SLOT_ENV_KEY = 'NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR';
export const MOBILE_ANCHOR_REFRESH_SLOT_ID = 'mobile_sticky_anchor';
export const MOBILE_ANCHOR_MEDIA_QUERY = '(max-width: 767px)';

export interface MobileStickyAnchorAdProps {
  refreshSlotId?: string;
  className?: string;
}

/**
 * MobileStickyAnchorAd (P1-1 / P0-1 Desktop Zero-Mount Guard):
 * Mobile-only sticky bottom anchor ad banner bound to NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR
 * (resolved automatically via AdSlot format="horizontal-strip").
 * - Conditionally mounts ONLY when viewport matches `(max-width: 767px)` so `<AdSlot>` never
 *   executes `adsbygoogle.push({})` at width `0px` on desktop (`>= 768px`) viewports.
 * - Positioned above MobileDock (bottom-[calc(env(safe-area-inset-bottom)+68px)], z-[9990], md:hidden)
 *   to guarantee zero overlap with MobileDock (z-[10000]).
 * - Automatically hides when virtual keyboard is open (visualViewport height < 75%) or dismissed.
 * - Freezes/resumes smart refresh via adRefreshManager.handleVisibilityChange on document.hidden changes.
 */
export function MobileStickyAnchorAd({
  refreshSlotId = MOBILE_ANCHOR_REFRESH_SLOT_ID,
  className = '',
}: MobileStickyAnchorAdProps) {
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState<boolean>(false);
  const wasMobileViewportRef = useRef<boolean>(false);

  const isApprovalMode = process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE === 'true';
  const anchorSlotId = process.env.NEXT_PUBLIC_ADSENSE_SLOT_ANCHOR?.trim() || '';

  useEffect(() => {
    if (typeof window === 'undefined' || isApprovalMode || isDismissed) return;

    const syncViewportMatch = (matches: boolean) => {
      if (wasMobileViewportRef.current && !matches) {
        adRefreshManager.unobserve(refreshSlotId);
      }
      if (!matches) {
        setIsKeyboardOpen(false);
      }
      wasMobileViewportRef.current = matches;
      setIsMobileViewport(matches);
    };

    const cleanupObservedSlot = () => {
      if (wasMobileViewportRef.current) {
        adRefreshManager.unobserve(refreshSlotId);
        wasMobileViewportRef.current = false;
      }
    };

    if (typeof window.matchMedia !== 'function') {
      const checkFallbackWidth = () => {
        syncViewportMatch(window.innerWidth <= 767);
      };
      checkFallbackWidth();
      window.addEventListener('resize', checkFallbackWidth, { passive: true });
      return () => {
        window.removeEventListener('resize', checkFallbackWidth);
        cleanupObservedSlot();
      };
    }

    const mql = window.matchMedia(MOBILE_ANCHOR_MEDIA_QUERY);
    syncViewportMatch(Boolean(mql.matches));

    const handleMediaChange = (event: MediaQueryListEvent) => {
      syncViewportMatch(Boolean(event.matches));
    };

    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleMediaChange);
      return () => {
        mql.removeEventListener('change', handleMediaChange);
        cleanupObservedSlot();
      };
    }

    if (typeof mql.addListener === 'function') {
      mql.addListener(handleMediaChange);
      return () => {
        mql.removeListener(handleMediaChange);
        cleanupObservedSlot();
      };
    }

    return cleanupObservedSlot;
  }, [isApprovalMode, isDismissed, refreshSlotId]);

  useEffect(() => {
    if (typeof document === 'undefined' || isApprovalMode || isDismissed || !isMobileViewport) {
      return;
    }

    const syncVisibilityState = () => {
      const hidden = Boolean(document.hidden);
      setIsDocumentHidden(hidden);
      adRefreshManager.handleVisibilityChange(hidden);
    };

    syncVisibilityState();
    document.addEventListener('visibilitychange', syncVisibilityState);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibilityState);
    };
  }, [isApprovalMode, isDismissed, isMobileViewport]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !window.visualViewport ||
      isApprovalMode ||
      isDismissed ||
      !isMobileViewport
    ) {
      return;
    }

    const handleViewportResize = () => {
      if (!window.visualViewport) return;
      const isKbd = window.visualViewport.height < window.innerHeight * 0.75;
      setIsKeyboardOpen(isKbd);
    };

    handleViewportResize();
    window.visualViewport.addEventListener('resize', handleViewportResize);
    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
    };
  }, [isApprovalMode, isDismissed, isMobileViewport]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    adRefreshManager.unobserve(refreshSlotId);
  }, [refreshSlotId]);

  if (isApprovalMode || isDismissed || !isMobileViewport) {
    return null;
  }

  return (
    <aside
      id="mobile-sticky-anchor-ad"
      data-testid="mobile-sticky-anchor-ad"
      data-ad-slot-env={MOBILE_ANCHOR_SLOT_ENV_KEY}
      data-anchor-slot-id={anchorSlotId}
      data-refresh-paused={isDocumentHidden ? 'true' : 'false'}
      aria-label="모바일 하단 고정 스폰서 배너"
      aria-hidden={isKeyboardOpen ? 'true' : undefined}
      className={`fixed bottom-[calc(env(safe-area-inset-bottom)+68px)] left-0 right-0 z-[9990] md:hidden px-3 pointer-events-none transition-all duration-200 ${
        isKeyboardOpen ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100'
      } ${className}`.trim()}
    >
      <div
        className={`relative mx-auto w-full max-w-[480px] min-h-[50px] sm:min-h-[90px] rounded-xl bg-elevated dark:bg-slate-900 shadow-lg flex flex-col justify-center overflow-hidden ${
          isKeyboardOpen ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
      >
        <button
          type="button"
          onClick={handleDismiss}
          data-testid="mobile-sticky-anchor-close"
          aria-label="하단 고정 광고 닫기"
          className="absolute top-1 right-1 z-20 inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900/60 text-slate-100 hover:bg-slate-900/80 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
        <AdSlot
          format="horizontal-strip"
          refreshSlotId={refreshSlotId}
          minHeightClass="min-h-[50px] sm:min-h-[90px]"
          fallbackType="cpa"
          className="w-full"
        />
      </div>
    </aside>
  );
}

export default MobileStickyAnchorAd;
