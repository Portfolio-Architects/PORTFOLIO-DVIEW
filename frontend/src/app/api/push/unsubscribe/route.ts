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
  getPushOwnerCookieOptions,
  hashPushEndpoint,
  hasValidPushOwnershipCookie,
  legacyBase64EndpointId,
} from '@/lib/push/pushSecurity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UnsubscribeInputSchema = z.object({
  endpoint: PushEndpointSchema,
  apartmentName: z.string().trim().min(1).max(200).optional().nullable(),
});

async function resolveVerifiedUid(req: NextRequest): Promise<string | null> {
  try {
    const decoded = await verifyAuthHeader(req);
    return decoded?.uid || null;
  } catch {
    return null;
  }
}

function isFirestoreNotFoundError(error: unknown): boolean {
  const errCode = (error as { code?: number | string } | null)?.code;
  return errCode === 5 || errCode === 'not-found' || errCode === 'NOT_FOUND';
}

function collectMatchingAptVariants(apts: unknown, normalizedName: string): string[] {
  const variants = new Set<string>([normalizedName]);
  if (Array.isArray(apts)) {
    for (const item of apts) {
      if (typeof item === 'string' && item.trim() === normalizedName) {
        variants.add(item);
      }
    }
  }
  return Array.from(variants);
}

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

    const endpointHash = hashPushEndpoint(endpoint);
    const hasOwnerCookie = hasValidPushOwnershipCookie(req, endpoint);
    const verifiedUid = hasOwnerCookie ? null : await resolveVerifiedUid(req);

    // Reject completely unauthenticated callers before performing any Firestore reads
    if (!hasOwnerCookie && !verifiedUid) {
      logger.warn('PushUnsubscribeAPI.POST', 'Unauthorized push unsubscribe attempt blocked', { endpointHash });
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    const legacyDocId = legacyBase64EndpointId(endpoint);
    const docRef = db.collection('push_subscriptions').doc(endpointHash);
    const legacyRef =
      legacyDocId !== endpointHash ? db.collection('push_subscriptions').doc(legacyDocId) : null;

    const [docSnap, legacySnap] = await Promise.all([
      docRef.get(),
      legacyRef ? legacyRef.get() : Promise.resolve(null),
    ]);

    const targetRef = docSnap.exists ? docRef : legacySnap?.exists ? legacyRef : null;
    const targetSnap = docSnap.exists ? docSnap : legacySnap?.exists ? legacySnap : null;
    const docData = docSnap.exists ? docSnap.data() : null;
    const legacyData = legacySnap?.exists ? legacySnap.data() : null;

    const matchesDocUid = Boolean(verifiedUid && docData?.uid && verifiedUid === docData.uid);
    const matchesLegacyUid = Boolean(verifiedUid && legacyData?.uid && verifiedUid === legacyData.uid);
    const isAuthorized =
      hasOwnerCookie ||
      matchesDocUid ||
      (matchesLegacyUid && (!docSnap.exists || !docData?.uid));

    if (!isAuthorized) {
      logger.warn('PushUnsubscribeAPI.POST', 'Unauthorized push unsubscribe attempt blocked', { endpointHash });
      return apiError('UNAUTHORIZED', 'Unauthorized', 401);
    }

    if (!targetRef || !targetSnap?.exists) {
      logger.info('PushUnsubscribeAPI.POST', 'Subscription document not found, doing nothing', { endpointHash });
      const notFoundRes = apiSuccess({ message: 'Subscription not found' }, { message: 'Subscription not found' });
      if (!apartmentName) {
        notFoundRes.cookies.set(PUSH_OWNER_COOKIE_NAME, '', { ...getPushOwnerCookieOptions(), maxAge: 0 });
      }
      return notFoundRes;
    }

    const canModifyLegacy = Boolean(
      docSnap.exists &&
        legacyRef &&
        legacySnap?.exists &&
        (hasOwnerCookie || matchesLegacyUid || (matchesDocUid && !legacyData?.uid))
    );

    if (apartmentName) {
      const updatedAt = new Date().toISOString();
      const targetVariants = collectMatchingAptVariants(targetSnap.data()?.apts, apartmentName);
      try {
        await targetRef.update({
          apts: FieldValue.arrayRemove(...targetVariants),
          updatedAt,
        });
      } catch (targetErr: unknown) {
        if (!isFirestoreNotFoundError(targetErr)) {
          throw targetErr;
        }
      }
      if (canModifyLegacy && legacyRef) {
        const legacyVariants = collectMatchingAptVariants(legacyData?.apts, apartmentName);
        try {
          await legacyRef.update({
            apts: FieldValue.arrayRemove(...legacyVariants),
            updatedAt,
          });
        } catch (legacyErr: unknown) {
          if (!isFirestoreNotFoundError(legacyErr)) {
            throw legacyErr;
          }
        }
      }
      logger.info('PushUnsubscribeAPI.POST', 'Apartment unsubscribed successfully', {
        endpointHash,
        apartmentName,
      });
    } else {
      await targetRef.delete();
      if (canModifyLegacy && legacyRef) {
        try {
          await legacyRef.delete();
        } catch (legacyErr: unknown) {
          if (!isFirestoreNotFoundError(legacyErr)) {
            throw legacyErr;
          }
        }
      }
      logger.info('PushUnsubscribeAPI.POST', 'Subscription deleted completely', { endpointHash });
    }

    const response = apiSuccess({ message: 'Unsubscribed successfully' });
    if (!apartmentName) {
      response.cookies.set(PUSH_OWNER_COOKIE_NAME, '', { ...getPushOwnerCookieOptions(), maxAge: 0 });
    }
    return response;
  } catch (error: unknown) {
    logger.error('PushUnsubscribeAPI.POST', 'Push Unsubscribe Error', {}, error as Error);
    return apiError('INTERNAL_ERROR', 'Failed to unsubscribe', 500);
  }
}
