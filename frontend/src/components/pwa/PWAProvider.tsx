'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';



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
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showCustomA2HSModal, setShowCustomA2HSModal] = useState(false);
  
  // Push Notification state
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [pushSubscription, setPushSubscription] = useState<PushSubscription | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Clear old SWR localStorage cache to ensure returning users get fresh data
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dview-swr-cache');
      }
    } catch {}

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
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      }
    };
  }, []);

  const triggerA2HSPrompt = async () => {
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
    if (isInstallable && deferredPrompt) {
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
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub, uid: uid || null })
      });
      
      console.log('Push Subscribed & Saved:', JSON.stringify(sub));
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
    </PWAContext.Provider>
  );
}
