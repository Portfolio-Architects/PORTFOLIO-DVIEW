'use client';

import React, { useState, useEffect } from 'react';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';

export interface OfflineBannerProps {
  variant?: 'global' | 'inline';
  isStale?: boolean;
  onRefresh?: () => void;
  className?: string;
}

/**
 * Global floating banner that appears when the user goes offline,
 * and briefly shows a "reconnected" message when they come back online.
 */
export const GlobalOfflineBanner = React.memo(function GlobalOfflineBanner() {
  const isOnline = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, mounted]);

  if (!mounted || (isOnline && !showReconnected)) return null;

  return (
    <div
      role={isOnline ? 'status' : 'alert'}
      aria-live={isOnline ? 'polite' : 'assertive'}
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2.5 px-4 text-[13px] md:text-[13.5px] font-extrabold shadow-sm border-b backdrop-blur-md transition-all duration-300 animate-in slide-in-from-top ${
        isOnline
          ? 'bg-emerald-50/90 dark:bg-[#003829]/80 text-[#057e77] dark:text-emerald-400 border-[#057e77]/20 dark:border-[#057e77]/30'
          : 'bg-rose-50/95 dark:bg-rose-950/85 text-[#df223b] dark:text-[#f87171] border-rose-100 dark:border-rose-900/30'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi size={15} strokeWidth={2.5} aria-hidden="true" />
          네트워크가 다시 연결되었습니다
        </>
      ) : (
        <>
          <WifiOff size={15} strokeWidth={2.5} aria-hidden="true" />
          오프라인 상태입니다 — 일부 기능이 제한될 수 있습니다
        </>
      )}
    </div>
  );
});

GlobalOfflineBanner.displayName = 'GlobalOfflineBanner';

/**
 * Inline card widget indicating stale cached data or offline state.
 */
export const InlineOfflineBanner = React.memo(function InlineOfflineBanner({
  isStale = false,
  onRefresh,
  className = '',
}: OfflineBannerProps) {
  const isOnline = useNetworkStatus();
  const [dismissed, setDismissed] = useState(false);

  // Reset dismissal state when connection changes
  useEffect(() => {
    setDismissed(false);
  }, [isOnline]);

  if (isOnline && !isStale) {
    return null;
  }

  if (dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`w-full transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${className}`}
    >
      <div
        className={`px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-lg flex items-center justify-between gap-3 text-[13px] font-medium border ${
          !isOnline
            ? 'bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/30 text-amber-900 dark:text-amber-200'
            : 'bg-blue-500/10 dark:bg-blue-950/40 border-blue-500/30 text-blue-900 dark:text-blue-200'
        }`}
      >
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {!isOnline ? (
            <span className="p-1 rounded-lg bg-amber-500/20 shrink-0 text-amber-600 dark:text-amber-400">
              <WifiOff size={16} />
            </span>
          ) : (
            <span className="p-1 rounded-lg bg-blue-500/20 shrink-0 text-blue-600 dark:text-blue-400 animate-spin">
              <RefreshCw size={16} />
            </span>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2 truncate">
            <span className="font-black text-[13.5px]">
              {!isOnline ? '오프라인 모드' : '캐시 데이터 표시 중'}
            </span>
            <span className="text-[12.5px] opacity-90 truncate">
              {!isOnline
                ? '네트워크 연결이 끊어졌습니다. 로컬에 저장된 캐시 정보가 제공됩니다.'
                : '최신 정보를 동기화하는 동안 오프라인 캐시 데이터를 표시합니다.'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && isOnline && (
            <button
              onClick={onRefresh}
              className="px-2.5 py-1 text-[12px] font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              새로고침
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            title="닫기"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  );
});

InlineOfflineBanner.displayName = 'InlineOfflineBanner';

/**
 * Unified polymorphic OfflineBanner supporting both global floating and inline modes.
 */
export function OfflineBanner(props: OfflineBannerProps) {
  if (
    props.variant === 'inline' ||
    (props.variant !== 'global' && (props.isStale !== undefined || props.onRefresh !== undefined))
  ) {
    return <InlineOfflineBanner {...props} />;
  }
  return <GlobalOfflineBanner />;
}

OfflineBanner.displayName = 'OfflineBanner';

export { GlobalOfflineBanner as OfflineBannerGlobal, InlineOfflineBanner as OfflineBannerUI };
export default OfflineBanner;
