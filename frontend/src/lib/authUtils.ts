import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

// Zod schemas for auth verification
export const DecodedTokenSchema = z.object({
  uid: z.string().min(1, 'uid cannot be empty'),
  email: z.string().email('Invalid email format').optional(),
  email_verified: z.boolean().optional(),
  admin: z.boolean().optional(),
}).passthrough(); // Allow other Firebase claims through
export type DecodedToken = z.infer<typeof DecodedTokenSchema>;

export const SessionCacheRecordSchema = z.object({
  claims: DecodedTokenSchema,
  lastChecked: z.number().int().positive(),
});
export type SessionCacheRecord = z.infer<typeof SessionCacheRecordSchema>;

// Cache decoded admin claims to bypass network-bound Firebase Revocation Checks (Check once every 60 seconds per session)
const sessionCache = new Map<string, SessionCacheRecord>();

/**
 * Extracts and verifies the Firebase ID Token from the Authorization header or session cookie.
 * Basic Header syntax expected: "Bearer <token>"
 * 
 * @param request NextRequest
 * @returns DecodedToken if valid, throws error otherwise.
 */
export async function verifyAuthHeader(request: NextRequest): Promise<DecodedToken> {
  if (!adminAuth) {
    throw new Error('Firebase Admin Auth not initialized');
  }

  // 1. Try to read from Secure HttpOnly Cookie (Highest Security)
  const isDev = process.env.NODE_ENV === 'development';
  const sessionCookie = request.cookies.get(isDev ? 'DVIEW-Session' : '__Secure-DVIEW-Session')?.value || request.cookies.get('__Secure-DVIEW-Session')?.value;
  if (sessionCookie) {
    try {
      const cached = sessionCache.get(sessionCookie);
      const now = Date.now();

      if (cached && (now - cached.lastChecked < 60000)) {
        // Fast path: Verify locally without calling Firebase servers for revocation state
        const claims = await adminAuth.verifySessionCookie(sessionCookie, false);
        const parsed = DecodedTokenSchema.safeParse(claims);
        if (parsed.success) {
          return parsed.data;
        }
        logger.error('authUtils.verifyAuthHeader', 'Cached session claims validation failed', { error: String(parsed.error) });
      }

      // Slow path: Check revocation state (network-bound) once every 60 seconds
      const claims = await adminAuth.verifySessionCookie(sessionCookie, true);
      const parsed = DecodedTokenSchema.safeParse(claims);
      if (!parsed.success) {
        throw new Error(`Session claims validation failed: ${parsed.error.message}`);
      }
      sessionCache.set(sessionCookie, { claims: parsed.data, lastChecked: now });
      return parsed.data;
    } catch (cookieErr) {
      logger.warn('authUtils.verifyAuthHeader', 'Cookie verification failed, falling back to header', {}, cookieErr);
      sessionCache.delete(sessionCookie); // Invalidate cache on failure
    }
  }

  // 2. Fallback to Authorization Bearer header (Backwards compatibility & iframe contexts)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    const claims = await adminAuth.verifyIdToken(token);
    const parsed = DecodedTokenSchema.safeParse(claims);
    if (!parsed.success) {
      throw new Error(`Token claims validation failed: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  throw new Error('Missing or invalid authentication token (cookie or header)');
}

/**
 * Verifies that the requester is an authenticated Admin.
 * Bypasses checks if in Development mode.
 * 
 * @param request NextRequest
 * @returns Boolean representing authorization status.
 */
export async function verifyAdmin(request: NextRequest): Promise<boolean> {
  try {
    const decodedToken = await verifyAuthHeader(request);

    // Development mode bypass via MOCK_ADMIN_UID (Requires actual auth token to be valid)
    if (process.env.NODE_ENV === 'development' && process.env.MOCK_ADMIN_UID) {
      if (decodedToken.uid === process.env.MOCK_ADMIN_UID) {
        return true;
      }
    }

    return decodedToken.admin === true;
  } catch (error) {
    logger.error('authUtils.verifyAdmin', 'Admin Verification Error', {}, error);
    return false;
  }
}
