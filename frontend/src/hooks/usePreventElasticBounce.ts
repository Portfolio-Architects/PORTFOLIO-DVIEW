import { useEffect, RefObject } from 'react';

/**
 * A hook that prevents iOS elastic scroll bounce (rubber-banding) from propagating 
 * to the viewport boundary without blocking touch swipe or mouse scroll gestures.
 * 
 * Synchronously inspects scroll boundary conditions on touchmove with non-passive listener,
 * calling e.preventDefault() when scrolling past top or bottom boundaries.
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

      const touch = e.touches[0];
      const deltaY = touch.clientY - startY;
      const deltaX = touch.clientX - startX;

      // Allow horizontal swipe gestures (Math.abs(deltaX) >= Math.abs(deltaY)) to pass through without cancellation.
      if (Math.abs(deltaX) >= Math.abs(deltaY)) return;

      const isAtTop = el.scrollTop <= 0 && deltaY > 0;
      const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight && deltaY < 0;

      if ((isAtTop || isAtBottom) && e.cancelable) {
        e.preventDefault();
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

