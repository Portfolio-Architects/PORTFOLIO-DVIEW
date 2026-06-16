/**
 * POST /api/favorite
 * Body: { aptName: string, userId: string }
 * 
 * Toggle favorite status for an apartment.
 * Creates/deletes a favorites doc and increments/decrements favoriteCount on the apartment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyAuthHeader } from '@/lib/authUtils';
import { redis } from '@/lib/redis';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

// 보안: NoSQL Injection 및 오버플로우 공격 방어용 인바운드 스키마 검증
const favSchema = z.object({
  aptName: z.string().min(1).max(100).trim(), // 아파트 이름 길이 제한 및 스크러빙
});

const favoriteQuerySchema = z.object({
  userId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    if (!adminDb) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 });

    // Auth Validation
    let decodedToken;
    try {
      decodedToken = await verifyAuthHeader(request);
    } catch (authErr) {
      return NextResponse.json({ error: 'Unauthorized Request' }, { status: 401 });
    }
    const userId = decodedToken.uid;

    const rawBody = await request.json();
    const parsed = favSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Bad Request: Invalid Payload', details: parsed.error.issues }, { status: 400 });
    }
    const { aptName } = parsed.data;

    const docId = `${userId}_${aptName}`;
    const favRef = adminDb.collection('favorites').doc(docId);
    const favSnap = await favRef.get();

    if (favSnap.exists) {
      // Remove favorite
      await favRef.delete();
      // Decrement count
      const countRef = adminDb.collection('favoriteCounts').doc(aptName);
      await countRef.set({ count: FieldValue.increment(-1), aptName }, { merge: true });
      if (redis) {
        await redis.hincrby('DTDLS:cache:favoriteCounts', aptName, -1).catch(err => logger.warn('FavoriteAPI.POST', 'Redis HINCRBY error', { aptName }, err as Error));
      }
      return NextResponse.json({ favorited: false });
    } else {
      // Add favorite
      await favRef.set({ userId, aptName, createdAt: FieldValue.serverTimestamp() });
      // Increment count
      const countRef = adminDb.collection('favoriteCounts').doc(aptName);
      await countRef.set({ count: FieldValue.increment(1), aptName }, { merge: true });
      if (redis) {
        await redis.hincrby('DTDLS:cache:favoriteCounts', aptName, 1).catch(err => logger.warn('FavoriteAPI.POST', 'Redis HINCRBY error', { aptName }, err as Error));
      }
      return NextResponse.json({ favorited: true });
    }
  } catch (error: unknown) {
    logger.error('FavoriteAPI.POST', 'Failed to toggle favorite', {}, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/favorite?userId=xxx
 * Returns all apartments the user has favorited.
 */
export async function GET(request: NextRequest) {
  try {
    if (!adminDb) return NextResponse.json({ favorites: [], warning: 'DB not initialized' }, { status: 200 });

    // Auth Validation
    let decodedToken;
    try {
      decodedToken = await verifyAuthHeader(request);
    } catch (authErr) {
      return NextResponse.json({ favorites: [], warning: 'Unauthorized' }, { status: 401 });
    }
    const userId = decodedToken.uid;

    const requestedUserId = request.nextUrl.searchParams.get('userId');
    const queryParse = favoriteQuerySchema.safeParse({ userId: requestedUserId });
    if (!queryParse.success) {
      logger.warn('FavoriteAPI.GET', 'Invalid query parameters', { errors: queryParse.error.format() });
      return NextResponse.json({ favorites: [], warning: 'Bad Request' }, { status: 400 });
    }

    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json({ favorites: [], warning: 'Forbidden' }, { status: 403 });
    }

    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firebase timeout')), ms))
      ]);

    const snap = await withTimeout(adminDb.collection('favorites').where('userId', '==', userId).get(), 5000);
    const favorites = snap.docs.map(d => d.data().aptName as string);

    try {
      const userDoc = await withTimeout(adminDb.collection('users').doc(userId).get(), 2000);
      if (userDoc.exists) {
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
    } catch (dbErr) {
      logger.warn('FavoriteAPI.GET', 'Failed to read user favoriteOrder, skipping sort', { userId }, dbErr as Error);
    }

    return NextResponse.json({ favorites });
  } catch (error: unknown) {
    logger.error('FavoriteAPI.GET', 'Failed to fetch favorites', {}, error as Error);
    // Return [] instead of 500 to prevent app crashes if Firebase hangs
    return NextResponse.json({ favorites: [], error: 'Failed to fetch favorites' }, { status: 200 });
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
    if (!adminDb) return NextResponse.json({ error: 'DB not initialized' }, { status: 500 });

    let decodedToken;
    try {
      decodedToken = await verifyAuthHeader(request);
    } catch (authErr) {
      return NextResponse.json({ error: 'Unauthorized Request' }, { status: 401 });
    }
    const userId = decodedToken.uid;

    const rawBody = await request.json();
    const parsed = orderSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Bad Request: Invalid Payload', details: parsed.error.issues }, { status: 400 });
    }
    const { favoriteOrder } = parsed.data;

    const userRef = adminDb.collection('users').doc(userId);
    await userRef.set({ favoriteOrder }, { merge: true });

    return NextResponse.json({ success: true, favoriteOrder });
  } catch (error: unknown) {
    logger.error('FavoriteAPI.PUT', 'Failed to update favorite order', {}, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

