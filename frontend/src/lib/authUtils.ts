import { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

// Cache decoded admin claims to bypass network-bound Firebase Revocation Checks (Check once every 60 seconds per session)
const sessionCache = new Map<string, { claims: any; lastChecked: number }>();

/**
 * Extracts and verifies the Firebase ID Token from the Authorization header.
 * Basic Header syntax expected: "Bearer <token>"
 * 
 * @param request NextRequest
 * @returns DecodedIdToken if valid, throws error otherwise.
 */
export async function verifyAuthHeader(request: NextRequest) {
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
        return claims;
      }

      // Slow path: Check revocation state (network-bound) once every 60 seconds
      const claims = await adminAuth.verifySessionCookie(sessionCookie, true);
      sessionCache.set(sessionCookie, { claims, lastChecked: now });
      return claims;
    } catch (cookieErr) {
      console.warn('[AuthUtils] Cookie verification failed, falling back to header:', cookieErr);
      sessionCache.delete(sessionCookie); // Invalidate cache on failure
    }
  }

  // 2. Fallback to Authorization Bearer header (Backwards compatibility & iframe contexts)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1];
    return await adminAuth.verifyIdToken(token);
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
    console.error('Admin Verification Error:', error);
    return false;
  }
}

// Force Turbopack recompile
