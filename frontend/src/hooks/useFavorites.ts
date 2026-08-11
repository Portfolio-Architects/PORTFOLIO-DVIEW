import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';
import { normalizeAptName, isSameApartment } from '@/lib/utils/apartmentMapping';

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
    return () => { isMountedRef.current = false; };
  }, []);

  // Helper to read local guest favorites
  const getGuestFavorites = useCallback((): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('dview_guest_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      logger.warn('useFavorites.getGuestFavorites', 'Failed to parse guest favorites', {}, e as Error);
    }
    return [];
  }, []);

  // Helper to save local guest favorites
  const saveGuestFavorites = useCallback((favs: Set<string> | string[]) => {
    if (typeof window === 'undefined') return;
    try {
      const list = Array.isArray(favs) ? favs : Array.from(favs);
      localStorage.setItem('dview_guest_favorites', JSON.stringify(list));
    } catch (e) {
      logger.warn('useFavorites.saveGuestFavorites', 'Failed to save guest favorites', {}, e as Error);
    }
  }, []);

  // Fetch latest global favorite counts on mount to ensure sync across devices
  useEffect(() => {
    let unmounted = false;
    fetch('/api/favorite-counts')
      .then(res => res.json())
      .then(data => {
        if (unmounted) return;
        const validation = FavoriteCountsResponseSchema.safeParse(data);
        if (!validation.success) {
          logger.warn('useFavorites.fetchFavoriteCounts', 'Validation failed for /api/favorite-counts', {
            errors: validation.error.issues.map(e => e.message),
          });
          return;
        }
        const validatedData = validation.data;
        if (validatedData.counts) {
          setFavoriteCounts(validatedData.counts);
        }
      })
      .catch(err => logger.warn('useFavorites.fetchFavoriteCounts', 'Failed to fetch global favorite counts', {}, err));
    return () => { unmounted = true; };
  }, []);

  useEffect(() => {
    let unmounted = false;
    if (user) {
      setIsFavoritesLoading(true);
      // E2E Mock Auth Bypass
      if (typeof window !== 'undefined' && (window as any).__E2E_MOCK_AUTH__) {
        const timer = setTimeout(() => {
          if (!unmounted) {
            setUserFavorites(new Set());
            setIsFavoritesLoading(false);
          }
        }, 50);
        return () => {
          unmounted = true;
          clearTimeout(timer);
        };
      }

      user.getIdToken().then(async (idToken) => {
        // Sync any guest favorites saved while unauthenticated
        const guestFavs = getGuestFavorites();
        if (guestFavs.length > 0) {
          for (const aptName of guestFavs) {
            try {
              await fetch('/api/favorite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ aptName }),
              });
            } catch (e) {
              logger.warn('useFavorites.syncGuest', 'Failed to sync guest favorite', { aptName }, e as Error);
            }
          }
          try { localStorage.removeItem('dview_guest_favorites'); } catch {}
        }

        fetch(`/api/favorite?userId=${user.uid}`, { headers: { 'Authorization': `Bearer ${idToken}` } })
          .then(r => r.json())
          .then(data => {
            if (unmounted) return;
            const validation = FavoriteListResponseSchema.safeParse(data);
            if (!validation.success) {
              logger.warn('useFavorites.fetchFavorites', 'Validation failed for /api/favorite', {
                errors: validation.error.issues.map(e => e.message),
              });
              return;
            }
            if (data?.error || data?.warning) {
              logger.warn('useFavorites.fetchFavorites', 'API returned warning/error, preserving local state', {
                error: data?.error,
                warning: data?.warning,
              });
              return;
            }
            const validatedData = validation.data;
            if (validatedData.favorites) {
              setUserFavorites(new Set(validatedData.favorites));
            }
          })
          .catch(err => logger.warn('useFavorites.fetchFavorites', 'Failed to fetch favorites', {}, err))
          .finally(() => {
            if (!unmounted) {
              setIsFavoritesLoading(false);
            }
          });
      }).catch(err => {
        logger.warn('useFavorites.authToken', 'Auth token fetch failed', {}, err);
        if (!unmounted) {
          setIsFavoritesLoading(false);
        }
      });
    } else {
      // Guest mode: load favorites from localStorage
      const guestFavs = getGuestFavorites();
      setUserFavorites(new Set(guestFavs));
      setIsFavoritesLoading(false);
    }
    return () => { unmounted = true; };
  }, [user, getGuestFavorites]);

  const isFavorited = useCallback((aptName: string): boolean => {
    if (!aptName) return false;
    if (userFavorites.has(aptName)) return true;
    const targetNorm = normalizeAptName(aptName);
    return Array.from(userFavorites).some(
      item => normalizeAptName(item) === targetNorm || isSameApartment(item, aptName)
    );
  }, [userFavorites]);

  const handleToggleFavorite = useCallback(async (aptName: string, requestLogin?: () => void) => {
    const targetNorm = normalizeAptName(aptName);
    const existingMatch = Array.from(userFavorites).find(
      item => normalizeAptName(item) === targetNorm || isSameApartment(item, aptName)
    );
    const wasFavorited = !!existingMatch;
    const keyToModify = existingMatch || aptName;

    setUserFavorites(prev => {
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

    setFavoriteCounts(prev => ({
      ...prev,
      [keyToModify]: Math.max(0, (prev[keyToModify] || 0) + (wasFavorited ? -1 : 1))
    }));

    if (!user) {
      return;
    }

    // E2E Mock Auth Bypass
    if (typeof window !== 'undefined' && (window as any).__E2E_MOCK_AUTH__) {
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ aptName: keyToModify }),
      });
      if (!res.ok) {
        logger.warn('useFavorites.handleToggleFavorite', 'Backend favorite sync failed, preserving local state', { aptName: keyToModify, status: res.status });
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      logger.warn('useFavorites.handleToggleFavorite', 'Network error during favorite sync', { aptName: keyToModify }, err as Error);
    }
  }, [user, userFavorites, saveGuestFavorites]);

  const updateFavoriteOrder = useCallback(async (newOrder: string[]) => {
    if (!isMountedRef.current) return;

    setUserFavorites(new Set(newOrder));
    saveGuestFavorites(newOrder);

    if (!user) return;

    // E2E Mock Auth Bypass
    if (typeof window !== 'undefined' && (window as any).__E2E_MOCK_AUTH__) {
      return;
    }

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/favorite', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ favoriteOrder: newOrder }),
      });
      if (!res.ok) throw new Error('Failed to update favorite order');
    } catch (err) {
      if (!isMountedRef.current) return;
      logger.warn('useFavorites.updateFavoriteOrder', 'Failed to save order to Firestore', {}, err as Error);
    }
  }, [user, saveGuestFavorites]);

  return {
    userFavorites,
    favoriteCounts,
    handleToggleFavorite,
    isFavorited,
    updateFavoriteOrder,
    isFavoritesLoading
  };
}
