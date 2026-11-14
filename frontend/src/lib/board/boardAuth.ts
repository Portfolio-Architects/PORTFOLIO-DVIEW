import crypto from 'crypto';
import { NextRequest } from 'next/server';

export const AUTHOR_TOKEN_COOKIE_NAME = 'dview_author_token';
export const AUTHOR_TOKEN_HEADER_NAME = 'x-author-token';
export const AUTHOR_TOKEN_HEADER_ALT = 'x-dview-author-token';

function safeDecodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/**
 * 256비트 암호학적 난수 작성자 토큰 생성
 */
export function generateAuthorToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * 작성자 토큰 단방향 SHA-256 해시 함수
 */
export function hashAuthorToken(token: string): string {
  if (!token || typeof token !== 'string') {
    throw new Error('Valid author token string is required for hashing');
  }
  const trimmed = token.trim();
  if (!trimmed) {
    throw new Error('Valid author token string is required for hashing');
  }
  return crypto.createHash('sha256').update(trimmed).digest('hex');
}

/**
 * 요청(NextRequest, Request, 또는 헤더/쿠키 객체)으로부터 작성자 토큰 추출
 * 우선순위:
 * 1. x-author-token / x-dview-author-token 헤더
 * 2. dview_author_token 쿠키
 * 3. 요청 본문(body)에 포함된 authorToken
 */
export function extractAuthorToken(
  request: NextRequest | Request,
  bodyToken?: string | null
): string | null {
  // 1. Check custom headers
  const headerToken =
    request.headers.get(AUTHOR_TOKEN_HEADER_NAME) ||
    request.headers.get(AUTHOR_TOKEN_HEADER_ALT);

  if (headerToken && headerToken.trim().length > 0) {
    return headerToken.trim();
  }

  // 2. Check NextRequest cookies or standard Cookie header
  if ('cookies' in request && typeof request.cookies?.get === 'function') {
    try {
      const cookieVal = request.cookies.get(AUTHOR_TOKEN_COOKIE_NAME)?.value;
      if (cookieVal && cookieVal.trim().length > 0) {
        return cookieVal.trim();
      }
    } catch {
      // Fall through to raw Cookie header parsing
    }
  }

  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith(`${AUTHOR_TOKEN_COOKIE_NAME}=`)) {
        const val = cookie.substring(`${AUTHOR_TOKEN_COOKIE_NAME}=`.length).trim();
        if (val) {
          const decoded = safeDecodeCookieValue(val).trim();
          if (decoded) return decoded;
        }
      }
    }
  }

  // 3. Check body token fallback
  if (bodyToken && typeof bodyToken === 'string' && bodyToken.trim().length > 0) {
    return bodyToken.trim();
  }

  return null;
}

/**
 * 토큰 조회 및 부재 시 신규 발급 헬퍼
 */
export function getOrCreateAuthorToken(
  request: NextRequest | Request,
  bodyToken?: string | null
): { token: string; isNew: boolean } {
  const existing = extractAuthorToken(request, bodyToken);
  if (existing) {
    return { token: existing, isNew: false };
  }
  return { token: generateAuthorToken(), isNew: true };
}

/**
 * 작성자 본인 여부 확인 (상수 시간 SHA-256 다이제스트 비교)
 */
export function canDelete(
  authorTokenHash: string | null | undefined,
  item: { authorTokenHash: string } | null | undefined
): boolean {
  if (!authorTokenHash || !item || !item.authorTokenHash) {
    return false;
  }
  const a = Buffer.from(authorTokenHash, 'utf8');
  const b = Buffer.from(item.authorTokenHash, 'utf8');
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}
