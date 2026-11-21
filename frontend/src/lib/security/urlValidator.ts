import { isForbiddenIpOrHost } from './pushEndpointPolicy.cjs';

export { isForbiddenIpOrHost };

export const ALLOWED_IMAGE_HOST_SUFFIXES = [
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'googleusercontent.com',
  'maps.googleapis.com',
  'maps.gstatic.com',
  'kakaocdn.net',
  'dongtanview.com',
  'dview.kr',
] as const;

const CSS_URL_UNSAFE_PATTERN = /[()"'\\;{}\s\u0000-\u001F\u007F]/;

/**
 * Multi-layer SSRF guard for server-side image fetches (`/api/proxy-image` and `/api/og` `bgUrl`).
 * Enforces HTTPS-only, standard port 443, zero embedded credentials, no private/metadata IPs,
 * explicit trusted image host whitelist, and blocks self-recursive `/api/*` paths.
 */
export function validateProxyImageTargetUrl(rawUrl: string): {
  valid: boolean;
  reason?: string;
  normalizedUrl?: string;
} {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  if (parsedUrl.protocol !== 'https:') {
    return { valid: false, reason: 'Only HTTPS image URLs are allowed' };
  }

  if (parsedUrl.username || parsedUrl.password) {
    return { valid: false, reason: 'URL credentials are forbidden' };
  }

  if (parsedUrl.port && parsedUrl.port !== '443') {
    return { valid: false, reason: 'Non-standard HTTPS ports are forbidden' };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (isForbiddenIpOrHost(hostname)) {
    return { valid: false, reason: 'Private, loopback, or metadata hosts are forbidden' };
  }

  const isWhitelistedDomain = ALLOWED_IMAGE_HOST_SUFFIXES.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
  if (!isWhitelistedDomain) {
    return { valid: false, reason: 'Image host is not in the allowed domain whitelist' };
  }

  const isSelfDomain =
    hostname === 'dongtanview.com' ||
    hostname.endsWith('.dongtanview.com') ||
    hostname === 'dview.kr' ||
    hostname.endsWith('.dview.kr');
  if (isSelfDomain) {
    let decodedPath = parsedUrl.pathname;
    try {
      for (let i = 0; i < 2; i++) {
        const next = decodeURIComponent(decodedPath);
        if (next === decodedPath) break;
        decodedPath = next;
      }
    } catch {
      return { valid: false, reason: 'Malformed percent-encoding in internal path' };
    }
    const normalizedPath = decodedPath.replace(/\\+/g, '/').replace(/\/+/g, '/').toLowerCase();
    if (
      normalizedPath === '/api' ||
      normalizedPath.startsWith('/api/') ||
      normalizedPath.includes('/../') ||
      normalizedPath.endsWith('/..')
    ) {
      return { valid: false, reason: 'Proxying internal API endpoints is forbidden' };
    }
  }

  return { valid: true, normalizedUrl: parsedUrl.toString() };
}

/**
 * Validates and sanitizes an optional OG background image URL before inserting it
 * into a CSS `url(...)` property inside Satori `ImageResponse`.
 * Returns `null` if the URL fails SSRF validation or contains CSS-breaking characters.
 */
export function sanitizeOgBackgroundUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  if (CSS_URL_UNSAFE_PATTERN.test(trimmed)) return null;

  const verdict = validateProxyImageTargetUrl(trimmed);
  if (!verdict.valid || !verdict.normalizedUrl) return null;
  if (CSS_URL_UNSAFE_PATTERN.test(verdict.normalizedUrl)) return null;

  return verdict.normalizedUrl;
}
