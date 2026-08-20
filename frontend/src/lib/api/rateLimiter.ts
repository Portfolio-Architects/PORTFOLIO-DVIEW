import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import type { Duration } from '@upstash/ratelimit';
import { rawRedis } from '@/lib/redis';
import { logger } from '@/lib/services/logger';
import { apiError } from './apiResponse';

export interface RateLimitCheckOptions {
  prefix?: string;
  requestsPerLimit?: number;
  window?: Duration;
  analytics?: boolean;
}

export interface RateLimitCheckResult {
  success: boolean;
  limit?: number;
  remaining?: number;
  reset?: number;
  response?: NextResponse;
}

// In-memory sliding window fallback when Upstash Redis is not available
const inMemoryCache = new Map<string, { count: number; resetTime: number }>();

function checkInMemoryRateLimit(
  key: string,
  limit: number = 60,
  windowMs: number = 60000
): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const entry = inMemoryCache.get(key);

  if (!entry || now > entry.resetTime) {
    inMemoryCache.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, reset: entry.resetTime };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count, reset: entry.resetTime };
}

/**
 * Extracts client IP address from NextRequest headers
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return realIp || forwarded?.split(',')[0]?.trim() || '127.0.0.1';
}

/**
 * Standardized rate limit checker for Next.js Route Handlers
 */
export async function checkRateLimit(
  request: NextRequest,
  options: RateLimitCheckOptions = {}
): Promise<RateLimitCheckResult> {
  const {
    prefix = 'api_rate_limit',
    requestsPerLimit = 60,
    window = '1 m',
    analytics = true,
  } = options;

  const clientIp = getClientIp(request);
  const identifier = `${prefix}:${clientIp}`;

  if (rawRedis) {
    try {
      const limiter = new Ratelimit({
        redis: rawRedis,
        limiter: Ratelimit.slidingWindow(requestsPerLimit, window),
        analytics,
      });

      const result = await limiter.limit(identifier);

      if (!result.success) {
        logger.warn('RateLimiter', `Rate limit exceeded for ${clientIp} (${prefix})`, {
          ip: clientIp,
          prefix,
          limit: result.limit,
          remaining: result.remaining,
        });

        const errorResponse = apiError(
          'RATE_LIMIT_EXCEEDED',
          'Too Many Requests',
          429,
          { reset: result.reset, limit: result.limit }
        );

        errorResponse.headers.set('X-RateLimit-Limit', String(result.limit));
        errorResponse.headers.set('X-RateLimit-Remaining', String(result.remaining));
        errorResponse.headers.set('X-RateLimit-Reset', String(result.reset));

        return {
          success: false,
          limit: result.limit,
          remaining: result.remaining,
          reset: result.reset,
          response: errorResponse,
        };
      }

      return {
        success: true,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
      };
    } catch (err) {
      logger.warn('RateLimiter', 'Upstash rate limiter threw an error, falling back to memory', {}, err);
    }
  }

  // Fallback to in-memory rate limiting
  const memoryResult = checkInMemoryRateLimit(identifier, requestsPerLimit, 60000);

  if (!memoryResult.success) {
    logger.warn('RateLimiter', `In-memory rate limit exceeded for ${clientIp} (${prefix})`, {
      ip: clientIp,
      prefix,
    });

    const errorResponse = apiError(
      'RATE_LIMIT_EXCEEDED',
      'Too Many Requests',
      429,
      { reset: memoryResult.reset, limit: requestsPerLimit }
    );

    errorResponse.headers.set('X-RateLimit-Limit', String(requestsPerLimit));
    errorResponse.headers.set('X-RateLimit-Remaining', String(memoryResult.remaining));
    errorResponse.headers.set('X-RateLimit-Reset', String(memoryResult.reset));

    return {
      success: false,
      limit: requestsPerLimit,
      remaining: 0,
      reset: memoryResult.reset,
      response: errorResponse,
    };
  }

  return {
    success: true,
    limit: requestsPerLimit,
    remaining: memoryResult.remaining,
    reset: memoryResult.reset,
  };
}
