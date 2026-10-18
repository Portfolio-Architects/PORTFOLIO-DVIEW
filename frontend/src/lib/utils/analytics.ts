'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { logger } from '@/lib/services/logger';

/**
 * Tracks a custom event in Google Analytics 4 (GA4).
 * If in development mode, it logs the event to the console instead.
 * Admin users are excluded from tracking.
 * 
 * @param eventName The event name (e.g., 'search_apartment', 'view_apartment')
 * @param params Custom event parameters
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  try {
    // Exclude Admin from tracking
    if (localStorage.getItem('dview_is_admin') === 'true') {
      return;
    }
  } catch (e: unknown) {
    // Ignore localStorage errors
  }

  // In development, log to developer console
  if (process.env.NODE_ENV === 'development') {
    console.log(`%c[Analytics Event] ${eventName}`, 'color: #057e77; font-weight: bold;', params);
  }

  // Send to GA4 via @next/third-parties/google only when initialized (production & GA_ID provided)
  if (process.env.NEXT_PUBLIC_GA_ID && process.env.NODE_ENV === 'production') {
    try {
      sendGAEvent({
        event: eventName,
        ...params,
      });
    } catch (err) {
      logger.error('analytics.trackEvent', 'Failed to send GA event', undefined, err);
    }
  }
}

export interface VirtualPageViewEntry {
  path: string;
  gaEventDispatched: boolean;
  adsenseVirtualPvDispatched: number;
  timestamp: number;
  params?: Record<string, unknown>;
}

declare global {
  interface Window {
    __dviewVirtualPvCount?: number;
    __dviewVirtualPvLedger?: VirtualPageViewEntry[];
  }
}

const virtualPageViewLedger: VirtualPageViewEntry[] = [];

/**
 * Dispatches GA4 custom `page_view` event and AdSense virtual pageview [1, ±0, 건].
 * Complexity: Time O(1), Space O(1) per entry.
 * Side-effects: Dispatches GA4 event, CustomEvent('dview:virtual_pageview'), updates ledger.
 */
export function trackVirtualPageView(
  path: string,
  params?: Record<string, unknown>
): VirtualPageViewEntry {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  const now = Date.now();

  trackEvent('page_view', {
    page_path: safePath,
    page_location: typeof window !== 'undefined' ? window.location.href : safePath,
    virtual_pv: 1,
    adsense_virtual_pv: 1,
    ...params,
  });

  const entry: VirtualPageViewEntry = {
    path: safePath,
    gaEventDispatched: true,
    adsenseVirtualPvDispatched: 1,
    timestamp: now,
    params,
  };

  virtualPageViewLedger.push(entry);

  if (typeof window !== 'undefined') {
    window.__dviewVirtualPvCount = (window.__dviewVirtualPvCount || 0) + 1;
    window.__dviewVirtualPvLedger = virtualPageViewLedger;

    if (typeof CustomEvent === 'function' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(
          new CustomEvent('dview:virtual_pageview', {
            detail: entry,
          })
        );
      } catch {
        // Ignore DOM dispatch errors in constrained environments
      }
    }
  }

  return entry;
}

export function getVirtualPageViewLedger(): ReadonlyArray<VirtualPageViewEntry> {
  return virtualPageViewLedger;
}

export function getVirtualPageViewCount(): number {
  return virtualPageViewLedger.length;
}

export function resetVirtualPageViewLedger(): void {
  virtualPageViewLedger.length = 0;
  if (typeof window !== 'undefined') {
    window.__dviewVirtualPvCount = 0;
    window.__dviewVirtualPvLedger = virtualPageViewLedger;
  }
}


