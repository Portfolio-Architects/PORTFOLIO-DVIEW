'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { enqueueOfflineRequest, retryOfflineRequests } from '@/lib/utils/offlineQueue';
import { usePathname, useSearchParams } from 'next/navigation';
import { initSafeReloadDiagnostics } from '@/lib/utils/safeReload';
import { logger } from '@/lib/services/logger';




// BeforeInstallPromptEvent type declaration
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAContextType {
  isInstallable: boolean;
  deferredPrompt: BeforeInstallPromptEvent | null;
  triggerA2HSPrompt: () => Promise<boolean>;
  showCustomA2HSModal: boolean;
  setShowCustomA2HSModal: (show: boolean) => void;
  triggerCustomA2HSModal: () => void;
  // Web Push Notifications
  isPushSupported: boolean;
  pushSubscription: PushSubscription | null;
  subscribeToPush: (uid?: string | null, aptName?: string) => Promise<boolean>;
  unsubscribeFromPush: (aptName?: string | null) => Promise<boolean>;
  showToast: (message: string) => void;
  isIOS: boolean;
}

const PWAContext = createContext<PWAContextType>({
  isInstallable: false,
  deferredPrompt: null,
  triggerA2HSPrompt: async () => false,
  showCustomA2HSModal: false,
  setShowCustomA2HSModal: () => {},
  triggerCustomA2HSModal: () => {},
  isPushSupported: false,
  pushSubscription: null,
  subscribeToPush: async (uid?: string | null, aptName?: string) => false,
  unsubscribeFromPush: async (aptName?: string | null) => false,
  showToast: () => {},
  isIOS: false,
});

export const usePWA = () => useContext(PWAContext);

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}




function NProgressCleaner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const cleanNProgress = () => {
      try {
        const globalNProgress = (window as any).NProgress;
        if (globalNProgress) {
          globalNProgress.done();
        }
        const elements = document.querySelectorAll('#nprogress');
        elements.forEach(el => el.remove());
      } catch (err) {
        // Ignored
      }
    };

    cleanNProgress();
    const timer = setTimeout(cleanNProgress, 150);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return null;
}

