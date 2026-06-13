import { Ratelimit } from "@upstash/ratelimit";
import { rawRedis } from "./redis";

/**
 * Shared Rate Limiter instance using Upstash Redis.
 * Allows 60 requests per minute per IP.
 */
export const rateLimiter = rawRedis
  ? new Ratelimit({
      redis: rawRedis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
    })
  : null;
