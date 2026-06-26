import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { rateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const AdClickInputSchema = z.object({
  adId: z.string().min(1),
  apartmentName: z.string().min(1),
  dong: z.string().optional().default(''),
  clickedAt: z.string().datetime().or(z.string().min(1)),
});

export async function POST(request: NextRequest) {
  try {
    // 1. IP 속도 제한 (Rate Limiting) 가드
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_adclick_${rawIp}`);
      if (!success) {
        logger.warn('AdClick.POST', 'Rate limit exceeded', { ip: rawIp });
        return NextResponse.json({ success: false, error: 'Too Many Requests' }, { status: 429 });
      }
    }

    // 2. JSON 파싱 방어 가드
    let rawBody: unknown;
    try {
      const text = await request.text();
      if (!text.trim()) {
        logger.warn('AdClick.POST', 'Empty request body', {});
        return NextResponse.json({ success: false, error: 'Bad Request: Empty Payload' }, { status: 400 });
      }
      rawBody = JSON.parse(text);
    } catch (jsonErr) {
      logger.warn('AdClick.POST', 'Invalid JSON format', {}, jsonErr as Error);
      return NextResponse.json({ success: false, error: 'Bad Request: Invalid JSON' }, { status: 400 });
    }
    
    // Zod schema validation
    const parsed = AdClickInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      logger.warn('AdClick.POST', 'Validation failed for ad click payload', { errors: parsed.error.format() });
      return NextResponse.json({ success: false, error: 'Invalid request payload' }, { status: 400 });
    }

    const { adId, apartmentName, dong, clickedAt } = parsed.data;

    // Log the click event to server console via structured logger
    logger.info('AdClick.POST', `Ad clicked: ${adId} at ${apartmentName}`, { adId, apartmentName, dong, clickedAt });

    // 3. Store in Firestore as Non-blocking Background Task with Exception Isolation
    if (adminDb) {
      adminDb.collection('ad_clicks').add({
        adId,
        apartmentName,
        dong,
        clickedAt: new Date(clickedAt),
        serverTimestamp: new Date(),
      }).then(() => {
        logger.info('AdClick.POST', `Persisted ad click successfully to Firestore: ${adId}`);
      }).catch((writeErr: unknown) => {
        const err = writeErr instanceof Error ? writeErr : new Error(String(writeErr));
        logger.error('AdClick.POST', 'Failed to persist ad click to Firestore', { adId }, err);
      });
    } else {
      logger.warn('AdClick.POST', 'adminDb is not configured. Click logged only to console.', { adId, apartmentName });
    }

    return NextResponse.json({ success: true, message: 'Click logged successfully' }, { status: 200 });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('AdClick.POST', 'Unexpected error during ad click logging', {}, err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
