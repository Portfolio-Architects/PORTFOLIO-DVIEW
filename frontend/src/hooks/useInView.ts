'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseInViewOptions {
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
  testMode?: boolean;
}

/**
 * Reusable IntersectionObserver hook with sticky mounting, lookahead margin,
 * and robust SSR / test-environment fallbacks.
 *
 * @param options - Configuration options for IntersectionObserver and test resilience
 * @returns [refCallback, inView] tuple
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): [React.RefCallback<T>, boolean] {
  const {
    rootMargin = '250px 0px',
    threshold = 0,
    triggerOnce = true,
    testMode = false,
  } = options;

  // Immediate synchronous fallback for SSR, missing IntersectionObserver, or test runs
  const isImmediatelyActive =
    typeof window === 'undefined' ||
    !('IntersectionObserver' in window) ||
    process.env.NODE_ENV === 'test' ||
    testMode;

  const [inView, setInView] = useState<boolean>(isImmediatelyActive);
  const elementRef = useRef<T | null>(null);

  const refCallback = useCallback((node: T | null) => {
    elementRef.current = node;
  }, []);

  useEffect(() => {
    if (isImmediatelyActive) {
      if (!inView) {
        setInView(true);
      }
      return;
    }

    if (inView && triggerOnce) {
      return;
    }

    const node = elementRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting) {
          setInView(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setInView(false);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [inView, triggerOnce, rootMargin, threshold, isImmediatelyActive]);

  return [refCallback, inView];
}

export default useInView;
