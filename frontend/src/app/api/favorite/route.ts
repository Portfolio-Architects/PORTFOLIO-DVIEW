/**
 * POST /api/favorite
 * Body: { aptName: string, userId: string }
 * 
 * Toggle favorite status for an apartment.
 * Creates/deletes a favorites doc and increments/decrements favoriteCount on the apartment.
 */
import { NextRequest } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebaseAdmin';
import { verifyAuthHeader } from '@/lib/authUtils';
import { redis } from '@/lib/redis';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const favSchema = z.object({
  aptName: z.string().min(1).max(100).trim(),
  action: z.enum(['add', 'remove', 'toggle']).optional().default('toggle'),
});

const favoriteQuerySchema = z.object({
  userId: z.string().min(1),
});

function toSafeDocId(userId: string, aptName: string): string {
  const safeAptName = aptName.replace(/\//g, '__SLASH__');
  return `${userId}_${safeAptName}`;
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_favorite_post',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('FavoriteAPI.POST', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    if (!adminDb) return apiError('DATABASE_UNAVAILABLE', 'DB not initialized', 500);

    // Auth Validation
    let decodedToken;
    try {
      decodedToken = await verifyAuthHeader(request);
    } catch {
      return apiError('UNAUTHORIZED', 'Unauthorized Request', 401);
    }
    const userId = decodedToken.uid;

    let rawBody;
    try {
      rawBody = await request.json();
    } catch (jsonErr) {
      logger.warn('FavoriteAPI.POST', 'Invalid JSON body structure', {}, jsonErr as Error);
      return apiError('BAD_REQUEST', 'Invalid JSON body structure', 400);
    }

    const parsed = favSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError('INVALID_PAYLOAD', 'Bad Request: Invalid Payload', 400, parsed.error.issues);
    }
    const { aptName, action } = parsed.data;

    const docId = toSafeDocId(userId, aptName);
    const favRef = adminDb.collection('favorites').doc(docId);
    const countRef = adminDb.collection('favoriteCounts').doc(aptName.replace(/\//g, '__SLASH__'));

    const { favorited, changed } = await adminDb.runTransaction(async (transaction) => {
      const favSnap = await transaction.get(favRef);
      const exists = favSnap.exists;

      if (action === 'add') {
        if (exists) {
          return { favorited: true, changed: false };
        }
        transaction.set(favRef, { userId, aptName, createdAt: FieldValue.serverTimestamp() });
        transaction.set(countRef, { count: FieldValue.increment(1), aptName }, { merge: true });
        return { favorited: true, changed: true };
      } else if (action === 'remove') {
        if (!exists) {
          return { favorited: false, changed: false };
        }
        transaction.delete(favRef);
        transaction.set(countRef, { count: FieldValue.increment(-1), aptName }, { merge: true });
        return { favorited: false, changed: true };
      } else {
        if (exists) {
          transaction.delete(favRef);
          transaction.set(countRef, { count: FieldValue.increment(-1), aptName }, { merge: true });
          return { favorited: false, changed: true };
        } else {
          transaction.set(favRef, { userId, aptName, createdAt: FieldValue.serverTimestamp() });
          transaction.set(countRef, { count: FieldValue.increment(1), aptName }, { merge: true });
          return { favorited: true, changed: true };
        }
      }
    });

    if (redis && changed) {
      const diff = favorited ? 1 : -1;
      Promise.all([
        redis.hincrby('DTDLS:cache:favoriteCounts', aptName, diff),
        redis.del(`DTDLS:user:${userId}:favorites`),
      ]).catch((err) => logger.warn('FavoriteAPI.POST', 'Redis update error', { aptName, userId }, err as Error));
    }

    return apiSuccess({ favorited }, { favorited });
  } catch (error: unknown) {
    logger.error('FavoriteAPI.POST', 'Failed to toggle favorite', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}

/**
 * GET /api/favorite?userId=xxx
 * Returns all apartments the user has favorited.
 */
export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_favorite_get',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('FavoriteAPI.GET', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    if (!adminDb) return apiSuccess({ favorites: [] }, { favorites: [], warning: 'DB not initialized' });

    // Auth Validation
    let decodedToken;
    try {
      decodedToken = await verifyAuthHeader(request);
    } catch {
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }
    const userId = decodedToken.uid;

    const requestedUserId = request.nextUrl.searchParams.get('userId');
    const queryParse = favoriteQuerySchema.safeParse({ userId: requestedUserId });
    if (!queryParse.success) {
      logger.warn('FavoriteAPI.GET', 'Invalid query parameters', { errors: queryParse.error.format() });
      return apiError('INVALID_QUERY', 'Bad Request', 400);
    }

    if (requestedUserId && requestedUserId !== userId) {
      return apiError('FORBIDDEN', 'Forbidden', 403);
    }

    const cacheKey = `DTDLS:user:${userId}:favorites`;
    if (redis) {
      try {
        const cached = await redis.get<string[]>(cacheKey);
        if (cached && Array.isArray(cached)) {
          return apiSuccess({ favorites: cached }, { favorites: cached });
        }
      } catch (err) {
        logger.warn('FavoriteAPI.GET', 'Redis read failed, falling back to Firestore', { userId }, err as Error);
      }
    }

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
    const favoritesTimeout = isDev ? 1000 : 5000;
    const userDocTimeout = isDev ? 1000 : 2000;

    const [snap, userDoc] = await Promise.all([
      withTimeout(adminDb.collection('favorites').where('userId', '==', userId).get(), favoritesTimeout),
      withTimeout(adminDb.collection('users').doc(userId).get(), userDocTimeout).catch((dbErr) => {
        logger.warn('FavoriteAPI.GET', 'Failed to read user doc', { userId }, dbErr as Error);
        return null;
      }),
    ]);

    const favorites = snap.docs.map((d) => d.data().aptName as string);

    if (userDoc && userDoc.exists) {
      const userData = userDoc.data();
      const favoriteOrder = userData?.favoriteOrder as string[];
      if (favoriteOrder && Array.isArray(favoriteOrder)) {
        favorites.sort((a, b) => {
          const indexA = favoriteOrder.indexOf(a);
          const indexB = favoriteOrder.indexOf(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
      }
    }

    if (redis) {
      try {
        await redis.set(cacheKey, favorites, { ex: 86400 });
      } catch (err) {
        logger.warn('FavoriteAPI.GET', 'Redis write failed', { userId }, err as Error);
      }
    }

    return apiSuccess({ favorites }, { favorites });
  } catch (error: unknown) {
    logger.error('FavoriteAPI.GET', 'Failed to fetch favorites', {}, error as Error);
    return apiSuccess({ favorites: [] }, { favorites: [], error: 'Failed to fetch favorites' });
  }
}

const orderSchema = z.object({
  favoriteOrder: z.array(z.string().min(1).max(100)).max(100),
});

/**
 * PUT /api/favorite
 * Body: { favoriteOrder: string[] }
 * Updates the user's custom favorite order.
 */
export async function PUT(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_favorite_put',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('FavoriteAPI.PUT', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    if (!adminDb) return apiError('DATABASE_UNAVAILABLE', 'DB not initialized', 500);

    let decodedToken;
    try {
      decodedToken = await verifyAuthHeader(request);
    } catch {
      return apiError('UNAUTHORIZED', 'Unauthorized Request', 401);
    }
    const userId = decodedToken.uid;

    let rawBody;
    try {
      rawBody = await request.json();
    } catch (jsonErr) {
      logger.warn('FavoriteAPI.PUT', 'Invalid JSON body structure', {}, jsonErr as Error);
      return apiError('BAD_REQUEST', 'Invalid JSON body structure', 400);
    }

    const parsed = orderSchema.safeParse(rawBody);
    if (!parsed.success) {
      return apiError('INVALID_PAYLOAD', 'Bad Request: Invalid Payload', 400, parsed.error.issues);
    }
    const { favoriteOrder } = parsed.data;

    const userRef = adminDb.collection('users').doc(userId);
    await userRef.set({ favoriteOrder }, { merge: true });

    if (redis) {
      await redis.del(`DTDLS:user:${userId}:favorites`).catch((err) =>
        logger.warn('FavoriteAPI.PUT', 'Redis cache invalidation error', { userId }, err as Error)
      );
    }

    return apiSuccess({ favoriteOrder }, { success: true, favoriteOrder });
  } catch (error: unknown) {
    logger.error('FavoriteAPI.PUT', 'Failed to update favorite order', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
