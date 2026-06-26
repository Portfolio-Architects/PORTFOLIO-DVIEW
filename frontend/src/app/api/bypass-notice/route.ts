import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { rateLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const bypassNoticeQuerySchema = z.object({
  url: z.string()
  .url('Invalid URL format.')
  .refine((url) => {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname;
      return hostname === 'hscity.go.kr' || hostname.endsWith('.hscity.go.kr');
    } catch {
      return false;
    }
  }, {
    message: 'Invalid target URL domain. Only 화성시청 (hscity.go.kr) URLs are allowed.',
  }),
});

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function GET(request: NextRequest) {
  try {
    if (rateLimiter) {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const rawIp = realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
      const { success } = await rateLimiter.limit(`ratelimit_bypassnotice_get_${rawIp}`);
      if (!success) {
        logger.warn('BypassNoticeAPI.GET', 'Rate limit exceeded', { ip: rawIp });
        return new NextResponse('Too Many Requests', { status: 429 });
      }
    }

    const nonce = request.headers.get('x-nonce') || '';
    const { searchParams } = request.nextUrl;
    const targetUrlParam = searchParams.get('url');

    const parsed = bypassNoticeQuerySchema.safeParse({ url: targetUrlParam });

    if (!parsed.success) {
      logger.warn('BypassNoticeAPI.GET', 'Invalid target URL parameter', {
        url: targetUrlParam,
        errors: parsed.error.format(),
      });
      
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid parameters';
      return new NextResponse(errorMsg, { status: 400 });
    }

    const { url: targetUrl } = parsed.data;
    const escapedUrl = escapeHtml(targetUrl);

    // HTML 브릿지 페이지
    // 1. Meta Refresh를 사용하여 네이티브 브라우저 리디렉션 처리 (보안 프로그램 ASTX 등의 JS 탐지 차단 무력화)
    // 2. <meta name="referrer" content="no-referrer" /> 를 메타 리프레시 앞에 배치하여 이전 유입 경로(localhost) 완전 제거
    // 3. JS window.location.replace를 폴백으로 배치하여 이중 방어
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer" />
  <meta http-equiv="refresh" content="0; url=${escapedUrl}" />
  <title>페이지 이동 중...</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background-color: #f8fafc;
      color: #0f172a;
    }
    .spinner {
      border: 3.5px solid #e2e8f0;
      border-top: 3.5px solid #ea6100;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      animation: spin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .message {
      font-size: 14.5px;
      font-weight: 700;
      color: #475569;
      margin: 0;
      letter-spacing: -0.01em;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <p class="message">화성시청 원문 페이지로 안전하게 이동하고 있습니다...</p>
  <script type="text/javascript" nonce="${nonce}">
    // Meta Refresh가 작동하지 않는 일부 특수 환경 브라우저를 위한 JS Fallback
    setTimeout(function() {
      try {
        var target = decodeURIComponent("${encodeURIComponent(targetUrl)}");
        if (target) {
          window.location.replace(target);
        }
      } catch (e) {
        // Fallback fail silently
      }
    }, 150);
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('BypassNoticeAPI.GET', 'Bypass redirect error', {}, err);
    return new NextResponse('Bypass redirect error occurred', { status: 500 });
  }
}
