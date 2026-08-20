import { NextRequest } from 'next/server';
import { checkRateLimit, getClientIp } from '../rateLimiter';

describe('rateLimiter Helper', () => {
  it('should extract client IP accurately from x-forwarded-for or x-real-ip', () => {
    const req1 = new NextRequest('http://localhost/api/test', {
      headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18' }
    });
    expect(getClientIp(req1)).toBe('203.0.113.195');

    const req2 = new NextRequest('http://localhost/api/test', {
      headers: { 'x-real-ip': '198.51.100.42' }
    });
    expect(getClientIp(req2)).toBe('198.51.100.42');

    const req3 = new NextRequest('http://localhost/api/test');
    expect(getClientIp(req3)).toBe('127.0.0.1');
  });

  it('should allow requests within limit and block when rate limit is exceeded', async () => {
    const customPrefix = `test_limit_${Date.now()}`;
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-real-ip': '10.0.0.1' }
    });

    // 3 allowed requests
    const res1 = await checkRateLimit(req, { prefix: customPrefix, requestsPerLimit: 3 });
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = await checkRateLimit(req, { prefix: customPrefix, requestsPerLimit: 3 });
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = await checkRateLimit(req, { prefix: customPrefix, requestsPerLimit: 3 });
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);

    // 4th request exceeds rate limit
    const res4 = await checkRateLimit(req, { prefix: customPrefix, requestsPerLimit: 3 });
    expect(res4.success).toBe(false);
    expect(res4.remaining).toBe(0);
    expect(res4.response).toBeDefined();
    expect(res4.response?.status).toBe(429);
    expect(res4.response?.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(res4.response?.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res4.response?.headers.get('X-RateLimit-Reset')).toBeDefined();

    const json = await res4.response?.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('RATE_LIMIT_EXCEEDED');
  });
});
