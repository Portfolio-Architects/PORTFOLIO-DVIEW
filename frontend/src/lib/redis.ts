import { Redis } from "@upstash/redis";
import { z } from "zod";
import { logger } from "@/lib/services/logger";
import { serverLruCache } from "@/lib/utils/server/lruCache";

export interface ResilientPipeline {
  get(key: string): this;
  set(key: string, value: unknown, options?: { ex?: number; px?: number }): this;
  hgetall(key: string): this;
  hset(key: string, value: Record<string, unknown>): this;
  hmset(key: string, value: Record<string, unknown>): this;
  exec(): Promise<unknown[]>;
}

/**
 * Simple in-memory fallback cache when Redis is unavailable or timeouts occur.
 */
class MemoryCacheFallback {
  private cache = new Map<string, { value: unknown; expiry: number }>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  async set(key: string, value: unknown, options?: { ex?: number; px?: number }): Promise<string> {
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

  async hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null> {
    return this.get<T>(key);
  }

  async hset(key: string, value: Record<string, unknown>): Promise<number> {
    const current = (await this.get<Record<string, unknown>>(key)) || {};
    const nextVal = { ...current, ...value };
    await this.set(key, nextVal);
    return Object.keys(value).length;
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    const current = (await this.get<Record<string, number>>(key)) || {};
    const val = (current[field] || 0) + increment;
    current[field] = val;
    await this.set(key, current);
    return val;
  }
}

const REDIS_TIMEOUT_MS = 1500;

function withTimeout<T>(promise: Promise<T>, ms: number = REDIS_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Upstash Redis operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([
    promise.then((val) => {
      clearTimeout(timeoutId);
      return val;
    }).catch((err) => {
      clearTimeout(timeoutId);
      throw err;
    }),
    timeoutPromise
  ]);
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
    try {
      const cached = serverLruCache.get(key);
      if (cached !== null && cached !== undefined) {
        return cached as T;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.get.L1", "L1 cache read failed", { key, error: msg });
    }

    if (!this.client) return this.fallback.get<T>(key);
    try {
      const val = await withTimeout(this.client.get<T>(key));
      if (val !== null && val !== undefined) {
        serverLruCache.set(key, val, 10000);
      }
      return val;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.get", "Upstash Redis get failed or timed out, falling back to Memory Cache", { key, error: msg });
      return this.fallback.get<T>(key);
    }
  }

  async set(
    key: string, 
    value: unknown, 
    options?: { ex?: number; px?: number; nx?: boolean; xx?: boolean }
  ): Promise<string | null> {
    try {
      serverLruCache.delete(key);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.set.L1", "L1 cache delete failed", { key, error: msg });
    }

    if (!this.client) return this.fallback.set(key, value, options);
    try {
      const res = await withTimeout(this.client.set(key, value as any, options as any));
      serverLruCache.set(key, value, 10000);
      return res as string | null;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.set", "Upstash Redis set failed or timed out, falling back to Memory Cache", { key, error: msg });
      return this.fallback.set(key, value, options);
    }
  }

  async incr(key: string): Promise<number> {
    try {
      serverLruCache.delete(key);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.incr.L1", "L1 cache delete failed", { key, error: msg });
    }

    if (!this.client) return this.fallback.incr(key);
    try {
      return await withTimeout(this.client.incr(key));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.incr", "Upstash Redis incr failed or timed out, falling back to Memory Cache", { key, error: msg });
      return this.fallback.incr(key);
    }
  }

  async del(...keys: string[]): Promise<number> {
    try {
      keys.forEach((k) => serverLruCache.delete(k));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.del.L1", "L1 cache delete failed", { keys, error: msg });
    }

    if (!this.client) return this.fallback.del(...keys);
    try {
      return await withTimeout(this.client.del(...keys));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.del", "Upstash Redis del failed or timed out, falling back to Memory Cache", { keys, error: msg });
      return this.fallback.del(...keys);
    }
  }

  async hgetall<T extends Record<string, unknown>>(key: string): Promise<T | null> {
    try {
      const cached = serverLruCache.get(key);
      if (cached !== null && cached !== undefined) {
        return cached as T;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.hgetall.L1", "L1 cache read failed", { key, error: msg });
    }

    if (!this.client) return this.fallback.hgetall<T>(key);
    try {
      const val = await withTimeout(this.client.hgetall<T>(key));
      if (val !== null && val !== undefined) {
        serverLruCache.set(key, val, 10000);
      }
      return val;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.hgetall", "Upstash Redis hgetall failed or timed out, falling back to Memory Cache", { key, error: msg });
      return this.fallback.hgetall<T>(key);
    }
  }

  async hset(key: string, value: Record<string, unknown>): Promise<number> {
    try {
      serverLruCache.delete(key);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.hset.L1", "L1 cache delete failed", { key, error: msg });
    }

    if (!this.client) return this.fallback.hset(key, value);
    try {
      return await withTimeout(this.client.hset(key, value));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.hset", "Upstash Redis hset failed or timed out, falling back to Memory Cache", { key, error: msg });
      return this.fallback.hset(key, value);
    }
  }

  async hincrby(key: string, field: string, increment: number): Promise<number> {
    try {
      serverLruCache.delete(key);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.hincrby.L1", "L1 cache delete failed", { key, error: msg });
    }

    if (!this.client) return this.fallback.hincrby(key, field, increment);
    try {
      return await withTimeout(this.client.hincrby(key, field, increment));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn("ResilientRedis.hincrby", "Upstash Redis hincrby failed or timed out, falling back to Memory Cache", { key, field, error: msg });
      return this.fallback.hincrby(key, field, increment);
    }
  }

  async hmset(key: string, value: Record<string, unknown>): Promise<number> {
    return this.hset(key, value);
  }

  pipeline(): ResilientPipeline {
    if (this.client) {
      try {
        const rawPipeline = this.client.pipeline();
        const originalExec = rawPipeline.exec.bind(rawPipeline);
        
        (rawPipeline as unknown as { exec: () => Promise<unknown[]> }).exec = async () => {
          try {
            return await withTimeout(originalExec(), REDIS_TIMEOUT_MS);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn(
              "ResilientRedis.pipeline.exec",
              "Upstash Redis pipeline execution failed or timed out, returning null fallbacks",
              { error: msg }
            );
            return [null, null, null, null, null, null, null, null, null, null] as unknown[];
          }
        };
        return rawPipeline;
      } catch (e) {
        logger.warn("ResilientRedis.pipeline", "Upstash Redis pipeline creation failed, falling back to mock", {}, e);
      }
    }
    // Fallback Mock Pipeline
    const commands: (() => Promise<unknown>)[] = [];
    const mockPipeline = {
      get: (key: string) => {
        commands.push(() => this.get(key));
        return mockPipeline;
      },
      set: (key: string, value: unknown, options?: { ex?: number; px?: number }) => {
        commands.push(() => this.set(key, value, options));
        return mockPipeline;
      },
      hgetall: (key: string) => {
        commands.push(() => this.hgetall(key));
        return mockPipeline;
      },
      hset: (key: string, value: Record<string, unknown>) => {
        commands.push(() => this.hset(key, value));
        return mockPipeline;
      },
      hmset: (key: string, value: Record<string, unknown>) => {
        commands.push(() => this.hmset(key, value));
        return mockPipeline;
      },
      exec: async () => {
        return await Promise.all(commands.map(cmd => cmd().catch(() => null)));
      }
    };
    return mockPipeline;
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
