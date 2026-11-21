/**
 * @file push_notification_redesign.test.tsx
 * @description Verifies the redesigned Dongtan-wide + selectable complex push notification experience:
 *  1. Copy compliance: zero "즉시", zero "갭(Gap)", zero "평일 07" misleading copy
 *  2. Selectable notification scopes: "동탄 전체 + 이 단지" (default), "동탄 전체만", "이 단지만"
 *  3. In-modal 1-Click unsubscribe ("알림 끄기") & live self-test notification ("테스트 알림 받기")
 *  4. POST /api/push/test endpoint validation, missing-VAPID 503 guard, and real-data payload dispatch
 *  5. Static security guardrail: zero hardcoded exposed VAPID private/public keys in source or scripts
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

const mockSubscribeToPush = jest.fn();
const mockUnsubscribeFromPush = jest.fn();
const mockShowToast = jest.fn();
const mockTriggerCustomA2HSModal = jest.fn();

let mockPwaContextState = {
  isPushSupported: true,
  pushSubscription: null as PushSubscription | null,
  subscribeToPush: mockSubscribeToPush,
  unsubscribeFromPush: mockUnsubscribeFromPush,
  showToast: mockShowToast,
  isIOS: false,
  isStandalone: false,
  triggerCustomA2HSModal: mockTriggerCustomA2HSModal,
};

jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => mockPwaContextState,
}));

jest.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

jest.mock('@/lib/utils/analytics', () => ({
  trackEvent: jest.fn(),
}));

jest.mock('@/lib/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

jest.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

import PushSubscriptionModal from '@/components/pwa/PushSubscriptionModal';
import webpush from 'web-push';
import { POST as testPushPost } from '@/app/api/push/test/route';
import {
  PUSH_OWNER_COOKIE_NAME,
  createPushOwnershipToken,
} from '@/lib/push/pushSecurity';

describe('Push Notification Redesign & End-to-End Verification', () => {
  const originalFetch = global.fetch;
  const originalPubKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const originalPrivKey = process.env.VAPID_PRIVATE_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    mockSubscribeToPush.mockResolvedValue(true);
    mockUnsubscribeFromPush.mockResolvedValue(true);
    mockPwaContextState = {
      isPushSupported: true,
      pushSubscription: null,
      subscribeToPush: mockSubscribeToPush,
      unsubscribeFromPush: mockUnsubscribeFromPush,
      showToast: mockShowToast,
      isIOS: false,
      isStandalone: false,
      triggerCustomA2HSModal: mockTriggerCustomA2HSModal,
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  afterAll(() => {
    if (originalPubKey === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = originalPubKey;
    if (originalPrivKey === undefined) delete process.env.VAPID_PRIVATE_KEY;
    else process.env.VAPID_PRIVATE_KEY = originalPrivKey;
  });

  describe('1. Copy Overhaul & Zero-Misleading Claims', () => {
    it('removes "즉시", "갭(Gap)", and "평일 07" from apartment context modal', () => {
      render(
        <PushSubscriptionModal
          isOpen={true}
          onClose={jest.fn()}
          aptName="동탄역 롯데캐슬"
          canonicalSlug="동탄역롯데캐슬"
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog.textContent).not.toContain('즉시');
      expect(dialog.textContent).not.toContain('갭(Gap)');
      expect(dialog.textContent).not.toContain('평일 07');
      expect(dialog.textContent).not.toContain('전세 신고가');
      expect(dialog).toHaveTextContent('매일 오전 7시대');
      expect(dialog).toHaveTextContent('언제든 알림 끄기');
    });

    it('renders global Dongtan-wide mode cleanly when opened with "동탄 전체"', async () => {
      const onClose = jest.fn();
      render(<PushSubscriptionModal isOpen={true} onClose={onClose} aptName="동탄 전체" />);

      expect(screen.getByText('동탄 전체 실거래가 알림')).toBeInTheDocument();
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '실거래가 알림 신청하기' }));
      await waitFor(() => {
        expect(mockSubscribeToPush).toHaveBeenCalledWith(null, '동탄 전체', {
          includeGuestFavorites: false,
        });
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('2. Selectable Notification Scope in Apartment Context', () => {
    it('defaults to "동탄 전체 + 이 단지" and allows switching to "동탄 전체만" or "이 단지만"', async () => {
      const onClose = jest.fn();
      const { rerender } = render(
        <PushSubscriptionModal
          isOpen={true}
          onClose={onClose}
          aptName="동탄역 롯데캐슬"
          canonicalSlug="동탄역롯데캐슬"
        />
      );

      const optBoth = screen.getByTestId('push-scope-all-plus-complex');
      const optAll = screen.getByTestId('push-scope-all-only');
      const optComplex = screen.getByTestId('push-scope-complex-only');

      expect(optBoth).toHaveAttribute('aria-checked', 'true');
      expect(optAll).toHaveAttribute('aria-checked', 'false');
      expect(optComplex).toHaveAttribute('aria-checked', 'false');

      // Select "동탄 전체만"
      fireEvent.click(optAll);
      expect(optAll).toHaveAttribute('aria-checked', 'true');
      fireEvent.click(screen.getByRole('button', { name: '실거래가 알림 신청하기' }));
      await waitFor(() => {
        expect(mockSubscribeToPush).toHaveBeenLastCalledWith(null, '동탄 전체', {
          includeGuestFavorites: false,
        });
      });

      // Re-open and select "이 단지만"
      rerender(
        <PushSubscriptionModal
          isOpen={false}
          onClose={onClose}
          aptName="동탄역 롯데캐슬"
          canonicalSlug="동탄역롯데캐슬"
        />
      );
      rerender(
        <PushSubscriptionModal
          isOpen={true}
          onClose={onClose}
          aptName="동탄역 롯데캐슬"
          canonicalSlug="동탄역롯데캐슬"
        />
      );

      fireEvent.click(screen.getByTestId('push-scope-complex-only'));
      fireEvent.click(screen.getByRole('button', { name: '실거래가 알림 신청하기' }));
      await waitFor(() => {
        expect(mockSubscribeToPush).toHaveBeenLastCalledWith(null, '동탄역롯데캐슬');
      });
    });
  });

  describe('3. Active Subscription Card: In-Modal 1-Click Unsubscribe & Live Test Push', () => {
    it('renders subscribed targets, sends self-test push, and triggers 1-Click unsubscribe', async () => {
      const fakePushSub = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/live-device-001',
        toJSON: () => ({
          endpoint: 'https://fcm.googleapis.com/fcm/send/live-device-001',
          keys: { p256dh: 'p256-sample', auth: 'auth-sample' },
        }),
      } as unknown as PushSubscription;

      mockPwaContextState = {
        ...mockPwaContextState,
        pushSubscription: fakePushSub,
      };

      const fetchMock = jest.fn().mockImplementation((url: string) => {
        if (url.startsWith('/api/push/subscribe?endpoint=')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true, data: { apts: ['동탄 전체', '동탄역롯데캐슬'] } }),
          });
        }
        if (url === '/api/push/test') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: { statusCode: 201, title: '[테스트] 동탄 실거래 알림 연결 완료' },
            }),
          });
        }
        return Promise.resolve({ ok: false, json: async () => ({}) });
      });
      global.fetch = fetchMock as unknown as typeof fetch;

      render(
        <PushSubscriptionModal
          isOpen={true}
          onClose={jest.fn()}
          aptName="동탄역 롯데캐슬"
          canonicalSlug="동탄역롯데캐슬"
        />
      );

      expect(screen.getByTestId('push-active-subscription-card')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByText('동탄 전체')).toBeInTheDocument();
        expect(screen.getByText('동탄역 롯데캐슬')).toBeInTheDocument();
      });

      // Click "테스트 알림 받기"
      fireEvent.click(screen.getByTestId('push-send-test-btn'));
      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith(
          '/api/push/test',
          expect.objectContaining({ method: 'POST' })
        );
        expect(screen.getByTestId('push-test-feedback')).toHaveTextContent(
          '테스트 알림을 보냈습니다'
        );
      });

      // Click 1-Click "알림 끄기"
      fireEvent.click(screen.getByTestId('push-unsubscribe-all-btn'));
      await waitFor(() => {
        expect(mockUnsubscribeFromPush).toHaveBeenCalledWith(null);
      });
    });
  });

  describe('4. POST /api/push/test Self-Test Route Handler', () => {
    it('rejects missing VAPID keys with 503', async () => {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;

      const req = new NextRequest('http://localhost:5000/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/self-test-1',
            keys: { p256dh: 'p256-key', auth: 'auth-key' },
          },
        }),
      });

      const res = await testPushPost(req);
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.code).toBe('VAPID_NOT_CONFIGURED');
    });

    it('rejects untrusted SSRF push endpoints with 400 and never calls webpush', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY =
        'BTestPublicKeyForJestUnitVerificationOnly0123456789abcdefghijklmnopqrstuvwxyzABCDEFGH';
      process.env.VAPID_PRIVATE_KEY = 'TestPrivateKeyForJestUnitVerificationOnly0123';

      for (const maliciousEndpoint of [
        'https://evil.example.com/webhook',
        'http://169.254.169.254/latest/meta-data/',
        'https://127.0.0.1/internal',
        'https://fcm.googleapis.com:8443/fcm/send/port-bypass',
        'https://fcm.googleapis.com.evil.com/fcm/send/suffix-bypass',
      ]) {
        const req = new NextRequest('http://localhost:5000/api/push/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: {
              endpoint: maliciousEndpoint,
              keys: { p256dh: 'p256-key', auth: 'auth-key' },
            },
          }),
        });
        const res = await testPushPost(req);
        expect(res.status).toBe(400);
        expect(webpush.sendNotification).not.toHaveBeenCalled();
      }
    });

    it('rejects unauthenticated or mismatched-cookie test push requests with 401', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY =
        'BTestPublicKeyForJestUnitVerificationOnly0123456789abcdefghijklmnopqrstuvwxyzABCDEFGH';
      process.env.VAPID_PRIVATE_KEY = 'TestPrivateKeyForJestUnitVerificationOnly0123';

      const req = new NextRequest('http://localhost:5000/api/push/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/self-test-unauth',
            keys: { p256dh: 'p256-key-2', auth: 'auth-key-2' },
          },
        }),
      });
      const res = await testPushPost(req);
      expect(res.status).toBe(401);
      expect(webpush.sendNotification).not.toHaveBeenCalled();

      const wrongToken = createPushOwnershipToken('https://fcm.googleapis.com/fcm/send/other-device')!;
      const forgedReq = new NextRequest('http://localhost:5000/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${PUSH_OWNER_COOKIE_NAME}=${wrongToken}`,
        },
        body: JSON.stringify({
          subscription: {
            endpoint: 'https://fcm.googleapis.com/fcm/send/self-test-unauth',
            keys: { p256dh: 'p256-key-2', auth: 'auth-key-2' },
          },
        }),
      });
      const forgedRes = await testPushPost(forgedReq);
      expect(forgedRes.status).toBe(401);
      expect(webpush.sendNotification).not.toHaveBeenCalled();
    });

    it('sends a single real-data test notification strictly to the verified owner subscription', async () => {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY =
        'BTestPublicKeyForJestUnitVerificationOnly0123456789abcdefghijklmnopqrstuvwxyzABCDEFGH';
      process.env.VAPID_PRIVATE_KEY = 'TestPrivateKeyForJestUnitVerificationOnly0123';
      (webpush.sendNotification as jest.Mock).mockResolvedValueOnce({ statusCode: 201 });

      const endpoint = 'https://fcm.googleapis.com/fcm/send/self-test-2';
      const ownerToken = createPushOwnershipToken(endpoint)!;
      expect(ownerToken).toBeTruthy();

      const req = new NextRequest('http://localhost:5000/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie: `${PUSH_OWNER_COOKIE_NAME}=${ownerToken}`,
        },
        body: JSON.stringify({
          subscription: {
            endpoint,
            keys: { p256dh: 'p256-key-2', auth: 'auth-key-2' },
          },
        }),
      });

      const res = await testPushPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.title).toContain('[테스트] 동탄 실거래 알림 연결 완료');
      expect(json.data.latestCount).toBeGreaterThan(0);
      expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Static Security Guardrail (Zero Hardcoded Exposed VAPID Keys)', () => {
    it('contains zero occurrences of retired VAPID key hashes or hardcoded VAPID fallback literals in source, scripts, or tests', () => {
      // One-way SHA-256 fingerprints of retired legacy VAPID keypair (zero plaintext key material in repo)
      const retiredKeySha256Fingerprints = new Set([
        'af4e47b3685114a47c3096c5ad91abe844df28b042fc4dda11b43ab408167182',
        '4ef355042d40d07aec09d36ac06abdf5fec9e8b3177b443c0ac073ef794699d4',
      ]);

      const filesToScan = [
        path.resolve(__dirname, '../app/api/cron/send-tx-notifications/route.ts'),
        path.resolve(__dirname, '../app/api/push/notify-new-high/route.ts'),
        path.resolve(__dirname, '../app/api/push/test/route.ts'),
        path.resolve(__dirname, '../app/api/push/subscribe/route.ts'),
        path.resolve(__dirname, '../app/api/push/unsubscribe/route.ts'),
        path.resolve(__dirname, '../components/pwa/PWAProvider.tsx'),
        path.resolve(__dirname, '../lib/push/vapidConfig.ts'),
        path.resolve(__dirname, '../lib/push/pushSecurity.ts'),
        path.resolve(__dirname, '../../scripts/test-push-notification.js'),
        __filename,
      ];

      const quotedLiteralPattern = /['"]([A-Za-z0-9_-]{43}|[A-Za-z0-9_-]{87})['"]/g;
      for (const filePath of filesToScan) {
        const content = fs.readFileSync(filePath, 'utf8');
        let match: RegExpExecArray | null;
        while ((match = quotedLiteralPattern.exec(content)) !== null) {
          const digest = crypto.createHash('sha256').update(match[1], 'utf8').digest('hex');
          expect(retiredKeySha256Fingerprints.has(digest)).toBe(false);
        }
        // Production runtime modules & scripts must never embed hardcoded VAPID fallback literals
        if (filePath !== __filename) {
          expect(content).not.toMatch(/VAPID_(?:PUBLIC|PRIVATE)_KEY\s*\|\|\s*['"][A-Za-z0-9_-]{30,}['"]/);
        }
      }
    });
  });
});
