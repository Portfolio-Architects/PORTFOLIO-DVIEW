/**
 * @module safeReload
 * @description Prevents infinite reload loops when lazy-loaded dynamic chunks fail to load.
 * Hardened with diagnostic logging and a 3-second prefetch guard.
 */

import { logger } from '@/lib/services/logger';

// Record page load time to prevent refreshes during background prefetch/HMR phase
const PAGE_LOAD_TIME = typeof window !== 'undefined' ? Date.now() : 0;
const activeTimeouts: Record<string, NodeJS.Timeout> = {};

export function safeReload(componentName: string) {
  if (typeof window !== 'undefined') {
    const timeSinceLoad = Date.now() - PAGE_LOAD_TIME;
    const isPrefetchPhase = timeSinceLoad < 3000;
    const stack = new Error().stack || 'No stack trace available';

    // Store diagnostic info before reload
    const reloadInfo = {
      componentName,
      timestamp: new Date().toISOString(),
      timeSinceLoadMs: timeSinceLoad,
      href: window.location.href,
      stack,
    };

    try {
      sessionStorage.setItem('dview_last_reload_info', JSON.stringify(reloadInfo));
    } catch {}

    // 1. Skip reload during initial 3-second prefetch/hydration phase
    if (isPrefetchPhase) {
      logger.warn(
        'safeReload',
        `[safeReload] Ignored reload for ${componentName} because page loaded only ${timeSinceLoad}ms ago (prefetch/HMR guard).`,
        reloadInfo
      );
      return;
    }

    // 2. Skip reload in local development mode
    if (process.env.NODE_ENV === 'development') {
      logger.warn(
        'safeReload',
        `[safeReload] Chunk load failure detected for ${componentName} in development. Skipping auto-reload to allow on-demand compilation.`,
        reloadInfo
      );
      return;
    }

    const key = `chunk_retry_${componentName}`;
    const retried = sessionStorage.getItem(key);
    if (!retried) {
      sessionStorage.setItem(key, 'true');
      logger.warn('safeReload', `[safeReload] Hard page reload initiated by: ${componentName}`);
      window.location.reload();
    } else {
      logger.error(
        'safeReload',
        `[Chunk Load] Reload failed repeatedly for ${componentName}. Stopping reload to prevent infinite loop.`,
        reloadInfo
      );
      if (activeTimeouts[key]) {
        clearTimeout(activeTimeouts[key]);
      }
      activeTimeouts[key] = setTimeout(() => {
        try {
          sessionStorage.removeItem(key);
        } catch {}
        delete activeTimeouts[key];
      }, 15000);
    }
  }
}

/**
 * Initializes and prints safe reload diagnostics upon mount.
 */
export function initSafeReloadDiagnostics() {
  if (typeof window !== 'undefined') {
    try {
      const infoStr = sessionStorage.getItem('dview_last_reload_info');
      if (infoStr) {
        const info = JSON.parse(infoStr);
        logger.warn(
          'safeReload.diagnostics',
          `[safeReload Diagnostics] Page was automatically reloaded! Component: ${info.componentName}`,
          info
        );
        sessionStorage.removeItem('dview_last_reload_info');
      }
    } catch {}
  }
}
