/**
 * @module useFavorites
 * @description Hook for managing favorites 100% locally via localStorage,
 * multi-tab storage synchronization, and zero remote /api/favorite dependency.
 * Architecture Layer: Application / Hooks (`src/hooks/`)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';
import {
  normalizeAptName,
  isSameApartment,
  isApartmentInFavorites,
  resolveCanonicalAptSlug,
  NOISE_APARTMENT_QUERY_PARAMS,
} from '@/lib/utils/apartmentMapping';
import {
  CANONICAL_DONG_APT_LIST,
  CANONICAL_TX_SUMMARY_MAP,
} from '@/lib/utils/canonicalAptCatalog';
import { apiClient } from '@/lib/api/apiClient';

export { isApartmentInFavorites };

export const INAPP_FAVORITES_HANDOFF_PARAM = 'dview_fav';
export const INAPP_EXTERNAL_BROWSER_FLAG_PARAM = 'openExternalBrowser';
const MAX_HANDOFF_FAVORITES = 10;

const GLOBAL_PLACEHOLDER_APT_NAMES = new Set(['동탄 전체', '동탄 전역', '아파트']);

type HandoffWindow = Window & {
  __dviewInboundFavPayloads?: string[];
};

// Volatile session fallback used ONLY when localStorage writes throw (e.g. Private Mode / sandboxed WebViews)
let volatileSessionFavorites: string[] | null = null;

function isLocalStorageCurrentlyWritable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const probeKey = '__dview_fav_rw_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function persistGuestFavoritesSafely(list: string[], context: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('dview_guest_favorites', JSON.stringify(list));
    volatileSessionFavorites = null;
  } catch (e) {
    volatileSessionFavorites = [...list];
    logger.warn(
      context,
      'Failed to persist guest favorites to localStorage; using volatile session fallback',
      {},
      e instanceof Error ? e : new Error(String(e))
    );
  }
}

let verifiedCatalogSlugSetCache: Set<string> | null = null;

function getVerifiedCatalogSlugSet(): Set<string> {
  if (verifiedCatalogSlugSetCache) return verifiedCatalogSlugSetCache;
  const set = new Set<string>(Object.keys(CANONICAL_TX_SUMMARY_MAP));
  for (const entry of CANONICAL_DONG_APT_LIST) {
    if (entry.txKey) set.add(entry.txKey);
    if (entry.name) set.add(entry.name);
    if (entry.rawTxKey) set.add(entry.rawTxKey);
  }
  verifiedCatalogSlugSetCache = set;
  return set;
}

/**
 * Resolves and validates a candidate apartment identifier against the official
 * Dongtan canonical catalog so untrusted URL handoff parameters can never inject
 * arbitrary strings, XSS payloads, or non-existent complex names into localStorage.
 */
export function resolveVerifiedGuestFavoriteSlug(
  rawName: string | null | undefined
): string | null {
  if (typeof rawName !== 'string') return null;
  const trimmed = rawName.trim().normalize('NFC');
  if (
    !trimmed ||
    trimmed.length < 2 ||
    trimmed.length > 80 ||
    GLOBAL_PLACEHOLDER_APT_NAMES.has(trimmed) ||
    /[<>'"`;\\]|[\u0000-\u001F]/.test(trimmed)
  ) {
    return null;
  }

  const resolved = resolveCanonicalAptSlug(trimmed);
  if (!resolved || GLOBAL_PLACEHOLDER_APT_NAMES.has(resolved)) {
    return null;
  }

  const catalogSet = getVerifiedCatalogSlugSet();
  if (!catalogSet.has(resolved)) {
    return null;
  }

  return resolved;
}

function sanitizeFavoritesArray(rawItems: ReadonlyArray<unknown>): string[] {
  const deduped: string[] = [];
  const seenNorms = new Set<string>();
  for (const item of rawItems) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || GLOBAL_PLACEHOLDER_APT_NAMES.has(trimmed)) continue;
    const norm = normalizeAptName(trimmed);
    if (!norm || seenNorms.has(norm)) continue;
    seenNorms.add(norm);
    deduped.push(trimmed);
  }
  return deduped;
}

