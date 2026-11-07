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
import { normalizeAptName, isSameApartment } from '@/lib/utils/apartmentMapping';
import { apiClient } from '@/lib/api/apiClient';

const FavoriteCountsResponseSchema = z.object({
  counts: z.record(z.string(), z.number()).optional().catch(undefined),
}).passthrough();

const CLIENT_FAV_COUNTS_TTL_MS = 300_000; // 5 minutes
let clientFavoriteCountsCache: { counts: Record<string, number>; expiresAt: number } | null = null;
let clientFavoriteCountsInFlight: Promise<unknown> | null = null;

/**
 * Checks whether an apartment name matches any saved favorite entry,
 * accounting for whitespace differences and canonical RTMS/display name aliases.
 */
export function isApartmentInFavorites(
  favorites: Set<string> | Iterable<string> | undefined | null,
  aptName: string | undefined | null,
  nameMapping?: Record<string, string>
): boolean {
  if (!favorites || !aptName) return false;
  if (favorites instanceof Set && favorites.has(aptName)) return true;
  const targetNorm = normalizeAptName(aptName);
  for (const item of favorites) {
    if (
      item === aptName ||
      normalizeAptName(item) === targetNorm ||
      isSameApartment(item, aptName, nameMapping)
    ) {
      return true;
    }
  }
  return false;
}

export interface UseFavoritesOptions {
  fetchGlobalCounts?: boolean;
}

export function useFavorites(
  _user?: User | null,
  initialFavoriteCounts: Record<string, number> = {},
  options?: UseFavoritesOptions
) {
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>(initialFavoriteCounts);
  const isMountedRef = useRef(true);
  const fetchGlobalCounts = options?.fetchGlobalCounts ?? false;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper to read local guest favorites
  const getGuestFavorites = useCallback((): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('dview_guest_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every((item): item is string => typeof item === 'string')) {
          return parsed;
        }
      }
    } catch (e) {
      logger.warn('useFavorites.getGuestFavorites', 'Failed to parse guest favorites', {}, e instanceof Error ? e : new Error(String(e)));
    }
    return [];
  }, []);

  // Helper to save local guest favorites and broadcast across components/tabs
  const saveGuestFavorites = useCallback((favs: Set<string> | string[]) => {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.isArray(favs) ? favs : Array.from(favs);
      localStorage.setItem('dview_guest_favorites', JSON.stringify(list));
      window.dispatchEvent(new CustomEvent<string[]>('dview_favorites_updated', { detail: list }));
    } catch (e) {
      logger.warn('useFavorites.saveGuestFavorites', 'Failed to save guest favorites', {}, e instanceof Error ? e : new Error(String(e)));
    }
  }, []);

  // Initialize and listen for storage changes across tabs and custom events across components
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load initial favorites from localStorage
    const initialFavs = getGuestFavorites();
    setUserFavorites(new Set(initialFavs));

    const syncFavorites = (e?: Event) => {
      const customEvent = e instanceof CustomEvent ? (e as CustomEvent<string[]>) : undefined;
      if (customEvent && customEvent.detail && Array.isArray(customEvent.detail)) {
        setUserFavorites(new Set(customEvent.detail));
      } else {
        const guestFavs = getGuestFavorites();
        setUserFavorites(new Set(guestFavs));
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
    if (!isTest && !fetchGlobalCounts) {
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
  }, [fetchGlobalCounts]);

  const isFavorited = useCallback(
    (aptName: string, nameMapping?: Record<string, string>): boolean => {
      return isApartmentInFavorites(userFavorites, aptName, nameMapping);
    },
    [userFavorites]
  );

  const handleToggleFavorite = useCallback(
    async (aptName: string, _requestLogin?: () => void) => {
      const targetNorm = normalizeAptName(aptName);
      const existingMatch = Array.from(userFavorites).find(
        (item) => normalizeAptName(item) === targetNorm || isSameApartment(item, aptName)
      );
      const wasFavorited = !!existingMatch;
      const keyToModify = existingMatch || aptName;

      setUserFavorites((prev) => {
        const next = new Set<string>();
        for (const item of prev) {
          if (normalizeAptName(item) !== targetNorm && !isSameApartment(item, aptName)) {
            next.add(item);
          }
        }
        if (!wasFavorited) {
          next.add(aptName);
        }
        saveGuestFavorites(next);
        return next;
      });

      setFavoriteCounts((prev) => ({
        ...prev,
        [keyToModify]: Math.max(0, (prev[keyToModify] || 0) + (wasFavorited ? -1 : 1)),
      }));
    },
    [userFavorites, saveGuestFavorites]
  );

  const updateFavoriteOrder = useCallback(
    async (newOrder: string[]) => {
      if (!isMountedRef.current) return;
      setUserFavorites(new Set(newOrder));
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
