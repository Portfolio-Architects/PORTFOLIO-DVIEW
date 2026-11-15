'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  documentHasNoindexRobotsMeta,
  ensureSharedHeadObserver,
  subscribeNoindexHead,
  syncWindowAdSenseNoindexPause,
} from './noindexAdGuard';

function getServerNoindexSnapshot(): boolean {
  return false;
}

/**
 * O(1) singleton-backed client hook tracking `<meta name="robots" content*="noindex">` in `document.head`
 * and keeping `window.adsbygoogle.pauseAdRequests` synchronized across Next.js SPA `<Link>` navigations.
 */
export function useDocumentNoindexMeta(
  pathname?: string | null,
  disabled: boolean = false
): boolean {
  const hasNoindexMeta = useSyncExternalStore(
    subscribeNoindexHead,
    () => (disabled ? false : documentHasNoindexRobotsMeta()),
    getServerNoindexSnapshot
  );

  useEffect(() => {
    if (disabled) return;
    ensureSharedHeadObserver();
    syncWindowAdSenseNoindexPause(pathname);
  }, [pathname, disabled, hasNoindexMeta]);

  return disabled ? false : hasNoindexMeta;
}
