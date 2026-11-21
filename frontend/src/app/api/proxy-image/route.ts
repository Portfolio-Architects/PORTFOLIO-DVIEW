import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';
import { checkRateLimit } from '@/lib/api/rateLimiter';
import {
  isForbiddenIpOrHost,
  validateProxyImageTargetUrl,
} from '@/lib/security/urlValidator';

export { isForbiddenIpOrHost, validateProxyImageTargetUrl };

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB hard cap

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
]);

async function readBoundedImageBytes(
  response: Response,
  maxBytes: number
): Promise<ArrayBuffer | null> {
  if (!response.body || typeof response.body.getReader !== 'function') {
    const fallbackBuf = await response.arrayBuffer();
    return fallbackBuf.byteLength > maxBytes ? null : fallbackBuf;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || value.byteLength === 0) continue;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel('Image payload exceeded MAX_IMAGE_BYTES').catch(() => undefined);
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const backing = new ArrayBuffer(totalBytes);
  const merged = new Uint8Array(backing);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return backing;
}

const ProxyImageParamsSchema = z.object({
  url: z.string().url().max(2048),
});

export async function GET(request: NextRequest) {
  const rateLimit = await checkRateLimit(request, {
    prefix: 'ratelimit_proxyimage_get',
    requestsPerLimit: 60,
  });
  if (!rateLimit.success) {
    logger.warn('ProxyImageAPI.GET', 'Rate limit exceeded');
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  const urlParam = request.nextUrl.searchParams.get('url');
  const parsed = ProxyImageParamsSchema.safeParse({ url: urlParam });

  if (!parsed.success) {
    logger.warn('ProxyImageAPI.GET', 'Invalid or missing url parameter', {
      errors: parsed.error.format(),
    });
    return new NextResponse('Invalid or missing url parameter', { status: 400 });
  }

  const targetCheck = validateProxyImageTargetUrl(parsed.data.url);
  if (!targetCheck.valid || !targetCheck.normalizedUrl) {
    logger.warn('ProxyImageAPI.GET', 'Blocked disallowed proxy-image URL', {
      reason: targetCheck.reason,
    });
    return new NextResponse(`Forbidden image target: ${targetCheck.reason}`, { status: 403 });
  }

  const safeUrl = targetCheck.normalizedUrl;

  try {
    const response = await fetch(safeUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      logger.warn('ProxyImageAPI.GET', 'Failed to fetch remote image', {
        url: safeUrl,
        statusText: response.statusText,
        status: response.status,
      });
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, {
        status: response.status,
      });
    }

    const rawContentType = (response.headers.get('content-type') || '')
      .split(';')[0]
      .trim()
      .toLowerCase();
    if (!ALLOWED_IMAGE_MIME_TYPES.has(rawContentType)) {
      logger.warn('ProxyImageAPI.GET', 'Blocked non-raster image Content-Type', {
        url: safeUrl,
        contentType: rawContentType,
      });
      return new NextResponse('Unsupported Media Type', { status: 415 });
    }

    const declaredLength = Number(response.headers.get('content-length') || '0');
    if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) {
      await response.body?.cancel('Declared Content-Length exceeded MAX_IMAGE_BYTES').catch(() => undefined);
      return new NextResponse('Image Payload Too Large', { status: 413 });
    }

    const arrayBuffer = await readBoundedImageBytes(response, MAX_IMAGE_BYTES);
    if (!arrayBuffer) {
      return new NextResponse('Image Payload Too Large', { status: 413 });
    }

    logger.info('ProxyImageAPI.GET', 'Successfully proxied image', {
      url: safeUrl,
      contentType: rawContentType,
    });
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': rawContentType === 'image/jpg' ? 'image/jpeg' : rawContentType,
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
      },
    });
  } catch (error) {
    logger.error('ProxyImageAPI.GET', 'Image proxy error', { url: safeUrl }, error as Error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
