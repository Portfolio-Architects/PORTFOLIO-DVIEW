import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { redis } from '@/lib/redis';
import { rateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. IP 속도 제한 (Rate Limiting) 가드
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_favoritecounts_${rawIp}`);
      if (!success) {
        logger.warn('FavoriteCountsAPI.GET', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    if (redis) {
      try {
        const cachedCounts = await redis.hgetall<Record<string, number | string>>('DTDLS:cache:favoriteCounts');
        if (cachedCounts && Object.keys(cachedCounts).length > 0) {
          const coerced: Record<string, number> = {};
          for (const [key, val] of Object.entries(cachedCounts)) {
            coerced[key] = Number(val);
          }
          return NextResponse.json({ counts: coerced });
        }
      } catch (err) {
        logger.warn('FavoriteCountsAPI.GET', 'Redis read error, falling back to Firestore', {}, err as Error);
      }
    }

    if (!adminDb) return NextResponse.json({ counts: {} });

    const isDev = process.env.NODE_ENV === 'development';
    const timeoutMs = isDev ? 1000 : 3000;

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
        timeoutPromise
      ]);
    };

    const snap = await withTimeout(adminDb.collection('favoriteCounts').get(), timeoutMs);
    const counts: Record<string, number> = {};
    snap.docs.forEach(doc => {
      const data = doc.data();
      if (data.count > 0) {
        counts[data.aptName || doc.id] = data.count;
      }
    });

    if (redis && Object.keys(counts).length > 0) {
      await redis.hset('DTDLS:cache:favoriteCounts', counts).catch(err => {
        logger.warn('FavoriteCountsAPI.GET', 'Redis HSET error', {}, err as Error);
      });
    }

    return NextResponse.json({ counts });
  } catch (error) {
    logger.error('FavoriteCountsAPI.GET', 'Failed to fetch favorite counts', {}, error as Error);
    return NextResponse.json({ counts: {} });
  }
}

