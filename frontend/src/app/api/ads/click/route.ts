import { NextRequest } from 'next/server';
import { z } from 'zod';
import { adminDb } from '@/lib/firebaseAdmin';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AdClickInputSchema = z.object({
  adId: z.string().min(1),
  apartmentName: z.string().min(1),
  dong: z.string().optional().default(''),
  clickedAt: z.string().datetime().or(z.string().min(1)),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_adclick',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    let rawBody: unknown;
    try {
      const text = await request.text();
      if (!text.trim()) {
        logger.warn('AdClick.POST', 'Empty request body', {});
        return apiError('BAD_REQUEST', 'Bad Request: Empty Payload', 400);
      }
      rawBody = JSON.parse(text);
    } catch (jsonErr) {
      logger.warn('AdClick.POST', 'Invalid JSON format', {}, jsonErr as Error);
      return apiError('BAD_REQUEST', 'Bad Request: Invalid JSON', 400);
    }

    const parsed = AdClickInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      logger.warn('AdClick.POST', 'Validation failed for ad click payload', { errors: parsed.error.format() });
      return apiError('INVALID_PAYLOAD', 'Invalid request payload', 400, parsed.error.issues);
    }

    const { adId, apartmentName, dong, clickedAt } = parsed.data;
    logger.info('AdClick.POST', `Ad clicked: ${adId} at ${apartmentName}`, { adId, apartmentName, dong, clickedAt });

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

    return apiSuccess({ message: 'Click logged successfully' }, { message: 'Click logged successfully' });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('AdClick.POST', 'Unexpected error during ad click logging', {}, err);
    return apiError('SERVER_ERROR', 'Server error', 500);
  }
}
