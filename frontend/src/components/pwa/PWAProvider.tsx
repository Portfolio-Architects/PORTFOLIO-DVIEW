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
  subscribeToPush: () => Promise<boolean>;
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

  const subscribeToPush = async () => {
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
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
      
      setPushSubscription(sub);
      
      // TODO: Here you would typically send the subscription to your backend server
      // e.g. await fetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub) });
      
      console.log('Push Subscribed:', JSON.stringify(sub));
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
      </PWAContext.Provider>
    </SWRConfig>
  );
}
