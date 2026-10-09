/**
 * @file m2_r3_ad_refresh_boundary.challenger.test.ts
 * @description Empirical Challenger Adversarial Verification Suite:
 * 1. Exact millisecond boundary condition (29,999ms vs 30,000ms vs 30,001ms)
 * 2. Exact intersection ratio boundary condition (0.499000 vs 0.500000 vs 0.500001)
 * 3. Exact post-refresh dwell time reset invariant (t=0 -> 30,000 -> 60,000 -> 90,000)
 * 4. Fuzzing & adversarial robustness (NaN, Infinity, negative time/ratio, null/undefined slotId)
 * 5. Dual-protocol dispatch execution: googletagSlot targeted vs global refresh, onRefresh/onRefreshKeyChange callbacks
 * 6. Error containment & fault vector isolation (GPT throwing, callback throwing)
 * 7. onTabSwitch partitioning invariants & candidate filtering
 */

import {
  AdRefreshManager,
  adRefreshManager,
  DWELL_TIME_THRESHOLD_MS,
  MIN_INTERSECTION_RATIO,
} from '@/lib/ads/adRefreshManager';
import { logger } from '@/lib/services/logger';

describe('Milestone 2 - R3 AdRefreshManager Empirical Boundary Challenger', () => {
  let mockPubadsRefresh: jest.Mock;
  let loggerWarnSpy: jest.SpyInstance;
  let gptPubadsMock: { refresh: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-09T00:00:00.000Z'));
    adRefreshManager.reset();

    mockPubadsRefresh = jest.fn();
    gptPubadsMock = { refresh: mockPubadsRefresh };

    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    window.googletag = {
      cmd: [],
      pubads: jest.fn().mockReturnValue(gptPubadsMock),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    loggerWarnSpy.mockRestore();
    delete window.googletag;
  });

  describe('Dimension 1: Exact Millisecond Boundary Invariants (29,999ms vs 30,000ms)', () => {
    it('enforces DWELL_TIME_THRESHOLD_MS = 30000ms scalar invariant', () => {
      expect(DWELL_TIME_THRESHOLD_MS).toBe(30000);
      expect(typeof DWELL_TIME_THRESHOLD_MS).toBe('number');
    });

    it('rejects refresh at Delta t = 29,999ms and authorizes at Delta t = 30,000ms', () => {
      const slotId = 'slot_boundary_test_1';
      adRefreshManager.registerSlot(slotId, 0.50);

      // t = 0ms: Registered
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);

      // t = 29,999ms: 1ms before threshold
      jest.advanceTimersByTime(29999);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(false);
      expect(mockPubadsRefresh).not.toHaveBeenCalled();

      // t = 30,000ms: Exact boundary
      jest.advanceTimersByTime(1);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(true);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(1);
    });

    it('authorizes refresh at Delta t = 30,001ms', () => {
      const slotId = 'slot_boundary_test_2';
      adRefreshManager.registerSlot(slotId, 0.50);

      jest.advanceTimersByTime(30001);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(true);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(1);
    });

    it('rejects refresh if current timestamp represents negative elapsed time', () => {
      const slotId = 'slot_negative_time';
      const initialTime = Date.now();
      adRefreshManager.registerSlot(slotId, 0.80);

      // Simulate clock backward skew (now < lastRefreshedAt)
      const skewedPastTime = initialTime - 5000;
      expect(adRefreshManager.canRefresh(slotId, skewedPastTime)).toBe(false);
      expect(adRefreshManager.triggerRefresh(slotId, skewedPastTime)).toBe(false);
      expect(mockPubadsRefresh).not.toHaveBeenCalled();
    });
  });

  describe('Dimension 2: Exact Viewport Intersection Ratio Boundary Invariants (0.499 vs 0.500)', () => {
    it('enforces MIN_INTERSECTION_RATIO = 0.50 scalar invariant', () => {
      expect(MIN_INTERSECTION_RATIO).toBe(0.50);
      expect(typeof MIN_INTERSECTION_RATIO).toBe('number');
    });

    it('rejects refresh at intersectionRatio = 0.499000 and 0.499999 despite Delta t >= 30,000ms', () => {
      const slotId = 'slot_ratio_boundary_1';
      adRefreshManager.registerSlot(slotId, 0.499);
      jest.advanceTimersByTime(30000);

      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(false);
      expect(mockPubadsRefresh).not.toHaveBeenCalled();

      // Test extreme fractional boundary: 0.499999
      adRefreshManager.updateIntersection(slotId, 0.499999);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(false);
      expect(mockPubadsRefresh).not.toHaveBeenCalled();
    });

    it('authorizes refresh at intersectionRatio = 0.500000 and 0.500001 when Delta t >= 30,000ms', () => {
      const slotId = 'slot_ratio_boundary_2';
      adRefreshManager.registerSlot(slotId, 0.499);
      jest.advanceTimersByTime(30000);

      // Transition to exact 0.50 boundary
      adRefreshManager.updateIntersection(slotId, 0.50);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);

      // Transition to 0.500001
      adRefreshManager.updateIntersection(slotId, 0.500001);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(true);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(1);
    });

    it('clamps adversarial out-of-bound ratios: negative values clamp to 0, values > 1 clamp to 1', () => {
      const slotId = 'slot_ratio_clamp';
      adRefreshManager.registerSlot(slotId, 0.50);
      jest.advanceTimersByTime(30000);

      // Negative ratio
      adRefreshManager.updateIntersection(slotId, -0.75);
      let state = adRefreshManager.getSlot(slotId);
      expect(state?.intersectionRatio).toBe(0);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);

      // Over 1.0 ratio
      adRefreshManager.updateIntersection(slotId, 1.85);
      state = adRefreshManager.getSlot(slotId);
      expect(state?.intersectionRatio).toBe(1.0);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
    });

    it('handles NaN and Infinity intersection ratios by clamping to 0', () => {
      const slotId = 'slot_nan_ratio';
      adRefreshManager.registerSlot(slotId, NaN);
      jest.advanceTimersByTime(30000);

      let state = adRefreshManager.getSlot(slotId);
      expect(state?.intersectionRatio).toBe(0);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);

      adRefreshManager.updateIntersection(slotId, Infinity);
      state = adRefreshManager.getSlot(slotId);
      expect(state?.intersectionRatio).toBe(0);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);

      adRefreshManager.updateIntersection(slotId, -Infinity);
      state = adRefreshManager.getSlot(slotId);
      expect(state?.intersectionRatio).toBe(0);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
    });
  });

  describe('Dimension 3: Immediate Post-Refresh Reset Invariant & Multi-Cycle Dwell Protection', () => {
    it('guarantees sequential 30,000ms dwell cycles across multiple refresh generations', () => {
      const slotId = 'slot_multi_cycle';
      const onRefreshMock = jest.fn();
      adRefreshManager.registerSlot(slotId, 0.75, onRefreshMock);

      // Cycle 0: Initial state at t = 0
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);

      // Cycle 1: Advance to t = 30,000ms -> Trigger 1st Refresh
      jest.advanceTimersByTime(30000);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(true);
      expect(onRefreshMock).toHaveBeenLastCalledWith(1);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(1);

      // Immediate post-refresh at t = 30,000ms: MUST BE BLOCKED
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(false);

      // 1ms after 1st refresh at t = 30,001ms: MUST BE BLOCKED
      jest.advanceTimersByTime(1);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);

      // 29,999ms after 1st refresh at t = 59,999ms: MUST BE BLOCKED
      jest.advanceTimersByTime(29998); // 30001 + 29998 = 59999
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(false);

      // 30,000ms after 1st refresh at t = 60,000ms: AUTHORIZED for Cycle 2
      jest.advanceTimersByTime(1);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(true);
      expect(onRefreshMock).toHaveBeenLastCalledWith(2);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(2);

      // Cycle 3: Advance another 30,000ms to t = 90,000ms
      jest.advanceTimersByTime(30000);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(true);
      expect(onRefreshMock).toHaveBeenLastCalledWith(3);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(3);

      const state = adRefreshManager.getSlot(slotId);
      expect(state?.refreshCount).toBe(3);
    });
  });

  describe('Dimension 4: Dual-Protocol Dispatch & Targeted GPT Execution', () => {
    it('dispatches targeted googletag.pubads().refresh([slot]) when googletagSlot is registered', () => {
      const slotId = 'slot_targeted_gpt';
      const mockGptSlot = { slot: 'gpt-slot-ch02-token' };

      adRefreshManager.registerSlot(slotId, {
        intersectionRatio: 0.60,
        googletagSlot: mockGptSlot,
      });

      jest.advanceTimersByTime(30000);
      const success = adRefreshManager.triggerRefresh(slotId);

      expect(success).toBe(true);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(1);
      expect(mockPubadsRefresh).toHaveBeenCalledWith([mockGptSlot]);
    });

    it('dispatches global googletag.pubads().refresh() with no args when googletagSlot is omitted', () => {
      const slotId = 'slot_global_gpt';

      adRefreshManager.registerSlot(slotId, {
        intersectionRatio: 0.60,
      });

      jest.advanceTimersByTime(30000);
      const success = adRefreshManager.triggerRefresh(slotId);

      expect(success).toBe(true);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(1);
      expect(mockPubadsRefresh).toHaveBeenCalledWith();
    });

    it('notifies both onRefresh and onRefreshKeyChange callbacks with sequential keys', () => {
      const slotId = 'slot_dual_callbacks';
      const onRefresh = jest.fn();
      const onRefreshKeyChange = jest.fn();

      adRefreshManager.registerSlot(slotId, {
        intersectionRatio: 0.90,
        onRefresh,
        onRefreshKeyChange,
      });

      jest.advanceTimersByTime(30000);
      adRefreshManager.triggerRefresh(slotId);

      expect(onRefresh).toHaveBeenCalledTimes(1);
      expect(onRefresh).toHaveBeenCalledWith(1);
      expect(onRefreshKeyChange).toHaveBeenCalledTimes(1);
      expect(onRefreshKeyChange).toHaveBeenCalledWith(1);

      jest.advanceTimersByTime(30000);
      adRefreshManager.triggerRefresh(slotId);

      expect(onRefresh).toHaveBeenCalledTimes(2);
      expect(onRefresh).toHaveBeenCalledWith(2);
      expect(onRefreshKeyChange).toHaveBeenCalledTimes(2);
      expect(onRefreshKeyChange).toHaveBeenCalledWith(2);
    });
  });

  describe('Dimension 5: Error Isolation & Fault Vector Containment', () => {
    it('isolates googletag.pubads().refresh exceptions, prevents bubbling, and maintains state progression', () => {
      mockPubadsRefresh.mockImplementation(() => {
        throw new Error('GPT Network/PubAds Hardware Failure');
      });

      const slotId = 'slot_gpt_fault';
      const onRefresh = jest.fn();
      adRefreshManager.registerSlot(slotId, 0.80, onRefresh);

      jest.advanceTimersByTime(30000);

      let success: boolean = false;
      expect(() => {
        success = adRefreshManager.triggerRefresh(slotId);
      }).not.toThrow();

      expect(success).toBe(true);
      expect(onRefresh).toHaveBeenCalledWith(1);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'AdRefreshManager',
        expect.stringContaining('googletag refresh invocation error'),
        undefined,
        expect.any(Error)
      );

      const state = adRefreshManager.getSlot(slotId);
      expect(state?.refreshCount).toBe(1);
    });

    it('isolates user callback exceptions without aborting refresh return value', () => {
      const faultyCallback = jest.fn().mockImplementation(() => {
        throw new Error('React Component State Unmount Error');
      });

      const slotId = 'slot_callback_fault';
      adRefreshManager.registerSlot(slotId, 0.80, faultyCallback);

      jest.advanceTimersByTime(30000);

      let success: boolean = false;
      expect(() => {
        success = adRefreshManager.triggerRefresh(slotId);
      }).not.toThrow();

      expect(success).toBe(true);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'AdRefreshManager',
        expect.stringContaining('onRefresh callback execution error'),
        undefined,
        expect.any(Error)
      );
    });

    it('tolerates window.googletag being null, undefined, or missing pubads method', () => {
      delete window.googletag;
      const slotId = 'slot_no_gpt';
      adRefreshManager.registerSlot(slotId, 1.0);

      jest.advanceTimersByTime(30000);
      expect(() => {
        const refreshed = adRefreshManager.triggerRefresh(slotId);
        expect(refreshed).toBe(true);
      }).not.toThrow();

      // window.googletag with null pubads
      window.googletag = { cmd: [], pubads: null as unknown as () => unknown };
      jest.advanceTimersByTime(30000);
      expect(() => {
        const refreshed = adRefreshManager.triggerRefresh(slotId);
        expect(refreshed).toBe(true);
      }).not.toThrow();
    });
  });

  describe('Dimension 6: Fuzzing Unregistered & Nil Slot Identifiers', () => {
    it('returns false for null, undefined, and non-existent slot IDs without throwing', () => {
      expect(adRefreshManager.canRefresh(null as unknown as string)).toBe(false);
      expect(adRefreshManager.canRefresh(undefined as unknown as string)).toBe(false);
      expect(adRefreshManager.canRefresh('')).toBe(false);
      expect(adRefreshManager.canRefresh('unregistered_slot_xyz')).toBe(false);

      expect(adRefreshManager.triggerRefresh(null as unknown as string)).toBe(false);
      expect(adRefreshManager.triggerRefresh(undefined as unknown as string)).toBe(false);
      expect(adRefreshManager.triggerRefresh('')).toBe(false);
      expect(adRefreshManager.triggerRefresh('unregistered_slot_xyz')).toBe(false);

      expect(() => adRefreshManager.updateIntersection(null as unknown as string, 0.9)).not.toThrow();
      expect(() => adRefreshManager.updateIntersection('unregistered_slot_xyz', 0.9)).not.toThrow();
      expect(() => adRefreshManager.unregisterSlot(null as unknown as string)).not.toThrow();
      expect(adRefreshManager.getSlot(null as unknown as string)).toBeUndefined();
    });
  });

  describe('Dimension 7: onTabSwitch Partition Invariants & Coercion Consistency', () => {
    it('strictly satisfies partition theorem: refreshed.length + skipped.length === candidateSlotIds.length', () => {
      const s1 = 'slot_1000000002_ch02';
      const s2 = 'slot_1000000002_ch05';
      const s3 = 'slot_1000000001_infeed';

      // s1: Eligible (t >= 30s, ratio = 0.8)
      adRefreshManager.registerSlot(s1, 0.80);
      // s2: Ineligible (ratio = 0.2 < 0.50)
      adRefreshManager.registerSlot(s2, 0.20);
      // s3: Ineligible (Delta t = 0 < 30s)
      jest.advanceTimersByTime(30000);
      adRefreshManager.registerSlot(s3, 0.90);

      const result = adRefreshManager.onTabSwitch([s1, s2, s3]);

      expect(result.refreshed).toEqual([s1]);
      expect(result.skipped).toEqual([s2, s3]);
      expect(result.count).toBe(1);
      expect(result.refreshed.length + result.skipped.length).toBe(3);

      // Arithmetic coercion invariant
      expect(result.valueOf()).toBe(1);
      expect(Number(result)).toBe(1);
      expect(result.count === 1).toBe(true);
    });

    it('falls back to all registered slots when candidateSlotIds is omitted or empty', () => {
      const s1 = 'slot_fallback_1';
      const s2 = 'slot_fallback_2';

      adRefreshManager.registerSlot(s1, 0.70);
      adRefreshManager.registerSlot(s2, 0.70);
      jest.advanceTimersByTime(30000);

      // Calling with empty array
      const resultEmptyArray = adRefreshManager.onTabSwitch([]);
      expect(resultEmptyArray.refreshed).toEqual([s1, s2]);
      expect(resultEmptyArray.count).toBe(2);
    });
  });
});
