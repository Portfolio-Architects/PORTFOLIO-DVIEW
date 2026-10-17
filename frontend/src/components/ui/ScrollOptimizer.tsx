'use client';

import { useEffect } from 'react';

/**
 * ScrollOptimizer
 *
 * Enforces 120fps scroll fluidity by toggling the 'is-scrolling' class on document.body.
 *
 * Operational Mechanics:
 * 1. Passive event capture intercepts all window/nested container scroll events.
 * 2. On scroll trigger, 'is-scrolling' class is immediately applied to document.body.
 * 3. During active scrolling, expensive backdrop-filter calculations and pointer-event hovers
 *    are suppressed via CSS invariants (backdrop-filter: none !important; pointer-events: none !important;).
 * 4. A 150ms debounce timer resets 'is-scrolling' once inertia/wheel motion ceases.
 * 5. On unmount, event listeners and timers are cleanly liquidated and the class is pruned.
 */
export function ScrollOptimizer(): null {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    let scrollDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      if (!document.body.classList.contains('is-scrolling')) {
        document.body.classList.add('is-scrolling');
      }

      if (scrollDebounceTimer !== null) {
        clearTimeout(scrollDebounceTimer);
      }

      scrollDebounceTimer = setTimeout(() => {
        document.body.classList.remove('is-scrolling');
        scrollDebounceTimer = null;
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
      if (scrollDebounceTimer !== null) {
        clearTimeout(scrollDebounceTimer);
      }
      document.body.classList.remove('is-scrolling');
    };
  }, []);

  return null;
}

export default ScrollOptimizer;
