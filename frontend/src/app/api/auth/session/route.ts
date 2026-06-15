import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

export const dynamic = 'force-dynamic';

const SessionInputSchema = z.object({
  idToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const parsed = SessionInputSchema.safeParse(rawBody);
    
    if (!parsed.success) {
      logger.warn('SessionAPI.POST', 'Invalid session creation payload', { errors: parsed.error.format() });
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    const { idToken } = parsed.data;

    if (!adminAuth) {
      logger.error('SessionAPI.POST', 'Firebase Admin Auth not initialized');
      return NextResponse.json({ error: 'Firebase Admin Auth not initialized' }, { status: 500 });
    }

    // Set session expiration to 5 days
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const isDev = process.env.NODE_ENV === 'development';
    const cookieName = isDev ? 'DVIEW-Session' : '__Secure-DVIEW-Session';
    
    // Cookie Options: HttpOnly, Secure, SameSite=Lax
    // __Secure- prefix requires Secure attribute (modern browsers allow Secure over HTTP on localhost)
    const secureFlag = isDev ? '' : 'Secure;';
    const cookieHeader = `${cookieName}=${sessionCookie}; Max-Age=${expiresIn / 1000}; Path=/; SameSite=Lax; ${secureFlag} HttpOnly`;

    const response = NextResponse.json({ status: 'success' });
    response.headers.set('Set-Cookie', cookieHeader);

    logger.info('SessionAPI.POST', 'Session cookie created successfully');
    return response;
  } catch (error) {
    logger.error('SessionAPI.POST', 'Cookie creation failed', {}, error as Error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  const isDev = process.env.NODE_ENV === 'development';
  const cookieName = isDev ? 'DVIEW-Session' : '__Secure-DVIEW-Session';
  const secureFlag = isDev ? '' : 'Secure;';
  const cookieHeader = `${cookieName}=; Max-Age=0; Path=/; SameSite=Lax; ${secureFlag} HttpOnly`;

  const response = NextResponse.json({ status: 'success' });
  response.headers.set('Set-Cookie', cookieHeader);

  logger.info('SessionAPI.DELETE', 'Session cookie cleared successfully');
  return response;
}