/**
 * Reads and sanitizes `dview_guest_favorites` from localStorage, recovering valid
 * apartment names even if the stored JSON is corrupted or contains mixed/blank entries,
 * and falling back to volatile session state when storage writes are blocked (Private Mode).
 */
export function readSanitizedGuestFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = window.localStorage.getItem('dview_guest_favorites');
    if (!saved) {
      if (volatileSessionFavorites !== null) {
        if (isLocalStorageCurrentlyWritable()) {
          volatileSessionFavorites = null;
          return [];
        }
        return sanitizeFavoritesArray(volatileSessionFavorites);
      }
      return [];
    }
    volatileSessionFavorites = null;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    return sanitizeFavoritesArray(parsed);
  } catch (e) {
    if (volatileSessionFavorites !== null) {
      return sanitizeFavoritesArray(volatileSessionFavorites);
    }
    logger.warn(
      'useFavorites.readSanitizedGuestFavorites',
      'Failed to parse guest favorites; falling back to empty list',
      {},
      e instanceof Error ? e : new Error(String(e))
    );
    return [];
  }
}

/**
 * Pure non-login helper that idempotently saves a canonical apartment name into
 * `dview_guest_favorites` (localStorage) and broadcasts `dview_favorites_updated`
 * across all mounted components without requiring authentication or calling a React hook.
 * Returns `true` when newly added, `false` when already saved or invalid.
 */
export function ensureGuestFavoriteSaved(aptName: string): boolean {
  if (typeof window === 'undefined' || typeof aptName !== 'string') return false;
  const trimmed = aptName.trim();
  if (!trimmed || GLOBAL_PLACEHOLDER_APT_NAMES.has(trimmed)) return false;

  const currentList = readSanitizedGuestFavorites();
  const targetNorm = normalizeAptName(trimmed);
  const alreadyExists = currentList.some(
    (item) => normalizeAptName(item) === targetNorm || isSameApartment(item, trimmed)
  );
  if (alreadyExists) {
    return false;
  }

  const nextList = [...currentList, trimmed];
  persistGuestFavoritesSafely(nextList, 'useFavorites.ensureGuestFavoriteSaved');
  window.dispatchEvent(new CustomEvent<string[]>('dview_favorites_updated', { detail: nextList }));
  return true;
}

export interface InboundFavoritesHandoffReceipt {
  hadHandoffParam: boolean;
  restoredSlugs: string[];
  newlyAddedSlugs: string[];
  mergedFavorites: string[];
  cleanedRelativeUrl: string | null;
}

interface TimestampedHandoffReceipt {
  receipt: InboundFavoritesHandoffReceipt;
  createdAt: number;
  pathname: string;
}

let pendingInAppHandoffReceipt: TimestampedHandoffReceipt | null = null;

/**
 * Normalizes shallow modal routes (`/apartment/<0-tx>`, non-canonical `/apartment/<alias>`,
 * `/compare?apt1=...`, `/calculator/<type>?apt=...`) into guaranteed HTTP 200 SSR/SSG targets
 * so external browsers (Safari, Chrome) never hit a 404 when arriving from an In-App WebView.
 */
