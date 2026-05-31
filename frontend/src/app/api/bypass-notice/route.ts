import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // 보안 검증: 화성시청 도메인(hscity.go.kr)으로 이동하는 경우에만 허용
    // 오픈 리다이렉터(Open Redirect) 취약점 방지
    if (!targetUrl.startsWith('https://www.hscity.go.kr') && !targetUrl.startsWith('http://www.hscity.go.kr')) {
      return new NextResponse('Invalid target URL domain. Only 화성시청 (hscity.go.kr) URLs are allowed.', { status: 400 });
    }

    // HTML 브릿지 페이지
    // 1. HTTP 헤더와 Meta Tag를 통해 Referer를 no-referrer로 강제 설정하여 이전 유입 경로(localhost) 유출 방지
    // 2. window.location.replace를 사용하여 브라우저 히스토리 스택을 덮어씌움으로써 뒤로가기 시 무한 리다이렉트 루프 예방
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="referrer" content="no-referrer" />
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
    try {
      var target = decodeURIComponent("${encodeURIComponent(targetUrl)}");
      // 최종 검증 후 안전하게 replace
      if (target && (target.indexOf('https://www.hscity.go.kr') === 0 || target.indexOf('http://www.hscity.go.kr') === 0)) {
        window.location.replace(target);
      } else {
        document.body.innerHTML = "<p style='color:#ef4444; font-weight:bold;'>허용되지 않은 도메인으로의 이동이 차단되었습니다.</p>";
      }
    } catch (e) {
      document.body.innerHTML = "<p style='color:#ef4444; font-weight:bold;'>페이지 이동 처리 중 에러가 발생했습니다.</p>";
    }
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
