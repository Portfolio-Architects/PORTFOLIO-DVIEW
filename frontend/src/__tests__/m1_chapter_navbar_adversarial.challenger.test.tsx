import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  ApartmentChapterNavBar,
  APARTMENT_CHAPTERS,
} from '@/components/apartment/ApartmentChapterNavBar';

/**
 * Empirical Adversarial Challenger Test Suite for ApartmentChapterNavBar
 * Stress tests:
 * 1. Rapid scrolling & high-frequency IntersectionObserver bursts
 * 2. Component lifecycle, mount/unmount thrashing & stale closure verification
 * 3. High-frequency click storm & DOM degeneracy
 * 4. Null, undefined, detached, and SSR-like environments
 */

describe('ApartmentChapterNavBar Empirical Adversarial Stress Suite', () => {
  const originalScrollIntoView = window.HTMLElement.prototype.scrollIntoView;
  const originalIntersectionObserver = global.IntersectionObserver;

  let mockObserverCallback: IntersectionObserverCallback;
  let observeMock: jest.Mock;
  let unobserveMock: jest.Mock;
  let disconnectMock: jest.Mock;
  let scrollIntoViewMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    scrollIntoViewMock = jest.fn();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    observeMock = jest.fn();
    unobserveMock = jest.fn();
    disconnectMock = jest.fn();

    global.IntersectionObserver = jest.fn().mockImplementation((callback, options) => {
      mockObserverCallback = callback;
      return {
        root: options?.root ?? null,
        rootMargin: options?.rootMargin ?? '',
        thresholds: options?.threshold ?? [],
        observe: observeMock,
        unobserve: unobserveMock,
        disconnect: disconnectMock,
        takeRecords: () => [],
      };
    }) as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    window.HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    global.IntersectionObserver = originalIntersectionObserver;
    document.body.innerHTML = '';
  });

  // =========================================================================
  // Dimension 1: Rapid Scroll Simulation & Observer Burst Stress
  // =========================================================================
  describe('Dimension 1: Rapid Scroll Simulation & Observer Burst Stress', () => {
    it('1.1 handles forward burst scroll (100 events) across all 8 chapters monotonically', () => {
      const onSelectMock = jest.fn();
      let currentActive = 'chapter-01-overview';

      const { rerender } = render(
        <ApartmentChapterNavBar
          activeChapter={currentActive}
          onSelectChapter={onSelectMock}
        />
      );

      // Simulate 100 rapid scroll events traversing chapters 01 -> 08
      for (let i = 0; i < 100; i++) {
        const targetChapter = APARTMENT_CHAPTERS[i % APARTMENT_CHAPTERS.length];
        const dummyEl = document.createElement('div');
        dummyEl.id = targetChapter.id;

        act(() => {
          mockObserverCallback(
            [
              {
                isIntersecting: true,
                target: dummyEl,
                boundingClientRect: { top: 50 + (i % 10) } as DOMRectReadOnly,
              } as IntersectionObserverEntry,
            ],
            {} as IntersectionObserver
          );
        });

        if (targetChapter.id !== currentActive) {
          expect(onSelectMock).toHaveBeenLastCalledWith(targetChapter.id);
          currentActive = targetChapter.id;
          rerender(
            <ApartmentChapterNavBar
              activeChapter={currentActive}
              onSelectChapter={onSelectMock}
            />
          );
        }
      }

      expect(onSelectMock).toHaveBeenCalled();
    });

    it('1.2 handles reverse burst scroll (100 events) across chapters 08 -> 01 cleanly', () => {
      const onSelectMock = jest.fn();
      let currentActive = 'chapter-08-report';

      const { rerender } = render(
        <ApartmentChapterNavBar
          activeChapter={currentActive}
          onSelectChapter={onSelectMock}
        />
      );

      for (let i = 0; i < 100; i++) {
        const reverseIdx = (APARTMENT_CHAPTERS.length - 1) - (i % APARTMENT_CHAPTERS.length);
        const targetChapter = APARTMENT_CHAPTERS[reverseIdx];
        const dummyEl = document.createElement('div');
        dummyEl.id = targetChapter.id;

        act(() => {
          mockObserverCallback(
            [
              {
                isIntersecting: true,
                target: dummyEl,
                boundingClientRect: { top: 10 + (i % 5) } as DOMRectReadOnly,
              } as IntersectionObserverEntry,
            ],
            {} as IntersectionObserver
          );
        });

        if (targetChapter.id !== currentActive) {
          expect(onSelectMock).toHaveBeenLastCalledWith(targetChapter.id);
          currentActive = targetChapter.id;
          rerender(
            <ApartmentChapterNavBar
              activeChapter={currentActive}
              onSelectChapter={onSelectMock}
            />
          );
        }
      }

      expect(onSelectMock).toHaveBeenCalled();
    });

    it('1.3 resolves multi-intersection collision deterministically using top-most position sorting', () => {
      const onSelectMock = jest.fn();
      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectMock}
        />
      );

      const el3 = document.createElement('div');
      el3.id = 'chapter-03-gap';
      const el4 = document.createElement('div');
      el4.id = 'chapter-04-infra';
      const el5 = document.createElement('div');
      el5.id = 'chapter-05-mortgage';

      // 3 entries simultaneously intersecting with differing boundingClientRect.top
      act(() => {
        mockObserverCallback(
          [
            {
              isIntersecting: true,
              target: el5,
              boundingClientRect: { top: 320 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
            {
              isIntersecting: true,
              target: el3,
              boundingClientRect: { top: -20 } as DOMRectReadOnly, // top-most!
            } as IntersectionObserverEntry,
            {
              isIntersecting: true,
              target: el4,
              boundingClientRect: { top: 140 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      // el3 has the smallest top coordinate (-20), so it must be selected
      expect(onSelectMock).toHaveBeenCalledTimes(1);
      expect(onSelectMock).toHaveBeenCalledWith('chapter-03-gap');
    });

    it('1.4 filters non-intersecting, empty id, and redundant current chapter entries', () => {
      const onSelectMock = jest.fn();
      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-02-volume"
          onSelectChapter={onSelectMock}
        />
      );

      const elNonIntersecting = document.createElement('div');
      elNonIntersecting.id = 'chapter-03-gap';

      const elEmptyId = document.createElement('div');
      elEmptyId.id = '';

      const elAlreadyActive = document.createElement('div');
      elAlreadyActive.id = 'chapter-02-volume';

      act(() => {
        mockObserverCallback(
          [
            {
              isIntersecting: false,
              target: elNonIntersecting,
              boundingClientRect: { top: 0 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
            {
              isIntersecting: true,
              target: elEmptyId,
              boundingClientRect: { top: 10 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
            {
              isIntersecting: true,
              target: elAlreadyActive,
              boundingClientRect: { top: 20 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      expect(onSelectMock).not.toHaveBeenCalled();
    });

    it('1.5 enforces strict 900ms manual scroll cooldown invariant suppressing 50 spurious observer triggers', () => {
      const onSelectMock = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectMock}
        />
      );

      const btn = container.querySelector('button[data-chapter-id="chapter-06-ledger"]');
      expect(btn).toBeInTheDocument();

      // Trigger user click on chapter 06
      fireEvent.click(btn!);
      expect(onSelectMock).toHaveBeenCalledTimes(1);
      expect(onSelectMock).toHaveBeenCalledWith('chapter-06-ledger');
      onSelectMock.mockClear();

      // Flood with 50 observer events during the 900ms cooldown window
      for (let i = 0; i < 50; i++) {
        const dummyEl = document.createElement('div');
        dummyEl.id = 'chapter-03-gap';

        act(() => {
          mockObserverCallback(
            [
              {
                isIntersecting: true,
                target: dummyEl,
                boundingClientRect: { top: 100 } as DOMRectReadOnly,
              } as IntersectionObserverEntry,
            ],
            {} as IntersectionObserver
          );
        });
      }

      // 100% suppressed during cooldown
      expect(onSelectMock).not.toHaveBeenCalled();

      // Advance time by 899ms (still inside cooldown)
      act(() => {
        jest.advanceTimersByTime(899);
      });

      const dummyElMid = document.createElement('div');
      dummyElMid.id = 'chapter-04-infra';
      act(() => {
        mockObserverCallback(
          [
            {
              isIntersecting: true,
              target: dummyElMid,
              boundingClientRect: { top: 100 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });
      expect(onSelectMock).not.toHaveBeenCalled();

      // Advance time past 900ms cooldown expiry
      act(() => {
        jest.advanceTimersByTime(2); // 899 + 2 = 901ms
      });

      // Subsequent observer event must now be accepted
      const dummyElPost = document.createElement('div');
      dummyElPost.id = 'chapter-05-mortgage';
      act(() => {
        mockObserverCallback(
          [
            {
              isIntersecting: true,
              target: dummyElPost,
              boundingClientRect: { top: 100 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      expect(onSelectMock).toHaveBeenCalledTimes(1);
      expect(onSelectMock).toHaveBeenCalledWith('chapter-05-mortgage');
    });

    it('1.6 resets cooldown timer when chained clicks occur rapidly without race conditions', () => {
      const onSelectMock = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectMock}
        />
      );

      const btn1 = container.querySelector('button[data-chapter-id="chapter-02-volume"]');
      const btn2 = container.querySelector('button[data-chapter-id="chapter-05-mortgage"]');

      // Click 1 at t=0
      fireEvent.click(btn1!);
      expect(onSelectMock).toHaveBeenCalledWith('chapter-02-volume');

      // Advance to t=500ms
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Click 2 at t=500ms (resets cooldown for another 900ms until t=1400ms)
      fireEvent.click(btn2!);
      expect(onSelectMock).toHaveBeenCalledWith('chapter-05-mortgage');
      onSelectMock.mockClear();

      // Advance to t=1000ms (500ms after Click 2, original Click 1 would have expired at t=900ms)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Observer event at t=1000ms must be suppressed because Click 2 extended cooldown to t=1400ms
      const dummy = document.createElement('div');
      dummy.id = 'chapter-07-macro';
      act(() => {
        mockObserverCallback(
          [
            {
              isIntersecting: true,
              target: dummy,
              boundingClientRect: { top: 100 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });
      expect(onSelectMock).not.toHaveBeenCalled();

      // Advance past t=1400ms (e.g. +405ms -> t=1405ms)
      act(() => {
        jest.advanceTimersByTime(405);
      });

      // Observer event now succeeds
      act(() => {
        mockObserverCallback(
          [
            {
              isIntersecting: true,
              target: dummy,
              boundingClientRect: { top: 100 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });
      expect(onSelectMock).toHaveBeenCalledWith('chapter-07-macro');
    });
  });

  // =========================================================================
  // Dimension 2: Component Lifecycle, Repeated Mount/Unmount Thrashing & Stale Closures
  // =========================================================================
  describe('Dimension 2: Component Lifecycle, Mount/Unmount Thrashing & Stale Closures', () => {
    it('2.1 executes 50 rapid mount and unmount cycles without memory leaks or dangling observers', () => {
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <ApartmentChapterNavBar
            activeChapter="chapter-01-overview"
            onSelectChapter={jest.fn()}
          />
        );
        unmount();
      }

      // Exactly 50 disconnect calls corresponding to 50 unmounts
      expect(disconnectMock).toHaveBeenCalledTimes(50);
    });

    it('2.2 unmounts cleanly with pending cooldown and registration timers without console errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const { container, unmount } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
        />
      );

      // Start manual scroll cooldown timer
      const btn = container.querySelector('button[data-chapter-id="chapter-03-gap"]');
      fireEvent.click(btn!);

      // Unmount immediately while timer1 (150ms), timer2 (500ms), and cooldown (900ms) are pending
      unmount();

      // Flush all timers
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('2.3 dynamically tracks updated onSelectChapter callback reference without stale closure', () => {
      const initialCallback = jest.fn();
      const updatedCallback = jest.fn();

      const { rerender } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={initialCallback}
        />
      );

      // Rerender with new callback identity
      rerender(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={updatedCallback}
        />
      );

      // Trigger scroll spy observer event
      const dummyEl = document.createElement('div');
      dummyEl.id = 'chapter-04-infra';

      act(() => {
        mockObserverCallback(
          [
            {
              isIntersecting: true,
              target: dummyEl,
              boundingClientRect: { top: 50 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      // Updated callback must be invoked; stale initial callback must never be called
      expect(initialCallback).not.toHaveBeenCalled();
      expect(updatedCallback).toHaveBeenCalledTimes(1);
      expect(updatedCallback).toHaveBeenCalledWith('chapter-04-infra');
    });

    it('2.4 dynamically synchronizes activeChapterRef to prevent duplicate triggers when activeChapter prop changes', () => {
      const onSelectMock = jest.fn();

      const { rerender } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectMock}
        />
      );

      // Update activeChapter to chapter-03-gap
      rerender(
        <ApartmentChapterNavBar
          activeChapter="chapter-03-gap"
          onSelectChapter={onSelectMock}
        />
      );

      // Fire observer event for chapter-03-gap
      const dummyEl = document.createElement('div');
      dummyEl.id = 'chapter-03-gap';

      act(() => {
        mockObserverCallback(
          [
            {
              isIntersecting: true,
              target: dummyEl,
              boundingClientRect: { top: 50 } as DOMRectReadOnly,
            } as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver
        );
      });

      // Must be ignored because activeChapter is already chapter-03-gap
      expect(onSelectMock).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Dimension 3: High-Frequency Click Storm & DOM Degeneracy
  // =========================================================================
  describe('Dimension 3: High-Frequency Click Storm & DOM Degeneracy', () => {
    it('3.1 handles synchronous 100-click burst across chapters with 100% callback delivery', () => {
      const onSelectMock = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectMock}
        />
      );

      const buttons = container.querySelectorAll('button[data-chapter-id]');
      expect(buttons).toHaveLength(8);

      for (let i = 0; i < 100; i++) {
        const targetBtn = buttons[i % buttons.length];
        fireEvent.click(targetBtn);
      }

      expect(onSelectMock).toHaveBeenCalledTimes(100);
    });

    it('3.2 survives rapid clicks when target DOM elements do not exist', () => {
      // Document body has NO #chapter-XX elements
      const onSelectMock = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectMock}
        />
      );

      const buttons = container.querySelectorAll('button[data-chapter-id]');
      buttons.forEach((btn) => {
        expect(() => fireEvent.click(btn)).not.toThrow();
      });

      expect(onSelectMock).toHaveBeenCalledTimes(8);
    });

    it('3.3 survives clicks when target element lacks scrollIntoView function', () => {
      const section = document.createElement('div');
      section.id = 'chapter-02-volume';
      // scrollIntoView is undefined
      (section as any).scrollIntoView = undefined;
      document.body.appendChild(section);

      const onSelectMock = jest.fn();
      const { container } = render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={onSelectMock}
        />
      );

      const btn = container.querySelector('button[data-chapter-id="chapter-02-volume"]');
      expect(() => fireEvent.click(btn!)).not.toThrow();
      expect(onSelectMock).toHaveBeenCalledWith('chapter-02-volume');
    });

    it('3.4 maintains button ref cleanup integrity when buttons are unmounted or remounted', () => {
      const TestContainer: React.FC<{ showNav: boolean; active: string }> = ({ showNav, active }) => (
        <div>
          {showNav && (
            <ApartmentChapterNavBar
              activeChapter={active}
              onSelectChapter={jest.fn()}
            />
          )}
        </div>
      );

      const { rerender } = render(<TestContainer showNav={true} active="chapter-01-overview" />);
      // Unmount the nav bar
      rerender(<TestContainer showNav={false} active="chapter-01-overview" />);
      // Remount the nav bar with different active chapter
      rerender(<TestContainer showNav={true} active="chapter-05-mortgage" />);

      const activeBtn = screen.getByRole('button', { name: /주담대 LDI 및 역전세 센티넬/i });
      expect(activeBtn).toHaveAttribute('aria-current', 'page');
    });
  });

  // =========================================================================
  // Dimension 4: Null, Undefined, Detached Containers & Environment Fallbacks
  // =========================================================================
  describe('Dimension 4: Null, Undefined, Detached Containers & Environment Fallbacks', () => {
    it('4.1 operates with scrollContainerRef={undefined} and registers targets via document.getElementById', () => {
      const sec1 = document.createElement('section');
      sec1.id = 'chapter-01-overview';
      document.body.appendChild(sec1);

      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
          scrollContainerRef={undefined}
        />
      );

      // Must observe sec1 found via document.getElementById
      expect(observeMock).toHaveBeenCalledWith(sec1);
    });

    it('4.2 operates with scrollContainerRef={{ current: null }} and handles delayed DOM mounting', () => {
      const ref = { current: null };

      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
          scrollContainerRef={ref}
        />
      );

      // Section dynamically appears after 100ms
      const sec3 = document.createElement('section');
      sec3.id = 'chapter-03-gap';
      document.body.appendChild(sec3);

      // Advance timer1 (150ms) to trigger delayed registration
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(observeMock).toHaveBeenCalledWith(sec3);
    });

    it('4.3 targets elements inside scrollContainerRef.current when container is provided', () => {
      const containerDiv = document.createElement('div');
      const innerSec = document.createElement('div');
      innerSec.id = 'chapter-06-ledger';
      containerDiv.appendChild(innerSec);
      document.body.appendChild(containerDiv);

      const ref = { current: containerDiv };

      render(
        <ApartmentChapterNavBar
          activeChapter="chapter-01-overview"
          onSelectChapter={jest.fn()}
          scrollContainerRef={ref}
        />
      );

      expect(observeMock).toHaveBeenCalledWith(innerSec);
    });

    it('4.4 gracefully handles SSR environment where IntersectionObserver is undefined', () => {
      // Temporarily delete IntersectionObserver
      delete (global as any).IntersectionObserver;

      expect(() => {
        render(
          <ApartmentChapterNavBar
            activeChapter="chapter-01-overview"
            onSelectChapter={jest.fn()}
          />
        );
      }).not.toThrow();

      // Ensure component still renders buttons
      expect(screen.getByText('개요 및 실거래 궤적')).toBeInTheDocument();
    });

    it('4.5 renders unmapped activeChapter gracefully without crash or rogue pills', () => {
      render(
        <ApartmentChapterNavBar
          activeChapter="invalid-chapter-id-999"
          onSelectChapter={jest.fn()}
        />
      );

      // No button has aria-current
      const currentButtons = screen.queryAllByRole('button').filter(
        (btn) => btn.getAttribute('aria-current') === 'page'
      );
      expect(currentButtons).toHaveLength(0);

      // No active chapter pill rendered
      expect(screen.queryByTestId('active-chapter-pill')).toBeNull();
    });
  });
});
