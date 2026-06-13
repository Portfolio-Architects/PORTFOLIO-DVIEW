import { Redis } from "@upstash/redis";
import { z } from "zod";
import { logger } from "@/lib/services/logger";

/**
 * Simple in-memory fallback cache when Redis is unavailable or timeouts occur.
 */
class MemoryCacheFallback {
  private cache = new Map<string, { value: any; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: any, options?: { ex?: number; px?: number }): Promise<string> {
    let ttlMs = 24 * 60 * 60 * 1000; // default 1 day TTL
    if (options?.ex) ttlMs = options.ex * 1000;
    if (options?.px) ttlMs = options.px;

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
    return "OK";
  }

  async incr(key: string): Promise<number> {
    const current = (await this.get<number>(key)) || 0;
    const nextVal = current + 1;
    await this.set(key, nextVal);
    return nextVal;
  }

  async del(...keys: string[]): Promise<number> {
    let deletedCount = 0;
    keys.forEach((key) => {
      if (this.cache.has(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    });
    return deletedCount;
  }

  async hgetall<T extends Record<string, any>>(key: string): Promise<T | null> {
    return this.get<T>(key);
  }

  async hset(key: string, value: Record<string, any>): Promise<number> {
    const current = (await this.get<Record<string, any>>(key)) || {};
    const nextVal = { ...current, ...value };
    await this.set(key, nextVal);
    return Object.keys(value).length;
  }
}

/**
 * Resilient Redis Wrapper that catches exceptions and fallbacks to localized in-memory cache.
 */
export class ResilientRedisWrapper {
  private client: Redis | null;
  private fallback: MemoryCacheFallback;

  constructor(client: Redis | null) {
    this.client = client;
    this.fallback = new MemoryCacheFallback();
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return this.fallback.get<T>(key);
    try {
      return await this.client.get<T>(key);
    } catch (e) {
      logger.warn("ResilientRedis.get", "Upstash Redis get failed, falling back to Memory Cache", { key }, e);
      return this.fallback.get<T>(key);
    }
  }

  async set(key: string, value: any, options?: any): Promise<any> {
    if (!this.client) return this.fallback.set(key, value, options);
    try {
      return await this.client.set(key, value, options);
    } catch (e) {
      logger.warn("ResilientRedis.set", "Upstash Redis set failed, falling back to Memory Cache", { key }, e);
      return this.fallback.set(key, value, options);
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.client) return this.fallback.incr(key);
    try {
      return await this.client.incr(key);
    } catch (e) {
      logger.warn("ResilientRedis.incr", "Upstash Redis incr failed, falling back to Memory Cache", { key }, e);
      return this.fallback.incr(key);
    }
  }

  async del(...keys: string[]): Promise<number> {
    if (!this.client) return this.fallback.del(...keys);
    try {
      return await this.client.del(...keys);
    } catch (e) {
      logger.warn("ResilientRedis.del", "Upstash Redis del failed, falling back to Memory Cache", { keys }, e);
      return this.fallback.del(...keys);
    }
  }

  async hgetall<T extends Record<string, any>>(key: string): Promise<T | null> {
    if (!this.client) return this.fallback.hgetall<T>(key);
    try {
      return await this.client.hgetall<T>(key);
    } catch (e) {
      logger.warn("ResilientRedis.hgetall", "Upstash Redis hgetall failed, falling back to Memory Cache", { key }, e);
      return this.fallback.hgetall<T>(key);
    }
  }

  async hset(key: string, value: Record<string, any>): Promise<any> {
    if (!this.client) return this.fallback.hset(key, value);
    try {
      return await this.client.hset(key, value);
    } catch (e) {
      logger.warn("ResilientRedis.hset", "Upstash Redis hset failed, falling back to Memory Cache", { key }, e);
      return this.fallback.hset(key, value);
    }
  }
}

const RedisEnvSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url("Invalid Redis URL format"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "Redis Token cannot be empty"),
  NEXT_PHASE: z.string().optional(),
});

function initRedis(): Redis | null {
  const envParse = RedisEnvSchema.safeParse({
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    NEXT_PHASE: process.env.NEXT_PHASE,
  });

  if (!envParse.success) {
    logger.warn(
      "RedisConnection.init",
      "Redis environment variables validation failed, falling back to Memory Cache",
      { errors: envParse.error.format() }
    );
    return null;
  }

  const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, NEXT_PHASE } = envParse.data;

  if (NEXT_PHASE === "phase-production-build") {
    logger.info("RedisConnection.init", "Skipping Redis initialization during production build phase");
    return null;
  }

  try {
    return new Redis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    logger.error("RedisConnection.init", "Failed to create Redis client instance", {}, e as Error);
    return null;
  }
}

export const rawRedis = initRedis();

// Cast to Redis type to support all extended methods (evalsha, etc.) without compiler errors
export const redis = new ResilientRedisWrapper(rawRedis) as unknown as Redis;
