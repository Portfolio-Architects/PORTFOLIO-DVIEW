/**
 * GET /api/dashboard-init
 * 
 * Consolidated API: replaces 3 separate calls:
 *   /api/favorite-counts  → favoriteCounts
 *   /api/type-map          → typeMap
 *   Firestore settings/apartmentMeta → apartmentMeta
 * 
 * Single serverless cold-start instead of 3.
 */
import { NextRequest } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { redis } from '@/lib/redis';
import typeMapStatic from '../../../../public/data/type-map.json';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { readJsonFileCached } from '@/lib/utils/server/fileReader';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const favoriteCountsSchema = z.record(z.string(), z.coerce.number().nonnegative());
const typeMapEntrySchema = z.object({
  aptName: z.string().min(1),
  area: z.string().min(1),
  typeM2: z.string().min(1),
  typePyeong: z.string().min(1),
});
const typeMapSchema = z.array(typeMapEntrySchema);
const apartmentMetaSchema = z.record(z.string(), z.unknown());

export async function GET(request: NextRequest) {
  const rateLimit = await checkRateLimit(request, {
    prefix: 'ratelimit_dashboard_init',
    requestsPerLimit: 60,
  });
  if (!rateLimit.success) {
    return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
  }

  const result: {
    favoriteCounts: Record<string, number>;
    typeMap: { aptName: string; area: string; typeM2: string; typePyeong: string }[];
    apartmentMeta: Record<string, unknown>;
  } = {
    favoriteCounts: {},
    typeMap: [],
    apartmentMeta: {},
  };

  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Firebase timeout')), ms);
    });
    return Promise.race([
      promise.then((val) => {
        clearTimeout(timeoutId);
        return val;
      }).catch((err) => {
        clearTimeout(timeoutId);
        throw err;
      }),
      timeoutPromise,
    ]);
  };

  const isDev = process.env.NODE_ENV === 'development';
  const firestoreTimeout = isDev ? 1000 : 5000;

  // Helper 1: Fetch favorite counts (Redis First -> Firebase Fallback)
  const fetchFavoriteCounts = async (): Promise<Record<string, number>> => {
    try {
      if (redis) {
        const cachedCounts = await redis.hgetall('DTDLS:cache:favoriteCounts');
        if (cachedCounts && Object.keys(cachedCounts).length > 0) {
          const parsed = favoriteCountsSchema.safeParse(cachedCounts);
          if (parsed.success) return parsed.data;
          logger.warn('DashboardInitAPI.GET', 'Redis favoriteCounts schema mismatch', { errors: parsed.error.format() });
        }

        if (adminDb) {
          const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), firestoreTimeout);
          const rawCounts: Record<string, number> = {};
          snap.docs.forEach((doc) => {
            const data = doc.data();
            if (data.count > 0) {
              rawCounts[data.aptName || doc.id] = data.count;
            }
          });

          const parsed = favoriteCountsSchema.safeParse(rawCounts);
          if (parsed.success) {
            redis.hset('DTDLS:cache:favoriteCounts', parsed.data).catch((err) => {
              logger.warn('DashboardInitAPI.GET', 'Redis HSET error', {}, err as Error);
            });
            return parsed.data;
          }
          logger.warn('DashboardInitAPI.GET', 'Firestore favoriteCounts schema mismatch', { errors: parsed.error.format() });
        }
      } else if (adminDb) {
        const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), firestoreTimeout);
        const rawCounts: Record<string, number> = {};
        snap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.count > 0) {
            rawCounts[data.aptName || doc.id] = data.count;
          }
        });
        const parsed = favoriteCountsSchema.safeParse(rawCounts);
        if (parsed.success) return parsed.data;
        logger.warn('DashboardInitAPI.GET', 'Firestore favoriteCounts schema mismatch (no-redis)', { errors: parsed.error.format() });
      }
    } catch (e) {
      logger.warn('DashboardInitAPI.GET', 'favoriteCounts error', {}, e as Error);
    }
    return {};
  };

  // Helper 2: Fetch apartment metadata (Redis First -> Firestore Fallback)
  const fetchApartmentMeta = async (): Promise<Record<string, unknown>> => {
    try {
      if (redis) {
        const cachedMeta = await redis.get('DTDLS:cache:apartmentMeta');
        if (cachedMeta) {
          let metaObj = cachedMeta;
          if (typeof cachedMeta === 'string') {
            try {
              metaObj = JSON.parse(cachedMeta);
            } catch (err) {
              logger.warn('DashboardInitAPI.GET', 'Failed to parse Redis apartmentMeta JSON string', {}, err as Error);
            }
          }
          if (metaObj && typeof metaObj === 'object') {
            const parsed = apartmentMetaSchema.safeParse(metaObj);
            if (parsed.success) return parsed.data;
            logger.warn('DashboardInitAPI.GET', 'Redis apartmentMeta schema mismatch', { errors: parsed.error.format() });
          }
        }
      }

      if (adminDb) {
        const metaDoc = await withTimeout(adminDb.doc('settings/apartmentMeta').get(), firestoreTimeout);
        if (metaDoc.exists) {
          const metaData = metaDoc.data() || {};
          const parsed = apartmentMetaSchema.safeParse(metaData);
          if (parsed.success) {
            if (redis && Object.keys(parsed.data).length > 0) {
              redis.set('DTDLS:cache:apartmentMeta', parsed.data, { ex: 86400 }).catch((e) => {
                logger.warn('DashboardInitAPI.GET', 'Redis meta write error', {}, e as Error);
              });
            }
            return parsed.data;
          }
          logger.warn('DashboardInitAPI.GET', 'Firestore apartmentMeta schema mismatch', { errors: parsed.error.format() });
        }
      }
    } catch (e) {
      logger.warn('DashboardInitAPI.GET', 'apartmentMeta error', {}, e as Error);
    }
    return {};
  };

  const [favoriteCountsRes, apartmentMetaRes] = await Promise.all([
    fetchFavoriteCounts(),
    fetchApartmentMeta(),
  ]);

  result.favoriteCounts = favoriteCountsRes;
  result.apartmentMeta = apartmentMetaRes;

  if (Object.keys(result.apartmentMeta).length === 0) {
    const parsed = await readJsonFileCached<{ byDong?: Record<string, Array<{ name: string; txKey?: string }>> } | null>(
      'public/data/apartments-by-dong.json',
      null
    );
    if (parsed && parsed.byDong) {
      const fallbackMeta: Record<string, { dong: string; txKey: string }> = {};
      Object.entries(parsed.byDong).forEach(([dongName, apts]) => {
        apts.forEach((a) => {
          fallbackMeta[a.name] = { dong: dongName, txKey: a.txKey || a.name };
        });
      });
      result.apartmentMeta = fallbackMeta;
      logger.info('DashboardInitAPI.GET', 'Injected fallback apartmentMeta from static json file');
    }
  }

  // Type map
  try {
    const parsed = typeMapSchema.safeParse(typeMapStatic);
    if (parsed.success) {
      result.typeMap = parsed.data;
    } else {
      logger.warn('DashboardInitAPI.GET', 'Static typeMap schema mismatch', { errors: parsed.error.format() });
      result.typeMap = typeMapStatic as unknown as { aptName: string; area: string; typeM2: string; typePyeong: string }[];
    }
  } catch (e) {
    logger.warn('DashboardInitAPI.GET', 'typeMap error', {}, e as Error);
  }

  return apiSuccess(result, result);
}
