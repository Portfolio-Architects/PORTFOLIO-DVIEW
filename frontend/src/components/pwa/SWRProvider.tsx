'use client';

import React, { ReactNode, useEffect, useRef, useCallback } from 'react';
import { SWRConfig, preload } from 'swr';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { logger } from '@/lib/services/logger';

// Default fetcher wrapper for preloading static data assets safely
const defaultFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Preload fetch failed for: ${url}`);
  }
  return res.json();
};

const SWRProvider = React.memo(function SWRProvider({ children }: { children: ReactNode }) {
  const isOnline = useNetworkStatus();
  const cacheRef = useRef<Map<any, any> | null>(null);

  useEffect(() => {
    if (!isOnline || typeof window === 'undefined') return;

    const preloadEssentialData = () => {
      logger.info('SWRProvider.preload', 'Starting idle-time background preloading of critical static assets');
      
      const targets = [
        '/data/location-scores.json',
        '/api/local-notices',
        '/api/apartments-by-dong',
        '/api/dashboard-init',
        '/api/macro/rates',
        '/api/macro/news'
      ];

      targets.forEach(url => {
        try {
          preload(url, defaultFetcher);
        } catch (err) {
          logger.warn('SWRProvider.preload', `Failed to background preload target: ${url}`, {
            error: String(err)
          });
        }
      });
    };

    // requestIdleCallback is highly supported in modern browsers for non-blocking preloading
    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(() => {
        preloadEssentialData();
      }, { timeout: 3000 }); // Fallback timeout if browser remains busy
      return () => window.cancelIdleCallback(idleId);
    } else {
      const timeoutId = setTimeout(preloadEssentialData, 1500);
      return () => clearTimeout(timeoutId);
    }
  }, [isOnline]);

  const getCache = useCallback(() => {
    if (typeof window === 'undefined') return new Map();
    if (cacheRef.current) return cacheRef.current;
    
    let initialEntries: [any, any][] = [];
    try {
      if (typeof window.localStorage !== 'undefined') {
        const rawCache = localStorage.getItem('app-swr-cache');
        if (rawCache) {
          const parsed = JSON.parse(rawCache);
          if (Array.isArray(parsed) && parsed.every(entry => Array.isArray(entry) && entry.length === 2)) {
            initialEntries = parsed;
          } else {
            console.warn('SWRProvider.getCache: Invalid cache structure inside localStorage');
          }
        }
      }
    } catch (err) {
      console.warn('Failed to parse SWR localStorage cache:', err);
    }

    const map = new Map<any, any>(initialEntries);
    cacheRef.current = map;
    return map;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncToLocalStorage = () => {
      const map = cacheRef.current;
      if (!map) return;
      try {
        if (typeof window.localStorage === 'undefined') return;
        const appCache = Array.from(map.entries())
          .filter(([key, value]) => {
            // Only serialize static JSON assets/APIs and check serializability
            if (typeof key !== 'string') return false;
            const isTarget = key.startsWith('/data/') || 
                             key.startsWith('/api/apartments-by-dong') || 
                             key.startsWith('/api/location-scores') ||
                             key.startsWith('/api/dashboard-init') ||
                             key.startsWith('/api/macro/');
            if (!isTarget) return false;
            
            // Avoid serializing error objects or non-serializable entities
            if (value instanceof Error) return false;
            return true;
          });
        localStorage.setItem('app-swr-cache', JSON.stringify(appCache));
      } catch (err) {
        console.warn('Failed to sync SWR cache to localStorage:', err);
      }
    };

    window.addEventListener('pagehide', syncToLocalStorage);
    return () => {
      window.removeEventListener('pagehide', syncToLocalStorage);
    };
  }, []);

  return (
    <SWRConfig
      value={{
        provider: getCache,
        revalidateOnFocus: false, // Prevent redundant background fetches on tab/app switching (use local manual/SWR trigger overrides)
        revalidateOnReconnect: isOnline,
        shouldRetryOnError: isOnline,
        errorRetryCount: 3,
        errorRetryInterval: 3000,
        dedupingInterval: 30000, // deduplication window (30s) to guard against redundant API hammering
        // Disable SWR auto-polling while offline to prevent error loops
        refreshInterval: isOnline ? undefined : 0,
        isVisible: () => {
          if (typeof document === 'undefined') return true;
          return document.visibilityState !== 'hidden';
        },
        onError: (err) => {
          if (!isOnline) {
            // Mute errors in console when offline to avoid spamming
            return;
          }
          console.error('SWR Global Error:', err);
        }
      }}
    >
      {children}
    </SWRConfig>
  );
});

SWRProvider.displayName = 'SWRProvider';

export default SWRProvider;
