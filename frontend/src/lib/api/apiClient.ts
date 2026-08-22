/**
 * @module apiClient
 * @description Typed Client API Adapter for HTTP requests with standard envelope handling,
 * error extraction, AbortSignal support, retry resilience, and timeout management.
 * Architecture Layer: Infrastructure / API Client (`src/lib/api/`)
 */

import { ApiResponse, ApiSuccessResponse, ApiErrorResponse } from '@/types/api';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  unwrapEnvelope?: boolean;
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly rawResponse?: unknown;
  public readonly isTimeout: boolean;
  public readonly isAborted: boolean;

  constructor(
    message: string,
    options?: {
      status?: number;
      code?: string;
      details?: unknown;
      rawResponse?: unknown;
      isTimeout?: boolean;
      isAborted?: boolean;
    }
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = options?.status ?? 500;
    this.code = options?.code;
    this.details = options?.details;
    this.rawResponse = options?.rawResponse;
    this.isTimeout = options?.isTimeout ?? false;
    this.isAborted = options?.isAborted ?? false;

    Object.setPrototypeOf(this, ApiClientError.prototype);
  }
}

function buildUrlWithParams(
  url: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string {
  if (!params || Object.keys(params).length === 0) {
    return url;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const queryString = searchParams.toString();
  if (!queryString) return url;

  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${queryString}`;
}

function isApiSuccessEnvelope<T>(obj: unknown): obj is ApiSuccessResponse<T> {
  return typeof obj === 'object' && obj !== null && (obj as Record<string, unknown>).success === true && 'data' in (obj as Record<string, unknown>);
}

function isApiErrorEnvelope(obj: unknown): obj is ApiErrorResponse {
  return typeof obj === 'object' && obj !== null && (obj as Record<string, unknown>).success === false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core API Client for typed HTTP operations
 */
export class ApiClient {
  private defaultTimeoutMs: number;

  constructor(defaultTimeoutMs: number = 10000) {
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  /**
   * Performs an HTTP request with timeout, cancellation, retry, and envelope handling
   */
  public async request<T = unknown>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const {
      params,
      body,
      headers: customHeaders,
      timeoutMs = this.defaultTimeoutMs,
      retries = 0,
      retryDelayMs = 500,
      unwrapEnvelope = false,
      signal: externalSignal,
      ...fetchOptions
    } = options;

    const targetUrl = buildUrlWithParams(url, params);

    const headers = new Headers(customHeaders || {});
    let serializedBody: BodyInit | null | undefined = undefined;

    if (body !== undefined && body !== null) {
      if (typeof body === 'string' || body instanceof Blob || body instanceof FormData || body instanceof URLSearchParams) {
        serializedBody = body;
      } else {
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
        serializedBody = JSON.stringify(body);
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        const waitTime = retryDelayMs * Math.pow(2, attempt - 1);
        await delay(waitTime);
      }

      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;
      let timedOut = false;

      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs);
      }

      // Chain external AbortSignal if provided
      if (externalSignal) {
        if (externalSignal.aborted) {
          controller.abort(externalSignal.reason);
        } else {
          externalSignal.addEventListener('abort', () => controller.abort(externalSignal.reason), { once: true });
        }
      }

      try {
        const response = await fetch(targetUrl, {
          ...fetchOptions,
          headers,
          body: serializedBody,
          signal: controller.signal,
        });

        // Determine response body parsing
        let data: unknown;
        const contentType = response.headers.get('content-type') || '';
        try {
          const rawText = await response.text();
          if (!rawText) {
            data = null;
          } else if (contentType.includes('application/json') || rawText.startsWith('{') || rawText.startsWith('[')) {
            try {
              data = JSON.parse(rawText);
            } catch {
              data = rawText;
            }
          } else {
            data = rawText;
          }
        } catch {
          data = null;
        }

        // Handle error response envelope or non-2xx status
        if (!response.ok || isApiErrorEnvelope(data)) {
          let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          let errorCode: string | undefined = undefined;
          let errorDetails: unknown = undefined;

          if (isApiErrorEnvelope(data)) {
            errorMessage = data.message || data.error || errorMessage;
            errorCode = data.code || data.error;
            errorDetails = data.details;
          } else if (typeof data === 'object' && data !== null) {
            const d = data as Record<string, unknown>;
            if (typeof d.error === 'string') errorMessage = d.error;
            else if (typeof d.message === 'string') errorMessage = d.message;
            if (typeof d.code === 'string') errorCode = d.code;
            if (d.details !== undefined) errorDetails = d.details;
          }

          const apiError = new ApiClientError(errorMessage, {
            status: response.status,
            code: errorCode,
            details: errorDetails,
            rawResponse: data,
          });

          // If retryable and attempts remain, retry on 5xx
          if (response.status >= 500 && attempt < retries) {
            lastError = apiError;
            continue;
          }

          throw apiError;
        }

        // Unpack envelope if requested and valid
        if (unwrapEnvelope && isApiSuccessEnvelope<T>(data)) {
          return data.data;
        }

        return data as T;
      } catch (err: unknown) {
        if (timeoutId) clearTimeout(timeoutId);

        if (timedOut) {
          throw new ApiClientError(`Request to ${targetUrl} timed out after ${timeoutMs}ms`, {
            status: 408,
            code: 'TIMEOUT',
            isTimeout: true,
          });
        }

        if (externalSignal?.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
          throw new ApiClientError(`Request to ${targetUrl} was aborted`, {
            status: 499,
            code: 'ABORTED',
            isAborted: true,
          });
        }

        if (err instanceof ApiClientError) {
          throw err;
        }

        const networkError = new ApiClientError(
          err instanceof Error ? err.message : `Failed to fetch from ${targetUrl}`,
          {
            status: 0,
            code: 'NETWORK_ERROR',
            details: err,
          }
        );

        if (attempt < retries) {
          lastError = networkError;
          continue;
        }

        throw networkError;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }

    throw lastError || new ApiClientError(`Request to ${targetUrl} failed`);
  }

  /**
   * HTTP GET
   */
  public get<T = unknown>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * HTTP POST
   */
  public post<T = unknown>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'POST', body });
  }

  /**
   * HTTP PUT
   */
  public put<T = unknown>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'PUT', body });
  }

  /**
   * HTTP PATCH
   */
  public patch<T = unknown>(url: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'PATCH', body });
  }

  /**
   * HTTP DELETE
   */
  public delete<T = unknown>(url: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * HTTP GET with standard ApiResponse envelope
   */
  public async getEnvelope<T = unknown>(
    url: string,
    options?: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    return this.request<ApiResponse<T>>(url, {
      ...options,
      method: 'GET',
      unwrapEnvelope: false,
    });
  }
}

/** Singleton instance for general client-side use */
export const apiClient = new ApiClient();
