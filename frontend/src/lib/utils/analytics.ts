'use client';

import * as analyticsSelf from './analytics';
import { sendGAEvent } from '@next/third-parties/google';
import { logger } from '@/lib/services/logger';
import { applyGaDisableFlag, isAdminTrackingExcludedClient } from '@/lib/utils/adminExclusion';
import {
  resolveCanonicalAptSlug,
  stripApartmentNoiseQueryParams,
} from '@/lib/utils/apartmentMapping';

const MAX_SEARCH_TERM_LENGTH = 100;

interface ApartmentViewDedupRecord {
  normName: string;
  surface: string;
  viewType?: string;
  timestamp: number;
  dataLayerRef: unknown;
}

interface SearchQueryDedupRecord {
  term: string;
  surface: string;
  trigger?: string;
  timestamp: number;
  dataLayerRef: unknown;
}

let lastApartmentViewRecord: ApartmentViewDedupRecord | null = null;
let lastSearchQueryRecord: SearchQueryDedupRecord | null = null;

function normalizeAptIdentity(name: string, dong?: string, canonicalSlug?: string): string {
  const candidate = (canonicalSlug || name || '').trim();
  if (!candidate) return '';
  const resolved = resolveCanonicalAptSlug(candidate, { dong });
  if (resolved) {
    return resolved.replace(/\s+/g, '').toLowerCase();
  }
  return candidate.replace(/\s+/g, '').toLowerCase();
}

function getCurrentDataLayerRef(): unknown {
  return typeof window !== 'undefined' ? window.dataLayer : null;
}

export function resetAnalyticsInteractionState(): void {
  lastApartmentViewRecord = null;
  lastSearchQueryRecord = null;
}

function normalizeApartmentViewPayload(
  params?: Record<string, unknown>
): Record<string, unknown> | null {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return null;
  const rawName =
    typeof params.apartment_name === 'string' && params.apartment_name.trim()
      ? params.apartment_name.trim()
      : typeof params.apt_name === 'string' && params.apt_name.trim()
        ? params.apt_name.trim()
        : '';
  if (!rawName) return null;

  const safeSurface =
    typeof params.surface === 'string' && params.surface.trim()
      ? params.surface.trim()
      : 'unknown';

  const trimmedDong =
    typeof params.dong === 'string' && params.dong.trim() ? params.dong.trim() : undefined;

  const payload: Record<string, unknown> = {
    ...params,
    apartment_name: rawName,
    apt_name: rawName,
    surface: safeSurface,
  };
  if (typeof params.dong === 'string') {
    payload.dong = trimmedDong;
  }
  if (typeof params.canonical_slug === 'string') {
    const trimmedSlug = params.canonical_slug.trim();
    payload.canonical_slug = trimmedSlug
      ? resolveCanonicalAptSlug(trimmedSlug, { dong: trimmedDong }) || trimmedSlug
      : undefined;
  }
  return payload;
}

function normalizeSearchQueryPayload(
  params?: Record<string, unknown>
): Record<string, unknown> | null {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return null;
  const rawTerm =
    typeof params.search_term === 'string' && params.search_term.trim()
      ? params.search_term.trim()
      : typeof params.query === 'string' && params.query.trim()
        ? params.query.trim()
        : '';
  if (!rawTerm) return null;

  const safeTerm = rawTerm.slice(0, MAX_SEARCH_TERM_LENGTH);
  const safeSurface =
    typeof params.surface === 'string' && params.surface.trim()
      ? params.surface.trim()
      : 'unknown';

  return {
    ...params,
    search_term: safeTerm,
    query: safeTerm,
    surface: safeSurface,
  };
}

function shouldSuppressApartmentViewCascade(
  normName: string,
  surface: string,
  viewType?: string
): boolean {
  const currentDl = getCurrentDataLayerRef();
  if (!lastApartmentViewRecord || lastApartmentViewRecord.dataLayerRef !== currentDl) {
    lastApartmentViewRecord = null;
    return false;
  }
  if (lastApartmentViewRecord.normName !== normName) {
    return false;
  }
  const elapsed = Date.now() - lastApartmentViewRecord.timestamp;
  if (elapsed < 0) return false;

  // 1. Suppress child ApartmentModal mount when parent opener (DashboardClient, ExploreClient, SearchSuggestionDropdown) just emitted apartment_view
  if (
    surface === 'apartment_modal' &&
    lastApartmentViewRecord.surface !== 'apartment_modal' &&
    elapsed < 500
  ) {
    return true;
  }

  // 2. Suppress parent modal opener when SearchSuggestionDropdown shortcut just emitted apartment_view
  if (
    viewType === 'modal' &&
    surface !== 'apartment_modal' &&
    lastApartmentViewRecord.viewType === 'shortcut' &&
    elapsed < 250
  ) {
    return true;
  }

  // 3. Suppress downstream donut_fullscreen detail navigation when ZoneDonutFullscreenModal row click just emitted apartment_view
  if (
    surface === 'donut_fullscreen' &&
    lastApartmentViewRecord.surface === 'donut_fullscreen_modal' &&
    elapsed < 250
  ) {
    return true;
  }

  return false;
}

