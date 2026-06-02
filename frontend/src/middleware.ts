import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { proxy } from './proxy';

export async function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|_vercel|assets|css|js|images).*)',
  ],
};
