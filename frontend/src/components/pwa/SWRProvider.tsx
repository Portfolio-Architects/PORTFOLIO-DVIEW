'use client';

import React, { ReactNode, useEffect, useRef, useCallback } from 'react';
import { SWRConfig, preload } from 'swr';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';
import { logger } from '@/lib/services/logger';
import { BUILD_VERSION } from '@/lib/build-version';

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
        `/data/location-scores.json?v=${BUILD_VERSION}`,
        '/api/local-notices?dongtan=true',
        '/api/dashboard-init',
        '/api/macro/rates',
        '/api/macro/news?limit=40'
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
        const storedVersion = localStorage.getItem('app-swr-version');
        const rawCache = localStorage.getItem('app-swr-cache');
        if (rawCache) {
          const parsed = JSON.parse(rawCache);
          if (Array.isArray(parsed) && parsed.every(entry => Array.isArray(entry) && entry.length === 2)) {
            // Clean up any legacy or empty error objects from cached SWR states
            // Also filter out and purge any key with mismatched v version query param
            // and versionless keys if the build version has upgraded.
            let hasPurged = false;
            const filtered = parsed.filter(([key]) => {
              if (typeof key !== 'string') return true;
              const vMatch = key.match(/[?&]v=([^&]+)/);
              if (vMatch) {
                if (vMatch[1] !== BUILD_VERSION) {
                  hasPurged = true;
                  return false;
                }
              } else {
                if (storedVersion !== BUILD_VERSION) {
                  hasPurged = true;
                  return false;
                }
              }
              return true;
            });

            initialEntries = filtered.map(([key, val]) => {
              if (val && typeof val === 'object' && 'error' in val) {
                const cleaned = { ...val };
                delete cleaned.error;
                return [key, cleaned];
              }
              return [key, val];
            });

            if (hasPurged || storedVersion !== BUILD_VERSION) {
              logger.info('SWRProvider.getCache', 'Purged stale cache version entries and versionless keys from localStorage');
              localStorage.setItem('app-swr-cache', JSON.stringify(initialEntries));
              localStorage.setItem('app-swr-version', BUILD_VERSION);
            }
          } else {
            logger.warn('SWRProvider.getCache', 'Invalid cache structure inside localStorage');
          }
        } else if (storedVersion !== BUILD_VERSION) {
          localStorage.setItem('app-swr-version', BUILD_VERSION);
        }
      }
    } catch (err) {
      logger.warn('SWRProvider.getCache', 'Failed to parse SWR localStorage cache', undefined, err);
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
            
            // Check version query param to prevent syncing mismatched versions
            const vMatch = key.match(/[?&]v=([^&]+)/);
            if (vMatch && vMatch[1] !== BUILD_VERSION) return false;

            const isTarget = key.startsWith('/data/') || 
                             key.startsWith('/api/apartments-by-dong') || 
                             key.startsWith('/api/location-scores') ||
                             key.startsWith('/api/dashboard-init') ||
                             key.startsWith('/api/macro/');
            if (!isTarget) return false;
            
            // Avoid serializing error objects or non-serializable entities
            if (value instanceof Error) return false;
            return true;
          })
          .map(([key, value]) => {
            // Remove error properties to avoid serializing `{}` empty objects
            if (value && typeof value === 'object') {
              const copy = { ...value };
              if ('error' in copy) {
                delete copy.error;
              }
              return [key, copy];
            }
            return [key, value];
          });
        localStorage.setItem('app-swr-cache', JSON.stringify(appCache));
        localStorage.setItem('app-swr-version', BUILD_VERSION);
      } catch (err) {
        logger.warn('SWRProvider.syncToLocalStorage', 'Failed to sync SWR cache to localStorage', undefined, err);
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
          
          const errMsg = err?.message || String(err);
          const isNetworkError = errMsg.includes('Failed to fetch') || 
                                 errMsg.includes('fetch failed') || 
                                 errMsg.includes('NetworkError') ||
                                 errMsg.includes('AbortError') ||
                                 (err?.name === 'AbortError');

          if (isNetworkError) {
            logger.warn('SWRProvider.onError', 'SWR Transient Network Error', { error: errMsg });
            return;
          }

          logger.error('SWRProvider.onError', 'SWR Global Error', undefined, err);
        }
      }}
    >
      {children}
    </SWRConfig>
  );
});

SWRProvider.displayName = 'SWRProvider';

export default SWRProvider;
