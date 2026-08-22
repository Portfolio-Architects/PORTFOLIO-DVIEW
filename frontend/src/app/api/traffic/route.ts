import { NextRequest } from 'next/server';
import { adminDb, FieldValue } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { getKSTDateString } from '@/lib/utils/date';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const trafficSchema = z.object({
  action: z.enum(['websiteVisit', 'contentView']),
  contentId: z.string().optional(),
  title: z.string().optional(),
  type: z.enum(['lounge', 'report', 'unknown']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_traffic_post',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('TrafficAPI.POST', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    if (!adminDb) {
      return apiError('DATABASE_UNAVAILABLE', 'DB not initialized', 500);
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch (jsonErr) {
      logger.warn('TrafficAPI.POST', 'Invalid JSON body structure', {}, jsonErr as Error);
      return apiError('BAD_REQUEST', 'Invalid JSON body structure', 400);
    }

    const parsed = trafficSchema.safeParse(rawBody);

    if (!parsed.success) {
      logger.warn('TrafficAPI.POST', 'Invalid traffic payload', { errors: parsed.error.format() });
      return apiError('INVALID_PAYLOAD', 'Bad Request: Invalid Payload', 400, parsed.error.issues);
    }

    const { action, contentId, title, type } = parsed.data;

    const today = getKSTDateString();

    if (action === 'websiteVisit') {
      const ref = adminDb.collection('daily_stats').doc(today);
      await ref.set({ websiteVisits: FieldValue.increment(1), date: today }, { merge: true });
      return apiSuccess({ message: 'Website visit recorded' });
    }

    if (action === 'contentView' && contentId) {
      const ref = adminDb.collection('daily_stats').doc(today).collection('content_views').doc(contentId);
      await ref.set({
        title: title || '알 수 없음',
        type: type || 'unknown',
        views: FieldValue.increment(1),
      }, { merge: true });
      return apiSuccess({ message: 'Content view recorded' });
    }

    return apiError('BAD_REQUEST', 'Action failed', 400);
  } catch (error: unknown) {
    logger.error('TrafficAPI.POST', 'Failed to record traffic', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
