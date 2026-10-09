import {
  AdRefreshManager,
  adRefreshManager,
  DWELL_TIME_THRESHOLD_MS,
  MIN_INTERSECTION_RATIO,
} from './adRefreshManager';
import { logger } from '@/lib/services/logger';

describe('AdRefreshManager - Deterministic Ad Refresh Engine', () => {
  let mockPubadsRefresh: jest.Mock;
  let loggerWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-09T12:00:00.000Z'));
    adRefreshManager.reset();
    mockPubadsRefresh = jest.fn();
    loggerWarnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {});

    // Default window.googletag mock
    window.googletag = {
      cmd: [],
      pubads: jest.fn().mockReturnValue({
        refresh: mockPubadsRefresh,
      }),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    loggerWarnSpy.mockRestore();
    delete window.googletag;
  });

  describe('Mathematical Boundary Invariants', () => {
    it('verifies DWELL_TIME_THRESHOLD_MS is exactly 30,000ms', () => {
      expect(DWELL_TIME_THRESHOLD_MS).toBe(30000);
    });

    it('verifies MIN_INTERSECTION_RATIO is exactly 0.50', () => {
      expect(MIN_INTERSECTION_RATIO).toBe(0.50);
    });
  });

  describe('Core Dispatch Requirements (1 ~ 7)', () => {
    // 1. Immediate refresh blocked upon initial registration (Delta t = 0 < 30,000)
    it('1. blocks immediate refresh upon initial registration when Delta t = 0 < 30,000ms', () => {
      const slotId = '1000000002_ch02';
      adRefreshManager.registerSlot(slotId, 1.0);

      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      const refreshed = adRefreshManager.triggerRefresh(slotId);
      expect(refreshed).toBe(false);
      expect(mockPubadsRefresh).not.toHaveBeenCalled();
    });

    // 2. Refresh blocked when Delta t < 30,000ms (e.g. 15s elapsed, ratio 1.0)
    it('2. blocks refresh when Delta t < 30,000ms even with 100% intersection ratio (15s elapsed)', () => {
      const slotId = '1000000002_ch02';
      adRefreshManager.registerSlot(slotId, 1.0);

      // Advance by 15,000ms
      jest.advanceTimersByTime(15000);

      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      const refreshed = adRefreshManager.triggerRefresh(slotId);
      expect(refreshed).toBe(false);
      expect(mockPubadsRefresh).not.toHaveBeenCalled();
    });

    // 3. Refresh blocked when Delta t >= 30,000ms but ratio < 0.50 (e.g. 35s elapsed, ratio 0.40)
    it('3. blocks refresh when Delta t >= 30,000ms but intersection ratio < 0.50 (35s elapsed, ratio 0.40)', () => {
      const slotId = '1000000002_ch02';
      adRefreshManager.registerSlot(slotId, 0.40);

      // Advance by 35,000ms
      jest.advanceTimersByTime(35000);

      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      const refreshed = adRefreshManager.triggerRefresh(slotId);
      expect(refreshed).toBe(false);
      expect(mockPubadsRefresh).not.toHaveBeenCalled();
    });

    // 4. Refresh SUCCESS when Delta t >= 30,000ms AND ratio >= 0.50 (e.g. 30,001ms, ratio 0.50)
    it('4. triggers refresh SUCCESS when Delta t >= 30,000ms and ratio >= 0.50 (30,001ms, ratio 0.50)', () => {
      const slotId = '1000000002_ch02';
      const onRefreshMock = jest.fn();
      adRefreshManager.registerSlot(slotId, 0.50, onRefreshMock);

      // Advance by 30,001ms
      jest.advanceTimersByTime(30001);

      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
      const refreshed = adRefreshManager.triggerRefresh(slotId);
      expect(refreshed).toBe(true);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(1);
      expect(onRefreshMock).toHaveBeenCalledWith(1);

      const state = adRefreshManager.getSlot(slotId);
      expect(state?.refreshCount).toBe(1);
    });

    // 5. Subsequent refresh requires another 30s interval from the new refresh timestamp
    it('5. requires another 30,000ms dwell time interval after a successful refresh', () => {
      const slotId = '1000000002_ch02';
      const onRefreshMock = jest.fn();
      adRefreshManager.registerSlot(slotId, 0.80, onRefreshMock);

      // 1st successful refresh at t = 30,000ms
      jest.advanceTimersByTime(30000);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(true);
      expect(onRefreshMock).toHaveBeenCalledTimes(1);
      expect(onRefreshMock).toHaveBeenLastCalledWith(1);

      // 10s after 1st refresh (Delta t = 10,000ms) -> BLOCKED
      jest.advanceTimersByTime(10000);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(false);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(1);

      // 20s more after 1st refresh (Total 30,000ms from 1st refresh) -> SUCCESS
      jest.advanceTimersByTime(20000);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(true);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(2);
      expect(onRefreshMock).toHaveBeenCalledTimes(2);
      expect(onRefreshMock).toHaveBeenLastCalledWith(2);

      const state = adRefreshManager.getSlot(slotId);
      expect(state?.refreshCount).toBe(2);
    });

    // 6. onTabSwitch correctly returns refreshed and skipped lists for multiple slots
    it('6. onTabSwitch correctly partitions multiple slots into refreshed and skipped lists', () => {
      const slotEligible = '1000000002_ch02';
      const slotInsufficientDwell = '1000000002_ch05';
      const slotInsufficientRatio = '1000000001_feed';

      // Register eligible slot at t = 0 with ratio 0.9
      adRefreshManager.registerSlot(slotEligible, 0.90);

      // Advance by 30,000ms
      jest.advanceTimersByTime(30000);

      // Register slotInsufficientDwell at t = 30,000ms (Delta t = 0)
      adRefreshManager.registerSlot(slotInsufficientDwell, 0.80);

      // Register slotInsufficientRatio at t = 0, but update ratio to 0.2
      adRefreshManager.registerSlot(slotInsufficientRatio, 0.20);

      const result = adRefreshManager.onTabSwitch();

      expect(result.refreshed).toEqual([slotEligible]);
      expect(result.skipped).toContain(slotInsufficientDwell);
      expect(result.skipped).toContain(slotInsufficientRatio);
      expect(result.count).toBe(1);
      expect(mockPubadsRefresh).toHaveBeenCalledTimes(1);
    });

    // 7. Handles missing googletag gracefully without throwing runtime exceptions
    it('7. handles missing googletag gracefully without throwing exceptions', () => {
      delete window.googletag;
      const slotId = '1000000002_ch02';
      const onRefreshMock = jest.fn();
      adRefreshManager.registerSlot(slotId, 0.70, onRefreshMock);

      jest.advanceTimersByTime(30000);

      expect(() => {
        const refreshed = adRefreshManager.triggerRefresh(slotId);
        expect(refreshed).toBe(true);
      }).not.toThrow();

      expect(onRefreshMock).toHaveBeenCalledWith(1);
    });
  });

  describe('Boundary Conditions & Robustness', () => {
    it('evaluates exact millisecond threshold boundary: 29,999ms (blocked) vs 30,000ms (allowed)', () => {
      const slotId = 'boundary_slot';
      adRefreshManager.registerSlot(slotId, 1.0);

      jest.advanceTimersByTime(29999);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);

      jest.advanceTimersByTime(1); // exactly 30,000ms
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
    });

    it('evaluates exact intersection ratio boundary: 0.499 (blocked) vs 0.50 (allowed)', () => {
      const slotId = 'ratio_slot';
      adRefreshManager.registerSlot(slotId, 0.499);
      jest.advanceTimersByTime(30000);

      expect(adRefreshManager.canRefresh(slotId)).toBe(false);

      adRefreshManager.updateIntersection(slotId, 0.50);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
    });

    it('supports options object registration and onRefreshKeyChange callback', () => {
      const slotId = 'opt_slot';
      const onRefreshKeyChangeMock = jest.fn();
      const mockElement = document.createElement('div');
      const mockGptSlot = { getSlotElementId: () => 'gpt_div_1' };

      adRefreshManager.registerSlot(slotId, {
        intersectionRatio: 0.75,
        domElement: mockElement,
        googletagSlot: mockGptSlot,
        onRefreshKeyChange: onRefreshKeyChangeMock,
      });

      jest.advanceTimersByTime(30000);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);

      const refreshed = adRefreshManager.triggerRefresh(slotId);
      expect(refreshed).toBe(true);
      expect(onRefreshKeyChangeMock).toHaveBeenCalledWith(1);
      expect(mockPubadsRefresh).toHaveBeenCalledWith([mockGptSlot]);
    });

    it('handles updateVisibility alias correctly', () => {
      const slotId = 'vis_slot';
      adRefreshManager.registerSlot(slotId, 0.1);
      jest.advanceTimersByTime(30000);

      expect(adRefreshManager.canRefresh(slotId)).toBe(false);

      adRefreshManager.updateVisibility(slotId, 0.65);
      expect(adRefreshManager.canRefresh(slotId)).toBe(true);
    });

    it('handles unregisterSlot and unregistered slot lookups safely', () => {
      const slotId = 'temp_slot';
      adRefreshManager.registerSlot(slotId, 1.0);
      expect(adRefreshManager.getRegisteredSlotIds()).toContain(slotId);

      adRefreshManager.unregisterSlot(slotId);
      expect(adRefreshManager.getRegisteredSlotIds()).not.toContain(slotId);
      expect(adRefreshManager.canRefresh(slotId)).toBe(false);
      expect(adRefreshManager.triggerRefresh(slotId)).toBe(false);
      expect(adRefreshManager.getSlot(slotId)).toBeUndefined();
    });

    it('filters target slots when candidateSlotIds are passed to onTabSwitch', () => {
      const slotA = 'slot_A';
      const slotB = 'slot_B';
      adRefreshManager.registerSlot(slotA, 1.0);
      adRefreshManager.registerSlot(slotB, 1.0);

      jest.advanceTimersByTime(30000);

      // Only pass slotA as candidate
      const result = adRefreshManager.onTabSwitch([slotA]);
      expect(result.refreshed).toEqual([slotA]);
      expect(result.skipped).not.toContain(slotB); // slotB was not evaluated

      // slotB still has refreshCount 0
      expect(adRefreshManager.getSlot(slotB)?.refreshCount).toBe(0);
    });

    it('safely catches errors if googletag.pubads().refresh throws an exception', () => {
      mockPubadsRefresh.mockImplementation(() => {
        throw new Error('GPT Pubads Error');
      });

      const slotId = 'err_slot';
      adRefreshManager.registerSlot(slotId, 1.0);
      jest.advanceTimersByTime(30000);

      expect(() => {
        const refreshed = adRefreshManager.triggerRefresh(slotId);
        expect(refreshed).toBe(true);
      }).not.toThrow();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'AdRefreshManager',
        expect.stringContaining('googletag refresh invocation error'),
        undefined,
        expect.any(Error)
      );
    });

    it('safely catches errors if onRefresh callback throws an exception', () => {
      const buggyCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback Failure');
      });

      const slotId = 'callback_err_slot';
      adRefreshManager.registerSlot(slotId, 1.0, buggyCallback);
      jest.advanceTimersByTime(30000);

      expect(() => {
        const refreshed = adRefreshManager.triggerRefresh(slotId);
        expect(refreshed).toBe(true);
      }).not.toThrow();

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'AdRefreshManager',
        expect.stringContaining('onRefresh callback execution error'),
        undefined,
        expect.any(Error)
      );
    });

    it('allows independent AdRefreshManager instances to be constructed', () => {
      const customManager = new AdRefreshManager();
      customManager.registerSlot('independent_slot', 1.0);
      expect(customManager.getRegisteredSlotIds()).toEqual(['independent_slot']);
      expect(adRefreshManager.getRegisteredSlotIds()).toEqual([]);
    });
  });
});
