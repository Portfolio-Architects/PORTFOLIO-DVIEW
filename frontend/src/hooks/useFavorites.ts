import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from 'firebase/auth';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';

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

  // Fetch latest global favorite counts on mount to ensure sync across devices
  useEffect(() => {
    // Prevent memory leaks and state updates on unmounted components using a boolean flag
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
      user.getIdToken().then(idToken => {
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
      setUserFavorites(new Set());
      setIsFavoritesLoading(false);
    }
    return () => { unmounted = true; };
  }, [user]);

  const handleToggleFavorite = useCallback(async (aptName: string, requestLogin: () => void) => {
    if (!user) {
      requestLogin();
      return;
    }
    const wasFavorited = userFavorites.has(aptName);
    setUserFavorites(prev => {
      const next = new Set(prev);
      if (wasFavorited) {
        next.delete(aptName);
      } else {
        next.add(aptName);
      }
      return next;
    });
    setFavoriteCounts(prev => ({ ...prev, [aptName]: Math.max(0, (prev[aptName] || 0) + (wasFavorited ? -1 : 1)) }));
    
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({ aptName }),
      });
      if (!res.ok) throw new Error();
    } catch {
      if (!isMountedRef.current) return;
      setUserFavorites(prev => {
        const next = new Set(prev);
        if (wasFavorited) {
          next.add(aptName);
        } else {
          next.delete(aptName);
        }
        return next;
      });
      setFavoriteCounts(prev => ({ ...prev, [aptName]: Math.max(0, (prev[aptName] || 0) + (wasFavorited ? 1 : -1)) }));
    }
  }, [user, userFavorites]);

  const updateFavoriteOrder = useCallback(async (newOrder: string[]) => {
    if (!user) return;
    if (!isMountedRef.current) return;

    setUserFavorites(new Set(newOrder));

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
  }, [user]);

  return {
    userFavorites,
    favoriteCounts,
    handleToggleFavorite,
    updateFavoriteOrder,
    isFavoritesLoading
  };
}
