'use client';

import React, { useEffect, useState } from 'react';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { WifiOff, Wifi } from 'lucide-react';

/**
 * Floating banner that appears when the user goes offline,
 * and briefly shows a "reconnected" message when they come back online.
 */
const OfflineBanner = React.memo(function OfflineBanner() {
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
          ? 'bg-[#fff3e0]/90 dark:bg-[#003829]/80 text-[#ff8f00] dark:text-[#ea6100] border-[#ea6100]/15 dark:border-[#ea6100]/25'
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

OfflineBanner.displayName = 'OfflineBanner';
export default OfflineBanner;
