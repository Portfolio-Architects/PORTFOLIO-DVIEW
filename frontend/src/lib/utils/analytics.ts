'use client';

import { sendGAEvent } from '@next/third-parties/google';
import { logger } from '@/lib/services/logger';
import { applyGaDisableFlag, isAdminTrackingExcludedClient } from '@/lib/utils/adminExclusion';

function sanitizeEventParams(params?: Record<string, unknown>): Record<string, unknown> {
  if (!params || typeof params !== 'object' || Array.isArray(params)) {
    return {};
  }
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function pushGtagArguments(
  dataLayer: NonNullable<Window['dataLayer']>,
  _command: 'event',
  _eventName: string,
  _params: Record<string, unknown>
): void {
  if (
    typeof dataLayer !== 'object' ||
    dataLayer === null ||
    typeof dataLayer.push !== 'function' ||
    Object.isFrozen(dataLayer)
  ) {
    return;
  }
  // gtag.js requires genuine [object Arguments] entries in window.dataLayer, not plain Arrays
  (function enqueueArguments(..._unusedArgs: unknown[]) {
    void _unusedArgs;
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  })(_command, _eventName, _params);
}

function resolveVirtualPageLocation(safePath: string): string {
  if (typeof window === 'undefined') {
    return safePath;
  }
  try {
    if (window.location?.origin && window.location.origin !== 'null') {
      return new URL(safePath, window.location.origin).href;
    }
  } catch {
    // Fall back to window.location.href below
  }
  return window.location?.href || safePath;
}

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
  if (typeof eventName !== 'string') return;

  const normalizedEventName = eventName.trim();
  if (!normalizedEventName) return;

  try {
    // Exclude Admin from tracking (both localStorage and dview_is_admin cookie)
    if (isAdminTrackingExcludedClient()) {
      applyGaDisableFlag(true);
      return;
    }
  } catch {
    // Ignore storage access errors
  }

  // In development, log to developer console
  if (process.env.NODE_ENV === 'development') {
    console.log(`%c[Analytics Event] ${normalizedEventName}`, 'color: #057e77; font-weight: bold;', params);
  }

  // Send to GA4 via @next/third-parties/google (gtag.js 3-arg tuple: 'event', eventName, params)
  if (process.env.NEXT_PUBLIC_GA_ID && process.env.NODE_ENV === 'production') {
    const sanitizedParams = sanitizeEventParams(params);
    try {
      window.dataLayer = window.dataLayer || [];
      const dataLayer = window.dataLayer;

      const beforeLength = Array.isArray(dataLayer) ? dataLayer.length : -1;
      let pushedViaSendGA = false;
      let wrappedPush: typeof dataLayer.push | null = null;
      let hadOwnPush = false;
      let originalPushDesc: PropertyDescriptor | undefined;

      try {
        if (
          typeof dataLayer === 'object' &&
          dataLayer !== null &&
          typeof dataLayer.push === 'function'
        ) {
          originalPushDesc = Object.getOwnPropertyDescriptor(dataLayer, 'push');
          hadOwnPush = Boolean(originalPushDesc);
          const isDirectAssignable = originalPushDesc
            ? Boolean(originalPushDesc.writable || typeof originalPushDesc.set === 'function')
            : Object.isExtensible(dataLayer);
          const isConfigurableDescriptor = Boolean(originalPushDesc?.configurable);

          if (isDirectAssignable || isConfigurableDescriptor) {
            const originalPush = dataLayer.push;
            wrappedPush = function (
              this: NonNullable<Window['dataLayer']>,
              ...items: Parameters<typeof originalPush>
            ) {
              pushedViaSendGA = true;
              return originalPush.apply(this, items);
            };
            if (isDirectAssignable) {
              dataLayer.push = wrappedPush;
            } else {
              Object.defineProperty(dataLayer, 'push', {
                value: wrappedPush,
                configurable: true,
                writable: true,
                enumerable: originalPushDesc?.enumerable ?? false,
              });
            }
          }
        }
      } catch {
        wrappedPush = null;
      }

      try {
        sendGAEvent('event', normalizedEventName, sanitizedParams);
      } finally {
        if (wrappedPush && dataLayer.push === wrappedPush) {
          try {
            if (hadOwnPush && originalPushDesc) {
              Object.defineProperty(dataLayer, 'push', originalPushDesc);
            } else {
              delete (dataLayer as { push?: unknown }).push;
            }
          } catch {
            // Ignore descriptor restoration failure on exotic host objects
          }
        }
      }

      if (
        !pushedViaSendGA &&
        Array.isArray(dataLayer) &&
        beforeLength >= 0 &&
        dataLayer.length > beforeLength
      ) {
        pushedViaSendGA = true;
      }

      if (!pushedViaSendGA) {
        if (typeof window.gtag === 'function') {
          window.gtag('event', normalizedEventName, sanitizedParams);
        } else {
          pushGtagArguments(dataLayer, 'event', normalizedEventName, sanitizedParams);
        }
      }
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
    gtag?: (...args: unknown[]) => void;
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
  const trimmedPath = typeof path === 'string' ? path.trim() : '';
  const safePath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
  const now = Date.now();
  const cleanExtraParams = sanitizeEventParams(params);
  const excluded = isAdminTrackingExcludedClient();

  if (!excluded) {
    trackEvent('page_view', {
      ...cleanExtraParams,
      page_path: safePath,
      page_location: resolveVirtualPageLocation(safePath),
      virtual_pv: 1,
      adsense_virtual_pv: 1,
    });
  } else {
    applyGaDisableFlag(true);
  }

  const entry: VirtualPageViewEntry = {
    path: safePath,
    gaEventDispatched: !excluded,
    adsenseVirtualPvDispatched: excluded ? 0 : 1,
    timestamp: now,
    params,
  };

  if (!excluded) {
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
