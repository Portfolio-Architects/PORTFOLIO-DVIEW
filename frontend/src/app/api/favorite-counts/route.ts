import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { redis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

    const snap = await adminDb.collection('favoriteCounts').get();
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