function shouldSuppressSearchQueryCascade(
  term: string,
  surface: string,
  trigger?: string
): boolean {
  const currentDl = getCurrentDataLayerRef();
  if (!lastSearchQueryRecord || lastSearchQueryRecord.dataLayerRef !== currentDl) {
    lastSearchQueryRecord = null;
    return false;
  }
  if (lastSearchQueryRecord.term !== term) {
    return false;
  }
  const elapsed = Date.now() - lastSearchQueryRecord.timestamp;
  if (elapsed < 0 || elapsed >= 1500) {
    return false;
  }

  const isPassiveFollowup =
    trigger === 'debounce' || (surface === 'explore_catalog' && !trigger);
  const wasExplicitSelection =
    lastSearchQueryRecord.trigger === 'recommended_keyword' ||
    lastSearchQueryRecord.trigger === 'brand_suggestion' ||
    lastSearchQueryRecord.trigger === 'search_shortcut' ||
    lastSearchQueryRecord.trigger === 'combobox_select';

  return isPassiveFollowup && wasExplicitSelection;
}

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

  let effectiveParams = params;
  if (normalizedEventName === 'apartment_view') {
    const normalizedApt = normalizeApartmentViewPayload(params);
    if (!normalizedApt) return;
    effectiveParams = normalizedApt;
  } else if (normalizedEventName === 'search_query') {
    const normalizedSearch = normalizeSearchQueryPayload(params);
    if (!normalizedSearch) return;
    effectiveParams = normalizedSearch;
  }

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
    console.log(`%c[Analytics Event] ${normalizedEventName}`, 'color: #057e77; font-weight: bold;', effectiveParams);
  }

  // Send to GA4 via @next/third-parties/google (gtag.js 3-arg tuple: 'event', eventName, params)
  if (process.env.NEXT_PUBLIC_GA_ID && process.env.NODE_ENV === 'production') {
    const sanitizedParams = sanitizeEventParams(effectiveParams);
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

export interface ApartmentViewEventParams {
  apartment_name: string;
  apt_name?: string;
  canonical_slug?: string;
  dong?: string;
  zone?: string;
  surface: string;
  view_type?:
    | 'modal'
    | 'mobile_drawer'
    | 'chart_preview'
    | 'detail_page'
    | 'inline_report'
    | 'modal_tx_click'
    | 'shortcut';
  trigger?: string;
  chapter_id?: string;
  [key: string]: unknown;
}

export interface SearchQueryEventParams {
  search_term: string;
  query?: string;
  surface: string;
  trigger?: string;
  selected_apt?: string;
  zone?: string;
  results_count?: number;
  [key: string]: unknown;
}

/**
 * Dispatches GA4 `apartment_view` event with standardized parameters (`apartment_name`, `apt_name`, `surface`, `view_type`, `dong`)
 * and cross-surface parent-child cascade deduplication.
 * Aligns with the core GA4 custom dimension `customEvent:apartment_name` and legacy `apt_name` conventions.
 */
export function trackApartmentView(params: ApartmentViewEventParams): boolean {
  const payload = normalizeApartmentViewPayload(params);
  if (!payload) return false;

  const rawName = payload.apartment_name as string;
  const safeSurface = payload.surface as string;
  const viewType = typeof payload.view_type === 'string' ? payload.view_type : undefined;
  const dongHint = typeof payload.dong === 'string' ? payload.dong : undefined;
  const canonicalSlugHint =
    typeof payload.canonical_slug === 'string' ? payload.canonical_slug : undefined;
  const normName = normalizeAptIdentity(rawName, dongHint, canonicalSlugHint);

  if (shouldSuppressApartmentViewCascade(normName, safeSurface, viewType)) {
    return false;
  }

  analyticsSelf.trackEvent('apartment_view', payload);
  lastApartmentViewRecord = {
    normName,
    surface: safeSurface,
    viewType,
    timestamp: Date.now(),
    dataLayerRef: getCurrentDataLayerRef(),
  };
  return true;
}

/**
 * Dispatches GA4 `search_query` event with standardized parameters (`search_term`, `query`, `surface`).
 * Guards against empty/whitespace-only inputs, truncates terms to GA4's 100-character parameter bound,
 * and deduplicates passive debounce follow-ups after explicit shortcut/keyword selection.
 */
export function trackSearchQuery(params: SearchQueryEventParams): boolean {
  const payload = normalizeSearchQueryPayload(params);
  if (!payload) return false;

  const safeTerm = payload.search_term as string;
  const safeSurface = payload.surface as string;
  const trigger = typeof payload.trigger === 'string' ? payload.trigger : undefined;

  if (shouldSuppressSearchQueryCascade(safeTerm, safeSurface, trigger)) {
    return false;
  }

  analyticsSelf.trackEvent('search_query', payload);
  lastSearchQueryRecord = {
    term: safeTerm,
    surface: safeSurface,
    trigger,
    timestamp: Date.now(),
    dataLayerRef: getCurrentDataLayerRef(),
  };
  return true;
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
  let safePath = trimmedPath.startsWith('/') ? trimmedPath : `/${trimmedPath}`;
  if (safePath.startsWith('/apartment/') && safePath.includes('?')) {
    const [pathAndQuery, hashFragment = ''] = safePath.split('#');
    const [pathnameOnly, rawSearch = ''] = pathAndQuery.split('?');
    const cleanedSearch = stripApartmentNoiseQueryParams(rawSearch ? `?${rawSearch}` : '');
    const hashSuffix = hashFragment ? `#${hashFragment}` : '';
    safePath = `${pathnameOnly}${cleanedSearch}${hashSuffix}`;
  }
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
  resetAnalyticsInteractionState();
  virtualPageViewLedger.length = 0;
  if (typeof window !== 'undefined') {
    window.__dviewVirtualPvCount = 0;
    window.__dviewVirtualPvLedger = virtualPageViewLedger;
  }
}