export const PWAProvider = React.memo(function PWAProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showCustomA2HSModal, setShowCustomA2HSModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  
  // Push Notification state
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Cache expiration fallback state
  const [showCacheExpiredModal, setShowCacheExpiredModal] = useState(false);
  const [expiredCacheUrl, setExpiredCacheUrl] = useState<string | null>(null);

  // SW Update state
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);

  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const installRewardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pushSupportTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    initSafeReloadDiagnostics();
    return () => {
      mountedRef.current = false;
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (installRewardTimeoutRef.current) clearTimeout(installRewardTimeoutRef.current);
      if (pushSupportTimeoutRef.current) clearTimeout(pushSupportTimeoutRef.current);
    };
  }, []);

  // 🔧 Nextjs-Toploader progress bar cleanup is handled by NProgressCleaner

  // 🔧 모바일 웹 뷰 내 차트 툴팁 호버 잔존 방지 전역 터치 가드
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleGlobalTouch = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target && !target.closest('.recharts-wrapper')) {
        const tooltips = document.querySelectorAll('.recharts-tooltip-wrapper') as NodeListOf<HTMLElement>;
        tooltips.forEach((tooltip) => {
          tooltip.style.opacity = '0';
          tooltip.style.transition = 'opacity 0.12s ease';
        });
      }
    };

    window.addEventListener('touchend', handleGlobalTouch, { passive: true });
    window.addEventListener('touchstart', handleGlobalTouch, { passive: true });

    return () => {
      window.removeEventListener('touchend', handleGlobalTouch);
      window.removeEventListener('touchstart', handleGlobalTouch);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isMounted = true;

    // Trigger initial offline sync queue processing on mount if online
    if (typeof window !== 'undefined' && navigator.onLine) {
      retryOfflineRequests();
    }

    // Clear old SWR localStorage cache to ensure returning users get fresh data
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dview-swr-cache');
      }
    } catch {}

    // iOS detection and manual installation guide eligibility
    const ua = window.navigator.userAgent.toLowerCase();
    const isIphone = ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    if (isIphone) {
      setIsIOS(true);
      if (!isStandalone) {
        setIsInstallable(true);
      }
    }

    // 🔧 Multi-tab LocalStorage synchronization
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'dview_quiz_answers') {
        window.dispatchEvent(new Event('dview_quiz_answers_changed'));
      } else if (e.key === 'dview_viewed_apts') {
        window.dispatchEvent(new Event('dview_viewed_apts_changed'));
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 🔧 Multi-tab Service Worker lifecycle update synchronization
    const handleControllerChange = () => {
      logger.info('PWAProvider', 'Service Worker controller changed. Reloading page to apply updates...');
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        } catch (err) {
          logger.warn('PWAProvider', 'Failed to remove controllerchange listener during reload', undefined, err);
        }
      }
      window.location.reload();
    };

    const isDevEnv = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' || 
      window.location.hostname.indexOf('192.168.') === 0 ||
      window.location.port === '3000' ||
      window.location.port === '5000' ||
      process.env.NODE_ENV === 'development'
    );

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    // 🔧 Online status restoration manual queue replay
    const handleOnlineStatus = () => {
      logger.info('PWAProvider', 'Network restored. Triggering manual offline sync queue replay...');
      retryOfflineRequests();
      // 온라인 복구 시 만료 캐시 경고창 자동 해제
      setShowCacheExpiredModal(false);
    };
    const handleOfflineStatus = () => {
      logger.info('PWAProvider', 'Network connection lost.');
    };
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOfflineStatus);

    // 🔧 Service Worker message handler for cache expiration detection
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'CACHE_EXPIRED_WARNING') {
        if (sessionStorage.getItem('dview_cache_expired_warned') === 'true') {
          return;
        }
        if (typeof window !== 'undefined' && !navigator.onLine) {
          setExpiredCacheUrl(event.data.url);
          setShowCacheExpiredModal(true);
        }
      }
    };
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // 1. A2HS Logic
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowCustomA2HSModal(false);

      // Add PWA reward passes to localStorage
      const currentPasses = Number(localStorage.getItem('dview_free_passes') || '0');
      localStorage.setItem('dview_free_passes', (currentPasses + 3).toString());

      setToastMessage('🎉 홈화면 앱 설치 완료! 모바일에서 더 빠르고 편하게 분석 리포트를 확인해 보세요.');
      if (installRewardTimeoutRef.current) clearTimeout(installRewardTimeoutRef.current);
      installRewardTimeoutRef.current = setTimeout(() => {
        if (isMounted) {
          setToastMessage(null);
        }
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 2. Web Push Support Check
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      if (pushSupportTimeoutRef.current) clearTimeout(pushSupportTimeoutRef.current);
      pushSupportTimeoutRef.current = setTimeout(() => {
        if (isMounted) setIsPushSupported(true);
      }, 0);
      // Check existing subscription
      navigator.serviceWorker.ready.then((reg) => {
        if (!isMounted) return;
        if (reg && reg.pushManager) {
          reg.pushManager.getSubscription().then((sub) => {
            if (isMounted && sub) setPushSubscription(sub);
          }).catch((err) => {
            logger.warn('PWAProvider', 'getSubscription failed', undefined, err);
          });
        }
      }).catch((err) => {
        logger.warn('PWAProvider', 'serviceWorker.ready failed', undefined, err);
      });
    }

    let registeredReg: ServiceWorkerRegistration | null = null;
    let registeredWorker: ServiceWorker | null = null;

    const handleStateChange = () => {
      if (registeredWorker && registeredWorker.state === 'installed' && registeredReg && registeredReg.waiting) {
        setSwUpdateAvailable(true);
      }
    };

    const handleUpdateFound = () => {
      if (!registeredReg) return;
      const newWorker = registeredReg.installing;
      if (newWorker) {
        if (registeredWorker) {
          registeredWorker.removeEventListener('statechange', handleStateChange);
        }
        registeredWorker = newWorker;
        newWorker.addEventListener('statechange', handleStateChange);
      }
    };

    // 🔧 SW Update monitor
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !isDevEnv) {
      navigator.serviceWorker.ready.then((reg) => {
        if (!isMounted) return;
        registeredReg = reg;
        
        // 1. If SW is already waiting to activate
        if (reg.waiting) {
          setSwUpdateAvailable(true);
        }

        // 2. If new SW installation completes
        reg.addEventListener('updatefound', handleUpdateFound);
        
        // Also listen to statechange on current installing worker if present
        if (reg.installing) {
          registeredWorker = reg.installing;
          registeredWorker.addEventListener('statechange', handleStateChange);
        }
      }).catch((err) => {
        logger.warn('PWAProvider', 'serviceWorker.ready failed in update monitor', undefined, err);
      });
    }

    return () => {
      isMounted = false;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOfflineStatus);
      
      if (registeredReg) {
        registeredReg.removeEventListener('updatefound', handleUpdateFound);
      }
      if (registeredWorker) {
        registeredWorker.removeEventListener('statechange', handleStateChange);
      }

      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
          navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
        } catch (err) {
          logger.warn('PWAProvider', 'Cleanup failed for serviceWorker listeners', undefined, err);
        }
      }
    };
  }, []);

  const handleApplyUpdate = useCallback(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        const activeReg = registrations.find(r => r.waiting);
        if (activeReg && activeReg.waiting) {
          logger.info('PWAProvider', 'Applying SW update via SKIP_WAITING...');
          activeReg.waiting.postMessage({ type: 'SKIP_WAITING' });
          // Fallback: 1000ms 경과 후에도 controllerchange 이벤트가 반응하지 않을 경우 강제 새로고침
          setTimeout(() => {
            logger.warn('PWAProvider', 'SW Update fallback reload triggered.');
            window.location.reload();
          }, 1000);
        } else {
          window.location.reload();
        }
      });
    }
  }, []);

  const triggerA2HSPrompt = async () => {
    if (isIOS) return false;
    if (!deferredPrompt) return false;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
      return true;
    }
    return false;
  };

  const triggerCustomA2HSModal = () => {
    if (isInstallable && (deferredPrompt || isIOS)) {
      setShowCustomA2HSModal(true);
    }
  };

  const subscribeToPush = async (uid?: string | null, aptName?: string) => {
    if (typeof window === 'undefined') return false;

    if (!isPushSupported || typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
      throw new Error('UNSUPPORTED_BROWSER');
    }
    try {
      let permission: NotificationPermission;
      try {
        permission = await Notification.requestPermission();
      } catch (permErr) {
        logger.warn('PWAProvider', 'Notification.requestPermission standard promise call failed, trying callback fallback', undefined, permErr);
        permission = await new Promise<NotificationPermission>((resolve) => {
          Notification.requestPermission(resolve);
        });
      }

      if (permission !== 'granted') {
        throw new Error('PERMISSION_DENIED');
      }
      
      const reg = await navigator.serviceWorker.ready;
      if (!reg || !reg.pushManager) {
        throw new Error('REGISTRATION_FAILED');
      }
      
      // Replace with your VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BJfvp3-MGu6cXDWL2GGKO019MjQhLFSwk1zvAIo8QgX31bfCwfjOHHr34iJcGYnhxpJBCsPoXeG6CAXql9KR9Xg';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      
      if (!mountedRef.current) return false;
      setPushSubscription(sub);
      
      // Save subscription to the backend
      if (typeof window !== 'undefined' && !navigator.onLine) {
        try {
          await enqueueOfflineRequest({
            url: '/api/push/subscribe',
            method: 'POST',
            body: { subscription: sub, uid: uid || null, apartmentName: aptName || null }
          });
          if (mountedRef.current) {
            showToast('네트워크가 연결되지 않아 푸시 알림 구독이 오프라인 큐에 저장되었습니다. 연결 시 동기화됩니다 💚');
          }
        } catch (err) {
          logger.error('PWAProvider', 'Failed to enqueue push subscription', undefined, err);
        }
      } else {
        try {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub, uid: uid || null, apartmentName: aptName || null })
          });
          logger.info('PWAProvider', 'Push Subscribed & Saved', { subscription: JSON.stringify(sub), apartmentName: aptName });
        } catch (fetchErr) {
          logger.warn('PWAProvider', 'Failed to save push subscription online, queuing offline', undefined, fetchErr);
          try {
            await enqueueOfflineRequest({
              url: '/api/push/subscribe',
              method: 'POST',
              body: { subscription: sub, uid: uid || null, apartmentName: aptName || null }
            });
            if (mountedRef.current) {
              showToast('네트워크 불안정으로 푸시 알림 구독이 오프라인 큐에 저장되었습니다 💚');
            }
          } catch (err) {
            logger.error('PWAProvider', 'Failed to enqueue push subscription after fetch failure', undefined, err);
          }
        }
      }
      return true;
    } catch (error) {
      logger.error('PWAProvider', 'Error subscribing to push', undefined, error);
      return false;
    }
  };

  const unsubscribeFromPush = async (aptName?: string | null) => {
    if (typeof window === 'undefined') return false;
    if (!pushSubscription) return false;

    try {
      if (typeof window !== 'undefined' && !navigator.onLine) {
        try {
          await enqueueOfflineRequest({
            url: '/api/push/unsubscribe',
            method: 'POST',
            body: { endpoint: pushSubscription.endpoint, apartmentName: aptName || null }
          });
          if (mountedRef.current) {
            showToast('오프라인 상태입니다. 수신 거부 요청이 오프라인 큐에 저장되었습니다 💚');
          }
        } catch (err) {
          logger.error('PWAProvider', 'Failed to enqueue push unsubscribe', undefined, err);
        }
      } else {
        try {
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: pushSubscription.endpoint, apartmentName: aptName || null })
          });
          logger.info('PWAProvider', 'Push Unsubscribed', { endpoint: pushSubscription.endpoint, apartmentName: aptName });
        } catch (fetchErr) {
          logger.warn('PWAProvider', 'Failed to save push unsubscribe online, queuing offline', undefined, fetchErr);
          try {
            await enqueueOfflineRequest({
              url: '/api/push/unsubscribe',
              method: 'POST',
              body: { endpoint: pushSubscription.endpoint, apartmentName: aptName || null }
            });
            if (mountedRef.current) {
              showToast('네트워크 불안정으로 수신 거부 요청이 오프라인 큐에 저장되었습니다 💚');
            }
          } catch (err) {
            logger.error('PWAProvider', 'Failed to enqueue push unsubscribe after fetch failure', undefined, err);
          }
        }
      }

      if (!aptName) {
        await pushSubscription.unsubscribe();
        if (mountedRef.current) {
          setPushSubscription(null);
          showToast('모든 실거래 알림 구독이 해제되었습니다.');
        }
      } else {
        if (mountedRef.current) {
          showToast(`🔔 ${aptName} 알림 구독이 해제되었습니다.`);
        }
      }
      return true;
    } catch (error) {
      logger.error('PWAProvider', 'Error unsubscribing from push', undefined, error);
      return false;
    }
  };

  const showToast = (message: string) => {
    if (!mountedRef.current) return;
    setToastMessage(message);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    
    // Add Soft Haptic vibration for mobile devices supporting it
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([15]);
      } catch (e) {
        // Safe to ignore if blocked by sandbox
      }
    }

    toastTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setToastMessage((prev) => (prev === message ? null : prev));
      }
    }, 3000);
  };

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        deferredPrompt,
        triggerA2HSPrompt,
        showCustomA2HSModal,
        setShowCustomA2HSModal,
        triggerCustomA2HSModal,
        isPushSupported,
        pushSubscription,
        subscribeToPush,
        unsubscribeFromPush,
        showToast,
        isIOS,
      }}
    >
      <React.Suspense fallback={null}>
        <NProgressCleaner />
      </React.Suspense>
      {children}
      {toastMessage && (
        <div key={toastMessage} className="fixed bottom-[calc(env(safe-area-inset-bottom)+24px)] sm:bottom-8 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100%-32px)] max-w-sm bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-md text-white font-extrabold px-5 py-4 rounded-[20px] shadow-2xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-5 duration-300 border border-white/10 select-none overflow-hidden">
          <div className="flex items-center justify-between gap-3 w-full pr-1">
            <span className="text-[12.5px] md:text-[13.5px] leading-relaxed flex-1">{toastMessage}</span>
            <button 
              onClick={() => setToastMessage(null)} 
              className="hover:opacity-85 text-white/80 focus:outline-none text-[10px] font-black cursor-pointer bg-white/10 hover:bg-white/20 rounded-full w-[22px] h-[22px] flex items-center justify-center shrink-0"
            >
              ✕
            </button>
          </div>
          {/* Timeout Progress Bar (Using GPU-accelerated scaleX to avoid Reflows) */}
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-500 origin-left animate-toast-progress" />
        </div>
      )}

      {swUpdateAvailable && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+24px)] sm:bottom-8 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100%-32px)] max-w-sm bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-md text-white font-extrabold px-5 py-4 rounded-[24px] shadow-2xl flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 border border-white/10 select-none">
          <div className="flex items-center gap-2.5">
            <span className="text-[12.5px] leading-relaxed flex-1">
              🚀 새로운 버전의 DVIEW 앱이 준비되었습니다. 최신 시세 정보와 기능을 바로 적용해 보세요!
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleApplyUpdate}
              className="flex-1 bg-[#00d29d] hover:bg-[#00b083] text-neutral-950 text-[12.5px] font-black py-2.5 rounded-xl transition-colors cursor-pointer shadow-md"
            >
              업데이트 적용
            </button>
            <button 
              onClick={() => setSwUpdateAvailable(false)}
              className="px-4 bg-white/10 hover:bg-white/20 text-white text-[12px] font-bold py-2.5 rounded-xl transition-colors cursor-pointer"
            >
              나중에
            </button>
          </div>
        </div>
      )}

      {showCacheExpiredModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[24px] shadow-2xl p-6 text-center animate-in zoom-in-95 duration-300 select-none">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-500 mb-4 animate-bounce">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-wifi-off"><path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.5"/><path d="M5 12.5a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.5 8"/><path d="M1.5 8a15.89 15.89 0 0 1 5.9-2.27"/><path d="M8.58 16.58A5 5 0 0 1 12 15a5 5 0 0 1 2.24.54"/><path d="M12 21a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/></svg>
            </div>
            
            <h3 className="text-[17px] font-black text-neutral-900 dark:text-neutral-50 mb-2">
              오프라인 캐시 만료 안내
            </h3>
            
            <p className="text-[13px] text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
              현재 네트워크와 연결되어 있지 않으며, 불러온 데이터는 24시간이 경과한 오래된 캐시 정보입니다. 최신 데이터를 보려면 인터넷 연결을 확인해 주세요.
            </p>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && navigator.onLine) {
                    window.location.reload();
                  } else {
                    alert('여전히 오프라인 상태입니다. 네트워크 연결을 다시 확인해 주세요.');
                  }
                }}
                className="w-full bg-[#008262] hover:bg-[#00694f] text-white text-[13.5px] font-extrabold py-3 px-4 rounded-[16px] transition-colors cursor-pointer shadow-md"
              >
                네트워크 재연결 시도
              </button>
              
              <button
                onClick={() => {
                  sessionStorage.setItem('dview_cache_expired_warned', 'true');
                  setShowCacheExpiredModal(false);
                }}
                className="w-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[13px] font-bold py-2.5 px-4 rounded-[14px] transition-colors cursor-pointer"
              >
                오래된 데이터로 계속 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
});

PWAProvider.displayName = 'PWAProvider';
