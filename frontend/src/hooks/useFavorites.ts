import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { logger } from '@/lib/services/logger';

export function useFavorites(user: User | null, initialFavoriteCounts: Record<string, number> = {}) {
  const [userFavorites, setUserFavorites] = useState<Set<string>>(new Set());
  const [favoriteCounts, setFavoriteCounts] = useState<Record<string, number>>(initialFavoriteCounts);

  // Fetch latest global favorite counts on mount to ensure sync across devices
  useEffect(() => {
    let unmounted = false;
    fetch('/api/favorite-counts')
      .then(res => res.json())
      .then(data => {
        if (!unmounted && data.counts) {
          setFavoriteCounts(data.counts);
        }
      })
      .catch(err => logger.warn('Dashboard', 'Failed to fetch global favorite counts', {}, err));
    return () => { unmounted = true; };
  }, []);

  useEffect(() => {
    let unmounted = false;
    if (user) {
      user.getIdToken().then(idToken => {
        fetch(`/api/favorite?userId=${user.uid}`, { headers: { 'Authorization': `Bearer ${idToken}` } })
          .then(r => r.json())
          .then(data => { if (!unmounted && data.favorites) setUserFavorites(new Set(data.favorites)); })
          .catch(err => logger.warn('Dashboard', 'Failed to fetch favorites', {}, err));
      }).catch(err => logger.warn('Dashboard', 'Auth token fetch failed', {}, err));
    } else {
      setUserFavorites(new Set());
    }
    return () => { unmounted = true; };
  }, [user]);

  const handleToggleFavorite = async (aptName: string, requestLogin: () => void) => {
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
  };

  return {
    userFavorites,
    favoriteCounts,
    handleToggleFavorite
  };
}
