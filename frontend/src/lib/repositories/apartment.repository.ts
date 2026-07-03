/**
 * @module apartment.repository
 * @description Data Access Layer for Dongtan apartment list.
 * Architecture Layer: Repository (data access)
 * 
 * Uses /api/apartments-by-dong (Google Sheets) as single source of truth
 * for all apartment lists: 동네리뷰 선택, 입주민 인증, 임장기 작성 등
 */
import { db } from '@/lib/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { throttle } from '@/lib/utils/firestoreThrottle';
import { executeIsomorphicQuery } from './isomorphicHelper';
import { ApartmentMetaSchema } from '@/lib/validation/facade.schemas';
import { logger } from '@/lib/services/logger';
import { z } from 'zod';
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
      logger.warn('ApartmentRepository.getRedis', 'Failed to dynamically import @/lib/redis', {}, err as Error);
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
      logger.warn('ApartmentRepository.getAdminDb', 'Failed to dynamically import @/lib/firebaseAdmin', {}, err as Error);
      cachedAdminDb = null;
    }
    isAdminDbLoaded = true;
    return cachedAdminDb;
  }
  return null;
}

const ApartmentItemSchema = z.object({
  name: z.string(),
  txKey: z.string().optional()
}).passthrough();

const ApartmentsByDongSchema = z.object({
  byDong: z.record(z.string(), z.array(ApartmentItemSchema))
});

// Client-side in-memory cache for static apartment names
let cachedApartmentNames: string[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 300000; // 5 minutes cache

/**
 * Fetches full apartment list from /api/apartments-by-dong (Google Sheets).
 * Returns in "[법정동] 아파트명" format for WriteReviewModal, resident verification, etc.
 */
export async function fetchApartmentNames(): Promise<string[]> {
  const now = Date.now();
  // Return cached result if available and valid on the client side
  if (typeof window !== 'undefined' && cachedApartmentNames && (now - cacheTimestamp < CACHE_TTL_MS)) {
    return cachedApartmentNames;
  }

  try {
    let byDong: Record<string, { name: string }[]> = {};

    if (typeof window === 'undefined' || process.env.NODE_ENV === 'test') {
      // Server-side: read directly from the static file to avoid relative URL fetch failures
      try {
        // Isolate dynamic import caching inside the server-only block using globalThis to prevent bundling issues
        if (!globalThis._cachedFileReader) {
          const { readJsonFileCached } = await import('@/lib/utils/server/fileReader');
          globalThis._cachedFileReader = readJsonFileCached;
        }
        const readJsonFileCached = globalThis._cachedFileReader;

        if (readJsonFileCached) {
          const rawResult = await readJsonFileCached('public/data/apartments-by-dong.json', {});
          const parsed = ApartmentsByDongSchema.safeParse(rawResult);
          if (parsed.success) {
            byDong = parsed.data.byDong;
          } else {
            logger.warn('ApartmentRepository.fetch', 'Zod validation failed for apartments-by-dong.json. Falling back to raw.', undefined, parsed.error);
            const rawObj = rawResult as Record<string, unknown>;
            byDong = (rawObj && typeof rawObj === 'object' && rawObj.byDong) ? (rawObj.byDong as Record<string, { name: string }[]>) : {};
          }
        }
      } catch (fsError) {
        logger.warn('ApartmentRepository.fetch', 'Failed to read apartments-by-dong.json from filesystem', undefined, fsError);
      }
    }

    // Fallback/Client-side: Fetch via HTTP API
    if (Object.keys(byDong).length === 0) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const response = await fetch('/api/apartments-by-dong', {
          cache: 'no-store', // force fresh data
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const rawResult = await response.json();
        const parsed = ApartmentsByDongSchema.safeParse(rawResult);
        if (parsed.success) {
          byDong = parsed.data.byDong;
        } else {
          logger.warn('ApartmentRepository.fetch', 'Zod validation failed for /api/apartments-by-dong API. Falling back to raw.', undefined, parsed.error);
          const rawObj = rawResult as Record<string, unknown>;
          byDong = (rawObj && typeof rawObj === 'object' && rawObj.byDong) ? (rawObj.byDong as Record<string, { name: string }[]>) : {};
        }
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        throw fetchErr;
      }
    }
    
    const apartments: string[] = [];
    for (const [dong, apts] of Object.entries(byDong)) {
      for (const apt of apts) {
        apartments.push(`[${dong}] ${apt.name}`);
      }
    }
    
    apartments.sort();
    logger.info('ApartmentRepository.fetch', `Loaded ${apartments.length} apartments successfully`);
    
    // Store in-memory cache on the client side
    if (typeof window !== 'undefined' && apartments.length > 0) {
      cachedApartmentNames = apartments;
      cacheTimestamp = Date.now();
    }
    
    return apartments;
  } catch (error) {
    logger.warn('ApartmentRepository.fetch', '/api/apartments-by-dong failed', undefined, error);
    return [];
  }
}

/**
 * Fetches apartment meta mapping settings/apartmentMeta isomorphically.
 */
export async function fetchApartmentMeta(): Promise<z.infer<typeof ApartmentMetaSchema>> {
  const cacheKey = 'DTDLS:cache:apartmentMeta';
  
  const result = await executeIsomorphicQuery<z.infer<typeof ApartmentMetaSchema>>({
    cacheKey,
    cacheEx: 300,
    serverQuery: async () => {
      const adminDb = await getAdminDb();
      if (!adminDb) return null;
      
      const metaDoc = await throttle<admin.firestore.DocumentSnapshot>(() => adminDb.collection('settings').doc('apartmentMeta').get());
      if (metaDoc.exists) {
        return (metaDoc.data() || {}) as z.infer<typeof ApartmentMetaSchema>;
      }
      return null;
    },
    clientQuery: async () => {
      const metaRef = doc(db, 'settings', 'apartmentMeta');
      const metaDoc = await throttle(() => getDoc(metaRef));
      if (metaDoc.exists()) {
        return (metaDoc.data() || {}) as z.infer<typeof ApartmentMetaSchema>;
      }
      return null;
    },
    fallbackValue: {}
  });

  const parsed = ApartmentMetaSchema.safeParse(result);
  if (!parsed.success) {
    logger.warn('ApartmentRepository.fetchApartmentMeta', 'Validation failed, returning raw/fallback data.', undefined, parsed.error);
    return (result || {}) as z.infer<typeof ApartmentMetaSchema>;
  }

  return parsed.data;
}

