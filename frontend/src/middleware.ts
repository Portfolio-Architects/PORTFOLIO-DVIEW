import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let ratelimit: Ratelimit | null = null;

if (redisUrl && redisToken) {
  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    // Limit to 60 requests per minute per IP using a Sliding Window algorithm
    ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: '@upstash/ratelimit/dview',
    });
  } catch (err) {
    console.error('Failed to initialize Upstash Redis Ratelimiter:', err);
  }
} else {
  console.warn('⚠️ UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Rate limiting is disabled (Bypass mode).');
}

// Allowed domains/origins for CORS/Origin validation
const ALLOWED_ORIGINS = [
  'localhost:',
  '127.0.0.1:',
  'vercel.app',
  'dview.kr' // Target domain
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all API routes
  if (pathname.startsWith('/api/')) {
    // 1. Origin / Referer validation (Prevent unauthorized external scraping)
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';

    const hasAllowedOrigin = ALLOWED_ORIGINS.some(allowed => 
      origin.includes(allowed) || referer.includes(allowed)
    );

    // Block request if origin exists but is not in the whitelist
    if (origin && !hasAllowedOrigin) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Unauthorized cross-origin request' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Rate Limiting via Upstash Redis
    if (ratelimit) {
      const ip = (request as any).ip || request.headers.get('x-forwarded-for') || '127.0.0.1';
      
      try {
        const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_api_${ip}`);
        
        if (!success) {
          return new NextResponse(
            JSON.stringify({ error: 'Too Many Requests: Rate limit exceeded.' }),
            {
              status: 429,
              headers: {
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
              },
            }
          );
        }
      } catch (err) {
        console.error('Rate limit evaluation error:', err);
        // Fail-open: Proceed with request if Upstash Redis fails, ensuring availability
      }
    }
  }

  return NextResponse.next();
}

// Limit middleware run scope to API routes
export const config = {
  matcher: ['/api/:path*'],
};
