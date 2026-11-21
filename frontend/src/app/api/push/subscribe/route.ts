import { NextRequest } from 'next/server';
import { adminDb as db, FieldValue } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { verifyAuthHeader } from '@/lib/authUtils';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import {
  PUSH_OWNER_COOKIE_NAME,
  PushEndpointSchema,
  PushSubscriptionSchema,
  constantTimeEqualString,
  createPushOwnershipToken,
  getPushOwnerCookieOptions,
  hashPushEndpoint,
  hasValidPushOwnershipCookie,
  legacyBase64EndpointId,
} from '@/lib/push/pushSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SubscribeInputSchema = z.object({
  subscription: PushSubscriptionSchema,
  // Accepted for backwards-compatibility with cached clients but never trusted; uid comes strictly from server auth.
  uid: z.string().nullable().optional(),
  apartmentName: z.string().min(1).max(200).nullable().optional(),
  apartmentNames: z.array(z.string().min(1).max(200)).max(50).optional(),
});

const IGNORED_PLACEHOLDER_APTS = new Set(['아파트']);

async function resolveVerifiedUid(req: NextRequest): Promise<string | null> {
  try {
    const decoded = await verifyAuthHeader(req);
    return decoded?.uid || null;
  } catch {
    return null;
  }
}

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

    const { subscription, apartmentName, apartmentNames } = parsed.data;

    if (!db) {
      logger.error('PushSubscribeAPI.POST', 'Firebase Admin not initialized');
      return apiError('DATABASE_UNAVAILABLE', 'Firebase Admin not initialized', 500);
    }

    const verifiedUid = await resolveVerifiedUid(req);
    const endpointHash = hashPushEndpoint(subscription.endpoint);
    const legacyDocId = legacyBase64EndpointId(subscription.endpoint);
    const docRef = db.collection('push_subscriptions').doc(endpointHash);
    const legacyRef =
      legacyDocId !== endpointHash ? db.collection('push_subscriptions').doc(legacyDocId) : null;

    const [docSnap, legacySnap] = await Promise.all([
      docRef.get(),
      legacyRef ? legacyRef.get() : Promise.resolve(null),
    ]);

    type StoredPushSubDoc = {
      uid?: string | null;
      apts?: string[];
      subscription?: { keys?: { p256dh?: string; auth?: string } };
    };

    const docData = docSnap.exists ? (docSnap.data() as StoredPushSubDoc) : null;
    const legacyData = legacySnap?.exists ? (legacySnap.data() as StoredPushSubDoc) : null;
    const existingData = docData ?? legacyData;
    const hasOwnerCookie = hasValidPushOwnershipCookie(req, subscription.endpoint);
    const matchesVerifiedUid = Boolean(verifiedUid && existingData?.uid && verifiedUid === existingData.uid);

    if (existingData) {
      if (existingData.uid && !matchesVerifiedUid && !hasOwnerCookie) {
        logger.warn('PushSubscribeAPI.POST', 'Blocked cross-user push subscription overwrite', { endpointHash });
        return apiError('FORBIDDEN', 'Unauthorized subscription modification', 403);
      }

      if (!hasOwnerCookie && !matchesVerifiedUid) {
        const keysMatch =
          constantTimeEqualString(existingData.subscription?.keys?.auth, subscription.keys.auth) &&
          constantTimeEqualString(existingData.subscription?.keys?.p256dh, subscription.keys.p256dh);
        if (!keysMatch) {
          logger.warn('PushSubscribeAPI.POST', 'Blocked push subscription overwrite with mismatched push keys', {
            endpointHash,
          });
          return apiError('FORBIDDEN', 'Subscription ownership verification failed', 403);
        }
      }
    }

    const legacyKeysMatch = Boolean(
      legacyData &&
        constantTimeEqualString(legacyData.subscription?.keys?.auth, subscription.keys.auth) &&
        constantTimeEqualString(legacyData.subscription?.keys?.p256dh, subscription.keys.p256dh)
    );
    const canMigrateLegacy = Boolean(
      legacyRef &&
        legacyData &&
        (hasOwnerCookie ||
          (verifiedUid && legacyData.uid && verifiedUid === legacyData.uid) ||
          (!legacyData.uid && (matchesVerifiedUid || legacyKeysMatch)))
    );
    const legacyApts = canMigrateLegacy && Array.isArray(legacyData?.apts) ? legacyData.apts : [];

    const mergedAptNames = Array.from(
      new Set(
        [
          ...legacyApts.map((n) => (typeof n === 'string' ? n.trim() : '')),
          ...(apartmentName ? [apartmentName.trim()] : []),
          ...((apartmentNames || []).map((n) => n.trim())),
        ].filter((n) => n.length > 0 && !IGNORED_PLACEHOLDER_APTS.has(n))
      )
    );

    const updateData: {
      subscription: z.infer<typeof PushSubscriptionSchema>;
      uid: string | null;
      updatedAt: string;
      apts?: FieldValue;
    } = {
      subscription,
      uid: verifiedUid ?? existingData?.uid ?? null,
      updatedAt: new Date().toISOString(),
    };

    if (mergedAptNames.length > 0) {
      updateData.apts = FieldValue.arrayUnion(...mergedAptNames);
    }

    await docRef.set(updateData, { merge: true });

    if (canMigrateLegacy && legacyRef) {
      try {
        await legacyRef.delete();
      } catch (cleanupErr) {
        logger.warn('PushSubscribeAPI.POST', 'Failed to clean up legacy base64 subscription doc', { endpointHash }, cleanupErr as Error);
      }
    }

    logger.info('PushSubscribeAPI.POST', 'Push subscription registered successfully', {
      hasVerifiedUid: Boolean(verifiedUid),
      endpointHash,
      apartmentName,
      mergedCount: mergedAptNames.length,
    });

    const response = apiSuccess({ message: 'Subscribed successfully' });
    const ownerToken = createPushOwnershipToken(subscription.endpoint);
    if (ownerToken) {
      response.cookies.set(PUSH_OWNER_COOKIE_NAME, ownerToken, getPushOwnerCookieOptions());
    } else {
      logger.error(
        'PushSubscribeAPI.POST',
        'Push ownership signing key is unset (set PUSH_TOKEN_SECRET, VAPID_PRIVATE_KEY, or CRON_SECRET); ownership cookie was not minted',
        { endpointHash }
      );
    }
    return response;
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
    const rawEndpoint = searchParams.get('endpoint');

    const parsedEndpoint = PushEndpointSchema.safeParse(rawEndpoint);
    if (!parsedEndpoint.success) {
      logger.warn('PushSubscribeAPI.GET', 'Missing or invalid push endpoint parameter');
      return apiError('INVALID_QUERY', 'Valid official Web Push endpoint is required', 400);
    }
    const endpoint = parsedEndpoint.data;

    if (!db) {
      logger.error('PushSubscribeAPI.GET', 'Firebase Admin not initialized');
      return apiError('DATABASE_UNAVAILABLE', 'Firebase Admin not initialized', 500);
    }

    const endpointHash = hashPushEndpoint(endpoint);
    const hasOwnerCookie = hasValidPushOwnershipCookie(req, endpoint);
    const verifiedUid = hasOwnerCookie ? null : await resolveVerifiedUid(req);

    // Reject completely unauthenticated callers before performing any Firestore reads
    if (!hasOwnerCookie && !verifiedUid) {
      logger.warn('PushSubscribeAPI.GET', 'Unauthorized push subscription lookup blocked', { endpointHash });
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const legacyDocId = legacyBase64EndpointId(endpoint);
    const docSnap = await db.collection('push_subscriptions').doc(endpointHash).get();
    const effectiveSnap =
      docSnap.exists
        ? docSnap
        : legacyDocId !== endpointHash
          ? await db.collection('push_subscriptions').doc(legacyDocId).get()
          : docSnap;

    const data = effectiveSnap.exists ? effectiveSnap.data() : null;
    const matchesVerifiedUid = Boolean(verifiedUid && data?.uid && verifiedUid === data.uid);

    if (!hasOwnerCookie && !matchesVerifiedUid) {
      logger.warn('PushSubscribeAPI.GET', 'Unauthorized push subscription lookup blocked', { endpointHash });
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (!effectiveSnap.exists) {
      return apiSuccess({ apts: [] }, { apts: [] });
    }

    return apiSuccess({ apts: data?.apts || [] }, { apts: data?.apts || [] });
  } catch (error: unknown) {
    logger.error('PushSubscribeAPI.GET', 'Failed to retrieve push subscriptions', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to retrieve subscriptions', 500);
  }
}
