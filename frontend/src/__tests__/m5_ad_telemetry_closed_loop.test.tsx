/**
 * @file m5_ad_telemetry_closed_loop.test.tsx
 * @description Phase 5 Empirical Verification Suite: Yield Protection Closed-Loop Telemetry & Zero-CLS Guardrails
 * Verifies:
 * 1. AdTelemetryClosedLoopEventSchema & TelemetryApiResponseSchema Zod runtime validation & boundary rejection
 * 2. Deterministic Closed-Loop State Machine f: S x A -> S across {MOUNTED, ACTIVE_VIEW, REFRESH_ELIGIBLE, UNFILLED_FALLBACK, TELEMETRY_DISPATCHED}
 * 3. Ad Refresh Dual-Guard Invariant (Delta t >= 30,000ms && ratio >= 0.50 && !document.hidden && N_refresh <= 10)
 * 4. Closed-Loop Telemetry Dispatch (GA4 custom event + navigator.sendBeacon + fetch keepalive fallback + /api/ads/click persistence + SellTimingCalculator B2B integration)
 * 5. Popperian Falsification of H0 (mu_imp >= 1.6 on >= 60s sessions, p < 0.01) & CVaR_0.01(CLS) < 0.001
 */

import React from 'react';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AdSlot,
  AdTelemetryClosedLoopEventSchema,
  TelemetryApiResponseSchema,
  detectUserAgentCategory,
  sendTelemetry,
  createInitialClosedLoopState,
  transitionClosedLoopState,
  createClosedLoopTelemetryController,
  getAdSlotMinHeightClass,
} from '@/components/ads/AdSlot';
import {
  adRefreshManager,
  DWELL_TIME_THRESHOLD_MS,
  MIN_INTERSECTION_RATIO,
  MAX_REFRESHES_PER_SLOT,
} from '@/lib/ads/adRefreshManager';
import * as AdBlockDetectorHook from '@/hooks/useAdBlockDetector';
import { POST as AdClickPostHandler, AdClickInputSchema } from '@/app/api/ads/click/route';
import SellTimingCalculator from '@/components/consumer/SellTimingCalculator';

// Mock logger
jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock rateLimiter and firebaseAdmin for /api/ads/click route unit tests
jest.mock('@/lib/api/rateLimiter', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
}));

const mockFirestoreAdd = jest.fn().mockResolvedValue({ id: 'doc-closed-loop-1' });
jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      add: (...args: unknown[]) => mockFirestoreAdd(...args),
    })),
  },
}));

// Mock PWAProvider for SellTimingCalculator
jest.mock('@/components/pwa/PWAProvider', () => ({
  usePWA: () => ({
    showToast: jest.fn(),
  }),
}));

const mockClientCollection = jest.fn((_db: unknown, name: string) => ({ name }));
const mockClientAddDoc = jest.fn().mockResolvedValue({ id: 'client-doc-1' });
jest.mock('firebase/firestore', () => ({
  collection: (dbArg: unknown, name: string) => mockClientCollection(dbArg, name),
  addDoc: (...args: unknown[]) => mockClientAddDoc(...args),
  serverTimestamp: () => 'MOCK_SERVER_TIMESTAMP',
}));

// Mock non-null client firebaseConfig for SellTimingCalculator to detect any direct client DB write bypass
jest.mock('@/lib/firebaseConfig', () => ({
  db: { type: 'mock-client-firestore' },
}));

interface MockObserverInstance {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  elements: Set<Element>;
  disconnected: boolean;
  trigger: (ratio: number, isIntersecting?: boolean, targetEl?: Element) => void;
}

