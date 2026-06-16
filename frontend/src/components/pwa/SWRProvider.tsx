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

  useEffect(() => {
    if (!isOnline || typeof window === 'undefined') return;

    const preloadEssentialData = () => {
      logger.info('SWRProvider.preload', 'Starting idle-time background preloading of critical static assets');
      
      const targets = [
        '/data/location-scores.json',
        '/api/local-notices',
        '/api/apartments-by-dong'
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

  const cacheRef = useRef<Map<any, any>>(null);
  if (cacheRef.current === null) {
    cacheRef.current = new Map();
  }
  const getCache = useCallback(() => cacheRef.current!, []);

  return (
    <SWRConfig
      value={{
        provider: getCache,
        revalidateOnFocus: isOnline,
        revalidateOnReconnect: isOnline,
        shouldRetryOnError: isOnline,
        dedupingInterval: 5000, // deduplication window (5s) to guard against redundant API hammering
        // Disable SWR auto-polling while offline to prevent error loops
        refreshInterval: isOnline ? undefined : 0,
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
