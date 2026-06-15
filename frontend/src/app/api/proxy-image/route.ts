import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/services/logger';

const ProxyImageParamsSchema = z.object({
  url: z.string().url(),
});

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get('url');
  const parsed = ProxyImageParamsSchema.safeParse({ url: urlParam });

  if (!parsed.success) {
    logger.warn('ProxyImageAPI.GET', 'Invalid or missing url parameter', { errors: parsed.error.format() });
    return new NextResponse('Invalid or missing url parameter', { status: 400 });
  }

  const { url } = parsed.data;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      logger.warn('ProxyImageAPI.GET', 'Failed to fetch remote image', { url, statusText: response.statusText, status: response.status });
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();

    logger.info('ProxyImageAPI.GET', 'Successfully proxied image', { url, contentType });
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    logger.error('ProxyImageAPI.GET', 'Image proxy error', { url }, error as Error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

