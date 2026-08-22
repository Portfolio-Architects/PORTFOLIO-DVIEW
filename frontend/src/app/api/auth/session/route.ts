import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { apiSuccess, apiError } from '@/lib/api/apiResponse';
import { checkRateLimit } from '@/lib/api/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SessionInputSchema = z.object({
  idToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_auth_session',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
    }

    let rawBody: unknown;
    try {
      const text = await request.text();
      if (!text.trim()) {
        logger.warn('SessionAPI.POST', 'Empty request body', {});
        return apiError('BAD_REQUEST', 'Bad Request: Empty Payload', 400);
      }
      rawBody = JSON.parse(text);
    } catch (jsonErr) {
      logger.warn('SessionAPI.POST', 'Invalid JSON format', {}, jsonErr as Error);
      return apiError('BAD_REQUEST', 'Bad Request: Invalid JSON', 400);
    }

    const parsed = SessionInputSchema.safeParse(rawBody);
    if (!parsed.success) {
      logger.warn('SessionAPI.POST', 'Invalid session creation payload', { errors: parsed.error.format() });
      return apiError('INVALID_PAYLOAD', 'idToken is required', 400);
    }

    const { idToken } = parsed.data;

    if (!adminAuth) {
      logger.error('SessionAPI.POST', 'Firebase Admin Auth not initialized');
      return apiError('AUTH_UNAVAILABLE', 'Firebase Admin Auth not initialized', 500);
    }

    // Set session expiration to 5 days
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const isDev = process.env.NODE_ENV === 'development';
    const cookieName = isDev ? 'DVIEW-Session' : '__Secure-DVIEW-Session';

    // Cookie Options: HttpOnly, Secure, SameSite=Lax
    const secureFlag = isDev ? '' : '; Secure';
    const cookieHeader = `${cookieName}=${sessionCookie}; Max-Age=${expiresIn / 1000}; Path=/; SameSite=Lax; HttpOnly${secureFlag}`;

    logger.info('SessionAPI.POST', 'Session cookie created successfully');
    return apiSuccess(
      { status: 'success' },
      { status: 'success' },
      {
        headers: {
          'Set-Cookie': cookieHeader,
        },
      }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('SessionAPI.POST', 'Cookie creation failed', {}, err);
    return apiError('INTERNAL_ERROR', 'Internal Server Error', 500);
  }
}

export async function DELETE() {
  const isDev = process.env.NODE_ENV === 'development';
  const cookieName = isDev ? 'DVIEW-Session' : '__Secure-DVIEW-Session';
  const secureFlag = isDev ? '' : '; Secure';
  const cookieHeader = `${cookieName}=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/; SameSite=Lax; HttpOnly${secureFlag}`;

  logger.info('SessionAPI.DELETE', 'Session cookie cleared successfully');
  return apiSuccess(
    { status: 'success' },
    { status: 'success' },
    {
      headers: {
        'Set-Cookie': cookieHeader,
      },
    }
  );
}
