import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import {
  NOISE_APARTMENT_QUERY_PARAMS,
  resolveCanonicalAptSlug,
} from '@/lib/utils/apartmentMapping';
import { CANONICAL_TX_SUMMARY_MAP } from '@/lib/utils/canonicalAptCatalog';

// Upstash 글로벌 Rate Limiter (Edge 호환)
const RATE_LIMIT_POINTS = 60; // 분당 60회 허용

// Zod schema for proxy configurations
const ProxyConfigSchema = z.object({
  rateLimitPoints: z.number().int().positive().catch(60),
  allowedOrigins: z.array(z.string()).min(1),
});

const proxyConfig = ProxyConfigSchema.parse({
  rateLimitPoints: RATE_LIMIT_POINTS,
  allowedOrigins: [
    'localhost:',
    '127.0.0.1:',
    'vercel.app',
    'dview.kr',
    'dongtanview.com'
  ]
});

// Zod schema for request metadata validation
const RequestMetadataSchema = z.object({
  ip: z.string().catch('127.0.0.1'),
  origin: z.string().catch(''),
  referer: z.string().catch(''),
});

let ratelimit: Ratelimit | null = null;

try {
  // 환경변수가 없어도 빌트 및 구동 단계에서 앱이 멈추지 않도록 안전하게 예외처리
  if (redis) {
    ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(proxyConfig.rateLimitPoints, "1 m"),
      analytics: false,
      prefix: "DTDLS:ratelimit", // 멀티 프로젝트 Isolation을 위한 Prefix
    });
  }
} catch (error) {
  logger.warn("proxy.init", "Failed to initialize Upstash Ratelimit", {}, error);
}

// 모듈 초기화 시점에 고정 CSP 헤더를 1회만 정규화하여 매 요청마다 정규식 치환·문자열 할당이 발생하는 CPU 오버헤드 제거
const STATIC_CSP_HEADER = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https: http: https://www.google.com https://www.gstatic.com https://www.googletagmanager.com https://*.googletagmanager.com https://apis.google.com https://www.recaptcha.net https://cdn.jsdelivr.net https://t1.kakaocdn.net https://developers.kakao.com https://pagead2.googlesyndication.com;
  worker-src 'self' blob:;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net;
  img-src 'self' blob: data: https://firebasestorage.googleapis.com https://lh3.googleusercontent.com https://maps.gstatic.com https://maps.googleapis.com https://www.google.com https://*.google.com https://*.google.co.kr https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://t1.kakaocdn.net https://pagead2.googlesyndication.com https://*.doubleclick.net https://*.googlesyndication.com https://ad.doubleclick.net https://*.adtrafficquality.google;
  font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net;
  connect-src 'self' https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com wss://*.firestore.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://firebasestorage.googleapis.com https://maps.googleapis.com https://vitals.vercel-insights.com https://cdn.jsdelivr.net https://www.google.com https://*.google.com https://*.google.co.kr https://content-firebaseappcheck.googleapis.com https://apis.google.com https://www.recaptcha.net https://lh3.googleusercontent.com https://www.googletagmanager.com https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://t1.kakaocdn.net https://*.kakao.com https://pagead2.googlesyndication.com https://*.googlesyndication.com https://*.doubleclick.net https://www.gstatic.com https://*.gstatic.com https://*.adtrafficquality.google https://*.firebaseapp.com;
  frame-src 'self' https://www.google.com https://www.youtube.com https://portfolio-dtdls.firebaseapp.com https://apis.google.com https://www.recaptcha.net https://*.kakao.com https://googleads.g.doubleclick.net https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google;
  object-src 'none';
  base-uri 'self';
  form-action 'self' https://sharer.kakao.com https://*.kakao.com;
  frame-ancestors 'none';
  upgrade-insecure-requests;