function normalizeOutboundHandoffRoute(parsed: URL): boolean {
  let mutated = false;

  if (parsed.pathname.startsWith('/apartment/')) {
    const rawSeg = parsed.pathname.slice('/apartment/'.length).replace(/\/+$/, '');
    if (rawSeg && !rawSeg.includes('/')) {
      const resolved = resolveCanonicalAptSlug(rawSeg);
      if (resolved && Object.prototype.hasOwnProperty.call(CANONICAL_TX_SUMMARY_MAP, resolved)) {
        const canonicalPath = `/apartment/${encodeURIComponent(resolved)}`;
        if (parsed.pathname !== canonicalPath) {
          parsed.pathname = canonicalPath;
          mutated = true;
        }
      } else {
        const verifiedCatalogSlug = resolveVerifiedGuestFavoriteSlug(resolved || rawSeg);
        if (verifiedCatalogSlug) {
          parsed.pathname = '/explore';
          parsed.searchParams.set('apt', verifiedCatalogSlug);
          if (!parsed.hash || !/[#&]apt=/.test(parsed.hash)) {
            parsed.hash = `#apt=${encodeURIComponent(verifiedCatalogSlug)}`;
          }
          mutated = true;
        }
      }
    }
    return mutated;
  }

  if (parsed.pathname === '/compare' || parsed.pathname === '/compare/') {
    if (parsed.searchParams.has('apt1') || parsed.searchParams.has('apt2')) {
      parsed.pathname = '/explore';
      if (!parsed.searchParams.has('calc')) {
        parsed.searchParams.set('calc', 'compare');
      }
      mutated = true;
    }
    return mutated;
  }

  const calcMatch = parsed.pathname.match(
    /^\/calculator\/(mortgage|tax|property_tax|jeonse_safety|sell_timing)\/?$/i
  );
  if (calcMatch) {
    parsed.pathname = '/explore';
    parsed.searchParams.set('calc', calcMatch[1].toLowerCase());
    const aptParam = parsed.searchParams.get('apt');
    if (aptParam && !parsed.searchParams.has('apt1')) {
      parsed.searchParams.set('apt1', aptParam);
    }
    parsed.searchParams.delete('apt');
    mutated = true;
  }

  return mutated;
}

/**
 * Appends verified canonical guest favorites (`?dview_fav=...`) onto an outbound URL
 * used when transitioning from an isolated In-App WebView (KakaoTalk, Naver, LINE, Instagram, etc.)
 * into an external system browser (Safari, Chrome). Preserves existing query parameters
 * and `#hash` fragments while guaranteeing explicit `extraAptNames` are never dropped
 * and shallow modal routes resolve to HTTP 200 pages.
 */
export function buildGuestFavoritesHandoffUrl(
  currentUrl: string,
  extraAptNames?: ReadonlyArray<string | null | undefined>
): string {
  if (!currentUrl || typeof currentUrl !== 'string') return '';
  const trimmedUrl = currentUrl.trim();
  if (!trimmedUrl) return '';

  const explicitSlugs: string[] = [];
  const explicitNorms = new Set<string>();
  if (Array.isArray(extraAptNames)) {
    for (const extra of extraAptNames) {
      const verified = resolveVerifiedGuestFavoriteSlug(extra);
      if (!verified) continue;
      const norm = normalizeAptName(verified);
      if (!norm || explicitNorms.has(norm)) continue;
      explicitNorms.add(norm);
      explicitSlugs.push(verified);
      if (explicitSlugs.length >= MAX_HANDOFF_FAVORITES) break;
    }
  }

  const savedCandidates: string[] = [];
  const savedNorms = new Set<string>();
  for (const saved of readSanitizedGuestFavorites()) {
    const verified = resolveVerifiedGuestFavoriteSlug(saved);
    if (!verified) continue;
    const norm = normalizeAptName(verified);
    if (!norm || explicitNorms.has(norm) || savedNorms.has(norm)) continue;
    savedNorms.add(norm);
    savedCandidates.push(verified);
  }

  const remainingBudget = Math.max(0, MAX_HANDOFF_FAVORITES - explicitSlugs.length);
  const retainedSaved =
    remainingBudget > 0 ? savedCandidates.slice(-remainingBudget) : [];
  const finalSlugs = [...retainedSaved, ...explicitSlugs];

  try {
    const isRelative = trimmedUrl.startsWith('/');
    const parsed = new URL(trimmedUrl, 'https://dongtanview.com');
    let mutated = normalizeOutboundHandoffRoute(parsed);

    for (const key of Array.from(parsed.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (
        lower === INAPP_FAVORITES_HANDOFF_PARAM ||
        lower === INAPP_EXTERNAL_BROWSER_FLAG_PARAM.toLowerCase() ||
        (NOISE_APARTMENT_QUERY_PARAMS as readonly string[]).includes(lower)
      ) {
        parsed.searchParams.delete(key);
        mutated = true;
      }
    }

    if (finalSlugs.length > 0) {
      parsed.searchParams.set(INAPP_FAVORITES_HANDOFF_PARAM, finalSlugs.join(','));
      mutated = true;
    }

    if (!mutated) {
      return trimmedUrl;
    }
    return isRelative ? `${parsed.pathname}${parsed.search}${parsed.hash}` : parsed.toString();
  } catch {
    return trimmedUrl;
  }
}

/**
 * Idempotently consumes `?dview_fav=...` (including pre-hydration `<head>` stashed payloads)
 * upon arrival in an external browser, validates every slug against the official Dongtan catalog,
 * merges valid complexes into `dview_guest_favorites` without overwriting pre-existing favorites,
 * and strips URL handoff/crawler noise via `window.history.replaceState` while preserving
 * legitimate query params (`utm_*`, etc.), `#hash`, and `window.history.state`.
 */
export function consumeInboundGuestFavoritesFromUrl(): InboundFavoritesHandoffReceipt {
  if (typeof window === 'undefined') {
    return {
      hadHandoffParam: false,
      restoredSlugs: [],
      newlyAddedSlugs: [],
      mergedFavorites: [],
      cleanedRelativeUrl: null,
    };
  }

  const win = window as HandoffWindow;
  const preHydrationPayloads = Array.isArray(win.__dviewInboundFavPayloads)
    ? win.__dviewInboundFavPayloads.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : [];
  if ('__dviewInboundFavPayloads' in win) {
    delete win.__dviewInboundFavPayloads;
  }

  const rawSearch = window.location.search || '';
  const params = rawSearch
    ? new URLSearchParams(rawSearch.startsWith('?') ? rawSearch.slice(1) : rawSearch)
    : null;

  let hasHandoffKey = preHydrationPayloads.length > 0;
  let hasUrlTransientKey = false;
  const rawPayloads: string[] = [...preHydrationPayloads];

  if (params) {
    for (const [key, val] of Array.from(params.entries())) {
      const lower = key.toLowerCase();
      if (lower === INAPP_FAVORITES_HANDOFF_PARAM) {
        hasHandoffKey = true;
        hasUrlTransientKey = true;
        if (val) rawPayloads.push(val);
      } else if (lower === INAPP_EXTERNAL_BROWSER_FLAG_PARAM.toLowerCase()) {
        hasUrlTransientKey = true;
      }
    }
  }

  if (!hasHandoffKey) {
    if (hasUrlTransientKey && params) {
      for (const key of Array.from(params.keys())) {
        const lower = key.toLowerCase();
        if (
          lower === INAPP_EXTERNAL_BROWSER_FLAG_PARAM.toLowerCase() ||
          (NOISE_APARTMENT_QUERY_PARAMS as readonly string[]).includes(lower)
        ) {
          params.delete(key);
        }
      }
      const remainingOnlyQuery = params.toString();
      const cleanOnlyUrl = `${window.location.pathname || '/'}${remainingOnlyQuery ? `?${remainingOnlyQuery}` : ''}${window.location.hash || ''}`;
      try {
        window.history?.replaceState?.(window.history.state, '', cleanOnlyUrl);
      } catch {
        // Ignore SecurityError in sandboxed preview iframes
      }
      return {
        hadHandoffParam: false,
        restoredSlugs: [],
        newlyAddedSlugs: [],
        mergedFavorites: [],
        cleanedRelativeUrl: cleanOnlyUrl,
      };
    }

    return {
      hadHandoffParam: false,
      restoredSlugs: [],
      newlyAddedSlugs: [],
      mergedFavorites: [],
      cleanedRelativeUrl: null,
    };
  }

  const restoredSlugs: string[] = [];
  const seenRestoredNorms = new Set<string>();
  for (const payload of rawPayloads) {
    for (const rawPart of payload.split(',')) {
      let candidate = rawPart;
      if (candidate.includes('%')) {
        try {
          candidate = decodeURIComponent(candidate);
        } catch {
          // Keep raw token if percent sequence is malformed
        }
      }
      const verified = resolveVerifiedGuestFavoriteSlug(candidate);
      if (!verified) continue;
      const norm = normalizeAptName(verified);
      if (!norm || seenRestoredNorms.has(norm)) continue;
      seenRestoredNorms.add(norm);
      restoredSlugs.push(verified);
      if (restoredSlugs.length >= MAX_HANDOFF_FAVORITES) break;
    }
    if (restoredSlugs.length >= MAX_HANDOFF_FAVORITES) break;
  }

  const currentList = readSanitizedGuestFavorites();
  const mergedFavorites = [...currentList];
  const newlyAddedSlugs: string[] = [];

  for (const slug of restoredSlugs) {
    const slugNorm = normalizeAptName(slug);
    const exists = mergedFavorites.some(
      (existing) => normalizeAptName(existing) === slugNorm || isSameApartment(existing, slug)
    );
    if (!exists) {
      mergedFavorites.push(slug);
      newlyAddedSlugs.push(slug);
    }
  }

  if (newlyAddedSlugs.length > 0) {
    persistGuestFavoritesSafely(
      mergedFavorites,
      'useFavorites.consumeInboundGuestFavoritesFromUrl'
    );
  }

  const pathname = window.location.pathname || '/';
  const hash = window.location.hash || '';
  let cleanedRelativeUrl = `${pathname}${rawSearch}${hash}`;

  if (params && hasUrlTransientKey) {
    for (const key of Array.from(params.keys())) {
      const lower = key.toLowerCase();
      if (
        lower === INAPP_FAVORITES_HANDOFF_PARAM ||
        lower === INAPP_EXTERNAL_BROWSER_FLAG_PARAM.toLowerCase() ||
        (NOISE_APARTMENT_QUERY_PARAMS as readonly string[]).includes(lower)
      ) {
        params.delete(key);
      }
    }
    const remainingQuery = params.toString();
    cleanedRelativeUrl = `${pathname}${remainingQuery ? `?${remainingQuery}` : ''}${hash}`;
    try {
      window.history?.replaceState?.(window.history.state, '', cleanedRelativeUrl);
    } catch {
      // Ignore SecurityError in sandboxed preview iframes
    }
  }

  const receipt: InboundFavoritesHandoffReceipt = {
    hadHandoffParam: true,
    restoredSlugs,
    newlyAddedSlugs,
    mergedFavorites,
    cleanedRelativeUrl,
  };

  if (newlyAddedSlugs.length > 0) {
    window.dispatchEvent(
      new CustomEvent<string[]>('dview_favorites_updated', { detail: mergedFavorites })
    );
  }

  if (restoredSlugs.length > 0) {
    pendingInAppHandoffReceipt = {
      receipt,
      createdAt: Date.now(),
      pathname,
    };
    window.dispatchEvent(
      new CustomEvent<InboundFavoritesHandoffReceipt>('dview_inapp_favorites_restored', {
        detail: receipt,
      })
    );
  }

  return receipt;
}

/**
 * Drains a fresh one-time receipt produced during the current page hydration cycle
 * (e.g. when a child `useFavorites` hook or shallow modal opener consumed `?dview_fav=`
 * milliseconds before `PWAProvider` mounted its effect). Automatically discards stale or cleared receipts.
 */
export function takePendingInAppHandoffReceipt(): InboundFavoritesHandoffReceipt | null {
  const pending = pendingInAppHandoffReceipt;
  pendingInAppHandoffReceipt = null;
  if (!pending || typeof window === 'undefined') return null;

  const currentPathname = window.location.pathname || '/';
  const isCompatibleHydrationPath =
    pending.pathname === currentPathname || currentPathname.startsWith('/apartment/');

  if (Date.now() - pending.createdAt > 2500 || !isCompatibleHydrationPath) {
    return null;
  }

  const currentStored = readSanitizedGuestFavorites();
  const stillIntact = pending.receipt.restoredSlugs.every((slug) =>
    isApartmentInFavorites(currentStored, slug)
  );
  return stillIntact ? pending.receipt : null;
}

const FavoriteCountsResponseSchema = z.object({
  counts: z.record(z.string(), z.number()).optional().catch(undefined),
}).passthrough();

const CLIENT_FAV_COUNTS_TTL_MS = 300_000; // 5 minutes
let clientFavoriteCountsCache: { counts: Record<string, number>; expiresAt: number } | null = null;
let clientFavoriteCountsInFlight: Promise<unknown> | null = null;

export interface UseFavoritesOptions {
  fetchGlobalCounts?: boolean;
  skipRemoteInTest?: boolean;
}

export function useFavorites(
  _user?: User | null,
  initialFavoriteCounts: Record<string, number> = {},
  options?: UseFavoritesOptions
) {
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>(initialFavoriteCounts);
  const isMountedRef = useRef(true);
  const userFavoritesRef = useRef<Set<string>>(userFavorites);
  userFavoritesRef.current = userFavorites;
  const fetchGlobalCounts = options?.fetchGlobalCounts ?? false;
  const skipRemoteInTest = options?.skipRemoteInTest ?? false;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper to read local guest favorites (sanitized against corrupted or mixed-type entries)
  const getGuestFavorites = useCallback((): string[] => {
    return readSanitizedGuestFavorites();
  }, []);

  // Helper to save local guest favorites and broadcast across components/tabs
  const saveGuestFavorites = useCallback((favs: Set<string> | string[]) => {
    if (typeof window === 'undefined') return;
    const list = sanitizeFavoritesArray(Array.isArray(favs) ? favs : Array.from(favs));
    persistGuestFavoritesSafely(list, 'useFavorites.saveGuestFavorites');
    window.dispatchEvent(new CustomEvent<string[]>('dview_favorites_updated', { detail: list }));
  }, []);

  // Initialize and listen for storage changes across tabs and custom events across components
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Hydrate any inbound In-App -> External Browser handoff favorites (?dview_fav=...) and clean URL noise immediately
    consumeInboundGuestFavoritesFromUrl();

    // Load initial favorites from localStorage
    const initialFavs = getGuestFavorites();
    const initialSet = new Set(initialFavs);
    userFavoritesRef.current = initialSet;
    setUserFavorites(initialSet);

    const syncFavorites = (e?: Event) => {
      const customEvent = e instanceof CustomEvent ? (e as CustomEvent<string[]>) : undefined;
      if (customEvent && customEvent.detail && Array.isArray(customEvent.detail)) {
        const sanitizedDetail = customEvent.detail
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter((item) => item.length > 0 && !GLOBAL_PLACEHOLDER_APT_NAMES.has(item));
        const syncedSet = new Set(sanitizedDetail);
        userFavoritesRef.current = syncedSet;
        setUserFavorites(syncedSet);
      } else {
        const guestFavs = getGuestFavorites();
        const syncedSet = new Set(guestFavs);
        userFavoritesRef.current = syncedSet;
        setUserFavorites(syncedSet);
      }
    };

    window.addEventListener('dview_favorites_updated', syncFavorites);
    window.addEventListener('storage', syncFavorites);
    return () => {
      window.removeEventListener('dview_favorites_updated', syncFavorites);
      window.removeEventListener('storage', syncFavorites);
    };
  }, [getGuestFavorites]);

  // Fetch global favorite counts only in test environment or when explicitly opted in
  useEffect(() => {
    const isTest = process.env.NODE_ENV === 'test';
    if ((!isTest && !fetchGlobalCounts) || skipRemoteInTest) {
      return;
    }

    if (!isTest && clientFavoriteCountsCache && Date.now() < clientFavoriteCountsCache.expiresAt) {
      const cachedCounts = clientFavoriteCountsCache.counts;
      if (Object.keys(cachedCounts).length > 0) {
        setFavoriteCounts((prev) => ({ ...prev, ...cachedCounts }));
      }
      return;
    }

    const controller = new AbortController();
    const requestPromise = isTest
      ? apiClient.get<unknown>('/api/favorite-counts', { signal: controller.signal })
      : (clientFavoriteCountsInFlight ??= apiClient
          .get<unknown>('/api/favorite-counts')
          .finally(() => {
            clientFavoriteCountsInFlight = null;
          }));

    requestPromise
      .then((data) => {
        if (!isMountedRef.current || controller.signal.aborted) return;
        const validation = FavoriteCountsResponseSchema.safeParse(data);
        if (!validation.success) {
          logger.warn('useFavorites.fetchFavoriteCounts', 'Validation failed for /api/favorite-counts', {
            errors: validation.error.issues.map((e) => e.message),
          });
          return;
        }
        const validatedData = validation.data;
        if (validatedData.counts) {
          if (!isTest) {
            clientFavoriteCountsCache = {
              counts: validatedData.counts,
              expiresAt: Date.now() + CLIENT_FAV_COUNTS_TTL_MS,
            };
          }
          if (Object.keys(validatedData.counts).length > 0) {
            setFavoriteCounts((prev) => ({ ...prev, ...validatedData.counts }));
          }
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        logger.warn('useFavorites.fetchFavoriteCounts', 'Failed to fetch global favorite counts', {}, err);
      });

    return () => {
      controller.abort();
    };
  }, [fetchGlobalCounts, skipRemoteInTest]);

  const isFavorited = useCallback(
    (aptName: string, nameMapping?: Record<string, string>): boolean => {
      return isApartmentInFavorites(userFavorites, aptName, nameMapping);
    },
    [userFavorites]
  );

  const handleToggleFavorite = useCallback(
    async (aptName: string, _requestLogin?: () => void) => {
      const trimmed = typeof aptName === 'string' ? aptName.trim() : '';
      if (!trimmed) return;

      const currentFavs = userFavoritesRef.current;
      const targetNorm = normalizeAptName(trimmed);
      const existingMatch = Array.from(currentFavs).find(
        (item) => normalizeAptName(item) === targetNorm || isSameApartment(item, trimmed)
      );
      const wasFavorited = !!existingMatch;
      const keyToModify = existingMatch || trimmed;

      const next = new Set<string>();
      for (const item of currentFavs) {
        if (normalizeAptName(item) !== targetNorm && !isSameApartment(item, trimmed)) {
          next.add(item);
        }
      }
      if (!wasFavorited) {
        next.add(trimmed);
      }

      userFavoritesRef.current = next;
      setUserFavorites(next);
      saveGuestFavorites(next);

      setFavoriteCounts((prev) => ({
        ...prev,
        [keyToModify]: Math.max(0, (prev[keyToModify] || 0) + (wasFavorited ? -1 : 1)),
      }));
    },
    [saveGuestFavorites]
  );

  const updateFavoriteOrder = useCallback(
    async (newOrder: string[]) => {
      if (!isMountedRef.current) return;
      const next = new Set(newOrder);
      userFavoritesRef.current = next;
      setUserFavorites(next);
      saveGuestFavorites(newOrder);
    },
    [saveGuestFavorites]
  );

  return {
    userFavorites,
    favoriteCounts,
    handleToggleFavorite,
    isFavorited,
    updateFavoriteOrder,
    isFavoritesLoading: false,
    // Alias signatures for canonical contract parity
    favorites: Array.from(userFavorites),
    isFavorite: isFavorited,
    toggleFavorite: handleToggleFavorite,
    favoritesCount: userFavorites.size,
  };
}
