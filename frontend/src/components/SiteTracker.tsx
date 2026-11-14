'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldCheck, ShieldOff, X } from 'lucide-react';
import { logger } from '@/lib/services/logger';
import {
  type AdminToggleNotice,
  applyGaDisableFlag,
  isAdminTrackingExcludedClient,
  setAdminTrackingExclusion,
  syncAdminTrackingStateClient,
} from '@/lib/utils/adminExclusion';

const NOTICE_MESSAGES: Record<
  AdminToggleNotice,
  { title: string; subtitle: string; isExcluded: boolean }
> = {
  enabled: {
    title: '관리자 기기 등록 완료',
    subtitle: '이 브라우저의 방문과 이벤트는 GA4 및 통계에서 제외됩니다.',
    isExcluded: true,
  },
  disabled: {
    title: '관리자 제외 해제 완료',
    subtitle: '이제 일반 방문자와 동일하게 GA4 통계에 집계됩니다.',
    isExcluded: false,
  },
  status_on: {
    title: '관리자 제외 활성 상태',
    subtitle: '현재 이 기기는 GA4 및 방문자 집계에서 제외되고 있습니다.',
    isExcluded: true,
  },
  status_off: {
    title: '관리자 제외 비활성 상태',
    subtitle: '현재 이 기기는 일반 방문자로 GA4에 집계되고 있습니다.',
    isExcluded: false,
  },
};

/**
 * Global Site Tracker & Admin Exclusion Controller
 * Mounts once per app load. Synchronizes admin device exclusion (`?dview_admin=1|0|status`)
 * and enforces `window['ga-disable-...']` without triggering serverless POST /api/traffic calls.
 */
const SiteTracker = React.memo(function SiteTracker() {
  const [notice, setNotice] = useState<AdminToggleNotice | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const diagnosticHoldRef = useRef<boolean>(false);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const showNotice = useCallback(
    (nextNotice: AdminToggleNotice) => {
      clearDismissTimer();
      setNotice(nextNotice);
      const delayMs = nextNotice === 'status_off' ? 8000 : 4500;
      dismissTimerRef.current = setTimeout(() => {
        setNotice(null);
        dismissTimerRef.current = null;
      }, delayMs);
    },
    [clearDismissTimer]
  );

  const handleEnableExclusionFromToast = useCallback(() => {
    try {
      diagnosticHoldRef.current = false;
      setAdminTrackingExclusion(true, process.env.NEXT_PUBLIC_GA_ID);
      showNotice('enabled');
    } catch (e) {
      logger.warn('SiteTracker', 'Failed to enable admin exclusion from toast', undefined, e);
    }
  }, [showNotice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncGaFlagOnly = () => {
      try {
        const excluded = isAdminTrackingExcludedClient();
        if (excluded) {
          diagnosticHoldRef.current = false;
          setAdminTrackingExclusion(true, process.env.NEXT_PUBLIC_GA_ID);
        } else if (diagnosticHoldRef.current) {
          applyGaDisableFlag(true, process.env.NEXT_PUBLIC_GA_ID);
        } else {
          applyGaDisableFlag(false, process.env.NEXT_PUBLIC_GA_ID);
        }
      } catch (e) {
        logger.warn('SiteTracker', 'Failed to sync GA disable flag', undefined, e);
      }
    };

    const syncFullAdminState = () => {
      try {
        const toggleResult = syncAdminTrackingStateClient(process.env.NEXT_PUBLIC_GA_ID);
        if (toggleResult) {
          diagnosticHoldRef.current = toggleResult === 'status_off';
          showNotice(toggleResult);
        } else {
          syncGaFlagOnly();
        }
      } catch (e) {
        logger.warn('SiteTracker', 'SiteTracker error', undefined, e);
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncGaFlagOnly();
      }
    };

    let wrappedPushState: History['pushState'] | null = null;
    let originalPushState: History['pushState'] | null = null;
    try {
      if (window.history && typeof window.history.pushState === 'function') {
        originalPushState = window.history.pushState;
        const capturedOriginal = originalPushState;
        wrappedPushState = (...args: Parameters<History['pushState']>) => {
          const result = capturedOriginal.apply(window.history, args);
          const nextUrl = args[2];
          if (
            typeof nextUrl !== 'undefined' &&
            nextUrl !== null &&
            /(?:^|[?&])dview_admin(?:=|$|#)/i.test(String(nextUrl))
          ) {
            syncFullAdminState();
          }
          return result;
        };
        window.history.pushState = wrappedPushState;
      }
    } catch {
      wrappedPushState = null;
      originalPushState = null;
    }

    syncFullAdminState();

    window.addEventListener('storage', syncGaFlagOnly);
    window.addEventListener('pageshow', syncGaFlagOnly);
    window.addEventListener('focus', syncGaFlagOnly);
    window.addEventListener('popstate', syncFullAdminState);
    window.addEventListener('hashchange', syncFullAdminState);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      clearDismissTimer();
      if (
        wrappedPushState &&
        originalPushState &&
        window.history &&
        window.history.pushState === wrappedPushState
      ) {
        try {
          window.history.pushState = originalPushState;
        } catch {
          // Ignore read-only history restoration errors
        }
      }
      window.removeEventListener('storage', syncGaFlagOnly);
      window.removeEventListener('pageshow', syncGaFlagOnly);
      window.removeEventListener('focus', syncGaFlagOnly);
      window.removeEventListener('popstate', syncFullAdminState);
      window.removeEventListener('hashchange', syncFullAdminState);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [clearDismissTimer, showNotice]);

  if (!notice) {
    return null;
  }

  const info = NOTICE_MESSAGES[notice];

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="dview-admin-exclusion-toast"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-slate-50 shadow-lg backdrop-blur-sm"
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            info.isExcluded
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-slate-800 text-slate-300'
          }`}
        >
          {info.isExcluded ? (
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ShieldOff className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-50">{info.title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-300">{info.subtitle}</p>
          {notice === 'status_off' && (
            <button
              type="button"
              data-testid="dview-admin-enable-btn"
              onClick={handleEnableExclusionFromToast}
              className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              <span>이 기기 제외 등록</span>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            clearDismissTimer();
            setNotice(null);
          }}
          aria-label="알림 닫기"
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
});

SiteTracker.displayName = 'SiteTracker';
export default SiteTracker;
