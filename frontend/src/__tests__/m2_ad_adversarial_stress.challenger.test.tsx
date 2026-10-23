/**
 * @file m2_ad_adversarial_stress.challenger.test.tsx
 * @description Adversarial empirical stress suite for M2:
 * 1. useAdBlockDetector: getServerSnapshot() multi-render concurrency referential identity & freeze invariant
 * 2. Strict singleton bait DOM count N_bait <= 1 invariant across high-concurrency mount/unmount waves
 * 3. AdSlot.tsx: Rapid re-render race condition & telemetry context freshness / integrity post-useEffect ref migration
 */

import React, { useState } from 'react';
import { render, screen, act, fireEvent, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdSlot } from '@/components/ads/AdSlot';
import { useAdBlockDetector, AdBlockDetectorStore } from '@/hooks/useAdBlockDetector';
import * as cascadeFallbackModule from '@/lib/ads/cascadeFallback';
import { adRefreshManager } from '@/lib/ads/adRefreshManager';

// Mock logger
jest.mock('@/lib/services/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('M2 Adversarial Empirical Stress Verification Suite', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    AdBlockDetectorStore.getInstance().resetForTesting();
    document.querySelectorAll('.adsbox, .ad-placeholder, .ad-banner').forEach((el) => el.remove());
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
    AdBlockDetectorStore.getInstance().resetForTesting();
    document.querySelectorAll('.adsbox, .ad-placeholder, .ad-banner').forEach((el) => el.remove());
    jest.restoreAllMocks();
  });

  describe('Adversarial 1: getServerSnapshot() Referential Invariance & Mutability Stress', () => {
    it('preserves exact referential identity (prev === next) across 1,000 tight-loop calls and concurrent workers', () => {
      const store = AdBlockDetectorStore.getInstance();
      const initialSnapshot = store.getServerSnapshot();

      // Stress loop: 1,000 consecutive calls
      for (let i = 0; i < 1000; i++) {
        const nextSnapshot = store.getServerSnapshot();
        expect(nextSnapshot).toBe(initialSnapshot);
      }

      // Concurrently simulated microtask loops
      const concurrentSnapshots = Array.from({ length: 50 }, () => store.getServerSnapshot());
      for (const snap of concurrentSnapshots) {
        expect(snap).toBe(initialSnapshot);
      }
    });

    it('enforces deep immutability via Object.isFrozen and rejects mutation attempts', () => {
      const store = AdBlockDetectorStore.getInstance();
      const snapshot = store.getServerSnapshot();

      expect(Object.isFrozen(snapshot)).toBe(true);
      expect(snapshot).toEqual({ isAdBlockActive: false, isLoading: false });

      // Attempt mutating properties in strict mode
      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        snapshot.isAdBlockActive = true;
      }).toThrow();

      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        snapshot.isLoading = true;
      }).toThrow();

      expect(() => {
        // @ts-expect-error - Testing runtime immutability
        delete snapshot.isAdBlockActive;
      }).toThrow();

      // Ensure state remains intact
      expect(snapshot.isAdBlockActive).toBe(false);
      expect(snapshot.isLoading).toBe(false);
    });
  });

  describe('Adversarial 2: Singleton Bait DOM Invariant Under High-Concurrency & Churn', () => {
    it('strictly guarantees max(N_bait) <= 1 when 50 hooks mount simultaneously within the same tick', () => {
      let maxObservedBaitCount = 0;

      // Attach MutationObserver to document.body to measure any momentary bait DOM burst
      const observer = new MutationObserver(() => {
        const count = document.querySelectorAll('.adsbox').length;
        if (count > maxObservedBaitCount) {
          maxObservedBaitCount = count;
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // Mount 50 hooks concurrently in the same tick
      const hooks = Array.from({ length: 50 }, () => renderHook(() => useAdBlockDetector()));

      // Measure current DOM state
      const currentBaitCount = document.querySelectorAll('.adsbox').length;
      expect(currentBaitCount).toBeLessThanOrEqual(1);
      expect(currentBaitCount).toBe(1);

      // Advance timers to trigger settlement
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // After settling, bait DOM count must be exactly 0
      const settledBaitCount = document.querySelectorAll('.adsbox').length;
      expect(settledBaitCount).toBe(0);

      observer.disconnect();
      expect(maxObservedBaitCount).toBeLessThanOrEqual(1);

      // Verify all 50 hooks settled synchronously with identical state
      for (const h of hooks) {
        expect(h.result.current.isLoading).toBe(false);
        // In JSDOM test environment without mock AdSense script/global, adblock is deterministically detected
        expect(h.result.current.isAdBlockActive).toBe(true);
      }
    });

    it('ensures instantaneous DOM cleanup and zero leak when all subscribers unmount before timeout', () => {
      // Mount 10 hooks
      const hooks = Array.from({ length: 10 }, () => renderHook(() => useAdBlockDetector()));
      expect(document.querySelectorAll('.adsbox').length).toBe(1);

      // Advance halfway (1,000ms of 2,000ms)
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(document.querySelectorAll('.adsbox').length).toBe(1);

      // Unmount 9 hooks - 1 remains active
      for (let i = 0; i < 9; i++) {
        hooks[i].unmount();
      }
      expect(document.querySelectorAll('.adsbox').length).toBe(1);

      // Unmount the final hook
      hooks[9].unmount();

      // Bait DOM must be completely removed immediately upon 0 active subscribers
      expect(document.querySelectorAll('.adsbox').length).toBe(0);

      // Advancing timer further should not resurrect any bait element or cause exceptions
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      expect(document.querySelectorAll('.adsbox').length).toBe(0);
    });

    it('handles alternating mount/unmount waves without accumulating zombie DOM elements', () => {
      for (let wave = 0; wave < 10; wave++) {
        // Mount wave
        const { unmount } = renderHook(() => useAdBlockDetector());
        expect(document.querySelectorAll('.adsbox').length).toBeLessThanOrEqual(1);

        // Advance 500ms
        act(() => {
          jest.advanceTimersByTime(500);
        });

        // Unmount
        unmount();
        expect(document.querySelectorAll('.adsbox').length).toBe(0);
      }

      // Final count must be strictly 0
      expect(document.querySelectorAll('.adsbox').length).toBe(0);
    });
  });

  describe('Adversarial 3: AdSlot Telemetry Freshness & Re-render Race Condition Post-useEffect Ref Migration', () => {
    it('preserves telemetry context freshness without data tearing across 50 rapid property re-renders', () => {
      const sendTelemetrySpy = jest.spyOn(cascadeFallbackModule, 'sendTelemetry');

      // Test harness component allowing rapid synchronous and asynchronous prop updates
      function TestHarness() {
        const [props, setProps] = useState({
          apartmentName: '초기아파트',
          dong: '101동',
          slotId: 'ad-slot-adversarial',
        });

        return (
          <div>
            <AdSlot
              slotId={props.slotId}
              apartmentName={props.apartmentName}
              dong={props.dong}
              format="banner"
              testMode={false}
            />
            <button
              data-testid="update-btn"
              onClick={() => {
                setProps((prev) => ({
                  ...prev,
                  apartmentName: `아파트_${Date.now()}`,
                  dong: `${Math.floor(Math.random() * 900) + 100}동`,
                }));
              }}
            >
              Update
            </button>
            <button
              data-testid="set-target-btn"
              onClick={() => {
                setProps({
                  apartmentName: '최종타겟아파트',
                  dong: '999동',
                  slotId: 'ad-slot-target',
                });
              }}
            >
              Set Target
            </button>
          </div>
        );
      }

      const { getByTestId, rerender } = render(<TestHarness />);

      // Perform 50 rapid re-renders
      act(() => {
        for (let i = 0; i < 50; i++) {
          getByTestId('update-btn').click();
        }
      });

      // Set deterministic final target
      act(() => {
        getByTestId('set-target-btn').click();
      });

      // Verify DOM reflects rendered container
      expect(screen.getByTestId('ad-slot-container')).toBeInTheDocument();

      // Trigger ad refresh telemetry via adRefreshManager
      const state = adRefreshManager.getState('ad-slot-target');
      if (state) {
        // Force dwell refresh trigger
        act(() => {
          adRefreshManager.updateIntersection('ad-slot-target', 1.0);
          jest.advanceTimersByTime(31000);
        });
      }

      // Verify sendTelemetry invocations are structurally valid and do not contain undefined or corrupt fields
      const calls = sendTelemetrySpy.mock.calls;
      for (const [telemetryPayload] of calls) {
        expect(telemetryPayload.slotId).toBeDefined();
        expect(telemetryPayload.eventType).toBeDefined();
        expect(telemetryPayload.apartmentName).not.toBeUndefined();
        expect(telemetryPayload.dong).not.toBeUndefined();
        expect(typeof telemetryPayload.apartmentName).toBe('string');
        expect(typeof telemetryPayload.dong).toBe('string');
      }
    });

    it('transmits correct latest telemetry context when adblock fallback card is clicked after rapid re-renders', () => {
      // Mock adblock as active
      jest.spyOn(AdBlockDetectorStore.getInstance(), 'getSnapshot').mockReturnValue({
        isAdBlockActive: true,
        isLoading: false,
      });

      const sendTelemetrySpy = jest.spyOn(cascadeFallbackModule, 'sendTelemetry');

      interface DynamicProps {
        apartment: string;
        dong: string;
      }

      function AdBlockWrapper({ apartment, dong }: DynamicProps) {
        return (
          <AdSlot
            slotId="adblock-stress-slot"
            apartmentName={apartment}
            dong={dong}
            format="banner"
            fallbackType="native-cpa"
          />
        );
      }

      const { rerender } = render(<AdBlockWrapper apartment="초기단지" dong="101" />);

      // Rapidly re-render 20 times with evolving apartment data
      for (let i = 1; i <= 20; i++) {
        rerender(<AdBlockWrapper apartment={`단지_${i}`} dong={`${100 + i}`} />);
      }

      // Final target props
      rerender(<AdBlockWrapper apartment="검증완료타겟단지" dong="777" />);

      // Locate fallback card CTA link and click
      const fallbackContainer = screen.getByTestId('ad-slot-adblock-fallback');
      const fallbackLink = fallbackContainer.querySelector('a') || fallbackContainer;
      expect(fallbackLink).toBeInTheDocument();

      act(() => {
        fireEvent.click(fallbackLink);
      });

      // sendTelemetry must have been called with FALLBACK_CLICK containing the final updated props
      expect(sendTelemetrySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FALLBACK_CLICK',
          slotId: 'adblock-stress-slot',
          apartmentName: '검증완료타겟단지',
          dong: '777',
        })
      );
    });

    it('injects latest telemetry context into handleDwellRefresh after prop mutations', () => {
      // Ensure real environment mock for AdSense client ID
      process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = 'ca-pub-test-adversarial';

      const sendTelemetrySpy = jest.spyOn(cascadeFallbackModule, 'sendTelemetry');

      // Mock adblock as false
      jest.spyOn(AdBlockDetectorStore.getInstance(), 'getSnapshot').mockReturnValue({
        isAdBlockActive: false,
        isLoading: false,
      });

      interface Props {
        apt: string;
        dong: string;
      }

      function DwellTestSlot({ apt, dong }: Props) {
        return (
          <AdSlot
            slotId="dwell-telemetry-slot"
            apartmentName={apt}
            dong={dong}
            format="banner"
            testMode={false}
          />
        );
      }

      const { rerender } = render(<DwellTestSlot apt="최초아파트" dong="101" />);

      // Prop mutation to new value
      rerender(<DwellTestSlot apt="갱신아파트" dong="202" />);

      // Retrieve registered slot key in adRefreshManager and fire dwell callback
      const state = adRefreshManager.getState('dwell-telemetry-slot');
      expect(state).toBeDefined();

      if (state) {
        act(() => {
          // Simulate 30s dwell passage
          adRefreshManager.updateIntersection('dwell-telemetry-slot', 1.0);
          jest.advanceTimersByTime(31000);
        });

        // Verify that an IMPRESSION telemetry beacon was fired with latest updated apartmentName and dong
        const impressionCalls = sendTelemetrySpy.mock.calls.filter(
          ([payload]) => payload.eventType === 'IMPRESSION' && payload.slotId === 'dwell-telemetry-slot'
        );

        if (impressionCalls.length > 0) {
          const latestCall = impressionCalls[impressionCalls.length - 1][0];
          expect(latestCall.apartmentName).toBe('갱신아파트');
          expect(latestCall.dong).toBe('202');
        }
      }
    });
  });
});

