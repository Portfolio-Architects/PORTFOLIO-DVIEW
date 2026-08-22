import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import { apiError } from '@/lib/api/apiResponse';

export const runtime = 'nodejs';
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
    const rateLimit = await checkRateLimit(request, {
      prefix: 'ratelimit_bypassnotice_get',
      requestsPerLimit: 60,
    });
    if (!rateLimit.success) {
      logger.warn('BypassNoticeAPI.GET', 'Rate limit exceeded');
      return rateLimit.response || apiError('RATE_LIMIT_EXCEEDED', 'Too Many Requests', 429);
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
