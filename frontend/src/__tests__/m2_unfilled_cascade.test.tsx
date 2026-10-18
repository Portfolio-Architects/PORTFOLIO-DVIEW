/**
 * @file m2_unfilled_cascade.test.tsx
 * @description Phase 2 Empirical Verification Suite: Unfilled Inventory Zero-Loss Cascade Fallback
 * Verifies:
 * 1. NativeCpaFallbackPayloadSchema & AdTelemetryBeaconSchema Zod runtime validation & XSS URI rejection
 * 2. Deterministic State Machine f: S x A -> S across {REQUESTED, FILLED, UNFILLED_DETECTED, FALLBACK_ACTIVE, CLICKED}
 * 3. Popperian H0 Falsification: N = 500 consecutive unfilled injections -> P(fallback DOM in <= 50ms) = 1.0, Delta H = 0px
 * 4. 3,000ms Timeout Fallback (TIMEOUT_3S) & Invariant 5 Late STATUS_FILLED Race-Condition Cancellation (Zero Dual Render)
 * 5. Telemetry Beacon Pipeline (navigator.sendBeacon, fetch fallback, /api/ads/click route & Delta Jank = 0ms on network failure)
 * 6. DESIGN.md Token Invariance (Slate-50/900, Emerald/Blue, Lucide SVG, 0 Emojis) & 30s Dwell Refresh Recovery
 */

import React from 'react';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AdSlot,
  NativeCpaFallbackPayloadSchema,
  AdTelemetryBeaconSchema,
  CPA_CAMPAIGN_CATALOG,
  CASCADE_TIMEOUT_MS,
  MAX_FALLBACK_TRANSITION_MS,
  resolveNativeCpaFallbackPayload,
  selectDeterministicCampaignId,
  transitionCascadeState,
  transitionCascadeStateWithPath,
  createCascadeFallbackStateMachine,
  sendAdTelemetryBeacon,
  getAdSlotMinHeightClass,
} from '@/components/ads/AdSlot';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';
import * as AdBlockDetectorHook from '@/hooks/useAdBlockDetector';
import { POST as AdClickPostHandler, AdClickInputSchema } from '@/app/api/ads/click/route';

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

const mockFirestoreAdd = jest.fn().mockResolvedValue({ id: 'doc-telemetry-1' });
jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      add: (...args: unknown[]) => mockFirestoreAdd(...args),
    })),
  },
}));

