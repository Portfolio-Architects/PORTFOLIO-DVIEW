import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  ALLOWED_PUSH_EXACT_HOSTS,
  ALLOWED_PUSH_HOST_SUFFIXES,
  validatePushEndpointUrl,
} from '@/lib/security/pushEndpointPolicy.cjs';

export const PUSH_OWNER_COOKIE_NAME = 'dview_push_owner';

export { ALLOWED_PUSH_EXACT_HOSTS, ALLOWED_PUSH_HOST_SUFFIXES, validatePushEndpointUrl };

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function normalizePushEndpoint(endpoint: string): string {
  const verdict = validatePushEndpointUrl(endpoint);
  return verdict.valid && verdict.normalizedUrl ? verdict.normalizedUrl : endpoint.trim();
}

export const PushEndpointSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .superRefine((val, ctx) => {
    const verdict = validatePushEndpointUrl(val);
    if (!verdict.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: verdict.reason || 'Invalid Web Push endpoint URL',
      });
    }
  })
  .transform((val) => normalizePushEndpoint(val));

export const PushSubscriptionSchema = z.object({
  endpoint: PushEndpointSchema,
  keys: z.object({
    p256dh: z.string().trim().min(1).max(512),
    auth: z.string().trim().min(1).max(512),
  }),
});

/**
 * Runtime structural + SSRF allowlist validator used before dispatching Web Push requests.
 */
export function isValidPushSubscriptionStrict(sub: unknown): sub is PushSubscriptionPayload {
  return PushSubscriptionSchema.safeParse(sub).success;
}

/**
 * Canonical SHA-256 Firestore document ID for a push subscription endpoint.
 * Normalizes hostname casing and explicit `:443` so equivalent URLs never create duplicate docs.
 */
export function hashPushEndpoint(endpoint: string): string {
  return crypto.createHash('sha256').update(normalizePushEndpoint(endpoint), 'utf8').digest('hex');
}

/**
 * Legacy Base64 document ID used prior to SHA-256 migration (for read/cleanup compatibility).
 */
export function legacyBase64EndpointId(endpoint: string): string {
  return Buffer.from(normalizePushEndpoint(endpoint)).toString('base64').replace(/=/g, '').replace(/\//g, '_');
}

export function constantTimeEqualString(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) return false;
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

/**
 * Server-side HMAC signing secret for push subscription ownership cookies.
 * Fail-closed: never uses a hardcoded fallback key.
 */
export function getPushOwnershipSigningKey(): string | null {
  const key =
    process.env.PUSH_TOKEN_SECRET?.trim() ||
    process.env.VAPID_PRIVATE_KEY?.trim() ||
    process.env.CRON_SECRET?.trim();
  return key && key.length > 0 ? key : null;
}

function signEndpointHash(endpointHash: string, signingKey: string): string {
  return crypto
    .createHmac('sha256', signingKey)
    .update(`dview-push-owner-v1:${endpointHash}`, 'utf8')
    .digest('hex');
}

/**
 * Creates an HMAC-SHA256 ownership token bound to a specific push endpoint.
 * Format: `<endpointSha256Hex>.<hmacSha256Hex>`
 */
export function createPushOwnershipToken(endpoint: string): string | null {
  const signingKey = getPushOwnershipSigningKey();
  if (!signingKey) return null;
  const endpointHash = hashPushEndpoint(endpoint);
  const sig = signEndpointHash(endpointHash, signingKey);
  return `${endpointHash}.${sig}`;
}

/**
 * Verifies an HMAC-SHA256 ownership token against the given push endpoint in constant time.
 */
export function verifyPushOwnershipToken(
  token: string | null | undefined,
  endpoint: string
): boolean {
  if (!token || typeof token !== 'string') return false;
  const signingKey = getPushOwnershipSigningKey();
  if (!signingKey) return false;

  const trimmed = token.trim();
  const parts = trimmed.split('.');
  if (parts.length !== 2) return false;
  const [tokenEndpointHash, providedSig] = parts;
  if (!/^[0-9a-f]{64}$/i.test(tokenEndpointHash) || !/^[0-9a-f]{64}$/i.test(providedSig)) {
    return false;
  }

  const expectedEndpointHash = hashPushEndpoint(endpoint);
  if (!constantTimeEqualString(tokenEndpointHash.toLowerCase(), expectedEndpointHash)) {
    return false;
  }

  const expectedSig = signEndpointHash(expectedEndpointHash, signingKey);
  return constantTimeEqualString(providedSig.toLowerCase(), expectedSig);
}

/**
 * Extracts the `dview_push_owner` token from NextRequest cookies or raw Cookie header.
 */
export function extractPushOwnershipToken(request: NextRequest | Request): string | null {
  if ('cookies' in request && typeof request.cookies?.get === 'function') {
    try {
      const val = request.cookies.get(PUSH_OWNER_COOKIE_NAME)?.value;
      if (val && val.trim().length > 0) return val.trim();
    } catch {
      // Fallback to raw Cookie header parsing
    }
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${PUSH_OWNER_COOKIE_NAME}=`)) {
      const rawVal = cookie.slice(`${PUSH_OWNER_COOKIE_NAME}=`.length).trim();
      if (!rawVal) continue;
      try {
        return decodeURIComponent(rawVal).trim();
      } catch {
        return rawVal;
      }
    }
  }
  return null;
}

export function hasValidPushOwnershipCookie(
  request: NextRequest | Request,
  endpoint: string
): boolean {
  const token = extractPushOwnershipToken(request);
  return verifyPushOwnershipToken(token, endpoint);
}

export function getPushOwnerCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/push',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  };
}
