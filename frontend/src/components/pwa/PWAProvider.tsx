'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SWRConfig } from 'swr';


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

// SWR LocalStorage Cache Provider for client-side persistence (reduces Firestore reads)
function localStorageProvider() {
  if (typeof window === 'undefined') return new Map();

  let map: Map<string, any>;
  try {
    const rawCache = localStorage.getItem('dview-swr-cache');
    map = new Map(JSON.parse(rawCache || '[]'));
  } catch (e) {
    console.warn('Failed to load SWR cache from localStorage:', e);
    map = new Map();
  }

  // Before unload or hide, serialize and store back to localStorage
  const handleSave = () => {
    // Only cache static JSON configs and transaction details
    const entriesToPersist = Array.from(map.entries()).filter(([key]) => {
      const keyStr = typeof key === 'string' ? key : JSON.stringify(key);
      return (
        keyStr.includes('/data/') ||
        keyStr.includes('/tx-data/') ||
        keyStr.includes('location-scores') ||
        keyStr.includes('tx-summary') ||
        keyStr.includes('scoutingReport')
      );
    });

    try {
      localStorage.setItem('dview-swr-cache', JSON.stringify(entriesToPersist));
    } catch (err) {
      console.warn('SWR localStorage save failed:', err);
    }
  };

  window.addEventListener('beforeunload', handleSave);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      handleSave();
    }
  });

  return map;
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
    // 1. A2HS Logic
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowCustomA2HSModal(false);
      
      // Add PWA reward passes to localStorage
      const currentPasses = Number(localStorage.getItem('dview_free_passes') || '0');
      localStorage.setItem('dview_free_passes', (currentPasses + 3).toString());
      
      setToastMessage('🎉 홈화면 앱 설치 감사 혜택! 무료 리포트 조회권 3회가 지급되었습니다.');
      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
    });

    // 2. Web Push Support Check
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setTimeout(() => {
        setIsPushSupported(true);
      }, 0);
      // Check existing subscription
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) setPushSubscription(sub);
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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

  return (
    <SWRConfig value={{ provider: localStorageProvider }}>
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
        }}
      >
        {children}
        {toastMessage && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-toss-blue text-white font-extrabold px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 border border-white/20 select-none">
            <span className="text-[13px] md:text-[14px]">{toastMessage}</span>
            <button 
              onClick={() => setToastMessage(null)} 
              className="ml-2 hover:opacity-85 text-white/80 focus:outline-none text-[12px] font-black cursor-pointer bg-white/20 hover:bg-white/30 rounded-full w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
      </PWAContext.Provider>
    </SWRConfig>
  );
}