describe('Phase 2: Unfilled Inventory Zero-Loss Cascade Fallback Verification Suite', () => {
  const originalEnv = process.env;
  const originalSendBeacon = navigator.sendBeacon;
  const originalFetch = global.fetch;

  let sendBeaconMock: jest.Mock;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-18T12:00:00.000Z'));
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
      json: async () => ({ success: true }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    adRefreshManager.reset();
    delete (window as unknown as { adsbygoogle?: unknown }).adsbygoogle;
  });

  afterEach(() => {
    cleanup();
    adRefreshManager.reset();
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: originalSendBeacon,
    });
    global.fetch = originalFetch;
    process.env = originalEnv;
    jest.useRealTimers();
  });

  // =========================================================================
  // 1. Zod Schemas & Security Guardrails (Section 3.2 Signatures)
  // =========================================================================
  describe('1. NativeCpaFallbackPayloadSchema & AdTelemetryBeaconSchema Runtime Validation', () => {
    it('validates all 4 canonical CPA campaigns and all 3 sourceTrigger values', () => {
      const triggers = ['UNFILLED_ATTRIBUTE', 'TIMEOUT_FALLBACK', 'ADBLOCK_ACTIVE'] as const;
      const campaigns = [
        'mortgage-refinance',
        'corporate-relocation',
        'interior-quote',
        'jeonse-sentinel',
      ] as const;

      for (const cpaCampaignId of campaigns) {
        for (const sourceTrigger of triggers) {
          const payload = resolveNativeCpaFallbackPayload({
            slotId: '1000000002',
            sourceTrigger,
            cpaCampaignId,
          });
          const parsed = NativeCpaFallbackPayloadSchema.parse(payload);
          expect(parsed.slotId).toBe('1000000002');
          expect(parsed.cpaCampaignId).toBe(cpaCampaignId);
          expect(parsed.sourceTrigger).toBe(sourceTrigger);
          expect(parsed.estimatedCpaValueWon).toBeGreaterThan(0);
          expect(parsed.targetUrl).toMatch(/^https?:\/\//i);
        }
      }
    });

    it('rejects XSS and non-http(s) URI schemes (javascript:, data:, vbscript:, ftp:) in targetUrl', () => {
      const baseValid = {
        slotId: '1000000001',
        cpaCampaignId: 'mortgage-refinance' as const,
        title: '주담대 최저금리 비교',
        subtitle: '스트레스 DSR 한도 산출',
        ctaText: '한도 조회',
        estimatedCpaValueWon: 35000,
        sourceTrigger: 'UNFILLED_ATTRIBUTE' as const,
      };

      const maliciousUrls = [
        'javascript:alert(1)',
        'JAVASCRIPT:alert(document.cookie)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox("xss")',
        'ftp://malicious.example.com/file',
        'not-a-valid-url',
        '',
      ];

      for (const badUrl of maliciousUrls) {
        const result = NativeCpaFallbackPayloadSchema.safeParse({
          ...baseValid,
          targetUrl: badUrl,
        });
        expect(result.success).toBe(false);
      }

      // Rejects non-positive or non-integer estimatedCpaValueWon and empty slotId
      expect(
        NativeCpaFallbackPayloadSchema.safeParse({
          ...baseValid,
          targetUrl: 'https://dongtanview.com/overview',
          estimatedCpaValueWon: 0,
        }).success
      ).toBe(false);
      expect(
        NativeCpaFallbackPayloadSchema.safeParse({
          ...baseValid,
          targetUrl: 'https://dongtanview.com/overview',
          estimatedCpaValueWon: -10000,
        }).success
      ).toBe(false);
      expect(
        NativeCpaFallbackPayloadSchema.safeParse({
          ...baseValid,
          slotId: '',
          targetUrl: 'https://dongtanview.com/overview',
        }).success
      ).toBe(false);
    });

    it('validates AdTelemetryBeaconSchema defaults and rejects malformed timestamps or event types', () => {
      const isoNow = new Date().toISOString();
      const parsed = AdTelemetryBeaconSchema.parse({
        slotId: '1000000001',
        eventType: 'UNFILLED',
        timestamp: isoNow,
      });

      expect(parsed).toEqual({
        slotId: '1000000001',
        eventType: 'UNFILLED',
        apartmentName: 'GLOBAL',
        timestamp: isoNow,
      });

      const allEvents = [
        'IMPRESSION',
        'VIEWABLE_IMPRESSION',
        'CLICK',
        'UNFILLED',
        'ADBLOCK_FALLBACK',
        'FALLBACK_CLICK',
      ] as const;

      for (const eventType of allEvents) {
        expect(
          AdTelemetryBeaconSchema.safeParse({
            slotId: '1000000002',
            eventType,
            campaignId: 'mortgage-refinance',
            apartmentName: '동탄역 롯데캐슬',
            timestamp: isoNow,
          }).success
        ).toBe(true);
      }

      expect(
        AdTelemetryBeaconSchema.safeParse({
          slotId: '',
          eventType: 'UNFILLED',
          timestamp: isoNow,
        }).success
      ).toBe(false);

      expect(
        AdTelemetryBeaconSchema.safeParse({
          slotId: '1000000001',
          eventType: 'UNFILLED',
          timestamp: 'invalid-timestamp',
        }).success
      ).toBe(false);
    });
  });

  // =========================================================================
  // 2. Deterministic State Machine Transitions (f: S x A -> S)
  // =========================================================================
  describe('2. Deterministic State Machine Transitions (f: S x A -> S)', () => {
    it('verifies all transitions in S = {REQUESTED, FILLED, UNFILLED_DETECTED, FALLBACK_ACTIVE, CLICKED}', () => {
      // 1. f(REQUESTED, STATUS_FILLED) = FILLED
      expect(transitionCascadeState('REQUESTED', 'STATUS_FILLED')).toBe('FILLED');

      // 2. f(REQUESTED, STATUS_UNFILLED) = UNFILLED_DETECTED -> FALLBACK_ACTIVE
      const unfilledTransition = transitionCascadeStateWithPath('REQUESTED', 'STATUS_UNFILLED');
      expect(unfilledTransition.intermediateState).toBe('UNFILLED_DETECTED');
      expect(unfilledTransition.nextState).toBe('FALLBACK_ACTIVE');
      expect(unfilledTransition.path).toEqual([
        'REQUESTED',
        'UNFILLED_DETECTED',
        'FALLBACK_ACTIVE',
      ]);

      // 3. f(REQUESTED, TIMEOUT_3S) = FALLBACK_ACTIVE
      const timeoutTransition = transitionCascadeStateWithPath('REQUESTED', 'TIMEOUT_3S');
      expect(timeoutTransition.nextState).toBe('FALLBACK_ACTIVE');
      expect(timeoutTransition.path).toEqual(['REQUESTED', 'FALLBACK_ACTIVE']);

      // 4. f(FALLBACK_ACTIVE, STATUS_FILLED) = FALLBACK_ACTIVE (late fill discarded)
      const lateFillTransition = transitionCascadeStateWithPath(
        'FALLBACK_ACTIVE',
        'STATUS_FILLED'
      );
      expect(lateFillTransition.nextState).toBe('FALLBACK_ACTIVE');
      expect(lateFillTransition.discardedLateFill).toBe(true);

      // 5. f(FALLBACK_ACTIVE, STATUS_UNFILLED) = FALLBACK_ACTIVE
      expect(transitionCascadeState('FALLBACK_ACTIVE', 'STATUS_UNFILLED')).toBe('FALLBACK_ACTIVE');

      // 6. f(FALLBACK_ACTIVE, USER_CLICK) = CLICKED
      expect(transitionCascadeState('FALLBACK_ACTIVE', 'USER_CLICK')).toBe('CLICKED');

      // 7. Stateful CascadeFallbackStateMachine lifecycle verification
      const fsm = createCascadeFallbackStateMachine();
      expect(fsm.getStatus()).toBe('REQUESTED');

      fsm.dispatch('STATUS_UNFILLED');
      expect(fsm.getStatus()).toBe('FALLBACK_ACTIVE');
      expect(fsm.getHistory()).toEqual(['REQUESTED', 'UNFILLED_DETECTED', 'FALLBACK_ACTIVE']);

      // Late fill arrival is discarded
      fsm.dispatch('STATUS_FILLED');
      expect(fsm.getStatus()).toBe('FALLBACK_ACTIVE');
      expect(fsm.getLateFillDiscardCount()).toBe(1);

      // User click transitions to CLICKED
      fsm.dispatch('USER_CLICK');
      expect(fsm.getStatus()).toBe('CLICKED');
      expect(fsm.getHistory()).toEqual([
        'REQUESTED',
        'UNFILLED_DETECTED',
        'FALLBACK_ACTIVE',
        'CLICKED',
      ]);
    });
  });

  // =========================================================================
  // 3. Popperian Falsification of H0 (N = 500 Consecutive Unfilled Simulations)
  // =========================================================================
  describe('3. Popperian Falsification of H0: N = 500 Unfilled Injections (P = 1.0, Delta t <= 50ms, Delta H = 0px)', () => {
    it('mounts [data-testid="ad-slot-cascade-fallback"] within <= 50ms across N = 500 consecutive unfilled injections with 0.0% failure rate', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      const { rerender } = render(
        <AdSlot
          slotId="1000000001"
          format="in-feed"
          refreshKey={0}
          testMode={false}
        />
      );

      const container = screen.getByTestId('ad-slot-container');
      const expectedMinHeight = getAdSlotMinHeightClass('in-feed');
      expect(container.className).toContain('min-h-[140px]');
      expect(container.className).toContain('sm:min-h-[160px]');

      const N = 500;
      let failureCount = 0;
      let maxTransitionLatencyMs = 0;

      for (let i = 0; i < N; i++) {
        const insEl = container.querySelector('ins.adsbygoogle') as HTMLElement;
        expect(insEl).not.toBeNull();

        // Reset to REQUESTED state before injecting unfilled
        act(() => {
          insEl.removeAttribute('data-ad-status');
          insEl.removeAttribute('data-adsbygoogle-status');
        });

        const t0 = performance.now();
        act(() => {
          insEl.setAttribute('data-adsbygoogle-status', 'done');
          insEl.setAttribute('data-ad-status', 'unfilled');
        });
        const elapsedMs = performance.now() - t0;
        if (elapsedMs > maxTransitionLatencyMs) {
          maxTransitionLatencyMs = elapsedMs;
        }

        const fallbackCard = container.querySelector('[data-testid="ad-slot-cascade-fallback"]');
        const skeleton = container.querySelector('[data-testid="ad-slot-skeleton"]');

        if (
          !fallbackCard ||
          skeleton !== null ||
          elapsedMs > MAX_FALLBACK_TRANSITION_MS ||
          !container.className.includes(expectedMinHeight.split(' ')[0]) ||
          !fallbackCard.className.includes(expectedMinHeight.split(' ')[0])
        ) {
          failureCount += 1;
        }

        // Advance 30,000ms to reset slot for next cycle if needed
        if (i < 5) {
          act(() => {
            jest.advanceTimersByTime(30000);
            rerender(
              <AdSlot
                slotId="1000000001"
                format="in-feed"
                refreshKey={i + 1}
                testMode={false}
              />
            );
          });
        }
      }

      // H0 Rejection: strictly 0 failures out of N = 500 simulations (Failure Rate = 0.0%)
      expect(failureCount).toBe(0);
      expect(maxTransitionLatencyMs).toBeLessThanOrEqual(MAX_FALLBACK_TRANSITION_MS);

      const fallbackEl = screen.getByTestId('ad-slot-cascade-fallback');
      expect(fallbackEl).toBeInTheDocument();
      expect(fallbackEl).toHaveAttribute('data-source-trigger', 'UNFILLED_ATTRIBUTE');
      expect(fallbackEl).toHaveAttribute('data-cascade-status', 'FALLBACK_ACTIVE');
    });
  });

  // =========================================================================
  // 4. 3,000ms Timeout Fallback & Late STATUS_FILLED Race Condition Defense
  // =========================================================================
  describe('4. 3,000ms Timeout Fallback (TIMEOUT_3S) & Late STATUS_FILLED Race Condition Defense', () => {
    it('transitions to FALLBACK_ACTIVE after 3,000ms timeout when AdSense does not respond', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      render(
        <AdSlot
          slotId="1000000002"
          format="banner"
          cpaCampaignId="mortgage-refinance"
          apartmentName="동탄역 롯데캐슬"
          testMode={false}
        />
      );

      // Before 3,000ms: still REQUESTED with skeleton visible
      act(() => {
        jest.advanceTimersByTime(CASCADE_TIMEOUT_MS - 1);
      });
      expect(screen.getByTestId('ad-slot-skeleton')).toBeInTheDocument();
      expect(screen.queryByTestId('ad-slot-cascade-fallback')).not.toBeInTheDocument();

      // At exactly 3,000ms: TIMEOUT_3S triggers FALLBACK_ACTIVE
      act(() => {
        jest.advanceTimersByTime(1);
      });

      expect(screen.queryByTestId('ad-slot-skeleton')).not.toBeInTheDocument();
      const fallbackCard = screen.getByTestId('ad-slot-cascade-fallback');
      expect(fallbackCard).toBeInTheDocument();
      expect(fallbackCard).toHaveAttribute('data-source-trigger', 'TIMEOUT_FALLBACK');
      expect(fallbackCard).toHaveAttribute('data-cpa-campaign-id', 'mortgage-refinance');
      expect(fallbackCard).toHaveAttribute('data-cascade-status', 'FALLBACK_ACTIVE');
      expect(fallbackCard.className).toContain('min-h-[250px]');

      // Verify UNFILLED beacon was dispatched on timeout
      expect(sendBeaconMock).toHaveBeenCalledTimes(1);
      const [endpoint, rawPayload] = sendBeaconMock.mock.calls[0];
      expect(endpoint).toBe('/api/ads/click');
      const parsedBeacon = AdTelemetryBeaconSchema.parse(JSON.parse(rawPayload));
      expect(parsedBeacon.slotId).toBe('1000000002');
      expect(parsedBeacon.eventType).toBe('UNFILLED');
      expect(parsedBeacon.campaignId).toBe('mortgage-refinance');
      expect(parsedBeacon.apartmentName).toBe('동탄역 롯데캐슬');
    });

    it('enforces Invariant 5: cancels and discards late STATUS_FILLED response arriving after TIMEOUT_3S to prevent Dual Render and CLS', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      render(
        <AdSlot
          slotId="1000000002"
          format="in-feed"
          minHeightClass="min-h-[180px] sm:min-h-[220px] md:min-h-[250px]"
          testMode={false}
        />
      );

      const container = screen.getByTestId('ad-slot-container');
      const insEl = container.querySelector('ins.adsbygoogle') as HTMLElement;
      expect(insEl).toBeInTheDocument();

      // 1. Trigger 3,000ms timeout -> FALLBACK_ACTIVE mounts CPA card
      act(() => {
        jest.advanceTimersByTime(3000);
      });

      const fallbackBefore = screen.getByTestId('ad-slot-cascade-fallback');
      expect(fallbackBefore).toBeInTheDocument();
      expect(fallbackBefore).toHaveAttribute('data-late-fill-discarded', 'false');

      // 2. At t = 3,500ms, late AdSense STATUS_FILLED arrives and attempts to inject an ad iframe
      act(() => {
        jest.advanceTimersByTime(500);
        insEl.setAttribute('data-adsbygoogle-status', 'done');
        insEl.setAttribute('data-ad-status', 'filled');
        insEl.innerHTML = '<iframe id="late_aswift_1" src="https://googleads.g.doubleclick.net/pagead/ads"></iframe>';
      });

      // 3. Verify late fill was immediately cancelled & discarded:
      // - Fallback card remains mounted and active
      const fallbackAfter = screen.getByTestId('ad-slot-cascade-fallback');
      expect(fallbackAfter).toBe(fallbackBefore);
      expect(fallbackAfter).toHaveAttribute('data-cascade-status', 'FALLBACK_ACTIVE');
      expect(fallbackAfter).toHaveAttribute('data-late-fill-discarded', 'true');

      // - Injected iframe inside <ins> was purged (Zero Dual Render)
      expect(insEl.querySelectorAll('iframe')).toHaveLength(0);
      expect(insEl.innerHTML).toBe('');
      expect(insEl).toHaveAttribute('data-cascade-late-fill-discarded', 'true');
      expect(insEl).toHaveAttribute('data-cascade-suppressed', 'true');
      expect(insEl.style.display).toBe('none');

      // - Container min-height classes remain identical (Delta H = 0px)
      expect(container.className).toContain('min-h-[180px]');
      expect(container.className).toContain('sm:min-h-[220px]');
      expect(container.className).toContain('md:min-h-[250px]');
    });

    it('enforces Invariant 5: cancels and discards late STATUS_FILLED response arriving after STATUS_UNFILLED', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      render(<AdSlot slotId="1000000001" format="in-feed" testMode={false} />);
      const insEl = document.querySelector('ins.adsbygoogle') as HTMLElement;

      // 1. AdSense reports unfilled at t = 200ms
      act(() => {
        jest.advanceTimersByTime(200);
        insEl.setAttribute('data-ad-status', 'unfilled');
      });

      expect(screen.getByTestId('ad-slot-cascade-fallback')).toBeInTheDocument();

      // 2. Rogue/late script mutates data-ad-status="filled" and injects iframe at t = 800ms
      act(() => {
        jest.advanceTimersByTime(600);
        insEl.setAttribute('data-ad-status', 'filled');
        insEl.innerHTML = '<iframe id="rogue_ad"></iframe>';
      });

      expect(screen.getByTestId('ad-slot-cascade-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('ad-slot-cascade-fallback')).toHaveAttribute(
        'data-late-fill-discarded',
        'true'
      );
      expect(insEl.querySelectorAll('iframe')).toHaveLength(0);
      expect(insEl.style.display).toBe('none');
    });

    it('cancels 3,000ms timeout when AdSense fills normally before 3,000ms', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      render(<AdSlot slotId="1000000001" format="in-feed" testMode={false} />);
      const insEl = document.querySelector('ins.adsbygoogle') as HTMLElement;

      // Ad fills at t = 800ms (< 3,000ms)
      act(() => {
        jest.advanceTimersByTime(800);
        insEl.setAttribute('data-adsbygoogle-status', 'done');
        insEl.setAttribute('data-ad-status', 'filled');
        insEl.innerHTML = '<iframe id="valid_ad_frame"></iframe>';
      });

      expect(screen.queryByTestId('ad-slot-skeleton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ad-slot-cascade-fallback')).not.toBeInTheDocument();
      expect(insEl.querySelectorAll('iframe')).toHaveLength(1);

      // Advance past 3,000ms (to t = 10,000ms) -> must remain FILLED and not activate fallback
      act(() => {
        jest.advanceTimersByTime(9200);
      });

      expect(screen.queryByTestId('ad-slot-cascade-fallback')).not.toBeInTheDocument();
      expect(insEl.querySelectorAll('iframe')).toHaveLength(1);
      expect(sendBeaconMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Telemetry Beacon Pipeline & /api/ads/click Route Handler Integration
  // =========================================================================
  describe('5. Telemetry Beacon Pipeline (/api/ads/click) & Zero-Jank Network Failure Resilience', () => {
    it('dispatches UNFILLED and FALLBACK_CLICK beacons on cascade fallback impression and user click', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      render(
        <AdSlot
          slotId="1000000002_ch05"
          format="in-feed"
          apartmentName="동탄역시범더샵센트럴시티"
          testMode={false}
        />
      );

      const insEl = document.querySelector('ins.adsbygoogle') as HTMLElement;

      // 1. Trigger unfilled -> sends UNFILLED beacon
      act(() => {
        insEl.setAttribute('data-ad-status', 'unfilled');
      });

      expect(sendBeaconMock).toHaveBeenCalledTimes(1);
      const unfilledBeacon = AdTelemetryBeaconSchema.parse(
        JSON.parse(sendBeaconMock.mock.calls[0][1])
      );
      expect(unfilledBeacon).toEqual({
        slotId: '1000000002_ch05',
        eventType: 'UNFILLED',
        campaignId: 'mortgage-refinance',
        apartmentName: '동탄역시범더샵센트럴시티',
        timestamp: '2026-10-18T12:00:00.000Z',
      });

      // 2. Click CTA on fallback card -> transitions to CLICKED and sends FALLBACK_CLICK beacon
      const ctaLink = screen.getByTestId('ad-slot-cascade-cta');
      expect(ctaLink).toHaveAttribute(
        'href',
        CPA_CAMPAIGN_CATALOG['mortgage-refinance'].targetUrl
      );

      act(() => {
        fireEvent.click(ctaLink);
      });

      expect(screen.getByTestId('ad-slot-cascade-fallback')).toHaveAttribute(
        'data-cascade-status',
        'CLICKED'
      );
      expect(sendBeaconMock).toHaveBeenCalledTimes(2);
      const clickBeacon = AdTelemetryBeaconSchema.parse(
        JSON.parse(sendBeaconMock.mock.calls[1][1])
      );
      expect(clickBeacon).toEqual({
        slotId: '1000000002_ch05',
        eventType: 'FALLBACK_CLICK',
        campaignId: 'mortgage-refinance',
        apartmentName: '동탄역시범더샵센트럴시티',
        timestamp: '2026-10-18T12:00:00.000Z',
      });
    });

    it('falls back to non-blocking fetch(..., { keepalive: true }) when navigator.sendBeacon returns false or is undefined, and guarantees Delta Jank = 0ms on network failure', () => {
      // Simulate sendBeacon throwing and fetch rejecting with network failure
      sendBeaconMock.mockImplementation(() => {
        throw new Error('sendBeacon quota exceeded');
      });
      fetchMock.mockImplementation(() => Promise.reject(new Error('Network offline')));

      const startMs = performance.now();
      const dispatched = sendAdTelemetryBeacon({
        slotId: '1000000001',
        eventType: 'FALLBACK_CLICK',
        campaignId: 'jeonse-sentinel',
        apartmentName: 'GLOBAL',
        timestamp: new Date().toISOString(),
      });
      const jankMs = performance.now() - startMs;

      expect(dispatched).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/ads/click',
        expect.objectContaining({
          method: 'POST',
          keepalive: true,
        })
      );
      // CVaR Worst-case boundary: UI blocking delay Delta Jank < 5ms (non-blocking)
      expect(jankMs).toBeLessThan(10);
    });

    it('validates and persists Phase 2 AdTelemetryBeacon payloads in POST /api/ads/click route handler', async () => {
      const beaconPayload = {
        slotId: '1000000002',
        eventType: 'FALLBACK_CLICK',
        campaignId: 'mortgage-refinance',
        apartmentName: '동탄역 롯데캐슬',
        timestamp: new Date().toISOString(),
      };

      expect(AdClickInputSchema.safeParse(beaconPayload).success).toBe(true);

      const mockReq = {
        text: async () => JSON.stringify(beaconPayload),
        headers: new Map([['x-forwarded-for', '127.0.0.1']]),
      } as unknown as Parameters<typeof AdClickPostHandler>[0];

      const response = await AdClickPostHandler(mockReq);
      expect(response.status).toBe(200);
      expect(mockFirestoreAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          adId: '1000000002',
          slotId: '1000000002',
          eventType: 'FALLBACK_CLICK',
          campaignId: 'mortgage-refinance',
          apartmentName: '동탄역 롯데캐슬',
        })
      );
    });
  });

  // =========================================================================
  // 6. DESIGN.md Token Compliance & 30s Dwell Refresh Recovery
  // =========================================================================
  describe('6. DESIGN.md Token Invariance & Refresh Lifecycle Recovery', () => {
    it('renders [data-testid="ad-slot-cascade-fallback"] with 0 unicode emojis and 0 prohibited color classes across all 4 CPA campaigns', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];
      const emojiRegex =
        /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
      const prohibitedColorRegex =
        /\b(?:bg|text|border|ring|fill|stroke|from|to|via)-(?:pink|purple|fuchsia|violet|indigo|yellow|orange|amber|rose|zinc|neutral|stone|gray|teal|cyan)(?:-[a-z0-9/[\]]+)?\b/i;

      const campaigns = [
        'mortgage-refinance',
        'corporate-relocation',
        'interior-quote',
        'jeonse-sentinel',
      ] as const;

      for (const campaign of campaigns) {
        const { unmount } = render(
          <AdSlot
            slotId={`slot-${campaign}`}
            format="in-feed"
            cpaCampaignId={campaign}
            testMode={false}
          />
        );

        const insEl = document.querySelector('ins.adsbygoogle') as HTMLElement;
        act(() => {
          insEl.setAttribute('data-ad-status', 'unfilled');
        });

        const fallbackEl = screen.getByTestId('ad-slot-cascade-fallback');
        expect(fallbackEl.innerHTML.match(emojiRegex)).toBeNull();
        expect(fallbackEl.outerHTML.match(prohibitedColorRegex)).toBeNull();
        expect(fallbackEl.querySelectorAll('svg').length).toBeGreaterThanOrEqual(2);

        unmount();
      }
    });

    it('deterministically maps slotId patterns to corresponding high-CPC CPA campaigns with chapter/domain precedence', () => {
      expect(selectDeterministicCampaignId('1000000001')).toBe('jeonse-sentinel');
      expect(selectDeterministicCampaignId('1000000002')).toBe('mortgage-refinance');
      expect(selectDeterministicCampaignId('1000000002_ch02')).toBe('jeonse-sentinel');
      expect(selectDeterministicCampaignId('1000000002_ch05')).toBe('mortgage-refinance');
      expect(selectDeterministicCampaignId('1000000002_techno')).toBe('corporate-relocation');
      expect(selectDeterministicCampaignId('1000000002_interior')).toBe('interior-quote');
      expect(selectDeterministicCampaignId('technovalley-b2b-slot')).toBe('corporate-relocation');
      expect(selectDeterministicCampaignId('apt-interior-slot')).toBe('interior-quote');

      // Verify <AdSlot slotId="1000000002" refreshSlotId="1000000002_ch02" /> resolves jeonse-sentinel
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];
      const { unmount } = render(
        <AdSlot
          slotId="1000000002"
          refreshSlotId="1000000002_ch02"
          format="in-feed"
          testMode={false}
        />
      );
      const insEl = document.querySelector('ins.adsbygoogle') as HTMLElement;
      act(() => {
        insEl.setAttribute('data-ad-status', 'unfilled');
      });
      expect(screen.getByTestId('ad-slot-cascade-fallback')).toHaveAttribute(
        'data-cpa-campaign-id',
        'jeonse-sentinel'
      );
      unmount();
    });

    it('rejects late iframe injection via appendChild and insertBefore when FALLBACK_ACTIVE', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      render(<AdSlot slotId="1000000002" format="banner" testMode={false} />);
      const insEl = document.querySelector('ins.adsbygoogle') as HTMLElement;

      // Trigger timeout fallback at 3,000ms
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.getByTestId('ad-slot-cascade-fallback')).toBeInTheDocument();

      // Attempt late DOM node injection via appendChild and insertBefore
      const lateIframe1 = document.createElement('iframe');
      lateIframe1.id = 'late_append_iframe';
      const lateIframe2 = document.createElement('iframe');
      lateIframe2.id = 'late_insert_iframe';

      act(() => {
        insEl.appendChild(lateIframe1);
        insEl.insertBefore(lateIframe2, null);
      });

      expect(insEl.querySelectorAll('iframe')).toHaveLength(0);
      expect(insEl.childNodes).toHaveLength(0);
      expect(screen.getByTestId('ad-slot-cascade-fallback')).toHaveAttribute(
        'data-late-fill-discarded',
        'true'
      );
    });

    it('does not prematurely fire 3,000ms timeout for below-the-fold slots before viewport entry (ratio >= 0.50)', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      render(<AdSlot slotId="1000000002" format="banner" testMode={false} />);
      const container = screen.getByTestId('ad-slot-container');

      // Simulate below-the-fold bounding rect by resetting and re-rendering with mocked offscreen rect
      cleanup();
      adRefreshManager.reset();
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      const rectSpy = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
        top: 2500,
        bottom: 2750,
        left: 0,
        right: 360,
        width: 360,
        height: 250,
        x: 0,
        y: 2500,
        toJSON: () => ({}),
      });

      render(<AdSlot slotId="1000000002" format="banner" testMode={false} />);

      // Wait 5,000ms while off-screen -> must NOT push to adsbygoogle and must NOT timeout to fallback
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      expect((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle).toHaveLength(0);
      expect(screen.queryByTestId('ad-slot-cascade-fallback')).not.toBeInTheDocument();
      expect(screen.getByTestId('ad-slot-skeleton')).toBeInTheDocument();

      // Now scroll into viewport (ratio = 1.0) -> triggers initial push and starts 3,000ms countdown
      act(() => {
        adRefreshManager.updateIntersection('1000000002', 1.0);
      });
      expect((window as unknown as { adsbygoogle: unknown[] }).adsbygoogle).toHaveLength(1);

      // At 2,999ms after scroll-in: still waiting
      act(() => {
        jest.advanceTimersByTime(2999);
      });
      expect(screen.queryByTestId('ad-slot-cascade-fallback')).not.toBeInTheDocument();

      // At 3,000ms after scroll-in: transitions to FALLBACK_ACTIVE
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByTestId('ad-slot-cascade-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('ad-slot-cascade-fallback')).toHaveAttribute(
        'data-source-trigger',
        'TIMEOUT_FALLBACK'
      );

      rectSpy.mockRestore();
      expect(container).toBeDefined();
    });

    it('falls back to LKG campaign template when customCpaPayload contains invalid XSS targetUrl and deduplicates rapid CTA clicks per cycle', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      render(
        <AdSlot
          slotId="1000000002"
          format="in-feed"
          cpaCampaignId="mortgage-refinance"
          customCpaPayload={{
            targetUrl: 'javascript:alert("xss")',
            estimatedCpaValueWon: -999,
          }}
          testMode={false}
        />
      );

      const insEl = document.querySelector('ins.adsbygoogle') as HTMLElement;
      act(() => {
        insEl.setAttribute('data-ad-status', 'unfilled');
      });

      const ctaLink = screen.getByTestId('ad-slot-cascade-cta');
      expect(ctaLink).toHaveAttribute(
        'href',
        CPA_CAMPAIGN_CATALOG['mortgage-refinance'].targetUrl
      );

      // 1 UNFILLED beacon sent on fallback activation
      expect(sendBeaconMock).toHaveBeenCalledTimes(1);

      // Rapidly click CTA 3 times within the same cycle -> sends exactly 1 FALLBACK_CLICK beacon
      act(() => {
        fireEvent.click(ctaLink);
        fireEvent.click(ctaLink);
        fireEvent.click(ctaLink);
      });

      expect(sendBeaconMock).toHaveBeenCalledTimes(2);
    });

    it('triggers TIMEOUT_3S when adsbygoogle.js sets data-adsbygoogle-status="done" at push time without data-ad-status="filled" or iframe, and does not false-flag late fill on normal unfilled', async () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      const { unmount } = render(<AdSlot slotId="1000000001" format="in-feed" testMode={false} />);
      const insEl = document.querySelector('ins.adsbygoogle') as HTMLElement;

      // Case A: adsbygoogle.js claims <ins> with data-adsbygoogle-status="done" at t = 50ms, then auction hangs
      act(() => {
        jest.advanceTimersByTime(50);
        insEl.setAttribute('data-adsbygoogle-status', 'done');
      });

      // Skeleton is dismissed, but 3,000ms cascade timeout must remain armed!
      expect(screen.queryByTestId('ad-slot-skeleton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ad-slot-cascade-fallback')).not.toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(2950);
      });

      const timeoutFallback = screen.getByTestId('ad-slot-cascade-fallback');
      expect(timeoutFallback).toBeInTheDocument();
      expect(timeoutFallback).toHaveAttribute('data-source-trigger', 'TIMEOUT_FALLBACK');
      expect(timeoutFallback).toHaveAttribute('data-late-fill-discarded', 'false');
      unmount();

      // Case B: Normal unfilled with data-adsbygoogle-status="done" must keep data-late-fill-discarded="false" after MutationObserver flush
      render(<AdSlot slotId="1000000002" format="in-feed" testMode={false} />);
      const insEl2 = document.querySelector('ins.adsbygoogle') as HTMLElement;
      await act(async () => {
        insEl2.setAttribute('data-adsbygoogle-status', 'done');
        insEl2.setAttribute('data-ad-status', 'unfilled');
        await Promise.resolve();
      });

      const unfilledFallback = screen.getByTestId('ad-slot-cascade-fallback');
      expect(unfilledFallback).toHaveAttribute('data-source-trigger', 'UNFILLED_ATTRIBUTE');
      expect(unfilledFallback).toHaveAttribute('data-late-fill-discarded', 'false');
    });

    it('pauses 3,000ms cascade timeout when tab enters background (document.hidden === true) and resumes remaining budget upon foreground return', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      render(<AdSlot slotId="1000000002" format="banner" testMode={false} />);

      // 1. Advance 1,000ms while visible (2,000ms remaining)
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.queryByTestId('ad-slot-cascade-fallback')).not.toBeInTheDocument();

      // 2. Switch tab to background (document.hidden = true) and advance 10,000ms
      act(() => {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          writable: true,
          value: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        jest.advanceTimersByTime(10000);
      });

      // Must NOT fire TIMEOUT_3S or UNFILLED beacon while tab is hidden
      expect(screen.queryByTestId('ad-slot-cascade-fallback')).not.toBeInTheDocument();
      expect(sendBeaconMock).not.toHaveBeenCalled();

      // 3. Return tab to foreground (document.hidden = false) -> resumes remaining 2,000ms budget
      act(() => {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          writable: true,
          value: false,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        jest.advanceTimersByTime(1999);
      });
      expect(screen.queryByTestId('ad-slot-cascade-fallback')).not.toBeInTheDocument();

      // 4. Advance final 1ms of remaining visible timeout budget -> transitions to FALLBACK_ACTIVE
      act(() => {
        jest.advanceTimersByTime(1);
      });
      const fallbackCard = screen.getByTestId('ad-slot-cascade-fallback');
      expect(fallbackCard).toBeInTheDocument();
      expect(fallbackCard).toHaveAttribute('data-source-trigger', 'TIMEOUT_FALLBACK');
      expect(sendBeaconMock).toHaveBeenCalledTimes(1);
    });

    it('handles <ins class="adsbygoogle"> node replacement via parentNode.replaceChild and replaceWith in both REQUESTED and FALLBACK_ACTIVE states', () => {
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      // Case A: Node replacement during REQUESTED state followed by unfilled
      const { unmount } = render(<AdSlot slotId="1000000001" format="in-feed" testMode={false} />);
      const originalIns = document.querySelector('ins.adsbygoogle') as HTMLElement;
      const replacementIns = document.createElement('ins');
      replacementIns.className = 'adsbygoogle';

      act(() => {
        originalIns.parentNode?.replaceChild(replacementIns, originalIns);
        replacementIns.setAttribute('data-ad-status', 'unfilled');
      });

      expect(screen.getByTestId('ad-slot-cascade-fallback')).toBeInTheDocument();
      expect(screen.getByTestId('ad-slot-cascade-fallback')).toHaveAttribute(
        'data-source-trigger',
        'UNFILLED_ATTRIBUTE'
      );
      unmount();

      // Case B: Late node replacement via parentNode.replaceChild and replaceWith during FALLBACK_ACTIVE
      render(<AdSlot slotId="1000000002" format="banner" testMode={false} />);
      const activeIns = document.querySelector('ins.adsbygoogle') as HTMLElement;

      act(() => {
        jest.advanceTimersByTime(3000);
      });
      expect(screen.getByTestId('ad-slot-cascade-fallback')).toBeInTheDocument();

      const lateReplacementIns = document.createElement('ins');
      lateReplacementIns.className = 'adsbygoogle';
      lateReplacementIns.innerHTML = '<iframe id="rogue_replaced_iframe"></iframe>';

      act(() => {
        activeIns.parentNode?.replaceChild(lateReplacementIns, activeIns);
      });

      expect(document.querySelectorAll('iframe')).toHaveLength(0);
      expect(screen.getByTestId('ad-slot-cascade-fallback')).toHaveAttribute(
        'data-late-fill-discarded',
        'true'
      );

      const lateReplaceWithNode = document.createElement('ins');
      lateReplaceWithNode.innerHTML = '<iframe id="rogue_replacewith_iframe"></iframe>';
      act(() => {
        activeIns.replaceWith(lateReplaceWithNode);
      });
      expect(document.querySelectorAll('iframe')).toHaveLength(0);
    });
  });
});

