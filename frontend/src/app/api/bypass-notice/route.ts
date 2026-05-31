import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // URL 유효성 및 도메인 검증
    // 허용된 외부 도메인: *.hscity.go.kr 및 hscity.go.kr (오픈 리다이렉트 방지)
    let isValidDomain = false;
    try {
      const parsedUrl = new URL(targetUrl);
      const hostname = parsedUrl.hostname;
      if (hostname === 'hscity.go.kr' || hostname.endsWith('.hscity.go.kr')) {
        isValidDomain = true;
      }
    } catch (e) {
      // Invalid URL
    }

    if (!isValidDomain) {
      return new NextResponse('Invalid target URL domain. Only 화성시청 (hscity.go.kr) URLs are allowed.', { status: 400 });
    }

    // HTML 브릿지 페이지
    // 1. Meta Refresh를 사용하여 네이티브 브라우저 리디렉션 처리 (보안 프로그램 ASTX 등의 JS 탐지 차단 무력화)
    // 2. <meta name="referrer" content="no-referrer" /> 를 메타 리프레시 앞에 배치하여 이전 유입 경로(localhost) 완전 제거
    // 3. JS window.location.replace를 폴백으로 배치하여 이중 방어
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer" />
  <meta http-equiv="refresh" content="0; url=${targetUrl}" />
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
      border-top: 3.5px solid #00d29d;
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
  <script type="text/javascript">
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
  } catch (error: any) {
    return new NextResponse(`Bypass redirect error: ${error.message}`, { status: 500 });
  }
}
