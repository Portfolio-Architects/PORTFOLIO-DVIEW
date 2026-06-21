import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { getKSTDateString } from '@/lib/utils/date';
import { rateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const trafficSchema = z.object({
  action: z.enum(['websiteVisit', 'contentView']),
  contentId: z.string().optional(),
  title: z.string().optional(),
  type: z.enum(['lounge', 'report', 'unknown']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_traffic_post_${rawIp}`);
      if (!success) {
        logger.warn('TrafficAPI.POST', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
      }
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'DB not initialized' }, { status: 500 });
    }

    let rawBody;
    try {
      rawBody = await request.json();
    } catch (jsonErr) {
      logger.warn('TrafficAPI.POST', 'Invalid JSON body structure', {}, jsonErr as Error);
      return NextResponse.json({ error: 'Invalid JSON body structure' }, { status: 400 });
    }

    const parsed = trafficSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      logger.warn('TrafficAPI.POST', 'Invalid traffic payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'Bad Request: Invalid Payload', details: parsed.error.issues }, { status: 400 });
    }
    
    const { action, contentId, title, type } = parsed.data;

    // Get KST today date
    const today = getKSTDateString();

    if (action === 'websiteVisit') {
      const ref = adminDb.collection('daily_stats').doc(today);
      await ref.set({ websiteVisits: FieldValue.increment(1), date: today }, { merge: true });
      return NextResponse.json({ success: true });
    }

    if (action === 'contentView' && contentId) {
      const ref = adminDb.collection('daily_stats').doc(today).collection('content_views').doc(contentId);
      await ref.set({
        title: title || '알 수 없음',
        type: type || 'unknown',
        views: FieldValue.increment(1)
      }, { merge: true });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action failed' }, { status: 400 });
  } catch (error: unknown) {
    logger.error('TrafficAPI.POST', 'Failed to record traffic', {}, error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
