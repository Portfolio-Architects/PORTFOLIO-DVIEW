import { NextRequest } from 'next/server';
import { apiSuccess, apiError } from '../apiResponse';
import { checkRateLimit, getClientIp } from '../rateLimiter';
import { resilientFetch, resilientFetchJson, resilientFetchText } from '../resilientFetch';

describe('Empirical Standardization Challenge Suite', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  // ==========================================
  // 1. apiSuccess Edge Cases
  // ==========================================
  describe('apiSuccess Edge Cases', () => {
    it('handles null, undefined, boolean, and numeric data payloads correctly', async () => {
      const nullRes = apiSuccess(null);
      expect(nullRes.status).toBe(200);
      expect(await nullRes.json()).toEqual({ success: true, data: null });

      const falseRes = apiSuccess(false);
      expect((await falseRes.json()).data).toBe(false);

      const zeroRes = apiSuccess(0);
      expect((await zeroRes.json()).data).toBe(0);

      const emptyStrRes = apiSuccess('');
      expect((await emptyStrRes.json()).data).toBe('');

      const arrayRes = apiSuccess([1, 'a', { nested: true }]);
      expect((await arrayRes.json()).data).toEqual([1, 'a', { nested: true }]);
    });

    it('merges metadata without corrupting core properties unless meta specifies them', async () => {
      const res = apiSuccess({ count: 10 }, {
        timestamp: '2026-08-20T00:00:00Z',
        source: 'redis_cache',
        cached: true,
        page: 1,
        limit: 50,
      }, {
        status: 201,
        headers: {
          'Cache-Control': 'public, max-age=60',
          'X-Custom-Trace': 'trace-123',
        },
      });

      expect(res.status).toBe(201);
      expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
      expect(res.headers.get('X-Custom-Trace')).toBe('trace-123');

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toEqual({ count: 10 });
      expect(json.source).toBe('redis_cache');
      expect(json.cached).toBe(true);
      expect(json.page).toBe(1);
      expect(json.limit).toBe(50);
      expect(json.timestamp).toBe('2026-08-20T00:00:00Z');
    });
  });

  // ==========================================
  // 2. apiError Edge Cases
  // ==========================================
  describe('apiError Edge Cases', () => {
    it('handles all standard HTTP error statuses and default message fallback', async () => {
      const statusCodes = [400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504];

      for (const status of statusCodes) {
        const res = apiError(`ERR_${status}`, undefined, status);
        expect(res.status).toBe(status);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toBe(`ERR_${status}`);
        expect(json.code).toBe(`ERR_${status}`);
        expect(json.message).toBe(`ERR_${status}`);
      }
    });

    it('handles diverse details structures: string, object, array, null, undefined', async () => {
      // String details
      const resStr = apiError('INVALID', 'Msg', 400, 'Detailed string');
      expect((await resStr.json()).details).toBe('Detailed string');

      // Object details
      const resObj = apiError('INVALID', 'Msg', 400, { field: 'email', reason: 'bad format' });
      expect((await resObj.json()).details).toEqual({ field: 'email', reason: 'bad format' });

      // Array details
      const resArr = apiError('INVALID', 'Msg', 400, ['err1', 'err2']);
      expect((await resArr.json()).details).toEqual(['err1', 'err2']);

      // Null details (key should exist as null)
      const resNull = apiError('INVALID', 'Msg', 400, null);
      const jsonNull = await resNull.json();
      expect(jsonNull.details).toBeNull();

      // Undefined details (key should NOT be in json)
      const resUndef = apiError('INVALID', 'Msg', 400, undefined);
      const jsonUndef = await resUndef.json();
      expect('details' in jsonUndef).toBe(false);
    });

    it('allows init options to override status and append headers', async () => {
      const res = apiError('RATE_LIMITED', 'Slow down', 400, null, {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Reset': '1787238500',
        },
      });

      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBe('60');
      expect(res.headers.get('X-RateLimit-Reset')).toBe('1787238500');
    });
  });

  // ==========================================
  // 3. rateLimiter & IP Edge Cases
  // ==========================================
  describe('rateLimiter & IP Edge Cases', () => {
    it('getClientIp resolves complex forwarded headers, trimming and falling back correctly', () => {
      // Multiple proxies in X-Forwarded-For
      const req1 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '  203.0.113.195 , 198.51.100.1, 10.0.0.1  ' },
      });
      expect(getClientIp(req1)).toBe('203.0.113.195');

      // X-Real-IP takes precedence over X-Forwarded-For
      const req2 = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-real-ip': '198.51.100.42',
          'x-forwarded-for': '203.0.113.195',
        },
      });
      expect(getClientIp(req2)).toBe('198.51.100.42');

      // Empty string / missing headers fallback
      const req3 = new NextRequest('http://localhost/api/test');
      expect(getClientIp(req3)).toBe('127.0.0.1');
    });

    it('handles concurrent bursts accurately in in-memory mode', async () => {
      const prefix = `burst_test_${Date.now()}_${Math.random()}`;
      const ip = '192.168.1.100';
      const limit = 5;

      const req = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': ip },
      });

      // Fire 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        checkRateLimit(req, { prefix, requestsPerLimit: limit })
      );

      const results = await Promise.all(promises);
      const passed = results.filter((r) => r.success);
      const blocked = results.filter((r) => !r.success);

      expect(passed.length).toBe(5);
      expect(blocked.length).toBe(5);

      for (const b of blocked) {
        expect(b.remaining).toBe(0);
        expect(b.response?.status).toBe(429);
      }
    });

    it('isolates rate limits per IP and per prefix', async () => {
      const prefixA = `iso_A_${Date.now()}`;
      const prefixB = `iso_B_${Date.now()}`;

      const reqIp1 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': '10.0.0.1' },
      });
      const reqIp2 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': '10.0.0.2' },
      });

      // Consume all 2 slots for IP1 on prefixA
      await checkRateLimit(reqIp1, { prefix: prefixA, requestsPerLimit: 2 });
      await checkRateLimit(reqIp1, { prefix: prefixA, requestsPerLimit: 2 });
      const blockedIp1 = await checkRateLimit(reqIp1, { prefix: prefixA, requestsPerLimit: 2 });
      expect(blockedIp1.success).toBe(false);

      // IP2 on prefixA should still have full quota
      const allowedIp2 = await checkRateLimit(reqIp2, { prefix: prefixA, requestsPerLimit: 2 });
      expect(allowedIp2.success).toBe(true);
      expect(allowedIp2.remaining).toBe(1);

      // IP1 on prefixB should also be independent and succeed
      const allowedIp1PrefixB = await checkRateLimit(reqIp1, { prefix: prefixB, requestsPerLimit: 2 });
      expect(allowedIp1PrefixB.success).toBe(true);
      expect(allowedIp1PrefixB.remaining).toBe(1);
    });
  });

  // ==========================================
  // 4. resilientFetch Edge Cases
  // ==========================================
  describe('resilientFetch Edge Cases', () => {
    it('does not retry 4xx errors by default (400, 401, 403, 404) and returns Response immediately', async () => {
      const clientErrors = [400, 401, 403, 404];

      for (const status of clientErrors) {
        global.fetch = jest.fn().mockResolvedValue(
          new Response(`Client Error ${status}`, { status, statusText: `Err ${status}` })
        );

        const onRetry = jest.fn();
        const res = await resilientFetch('https://api.example.com/client-error', {
          retries: 3,
          retryDelayMs: 10,
          onRetry,
        });

        expect(res.status).toBe(status);
        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(onRetry).not.toHaveBeenCalled();
      }
    });

    it('retries 4xx when custom retryCondition is supplied (e.g. for 429 Too Many Requests)', async () => {
      const rateLimitRes = new Response('Too Many Requests', { status: 429 });
      const successRes = new Response(JSON.stringify({ ok: true }), { status: 200 });

      global.fetch = jest.fn()
        .mockResolvedValueOnce(rateLimitRes)
        .mockResolvedValueOnce(rateLimitRes)
        .mockResolvedValueOnce(successRes);

      const onRetry = jest.fn();
      const res = await resilientFetch('https://api.example.com/rate-limited-endpoint', {
        retries: 3,
        retryDelayMs: 10,
        retryCondition: (response) => response?.status === 429,
        onRetry,
      });

      expect(res.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('retries on 500, 502, 503, 504 server errors and exhausts returning the final response', async () => {
      const error503 = new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });

      global.fetch = jest.fn().mockResolvedValue(error503);

      const onRetry = jest.fn();
      const res = await resilientFetch('https://api.example.com/unavailable', {
        retries: 2,
        retryDelayMs: 10,
        onRetry,
      });

      expect(res.status).toBe(503);
      expect(global.fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('handles network timeouts and retries, throwing if all timeout attempts fail', async () => {
      global.fetch = jest.fn().mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new Error('The operation was aborted'));
            });
          }
        });
      });

      const onRetry = jest.fn();

      await expect(
        resilientFetch('https://api.example.com/slow', {
          timeoutMs: 30,
          retries: 2,
          retryDelayMs: 10,
          onRetry,
        })
      ).rejects.toThrow();

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(onRetry).toHaveBeenCalledTimes(2);
    });

    it('respects external abort signals during in-flight request', async () => {
      const abortController = new AbortController();

      global.fetch = jest.fn().mockImplementation((_url, init) => {
        return new Promise((_resolve, reject) => {
          if (init?.signal) {
            init.signal.addEventListener('abort', () => {
              reject(new Error('User aborted request'));
            });
          }
        });
      });

      const fetchPromise = resilientFetch('https://api.example.com/abort-me', {
        retries: 2,
        retryDelayMs: 50,
        signal: abortController.signal,
        retryCondition: (_res, err) => {
          if (err?.message?.includes('User aborted')) return false;
          return true;
        },
      });

      setTimeout(() => {
        abortController.abort(new Error('User aborted request'));
      }, 20);

      await expect(fetchPromise).rejects.toThrow('User aborted request');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('identifies behavior when pre-aborted signal is passed', async () => {
      const preAbortedController = new AbortController();
      preAbortedController.abort(new Error('Already aborted'));

      global.fetch = jest.fn().mockImplementation((_url, init) => {
        if (init?.signal?.aborted) {
          return Promise.reject(init.signal.reason || new Error('Aborted immediately'));
        }
        return Promise.resolve(new Response('OK', { status: 200 }));
      });

      // resilientFetch checks signal.aborted upfront and immediately aborts the internal controller
      await expect(
        resilientFetch('https://api.example.com/pre-aborted', {
          signal: preAbortedController.signal,
          retries: 0,
        })
      ).rejects.toThrow('Already aborted');
    });

    it('resilientFetchJson throws descriptive error on non-200 responses and handles invalid JSON', async () => {
      // 404 response
      global.fetch = jest.fn().mockResolvedValue(
        new Response('Not Found', { status: 404, statusText: 'Not Found' })
      );
      await expect(
        resilientFetchJson('https://api.example.com/missing')
      ).rejects.toThrow('HTTP Error 404: Not Found');

      // 200 response with invalid JSON
      global.fetch = jest.fn().mockResolvedValue(
        new Response('INVALID_JSON{', { status: 200 })
      );
      await expect(
        resilientFetchJson('https://api.example.com/bad-json')
      ).rejects.toThrow();
    });

    it('resilientFetchText throws on non-200 and parses valid text', async () => {
      // 500 response
      global.fetch = jest.fn().mockResolvedValue(
        new Response('Internal Server Error', { status: 500, statusText: 'Internal Server Error' })
      );
      await expect(
        resilientFetchText('https://api.example.com/err-text', { retries: 0 })
      ).rejects.toThrow('HTTP Error 500: Internal Server Error');

      // 200 valid text
      global.fetch = jest.fn().mockResolvedValue(
        new Response('CSV_HEADER,COL1,COL2\nVAL1,VAL2,VAL3', { status: 200 })
      );
      const text = await resilientFetchText('https://api.example.com/data.csv');
      expect(text).toBe('CSV_HEADER,COL1,COL2\nVAL1,VAL2,VAL3');
    });

    it('applies exponential backoff with jitter on retry delays', async () => {
      const delays: number[] = [];
      const errorResponse = new Response('Server Error', { status: 500 });

      global.fetch = jest.fn().mockResolvedValue(errorResponse);

      await resilientFetch('https://api.example.com/backoff', {
        retries: 3,
        retryDelayMs: 100,
        backoffFactor: 2,
        onRetry: (_attempt, _err, delayMs) => {
          delays.push(delayMs);
        },
      });

      expect(delays.length).toBe(3);
      // Attempt 1: 100 * 2^0 + jitter(0..50) -> [100, 150]
      expect(delays[0]).toBeGreaterThanOrEqual(100);
      expect(delays[0]).toBeLessThanOrEqual(150);

      // Attempt 2: 100 * 2^1 + jitter(0..50) -> [200, 250]
      expect(delays[1]).toBeGreaterThanOrEqual(200);
      expect(delays[1]).toBeLessThanOrEqual(250);

      // Attempt 3: 100 * 2^2 + jitter(0..50) -> [400, 450]
      expect(delays[2]).toBeGreaterThanOrEqual(400);
      expect(delays[2]).toBeLessThanOrEqual(450);
    });

    it('handles non-Error objects thrown by fetch gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue('Raw string network rejection');

      await expect(
        resilientFetch('https://api.example.com/string-error', {
          retries: 1,
          retryDelayMs: 10,
        })
      ).rejects.toThrow('Raw string network rejection');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
