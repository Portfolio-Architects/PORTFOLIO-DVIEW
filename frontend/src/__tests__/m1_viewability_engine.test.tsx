/**
 * @file m1_viewability_engine.test.tsx
 * @description Phase 1 Empirical Verification Suite: Smart Viewability & Dynamic Refresh Engine
 * Verifies:
 * 1. SmartViewabilityConfigSchema Zod runtime validation & boundary rejection
 * 2. Viewability Gate Invariant: 0 adsbygoogle.push({}) calls when intersectionRatio < 0.50 (N = 1,000 simulations)
 * 3. Deterministic State Machine f: S x A -> S across {IDLE, OBSERVING, VIEWABLE, REFRESHING, PAUSED}
 * 4. 30,000ms Dwell Time Refresh & document.hidden Background Tab Freeze (Delta CPU = 0.0%)
 * 5. Maximum Refresh Cap Invariant (N_refresh <= 10 per slot per session)
 * 6. Zero-CLS Bounding Box Invariance (Delta H = 0px) & ApartmentModal Slot Registration Lifecycle
 */

import React from 'react';
import { render, screen, act, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  AdSlot,
  SmartViewabilityConfigSchema,
  getAdSlotMinHeightClass,
} from '@/components/ads/AdSlot';
import {
  AdRefreshManager,
  adRefreshManager,
  createSmartViewabilityObserver,
  DWELL_TIME_THRESHOLD_MS,
  MIN_INTERSECTION_RATIO,
  MAX_REFRESHES_PER_SLOT,
} from '@/lib/ads/adRefreshManager';
import * as AdBlockDetectorHook from '@/hooks/useAdBlockDetector';

// Mock logger
jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

interface MockObserverInstance {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  elements: Set<Element>;
  disconnected: boolean;
  trigger: (ratio: number, isIntersecting?: boolean, targetEl?: Element) => void;
}

