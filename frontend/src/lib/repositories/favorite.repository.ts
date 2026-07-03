/**
 * @module favorite.repository
 * @description Data Access Layer for 'favoriteCounts' Firestore collection.
 * Architecture Layer: Repository (data access)
 */
import { db } from '@/lib/firebaseConfig';
import { collection, doc, getDoc, getDocs, updateDoc, increment, setDoc } from 'firebase/firestore';
import { logger } from '@/lib/services/logger';
import { executeIsomorphicQuery } from './isomorphicHelper';
import { throttle } from '@/lib/utils/firestoreThrottle';
import type { Redis } from '@upstash/redis';
import type * as admin from 'firebase-admin';

let cachedRedis: Redis | null = null;
let isRedisLoaded = false;
let cachedAdminDb: admin.firestore.Firestore | null = null;
let isAdminDbLoaded = false;

async function getRedis(): Promise<Redis | null> {
  if (typeof window === 'undefined') {
    if (isRedisLoaded) return cachedRedis;
    try {
      const { redis } = await import('@/lib/redis');
      cachedRedis = (redis as unknown as Redis) || null;
    } catch (err) {
      logger.warn('FavoriteRepository.getRedis', 'Failed to dynamically import @/lib/redis', {}, err as Error);
      cachedRedis = null;
    }
    isRedisLoaded = true;
    return cachedRedis;
  }
  return null;
}

async function getAdminDb(): Promise<admin.firestore.Firestore | null> {
  if (typeof window === 'undefined') {
    if (isAdminDbLoaded) return cachedAdminDb;
    try {
      const { adminDb } = await import('@/lib/firebaseAdmin');
      cachedAdminDb = (adminDb as admin.firestore.Firestore) || null;
    } catch (err) {
      logger.warn('FavoriteRepository.getAdminDb', 'Failed to dynamically import @/lib/firebaseAdmin', {}, err as Error);
      cachedAdminDb = null;
    }
    isAdminDbLoaded = true;
    return cachedAdminDb;
  }
  return null;
}

/**
 * Fetches all favorite counts.
 * Checks Redis on server-side, falls back to Firestore adminDb or client SDK.
 */
export async function fetchFavoriteCounts(): Promise<Record<string, number>> {
  const cacheKey = 'DTDLS:cache:favoriteCounts';
  
  const result = await executeIsomorphicQuery<Record<string, number>>({
    cacheKey,
    cacheEx: 60,
    serverQuery: async () => {
      const adminDb = await getAdminDb();
      if (!adminDb) return null;
      
      const snap = await throttle<admin.firestore.QuerySnapshot>(() => adminDb.collection('favoriteCounts').get());
      const counts: Record<string, number> = {};
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data && typeof data.count === 'number' && data.count > 0) {
          counts[data.aptName || doc.id] = data.count;
        }
      });
      return counts;
    },
    clientQuery: async () => {
      const snap = await throttle(() => getDocs(collection(db, 'favoriteCounts')));
      const counts: Record<string, number> = {};
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && typeof data.count === 'number' && data.count > 0) {
          counts[data.aptName || docSnap.id] = data.count;
        }
      });
      return counts;
    },
    fallbackValue: {}
  });

  return result || {};
}

/**
 * Increments favorite count for a specific apartment.
 * Invalidates Redis cache.
 */
export async function incrementFavoriteCount(aptName: string): Promise<void> {
  try {
    const docId = aptName.replace(/\//g, '_'); // Sanitization for document ID
    const favoriteRef = doc(db, 'favoriteCounts', docId);
    
    // Check if document exists first to avoid updateDoc failures
    const snap = await throttle(() => getDoc(favoriteRef));
    if (snap.exists()) {
      await throttle(() => updateDoc(favoriteRef, { count: increment(1) }));
    } else {
      await throttle(() => setDoc(favoriteRef, { aptName, count: 1 }));
    }
    
    // Invalidate Cache
    if (typeof window === 'undefined') {
      const redis = await getRedis();
      if (redis) {
        await redis.del('DTDLS:cache:favoriteCounts').catch(() => {});
      }
    }
    logger.info('FavoriteRepository.incrementFavoriteCount', 'Incremented favorite count', { aptName });
  } catch (error) {
    logger.error('FavoriteRepository.incrementFavoriteCount', 'Failed to increment favorite count', { aptName }, error as Error);
    throw error;
  }
}
