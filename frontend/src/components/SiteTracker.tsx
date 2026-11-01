'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldOff, X } from 'lucide-react';
import { incrementWebsiteVisit } from '@/lib/repositories/traffic.repository';
import { logger } from '@/lib/services/logger';
import {
  type AdminToggleNotice,
  isAdminTrackingExcludedClient,
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
 * Mounts once per app load. Synchronizes admin device exclusion (`?dview_admin=1|0|status`),
 * enforces `window['ga-disable-...']`, and increments daily websiteVisit counter for real visitors only.
 */
const SiteTracker = React.memo(function SiteTracker() {
  const [notice, setNotice] = useState<AdminToggleNotice | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    try {
      const toggleResult = syncAdminTrackingStateClient(process.env.NEXT_PUBLIC_GA_ID);
      if (toggleResult) {
        setNotice(toggleResult);
        dismissTimer = setTimeout(() => {
          setNotice(null);
        }, 4500);
      }

      // Exclude Admin from tracking
      if (isAdminTrackingExcludedClient()) {
        return () => {
          if (dismissTimer) clearTimeout(dismissTimer);
        };
      }

      // Get current date string in KST
      const d = new Date();
      d.setHours(d.getHours() + 9);
      const today = d.toISOString().split('T')[0];

      const lastVisit = localStorage.getItem('dview_last_visit');
      if (lastVisit !== today) {
        localStorage.setItem('dview_last_visit', today);
        // Fire & Forget: increment global stats
        incrementWebsiteVisit().catch((err) => {
          logger.error('SiteTracker.visitIncrement', 'Failed to increment website visit', undefined, err);
        });
      }
    } catch (e) {
      logger.warn('SiteTracker', 'SiteTracker error', undefined, e);
    }

    return () => {
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, []);

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
        </div>
        <button
          type="button"
          onClick={() => setNotice(null)}
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
