'use client';

/**
 * Capture initial JSDOM no-op IntersectionObserver polyfill reference (if present)
 * to distinguish unmocked JSDOM test environments from real browser or mocked IntersectionObserver tests.
 */
export const INITIAL_PASSIVE_JSDOM_IO: typeof IntersectionObserver | undefined = (() => {
  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
    return undefined;
  }
  const fn = window.IntersectionObserver;
  const isMock = '_isMockFunction' in fn;
  const isNative = Function.prototype.toString.call(fn).includes('[native code]');
  if (!isMock && !isNative && fn.length === 0) {
    return fn;
  }
  return undefined;
})();

export function isPassiveJsdomIntersectionObserver(): boolean {
  if (typeof window === 'undefined' || typeof window.IntersectionObserver !== 'function') {
    return false;
  }
  const fn = window.IntersectionObserver;
  if (fn !== INITIAL_PASSIVE_JSDOM_IO) {
    return false;
  }
  if ('_isMockFunction' in fn) {
    return false;
  }
  if (fn.prototype?.observe && '_isMockFunction' in fn.prototype.observe) {
    return false;
  }
  return true;
}

export type AdSlotFormat = 'in-feed' | 'banner' | 'rectangle' | 'horizontal-strip' | 'auto';

/**
 * Strict min-height boundaries to prevent Cumulative Layout Shift (CLS < 0.001)
 */
export const getAdSlotMinHeightClass = (format: AdSlotFormat = 'auto'): string => {
  switch (format) {
    case 'in-feed':
      return 'min-h-[140px] sm:min-h-[160px]';
    case 'banner':
    case 'rectangle':
      return 'min-h-[250px]';
    case 'horizontal-strip':
      return 'min-h-[90px] sm:min-h-[100px]';
    case 'auto':
    default:
      return 'min-h-[250px]';
  }
};

export const getFormatDimensions = (format: AdSlotFormat = 'auto'): string => {
  switch (format) {
    case 'in-feed':
      return '100% × 140~160px';
    case 'banner':
    case 'rectangle':
      return '100% × 250px';
    case 'horizontal-strip':
      return '100% × 90~100px';
    case 'auto':
    default:
      return '100% × 250px (반응형 Auto)';
  }
};
