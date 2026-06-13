import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminAuth } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'idToken is required' }, { status: 400 });
    }

    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin Auth not initialized' }, { status: 500 });
    }

    // Set session expiration to 5 days
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // Create session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const isDev = process.env.NODE_ENV === 'development';
    const cookieName = isDev ? 'DVIEW-Session' : '__Secure-DVIEW-Session';
    
    // Cookie Options: HttpOnly, Secure, SameSite=Strict
    // __Secure- prefix requires Secure attribute (modern browsers allow Secure over HTTP on localhost)
    const secureFlag = isDev ? '' : 'Secure;';
    const cookieHeader = `${cookieName}=${sessionCookie}; Max-Age=${expiresIn / 1000}; Path=/; SameSite=Strict; ${secureFlag} HttpOnly`;

    const response = NextResponse.json({ status: 'success' });
    response.headers.set('Set-Cookie', cookieHeader);

    return response;
  } catch (error) {
    console.error('[Session API] Cookie creation failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  const isDev = process.env.NODE_ENV === 'development';
  const cookieName = isDev ? 'DVIEW-Session' : '__Secure-DVIEW-Session';
  const secureFlag = isDev ? '' : 'Secure;';
  const cookieHeader = `${cookieName}=; Max-Age=0; Path=/; SameSite=Strict; ${secureFlag} HttpOnly`;

  const response = NextResponse.json({ status: 'success' });
  response.headers.set('Set-Cookie', cookieHeader);

  return response;
}
