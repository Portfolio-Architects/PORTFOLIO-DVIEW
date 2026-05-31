import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

// Upstash 글로벌 Rate Limiter (Edge 호환)
const RATE_LIMIT_POINTS = 60; // 분당 60회 허용

let ratelimit: Ratelimit | null = null;

try {
  // 환경변수가 없어도 빌트 및 구동 단계에서 앱이 멈추지 않도록 안전하게 예외처리
  if (redis) {
    ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(RATE_LIMIT_POINTS, "1 m"),
      analytics: false,
      prefix: "DTDLS:ratelimit", // 멀티 프로젝트 Isolation을 위한 Prefix
    });
  }
} catch (error) {
  console.warn("Failed to initialize Upstash Ratelimit:", error);
}

export async function proxy(request: NextRequest) {
  // 클라이언트 IP 추출 (Vercel 환경 지원 시 x-real-ip 최우선)
  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
  
  // 1. Rate Limiting (API 라우트에 국한)
  if (request.nextUrl.pathname.startsWith('/api/')) {
    if (ratelimit) {
      try {
        const { success, limit, reset, remaining } = await ratelimit.limit(ip);
        if (!success) {
          return new NextResponse(
            JSON.stringify({ 
              error: 'Too Many Requests', 
              message: '비정상적인 트래픽이 감지되어 요청이 차단되었습니다. 잠시 후 다시 시도해주십시오.' 
            }),
            { 
              status: 429, 
              headers: { 
                'Content-Type': 'application/json',
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': reset.toString(),
                'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
              } 
            }
          );
        }
      } catch (err) {
        // Redis 연결 에러 시 요청을 차단하지 않고 Bypass (Fail-Open 방식)
        console.warn("Upstash RateLimiter Error, bypassing:", err);
      }
    }
  }

  // 2. HTTP Security 헤더 주입 파이프라인 (Nonce 기반 Strict CSP)
  // Generate a cryptographically secure random nonce
  const nonceArray = new Uint8Array(16);
  crypto.getRandomValues(nonceArray);
  let nonce = '';
  if (typeof btoa !== 'undefined') {
    nonce = btoa(String.fromCharCode.apply(null, Array.from(nonceArray)));
  } else {
    nonce = Buffer.from(nonceArray).toString('base64');
  }

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' 'unsafe-inline' https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://apis.google.com https://www.recaptcha.net https://cdn.jsdelivr.net https://t1.kakaocdn.net https://developers.kakao.com https://pagead2.googlesyndication.com;
    worker-src 'self' blob:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
    img-src 'self' blob: data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://maps.gstatic.com https://maps.googleapis.com https://www.googletagmanager.com https://www.google-analytics.com https://t1.kakaocdn.net https://pagead2.googlesyndication.com;
    font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net;
    connect-src 'self' https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com https://firebasestorage.googleapis.com https://maps.googleapis.com https://vitals.vercel-insights.com https://cdn.jsdelivr.net https://www.google.com https://content-firebaseappcheck.googleapis.com https://apis.google.com https://www.recaptcha.net https://lh3.googleusercontent.com https://www.googletagmanager.com https://www.google-analytics.com https://t1.kakaocdn.net https://*.kakao.com https://pagead2.googlesyndication.com;
    frame-src 'self' https://www.google.com https://www.youtube.com https://portfolio-dtdls.firebaseapp.com https://apis.google.com https://www.recaptcha.net https://*.kakao.com https://googleads.g.doubleclick.net https://*.googlesyndication.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://sharer.kakao.com https://*.kakao.com;
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Content-Security-Policy', cspHeader);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // 공통 보안 헤더 (A 레벨 및 Nonce 전송)
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce);
  response.headers.set('X-Frame-Options', 'DENY'); // Clickjacking 원천 차단
  response.headers.set('X-Content-Type-Options', 'nosniff'); // MIME 타입 변조 방지 
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); // 리퍼러 보호
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)'); // 하드웨어 권한 탈취 방지

  // A+ 등급 승급용 심화 보안 헤더
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'); // 전 구간 강제 HTTPS화
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups'); // Spectre 공격 방어 (Firebase OAuth 팝업을 위해 allow-popups 필수)
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin'); // 타 도메인의 브라우저 메모리 로딩 차단

  return response;
}

// 미들웨어 구동 범위 (정적 에셋 등 불필요한 연산 방지)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|_vercel|assets|css|js|images).*)',
  ],
};
