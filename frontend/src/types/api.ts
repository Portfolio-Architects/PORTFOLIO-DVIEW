/**
 * @module api
 * @description Standard API response envelopes and network contract interfaces.
 * Architecture Layer: Domain & Types (zero dependencies, zero logic)
 */

/** Unified API success envelope */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  source?: string;
  message?: string;
  meta?: {
    timestamp: number;
    path?: string;
    durationMs?: number;
    [key: string]: unknown;
  };
}

/** Unified API error envelope */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  message?: string;
  details?: unknown;
  meta?: {
    timestamp: number;
    path?: string;
    durationMs?: number;
    [key: string]: unknown;
  };
}

/** Standard API response union */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/** Rate limit configuration options */
export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  keyPrefix?: string;
}

/** Rate limit check result */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
  response?: unknown;
}

/** Redis cache wrapper envelope */
export interface RedisCacheEnvelope<T = unknown> {
  data: T;
  timestamp: number;
  ttl?: number;
  source?: string;
}