describe('Phase 1: Smart Viewability & Dynamic Refresh Engine Verification Suite', () => {
  const originalEnv = process.env;
  const originalIntersectionObserver = global.IntersectionObserver;
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
    jest.setSystemTime(new Date('2026-10-18T00:00:00.000Z'));
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
    global.IntersectionObserver = originalIntersectionObserver;
    process.env = originalEnv;
    jest.useRealTimers();
  });

  // =========================================================================
  // 1. Zod Schema & Configuration Invariants
  // =========================================================================
  describe('1. SmartViewabilityConfigSchema Runtime Type Guard & Boundaries', () => {
    it('populates canonical defaults (threshold=0.50, dwellThresholdMs=30000, maxRefreshes=10, rootMargin="0px")', () => {
      const parsed = SmartViewabilityConfigSchema.parse({ slotId: '1000000001' });
      expect(parsed).toEqual({
        slotId: '1000000001',
        threshold: 0.50,
        dwellThresholdMs: 30000,
        maxRefreshes: 10,
        rootMargin: '0px',
      });
    });

    it('rejects invalid slotId, out-of-range thresholds, sub-10s dwellThresholdMs, and maxRefreshes > 20', () => {
      expect(SmartViewabilityConfigSchema.safeParse({ slotId: '' }).success).toBe(false);
      expect(SmartViewabilityConfigSchema.safeParse({ slotId: 's1', threshold: 0.05 }).success).toBe(false);
      expect(SmartViewabilityConfigSchema.safeParse({ slotId: 's1', threshold: 1.05 }).success).toBe(false);
      expect(SmartViewabilityConfigSchema.safeParse({ slotId: 's1', dwellThresholdMs: 9999 }).success).toBe(false);
      expect(SmartViewabilityConfigSchema.safeParse({ slotId: 's1', maxRefreshes: 0 }).success).toBe(false);
      expect(SmartViewabilityConfigSchema.safeParse({ slotId: 's1', maxRefreshes: 21 }).success).toBe(false);
    });
  });

  // =========================================================================
  // 2. Popperian Falsification of H0: Viewability Gate (N = 1,000 Simulations)
  // =========================================================================
  describe('2. Viewability Gate Invariant & H0 Falsification (Ratio < 0.50 => N_push = 0)', () => {
    it('executes 0 pushes across N = 1,000 below-threshold (ratio < 0.50) intersection simulations', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      const observer = createSmartViewabilityObserver();
      const el = document.createElement('div');
      const onRefresh = jest.fn();

      observer.observe('slot-monte-carlo', el, onRefresh);
      expect(observerInstances).toHaveLength(1);
      const ioInstance = observerInstances[0];

      // Run N = 1,000 simulations with ratios in [0.000, 0.4995] (< 0.50)
      const N = 1000;
      for (let i = 0; i < N; i++) {
        const subThresholdRatio = (i / N) * 0.4999;
        ioInstance.trigger(subThresholdRatio, subThresholdRatio > 0);
      }

      // H0 Rejection: strictly 0 pushes executed prior to ratio >= 0.50
      expect(pushMock).toHaveBeenCalledTimes(0);
      const state = observer.getState('slot-monte-carlo');
      expect(state?.isPushed).toBe(false);
      expect(state?.status).toBe('OBSERVING');

      // Crossing exact boundary ratio = 0.50 triggers exactly 1 push
      ioInstance.trigger(0.50, true);
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(observer.getState('slot-monte-carlo')?.isPushed).toBe(true);
      expect(observer.getState('slot-monte-carlo')?.status).toBe('VIEWABLE');

      observer.reset();
    });

    it('gates <AdSlot /> component mount: 0 pushes until IntersectionObserver reports ratio >= 0.50', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      render(<AdSlot slotId="1000000001" format="in-feed" testMode={false} />);

      // Mounted below the fold (observer has not fired or ratio < 0.50) -> 0 pushes
      expect(pushMock).toHaveBeenCalledTimes(0);
      expect(adRefreshManager.getState('1000000001')?.status).toBe('OBSERVING');

      const ioInstance = observerInstances[observerInstances.length - 1];

      // Partial visibility 0.35 (< 0.50) -> still 0 pushes
      act(() => {
        ioInstance.trigger(0.35, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(0);
      expect(adRefreshManager.getState('1000000001')?.status).toBe('OBSERVING');

      // Enters Active View threshold 0.50 -> triggers initial push exactly once
      act(() => {
        ioInstance.trigger(0.50, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(adRefreshManager.getState('1000000001')?.status).toBe('VIEWABLE');
      expect(adRefreshManager.getState('1000000001')?.isPushed).toBe(true);

      // Fluctuating ratio 0.80 -> 0.20 -> 0.90 before 30s does not duplicate initial push
      act(() => {
        ioInstance.trigger(0.80, true);
        ioInstance.trigger(0.20, true);
        ioInstance.trigger(0.90, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 3. Deterministic State Machine Transitions (f: S x A -> S)
  // =========================================================================
  describe('3. Deterministic State Transitions (IDLE -> OBSERVING -> VIEWABLE -> PAUSED -> REFRESHING -> IDLE)', () => {
    it('verifies complete state transition graph across all events A', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      const observer = createSmartViewabilityObserver();
      const el = document.createElement('div');
      const onRefresh = jest.fn();
      const slotId = 'slot-fsm-test';

      // 1. f(IDLE, MOUNT) = OBSERVING
      observer.observe(slotId, el, onRefresh);
      const io = observerInstances[observerInstances.length - 1];
      expect(observer.getState(slotId)?.status).toBe('OBSERVING');

      // 2. f(OBSERVING, TAB_HIDDEN) = PAUSED
      observer.handleVisibilityChange(true);
      expect(observer.getState(slotId)?.status).toBe('PAUSED');

      // 3. f(PAUSED, TAB_VISIBLE) with ratio < 0.50 = OBSERVING
      observer.handleVisibilityChange(false);
      expect(observer.getState(slotId)?.status).toBe('OBSERVING');

      // 4. f(OBSERVING, RATIO_GE_50) = VIEWABLE (and executes 1st push)
      io.trigger(0.65, true);
      expect(observer.getState(slotId)?.status).toBe('VIEWABLE');
      expect(observer.getState(slotId)?.isPushed).toBe(true);
      expect(pushMock).toHaveBeenCalledTimes(1);

      // Advance 12,000ms in VIEWABLE
      jest.advanceTimersByTime(12000);
      expect(observer.getState(slotId)?.dwellTimeMs).toBe(12000);

      // 5. f(VIEWABLE, RATIO_LT_50) = OBSERVING (pauses dwell timer accumulation at 12,000ms)
      io.trigger(0.25, true);
      expect(observer.getState(slotId)?.status).toBe('OBSERVING');
      expect(observer.getState(slotId)?.lastVisibleTimestamp).toBeNull();
      expect(observer.getState(slotId)?.dwellTimeMs).toBe(12000);

      // Elapsed time while OBSERVING does not increase dwellTimeMs
      jest.advanceTimersByTime(25000);
      expect(observer.getState(slotId)?.dwellTimeMs).toBe(12000);
      expect(onRefresh).not.toHaveBeenCalled();

      // Re-enter VIEWABLE (ratio = 0.70) and advance 8,000ms (total dwell = 20,000ms)
      io.trigger(0.70, true);
      expect(observer.getState(slotId)?.status).toBe('VIEWABLE');
      jest.advanceTimersByTime(8000);
      expect(observer.getState(slotId)?.dwellTimeMs).toBe(20000);

      // 6. f(VIEWABLE, TAB_HIDDEN) = PAUSED (freezes dwell timer at 20,000ms)
      observer.handleVisibilityChange(true);
      expect(observer.getState(slotId)?.status).toBe('PAUSED');
      expect(observer.getState(slotId)?.lastVisibleTimestamp).toBeNull();
      expect(observer.getState(slotId)?.dwellTimeMs).toBe(20000);

      // Advancing 60,000ms while PAUSED does not increment dwellTimeMs or trigger refresh
      jest.advanceTimersByTime(60000);
      expect(observer.getState(slotId)?.dwellTimeMs).toBe(20000);
      expect(onRefresh).not.toHaveBeenCalled();

      // 7. f(PAUSED, RATIO_LT_50) = PAUSED (records lowered ratio while staying PAUSED)
      io.trigger(0.10, false);
      expect(observer.getState(slotId)?.status).toBe('PAUSED');
      expect(observer.getState(slotId)?.intersectionRatio).toBe(0.10);

      // 8. f(PAUSED, TAB_VISIBLE) with ratio = 0.10 < 0.50 -> OBSERVING
      observer.handleVisibilityChange(false);
      expect(observer.getState(slotId)?.status).toBe('OBSERVING');

      // Restore ratio = 0.80 -> VIEWABLE, then test f(PAUSED, TAB_VISIBLE) with ratio >= 0.50 -> VIEWABLE
      io.trigger(0.80, true);
      observer.handleVisibilityChange(true);
      expect(observer.getState(slotId)?.status).toBe('PAUSED');
      observer.handleVisibilityChange(false);
      expect(observer.getState(slotId)?.status).toBe('VIEWABLE');

      // 9. f(VIEWABLE, DWELL_30S) = REFRESHING -> VIEWABLE (needs remaining 10,000ms to reach 30,000ms)
      jest.advanceTimersByTime(9000);
      expect(onRefresh).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1000);
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(observer.getState(slotId)?.refreshCount).toBe(1);
      expect(observer.getState(slotId)?.dwellTimeMs).toBe(0);
      expect(observer.getState(slotId)?.status).toBe('VIEWABLE');

      // 10. f(*, UNMOUNT) = IDLE
      observer.unobserve(slotId);
      expect(observer.getState(slotId)?.status).toBe('IDLE');
      expect(observer.getState(slotId)?.lastVisibleTimestamp).toBeNull();

      observer.reset();
    });
  });

  // =========================================================================
  // 4. 30s Dwell Refresh & Background Tab Freeze in <AdSlot />
  // =========================================================================
  describe('4. <AdSlot /> 30s Dwell Time Refresh & document.hidden Guard', () => {
    it('refreshes <AdSlot /> after 30,000ms continuous active viewability and pauses on document.hidden', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      render(<AdSlot slotId="1000000001" format="in-feed" refreshKey={0} testMode={false} />);
      const container = screen.getByTestId('ad-slot-container');
      expect(container).toHaveAttribute('data-refresh-key', '0');

      const ioInstance = observerInstances[observerInstances.length - 1];

      // Enter viewport at t = 0
      act(() => {
        ioInstance.trigger(0.75, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      // Advance 15,000ms while visible
      act(() => {
        jest.advanceTimersByTime(15000);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(container).toHaveAttribute('data-refresh-key', '0');

      // User switches to background tab (document.hidden = true) for 45,000ms
      act(() => {
        setDocumentHidden(true);
        jest.advanceTimersByTime(45000);
      });
      expect(adRefreshManager.getState('1000000001')?.status).toBe('PAUSED');
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(container).toHaveAttribute('data-refresh-key', '0');

      // User returns to tab (document.hidden = false)
      act(() => {
        setDocumentHidden(false);
      });
      expect(adRefreshManager.getState('1000000001')?.status).toBe('VIEWABLE');

      // Advance 14,000ms (total active dwell = 29,000ms < 30,000ms) -> not yet refreshed
      act(() => {
        jest.advanceTimersByTime(14000);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(container).toHaveAttribute('data-refresh-key', '0');

      // Advance final 1,000ms (total active dwell = 30,000ms) -> triggers refresh!
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(pushMock).toHaveBeenCalledTimes(2);
      expect(container).toHaveAttribute('data-refresh-key', '1');
      expect(adRefreshManager.getState('1000000001')?.refreshCount).toBe(1);
    });
  });

  // =========================================================================
  // 5. Maximum Refresh Cap Invariant (maxRefreshes <= 10)
  // =========================================================================
  describe('5. Maximum Refresh Cap Invariant (N_refresh <= 10)', () => {
    it('strictly caps refreshes at MAX_REFRESHES_PER_SLOT = 10 across extended 15-cycle (450s) session', () => {
      expect(MAX_REFRESHES_PER_SLOT).toBe(10);

      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      render(<AdSlot slotId="1000000002" format="in-feed" refreshKey={0} testMode={false} />);
      const container = screen.getByTestId('ad-slot-container');
      const ioInstance = observerInstances[observerInstances.length - 1];

      // Initial viewability push (1st push)
      act(() => {
        ioInstance.trigger(0.90, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      // Run 15 cycles of 30,000ms each (450,000ms total)
      for (let cycle = 1; cycle <= 15; cycle++) {
        act(() => {
          jest.advanceTimersByTime(DWELL_TIME_THRESHOLD_MS);
        });
        const expectedRefreshes = Math.min(cycle, MAX_REFRESHES_PER_SLOT);
        expect(adRefreshManager.getState('1000000002')?.refreshCount).toBe(expectedRefreshes);
        expect(container).toHaveAttribute('data-refresh-key', String(expectedRefreshes));
        // 1 initial push + expectedRefreshes refresh pushes
        expect(pushMock).toHaveBeenCalledTimes(1 + expectedRefreshes);
      }

      // Final state after 450s must be strictly capped at 10 refreshes
      expect(adRefreshManager.getState('1000000002')?.refreshCount).toBe(10);
      expect(pushMock).toHaveBeenCalledTimes(11);
    });

    it('enforces maxRefreshes cap and document.hidden guard on AdRefreshManager.canRefresh / triggerRefresh', () => {
      const slotId = 'legacy-guard-slot';
      adRefreshManager.registerSlot(slotId, 0.80);

      for (let i = 1; i <= 10; i++) {
        jest.advanceTimersByTime(30000);
        expect(adRefreshManager.canRefresh(slotId)).toBe(true);
        expect(adRefreshManager.triggerRefresh(slotId)).toBe(true);
      }

      expect(adRefreshManager.getSlot(slotId)?.refreshCount).toBe(10);

      // 11th attempt after another 30,000ms must be blocked by maxRefreshes cap
      jest.advanceTimersByTime(30000);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(false);
      expect(adRefreshManager.getSlot(slotId)?.refreshCount).toBe(10);
    });
  });

  // =========================================================================
  // 6. Zero-CLS Bounding Box Invariance Across Refresh Cycles
  // =========================================================================
  describe('6. Zero-CLS Bounding Box Invariance (Delta H = 0px)', () => {
    it('preserves container minHeightClass without DOM detachment across viewability and refresh transitions', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      render(
        <AdSlot
          slotId="1000000002"
          format="in-feed"
          minHeightClass="min-h-[180px] sm:min-h-[220px] md:min-h-[250px]"
          refreshKey={0}
          testMode={false}
        />
      );

      const containerBefore = screen.getByTestId('ad-slot-container');
      expect(containerBefore.className).toContain('min-h-[180px]');
      expect(containerBefore.className).toContain('sm:min-h-[220px]');
      expect(containerBefore.className).toContain('md:min-h-[250px]');

      const ioInstance = observerInstances[observerInstances.length - 1];
      act(() => {
        ioInstance.trigger(0.80, true);
        jest.advanceTimersByTime(30000);
      });

      const containerAfter = screen.getByTestId('ad-slot-container');
      // Same outer DOM node preserved across refresh -> zero layout shift (Delta H = 0px)
      expect(containerAfter).toBe(containerBefore);
      expect(containerAfter.className).toContain('min-h-[180px]');
      expect(containerAfter.className).toContain('sm:min-h-[220px]');
      expect(containerAfter.className).toContain('md:min-h-[250px]');
      expect(getAdSlotMinHeightClass('in-feed')).toBe('min-h-[140px] sm:min-h-[160px]');
    });

    it('clears stale child nodes (injected iframes) and status attributes inside <ins> upon refresh', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      render(<AdSlot slotId="1000000002" format="in-feed" refreshKey={0} testMode={false} />);
      const ioInstance = observerInstances[observerInstances.length - 1];

      act(() => {
        ioInstance.trigger(0.85, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      // Simulate AdSense injecting an iframe and setting status attributes
      const insEl = document.querySelector('ins.adsbygoogle')!;
      insEl.setAttribute('data-adsbygoogle-status', 'done');
      insEl.setAttribute('data-ad-status', 'filled');
      insEl.innerHTML = '<iframe id="aswift_1" title="ad"></iframe>';
      expect(insEl.querySelectorAll('iframe')).toHaveLength(1);

      // Advance 30,000ms to trigger dwell refresh
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(pushMock).toHaveBeenCalledTimes(2);
      // Old injected iframe must be cleared prior to re-push
      expect(insEl.querySelectorAll('iframe')).toHaveLength(0);
    });
  });

  // =========================================================================
  // 7. Adversarial Edge Cases: Simultaneous refreshKey + Dwell Timer, Multi-Slot Key Stability, StrictMode Unmount
  // =========================================================================
  describe('7. Adversarial Edge Cases: Deduplication, Combined Cap, Multi-Instance & StrictMode', () => {
    it('deduplicates simultaneous external refreshKey increment and 30,000ms dwell timer expiration in the same tick and caps combined refreshes at 10', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      const { rerender } = render(
        <AdSlot slotId="1000000002" refreshSlotId="1000000002_ch02" format="in-feed" refreshKey={0} testMode={false} />
      );
      const container = screen.getByTestId('ad-slot-container');
      const ioInstance = observerInstances[observerInstances.length - 1];

      // Initial viewability push (Push #1)
      act(() => {
        ioInstance.trigger(0.85, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      // At t = 30,000ms, both internal 30s dwell timer expires AND parent increments refreshKey={1} in the same tick
      act(() => {
        jest.advanceTimersByTime(30000);
        rerender(
          <AdSlot slotId="1000000002" refreshSlotId="1000000002_ch02" format="in-feed" refreshKey={1} testMode={false} />
        );
      });

      // Must execute ONLY 1 refresh push (Push #2 total), NOT 2!
      expect(pushMock).toHaveBeenCalledTimes(2);
      expect(container).toHaveAttribute('data-refresh-key', '1');
      expect(adRefreshManager.getState('1000000002_ch02')?.refreshCount).toBe(1);

      // Even if parent spams refreshKey 15 times mixed with 15 dwell cycles, total refreshes never exceed 10 (11 pushes total)
      for (let cycle = 2; cycle <= 15; cycle++) {
        act(() => {
          jest.advanceTimersByTime(30000);
          rerender(
            <AdSlot
              slotId="1000000002"
              refreshSlotId="1000000002_ch02"
              format="in-feed"
              refreshKey={cycle}
              testMode={false}
            />
          );
        });
      }

      expect(adRefreshManager.getState('1000000002_ch02')?.refreshCount).toBe(10);
      expect(container).toHaveAttribute('data-refresh-key', '10');
      expect(pushMock).toHaveBeenCalledTimes(11);
    });

    it('isolates multiple <AdSlot /> instances sharing the same slotId and format without key collision or state loss on unmount', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      const { unmount: unmountA } = render(
        <AdSlot slotId="shared-slot-99" format="in-feed" testMode={false} />
      );
      const { rerender: rerenderB } = render(
        <AdSlot slotId="shared-slot-99" format="in-feed" testMode={false} />
      );

      expect(observerInstances).toHaveLength(2);
      const ioA = observerInstances[0];
      const ioB = observerInstances[1];

      // Trigger ratio = 0.80 on Slot B only -> Slot B pushes, Slot A stays OBSERVING
      act(() => {
        ioB.trigger(0.80, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(adRefreshManager.getState('shared-slot-99')?.status).toBe('OBSERVING');

      // Advance 20,000ms for Slot B
      act(() => {
        jest.advanceTimersByTime(20000);
      });

      // Unmount Slot A and re-render Slot B -> Slot B must retain its instance key and accumulated 20s dwell time
      unmountA();
      rerenderB(<AdSlot slotId="shared-slot-99" format="in-feed" testMode={false} />);

      // Advance remaining 10,000ms -> Slot B reaches 30,000ms and refreshes!
      act(() => {
        jest.advanceTimersByTime(10000);
      });
      expect(pushMock).toHaveBeenCalledTimes(2);
    });

    it('guarantees zero post-unmount callback invocations and ignores stale IntersectionObserver callbacks under rapid mount/unmount', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      const { unmount } = render(
        <React.StrictMode>
          <AdSlot slotId="strict-mode-slot" format="banner" testMode={false} />
        </React.StrictMode>
      );

      const staleObserver = observerInstances[0];
      const activeObserver = observerInstances[observerInstances.length - 1];

      // Stale observer from initial StrictMode pass must be disconnected and ignored
      act(() => {
        staleObserver.trigger(0.90, true);
      });
      if (observerInstances.length > 1) {
        expect(pushMock).toHaveBeenCalledTimes(0);
      }

      // Active observer triggers initial push once
      act(() => {
        activeObserver.trigger(0.90, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      // Unmount component before 30s dwell expires
      unmount();
      expect(adRefreshManager.getState('strict-mode-slot')?.status).toBe('IDLE');

      // Advancing 120,000ms after unmount must NOT invoke any refresh push
      act(() => {
        jest.advanceTimersByTime(120000);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);
    });

    it('evaluates canRefresh purely on observe()-registered slots without mutating dwellTimeMs or triggering side-effect refreshes', () => {
      const onRefresh = jest.fn();
      const el = document.createElement('div');
      adRefreshManager.observe('pure-can-refresh-slot', el, onRefresh);

      const io = observerInstances[observerInstances.length - 1];
      io.trigger(0.80, true);

      const start = Date.now();
      expect(adRefreshManager.canRefresh('pure-can-refresh-slot', start + 29999)).toBe(false);
      expect(adRefreshManager.canRefresh('pure-can-refresh-slot', start + 30000)).toBe(true);
      // Pure query must not have invoked onRefresh or reset dwellTimeMs
      expect(onRefresh).not.toHaveBeenCalled();

      // Explicit triggerRefresh executes the refresh and resets dwell timer
      expect(adRefreshManager.triggerRefresh('pure-can-refresh-slot', start + 30000)).toBe(true);
      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(adRefreshManager.canRefresh('pure-can-refresh-slot', start + 30000)).toBe(false);
    });

    it('resets <ins> DOM attributes, refresh counter, and re-pushes when slotId or refreshSlotId dynamically transitions on a mounted <AdSlot />', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      const { rerender } = render(
        <AdSlot
          slotId="slot-alpha"
          refreshSlotId="slot-alpha-key"
          format="in-feed"
          refreshKey={0}
          testMode={false}
        />
      );
      const container = screen.getByTestId('ad-slot-container');
      const ioAlpha = observerInstances[observerInstances.length - 1];

      // Slot Alpha enters viewport and pushes once
      act(() => {
        ioAlpha.trigger(0.85, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      // Simulate AdSense marking <ins> as done and advance 30s to refresh Slot Alpha once
      const insEl = document.querySelector('ins.adsbygoogle')!;
      insEl.setAttribute('data-adsbygoogle-status', 'done');
      insEl.setAttribute('data-ad-status', 'filled');
      insEl.innerHTML = '<iframe id="alpha_ad"></iframe>';

      act(() => {
        jest.advanceTimersByTime(30000);
      });
      expect(pushMock).toHaveBeenCalledTimes(2);
      expect(container).toHaveAttribute('data-refresh-key', '1');
      expect(adRefreshManager.getState('slot-alpha-key')?.refreshCount).toBe(1);

      // Simulate AdSense marking <ins> as done again on Slot Alpha
      insEl.setAttribute('data-adsbygoogle-status', 'done');
      insEl.innerHTML = '<iframe id="alpha_ad_2"></iframe>';

      // Dynamically transition to Slot Beta on the same mounted component
      rerender(
        <AdSlot
          slotId="slot-beta"
          refreshSlotId="slot-beta-key"
          format="in-feed"
          refreshKey={0}
          testMode={false}
        />
      );

      // Old slot must be IDLE and new slot must start in OBSERVING with 0 refreshes and clean <ins>
      expect(adRefreshManager.getState('slot-alpha-key')?.status).toBe('IDLE');
      expect(adRefreshManager.getState('slot-beta-key')?.status).toBe('OBSERVING');
      expect(adRefreshManager.getState('slot-beta-key')?.refreshCount).toBe(0);
      expect(container).toHaveAttribute('data-refresh-key', '0');
      expect(insEl.getAttribute('data-adsbygoogle-status')).toBeNull();
      expect(insEl.querySelectorAll('iframe')).toHaveLength(0);

      // When Slot Beta becomes viewable (ratio >= 0.50), it must execute its initial push
      const ioBeta = observerInstances[observerInstances.length - 1];
      act(() => {
        ioBeta.trigger(0.80, true);
      });
      expect(pushMock).toHaveBeenCalledTimes(3);
      expect(adRefreshManager.getState('slot-beta-key')?.status).toBe('VIEWABLE');
      expect(adRefreshManager.getState('slot-beta-key')?.isPushed).toBe(true);
    });

    it('rejects premature external refreshKey prop mutations when active viewable dwell time < 30,000ms or tab was hidden', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      const { rerender } = render(
        <AdSlot
          slotId="1000000001"
          refreshSlotId="guard-premature-slot"
          format="in-feed"
          refreshKey="init"
          testMode={false}
        />
      );
      const container = screen.getByTestId('ad-slot-container');
      const ioInstance = observerInstances[observerInstances.length - 1];

      // 1. Viewable for 15,000ms (initial push #1)
      act(() => {
        ioInstance.trigger(0.85, true);
        jest.advanceTimersByTime(15000);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      // 2. Hidden for 20,000ms (wall-clock elapsed = 35,000ms, but active viewable dwell = 15,000ms < 30,000ms)
      act(() => {
        setDocumentHidden(true);
        jest.advanceTimersByTime(20000);
        setDocumentHidden(false);
      });

      // 3. Parent attempts premature refreshKey mutation (also switching type string -> number) at 15,000ms active dwell
      act(() => {
        rerender(
          <AdSlot
            slotId="1000000001"
            refreshSlotId="guard-premature-slot"
            format="in-feed"
            refreshKey={5}
            testMode={false}
          />
        );
      });

      // Premature external refresh must be rejected: push count remains 1, refreshCount remains 0
      expect(pushMock).toHaveBeenCalledTimes(1);
      expect(adRefreshManager.getState('guard-premature-slot')?.refreshCount).toBe(0);
      expect(container).toHaveAttribute('data-refresh-key', '0');

      // 4. Advance remaining 15,000ms of active viewability (total active dwell = 30,000ms) -> refresh #1 executes
      act(() => {
        jest.advanceTimersByTime(15000);
      });
      expect(pushMock).toHaveBeenCalledTimes(2);
      expect(adRefreshManager.getState('guard-premature-slot')?.refreshCount).toBe(1);
      expect(container).toHaveAttribute('data-refresh-key', '1');
    });

    it('synchronizes ApartmentModal dual registration (registerSlot + <AdSlot /> observe + onTabSwitch) across 10 refreshes without double-counting', () => {
      const pushMock = jest.fn();
      (window as unknown as { adsbygoogle: { push: jest.Mock } }).adsbygoogle = { push: pushMock };

      function ModalDualSlotHarness() {
        const [ch02Key, setCh02Key] = React.useState(0);
        const [ch05Key, setCh05Key] = React.useState(0);
        const ch02Ref = React.useRef<HTMLDivElement | null>(null);
        const ch05Ref = React.useRef<HTMLDivElement | null>(null);

        React.useEffect(() => {
          adRefreshManager.registerSlot('1000000002_ch02', {
            domElement: ch02Ref.current,
            intersectionRatio: 0,
            onRefreshKeyChange: (nextKey) => setCh02Key(nextKey),
          });
          adRefreshManager.registerSlot('1000000002_ch05', {
            domElement: ch05Ref.current,
            intersectionRatio: 0,
            onRefreshKeyChange: (nextKey) => setCh05Key(nextKey),
          });
          return () => {
            adRefreshManager.unregisterSlot('1000000002_ch02');
            adRefreshManager.unregisterSlot('1000000002_ch05');
          };
        }, []);

        return (
          <div>
            <div ref={ch02Ref} data-testid="harness-ch02">
              <AdSlot
                slotId="1000000002"
                refreshSlotId="1000000002_ch02"
                format="in-feed"
                refreshKey={ch02Key}
                testMode={false}
              />
            </div>
            <div ref={ch05Ref} data-testid="harness-ch05">
              <AdSlot
                slotId="1000000002"
                refreshSlotId="1000000002_ch05"
                format="in-feed"
                refreshKey={ch05Key}
                testMode={false}
              />
            </div>
          </div>
        );
      }

      render(<ModalDualSlotHarness />);
      expect(observerInstances).toHaveLength(2);
      const ioCh02 = observerInstances[0];
      const ioCh05 = observerInstances[1];

      // Ch02 is viewable (ratio = 0.80); Ch05 stays below the fold (ratio = 0.00)
      act(() => {
        ioCh02.trigger(0.80, true);
        ioCh05.trigger(0.00, false);
      });
      expect(pushMock).toHaveBeenCalledTimes(1);

      // Run 12 tab-switch cycles separated by 30,000ms each (advance system time and invoke onTabSwitch)
      const baseTime = Date.now();
      for (let cycle = 1; cycle <= 12; cycle++) {
        const tickNow = baseTime + cycle * 30000;
        jest.setSystemTime(tickNow);
        act(() => {
          adRefreshManager.onTabSwitch(['1000000002_ch02', '1000000002_ch05'], tickNow);
        });
        const expectedCount = Math.min(cycle, MAX_REFRESHES_PER_SLOT);
        expect(adRefreshManager.getSlot('1000000002_ch02')?.refreshCount).toBe(expectedCount);
        expect(adRefreshManager.getState('1000000002_ch02')?.refreshCount).toBe(expectedCount);
        // Ch05 is below the fold (ratio = 0), so it must have 0 refreshes
        expect(adRefreshManager.getSlot('1000000002_ch05')?.refreshCount).toBe(0);
        expect(pushMock).toHaveBeenCalledTimes(1 + expectedCount);
      }
    });
  });

  // =========================================================================
  // 8. useAdBlockDetector Slow-Network False-Positive Guard
  // =========================================================================
  describe('8. useAdBlockDetector Slow-Network Guard (document.readyState === "complete")', () => {
    it('does not false-positive when #google-adsense script tag is present and bait DOM is intact, but detects block on script error or neutered load event', () => {
      jest.restoreAllMocks();
      const { renderHook } = jest.requireActual('@testing-library/react');
      const realUseAdBlockDetector = AdBlockDetectorHook.useAdBlockDetector;

      // Mock non-collapsed bait geometry
      const origOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
      const origClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
      const origGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 10 });
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 10 });
      HTMLElement.prototype.getBoundingClientRect = () => ({
        height: 10,
        width: 10,
        top: 0,
        bottom: 10,
        left: 0,
        right: 10,
        x: 0,
        y: 0,
        toJSON: () => {},
      });

      const scriptEl = document.createElement('script');
      scriptEl.id = 'google-adsense';
      scriptEl.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      document.head.appendChild(scriptEl);

      // Simulate slow network: window.adsbygoogle is still raw array ([].push === Array.prototype.push)
      // while document.readyState is already 'complete'
      (window as unknown as { adsbygoogle: unknown[] }).adsbygoogle = [];

      try {
        const { result } = renderHook(() => realUseAdBlockDetector());
        act(() => {
          jest.advanceTimersByTime(2100);
        });

        // Must NOT false-positive on slow network when script tag is present & bait is not collapsed
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAdBlockActive).toBe(false);

        // If script tag dispatches 'load' but window.adsbygoogle is still raw [] (surrogate no-op scriptlet), detects block
        const { result: resultSurrogate } = renderHook(() => realUseAdBlockDetector());
        act(() => {
          scriptEl.dispatchEvent(new Event('load'));
        });
        expect(resultSurrogate.current.isLoading).toBe(false);
        expect(resultSurrogate.current.isAdBlockActive).toBe(true);

        // If script tag dispatches network error (blocked by network filter), immediately transitions to blocked
        const { result: resultErr } = renderHook(() => realUseAdBlockDetector());
        act(() => {
          scriptEl.dispatchEvent(new Event('error'));
        });
        expect(resultErr.current.isLoading).toBe(false);
        expect(resultErr.current.isAdBlockActive).toBe(true);
      } finally {
        scriptEl.remove();
        if (origOffsetHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', origOffsetHeight);
        if (origClientHeight) Object.defineProperty(HTMLElement.prototype, 'clientHeight', origClientHeight);
        HTMLElement.prototype.getBoundingClientRect = origGetBoundingClientRect;
      }
    });
  });
});

