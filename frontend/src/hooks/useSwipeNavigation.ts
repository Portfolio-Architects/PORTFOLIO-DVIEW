import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SwipeNavigationOptions {
  threshold?: number;
  edgeWidth?: number;
  onBack?: () => void;
  enabled?: boolean;
}

export function useSwipeNavigation({
  threshold = 80,
  edgeWidth = 40,
  onBack,
  enabled = true,
}: SwipeNavigationOptions = {}) {
  const router = useRouter();
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const currentX = useRef<number | null>(null);
  const currentY = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      // Only trigger if swipe starts from the very left edge (iOS/Android native-like)
      if (touch.clientX <= edgeWidth) {
        startX.current = touch.clientX;
        startY.current = touch.clientY;
      } else {
        startX.current = null;
        startY.current = null;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startX.current === null) return;
      currentX.current = e.touches[0].clientX;
      currentY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      if (startX.current === null || currentX.current === null || startY.current === null || currentY.current === null) return;
      
      try {
        const deltaX = currentX.current - startX.current;
        const deltaY = currentY.current - startY.current;
        
        // Strict swipe detection:
        // 1. If vertical scroll is > 50px, the user is scrolling up/down. Cancel swipe.
        // 2. If vertical deviation is more than 50% of the horizontal swipe, cancel.
        if (Math.abs(deltaY) > 50 || Math.abs(deltaY) > Math.abs(deltaX) * 0.5) {
          startX.current = null;
          startY.current = null;
          currentX.current = null;
          currentY.current = null;
          return;
        }

        if (deltaX >= threshold) {
          if (onBack) {
            onBack();
          } else {
            router.back();
          }
        }
      } finally {
        startX.current = null;
        startY.current = null;
        currentX.current = null;
        currentY.current = null;
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [router, threshold, edgeWidth, onBack, enabled]);
}
