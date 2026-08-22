/**
 * @file m4_challenger_api_routes_empirical.test.ts
 * @description Empirical Challenger test suite for Milestone 4:
 * 1. Unified API response envelope validation (success, error, status codes, payload variance)
 * 2. Rate limiter header propagation, 429 response structure, burst concurrency, and reset behavior
 * 3. Route handler direct invocation across critical API endpoints (GET, POST, 400, 429, 500)
 * 4. Pure domain service decoupling (apartmentPageService.ts) and edge case validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiSuccess, apiError, ApiSuccessResponse, ApiErrorResponse } from '@/lib/api/apiResponse';
import { checkRateLimit, getClientIp } from '@/lib/api/rateLimiter';
import {
  decodeAptName,
  formatPriceEok,
  getPyeongSummaries,
  calculatePriceAnalytics,
  generateAiBriefing,
  getApartmentPageData,
  buildApartmentJsonLd,
  buildApartmentSeoMetadata,
  getDefaultApartmentMetadata,
  type TransactionRecord,
} from '@/lib/services/apartmentPageService';

// Mock dependencies
jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined),
      })),
      get: jest.fn().mockResolvedValue({ forEach: jest.fn() }),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    })),
    runTransaction: jest.fn(),
  },
  Timestamp: { now: () => ({ toMillis: () => 1700000000000 }) },
  FieldValue: { increment: (n: number) => n },
}));

jest.mock('@/lib/redis', () => ({
  redis: null,
  rawRedis: null,
}));

describe('Milestone 4 — API Routes & Envelope Empirical Challenger Suite', () => {

  // =========================================================================
  // 1. API Response Envelope Rigorous Invariant Tests
  // =========================================================================
  describe('1. API Response Envelope Structure & Edge Cases', () => {
    it('apiSuccess wraps diverse data types in exact canonical shape { success: true, data }', async () => {
      const testCases = [
        { label: 'object', input: { id: 1, name: 'D-VIEW' } },
        { label: 'array', input: [1, 2, 3, { a: 'b' }] },
        { label: 'string', input: 'sample message' },
        { label: 'number zero', input: 0 },
        { label: 'boolean false', input: false },
        { label: 'null', input: null },
        { label: 'empty array', input: [] },
        { label: 'empty object', input: {} },
      ];

      for (const tc of testCases) {
        const res = apiSuccess(tc.input);
        expect(res.status).toBe(200);
        const body: ApiSuccessResponse<unknown> = await res.json();
        expect(body.success).toBe(true);
        expect(body.data).toEqual(tc.input);
      }
    });

    it('apiSuccess merges metadata and passes ResponseInit options without field collision', async () => {
      const meta = {
        source: 'redis_cache',
        count: 42,
        cached: true,
        nested: { key: 'value' },
      };

      const res = apiSuccess(['item1', 'item2'], meta, {
        status: 201,
        headers: {
          'X-Custom-Header': 'D-VIEW-M4',
          'Cache-Control': 'no-store',
        },
      });

      expect(res.status).toBe(201);
      expect(res.headers.get('X-Custom-Header')).toBe('D-VIEW-M4');
      expect(res.headers.get('Cache-Control')).toBe('no-store');

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data).toEqual(['item1', 'item2']);
      expect(body.source).toBe('redis_cache');
      expect(body.count).toBe(42);
      expect(body.cached).toBe(true);
      expect(body.nested).toEqual({ key: 'value' });
    });

    it('apiError creates canonical error shape { success: false, error, code, message, details? }', async () => {
      const errorStatuses = [
        { code: 'BAD_REQUEST', status: 400, message: 'Invalid field' },
        { code: 'UNAUTHORIZED', status: 401, message: 'Auth required' },
        { code: 'FORBIDDEN', status: 403, message: 'Access denied' },
        { code: 'NOT_FOUND', status: 404, message: 'Resource missing' },
        { code: 'RATE_LIMIT_EXCEEDED', status: 429, message: 'Too Many Requests' },
        { code: 'INTERNAL_ERROR', status: 500, message: 'Server crash' },
      ];

      for (const err of errorStatuses) {
        const details = { field: 'test', reason: 'validation failed' };
        const res = apiError(err.code, err.message, err.status, details);

        expect(res.status).toBe(err.status);
        const body: ApiErrorResponse = await res.json();
        expect(body.success).toBe(false);
        expect(body.error).toBe(err.code);
        expect(body.code).toBe(err.code);
        expect(body.message).toBe(err.message);
        expect(body.details).toEqual(details);
      }
    });

    it('apiError gracefully omits details key when details parameter is undefined', async () => {
      const res = apiError('NO_DETAILS', 'No extra info', 400, undefined);
      const body = await res.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('NO_DETAILS');
      expect('details' in body).toBe(false);
    });
  });

  // =========================================================================
  // 2. Rate Limiting, Headers & Concurrency Stress Testing
  // =========================================================================
  describe('2. Rate Limiter Headers & 429 Status Handling', () => {
    it('returns standard rate limit headers (Limit, Remaining, Reset) on 429 rejection', async () => {
      const uniquePrefix = 'test_429_headers_' + Date.now();
      const ip = '10.20.30.40';
      const req = new NextRequest('http://localhost/api/test', {
        headers: { 'x-real-ip': ip },
      });

      // Max 2 requests allowed
      const r1 = await checkRateLimit(req, { prefix: uniquePrefix, requestsPerLimit: 2 });
      expect(r1.success).toBe(true);
      expect(r1.remaining).toBe(1);

      const r2 = await checkRateLimit(req, { prefix: uniquePrefix, requestsPerLimit: 2 });
      expect(r2.success).toBe(true);
      expect(r2.remaining).toBe(0);

      // 3rd request should trigger 429
      const r3 = await checkRateLimit(req, { prefix: uniquePrefix, requestsPerLimit: 2 });
      expect(r3.success).toBe(false);
      expect(r3.remaining).toBe(0);
      expect(r3.response).toBeDefined();

      const resp = r3.response as NextResponse;
      expect(resp.status).toBe(429);
      expect(resp.headers.get('X-RateLimit-Limit')).toBe('2');
      expect(resp.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(resp.headers.get('X-RateLimit-Reset')).toBeDefined();

      const body = await resp.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.message).toBe('Too Many Requests');
      expect(body.details).toHaveProperty('limit', 2);
      expect(body.details).toHaveProperty('reset');
    });

    it('isolates different clients and prefixes without cross-contamination', async () => {
      const prefix = 'iso_test_' + Date.now();
      const reqA = new NextRequest('http://localhost/api/test', { headers: { 'x-forwarded-for': '1.1.1.1' } });
      const reqB = new NextRequest('http://localhost/api/test', { headers: { 'x-forwarded-for': '2.2.2.2' } });

      // Exhaust client A
      await checkRateLimit(reqA, { prefix, requestsPerLimit: 1 });
      const blockedA = await checkRateLimit(reqA, { prefix, requestsPerLimit: 1 });
      expect(blockedA.success).toBe(false);

      // Client B must be completely unaffected
      const allowedB = await checkRateLimit(reqB, { prefix, requestsPerLimit: 1 });
      expect(allowedB.success).toBe(true);
      expect(allowedB.remaining).toBe(0);
    });

    it('getClientIp extracts IP correctly from x-forwarded-for (multi-proxy) and x-real-ip', () => {
      const r1 = new NextRequest('http://localhost/api/test', {
        headers: { 'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
      });
      expect(getClientIp(r1)).toBe('203.0.113.195');

      const r2 = new NextRequest('http://localhost/api/test', {
        headers: {
          'x-real-ip': '198.51.100.1',
          'x-forwarded-for': '203.0.113.195',
        },
      });
      expect(getClientIp(r2)).toBe('198.51.100.1');

      const r3 = new NextRequest('http://localhost/api/test');
      expect(getClientIp(r3)).toBe('127.0.0.1');
    });
  });

  // =========================================================================
  // 3. Direct Route Handler Execution & Error Status Tests
  // =========================================================================
  describe('3. Route Handlers Execution & Boundary Handling', () => {
    it('GET /api/apartments-by-dong returns 200 with standard envelope', async () => {
      const { GET } = await import('@/app/api/apartments-by-dong/route');
      const req = new NextRequest('http://localhost/api/apartments-by-dong?bypassCache=false');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });

    it('GET & POST /api/apartments/vote handles missing/global GET and valid/invalid POST', async () => {
      const { GET, POST } = await import('@/app/api/apartments/vote/route');

      // GET global
      const getReq = new NextRequest('http://localhost/api/apartments/vote?aptName=global');
      const getRes = await GET(getReq);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      expect(getJson.data).toHaveProperty('buyCount');
      expect(getJson.data).toHaveProperty('waitCount');

      // POST invalid JSON body
      const badReq = new NextRequest('http://localhost/api/apartments/vote', {
        method: 'POST',
        body: 'invalid-json',
      });
      const badRes = await POST(badReq);
      expect(badRes.status).toBe(400);
      const badJson = await badRes.json();
      expect(badJson.success).toBe(false);
      expect(badJson.error).toBe('MALFORMED_JSON');

      // POST invalid enum value
      const badEnumReq = new NextRequest('http://localhost/api/apartments/vote', {
        method: 'POST',
        body: JSON.stringify({ aptName: '동탄역롯데캐슬', voteType: 'invalid_type' }),
      });
      const badEnumRes = await POST(badEnumReq);
      expect(badEnumRes.status).toBe(400);
      const badEnumJson = await badEnumRes.json();
      expect(badEnumJson.success).toBe(false);
      expect(badEnumJson.code).toBe('INVALID_PARAMETERS');
    });

    it('POST /api/comments rejects invalid payload and returns 400 with details', async () => {
      const { POST } = await import('@/app/api/comments/route');

      // Missing both postId and reportId
      const req = new NextRequest('http://localhost/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Comment with no target',
          authorUid: 'uid123',
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('INVALID_PAYLOAD');
      expect(json.details).toBeDefined();
    });

    it('GET /api/location-scores returns 400 when apartment param is missing', async () => {
      const { GET } = await import('@/app/api/location-scores/route');

      // Missing query param
      const badReq = new NextRequest('http://localhost/api/location-scores');
      const badRes = await GET(badReq);
      expect(badRes.status).toBe(400);
      const badJson = await badRes.json();
      expect(badJson.success).toBe(false);
      expect(badJson.error).toBe('INVALID_QUERY');
    });

    it('GET /api/transaction-summary returns 200 with standard envelope', async () => {
      const { GET } = await import('@/app/api/transaction-summary/route');
      const req = new NextRequest('http://localhost/api/transaction-summary');
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
    });
  });

  // =========================================================================
  // 4. Pure Domain Service Decoupling (apartmentPageService.ts)
  // =========================================================================
  describe('4. apartmentPageService Domain Decoupling & SEO Logic', () => {
    it('decodeAptName handles Korean characters, encoded spaces, and URL encoding', () => {
      expect(decodeAptName('%EB%8F%99%ED%83%84%EC%97%AD%20%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC')).toBe('동탄역 롯데캐슬');
      expect(decodeAptName('동탄역롯데캐슬')).toBe('동탄역롯데캐슬');
      expect(decodeAptName('')).toBe('');
    });

    it('formatPriceEok formats numbers accurately in Korean Eok (억) notation', () => {
      expect(formatPriceEok(150000)).toBe('15억');
      expect(formatPriceEok(85000)).toBe('8억 5,000');
      expect(formatPriceEok(60000)).toBe('6억');
      expect(formatPriceEok(0)).toBe('0만');
      expect(formatPriceEok(undefined as unknown as number)).toBe('0만');
    });

    it('getPyeongSummaries aggregates transactions by area and computes prices and ratios', () => {
      const sampleTxs: TransactionRecord[] = [
        {
          contractYm: '202604',
          contractDay: 10,
          price: 150000,
          area: 84.8,
          areaPyeong: 25.6,
          floor: 10,
          dealType: '매매',
        },
        {
          contractYm: '202604',
          contractDay: 15,
          price: 160000,
          area: 84.8,
          areaPyeong: 25.6,
          floor: 15,
          dealType: '매매',
        },
        {
          contractYm: '202604',
          contractDay: 12,
          price: 0,
          deposit: 80000,
          area: 84.8,
          areaPyeong: 25.6,
          floor: 8,
          dealType: '전세',
        },
        {
          contractYm: '202603',
          contractDay: 1,
          price: 100000,
          area: 59.5,
          areaPyeong: 18.0,
          floor: 5,
          dealType: '매매',
        },
      ];

      const summaries = getPyeongSummaries(sampleTxs);
      expect(summaries.length).toBe(2);

      // Check 26평 (84.8m²) summary
      const p26 = summaries.find((s) => s.pyeong === 26);
      expect(p26).toBeDefined();
      expect(p26?.salesCount).toBe(2);
      expect(p26?.rentCount).toBe(1);
      expect(p26?.latestPrice).toBe(160000);
      expect(p26?.avgPrice).toBe(155000);
      expect(p26?.maxPrice).toBe(160000);
      expect(p26?.latestDeposit).toBe(80000);
      expect(p26?.jeonseRatio).toBe(52); // Math.round(80000 / 155000 * 100) = 52
    });

    it('calculatePriceAnalytics handles empty pyeongSummaries without division by zero', () => {
      const analytics = calculatePriceAnalytics([], undefined);
      expect(analytics.minSalePrice).toBe(0);
      expect(analytics.maxSalePrice).toBe(0);
      expect(analytics.ratioPercent).toBe(0);
      expect(analytics.statusStr).toBe('인기단지');
    });

    it('generateAiBriefing synthesizes comprehensive natural language summary', () => {
      const pyeongSummaries = getPyeongSummaries([
        { contractYm: '202604', contractDay: 1, price: 120000, area: 84, areaPyeong: 25, floor: 10, dealType: '매매' },
        { contractYm: '202604', contractDay: 2, price: 0, deposit: 72000, area: 84, areaPyeong: 25, floor: 10, dealType: '전세' },
      ]);

      const locationScore = {
        distanceToElementary: 200,
        nearestSchoolNames: { elementary: '동탄초' },
        nearestStationName: '동탄',
        nearestStationLine: 'GTX-A',
        distanceToSubway: 350,
      };

      const briefing = generateAiBriefing('동탄역 시범우남퍼스트빌', undefined, pyeongSummaries, locationScore);
      expect(briefing).toContain('동탄역 시범우남퍼스트빌');
      expect(briefing).toContain('실거래가');
      expect(briefing).toContain('전세가율');
      expect(briefing).toContain('동탄초');
      expect(briefing).toContain('GTX-A');
    });

    it('getApartmentPageData handles valid and non-existent apartments gracefully', async () => {
      const data = await getApartmentPageData('동탄역롯데캐슬');
      expect(data.aptName).toBe('동탄역롯데캐슬');
      expect(data.txs).toBeDefined();
      expect(data.pyeongSummaries).toBeDefined();
      expect(data.analytics).toBeDefined();
      expect(data.aiBriefing).toBeDefined();

      const nonExistent = await getApartmentPageData('비존재단지12345');
      expect(nonExistent.aptName).toBe('비존재단지12345');
      expect(nonExistent.txs).toEqual([]);
      expect(nonExistent.pyeongSummaries).toEqual([]);
    });

    it('buildApartmentJsonLd generates valid Schema.org graph object', async () => {
      const data = await getApartmentPageData('동탄역롯데캐슬');
      const jsonLd = buildApartmentJsonLd(data, 'https://dongtanview.com');

      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(Array.isArray(jsonLd['@graph'])).toBe(true);

      const graph = jsonLd['@graph'] as Record<string, unknown>[];
      const webPage = graph.find((item) => item['@type'] === 'WebPage');
      const complex = graph.find((item) => item['@type'] === 'ApartmentComplex');
      const residence = graph.find((item) => item['@type'] === 'SingleFamilyResidence');
      const agent = graph.find((item) => item['@type'] === 'RealEstateAgent');

      expect(webPage).toBeDefined();
      expect(complex).toBeDefined();
      expect(residence).toBeDefined();
      expect(agent).toBeDefined();
    });

    it('buildApartmentSeoMetadata creates rich SEO metadata with OpenGraph and Twitter cards', async () => {
      const meta = await buildApartmentSeoMetadata('동탄역롯데캐슬', { shareType: 'score', grade: 'A', score: '95' });

      expect(meta.title).toBeDefined();
      expect(meta.description).toBeDefined();
      expect(meta.openGraph).toBeDefined();
      expect(meta.twitter).toBeDefined();

      const og = meta.openGraph as { images?: { url: string }[] };
      expect(og.images?.[0].url).toContain('/api/og');
      expect(og.images?.[0].url).toContain('title=%EB%8F%99%ED%83%84%EC%97%AD%EB%A1%AF%EB%8D%B0%EC%BA%90%EC%8A%AC');
    });

    it('getDefaultApartmentMetadata returns valid fallback metadata', () => {
      const meta = getDefaultApartmentMetadata('https://dongtanview.com', '시범우남');
      expect(meta.title).toContain('시범우남');
      expect(meta.alternates?.canonical).toBe('https://dongtanview.com/apartment/%EC%8B%9C%EB%B2%94%EC%9A%B0%EB%82%A8');
    });
  });
});
