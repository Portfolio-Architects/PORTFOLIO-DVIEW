'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { enqueueOfflineRequest, retryOfflineRequests } from '@/lib/utils/offlineQueue';
import { usePathname, useSearchParams } from 'next/navigation';




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
  subscribeToPush: (uid?: string | null) => Promise<boolean>;
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
  subscribeToPush: async () => false,
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




export function PWAProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  // 🔧 Nextjs-Toploader 진행바 잔존 DOM 노드 강제 청소 (router.events 소거 가드 보강)
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

  useEffect(() => {
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
      console.log('[PWAProvider] Service Worker controller changed. Reloading page to apply updates...');
      window.location.reload();
    };
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    }

    // 🔧 Online status restoration manual queue replay
    const handleOnlineStatus = () => {
      console.log('[PWAProvider] Network restored. Triggering manual offline sync queue replay...');
      retryOfflineRequests();
      // 온라인 복구 시 만료 캐시 경고창 자동 해제
      setShowCacheExpiredModal(false);
    };
    window.addEventListener('online', handleOnlineStatus);

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

      setToastMessage('🎉 홈화면 앱 설치 감사 혜택! 무료 리포트 조회권 3회가 지급되었습니다.');
      setTimeout(() => {
        if (isMounted) {
          setToastMessage(null);
        }
      }, 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 2. Web Push Support Check
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setTimeout(() => {
        if (isMounted) setIsPushSupported(true);
      }, 0);
      // Check existing subscription
      navigator.serviceWorker.ready.then((reg) => {
        if (!isMounted) return;
        reg.pushManager.getSubscription().then((sub) => {
          if (isMounted && sub) setPushSubscription(sub);
        });
      });
    }

    return () => {
      isMounted = false;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('online', handleOnlineStatus);
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
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

  const subscribeToPush = async (uid?: string | null) => {
    if (!isPushSupported) {
      alert('이 브라우저는 푸시 알림을 지원하지 않습니다.');
      return false;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('푸시 알림 권한이 거부되었습니다.');
        return false;
      }
      
      const reg = await navigator.serviceWorker.ready;
      
      // Replace with your VAPID public key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BJfvp3-MGu6cXDWL2GGKO019MjQhLFSwk1zvAIo8QgX31bfCwfjOHHr34iJcGYnhxpJBCsPoXeG6CAXql9KR9Xg';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      
      setPushSubscription(sub);
      
      // Save subscription to the backend
      if (typeof window !== 'undefined' && !navigator.onLine) {
        try {
          await enqueueOfflineRequest({
            url: '/api/push/subscribe',
            method: 'POST',
            body: { subscription: sub, uid: uid || null }
          });
          showToast('네트워크가 연결되지 않아 푸시 알림 구독이 오프라인 큐에 저장되었습니다. 연결 시 동기화됩니다 💚');
        } catch (err) {
          console.error('Failed to enqueue push subscription', err);
        }
      } else {
        try {
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub, uid: uid || null })
          });
          console.log('Push Subscribed & Saved:', JSON.stringify(sub));
        } catch (fetchErr) {
          console.warn('Failed to save push subscription online, queuing offline', fetchErr);
          try {
            await enqueueOfflineRequest({
              url: '/api/push/subscribe',
              method: 'POST',
              body: { subscription: sub, uid: uid || null }
            });
            showToast('네트워크 불안정으로 푸시 알림 구독이 오프라인 큐에 저장되었습니다 💚');
          } catch (err) {
            console.error('Failed to enqueue push subscription after fetch failure', err);
          }
        }
      }
      return true;
    } catch (error) {
      console.error('Error subscribing to push', error);
      return false;
    }
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((prev) => (prev === message ? null : prev));
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
        showToast,
        isIOS,
      }}
    >
      {children}
      {toastMessage && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+24px)] sm:bottom-8 left-1/2 -translate-x-1/2 z-[99999] w-[calc(100%-32px)] max-w-sm bg-neutral-900/95 dark:bg-neutral-800/95 backdrop-blur-md text-white font-extrabold px-5 py-4 rounded-[20px] shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 border border-white/10 select-none">
          <span className="text-[12.5px] md:text-[13.5px] leading-relaxed flex-1">{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)} 
            className="hover:opacity-85 text-white/80 focus:outline-none text-[10px] font-black cursor-pointer bg-white/10 hover:bg-white/20 rounded-full w-[22px] h-[22px] flex items-center justify-center shrink-0"
          >
            ✕
          </button>
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
}