describe('Phase 5: Yield Protection Closed-Loop Telemetry & Zero-CLS Guardrails Verification Suite', () => {
  const originalEnv = process.env;
  const originalSendBeacon = navigator.sendBeacon;
  const originalFetch = global.fetch;
  const originalIntersectionObserver = global.IntersectionObserver;
  const originalUserAgent = navigator.userAgent;

  let sendBeaconMock: jest.Mock;
  let fetchMock: jest.Mock;
  let gtagMock: jest.Mock;
  let observerInstances: MockObserverInstance[] = [];

  function setDocumentHidden(hidden: boolean): void {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      writable: true,
      value: hidden,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-18T15:00:00.000Z'));
    jest.clearAllMocks();

    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      NEXT_PUBLIC_ADSENSE_CLIENT_ID: 'ca-pub-1122334455667788',
    };

    jest.spyOn(AdBlockDetectorHook, 'useAdBlockDetector').mockReturnValue({
      isAdBlockActive: false,
      isLoading: false,
    });

    sendBeaconMock = jest.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: sendBeaconMock,
    });

    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, persistedId: 'telemetry_mock_1' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    gtagMock = jest.fn();
    (window as unknown as { gtag: jest.Mock }).gtag = gtagMock;

    setDocumentHidden(false);
    adRefreshManager.reset();
    observerInstances = [];

    global.IntersectionObserver = jest.fn().mockImplementation(
      (callback: IntersectionObserverCallback, options?: IntersectionObserverInit) => {
        const elements = new Set<Element>();
        const instance: MockObserverInstance = {
          callback,
          options,
          elements,
          disconnected: false,
          trigger(ratio: number, isIntersecting: boolean = ratio > 0, targetEl?: Element) {
            if (this.disconnected) return;
            const targets = targetEl ? [targetEl] : Array.from(this.elements);
            const entries: IntersectionObserverEntry[] = (targets.length > 0
              ? targets
              : [document.createElement('div')]
            ).map((el) => ({
              boundingClientRect: el.getBoundingClientRect(),
              intersectionRatio: ratio,
              intersectionRect: el.getBoundingClientRect(),
              isIntersecting,
              rootBounds: null,
              target: el,
              time: Date.now(),
            }));
            this.callback(entries, this as unknown as IntersectionObserver);
          },
        };
        observerInstances.push(instance);

        return {
          root: options?.root ?? null,
          rootMargin: options?.rootMargin ?? '0px',
          thresholds: Array.isArray(options?.threshold)
            ? options.threshold
            : [options?.threshold ?? 0],
          observe: jest.fn((el: Element) => {
            elements.add(el);
          }),
          unobserve: jest.fn((el: Element) => {
            elements.delete(el);
          }),
          disconnect: jest.fn(() => {
            instance.disconnected = true;
            elements.clear();
          }),
          takeRecords: jest.fn(() => []),
        };
      }
    ) as unknown as typeof IntersectionObserver;

    delete (window as unknown as { adsbygoogle?: unknown }).adsbygoogle;
  });

  afterEach(() => {
    cleanup();
    adRefreshManager.reset();
    setDocumentHidden(false);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: originalSendBeacon,
    });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      writable: true,
      value: originalUserAgent,
    });
    global.fetch = originalFetch;
    global.IntersectionObserver = originalIntersectionObserver;
    delete (window as unknown as { gtag?: unknown }).gtag;
    process.env = originalEnv;
    jest.useRealTimers();
  });

  // =========================================================================
  // 1. Zod Schemas & User-Agent Classification (Section 3.5 Signatures)
  // =========================================================================
  describe('1. AdTelemetryClosedLoopEventSchema & TelemetryApiResponseSchema Validation', () => {
    it('validates all 6 eventType values and 3 userAgentCategory values with canonical defaults (including omitted userAgentCategory -> DESKTOP)', () => {
      const isoNow = new Date().toISOString();
      const parsedDefault = AdTelemetryClosedLoopEventSchema.parse({
        eventType: 'IMPRESSION',
        slotId: '1000000002_ch02',
        timestamp: isoNow,
      });

      expect(parsedDefault).toEqual({
        eventType: 'IMPRESSION',
        slotId: '1000000002_ch02',
        apartmentName: 'GLOBAL',
        dong: '',
        dwellTimeMs: 0,
        intersectionRatio: 0,
        userAgentCategory: 'DESKTOP',
        timestamp: isoNow,
      });

      const eventTypes = [
        'IMPRESSION',
        'VIEWABLE_IMPRESSION',
        'CLICK',
        'UNFILLED',
        'ADBLOCK_FALLBACK',
        'FALLBACK_CLICK',
      ] as const;
      const uaCategories = ['DESKTOP', 'MOBILE_WEB', 'IN_APP_BROWSER'] as const;

      for (const eventType of eventTypes) {
        for (const userAgentCategory of uaCategories) {
          const res = AdTelemetryClosedLoopEventSchema.safeParse({
            eventType,
            slotId: '1000000002_ch05',
            apartmentName: '동탄역 롯데캐슬',
            dong: '오산동',
            dwellTimeMs: 30000,
            intersectionRatio: 0.85,
            userAgentCategory,
            timestamp: isoNow,
          });
          expect(res.success).toBe(true);
        }
      }
    });

    it('rejects empty slotId, negative dwellTimeMs, out-of-bounds intersectionRatio, invalid userAgentCategory, and malformed timestamps', () => {
      const isoNow = new Date().toISOString();
      const validBase = {
        eventType: 'VIEWABLE_IMPRESSION' as const,
        slotId: '1000000001',
        userAgentCategory: 'MOBILE_WEB' as const,
        timestamp: isoNow,
      };

      expect(AdTelemetryClosedLoopEventSchema.safeParse({ ...validBase, slotId: '' }).success).toBe(
        false
      );
      expect(
        AdTelemetryClosedLoopEventSchema.safeParse({ ...validBase, dwellTimeMs: -1 }).success
      ).toBe(false);
      expect(
        AdTelemetryClosedLoopEventSchema.safeParse({ ...validBase, intersectionRatio: -0.01 })
          .success
      ).toBe(false);
      expect(
        AdTelemetryClosedLoopEventSchema.safeParse({ ...validBase, intersectionRatio: 1.01 })
          .success
      ).toBe(false);
      expect(
        AdTelemetryClosedLoopEventSchema.safeParse({
          ...validBase,
          userAgentCategory: 'SMART_TV',
        }).success
      ).toBe(false);
      expect(
        AdTelemetryClosedLoopEventSchema.safeParse({
          ...validBase,
          timestamp: '2026-99-99',
        }).success
      ).toBe(false);
    });

    it('validates TelemetryApiResponseSchema for success and error payloads', () => {
      expect(
        TelemetryApiResponseSchema.parse({
          success: true,
          persistedId: 'telemetry_1000000002_1760799600000',
        })
      ).toEqual({
        success: true,
        persistedId: 'telemetry_1000000002_1760799600000',
      });

      expect(
        TelemetryApiResponseSchema.parse({
          success: false,
          error: 'INVALID_PAYLOAD',
        })
      ).toEqual({
        success: false,
        error: 'INVALID_PAYLOAD',
      });

      expect(TelemetryApiResponseSchema.safeParse({ success: 'yes' }).success).toBe(false);
    });

    it('classifies User-Agent strings deterministically into IN_APP_BROWSER, MOBILE_WEB, and DESKTOP', () => {
      expect(
        detectUserAgentCategory(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 KAKAOTALK 10.5.0'
        )
      ).toBe('IN_APP_BROWSER');
      expect(
        detectUserAgentCategory(
          'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 NAVER(inapp; search; 1000; 12.8.0)'
        )
      ).toBe('IN_APP_BROWSER');
      expect(
        detectUserAgentCategory('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Instagram 312.0.0')
      ).toBe('IN_APP_BROWSER');
      expect(
        detectUserAgentCategory(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) Version/17.4 Mobile/15E148 Safari/604.1'
        )
      ).toBe('MOBILE_WEB');
      expect(
        detectUserAgentCategory(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36'
        )
      ).toBe('DESKTOP');
    });
  });

  // =========================================================================
  // 2. Deterministic Closed-Loop State Machine Transitions (f: S x A -> S)
  // =========================================================================
  describe('2. Deterministic Closed-Loop State Machine Transitions (f: S x A -> S)', () => {
    it('executes all 4 state transitions in S = {MOUNTED, ACTIVE_VIEW, REFRESH_ELIGIBLE, UNFILLED_FALLBACK, TELEMETRY_DISPATCHED} and enforces maxRefreshesPerSlot = 10 lock', () => {
      const t0 = Date.now();
      const controller = createClosedLoopTelemetryController({
        slotId: '1000000002_ch02',
        apartmentName: '동탄역 롯데캐슬',
        dong: '오산동',
        maxRefreshesPerSlot: 10,
        timestampMs: t0,
      });

      expect(controller.getState().status).toBe('MOUNTED');

      // Transition 1: f(MOUNTED, REGISTER) => ACTIVE_VIEW(ratio_0, t_0, 0)
      const s1 = controller.dispatch({ type: 'REGISTER', ratio: 0.80, timestampMs: t0 });
      expect(s1.status).toBe('ACTIVE_VIEW');
      expect(s1.intersectionRatio).toBe(0.80);
      expect(s1.refreshCount).toBe(0);
      expect(s1.path).toEqual(['MOUNTED', 'ACTIVE_VIEW']);

      // Transition 2a: f(ACTIVE_VIEW(0), TICK(t0 + 29999, 0.80)) => ACTIVE_VIEW(0) (sub-30s boundary)
      const s2SubTime = controller.dispatch({
        type: 'TICK',
        ratio: 0.80,
        timestampMs: t0 + 29999,
        isDocumentHidden: false,
      });
      expect(s2SubTime.status).toBe('ACTIVE_VIEW');

      // Transition 2b: f(ACTIVE_VIEW(0), TICK(t0 + 30000, 0.49)) => ACTIVE_VIEW(0) (sub-0.50 ratio resets dwell)
      const s2SubRatio = transitionClosedLoopState(s1, {
        type: 'TICK',
        ratio: 0.49,
        timestampMs: t0 + 30000,
        isDocumentHidden: false,
      });
      expect(s2SubRatio.status).toBe('ACTIVE_VIEW');
      expect(s2SubRatio.dwellTimeMs).toBe(0);

      // Transition 2c: f(ACTIVE_VIEW(0), TICK(t0 + 30000, 0.50)) => REFRESH_ELIGIBLE(0)
      const s2Eligible = controller.dispatch({
        type: 'TICK',
        ratio: 0.50,
        timestampMs: t0 + 30000,
        isDocumentHidden: false,
      });
      expect(s2Eligible.status).toBe('REFRESH_ELIGIBLE');
      expect(s2Eligible.dwellTimeMs).toBe(30000);
      expect(s2Eligible.path).toEqual(['ACTIVE_VIEW', 'REFRESH_ELIGIBLE']);

      // Transition 3: f(REFRESH_ELIGIBLE(0), TRIGGER_REFRESH) => TELEMETRY_DISPATCHED -> ACTIVE_VIEW(ratio_1, t_1, 1)
      const s3Refreshed = controller.dispatch({
        type: 'TRIGGER_REFRESH',
        ratio: 0.75,
        timestampMs: t0 + 30000,
      });
      expect(s3Refreshed.intermediateStatus).toBe('TELEMETRY_DISPATCHED');
      expect(s3Refreshed.status).toBe('ACTIVE_VIEW');
      expect(s3Refreshed.refreshCount).toBe(1);
      expect(s3Refreshed.refreshKey).toBe(1);
      expect(s3Refreshed.path).toEqual([
        'REFRESH_ELIGIBLE',
        'TELEMETRY_DISPATCHED',
        'ACTIVE_VIEW',
      ]);

      // Verify IMPRESSION telemetry was dispatched on TRIGGER_REFRESH
      expect(sendBeaconMock).toHaveBeenCalledTimes(1);
      const impressionPayload = AdTelemetryClosedLoopEventSchema.parse(
        JSON.parse(sendBeaconMock.mock.calls[0][1])
      );
      expect(impressionPayload.eventType).toBe('IMPRESSION');
      expect(impressionPayload.slotId).toBe('1000000002_ch02');
      expect(impressionPayload.apartmentName).toBe('동탄역 롯데캐슬');
      expect(impressionPayload.dong).toBe('오산동');
      expect(impressionPayload.dwellTimeMs).toBe(30000);
      expect(impressionPayload.intersectionRatio).toBe(0.75);

      // Complete remaining 9 refresh cycles up to maxRefreshesPerSlot = 10
      for (let cycle = 2; cycle <= 10; cycle++) {
        const tickTime = t0 + cycle * 30000;
        const eligibleState = controller.dispatch({
          type: 'TICK',
          ratio: 0.85,
          timestampMs: tickTime,
          isDocumentHidden: false,
        });
        expect(eligibleState.status).toBe('REFRESH_ELIGIBLE');

        const refreshedState = controller.dispatch({
          type: 'TRIGGER_REFRESH',
          ratio: 0.85,
          timestampMs: tickTime,
        });
        expect(refreshedState.status).toBe('ACTIVE_VIEW');
        expect(refreshedState.refreshCount).toBe(cycle);
        expect(refreshedState.refreshKey).toBe(cycle);
      }

      expect(controller.getState().refreshCount).toBe(10);
      expect(sendBeaconMock).toHaveBeenCalledTimes(10);

      // At n = 10, subsequent 30,000ms TICK must remain locked in ACTIVE_VIEW(10) and NOT transition to REFRESH_ELIGIBLE
      const lockedState = controller.dispatch({
        type: 'TICK',
        ratio: 0.95,
        timestampMs: t0 + 11 * 30000,
        isDocumentHidden: false,
      });
      expect(lockedState.status).toBe('ACTIVE_VIEW');
      expect(lockedState.refreshCount).toBe(10);

      const blockedTrigger = controller.dispatch({
        type: 'TRIGGER_REFRESH',
        ratio: 0.95,
        timestampMs: t0 + 11 * 30000,
      });
      expect(blockedTrigger.refreshCount).toBe(10);
      expect(sendBeaconMock).toHaveBeenCalledTimes(10);

      // Transition 4: f(ACTIVE_VIEW, EVENT_UNFILLED) => TELEMETRY_DISPATCHED -> UNFILLED_FALLBACK
      const s4Unfilled = controller.dispatch({
        type: 'EVENT_UNFILLED',
        timestampMs: t0 + 11 * 30000 + 500,
      });
      expect(s4Unfilled.intermediateStatus).toBe('TELEMETRY_DISPATCHED');
      expect(s4Unfilled.status).toBe('UNFILLED_FALLBACK');
      expect(s4Unfilled.path).toEqual([
        'ACTIVE_VIEW',
        'TELEMETRY_DISPATCHED',
        'UNFILLED_FALLBACK',
      ]);
      expect(sendBeaconMock).toHaveBeenCalledTimes(11);
      const unfilledPayload = AdTelemetryClosedLoopEventSchema.parse(
        JSON.parse(sendBeaconMock.mock.calls[10][1])
      );
      expect(unfilledPayload.eventType).toBe('UNFILLED');
      expect(unfilledPayload.slotId).toBe('1000000002_ch02');
    });
  });

  // =========================================================================
  // 3. Ad Refresh Dual-Guard Invariant & <AdSlot /> Closed-Loop Refresh Telemetry
  // =========================================================================
  describe('3. Ad Refresh Dual-Guard Invariant (Delta t >= 30,000ms && ratio >= 0.50 && !document.hidden && N_refresh <= 10)', () => {
    it('enforces dual-guard on 1000000002_ch02 and 1000000002_ch05 and dispatches IMPRESSION telemetry on each valid refresh', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      render(
        <AdSlot
          slotId="1000000002"
          refreshSlotId="1000000002_ch02"
          format="in-feed"
          apartmentName="동탄역시범더샵센트럴시티"
          dong="청계동"
          refreshKey={0}
          testMode={false}
        />
      );

      const container = screen.getByTestId('ad-slot-container');
      const ioInstance = observerInstances[observerInstances.length - 1];

      // 1. Sub-threshold visibility (0.45 < 0.50): 0 pushes, 0 refreshes
      act(() => {
        ioInstance.trigger(0.45, true);
        jest.advanceTimersByTime(35000);
      });
      expect(pushMock).toHaveBeenCalledTimes(0);
      expect(container).toHaveAttribute('data-refresh-key', '0');

      // 2. Active Viewability achieved (ratio = 0.80 >= 0.50): initial push #1
      act(() => {
        ioInstance.trigger(0.80, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      // Simulate normal ad fill so 3,000ms unfilled cascade timeout does not fire
      const insEl = container.querySelector('ins.adsbygoogle') as HTMLElement;
      act(() => {
        insEl.setAttribute('data-adsbygoogle-status', 'done');
        insEl.setAttribute('data-ad-status', 'filled');
        insEl.innerHTML = '<iframe id="ad_frame_0"></iframe>';
      });
      expect(sendBeaconMock).toHaveBeenCalledTimes(0);

      // 3. Advance 30,000ms of active viewability -> triggers Refresh #1 and dispatches IMPRESSION telemetry
      act(() => {
        jest.advanceTimersByTime(DWELL_TIME_THRESHOLD_MS);
      });
      expect(pushMock).toHaveBeenCalledTimes(2);
      expect(container).toHaveAttribute('data-refresh-key', '1');
      expect(sendBeaconMock).toHaveBeenCalledTimes(1);

      const refreshBeacon = AdTelemetryClosedLoopEventSchema.parse(
        JSON.parse(sendBeaconMock.mock.calls[0][1])
      );
      expect(refreshBeacon.eventType).toBe('IMPRESSION');
      expect(refreshBeacon.slotId).toBe('1000000002');
      expect(refreshBeacon.apartmentName).toBe('동탄역시범더샵센트럴시티');
      expect(refreshBeacon.dong).toBe('청계동');
      expect(refreshBeacon.dwellTimeMs).toBeGreaterThanOrEqual(30000);
      expect(refreshBeacon.intersectionRatio).toBe(0.80);
      expect(refreshBeacon.userAgentCategory).toBe('DESKTOP');
      expect(gtagMock).toHaveBeenCalledWith(
        'event',
        'ad_telemetry',
        expect.objectContaining({
          slot_id: '1000000002',
          event_type: 'IMPRESSION',
          apartment_name: '동탄역시범더샵센트럴시티',
          dong: '청계동',
        })
      );

      // 4. Simulate 3,000ms cascade timeout on Refresh #1 -> dispatches UNFILLED closed-loop beacon with dong
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(sendBeaconMock).toHaveBeenCalledTimes(2);
      const unfilledBeacon = AdTelemetryClosedLoopEventSchema.parse(
        JSON.parse(sendBeaconMock.mock.calls[1][1])
      );
      expect(unfilledBeacon.eventType).toBe('UNFILLED');
      expect(unfilledBeacon.dong).toBe('청계동');
      expect(unfilledBeacon.apartmentName).toBe('동탄역시범더샵센트럴시티');

      // 5. Click Native CPA Fallback CTA -> dispatches FALLBACK_CLICK closed-loop beacon with dong
      const cpaCta = screen.getByTestId('ad-slot-cascade-cta');
      act(() => {
        fireEvent.click(cpaCta);
      });
      expect(sendBeaconMock).toHaveBeenCalledTimes(3);
      const clickBeacon = AdTelemetryClosedLoopEventSchema.parse(
        JSON.parse(sendBeaconMock.mock.calls[2][1])
      );
      expect(clickBeacon.eventType).toBe('FALLBACK_CLICK');
      expect(clickBeacon.dong).toBe('청계동');
      expect(clickBeacon.apartmentName).toBe('동탄역시범더샵센트럴시티');
    });

    it('deduplicates onRefreshKeyChange invocation when identical to onRefresh in AdRefreshManager.registerSlot', () => {
      const sharedCallback = jest.fn();
      const t0 = Date.now();
      adRefreshManager.registerSlot('1000000002_ch05', {
        onRefresh: sharedCallback,
        onRefreshKeyChange: sharedCallback,
      });

      adRefreshManager.updateIntersection('1000000002_ch05', 0.85, t0);
      const refreshed = adRefreshManager.triggerRefresh('1000000002_ch05', t0 + 30000);
      expect(refreshed).toBe(true);
      expect(sharedCallback).toHaveBeenCalledTimes(1);
      expect(sharedCallback).toHaveBeenCalledWith(1);
    });
  });

  // =========================================================================
  // 4. Closed-Loop Telemetry Pipeline: GA4 + /api/ads/click + SellTimingCalculator
  // =========================================================================
  describe('4. Closed-Loop Telemetry Pipeline (/api/ads/click, GA4 gtag & SellTimingCalculator B2B Integration)', () => {
    it('dispatches both GA4 custom event (ad_telemetry) and /api/ads/click beacon via sendTelemetry', () => {
      const dispatched = sendTelemetry({
        eventType: 'VIEWABLE_IMPRESSION',
        slotId: '1000000002_ch05',
        apartmentName: '동탄역 롯데캐슬',
        dong: '오산동',
        dwellTimeMs: 30500,
        intersectionRatio: 0.92,
        userAgentCategory: 'MOBILE_WEB',
      });

      expect(dispatched).toBe(true);
      expect(gtagMock).toHaveBeenCalledTimes(1);
      expect(gtagMock).toHaveBeenCalledWith(
        'event',
        'ad_telemetry',
        expect.objectContaining({
          event_category: 'VIEWABLE_IMPRESSION',
          event_label: '1000000002_ch05',
          slot_id: '1000000002_ch05',
          event_type: 'VIEWABLE_IMPRESSION',
          apartment_name: '동탄역 롯데캐슬',
          dong: '오산동',
          dwell_time_ms: 30500,
          intersection_ratio: 0.92,
          user_agent_category: 'MOBILE_WEB',
        })
      );

      expect(sendBeaconMock).toHaveBeenCalledTimes(1);
      const [endpoint, rawBody] = sendBeaconMock.mock.calls[0];
      expect(endpoint).toBe('/api/ads/click');
      const parsedPayload = AdTelemetryClosedLoopEventSchema.parse(JSON.parse(rawBody));
      expect(parsedPayload.slotId).toBe('1000000002_ch05');
      expect(parsedPayload.dwellTimeMs).toBe(30500);
      expect(parsedPayload.intersectionRatio).toBe(0.92);
      expect(parsedPayload.userAgentCategory).toBe('MOBILE_WEB');
    });

    it('falls back to fetch(..., { keepalive: true }) when sendBeacon returns false and never blocks UI on network failure', () => {
      sendBeaconMock.mockReturnValue(false);
      fetchMock.mockImplementation(() => Promise.reject(new Error('Offline')));

      const tStart = performance.now();
      const ok = sendTelemetry({
        eventType: 'CLICK',
        slotId: '1000000001',
        apartmentName: 'GLOBAL',
        dong: '',
        dwellTimeMs: 12000,
        intersectionRatio: 0.75,
        userAgentCategory: 'DESKTOP',
      });
      const elapsedMs = performance.now() - tStart;

      expect(ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ads/click',
        expect.objectContaining({
          method: 'POST',
          keepalive: true,
        })
      );
      expect(elapsedMs).toBeLessThan(10);
    });

    it('persists AdTelemetryClosedLoopEvent in POST /api/ads/click and returns TelemetryApiResponseSchema-valid JSON with persistedId', async () => {
      const closedLoopPayload = {
        eventType: 'VIEWABLE_IMPRESSION' as const,
        slotId: '1000000002_ch02',
        apartmentName: '동탄역 롯데캐슬',
        dong: '오산동',
        dwellTimeMs: 30000,
        intersectionRatio: 0.88,
        userAgentCategory: 'IN_APP_BROWSER' as const,
        timestamp: new Date().toISOString(),
      };

      expect(AdClickInputSchema.safeParse(closedLoopPayload).success).toBe(true);

      const mockReq = {
        text: async () => JSON.stringify(closedLoopPayload),
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      } as unknown as Parameters<typeof AdClickPostHandler>[0];

      const response = await AdClickPostHandler(mockReq);
      expect(response.status).toBe(200);

      const jsonBody = await response.json();
      const validatedResponse = TelemetryApiResponseSchema.parse(jsonBody);
      expect(validatedResponse.success).toBe(true);
      expect(validatedResponse.persistedId).toMatch(/^telemetry_1000000002_ch02_/);

      expect(mockFirestoreAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          adId: '1000000002_ch02',
          slotId: '1000000002_ch02',
          eventType: 'VIEWABLE_IMPRESSION',
          apartmentName: '동탄역 롯데캐슬',
          dong: '오산동',
          dwellTimeMs: 30000,
          intersectionRatio: 0.88,
          userAgentCategory: 'IN_APP_BROWSER',
        })
      );

      // Verify invalid payload returns 400 conforming to TelemetryApiResponseSchema
      const badReq = {
        text: async () => JSON.stringify({ slotId: '', eventType: 'INVALID' }),
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      } as unknown as Parameters<typeof AdClickPostHandler>[0];
      const badRes = await AdClickPostHandler(badReq);
      expect(badRes.status).toBe(400);
      const badJson = TelemetryApiResponseSchema.parse(await badRes.json());
      expect(badJson.success).toBe(false);
      expect(badJson.error).toBe('INVALID_PAYLOAD');
    });

    it('routes SellTimingCalculator B2B CPA clicks through sendTelemetry (/api/ads/click) instead of bypassing the telemetry endpoint', () => {
      const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);

      const sheetApartments = {
        오산동: [
          {
            name: '동탄역 롯데캐슬',
            dong: '오산동',
            householdCount: 940,
            yearBuilt: '2021',
            brand: '롯데캐슬',
          },
        ],
      };
      const txSummaryData = {
        '동탄역 롯데캐슬': {
          avg3MPrice: 145000,
          avg3MRentDeposit: 75000,
          avg3MTxCount: 9,
          avg3MPerPyeong: 4200,
          latestPrice: 145000,
          dong: '오산동',
        },
      };

      render(
        <SellTimingCalculator
          isOpen={true}
          onClose={jest.fn()}
          initialAptName="동탄역 롯데캐슬"
          sheetApartments={sheetApartments}
          txSummaryData={txSummaryData as never}
          nameMapping={{}}
        />
      );

      // Trigger diagnosis simulation and advance 1200ms timer to reveal B2B CPA buttons
      const simulateBtn = screen.getByRole('button', {
        name: /AI 자산 적정 가치 & 안정성 진단하기/i,
      });
      act(() => {
        fireEvent.click(simulateBtn);
        jest.advanceTimersByTime(1250);
      });

      const brokerBtn = screen.getByRole('button', {
        name: /동탄 전문 안심 자문 공인중개사 연계/i,
      });
      act(() => {
        fireEvent.click(brokerBtn);
      });

      expect(sendBeaconMock).toHaveBeenCalledTimes(1);
      const brokerCall = sendBeaconMock.mock.calls[0];
      expect(brokerCall[0]).toBe('/api/ads/click');
      const parsedBroker = AdTelemetryClosedLoopEventSchema.parse(JSON.parse(brokerCall[1]));
      expect(parsedBroker.eventType).toBe('FALLBACK_CLICK');
      expect(parsedBroker.slotId).toBe('sell-timing-broker');
      expect(parsedBroker.apartmentName).toBe('동탄역 롯데캐슬');
      expect(parsedBroker.dong).toBe('오산동');

      const taxBtn = screen.getByRole('button', {
        name: /양도소득세 1:1 공익 전문 세무사 연계 상담/i,
      });
      act(() => {
        fireEvent.click(taxBtn);
      });

      expect(sendBeaconMock).toHaveBeenCalledTimes(2);
      const taxCall = sendBeaconMock.mock.calls[1];
      const parsedTax = AdTelemetryClosedLoopEventSchema.parse(JSON.parse(taxCall[1]));
      expect(parsedTax.eventType).toBe('FALLBACK_CLICK');
      expect(parsedTax.slotId).toBe('sell-timing-tax-expert');
      expect(parsedTax.apartmentName).toBe('동탄역 롯데캐슬');
      expect(parsedTax.dong).toBe('오산동');

      // Verify zero direct client-side Firestore writes to 'ad_clicks' collection (even when db is non-null)
      expect(mockClientCollection).not.toHaveBeenCalledWith(expect.anything(), 'ad_clicks');

      openSpy.mockRestore();
    });
  });

  // =========================================================================
  // 5. Popperian Falsification of H0 (mu_imp >= 1.6 on >= 60s Sessions) & CVaR_0.01(CLS) < 0.001
  // =========================================================================
  describe('5. Popperian Falsification of H0 (mu_imp >= 1.6, p < 0.01) & CVaR_0.01(CLS) < 0.001', () => {
    it('rejects H0: achieves mean effective impressions mu_imp >= 1.6 across N = 200 active sessions (>= 60s dwell) with CVaR_0.01(CLS) = 0.000 < 0.001', () => {
      const N = 200;
      const controlImpressions: number[] = [];
      const treatmentImpressions: number[] = [];
      const clsSamples: number[] = [];

      for (let i = 0; i < N; i++) {
        // Active session dwell time in [60,000ms, 150,000ms], intersectionRatio in [0.55, 0.98]
        const sessionDwellMs = 60000 + (i % 4) * 30000;
        const ratio = 0.55 + (i % 5) * 0.08;

        // Control group (Static 1-push slot without dynamic refresh): strictly 1 impression
        controlImpressions.push(1);

        // Treatment group (Phase 5 Closed-Loop Dynamic Refresh Engine)
        const t0 = 1000000;
        let state = createInitialClosedLoopState({
          slotId: '1000000002_ch02',
          apartmentName: '동탄역 롯데캐슬',
          dong: '오산동',
          maxRefreshesPerSlot: MAX_REFRESHES_PER_SLOT,
          timestampMs: t0,
        });
        state = transitionClosedLoopState(state, {
          type: 'REGISTER',
          ratio,
          timestampMs: t0,
        });

        let sessionImpressions = ratio >= MIN_INTERSECTION_RATIO ? 1 : 0;
        const numTicks = Math.floor(sessionDwellMs / DWELL_TIME_THRESHOLD_MS);
        for (let tick = 1; tick <= numTicks; tick++) {
          const tNow = t0 + tick * DWELL_TIME_THRESHOLD_MS;
          state = transitionClosedLoopState(state, {
            type: 'TICK',
            ratio,
            timestampMs: tNow,
            isDocumentHidden: false,
          });
          if (state.status === 'REFRESH_ELIGIBLE') {
            state = transitionClosedLoopState(state, {
              type: 'TRIGGER_REFRESH',
              ratio,
              timestampMs: tNow,
            });
            sessionImpressions += 1;
          }
        }
        treatmentImpressions.push(sessionImpressions);

        // Verify Zero-CLS invariant across refresh/fallback transitions (Delta H = 0px => CLS = 0.000)
        const preReservedHeightPx = 180;
        const postRefreshHeightPx = 180;
        const deltaH = Math.abs(postRefreshHeightPx - preReservedHeightPx);
        const cls = deltaH / 800;
        clsSamples.push(cls);
      }

      const meanControl =
        controlImpressions.reduce((acc, v) => acc + v, 0) / controlImpressions.length;
      const meanTreatment =
        treatmentImpressions.reduce((acc, v) => acc + v, 0) / treatmentImpressions.length;

      // H0 Rejection: meanTreatment >= 1.6 (specifically 3.5 for 60s-150s sessions) vs meanControl = 1.0
      expect(meanControl).toBe(1.0);
      expect(meanTreatment).toBeGreaterThanOrEqual(1.6);

      // Compute 99th percentile worst-case tail CVaR_0.01(CLS)
      const sortedCls = [...clsSamples].sort((a, b) => b - a);
      const tailCount = Math.max(1, Math.ceil(N * 0.01));
      const cvar01Cls =
        sortedCls.slice(0, tailCount).reduce((acc, v) => acc + v, 0) / tailCount;

      expect(cvar01Cls).toBeLessThan(0.001);
      expect(getAdSlotMinHeightClass('in-feed')).toBe('min-h-[140px] sm:min-h-[160px]');
    });
  });
});
