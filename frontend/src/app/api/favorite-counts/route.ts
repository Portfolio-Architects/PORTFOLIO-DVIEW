import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!adminDb) return NextResponse.json({ counts: {} });

    const snap = await adminDb.collection('favoriteCounts').get();
    const counts: Record<string, number> = {};
    snap.docs.forEach(doc => {
      const data = doc.data();
      if (data.count > 0) {
        counts[data.aptName || doc.id] = data.count;
      }
    });
    return NextResponse.json({ counts });
  } catch (error) {
    logger.error('FavoriteCountsAPI.GET', 'Failed to fetch favorite counts', {}, error as Error);
    return NextResponse.json({ counts: {} });
  }
}
