import { logger } from '@/lib/services/logger';

export interface ResilientFetchOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  backoffFactor?: number;
  retryCondition?: (response: Response | null, error: Error | null) => boolean;
  onRetry?: (attempt: number, error: Error | null, delayMs: number) => void;
}

/**
 * Default retry condition: retries on network/timeout errors or 5xx server errors
 */
function defaultRetryCondition(response: Response | null, error: Error | null): boolean {
  if (error) {
    return true;
  }
  if (response && response.status >= 500) {
    return true;
  }
  return false;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resilient Fetch wrapper with configurable timeout, exponential backoff retries, and logging
 */
export async function resilientFetch(
  url: string | URL,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const {
    timeoutMs = 5000,
    retries = 2,
    retryDelayMs = 500,
    backoffFactor = 2,
    retryCondition = defaultRetryCondition,
    onRetry,
    signal,
    ...fetchInit
  } = options;

  const targetUrl = url.toString();
  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      const computedDelay = retryDelayMs * Math.pow(backoffFactor, attempt - 1);
      const jitter = Math.floor(Math.random() * 50);
      const waitTime = computedDelay + jitter;

      if (onRetry) {
        onRetry(attempt, lastError, waitTime);
      } else {
        logger.warn('resilientFetch', `Retrying request (${attempt}/${retries}) to ${targetUrl}`, {
          attempt,
          waitTime,
          error: lastError?.message,
          status: lastResponse?.status,
        });
      }

      await delay(waitTime);
    }

    const controller = new AbortController();
    let timeoutId: NodeJS.Timeout | null = null;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    }

    // Merge external abort signal if provided
    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason);
      } else {
        signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
      }
    }

    try {
      const response = await fetch(targetUrl, {
        ...fetchInit,
        signal: controller.signal,
      });

      lastResponse = response;
      lastError = null;

      if (!response.ok && retryCondition(response, null) && attempt < retries) {
        continue;
      }

      return response;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;
      lastResponse = null;

      if (retryCondition(null, error) && attempt < retries) {
        continue;
      }

      throw error;
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError || new Error(`Failed to fetch from ${targetUrl}`);
}

/**
 * Helper to fetch and parse JSON with resilient retries
 */
export async function resilientFetchJson<T>(
  url: string | URL,
  options: ResilientFetchOptions = {}
): Promise<T> {
  const res = await resilientFetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Helper to fetch and return text with resilient retries
 */
export async function resilientFetchText(
  url: string | URL,
  options: ResilientFetchOptions = {}
): Promise<string> {
  const res = await resilientFetch(url, options);
  if (!res.ok) {
    throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
  }
  return res.text();
}
