/**
 * m1_scroll_optimizer.test.tsx
 *
 * Empirical Unit Test Suite for Milestone 1 (M1 / R1)
 * Validates:
 * 1. ScrollOptimizer component mount / unmount lifecycle contracts.
 * 2. Deterministic addition of 'is-scrolling' class to document.body upon scroll dispatch.
 * 3. 150ms debounce idle window transition removing 'is-scrolling'.
 * 4. Timer resetting under continuous high-frequency scroll bursts.
 * 5. Complete event listener detachment and timer clearance upon unmount.
 * 6. Nested container scroll event capture phase interception.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScrollOptimizer } from '@/components/ui/ScrollOptimizer';

describe('Milestone 1: ScrollOptimizer Invariant Contract', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.className = '';
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    document.body.className = '';
  });

  test('1. Initial mount contract: renders null and preserves clean document.body class state', () => {
    const { container } = render(<ScrollOptimizer />);
    expect(container.firstChild).toBeNull();
    expect(document.body.classList.contains('is-scrolling')).toBe(false);
  });

  test('2. Scroll event dispatch: immediately applies "is-scrolling" class to document.body', () => {
    render(<ScrollOptimizer />);

    expect(document.body.classList.contains('is-scrolling')).toBe(false);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(document.body.classList.contains('is-scrolling')).toBe(true);
  });

  test('3. 150ms debounce window: retains "is-scrolling" at 149ms and prunes at 150ms', () => {
    render(<ScrollOptimizer />);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(true);

    // Advance 149ms: state must remain active
    act(() => {
      jest.advanceTimersByTime(149);
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(true);

    // Advance remaining 1ms (total 150ms): state must transition to false
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(false);
  });

  test('4. High-frequency scroll bursts: continuous dispatch resets debounce deadline', () => {
    render(<ScrollOptimizer />);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(true);

    // Advance 100ms
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(true);

    // Second scroll burst resets 150ms deadline
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(true);

    // Advance 100ms (200ms total, but 100ms since last event)
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(true);

    // Advance 50ms (150ms since last event): class pruned
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(false);
  });

  test('5. Lifecycle unmount cleanup: removes "is-scrolling" and deregisters window listener', () => {
    const { unmount } = render(<ScrollOptimizer />);

    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(true);

    // Unmount while scroll class is active
    unmount();

    // Must be pruned immediately on unmount
    expect(document.body.classList.contains('is-scrolling')).toBe(false);

    // Further timers must not mutate document.body
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(false);

    // Post-unmount scroll events must be completely ignored
    act(() => {
      window.dispatchEvent(new Event('scroll'));
    });
    expect(document.body.classList.contains('is-scrolling')).toBe(false);
  });

  test('6. Capture phase interception: handles scroll dispatched from nested scroll container', () => {
    render(
      <div>
        <ScrollOptimizer />
        <div id="nested-scroll-container" style={{ overflow: 'scroll', height: 100 }}>
          <div style={{ height: 500 }}>Content</div>
        </div>
      </div>
    );

    const nestedContainer = document.getElementById('nested-scroll-container')!;

    act(() => {
      nestedContainer.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    expect(document.body.classList.contains('is-scrolling')).toBe(true);

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(document.body.classList.contains('is-scrolling')).toBe(false);
  });
});
