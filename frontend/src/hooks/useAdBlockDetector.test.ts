import { renderHook, act } from '@testing-library/react';
import { useAdBlockDetector, AdBlockDetectorStore } from './useAdBlockDetector';

describe('useAdBlockDetector O(1) Singleton Store', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    AdBlockDetectorStore.getInstance().resetForTesting();
    document.querySelectorAll('.adsbox').forEach((el) => el.remove());
  });

  afterEach(() => {
    jest.useRealTimers();
    AdBlockDetectorStore.getInstance().resetForTesting();
    document.querySelectorAll('.adsbox').forEach((el) => el.remove());
  });

  it('maintains strict singleton instance invariance', () => {
    const s1 = AdBlockDetectorStore.getInstance();
    const s2 = AdBlockDetectorStore.getInstance();
    expect(s1).toBe(s2);
  });

  it('guarantees N_bait <= 1 when N >= 3 slots/hooks mount simultaneously', () => {
    // Mount 3 hooks concurrently within the same tick
    const { result: hook1 } = renderHook(() => useAdBlockDetector());
    const { result: hook2 } = renderHook(() => useAdBlockDetector());
    const { result: hook3 } = renderHook(() => useAdBlockDetector());

    // Both should report isLoading: true initially
    expect(hook1.current.isLoading).toBe(true);
    expect(hook2.current.isLoading).toBe(true);
    expect(hook3.current.isLoading).toBe(true);

    // Verify bait DOM count in document.body is at most 1 (strictly <= 1)
    const baitElements = document.querySelectorAll('.adsbox');
    expect(baitElements.length).toBeLessThanOrEqual(1);
    expect(baitElements.length).toBe(1);

    // Advance 2,000ms timer
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // After timer settles, bait DOM must be immediately removed from DOM (count = 0)
    const baitElementsAfter = document.querySelectorAll('.adsbox');
    expect(baitElementsAfter.length).toBe(0);

    // All 3 hooks must be updated with identical non-loading state
    expect(hook1.current.isLoading).toBe(false);
    expect(hook2.current.isLoading).toBe(false);
    expect(hook3.current.isLoading).toBe(false);
    expect(hook1.current.isAdBlockActive).toBe(hook2.current.isAdBlockActive);
    expect(hook2.current.isAdBlockActive).toBe(hook3.current.isAdBlockActive);
  });

  it('broadcasts settled state to newly mounting subscribers', () => {
    // Initial mount and evaluation
    const { result: initialHook } = renderHook(() => useAdBlockDetector());
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(initialHook.current.isLoading).toBe(false);

    // A subsequent subscriber mounting receives the result
    const { result: subsequentHook } = renderHook(() => useAdBlockDetector());
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(subsequentHook.current.isLoading).toBe(false);
    expect(subsequentHook.current.isAdBlockActive).toBe(initialHook.current.isAdBlockActive);
  });

  it('guarantees getServerSnapshot returns an immutable cached reference across calls', () => {
    const store = AdBlockDetectorStore.getInstance();
    const snap1 = store.getServerSnapshot();
    const snap2 = store.getServerSnapshot();
    expect(snap1).toBe(snap2);
    expect(snap1).toEqual({ isAdBlockActive: false, isLoading: false });
    expect(Object.isFrozen(snap1)).toBe(true);
  });
});

