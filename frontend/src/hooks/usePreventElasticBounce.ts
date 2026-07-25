import { useEffect, RefObject } from 'react';

/**
 * A hook that prevents iOS elastic scroll bounce (rubber-banding) from propagating 
 * to the viewport boundary without blocking touch swipe or mouse scroll gestures.
 */
export function usePreventElasticBounce(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startY = 0;
    let startX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const clientY = e.touches[0].clientY;
      const clientX = e.touches[0].clientX;
      const deltaY = clientY - startY;
      const deltaX = clientX - startX;

      // Do not interfere with horizontal swipes or multi-touch gestures
      if (Math.abs(deltaX) >= Math.abs(deltaY)) return;
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, [ref]);
}
