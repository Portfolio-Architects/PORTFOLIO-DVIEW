import { NextRequest } from 'next/server';
import { adminDb as db, FieldValue } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PushSubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.record(z.string(), z.string()).optional(),
});

const SubscribeInputSchema = z.object({
  subscription: PushSubscriptionSchema,
  uid: z.string().nullable().optional(),
  apartmentName: z.string().min(1).nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, {
      prefix: 'ratelimit_push_subscribe',
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

    const parsed = SubscribeInputSchema.safeParse(body);

    if (!parsed.success) {
      logger.warn('PushSubscribeAPI.POST', 'Invalid subscribe payload', { errors: parsed.error.format() });
      return apiError('INVALID_PAYLOAD', 'Invalid subscription object', 400, parsed.error.issues);
    }

    const { subscription, uid, apartmentName } = parsed.data;

    if (!db) {
      logger.error('PushSubscribeAPI.POST', 'Firebase Admin not initialized');
      return apiError('DATABASE_UNAVAILABLE', 'Firebase Admin not initialized', 500);
    }

    const endpointHash = Buffer.from(subscription.endpoint).toString('base64').replace(/=/g, '').replace(/\//g, '_');

    const updateData: {
      subscription: z.infer<typeof PushSubscriptionSchema>;
      uid: string | null;
      updatedAt: string;
      apts?: FieldValue;
    } = {
      subscription,
      uid: uid || null,
      updatedAt: new Date().toISOString(),
    };

    if (apartmentName) {
      updateData.apts = FieldValue.arrayUnion(apartmentName);
    }

    await db.collection('push_subscriptions').doc(endpointHash).set(updateData, { merge: true });

    logger.info('PushSubscribeAPI.POST', 'Push subscription registered successfully', { uid, endpointHash, apartmentName });
    return apiSuccess({ message: 'Subscribed successfully' });
  } catch (error: unknown) {
    logger.error('PushSubscribeAPI.POST', 'Push Subscribe Error', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to subscribe', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(req, {
      prefix: 'ratelimit_push_subscribe_get',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      logger.warn('PushSubscribeAPI.GET', 'Missing endpoint parameter');
      return apiError('INVALID_QUERY', 'Endpoint is required', 400);
    }

    if (!db) {
      logger.error('PushSubscribeAPI.GET', 'Firebase Admin not initialized');
      return apiError('DATABASE_UNAVAILABLE', 'Firebase Admin not initialized', 500);
    }

    const endpointHash = Buffer.from(endpoint).toString('base64').replace(/=/g, '').replace(/\//g, '_');
    const docRef = db.collection('push_subscriptions').doc(endpointHash);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return apiSuccess({ apts: [] }, { apts: [] });
    }

    const data = docSnap.data();
    return apiSuccess({ apts: data?.apts || [] }, { apts: data?.apts || [] });
  } catch (error: unknown) {
    logger.error('PushSubscribeAPI.GET', 'Failed to retrieve push subscriptions', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to retrieve subscriptions', 500);
  }
}
