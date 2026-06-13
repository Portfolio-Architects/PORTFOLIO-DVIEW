import { Ratelimit } from "@upstash/ratelimit";
import { rawRedis } from "./redis";
import { logger } from "@/lib/services/logger";
import { z } from 'zod';

export const RateLimitConfigSchema = z.object({
  requestsPerLimit: z.number().int().positive().default(60),
  window: z.string().default("1 m"),
  analytics: z.boolean().default(true),
});

const rawConfig = {
  requestsPerLimit: process.env.RATE_LIMIT_MAX_REQUESTS ? Number(process.env.RATE_LIMIT_MAX_REQUESTS) : 60,
  window: process.env.RATE_LIMIT_WINDOW || "1 m",
  analytics: process.env.RATE_LIMIT_ANALYTICS !== 'false',
};

const parsed = RateLimitConfigSchema.safeParse(rawConfig);
const config = parsed.success ? parsed.data : {
  requestsPerLimit: 60,
  window: "1 m",
  analytics: true,
};

if (!parsed.success) {
  logger.warn('RateLimit', 'Failed to validate rate limit config, falling back to defaults.', {}, parsed.error);
}

/**
 * Shared Rate Limiter instance using Upstash Redis.
 * Allows 60 requests per minute per IP (by default).
 */
export const rateLimiter = rawRedis
  ? new Ratelimit({
      redis: rawRedis,
      limiter: Ratelimit.slidingWindow(config.requestsPerLimit, config.window as any),
      analytics: config.analytics,
    })
  : null;
