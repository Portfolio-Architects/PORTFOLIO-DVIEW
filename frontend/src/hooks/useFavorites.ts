/**
 * @module useFavorites
 * @description Hook for managing user and guest favorites with optimistic UI updates,
 * multi-tab storage synchronization, and typed backend persistence via apiClient.
 * Architecture Layer: Application / Hooks (`src/hooks/`)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';
import { normalizeAptName, isSameApartment } from '@/lib/utils/apartmentMapping';
import { apiClient } from '@/lib/api/apiClient';

const FavoriteCountsResponseSchema = z.object({
  counts: z.record(z.string(), z.number()).optional().catch(undefined),
}).passthrough();

const FavoriteListResponseSchema = z.object({
  favorites: z.array(z.string()).optional().catch(undefined),
}).passthrough();

export function useFavorites(user: User | null, initialFavoriteCounts: Record<string, number> = {}) {
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>(initialFavoriteCounts);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState<boolean>(false);

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

  // Listen for storage changes across tabs and custom events across components
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncFavorites = (e?: Event) => {
      if (user) return;
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
  }, [getGuestFavorites, user]);

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
        if (validatedData.counts) {
          setFavoriteCounts(validatedData.counts);
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

  useEffect(() => {
    const controller = new AbortController();

    if (user) {
      setIsFavoritesLoading(true);
      // E2E Mock Auth Bypass
      if (typeof window !== 'undefined' && window.__E2E_MOCK_AUTH__) {
        const timer = setTimeout(() => {
          if (isMountedRef.current) {
            setUserFavorites(new Set());
            setIsFavoritesLoading(false);
          }
        }, 50);
        return () => {
          controller.abort();
          clearTimeout(timer);
        };
      }

      user.getIdToken().then(async (idToken) => {
        if (!isMountedRef.current || controller.signal.aborted) return;

        try {
          const data = await apiClient.get<Record<string, unknown>>('/api/favorite', {
            params: { userId: user.uid },
            headers: { Authorization: `Bearer ${idToken}` },
            signal: controller.signal,
          });

          if (!isMountedRef.current || controller.signal.aborted) return;

          if (data?.error || data?.warning) {
            logger.warn('useFavorites.fetchFavorites', 'API returned warning/error, preserving local state', {
              error: data?.error,
              warning: data?.warning,
            });
            return;
          }

          const validation = FavoriteListResponseSchema.safeParse(data);
          if (validation.success && Array.isArray(validation.data?.favorites)) {
            const serverFavorites = [...validation.data.favorites];

            // Sync any guest favorites saved while unauthenticated
            const guestFavs = getGuestFavorites();
            if (guestFavs.length > 0) {
              const missingFromServer = guestFavs.filter((guestApt) => {
                const guestNorm = normalizeAptName(guestApt);
                return !serverFavorites.some(
                  (serverApt) => normalizeAptName(serverApt) === guestNorm || isSameApartment(serverApt, guestApt)
                );
              });

              if (missingFromServer.length > 0) {
                const syncPromises = missingFromServer.map(async (aptName) => {
                  try {
                    await apiClient.post(
                      '/api/favorite',
                      { aptName, action: 'add' },
                      {
                        headers: { Authorization: `Bearer ${idToken}` },
                        signal: controller.signal,
                      }
                    );
                    return aptName;
                  } catch (e) {
                    logger.warn(
                      'useFavorites.syncGuest',
                      'Failed to sync guest favorite',
                      { aptName },
                      e instanceof Error ? e : new Error(String(e))
                    );
                    return null;
                  }
                });

                const settledResults = await Promise.allSettled(syncPromises);
                for (const result of settledResults) {
                  if (result.status === 'fulfilled' && result.value) {
                    serverFavorites.push(result.value);
                  }
                }
              }

              // Clear dview_guest_favorites key in localStorage immediately after guest sync is completed
              if (typeof window !== 'undefined') {
                try {
                  localStorage.removeItem('dview_guest_favorites');
                } catch (e) {
                  logger.warn('useFavorites.clearGuestFavorites', 'Failed to clear guest favorites', {}, e instanceof Error ? e : new Error(String(e)));
                }
              }
            }

            if (isMountedRef.current && !controller.signal.aborted) {
              setUserFavorites(new Set(serverFavorites));
            }
          }
        } catch (err) {
          if (!controller.signal.aborted) {
            logger.warn('useFavorites.fetchFavorites', 'Failed to fetch favorites', {}, err instanceof Error ? err : new Error(String(err)));
          }
        } finally {
          if (isMountedRef.current && !controller.signal.aborted) {
            setIsFavoritesLoading(false);
          }
        }
      }).catch((err) => {
        if (!controller.signal.aborted) {
          logger.warn('useFavorites.authToken', 'Auth token fetch failed', {}, err instanceof Error ? err : new Error(String(err)));
        }
        if (isMountedRef.current && !controller.signal.aborted) {
          setIsFavoritesLoading(false);
        }
      });
    } else {
      // Guest mode: load favorites from localStorage
      const guestFavs = getGuestFavorites();
      setUserFavorites(new Set(guestFavs));
      setIsFavoritesLoading(false);
    }

    return () => {
      controller.abort();
    };
  }, [user, getGuestFavorites]);

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
        if (!user) {
          saveGuestFavorites(next);
        }
        return next;
      });

      setFavoriteCounts((prev) => ({
        ...prev,
        [keyToModify]: Math.max(0, (prev[keyToModify] || 0) + (wasFavorited ? -1 : 1)),
      }));

      if (!user) {
        return;
      }

      // E2E Mock Auth Bypass
      if (typeof window !== 'undefined' && window.__E2E_MOCK_AUTH__) {
        return;
      }

      try {
        const idToken = await user.getIdToken();
        await apiClient.post(
          '/api/favorite',
          { aptName: keyToModify, action: wasFavorited ? 'remove' : 'add' },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
      } catch (err) {
        if (!isMountedRef.current) return;
        logger.warn(
          'useFavorites.handleToggleFavorite',
          'Network error during favorite sync',
          { aptName: keyToModify },
          err instanceof Error ? err : new Error(String(err))
        );
      }
    },
    [user, userFavorites, saveGuestFavorites]
  );

  const updateFavoriteOrder = useCallback(
    async (newOrder: string[]) => {
      if (!isMountedRef.current) return;

      setUserFavorites(new Set(newOrder));
      if (!user) {
        saveGuestFavorites(newOrder);
      }

      if (!user) return;

      // E2E Mock Auth Bypass
      if (typeof window !== 'undefined' && window.__E2E_MOCK_AUTH__) {
        return;
      }

      try {
        const idToken = await user.getIdToken();
        await apiClient.put(
          '/api/favorite',
          { favoriteOrder: newOrder },
          { headers: { Authorization: `Bearer ${idToken}` } }
        );
      } catch (err) {
        if (!isMountedRef.current) return;
        logger.warn('useFavorites.updateFavoriteOrder', 'Failed to save order to Firestore', {}, err instanceof Error ? err : new Error(String(err)));
      }
    },
    [user, saveGuestFavorites]
  );

  return {
    userFavorites,
    favoriteCounts,
    handleToggleFavorite,
    isFavorited,
    updateFavoriteOrder,
    isFavoritesLoading,
  };
}
