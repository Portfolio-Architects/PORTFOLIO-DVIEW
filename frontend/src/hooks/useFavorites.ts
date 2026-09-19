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

export function useFavorites(
  _user?: User | null,
  initialFavoriteCounts: Record<string, number> = {}
) {
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>(initialFavoriteCounts);
  const isMountedRef = useRef(true);

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

  // Fetch latest global favorite counts on mount to ensure sync across devices
  useEffect(() => {
    const controller = new AbortController();

    apiClient.get<unknown>('/api/favorite-counts', { signal: controller.signal })
      .then((data) => {
        if (!isMountedRef.current) return;
        const validation = FavoriteCountsResponseSchema.safeParse(data);
        if (!validation.success) {
          logger.warn('useFavorites.fetchFavoriteCounts', 'Validation failed for /api/favorite-counts', {
            errors: validation.error.issues.map((e) => e.message),
          });
          return;
        }
        const validatedData = validation.data;
        if (validatedData.counts && Object.keys(validatedData.counts).length > 0) {
          setFavoriteCounts((prev) => ({ ...prev, ...validatedData.counts }));
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        logger.warn('useFavorites.fetchFavoriteCounts', 'Failed to fetch global favorite counts', {}, err);
      });

    return () => {
      controller.abort();
    };
  }, []);

  const isFavorited = useCallback(
    (aptName: string): boolean => {
      if (!aptName) return false;
      if (userFavorites.has(aptName)) return true;
      const targetNorm = normalizeAptName(aptName);
      return Array.from(userFavorites).some(
        (item) => normalizeAptName(item) === targetNorm || isSameApartment(item, aptName)
      );
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
