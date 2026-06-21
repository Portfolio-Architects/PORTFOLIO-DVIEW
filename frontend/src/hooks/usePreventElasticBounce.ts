import { useEffect, RefObject } from 'react';

/**
 * A hook that prevents iOS elastic scroll bounce (rubber-banding) from propagating 
 * to the viewport boundary and triggering layout shifts (CLS) on bottom bars.
 * Works by intercepting touch movements at scroll limits.
 */
export function usePreventElasticBounce(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const clientY = e.touches[0].clientY;
      const deltaY = clientY - startY;

      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;

      // 1. Swiping down at the top limit -> prevent default bounce
      if (scrollTop <= 0 && deltaY > 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }

      // 2. Swiping up at the bottom limit -> prevent default bounce
      // Use 1px tolerance to ensure smooth detection on high-DPI/subpixel mobile devices
      if (scrollTop + clientHeight >= scrollHeight - 1 && deltaY < 0) {
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, [ref]);
}
