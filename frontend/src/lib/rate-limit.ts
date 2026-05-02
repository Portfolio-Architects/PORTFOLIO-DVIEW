import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

/**
 * Shared Rate Limiter instance using Upstash Redis.
 * Allows 60 requests per minute per IP.
 */
export const rateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
    })
  : null;
