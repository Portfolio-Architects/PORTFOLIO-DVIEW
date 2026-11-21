/**
 * @jest-environment node
 * @file phase0_security_hardening.test.ts
 * @description Comprehensive security regression tests for Audit Phase 0 (P0):
 *  - [CRIT-01] Single Firebase deploy root (.firebaserc, no duplicate frontend/firebase.json)
 *  - [CRIT-02] Fail-closed Cron Bearer auth (timingSafeEqual, zero hardcoded secrets/header spoofing)
 *  - [CRIT-03] Web Push SSRF allowlist, SHA-256 doc IDs, server-derived uid, HMAC ownership cookies
 *  - [HIGH-01] /api/og bgUrl SSRF & CSS url() injection blocking
 *  - [HIGH-05] Dummy data elimination (public-prices.json, sw.js precache, macro-config.ts, analytics-service.ts)
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { NextRequest } from 'next/server';

const capturedOgCalls: Array<{ element: { props?: { style?: { backgroundImage?: string } } }; options?: { headers?: Record<string, string> } }> = [];
jest.mock('next/og', () => ({
  ImageResponse: class MockImageResponse extends Response {
    constructor(
      element: { props?: { style?: { backgroundImage?: string } } },
      options?: { headers?: Record<string, string> }
    ) {
      capturedOgCalls.push({ element, options });
      super('PNG_BYTES', {
        status: 200,
        headers: {
          'content-type': 'image/png',
          ...(options?.headers || {}),
        },
      });
    }
  },
}));

const mockVerifyAuthHeader = jest.fn();
jest.mock('@/lib/authUtils', () => ({
  verifyAuthHeader: (...args: unknown[]) => mockVerifyAuthHeader(...args),
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('@/lib/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockDocStore = new Map<string, Record<string, unknown>>();
const mockUpdateErrorByKey = new Map<string, Error & { code?: number | string }>();
const mockDeleteErrorByKey = new Map<string, Error & { code?: number | string }>();
const mockDocGetSpy = jest.fn();
const mockArrayUnion = jest.fn((...items: unknown[]) => ({ __op: 'arrayUnion', items }));
const mockArrayRemove = jest.fn((...items: unknown[]) => ({ __op: 'arrayRemove', items }));

jest.mock('@/lib/firebaseAdmin', () => ({
  FieldValue: {
    arrayUnion: (...items: unknown[]) => mockArrayUnion(...items),
    arrayRemove: (...items: unknown[]) => mockArrayRemove(...items),
  },
  adminDb: {
    collection: jest.fn((colName: string) => ({
      doc: jest.fn((docId: string) => {
        const key = `${colName}/${docId}`;
        return {
          get: jest.fn(async () => {
            mockDocGetSpy(key);
            return {
              exists: mockDocStore.has(key),
              data: () => mockDocStore.get(key),
            };
          }),
          set: jest.fn(async (data: Record<string, unknown>) => {
            const prev = mockDocStore.get(key) || {};
            const next: Record<string, unknown> = { ...prev, ...data };
            const aptOp = data.apts as { __op?: string; items?: string[] } | undefined;
            if (aptOp && aptOp.__op === 'arrayUnion') {
              const prevApts = Array.isArray(prev.apts) ? (prev.apts as string[]) : [];
              next.apts = Array.from(new Set([...prevApts, ...(aptOp.items || [])]));
            }
            mockDocStore.set(key, next);
          }),
          update: jest.fn(async (data: Record<string, unknown>) => {
            const injectedErr = mockUpdateErrorByKey.get(key);
            if (injectedErr) {
              throw injectedErr;
            }
            const prev = mockDocStore.get(key) || {};
            const next: Record<string, unknown> = { ...prev, ...data };
            const aptOp = data.apts as { __op?: string; items?: string[] } | undefined;
            if (aptOp && aptOp.__op === 'arrayRemove') {
              const prevApts = Array.isArray(prev.apts) ? (prev.apts as string[]) : [];
              const toRemove = new Set(aptOp.items || []);
              next.apts = prevApts.filter((a) => !toRemove.has(a));
            }
            mockDocStore.set(key, next);
          }),
          delete: jest.fn(async () => {
            const injectedErr = mockDeleteErrorByKey.get(key);
            if (injectedErr) {
              throw injectedErr;
            }
            mockDocStore.delete(key);
          }),
        };
      }),
    })),
  },
}));

import {
  constantTimeTokenEqual,
  verifyCronBearerToken,
  isAuthorizedCronBearerRequest,
} from '@/lib/api/cronAuth';
import { GET as catchupGet } from '@/app/api/cron/sync-transactions-catchup/route';
import {
  PUSH_OWNER_COOKIE_NAME,
  createPushOwnershipToken,
  hashPushEndpoint,
  legacyBase64EndpointId,
  normalizePushEndpoint,
  validatePushEndpointUrl,
  verifyPushOwnershipToken,
} from '@/lib/push/pushSecurity';
import {
  POST as pushSubscribePost,
  GET as pushSubscribeGet,
} from '@/app/api/push/subscribe/route';
import { POST as pushUnsubscribePost } from '@/app/api/push/unsubscribe/route';
import {
  isForbiddenIpOrHost,
  sanitizeOgBackgroundUrl,
  validateProxyImageTargetUrl,
} from '@/lib/security/urlValidator';
import { GET as ogRouteGet } from '@/app/api/og/route';
import { getAdminAnalyticsLKG } from '@/lib/analytics-service';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const FRONTEND_ROOT = path.resolve(__dirname, '../..');

describe('Phase 0 — P0 Security & Real-Data Hardening Verification', () => {
  const origCronSecret = process.env.CRON_SECRET;
  const origVapidPriv = process.env.VAPID_PRIVATE_KEY;
  const origPushTokenSecret = process.env.PUSH_TOKEN_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDocStore.clear();
    mockUpdateErrorByKey.clear();
    mockDeleteErrorByKey.clear();
    mockVerifyAuthHeader.mockRejectedValue(new Error('No auth session'));
    process.env.VAPID_PRIVATE_KEY = 'phase0-test-vapid-signing-secret-only';
    delete process.env.PUSH_TOKEN_SECRET;
  });

  afterAll(() => {
    if (origCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = origCronSecret;
    if (origVapidPriv === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = origVapidPriv;
    if (origPushTokenSecret === undefined) delete process.env.PUSH_TOKEN_SECRET;
    else process.env.PUSH_TOKEN_SECRET = origPushTokenSecret;
  });

  describe('1. [CRIT-02] Fail-Closed Cron Auth & Zero Hardcoded Secrets', () => {
    it('fails closed when CRON_SECRET is unset and rejects malformed or wrong Bearer tokens', () => {
      delete process.env.CRON_SECRET;
      expect(verifyCronBearerToken('Bearer dview-default-cron-secret-2026')).toBe(false);
      expect(verifyCronBearerToken('Bearer ')).toBe(false);
      expect(verifyCronBearerToken(null)).toBe(false);

      process.env.CRON_SECRET = 'super-strong-phase0-secret-64-chars-example';
      expect(verifyCronBearerToken('Basic super-strong-phase0-secret-64-chars-example')).toBe(false);
      expect(verifyCronBearerToken('Bearer wrong-secret')).toBe(false);
      expect(verifyCronBearerToken('Bearer super-strong-phase0-secret-64-chars-example')).toBe(true);
      expect(constantTimeTokenEqual('abc', 'abc')).toBe(true);
      expect(constantTimeTokenEqual('abc', 'abcd')).toBe(false);
      expect(constantTimeTokenEqual('', '')).toBe(false);

      const spoofReq = new NextRequest('https://dongtanview.com/api/cron/sync-transactions-catchup', {
        headers: {
          'user-agent': 'vercel-cron/1.0',
          'x-vercel-cron': '1',
          'x-building-api-key': 'super-strong-phase0-secret-64-chars-example',
          host: 'localhost:5000',
        },
      });
      expect(isAuthorizedCronBearerRequest(spoofReq)).toBe(false);
    });

    it('rejects unauthenticated and spoofed calls on /api/cron/sync-transactions-catchup with 401', async () => {
      delete process.env.CRON_SECRET;
      const req = new NextRequest('https://dongtanview.com/api/cron/sync-transactions-catchup', {
        headers: {
          'user-agent': 'vercel-cron/1.0',
          'x-vercel-cron': '1',
          authorization: 'Bearer dview-default-cron-secret-2026',
        },
      });
      const res = await catchupGet(req);
      expect(res.status).toBe(401);
    });

    it('contains zero occurrences of retired exposed public API key or default cron secret in runtime code, scripts, and workflows', () => {
      const retiredKeyPrefix = ['4611c020', '45e69b5e'].join('');
      const retiredCronDefault = ['dview-default', '-cron-secret-', '2026'].join('');

      const filesToScan = [
        path.join(FRONTEND_ROOT, 'src/app/api/cron/sync-transactions/route.ts'),
        path.join(FRONTEND_ROOT, 'src/app/api/cron/sync-transactions-catchup/route.ts'),
        path.join(FRONTEND_ROOT, 'src/app/api/cron/sync-local-notices/route.ts'),
        path.join(FRONTEND_ROOT, 'src/app/api/cron/send-tx-notifications/route.ts'),
        path.join(FRONTEND_ROOT, 'src/app/api/push/notify-new-high/route.ts'),
        path.join(FRONTEND_ROOT, 'scripts/fetch-transactions.js'),
        path.join(FRONTEND_ROOT, 'scripts/fetch-rent.js'),
        path.join(FRONTEND_ROOT, 'scripts/sync-transactions.js'),
        path.join(FRONTEND_ROOT, 'scripts/sync-nps.js'),
        path.join(REPO_ROOT, '.github/workflows/sync-transactions.yml'),
        path.join(REPO_ROOT, 'docs/molit-crawling-feasibility.md'),
      ];

      for (const filePath of filesToScan) {
        const content = fs.readFileSync(filePath, 'utf8');
        expect(content).not.toContain(retiredKeyPrefix);
        expect(content).not.toContain(retiredCronDefault);
        expect(content).not.toContain('x-building-api-key');
      }

      const syncNpsContent = fs.readFileSync(path.join(FRONTEND_ROOT, 'scripts/sync-nps.js'), 'utf8');
      expect(syncNpsContent).toContain("require('dotenv').config");
    });
  });

  describe('2. [CRIT-03] Web Push SSRF Host Allowlist, SHA-256 Doc IDs & Ownership Cookies', () => {
    it('allows only official HTTPS:443 Web Push hosts and rejects SSRF targets', () => {
      for (const valid of [
        'https://fcm.googleapis.com/fcm/send/token-123',
        'https://updates.push.services.mozilla.com/wpush/v2/abc',
        'https://web.push.apple.com/QIabc123',
        'https://wns2-sg2p.notify.windows.com/w/?token=xyz',
      ]) {
        expect(validatePushEndpointUrl(valid).valid).toBe(true);
      }

      for (const invalid of [
        'http://fcm.googleapis.com/fcm/send/token-123',
        'https://fcm.googleapis.com:8443/fcm/send/token-123',
        'https://user:pass@fcm.googleapis.com/fcm/send/token-123',
        'https://fcm.googleapis.com/',
        'https://fcm.googleapis.com.evil.com/fcm/send/token-123',
        'https://notify.windows.com/w/?token=xyz',
        'https://evil.example.com/webhook',
        'https://127.0.0.1/admin',
        'https://169.254.169.254/latest/meta-data/',
        'https://[::1]/internal',
        'https://metadata.google.internal/computeMetadata/v1/',
      ]) {
        expect(validatePushEndpointUrl(invalid).valid).toBe(false);
      }
    });

    it('ignores client-supplied uid, writes SHA-256 doc ID, mints HttpOnly ownership cookie, and blocks unauthorized read/delete/overwrite', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/phase0-device-abc';
      const shaId = hashPushEndpoint(endpoint);
      expect(shaId).toMatch(/^[0-9a-f]{64}$/);

      // 1) Subscribe with spoofed body.uid while unauthenticated -> stored uid MUST be null
      const subReq = new NextRequest('https://dongtanview.com/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint,
            keys: { p256dh: 'p256-owner-key', auth: 'auth-owner-secret' },
          },
          uid: 'spoofed-victim-uid',
          apartmentName: '동탄역롯데캐슬',
        }),
      });
      const subRes = await pushSubscribePost(subReq);
      expect(subRes.status).toBe(200);

      const stored = mockDocStore.get(`push_subscriptions/${shaId}`);
      expect(stored).toBeDefined();
      expect(stored?.uid).toBeNull();
      expect(stored?.apts).toEqual(['동탄역롯데캐슬']);

      const cookie = subRes.cookies.get(PUSH_OWNER_COOKIE_NAME);
      expect(cookie?.value).toBeTruthy();
      expect(verifyPushOwnershipToken(cookie?.value, endpoint)).toBe(true);

      // 2) Attacker with ONLY endpoint + wrong keys CANNOT overwrite subscription (403)
      const hijackReq = new NextRequest('https://dongtanview.com/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint,
            keys: { p256dh: 'attacker-p256', auth: 'attacker-auth' },
          },
          apartmentName: '임의단지',
        }),
      });
      expect((await pushSubscribePost(hijackReq)).status).toBe(403);

      // 3) Unauthenticated GET /api/push/subscribe is blocked (401); valid owner cookie succeeds (200)
      const unauthGet = new NextRequest(
        `https://dongtanview.com/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`
      );
      expect((await pushSubscribeGet(unauthGet)).status).toBe(401);

      const authGet = new NextRequest(
        `https://dongtanview.com/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`,
        { headers: { cookie: `${PUSH_OWNER_COOKIE_NAME}=${cookie!.value}` } }
      );
      const authGetRes = await pushSubscribeGet(authGet);
      expect(authGetRes.status).toBe(200);
      const authGetJson = await authGetRes.json();
      expect(authGetJson.data.apts).toEqual(['동탄역롯데캐슬']);

      // 4) Unauthenticated unsubscribe is blocked (401); valid owner cookie deletes cleanly (200)
      const unauthUnsub = new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint }),
      });
      expect((await pushUnsubscribePost(unauthUnsub)).status).toBe(401);
      expect(mockDocStore.has(`push_subscriptions/${shaId}`)).toBe(true);

      const authUnsub = new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${PUSH_OWNER_COOKIE_NAME}=${cookie!.value}`,
        },
        body: JSON.stringify({ endpoint }),
      });
      expect((await pushUnsubscribePost(authUnsub)).status).toBe(200);
      expect(mockDocStore.has(`push_subscriptions/${shaId}`)).toBe(false);
    });

    it('binds verified Firebase uid on subscribe and migrates legacy base64 doc cleanly', async () => {
      const endpoint = 'https://updates.push.services.mozilla.com/wpush/v2/legacy-user';
      const legacyId = legacyBase64EndpointId(endpoint);
      const shaId = hashPushEndpoint(endpoint);
      mockDocStore.set(`push_subscriptions/${legacyId}`, {
        uid: 'real-firebase-uid',
        apts: ['동탄 전체'],
        subscription: {
          endpoint,
          keys: { p256dh: 'p256-leg', auth: 'auth-leg' },
        },
      });

      mockVerifyAuthHeader.mockResolvedValueOnce({ uid: 'real-firebase-uid' });
      const res = await pushSubscribePost(
        new NextRequest('https://dongtanview.com/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint,
              keys: { p256dh: 'p256-leg', auth: 'auth-leg' },
            },
            uid: 'ignored-body-uid',
            apartmentName: '동탄역롯데캐슬',
          }),
        })
      );
      expect(res.status).toBe(200);
      expect(mockDocStore.has(`push_subscriptions/${legacyId}`)).toBe(false);
      const migrated = mockDocStore.get(`push_subscriptions/${shaId}`);
      expect(migrated?.uid).toBe('real-firebase-uid');
      expect(migrated?.apts).toEqual(expect.arrayContaining(['동탄 전체', '동탄역롯데캐슬']));
    });

    it('rejects SSRF endpoints on /api/push/subscribe and /api/push/unsubscribe with 400', async () => {
      const ssrfSub = await pushSubscribePost(
        new NextRequest('https://dongtanview.com/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: 'http://169.254.169.254/latest/meta-data/',
              keys: { p256dh: 'a', auth: 'b' },
            },
          }),
        })
      );
      expect(ssrfSub.status).toBe(400);

      const ssrfUnsub = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: 'https://evil.example.com/hook' }),
        })
      );
      expect(ssrfUnsub.status).toBe(400);

      const ownerToken = createPushOwnershipToken('https://fcm.googleapis.com/fcm/send/a');
      expect(ownerToken).toBeTruthy();
    });

    it('canonicalizes uppercase/explicit-443 push endpoints, blocks unauthenticated Firestore read amplification, and preserves concurrent legacy apts', async () => {
      const canonical = 'https://fcm.googleapis.com/fcm/send/canonical-target-1';
      const variant = 'https://FCM.GOOGLEAPIS.COM:443/fcm/send/canonical-target-1';
      expect(normalizePushEndpoint(variant)).toBe(canonical);
      expect(hashPushEndpoint(variant)).toBe(hashPushEndpoint(canonical));

      // 1) Owner subscribes with canonical endpoint
      const ownerSubRes = await pushSubscribePost(
        new NextRequest('https://dongtanview.com/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: canonical,
              keys: { p256dh: 'p256-canon', auth: 'auth-canon' },
            },
            apartmentName: '동탄역롯데캐슬',
          }),
        })
      );
      expect(ownerSubRes.status).toBe(200);

      // 2) Attacker submitting uppercase/:443 variant with wrong keys MUST hit existing doc and get 403 (no duplicate doc bypass!)
      const variantHijackRes = await pushSubscribePost(
        new NextRequest('https://dongtanview.com/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: variant,
              keys: { p256dh: 'evil-p256', auth: 'evil-auth' },
            },
            apartmentName: '공격자단지',
          }),
        })
      );
      expect(variantHijackRes.status).toBe(403);

      // 3) Unauthenticated GET /api/push/subscribe and POST /api/push/unsubscribe MUST reject with 401 and 0 Firestore reads
      mockDocGetSpy.mockClear();
      const unauthGetRes = await pushSubscribeGet(
        new NextRequest(
          `https://dongtanview.com/api/push/subscribe?endpoint=${encodeURIComponent(canonical)}`
        )
      );
      expect(unauthGetRes.status).toBe(401);
      expect(mockDocGetSpy).not.toHaveBeenCalled();

      mockDocGetSpy.mockClear();
      const unauthUnsubRes = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: canonical }),
        })
      );
      expect(unauthUnsubRes.status).toBe(401);
      expect(mockDocGetSpy).not.toHaveBeenCalled();

      // 4) Concurrent SHA-256 + legacy Base64 doc migration preserves apts from BOTH docs before deleting legacy doc
      const shaId = hashPushEndpoint(canonical);
      const legacyId = legacyBase64EndpointId(canonical);
      mockDocStore.set(`push_subscriptions/${legacyId}`, {
        uid: null,
        apts: ['동탄 전체'],
        subscription: {
          endpoint: canonical,
          keys: { p256dh: 'p256-canon', auth: 'auth-canon' },
        },
      });
      const ownerCookie = ownerSubRes.cookies.get(PUSH_OWNER_COOKIE_NAME)!.value;
      const mergeRes = await pushSubscribePost(
        new NextRequest('https://dongtanview.com/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerCookie}`,
          },
          body: JSON.stringify({
            subscription: {
              endpoint: variant,
              keys: { p256dh: 'p256-canon', auth: 'auth-canon' },
            },
            apartmentName: '동탄역시범더샵센트럴시티',
          }),
        })
      );
      expect(mergeRes.status).toBe(200);
      expect(mockDocStore.has(`push_subscriptions/${legacyId}`)).toBe(false);
      expect(mockDocStore.get(`push_subscriptions/${shaId}`)?.apts).toEqual(
        expect.arrayContaining(['동탄역롯데캐슬', '동탄 전체', '동탄역시범더샵센트럴시티'])
      );
    });

    it('removes apartmentName from BOTH SHA-256 and legacy Base64 docs on single-apartment unsubscribe so subsequent subscribe never resurrects it', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/dual-doc-unsub-target';
      const shaId = hashPushEndpoint(endpoint);
      const legacyId = legacyBase64EndpointId(endpoint);
      expect(legacyId).not.toBe(shaId);

      // Seed BOTH SHA-256 and legacy Base64 docs concurrently
      mockDocStore.set(`push_subscriptions/${shaId}`, {
        uid: 'dual-user-1',
        apts: ['동탄역롯데캐슬', '동탄시범한빛'],
        subscription: {
          endpoint,
          keys: { p256dh: 'p256-dual', auth: 'auth-dual' },
        },
      });
      mockDocStore.set(`push_subscriptions/${legacyId}`, {
        uid: 'dual-user-1',
        apts: ['동탄역롯데캐슬', '동탄 전체'],
        subscription: {
          endpoint,
          keys: { p256dh: 'p256-dual', auth: 'auth-dual' },
        },
      });

      const ownerToken = createPushOwnershipToken(endpoint)!;

      // 1) Whitespace-only apartmentName is rejected with 400 (never silently deletes the whole subscription)
      const whitespaceUnsubRes = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerToken}`,
          },
          body: JSON.stringify({ endpoint, apartmentName: '   ' }),
        })
      );
      expect(whitespaceUnsubRes.status).toBe(400);
      expect(mockDocStore.has(`push_subscriptions/${shaId}`)).toBe(true);
      expect(mockDocStore.has(`push_subscriptions/${legacyId}`)).toBe(true);

      // 2) Single-apartment unsubscribe removes '동탄역롯데캐슬' from BOTH docs while keeping untouched apartments
      const singleUnsubRes = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerToken}`,
          },
          body: JSON.stringify({ endpoint, apartmentName: '동탄역롯데캐슬' }),
        })
      );
      expect(singleUnsubRes.status).toBe(200);
      expect(mockDocStore.get(`push_subscriptions/${shaId}`)?.apts).toEqual(['동탄시범한빛']);
      expect(mockDocStore.get(`push_subscriptions/${legacyId}`)?.apts).toEqual(['동탄 전체']);

      // 3) Subsequent POST /api/push/subscribe merges remaining legacy apts and cleans up legacy doc WITHOUT resurrecting '동탄역롯데캐슬'
      const resubRes = await pushSubscribePost(
        new NextRequest('https://dongtanview.com/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerToken}`,
          },
          body: JSON.stringify({
            subscription: {
              endpoint,
              keys: { p256dh: 'p256-dual', auth: 'auth-dual' },
            },
            apartmentName: '동탄역시범더샵센트럴시티',
          }),
        })
      );
      expect(resubRes.status).toBe(200);
      expect(mockDocStore.has(`push_subscriptions/${legacyId}`)).toBe(false);
      const finalApts = mockDocStore.get(`push_subscriptions/${shaId}`)?.apts as string[];
      expect(finalApts).not.toContain('동탄역롯데캐슬');
      expect(finalApts).toEqual(
        expect.arrayContaining(['동탄시범한빛', '동탄 전체', '동탄역시범더샵센트럴시티'])
      );
    });

    it('enforces UID ownership boundaries across dual SHA-256 and legacy docs during single-apartment unsubscribe without owner cookie', async () => {
      const endpoint = 'https://web.push.apple.com/dual-doc-uid-boundary';
      const shaId = hashPushEndpoint(endpoint);
      const legacyId = legacyBase64EndpointId(endpoint);

      mockDocStore.set(`push_subscriptions/${shaId}`, {
        uid: 'user-owner',
        apts: ['동탄역롯데캐슬', '동탄시범한빛'],
        subscription: { endpoint, keys: { p256dh: 'p256-a', auth: 'auth-a' } },
      });
      mockDocStore.set(`push_subscriptions/${legacyId}`, {
        uid: 'user-other',
        apts: ['동탄역롯데캐슬', '동탄 전체'],
        subscription: { endpoint, keys: { p256dh: 'p256-a', auth: 'auth-a' } },
      });

      // Another user cannot unsubscribe user-owner's SHA doc (401)
      mockVerifyAuthHeader.mockResolvedValueOnce({ uid: 'user-other' });
      const blockedRes = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint, apartmentName: '동탄역롯데캐슬' }),
        })
      );
      expect(blockedRes.status).toBe(401);

      // user-owner updates own SHA doc without mutating a legacy doc tagged with a different uid
      mockVerifyAuthHeader.mockResolvedValueOnce({ uid: 'user-owner' });
      const ownerRes = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint, apartmentName: '동탄역롯데캐슬' }),
        })
      );
      expect(ownerRes.status).toBe(200);
      expect(mockDocStore.get(`push_subscriptions/${shaId}`)?.apts).toEqual(['동탄시범한빛']);
      expect(mockDocStore.get(`push_subscriptions/${legacyId}`)?.apts).toEqual([
        '동탄역롯데캐슬',
        '동탄 전체',
      ]);

      // Subsequent subscribe by user-owner (without owner cookie) MUST NOT merge or delete user-other's legacy doc
      mockVerifyAuthHeader.mockResolvedValueOnce({ uid: 'user-owner' });
      const ownerResubRes = await pushSubscribePost(
        new NextRequest('https://dongtanview.com/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: { endpoint, keys: { p256dh: 'p256-a', auth: 'auth-a' } },
            apartmentName: '동탄역시범더샵센트럴시티',
          }),
        })
      );
      expect(ownerResubRes.status).toBe(200);
      expect(mockDocStore.has(`push_subscriptions/${legacyId}`)).toBe(true);
      expect(mockDocStore.get(`push_subscriptions/${legacyId}`)?.uid).toBe('user-other');
      const ownerFinalApts = mockDocStore.get(`push_subscriptions/${shaId}`)?.apts as string[];
      expect(ownerFinalApts).not.toContain('동탄역롯데캐슬');
      expect(ownerFinalApts).not.toContain('동탄 전체');
      expect(ownerFinalApts).toEqual(
        expect.arrayContaining(['동탄시범한빛', '동탄역시범더샵센트럴시티'])
      );
    });

    it('removes untrimmed legacy apartment variants on unsubscribe and handles concurrent NOT_FOUND vs transient errors on legacyRef', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/untrimmed-and-race-target';
      const shaId = hashPushEndpoint(endpoint);
      const legacyId = legacyBase64EndpointId(endpoint);
      const ownerToken = createPushOwnershipToken(endpoint)!;

      // 1) Untrimmed legacy apt (' 동탄역롯데캐슬 ') is removed on single-apt unsubscribe and never resurrected on subscribe
      mockDocStore.set(`push_subscriptions/${shaId}`, {
        uid: 'race-user',
        apts: ['동탄역롯데캐슬', '동탄시범한빛'],
        subscription: { endpoint, keys: { p256dh: 'p256-r', auth: 'auth-r' } },
      });
      mockDocStore.set(`push_subscriptions/${legacyId}`, {
        uid: 'race-user',
        apts: [' 동탄역롯데캐슬 ', '동탄 전체'],
        subscription: { endpoint, keys: { p256dh: 'p256-r', auth: 'auth-r' } },
      });

      const untrimmedUnsub = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerToken}`,
          },
          body: JSON.stringify({ endpoint, apartmentName: '동탄역롯데캐슬' }),
        })
      );
      expect(untrimmedUnsub.status).toBe(200);
      expect(mockDocStore.get(`push_subscriptions/${legacyId}`)?.apts).toEqual(['동탄 전체']);

      const resubAfterUntrimmed = await pushSubscribePost(
        new NextRequest('https://dongtanview.com/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerToken}`,
          },
          body: JSON.stringify({
            subscription: { endpoint, keys: { p256dh: 'p256-r', auth: 'auth-r' } },
            apartmentName: '동탄역예미지',
          }),
        })
      );
      expect(resubAfterUntrimmed.status).toBe(200);
      expect(mockDocStore.get(`push_subscriptions/${shaId}`)?.apts).not.toContain('동탄역롯데캐슬');
      expect(mockDocStore.get(`push_subscriptions/${shaId}`)?.apts).toEqual(
        expect.arrayContaining(['동탄시범한빛', '동탄 전체', '동탄역예미지'])
      );

      // 2) Single-apartment unsubscribe: concurrent legacyRef NOT_FOUND (code 5) -> 200; transient UNAVAILABLE (code 14) -> 500
      mockDocStore.set(`push_subscriptions/${legacyId}`, {
        uid: 'race-user',
        apts: ['동탄시범한빛'],
        subscription: { endpoint, keys: { p256dh: 'p256-r', auth: 'auth-r' } },
      });
      const notFoundErr = Object.assign(new Error('NOT_FOUND'), { code: 5 });
      mockUpdateErrorByKey.set(`push_subscriptions/${legacyId}`, notFoundErr);
      const raceNotFoundRes = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerToken}`,
          },
          body: JSON.stringify({ endpoint, apartmentName: '동탄시범한빛' }),
        })
      );
      expect(raceNotFoundRes.status).toBe(200);

      const unavailableErr = Object.assign(new Error('UNAVAILABLE'), { code: 14 });
      mockUpdateErrorByKey.set(`push_subscriptions/${legacyId}`, unavailableErr);
      const raceTransientRes = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerToken}`,
          },
          body: JSON.stringify({ endpoint, apartmentName: '동탄 전체' }),
        })
      );
      expect(raceTransientRes.status).toBe(500);
      mockUpdateErrorByKey.clear();

      // 3) Full unsubscribe: transient legacyRef.delete() failure (code 14) -> 500 & MUST NOT clear owner cookie; code 5 -> 200 & clears cookie
      mockDeleteErrorByKey.set(`push_subscriptions/${legacyId}`, unavailableErr);
      const fullUnsubTransient = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerToken}`,
          },
          body: JSON.stringify({ endpoint }),
        })
      );
      expect(fullUnsubTransient.status).toBe(500);
      expect(fullUnsubTransient.cookies.get(PUSH_OWNER_COOKIE_NAME)).toBeUndefined();

      mockDocStore.set(`push_subscriptions/${shaId}`, {
        uid: 'race-user',
        apts: ['동탄역예미지'],
        subscription: { endpoint, keys: { p256dh: 'p256-r', auth: 'auth-r' } },
      });
      mockDeleteErrorByKey.set(`push_subscriptions/${legacyId}`, notFoundErr);
      const fullUnsubNotFound = await pushUnsubscribePost(
        new NextRequest('https://dongtanview.com/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerToken}`,
          },
          body: JSON.stringify({ endpoint }),
        })
      );
      expect(fullUnsubNotFound.status).toBe(200);
      expect(fullUnsubNotFound.cookies.get(PUSH_OWNER_COOKIE_NAME)?.value).toBe('');
      mockDeleteErrorByKey.clear();
    });

    it('enforces official Web Push HTTPS:443 allowlist and private/metadata IP block in scripts/test-push-notification.js while preserving --dry-run', async () => {
      const scriptPath = path.join(FRONTEND_ROOT, 'scripts/test-push-notification.js');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pushCli = require(scriptPath) as {
        isForbiddenIpOrHost: (host: string) => boolean;
        validatePushEndpointUrl: (url: string) => { valid: boolean; reason?: string; normalizedUrl?: string };
        parseArgs: (argv: string[]) => { subscription: string | null; dryRun: boolean };
        resolveSubscription: (flags: { subscription?: string | null; endpoint?: string | null }) => { endpoint: string; keys: { p256dh: string; auth: string } } | null;
        dispatchLivePushNotification: (
          sub: { endpoint: string; keys?: { p256dh?: string; auth?: string } },
          payload: Record<string, unknown>,
          client?: { sendNotification: jest.Mock }
        ) => Promise<{ statusCode: number }>;
      };

      // 0) Single Source of Truth: CLI shares exact policy functions with pushSecurity.ts and urlValidator.ts
      expect(pushCli.validatePushEndpointUrl).toBe(validatePushEndpointUrl);
      expect(pushCli.isForbiddenIpOrHost).toBe(isForbiddenIpOrHost);

      // Expanded IPv6 loopback, unspecified, IPv4-compatible, NAT64, 6to4 private, discard, and docs are forbidden
      for (const forbiddenIpv6 of [
        '0:0:0:0:0:0:0:1',
        '0:0:0:0:0:0:0:0',
        '::0',
        '0000::1',
        '::127.0.0.1',
        '::169.254.169.254',
        '64:ff9b::169.254.169.254',
        '64:ff9b::a9fe:a9fe',
        '64:ff9b:1::10.0.0.1',
        '2002:7f00:0001::1',
        '100::1',
        '2001:db8::1',
        '2001::1',
      ]) {
        expect(isForbiddenIpOrHost(forbiddenIpv6)).toBe(true);
      }
      expect(isForbiddenIpOrHost('2001:4860:4860::8888')).toBe(false);
      expect(isForbiddenIpOrHost('2606:4700:4700::1111')).toBe(false);

      // 1) Official Web Push endpoints pass validation
      for (const validUrl of [
        'https://fcm.googleapis.com/fcm/send/cli-token-1',
        'https://updates.push.services.mozilla.com/wpush/v2/cli-token-2',
        'https://web.push.apple.com/QIcli-token-3',
        'https://wns2-sg2p.notify.windows.com/w/?token=abc%3D',
      ]) {
        expect(pushCli.validatePushEndpointUrl(validUrl).valid).toBe(true);
      }

      // 2) SSRF, non-HTTPS, non-443, credentials, bare notify.windows.com, malformed labels, private/metadata IPs are rejected
      const blockedUrls = [
        'http://fcm.googleapis.com/fcm/send/cli-token-1',
        'https://fcm.googleapis.com:8443/fcm/send/cli-token-1',
        'https://user:pass@fcm.googleapis.com/fcm/send/cli-token-1',
        'https://fcm.googleapis.com/',
        'https://fcm.googleapis.com.evil.com/fcm/send/cli-token-1',
        'https://notify.windows.com/w/?token=xyz',
        'https://-bad.notify.windows.com/w/?token=xyz',
        'https://bad-.notify.windows.com/w/?token=xyz',
        'https://evil.example.com/webhook',
        'https://127.0.0.1/admin',
        'https://10.0.0.1/internal',
        'https://169.254.169.254/latest/meta-data/',
        'https://[::1]/internal',
        'https://[0:0:0:0:0:0:0:1]/internal',
        'https://[fe80::1]/internal',
        'https://[64:ff9b::169.254.169.254]/latest/meta-data/',
        'https://metadata.google.internal/computeMetadata/v1/',
        'https://localhost./admin',
      ];
      for (const badUrl of blockedUrls) {
        expect(pushCli.validatePushEndpointUrl(badUrl).valid).toBe(false);
        const mockClient = { sendNotification: jest.fn() };
        await expect(
          pushCli.dispatchLivePushNotification(
            { endpoint: badUrl, keys: { p256dh: 'k1', auth: 'k2' } },
            { title: 'test' },
            mockClient
          )
        ).rejects.toThrow(/허용되지 않은 Push 엔드포인트/);
        expect(mockClient.sendNotification).not.toHaveBeenCalled();
      }

      // 3) Valid endpoint invokes sendNotification with canonicalized URL
      const okClient = { sendNotification: jest.fn().mockResolvedValue({ statusCode: 201 }) };
      const dispatchRes = await pushCli.dispatchLivePushNotification(
        {
          endpoint: 'https://FCM.GOOGLEAPIS.COM:443/fcm/send/cli-ok',
          keys: { p256dh: 'p256-ok', auth: 'auth-ok' },
        },
        { title: 'real-tx' },
        okClient
      );
      expect(dispatchRes.statusCode).toBe(201);
      expect(okClient.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: 'https://fcm.googleapis.com/fcm/send/cli-ok' }),
        JSON.stringify({ title: 'real-tx' })
      );

      // 4) --subscription=... containing '=' characters (query string & base64 padding) parses cleanly
      const subJson = JSON.stringify({
        endpoint: 'https://wns2-sg2p.notify.windows.com/w/?token=abc==',
        keys: { p256dh: 'p256==', auth: 'auth=' },
      });
      const parsedFlags = pushCli.parseArgs([`--subscription=${subJson}`]);
      expect(parsedFlags.dryRun).toBe(false);
      expect(pushCli.resolveSubscription(parsedFlags)).toEqual(JSON.parse(subJson));

      // 5) Real CLI subprocess blocks SSRF --endpoint and --subscription with non-zero exit code
      const blockedCliEndpoint = spawnSync(
        process.execPath,
        [scriptPath, '--endpoint=https://169.254.169.254/latest/meta-data/'],
        { cwd: FRONTEND_ROOT, encoding: 'utf8' }
      );
      expect(blockedCliEndpoint.status).toBe(1);
      expect(blockedCliEndpoint.stderr).toContain('보안 차단');

      const blockedCliSub = spawnSync(
        process.execPath,
        [
          scriptPath,
          `--subscription=${JSON.stringify({
            endpoint: 'https://evil.example.com/hook',
            keys: { p256dh: 'a', auth: 'b' },
          })}`,
        ],
        { cwd: FRONTEND_ROOT, encoding: 'utf8' }
      );
      expect(blockedCliSub.status).toBe(1);
      expect(blockedCliSub.stderr).toContain('보안 차단');

      // 6) Real CLI subprocess --dry-run continues to work cleanly (exit code 0)
      const ephemeralVapid = webpush.generateVAPIDKeys();
      const dryRunCli = spawnSync(process.execPath, [scriptPath, '--dry-run'], {
        cwd: FRONTEND_ROOT,
        encoding: 'utf8',
        env: {
          ...process.env,
          NEXT_PUBLIC_VAPID_PUBLIC_KEY: ephemeralVapid.publicKey,
          VAPID_PRIVATE_KEY: ephemeralVapid.privateKey,
          VAPID_SUBJECT: 'mailto:security-test@dongtanview.com',
        },
      });
      expect(dryRunCli.status).toBe(0);
      expect(dryRunCli.stdout).toContain('[DRY-RUN 완료]');
    });
  });

  describe('3. [HIGH-01] /api/og bgUrl SSRF & CSS Injection Protection', () => {
    it('allows only whitelisted HTTPS image URLs and rejects SSRF, encoded self-/api bypasses, and CSS url() injection payloads', () => {
      expect(
        sanitizeOgBackgroundUrl(
          'https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls.firebasestorage.app/o/thumbnails%2Fapt.jpg?alt=media'
        )
      ).toContain('firebasestorage.googleapis.com');
      expect(sanitizeOgBackgroundUrl('https://dongtanview.com/og-bg.png')).toBe(
        'https://dongtanview.com/og-bg.png'
      );

      // Trailing-dot DNS & IPv6 multicast hosts MUST be forbidden
      expect(isForbiddenIpOrHost('localhost.')).toBe(true);
      expect(isForbiddenIpOrHost('metadata.google.internal.')).toBe(true);
      expect(isForbiddenIpOrHost('ff02::1')).toBe(true);
      expect(isForbiddenIpOrHost('fe80::1%eth0')).toBe(true);

      // Double-slash, uppercase, and percent-encoded /api self-recursion MUST be blocked in both proxy-image & og
      for (const selfApiBypass of [
        'https://dongtanview.com//api/og?title=recurse',
        'https://dongtanview.com/%61pi/og?title=recurse',
        'https://dongtanview.com/%2561pi/og?title=recurse',
        'https://dongtanview.com/API/og?title=recurse',
        'https://dview.kr//api/proxy-image?url=x',
      ]) {
        expect(validateProxyImageTargetUrl(selfApiBypass).valid).toBe(false);
        expect(sanitizeOgBackgroundUrl(selfApiBypass)).toBeNull();
      }

      for (const badBg of [
        null,
        undefined,
        '',
        'http://169.254.169.254/latest/meta-data/',
        'https://127.0.0.1/secret.png',
        'https://[::1]/secret.png',
        'https://evil.example.com/tracker.png',
        'https://dongtanview.com/api/og?title=recurse',
        'https://dongtanview.com:8443/bg.png',
        'https://dongtanview.com/a.jpg);background-image:url(https://evil.example/x',
        'https://dongtanview.com/a.jpg" onload="alert(1)',
        'https://dongtanview.com/a.jpg;color:red',
        'https://dongtanview.com/a.jpg{color:red}',
        'javascript:alert(1)',
      ]) {
        expect(sanitizeOgBackgroundUrl(badBg)).toBeNull();
      }
    });

    it('invokes GET /api/og end-to-end and drops malicious bgUrl while preserving allowed bgUrl in ImageResponse JSX', async () => {
      for (const maliciousBg of [
        'http://169.254.169.254/latest/meta-data/',
        'https://dongtanview.com/%61pi/og?title=loop',
        'https://dongtanview.com//api/og?title=loop',
        'https://evil.example.com/ssrf.png',
        'https://dongtanview.com/a.jpg);background-image:url(https://evil.example/x',
      ]) {
        capturedOgCalls.length = 0;
        const req = new NextRequest(
          `https://dongtanview.com/api/og?title=Phase0Test&bgUrl=${encodeURIComponent(maliciousBg)}`
        );
        const res = await ogRouteGet(req);
        expect(res.status).toBe(200);
        expect(capturedOgCalls.length).toBe(1);
        const bgStyle = capturedOgCalls[0].element?.props?.style?.backgroundImage || '';
        expect(bgStyle).toBe('linear-gradient(to bottom right, #1e293b, #0f172a)');
        expect(bgStyle).not.toContain('url(');
      }

      // Allowed Firebase Storage image URL passes through safely
      capturedOgCalls.length = 0;
      const safeBg =
        'https://firebasestorage.googleapis.com/v0/b/portfolio-dtdls.firebasestorage.app/o/thumbnails%2Fapt.jpg?alt=media';
      const safeRes = await ogRouteGet(
        new NextRequest(
          `https://dongtanview.com/api/og?title=Phase0Safe&bgUrl=${encodeURIComponent(safeBg)}`
        )
      );
      expect(safeRes.status).toBe(200);
      expect(capturedOgCalls.length).toBe(1);
      expect(capturedOgCalls[0].element?.props?.style?.backgroundImage).toBe(`url(${safeBg})`);
    });
  });

  describe('4. [HIGH-05] Dummy Data Elimination & Service Worker Precache Integrity', () => {
    it('removes public-prices.json and macro-config.ts and ensures every sw.js precached asset exists on disk', () => {
      expect(fs.existsSync(path.join(FRONTEND_ROOT, 'public/data/public-prices.json'))).toBe(false);
      expect(fs.existsSync(path.join(FRONTEND_ROOT, 'src/lib/data/macro-config.ts'))).toBe(false);

      const swContent = fs.readFileSync(path.join(FRONTEND_ROOT, 'public/sw.js'), 'utf8');
      expect(swContent).not.toContain('public-prices.json');

      // Every /data/* or /tx-data/* asset listed in cache.addAll must exist under public/
      const precacheMatch = swContent.match(/cache\.addAll\(\[([\s\S]*?)\]\)/);
      expect(precacheMatch).not.toBeNull();
      const assetUrls = Array.from(precacheMatch![1].matchAll(/'(\/(?:data|tx-data)\/[^']+)'/g)).map(
        (m) => m[1]
      );
      expect(assetUrls.length).toBeGreaterThan(0);
      for (const assetUrl of assetUrls) {
        const diskPath = path.join(FRONTEND_ROOT, 'public', assetUrl.replace(/^\//, ''));
        expect(fs.existsSync(diskPath)).toBe(true);
      }
    });

    it('removes synthetic mock generation from analytics-service.ts', async () => {
      const src = fs.readFileSync(path.join(FRONTEND_ROOT, 'src/lib/analytics-service.ts'), 'utf8');
      expect(src).not.toContain('generateMockAdminAnalytics');
      expect(src).not.toContain('12450');

      const origEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      const origKey = process.env.GOOGLE_PRIVATE_KEY;
      const origProp = process.env.GA_PROPERTY_ID;
      try {
        delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
        delete process.env.GOOGLE_PRIVATE_KEY;
        delete process.env.GA_PROPERTY_ID;
        const result = await getAdminAnalyticsLKG();
        expect(result).toEqual({
          daily: [],
          monthly: [],
          totalViews: 0,
          avgSessionDuration: '0m 0s',
          isMock: false,
        });
      } finally {
        if (origEmail !== undefined) process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = origEmail;
        if (origKey !== undefined) process.env.GOOGLE_PRIVATE_KEY = origKey;
        if (origProp !== undefined) process.env.GA_PROPERTY_ID = origProp;
      }
    });
  });

  describe('5. [CRIT-01] Single Firebase Deployment Root Configuration', () => {
    it('defines root .firebaserc for portfolio-dtdls and eliminates duplicate frontend Firebase configs', () => {
      const firebasercPath = path.join(REPO_ROOT, '.firebaserc');
      expect(fs.existsSync(firebasercPath)).toBe(true);
      const firebaserc = JSON.parse(fs.readFileSync(firebasercPath, 'utf8'));
      expect(firebaserc?.projects?.default).toBe('portfolio-dtdls');

      expect(fs.existsSync(path.join(FRONTEND_ROOT, 'firebase.json'))).toBe(false);
      expect(fs.existsSync(path.join(FRONTEND_ROOT, 'firestore.indexes.json'))).toBe(false);
    });
  });

  describe('6. [CRIT-04] & [HIGH-03] CI High/Critical Audit Gate & UID Path Sanitization Parity', () => {
    it('enforces a hard npm audit --audit-level=high gate in .github/workflows/ci.yml', () => {
      const ciPath = path.join(REPO_ROOT, '.github/workflows/ci.yml');
      const ciContent = fs.readFileSync(ciPath, 'utf8');
      const auditLineMatch = ciContent.match(/^\s*run:\s*(npm audit --audit-level=high[^\r\n]*)$/m);
      expect(auditLineMatch).not.toBeNull();
      // Must be a hard failing gate (never bypassed with || true)
      expect(auditLineMatch![1]).not.toContain('|| true');
      // Verify the Security Audit step block does not set continue-on-error: true
      const auditStepMatch = ciContent.match(
        /-\s+name:\s+[^\r\n]*Audit[^\r\n]*\r?\n([\s\S]*?)(?=\r?\n\s*-\s+name:|$)/i
      );
      expect(auditStepMatch).not.toBeNull();
      expect(auditStepMatch![1]).not.toMatch(/continue-on-error:\s*true/);
    });

    it('sanitizes UID path separators consistently across PhotoUploadModal, reportService, and review.repository', () => {
      const uploadSources = [
        {
          file: path.join(FRONTEND_ROOT, 'src/components/apartment-modal/PhotoUploadModal.tsx'),
          pathPattern: /user_pending_photos\/\$\{safeUid\}/,
        },
        {
          file: path.join(FRONTEND_ROOT, 'src/lib/services/reportService.ts'),
          pathPattern: /field_reports\/\$\{safeAuthorUid\}/,
        },
        {
          file: path.join(FRONTEND_ROOT, 'src/lib/repositories/review.repository.ts'),
          pathPattern: /user_reviews\/\$\{safeAuthorUid\}/,
        },
      ];

      for (const { file, pathPattern } of uploadSources) {
        const src = fs.readFileSync(file, 'utf8');
        expect(src).toContain('.replace(/[\\\\/]/g, \'_\')');
        expect(src).toContain("=== '.'");
        expect(src).toContain("=== '..'");
        expect(src).toMatch(pathPattern);
      }

      const photoModalSrc = fs.readFileSync(
        path.join(FRONTEND_ROOT, 'src/components/apartment-modal/PhotoUploadModal.tsx'),
        'utf8'
      );
      expect(photoModalSrc).not.toContain('user_pending_photos/${user.uid}');
    });

    it('rejects traversal, empty-segment, backslash, and control-char folder paths in storage.service uploadImage', async () => {
      const { uploadImage } = await import('@/lib/services/storage.service');
      const sampleFile = new File([new Uint8Array([1, 2, 3])], 'sample.jpg', { type: 'image/jpeg' });

      for (const badFolder of [
        '',
        '   ',
        'field_reports/..',
        'field_reports/.',
        'user_reviews/../admin',
        'user_pending_photos/',
        '/user_pending_photos/u1',
        'field_reports//u1',
        'field_reports/u1\\evil',
        'user_pending_photos/u1\u0000evil',
        'user_pending_photos/u1\nevil',
      ]) {
        await expect(uploadImage(sampleFile, badFolder)).rejects.toThrow(/Invalid storage folder path/);
      }
    });
  });
});
