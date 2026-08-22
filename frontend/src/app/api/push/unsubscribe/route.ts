import { NextRequest } from 'next/server';
import { adminDb as db, FieldValue } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UnsubscribeInputSchema = z.object({
  endpoint: z.string().url(),
  apartmentName: z.string().min(1).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, {
      prefix: 'ratelimit_push_unsubscribe',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError('BAD_REQUEST', 'Invalid JSON body structure', 400);
    }

    const parsed = UnsubscribeInputSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn('PushUnsubscribeAPI.POST', 'Invalid unsubscribe payload', { errors: parsed.error.format() });
      return apiError('INVALID_PAYLOAD', 'Invalid subscription payload', 400, parsed.error.issues);
    }

    const { endpoint, apartmentName } = parsed.data;

    if (!db) {
      logger.error('PushUnsubscribeAPI.POST', 'Firebase Admin not initialized');
      return apiError('DATABASE_UNAVAILABLE', 'Firebase Admin not initialized', 500);
    }

    const endpointHash = Buffer.from(endpoint).toString('base64').replace(/=/g, '').replace(/\//g, '_');
    const docRef = db.collection('push_subscriptions').doc(endpointHash);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      logger.info('PushUnsubscribeAPI.POST', 'Subscription document not found, doing nothing', { endpointHash });
      return apiSuccess({ message: 'Subscription not found' }, { message: 'Subscription not found' });
    }

    if (apartmentName) {
      await docRef.update({
        apts: FieldValue.arrayRemove(apartmentName),
        updatedAt: new Date().toISOString(),
      });
      logger.info('PushUnsubscribeAPI.POST', 'Apartment unsubscribed successfully', { uid: docSnap.data()?.uid, endpointHash, apartmentName });
    } else {
      await docRef.delete();
      logger.info('PushUnsubscribeAPI.POST', 'Subscription deleted completely', { uid: docSnap.data()?.uid, endpointHash });
    }

    return apiSuccess({ message: 'Unsubscribed successfully' });
  } catch (error: unknown) {
    logger.error('PushUnsubscribeAPI.POST', 'Push Unsubscribe Error', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to unsubscribe', 500);
  }
}