`.replace(/\s+/g, ' ').trim();

// 자체적으로 Rate Limit를 수행하거나 CDN 캐시로 서빙되는 읽기 전용 API 경로는 프록시 단 중복 Redis 호출 생략
const PROXY_RATELIMIT_EXEMPT_API_PATHS = new Set([
  '/api/og',
  '/api/dashboard-init',
  '/api/macro/rates',
  '/api/macro/news',
  '/api/local-notices',
  '/api/ads/click',
  '/api/explore/search-data',
  '/api/apartments-by-dong',
  '/api/transaction-summary',
  '/api/location-scores',
  '/api/type-map',
  '/api/favorite-counts',
  '/api/favorite',
  '/api/public/analytics',
  '/api/stats/dongtan-station',
  '/api/technovalley/jisan-status',
  '/api/technovalley/transactions',
  '/api/technovalley/trend',
  '/api/technovalley/industry-distribution',
  '/api/technovalley/center-specs',
  '/api/apartments/vote',
  '/api/board/posts',
  '/api/board/comments',
  '/api/board/likes',
  '/api/board/verify-gps',
  '/api/board/verify-location',
  '/api/board/profile',
  '/api/comments',
  '/api/report-view',
  '/api/traffic',
  '/api/subscribe',
  '/api/unsubscribe',
  '/api/push/subscribe',
  '/api/push/unsubscribe',
  '/api/push/notify-new-high',
  '/api/indexing/apartment',
]);

function isProxyRateLimitExemptApiPath(pathname: string): boolean {
  if (PROXY_RATELIMIT_EXEMPT_API_PATHS.has(pathname)) return true;
  if (pathname.startsWith('/api/board/posts/')) return true;
  return false;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 0.5. 메인페이지 tab=imjang 리다이렉트 처리 (Edge 단에서 고속 리다이렉트)
  if (pathname === '/') {
    const tab = request.nextUrl.searchParams.get('tab');
    if (tab === 'imjang') {
      const search = request.nextUrl.searchParams.get('search');
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      return NextResponse.redirect(new URL(`/explore${query}`, request.url));
    }
  }

  // 0.6. 아파트 상세 비정규 URL 슬러그(공백·별칭·NFD·이중인코딩) 및 크롤러/번역 노이즈 쿼리(?hl=ko-KR 등) → 단일 정규 슬러그 HTTP 308 영구 리다이렉트
  if (pathname.startsWith('/apartment/')) {
    const rawSegment = pathname.slice('/apartment/'.length).replace(/\/+$/, '');
    if (rawSegment && !rawSegment.includes('/')) {
      const canonicalSlug = resolveCanonicalAptSlug(rawSegment);
      if (!canonicalSlug || !CANONICAL_TX_SUMMARY_MAP[canonicalSlug]) {
        return NextResponse.redirect(new URL('/explore', request.url), 307);
      }

      const canonicalPath = `/apartment/${encodeURIComponent(canonicalSlug)}`;

      const noiseKeysToDelete: string[] = [];
      for (const key of Array.from(request.nextUrl.searchParams.keys())) {
        if ((NOISE_APARTMENT_QUERY_PARAMS as readonly string[]).includes(key.toLowerCase())) {
          noiseKeysToDelete.push(key);
        }
      }

      if (pathname !== canonicalPath || noiseKeysToDelete.length > 0) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = canonicalPath;
        for (const key of noiseKeysToDelete) {
          redirectUrl.searchParams.delete(key);
        }
        return NextResponse.redirect(redirectUrl, 308);
      }
    }
  }

  // 정적 자원 및 JSON 청크 요청에 대한 에지 미들웨어 고속 탈출 가드(Fast Path)
  if (
    pathname.startsWith('/data/') ||
    pathname.startsWith('/tx-data/') ||
    pathname === '/sw.js' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/ads.txt' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    /\.(json|png|jpg|jpeg|gif|svg|ico|css|js|map|html)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 0. 로컬 개발 환경(development)인 경우 HMR(핫 리로드) 스크립트 실행 및 디버깅을 위해 CSP 강제 설정을 우회합니다.
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // 1. Rate Limiting & CORS (API 라우트에 국한 - 일반 페이지 요청에서는 Zod 파싱 및 Redis 호출 생략)
  if (pathname.startsWith('/api/')) {
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const origin = request.headers.get('origin') || '';
    const referer = request.headers.get('referer') || '';

    // Origin / Referer validation (Prevent unauthorized external scraping)
    const hasAllowedOrigin = proxyConfig.allowedOrigins.some(allowed => 
      origin.includes(allowed) || referer.includes(allowed)
    );

    // Block request if origin exists but is not in the whitelist
    if (origin && !hasAllowedOrigin) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden: Unauthorized cross-origin request' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (ratelimit && !isProxyRateLimitExemptApiPath(pathname)) {
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
        logger.warn("proxy.api", "Upstash RateLimiter Error, bypassing", {}, err);
      }
    }
  }

  // 2. HTTP Security 헤더 주입 파이프라인
  // /api/bypass-notice 외 일반 페이지·API 요청은 request.headers 변조를 생략하여 ISR/CDN 캐시 적중률 및 CPU 효율 보장
  let response: NextResponse;
  if (pathname === '/api/bypass-notice') {
    const nonceArray = new Uint8Array(16);
    crypto.getRandomValues(nonceArray);
    const nonce =
      typeof btoa !== 'undefined'
        ? btoa(String.fromCharCode.apply(null, Array.from(nonceArray)))
        : Buffer.from(nonceArray).toString('base64');

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('Content-Security-Policy', STATIC_CSP_HEADER);
    requestHeaders.set('x-nonce', nonce);
    response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.headers.set('x-nonce', nonce);
  } else {
    response = NextResponse.next();
  }

  // 공통 보안 헤더
  response.headers.set('Content-Security-Policy', STATIC_CSP_HEADER);
  response.headers.set('X-Frame-Options', 'DENY'); // Clickjacking 원천 차단
  response.headers.set('X-Content-Type-Options', 'nosniff'); // MIME 타입 변조 방지 
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin'); // 리퍼러 보호
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)'); // 하드웨어 권한 탈취 방지

  // A+ 등급 승급용 심화 보안 헤더
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload'); // 전 구간 강제 HTTPS화
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups'); // Spectre 공격 방어 (Firebase OAuth 팝업을 위해 allow-popups 필수)
  response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin'); // 구글 애드센스 등 외부 도메인 자원 로딩 허용

  return response;
}

// 미들웨어 구동 범위 (정적 에셋 등 불필요한 연산 방지)
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|_vercel|assets|css|js|images|data|tx-data|sw\\.js|manifest\\.webmanifest|ads\\.txt|robots\\.txt|sitemap\\.xml).*)',
  ],
};
