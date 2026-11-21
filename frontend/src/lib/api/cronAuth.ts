import crypto from 'crypto';
import type { NextRequest } from 'next/server';

/**
 * Resolves the configured CRON_SECRET strictly from the runtime environment.
 * Fail-closed: never falls back to a hardcoded default secret.
 */
export function getConfiguredCronSecret(): string | null {
  const secret = process.env.CRON_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

/**
 * Constant-time string comparison using fixed-length SHA-256 digests so
 * neither content nor length can be inferred via timing side channels.
 */
export function constantTimeTokenEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const digestA = crypto.createHash('sha256').update(a, 'utf8').digest();
  const digestB = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(digestA, digestB);
}

/**
 * Verifies an HTTP `Authorization: Bearer <token>` header against `CRON_SECRET`.
 * Strictly fail-closed when `CRON_SECRET` is unset or empty.
 */
export function verifyCronBearerToken(
  authHeader: string | null | undefined,
  expectedSecret?: string
): boolean {
  const secret = (expectedSecret !== undefined ? expectedSecret : process.env.CRON_SECRET)?.trim();
  if (!secret) {
    return false;
  }
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }
  const trimmed = authHeader.trim();
  if (!trimmed.startsWith('Bearer ')) {
    return false;
  }
  const providedToken = trimmed.slice('Bearer '.length);
  if (!providedToken) {
    return false;
  }
  return constantTimeTokenEqual(providedToken, secret);
}

/**
 * Strict Cron/Batch endpoint authorization guard.
 * Accepts ONLY `Authorization: Bearer ${CRON_SECRET}` verified in constant time.
 * Rejects spoofable headers (`x-vercel-cron`, `User-Agent: vercel-cron/*`),
 * `x-building-api-key`, query-string `?auth=`, and `Host: localhost` bypasses.
 */
export function isAuthorizedCronBearerRequest(
  request: Pick<NextRequest, 'headers'>,
  expectedSecret?: string
): boolean {
  return verifyCronBearerToken(request.headers.get('authorization'), expectedSecret);
}
